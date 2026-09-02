/**
 * espnService.ts
 *
 * Server-side only. Fetches live football data from ESPN's public scoreboard
 * endpoint and syncs it into the existing Supabase football_* tables under
 * provider='espn'. Never touches provider='football-data.org' rows.
 *
 * ESPN response shape below was CONFIRMED via a live fetch on 2026-08-25
 * against https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard
 * — field names are not guessed.
 *
 * Data flow: ESPN scoreboard -> mapEspnEvent() -> upsert competition/teams/fixture
 * (provider='espn') -> caller reads back from Supabase to respond to frontend.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { CATALOG_LEAGUE_SLUGS } from "./footballCatalog";
import { computeDeterministicOdds } from "./espnEventCore";
import { getLeagueLogoUrl } from "./leagueLogos";

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer";
const ESPN_TIMEOUT_MS = 15000;
const ESPN_USER_AGENTS = ["curl/8.7.1", "okhttp/4.9.3", "Go-http-client/2.0"];

// In-Memory Scoreboard Cache & Request Deduplication
interface ScoreboardCacheEntry {
  result: EspnScoreboardResult;
  expiresAt: number;
}
const scoreboardCache = new Map<string, ScoreboardCacheEntry>();
const inFlightRequests = new Map<string, Promise<EspnScoreboardResult>>();

// Known football_competitions.code -> ESPN league slug mapping.
// Only codes we actually sync. Add here only after confirming the slug works.
// ksa.1 confirmed via live search 2026-08-25 (multiple espn.com /league/ksa.1/ URLs).
export const ESPN_LEAGUE_SLUGS: Record<string, string> = {
  // Full ESPN catalog (218 competitions) — every entry uses a real ESPN slug.
  ...CATALOG_LEAGUE_SLUGS,
  // Short legacy codes kept for backwards compatibility with existing UI/data.
  PL: "eng.1",
  ELC: "eng.2",
  FAC: "eng.fa",
  EFL: "eng.league_cup",
  ENG3: "eng.3",
  ENG4: "eng.4",
  SCO1: "sco.1",
  PD: "esp.1",
  CDR: "esp.copa_del_rey",
  SA: "ita.1",
  CIT: "ita.coppa_italia",
  BL1: "ger.1",
  DFB: "ger.dfb_pokal",
  FL1: "fra.1",
  CDF: "fra.coupe_de_france",
  DED: "ned.1",
  PPL: "por.1",
  BSA: "bra.1",
  TUR1: "tur.1",
  CL: "uefa.champions",
  UEL: "uefa.europa",
  UECL: "uefa.europa.conf",
  KSA1: "ksa.1",
};

export type FixtureStatus =
  | "SCHEDULED"
  | "TIMED"
  | "IN_PLAY"
  | "PAUSED"
  | "FINISHED"
  | "POSTPONED"
  | "SUSPENDED"
  | "CANCELLED"
  | "AWARDED";

interface EspnStatusType {
  state: string; // "pre" | "in" | "post"
  name?: string; // e.g. "STATUS_SCHEDULED", "STATUS_IN_PROGRESS", "STATUS_HALFTIME", "STATUS_FULL_TIME"
  completed?: boolean;
}

/** Map ESPN's status.type -> our fixed DB enum. Defensive: unknown values fall back safely. */
function mapEspnStatus(type: EspnStatusType | undefined): FixtureStatus {
  const state = type?.state || "pre";
  const name = (type?.name || "").toUpperCase();

  if (state === "pre") return "SCHEDULED";

  if (state === "in") {
    if (name.includes("HALFTIME")) return "PAUSED";
    return "IN_PLAY";
  }

  if (state === "post") {
    if (name.includes("POSTPONE")) return "POSTPONED";
    if (name.includes("CANCEL")) return "CANCELLED";
    if (name.includes("SUSPEND") || name.includes("ABANDON")) return "SUSPENDED";
    return "FINISHED";
  }

  return "SCHEDULED";
}

export interface MappedEspnTeam {
  externalId: number;
  name: string;
  shortName: string;
  tla: string;
  crestUrl: string | null;
}

export interface MappedEspnFixture {
  externalId: number;
  utcKickoff: string;
  status: FixtureStatus;
  homeScore: number | null;
  awayScore: number | null;
  winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;
  home: MappedEspnTeam;
  away: MappedEspnTeam;
  displayClock: string | null;
  isLive: boolean;
  minute: number | null;
}

