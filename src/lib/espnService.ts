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

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer";
const ESPN_TIMEOUT_MS = 8000;

// Known football_competitions.code -> ESPN league slug mapping.
// Only codes we actually sync. Add here only after confirming the slug works.
export const ESPN_LEAGUE_SLUGS: Record<string, string> = {
  PL: "eng.1",
  PD: "esp.1",
  SA: "ita.1",
  BL1: "ger.1",
  FL1: "fra.1",
  CL: "uefa.champions",
};

// football_fixtures.status CHECK constraint allowed values (CONFIRMED from live schema):
// SCHEDULED | TIMED | IN_PLAY | PAUSED | LIVE | FINISHED | POSTPONED | SUSPENDED | CANCELLED | AWARDED
type FixtureStatus =
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
  // Ephemeral, NOT persisted to DB (no column for it) — only used in the live API response.
  displayClock: string | null;
  isLive: boolean;
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

/**
 * Fetch + map a single competition's scoreboard from ESPN.
 * Throws on network/HTTP failure — caller is responsible for fallback (Plan B/C).
 */
export async function fetchEspnScoreboard(code: string): Promise<EspnScoreboardResult> {
  const slug = ESPN_LEAGUE_SLUGS[code];
  if (!slug) throw new Error(`No ESPN slug mapping configured for competition code "${code}"`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ESPN_TIMEOUT_MS);

  try {
    const res = await fetch(`${ESPN_BASE}/${slug}/scoreboard`, {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    if (!res.ok) throw new Error(`ESPN HTTP ${res.status} for ${slug}`);

    const json: any = await res.json();
    const leagueMeta = json?.leagues?.[0];
    const competition: MappedEspnCompetition | null = leagueMeta
      ? {
          externalId: parseInt(leagueMeta.id, 10),
          name: leagueMeta.name || leagueMeta.abbreviation || code,
          emblemUrl: leagueMeta.logos?.[0]?.href || null,
        }
      : null;

    const events: any[] = Array.isArray(json?.events) ? json.events : [];
    const fixtures: MappedEspnFixture[] = [];

    for (const ev of events) {
      try {
        const comp = ev?.competitions?.[0];
        if (!comp) continue;

        const competitors: any[] = Array.isArray(comp.competitors) ? comp.competitors : [];
        const homeC = competitors.find((c) => c.homeAway === "home");
        const awayC = competitors.find((c) => c.homeAway === "away");
        if (!homeC || !awayC) continue; // malformed event — skip, don't break the whole batch

        const statusType: EspnStatusType | undefined = comp.status?.type || ev.status?.type;
        const status = mapEspnStatus(statusType);
        const isLive = statusType?.state === "in";

        let winner: MappedEspnFixture["winner"] = null;
        if (status === "FINISHED" || status === "AWARDED") {
          if (homeC.winner === true) winner = "HOME_TEAM";
          else if (awayC.winner === true) winner = "AWAY_TEAM";
          else winner = "DRAW";
        }

        const toTeam = (c: any): MappedEspnTeam => ({
          externalId: parseInt(c.team?.id, 10),
          name: c.team?.displayName || c.team?.name || "Unknown",
          shortName: c.team?.shortDisplayName || c.team?.name || "Unknown",
          tla: (c.team?.abbreviation || "UNK").slice(0, 4).toUpperCase(),
          crestUrl: c.team?.logo || null,
        });

        fixtures.push({
          externalId: parseInt(ev.id, 10),
          utcKickoff: comp.date || ev.date,
          status,
          homeScore: safeNum(homeC.score),
          awayScore: safeNum(awayC.score),
          winner,
          home: toTeam(homeC),
          away: toTeam(awayC),
          displayClock: comp.status?.displayClock ?? null,
          isLive,
        });
      } catch {
        // One malformed event must not break the whole scoreboard batch.
        continue;
      }
    }

    return { competition, fixtures };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Upsert one competition's ESPN scoreboard into Supabase under provider='espn'.
 * Never writes to provider='football-data.org' rows.
 * Returns the DB competition id used, plus a map of live clocks (ephemeral, not stored)
 * keyed by fixture external_id, for enriching the API response only.
 */
export async function syncEspnCompetition(
  supabaseAdmin: SupabaseClient,
  code: string
): Promise<{ competitionId: string | null; liveClocks: Record<number, string> }> {
  const { competition, fixtures } = await fetchEspnScoreboard(code);
  const liveClocks: Record<number, string> = {};

  if (!competition) return { competitionId: null, liveClocks };

  // 1. Upsert competition (provider='espn')
  const { data: compRow, error: compErr } = await supabaseAdmin
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
    .single();

  if (compErr || !compRow) {
    throw new Error(`[espnService] competition upsert failed for ${code}: ${compErr?.message}`);
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
    const { data: teamRow, error: teamErr } = await supabaseAdmin
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
      .single();

    if (!teamErr && teamRow) teamMap.set(team.externalId, teamRow.id as string);
  }

  // 3. Upsert fixtures (provider='espn')
  const nowIso = new Date().toISOString();
  for (const f of fixtures) {
    const homeId = teamMap.get(f.home.externalId);
    const awayId = teamMap.get(f.away.externalId);
    if (!homeId || !awayId) continue; // team upsert failed — skip this fixture, don't crash the batch

    const { error: fixErr } = await supabaseAdmin.from("football_fixtures").upsert(
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
        live_source: f.isLive ? "espn" : null,
        last_live_update_at: f.isLive ? nowIso : null,
        last_synced_at: nowIso,
      },
      { onConflict: "provider,external_id" }
    );

    if (!fixErr && f.isLive && f.displayClock) {
      liveClocks[f.externalId] = f.displayClock;
    }
  }

  return { competitionId, liveClocks };
}