/** Parse a leading minute number out of ESPN's displayClock string (e.g. "45+2'" -> 45). */
function parseDisplayClockMinute(displayClock: string | null): number | null {
  if (!displayClock) return null;
  const m = displayClock.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

export interface MappedEspnCompetition {
  externalId: number;
  name: string;
  emblemUrl: string | null;
}

export interface EspnScoreboardResult {
  competition: MappedEspnCompetition | null;
  fixtures: MappedEspnFixture[];
}

function safeNum(v: unknown): number | null {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : null;
}

async function fetchWithUserAgent(url: string, timeoutMs: number = ESPN_TIMEOUT_MS): Promise<Response | null> {
  for (const ua of ESPN_USER_AGENTS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: "application/json", "User-Agent": ua },
      });
      if (res.ok) return res;
      if (res.status !== 403) return res;
    } catch {
      // try next user agent or timeout
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

/**
 * Fetch + map a single competition's scoreboard from ESPN.
 * Supports date range (e.g. "20260818-20260908") to get full matchday fixtures.
 * Handles timeouts, network retries, request deduplication, and caching.
 */
export async function fetchEspnScoreboard(code: string, dateRange?: string): Promise<EspnScoreboardResult> {
  const slug = ESPN_LEAGUE_SLUGS[code];
  if (!slug) throw new Error(`No ESPN slug mapping configured for competition code "${code}"`);

  const cacheKey = `${slug}:${dateRange || "default"}`;
  const now = Date.now();
  const cached = scoreboardCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.result;
  }

  // Request deduplication
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey)!;
  }

  const fetchPromise = (async (): Promise<EspnScoreboardResult> => {
    // Default window: past 7 days to next 14 days for full round of fixtures
    const defaultDates = (() => {
      const d = new Date();
      const past = new Date(d.getTime() - 7 * 24 * 3600 * 1000);
      const future = new Date(d.getTime() + 14 * 24 * 3600 * 1000);
      const fmt = (dt: Date) =>
        dt.getUTCFullYear() +
        String(dt.getUTCMonth() + 1).padStart(2, "0") +
        String(dt.getUTCDate()).padStart(2, "0");
      return `${fmt(past)}-${fmt(future)}`;
    })();

    const targetDates = dateRange !== undefined ? dateRange : defaultDates;
    const url = targetDates
      ? `${ESPN_BASE}/${slug}/scoreboard?dates=${targetDates}`
      : `${ESPN_BASE}/${slug}/scoreboard`;

    let res = await fetchWithUserAgent(url, ESPN_TIMEOUT_MS);

    if ((!res || !res.ok) && targetDates) {
      const fallbackRes = await fetchWithUserAgent(`${ESPN_BASE}/${slug}/scoreboard`, ESPN_TIMEOUT_MS);
      if (fallbackRes && fallbackRes.ok) res = fallbackRes;
    }

    if (!res || !res.ok) {
      if (cached) {
        return cached.result;
      }
      throw new Error(`ESPN HTTP ${res ? res.status : "aborted/timeout"} for ${slug}`);
    }

    let json: any;
    try {
      json = await res.json();
    } catch (e: any) {
      if (cached) return cached.result;
      throw new Error(`Invalid JSON from ESPN for ${slug}: ${e?.message || e}`);
    }

    let events: any[] = Array.isArray(json?.events) ? json.events : [];

    // If date range returned 0 events, try default scoreboard
    if (events.length === 0 && targetDates) {
      try {
        const fallbackRes = await fetchWithUserAgent(`${ESPN_BASE}/${slug}/scoreboard`, 8000);
        if (fallbackRes && fallbackRes.ok) {
          const fallbackJson = await fallbackRes.json();
          if (Array.isArray(fallbackJson?.events) && fallbackJson.events.length > 0) {
            json = fallbackJson;
            events = fallbackJson.events;
          }
        }
      } catch {
        /* ignore */
      }
    }

    const leagueMeta = json?.leagues?.[0];
    const competition: MappedEspnCompetition | null = leagueMeta
      ? {
          externalId: parseInt(leagueMeta.id, 10) || 0,
          name: leagueMeta.name || leagueMeta.abbreviation || code,
          emblemUrl: leagueMeta.logos?.[0]?.href || getLeagueLogoUrl(code) || null,
        }
      : null;

    const fixtures: MappedEspnFixture[] = [];
    let hasLive = false;

    for (const ev of events) {
      try {
        const comp = ev?.competitions?.[0];
        if (!comp) continue;

        const competitors: any[] = Array.isArray(comp.competitors) ? comp.competitors : [];
        const homeC = competitors.find((c: any) => c.homeAway === "home");
        const awayC = competitors.find((c: any) => c.homeAway === "away");
        if (!homeC || !awayC) continue;

        const statusType: EspnStatusType | undefined = comp.status?.type || ev.status?.type;
        const status = mapEspnStatus(statusType);
        const isLive = statusType?.state === "in";
        if (isLive) hasLive = true;

        let winner: MappedEspnFixture["winner"] = null;
        if (status === "FINISHED" || status === "AWARDED") {
          if (homeC.winner === true) winner = "HOME_TEAM";
          else if (awayC.winner === true) winner = "AWAY_TEAM";
          else winner = "DRAW";
        }

        const toTeam = (c: any): MappedEspnTeam => ({
          externalId: parseInt(c.team?.id, 10) || Math.floor(Math.random() * 100000),
          name: c.team?.displayName || c.team?.name || "Unknown",
          shortName: c.team?.shortDisplayName || c.team?.name || "Unknown",
          tla: (c.team?.abbreviation || "UNK").slice(0, 4).toUpperCase(),
          crestUrl: c.team?.logo || null,
        });

        fixtures.push({
          externalId: parseInt(ev.id, 10) || Math.floor(Math.random() * 1000000),
          utcKickoff: comp.date || ev.date || new Date().toISOString(),
          status,
          homeScore: safeNum(homeC.score),
          awayScore: safeNum(awayC.score),
          winner,
          home: toTeam(homeC),
          away: toTeam(awayC),
          displayClock: comp.status?.displayClock ?? null,
          isLive,
          minute: isLive ? parseDisplayClockMinute(comp.status?.displayClock ?? null) : null,
        });
      } catch {
        continue;
      }
    }

    const result: EspnScoreboardResult = { competition, fixtures };
    // Cache for 20s if has live match, 120s if not
    const ttl = hasLive ? 20_000 : 120_000;
    scoreboardCache.set(cacheKey, { result, expiresAt: Date.now() + ttl });
    return result;
  })();

  inFlightRequests.set(cacheKey, fetchPromise);
  try {
    return await fetchPromise;
  } finally {
    inFlightRequests.delete(cacheKey);
  }
}

let lastCompUpsertErrorLog = 0;
const DB_SYNC_TIMEOUT_MS = 3000;

async function withDbTimeout<T>(promise: PromiseLike<T>, timeoutMs: number = DB_SYNC_TIMEOUT_MS): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("Database sync timeout")), timeoutMs);
  });
  try {
    return await Promise.race([Promise.resolve(promise), timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Upsert one competition's ESPN scoreboard into Supabase under provider='espn'.
 * Never writes to provider='football-data.org' rows.
 * Returns the DB competition id used, plus a map of live clocks (ephemeral, not stored)
 * keyed by fixture external_id, for enriching the API response only.
 */
export async function syncEspnCompetition(
  supabaseAdmin: SupabaseClient | null,
  code: string
): Promise<{
  competitionId: string | null;
  liveClocks: Record<number, string>;
  scoreboard: EspnScoreboardResult;
}> {
  const scoreboard = await fetchEspnScoreboard(code);
  const liveClocks: Record<number, string> = {};
  const { competition, fixtures } = scoreboard;

  if (!competition) return { competitionId: null, liveClocks, scoreboard };

  for (const f of fixtures) {
    if (f.isLive && f.displayClock) {
      liveClocks[f.externalId] = f.displayClock;
    }
  }

  if (!supabaseAdmin) {
    return { competitionId: null, liveClocks, scoreboard };
  }

  try {
    // 1. Upsert competition (provider='espn') with timeout protection
    const { data: compRow, error: compErr } = await withDbTimeout(
      supabaseAdmin
        .from("football_competitions")
        .upsert(
          {
            external_id: competition.externalId,
            provider: "espn",
            code,
            name: competition.name,
            emblem_url: competition.emblemUrl,
            is_active: true,
            last_synced_at: new Date().toISOString(),
          },
          { onConflict: "provider,external_id" }
        )
        .select("id")
        .maybeSingle(),
      DB_SYNC_TIMEOUT_MS
    );

    if (compErr || !compRow) {
      const now = Date.now();
      if (now - lastCompUpsertErrorLog > 60_000) {
        lastCompUpsertErrorLog = now;
        const msg = compErr?.message || "Unavailable";
        if (
          !msg.toLowerCase().includes("timeout") &&
          !msg.toLowerCase().includes("disconnect") &&
          !msg.toLowerCase().includes("fetch failed") &&
          !msg.toLowerCase().includes("upstream connect error")
        ) {
          console.warn(`[espnService] competition DB sync notice for ${code}:`, msg);
        }
      }
      return { competitionId: null, liveClocks, scoreboard };
    }
    const competitionId = compRow.id as string;

    // 2. Upsert teams (provider='espn'), collect external_id -> db id map
    const teamMap = new Map<number, string>();
    const allTeams = new Map<number, MappedEspnTeam>();
    for (const f of fixtures) {
      allTeams.set(f.home.externalId, f.home);
      allTeams.set(f.away.externalId, f.away);
    }

    for (const team of allTeams.values()) {
      try {
        const { data: teamRow, error: teamErr } = await withDbTimeout(
          supabaseAdmin
            .from("football_teams")
            .upsert(
              {
                external_id: team.externalId,
                provider: "espn",
                name: team.name,
                short_name: team.shortName,
                tla: team.tla,
                crest_url: team.crestUrl,
                last_synced_at: new Date().toISOString(),
              },
              { onConflict: "provider,external_id" }
            )
            .select("id")
            .maybeSingle(),
          2000
        );

        if (!teamErr && teamRow) teamMap.set(team.externalId, teamRow.id as string);
      } catch {
        // Non-blocking per team
      }
    }

    // 3. Upsert fixtures (provider='espn')
    const nowIso = new Date().toISOString();
    for (const f of fixtures) {
      const homeId = teamMap.get(f.home.externalId);
      const awayId = teamMap.get(f.away.externalId);
      if (!homeId || !awayId) continue;

      try {
        await withDbTimeout(
          supabaseAdmin.from("football_fixtures").upsert(
            {
              external_id: f.externalId,
              provider: "espn",
              competition_id: competitionId,
              home_team_id: homeId,
              away_team_id: awayId,
              utc_kickoff: f.utcKickoff,
              status: f.status,
              home_score: f.homeScore,
              away_score: f.awayScore,
              winner: f.winner,
              current_minute: f.minute,
              live_source: f.isLive ? "espn" : null,
              last_live_update_at: f.isLive ? nowIso : null,
              last_synced_at: nowIso,
            },
            { onConflict: "provider,external_id" }
          ),
          2000
        );
      } catch {
        // Non-blocking per fixture
      }
    }

    return { competitionId, liveClocks, scoreboard };
  } catch (e: any) {
    const now = Date.now();
    if (now - lastCompUpsertErrorLog > 60_000) {
      lastCompUpsertErrorLog = now;
      const msg = e?.message || String(e);
      if (
        !msg.toLowerCase().includes("timeout") &&
        !msg.toLowerCase().includes("disconnect") &&
        !msg.toLowerCase().includes("fetch failed") &&
        !msg.toLowerCase().includes("upstream connect error")
      ) {
        console.warn(`[espnService] DB sync notice for ${code}:`, msg);
      }
    }
    return { competitionId: null, liveClocks, scoreboard };
  }
}

/**
 * Maps ESPN scoreboard fixtures directly to standard frontend FootballMatch format.
 * Includes deterministic 1X2 odds calculation.
 */
export function espnScoreboardToFootballMatches(
  code: string,
  scoreboard: EspnScoreboardResult
): any[] {
  const comp = scoreboard.competition;
  const compName = comp?.name || code;
  const compEmblem = getLeagueLogoUrl(code) || comp?.emblemUrl || "";

  return scoreboard.fixtures.map((f) => {
    const odds = computeDeterministicOdds(
      String(f.externalId),
      String(f.home.externalId),
      String(f.away.externalId),
      { drawEnabled: true }
    );

    return {
      id: f.externalId,
      utcDate: f.utcKickoff,
      status: f.status,
      minute: f.minute,
      displayClock: f.displayClock,
      bettingSuspendedUntil: null,
      matchday: 1,
      competition: {
        id: comp?.externalId || 0,
        name: compName,
        code: code,
        emblem: compEmblem,
      },
      homeTeam: {
        id: f.home.externalId,
        name: f.home.name,
        shortName: f.home.shortName,
        tla: f.home.tla,
        crest: f.home.crestUrl || "",
      },
      awayTeam: {
        id: f.away.externalId,
        name: f.away.name,
        shortName: f.away.shortName,
        tla: f.away.tla,
        crest: f.away.crestUrl || "",
      },
      score: {
        winner: f.winner,
        fullTime: { home: f.homeScore, away: f.awayScore },
        halfTime: { home: null, away: null },
      },
      odds: {
        home: odds.home,
        draw: odds.draw,
        away: odds.away,
      },
      odds_model: "espn_deterministic",
      odds_updated_at: new Date().toISOString(),
    };
  });
}

