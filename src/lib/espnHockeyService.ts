/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * espnHockeyService.ts
 *
 * Server-side service for ESPN Ice Hockey API (NHL, NCAA Men's/Women's Hockey).
 * Provides live scoreboards, match mapping, period score tracking, and odds
 * computation, mirroring the espnBasketballService.ts / espnVolleyballService.ts
 * patterns already used across the codebase.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

const ESPN_HOCKEY_BASE = "https://site.api.espn.com/apis/site/v2/sports/hockey";
const ESPN_TIMEOUT_MS = 8000;

export interface HockeyLeagueConfig {
  code: string;
  slug: string;
  name: string;
  country: string;
  emblemUrl: string;
}

export const ESPN_HOCKEY_LEAGUES: Record<string, HockeyLeagueConfig> = {
  NHL: {
    code: "NHL",
    slug: "nhl",
    name: "National Hockey League",
    country: "USA",
    emblemUrl: "https://a.espncdn.com/i/teamlogos/leagues/500/nhl.png",
  },
  NCAAMH: {
    code: "NCAAMH",
    slug: "mens-college-hockey",
    name: "NCAA Men's Hockey",
    country: "USA",
    emblemUrl: "https://a.espncdn.com/i/teamlogos/leagues/500/mens-college-hockey.png",
  },
  NCAAWH: {
    code: "NCAAWH",
    slug: "womens-college-hockey",
    name: "NCAA Women's Hockey",
    country: "USA",
    emblemUrl: "https://a.espncdn.com/i/teamlogos/leagues/500/womens-college-hockey.png",
  },
};

export type HockeyStatus = "SCHEDULED" | "IN_PLAY" | "PAUSED" | "FINISHED" | "POSTPONED" | "CANCELLED";

export interface HockeyTeam {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
}

export interface HockeyOdds {
  home: number;
  away: number;
  draw?: number;
}

export interface HockeyMatch {
  id: number;
  sport: "hockey";
  utcDate: string;
  status: HockeyStatus;
  statusDescription?: string;
  period: number;
  clock: string | null;
  displayClock: string | null;
  shortDetail?: string;
  isLive: boolean;
  competition: {
    code: string;
    name: string;
    country: string;
    emblem: string;
  };
  homeTeam: HockeyTeam;
  awayTeam: HockeyTeam;
  score: {
    fullTime: { home: number | null; away: number | null };
    periods?: {
      p1?: { home: number; away: number };
      p2?: { home: number; away: number };
      p3?: { home: number; away: number };
      ot?: { home: number; away: number };
      so?: { home: number; away: number };
    };
  };
  odds: HockeyOdds;
}

// In-memory cache for ESPN Hockey responses (TTL: live vs scheduled)
const MEMORY_CACHE = new Map<string, { matches: HockeyMatch[]; expiresAt: number }>();
const CACHE_TTL_LIVE_MS = 20_000;
const CACHE_TTL_IDLE_MS = 180_000;

function mapEspnStatus(type: any): HockeyStatus {
  const state = type?.state || "pre";
  const name = (type?.name || "").toUpperCase();

  if (state === "pre") return "SCHEDULED";
  if (state === "in") {
    if (name.includes("INTERMISSION") || name.includes("HALFTIME")) return "PAUSED";
    return "IN_PLAY";
  }
  if (state === "post") {
    if (name.includes("POSTPONE")) return "POSTPONED";
    if (name.includes("CANCEL")) return "CANCELLED";
    return "FINISHED";
  }
  return "SCHEDULED";
}

/**
 * Compute hockey moneyline odds deterministically based on team/match IDs.
 * Ties are rare in modern hockey (OT/shootout decides), so draw odds are kept high.
 */
function computeHockeyOdds(matchId: number, homeId: number, awayId: number): HockeyOdds {
  let s = (matchId ^ (homeId * 37) ^ (awayId * 19)) >>> 0;
  const rng = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
  const homeProb = 0.38 + rng() * 0.28; // 0.38 - 0.66
  const awayProb = Math.max(0.15, 1 - homeProb);
  const margin = 1.07;

  return {
    home: Number((margin / homeProb).toFixed(2)),
    away: Number((margin / awayProb).toFixed(2)),
    draw: 21.0, // Regulation tie effectively impossible (OT/SO resolves it)
  };
}

export function mapEspnHockeyEvent(evt: any, leagueConfig: HockeyLeagueConfig): HockeyMatch | null {
  const comp = evt.competitions?.[0];
  if (!comp) return null;

  const homeComp = comp.competitors?.find((c: any) => c.homeAway === "home") || comp.competitors?.[0];
  const awayComp = comp.competitors?.find((c: any) => c.homeAway === "away") || comp.competitors?.[1];
  if (!homeComp || !awayComp) return null;

  const homeId = parseInt(homeComp.id || homeComp.team?.id, 10) || 1;
  const awayId = parseInt(awayComp.id || awayComp.team?.id, 10) || 2;
  const eventId = parseInt(evt.id, 10) || Math.abs((homeId * 31) ^ awayId);

  const statusType = comp.status?.type || evt.status?.type;
  const status = mapEspnStatus(statusType);
  const isLive = status === "IN_PLAY" || status === "PAUSED";
  const displayClock = comp.status?.displayClock || evt.status?.displayClock || null;
  const shortDetail = statusType?.shortDetail || statusType?.detail || undefined;
  const statusDescription = statusType?.description || shortDetail;
  const period = comp.status?.period ?? evt.status?.period ?? 0;

  const homeScore = homeComp.score != null && homeComp.score !== "" ? parseInt(homeComp.score, 10) : null;
  const awayScore = awayComp.score != null && awayComp.score !== "" ? parseInt(awayComp.score, 10) : null;

  const homeTeam: HockeyTeam = {
    id: homeId,
    name: homeComp.team?.displayName || homeComp.team?.name || "Home Team",
    shortName: homeComp.team?.shortDisplayName || homeComp.team?.abbreviation || "Home",
    tla: (homeComp.team?.abbreviation || homeComp.team?.name?.substring(0, 3) || "HOM").toUpperCase(),
    crest:
      homeComp.team?.logo ||
      `https://a.espncdn.com/i/teamlogos/${leagueConfig.slug}/500/${homeComp.team?.abbreviation?.toLowerCase() || homeId}.png`,
  };

  const awayTeam: HockeyTeam = {
    id: awayId,
    name: awayComp.team?.displayName || awayComp.team?.name || "Away Team",
    shortName: awayComp.team?.shortDisplayName || awayComp.team?.abbreviation || "Away",
    tla: (awayComp.team?.abbreviation || awayComp.team?.name?.substring(0, 3) || "AWY").toUpperCase(),
    crest:
      awayComp.team?.logo ||
      `https://a.espncdn.com/i/teamlogos/${leagueConfig.slug}/500/${awayComp.team?.abbreviation?.toLowerCase() || awayId}.png`,
  };

  // Period-by-period breakdown (P1, P2, P3, OT, SO) if ESPN provides linescores
  let periods: HockeyMatch["score"]["periods"] = undefined;
  if (Array.isArray(homeComp.linescores) && Array.isArray(awayComp.linescores)) {
    const hl = homeComp.linescores;
    const al = awayComp.linescores;
    periods = {
      p1: { home: hl[0]?.value ?? 0, away: al[0]?.value ?? 0 },
      p2: { home: hl[1]?.value ?? 0, away: al[1]?.value ?? 0 },
      p3: { home: hl[2]?.value ?? 0, away: al[2]?.value ?? 0 },
    };
    if (hl[3] != null || al[3] != null) {
      periods.ot = { home: hl[3]?.value ?? 0, away: al[3]?.value ?? 0 };
    }
    if (hl[4] != null || al[4] != null) {
      periods.so = { home: hl[4]?.value ?? 0, away: al[4]?.value ?? 0 };
    }
  }

  // Odds parsing from ESPN provider if present, otherwise deterministic fallback
  let odds: HockeyOdds;
  if (comp.odds && Array.isArray(comp.odds) && comp.odds.length > 0 && comp.odds[0].moneyline) {
    const ml = comp.odds[0].moneyline;
    odds = {
      home: ml.home?.moneyLine ? Number(ml.home.moneyLine) : 1.9,
      away: ml.away?.moneyLine ? Number(ml.away.moneyLine) : 1.9,
      draw: 21.0,
    };
  } else {
    odds = computeHockeyOdds(eventId, homeId, awayId);
  }

  return {
    id: eventId,
    sport: "hockey",
    utcDate: comp.date || evt.date || new Date().toISOString(),
    status,
    statusDescription,
    period,
    clock: displayClock,
    displayClock,
    shortDetail,
    isLive,
    competition: {
      code: leagueConfig.code,
      name: leagueConfig.name,
      country: leagueConfig.country,
      emblem: leagueConfig.emblemUrl,
    },
    homeTeam,
    awayTeam,
    score: {
      fullTime: { home: homeScore, away: awayScore },
      periods,
    },
    odds,
  };
}

/**
 * Fetch live scoreboard for a single hockey competition from ESPN.
 */
export async function fetchEspnHockeyScoreboard(
  code: string,
  dateRange?: string
): Promise<{ competition: HockeyLeagueConfig; matches: HockeyMatch[] }> {
  const leagueConfig = ESPN_HOCKEY_LEAGUES[code.toUpperCase()];
  if (!leagueConfig) {
    throw new Error(`Unsupported hockey competition code: ${code}`);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ESPN_TIMEOUT_MS);

  try {
    const url = dateRange
      ? `${ESPN_HOCKEY_BASE}/${leagueConfig.slug}/scoreboard?dates=${dateRange}`
      : `${ESPN_HOCKEY_BASE}/${leagueConfig.slug}/scoreboard`;

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json", "User-Agent": "TakeTalon-Server/1.0" },
    });

    if (!res.ok) {
      throw new Error(`ESPN Hockey returned HTTP ${res.status} for ${leagueConfig.slug}`);
    }

    const data = await res.json();
    const events = Array.isArray(data.events) ? data.events : [];
    const matches: HockeyMatch[] = [];

    for (const evt of events) {
      const mapped = mapEspnHockeyEvent(evt, leagueConfig);
      if (mapped) matches.push(mapped);
    }

    return { competition: leagueConfig, matches };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fetch matches across multiple hockey leagues concurrently with in-memory caching.
 */
export async function getHockeyMatchesFromEspn(
  codes: string[] = ["NHL", "NCAAMH", "NCAAWH"]
): Promise<HockeyMatch[]> {
  const targetCodes = codes.length > 0 ? codes : Object.keys(ESPN_HOCKEY_LEAGUES);
  const allMatches: HockeyMatch[] = [];

  await Promise.allSettled(
    targetCodes.map(async (code) => {
      const cleanCode = code.toUpperCase();
      const cached = MEMORY_CACHE.get(cleanCode);
      if (cached && Date.now() < cached.expiresAt) {
        allMatches.push(...cached.matches);
        return;
      }

      try {
        const result = await fetchEspnHockeyScoreboard(cleanCode);
        const anyLive = result.matches.some((m) => m.isLive);
        MEMORY_CACHE.set(cleanCode, {
          matches: result.matches,
          expiresAt: Date.now() + (anyLive ? CACHE_TTL_LIVE_MS : CACHE_TTL_IDLE_MS),
        });
        allMatches.push(...result.matches);
      } catch (err: any) {
        console.warn(`[ESPN-Hockey] Scoreboard failed for ${cleanCode}:`, err?.message);
      }
    })
  );

  return allMatches.sort((a, b) => {
    if (a.isLive && !b.isLive) return -1;
    if (!a.isLive && b.isLive) return 1;
    return new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime();
  });
}

/**
 * Sync ESPN Hockey matches into Supabase tables if configured, mirroring the
 * basketball sync pattern (basketball_* -> hockey_*).
 */
export async function syncEspnHockeyToSupabase(
  supabase: SupabaseClient,
  competitionCode: string
): Promise<{ success: boolean; synced: number }> {
  try {
    const { competition, matches } = await fetchEspnHockeyScoreboard(competitionCode);
    if (matches.length === 0) return { success: true, synced: 0 };

    const { data: compRow } = await supabase
      .from("hockey_competitions")
      .upsert(
        {
          code: competition.code,
          name: competition.name,
          area_name: competition.country,
          competition_type: "LEAGUE",
          emblem_url: competition.emblemUrl,
          provider: "espn",
          is_active: true,
          last_synced_at: new Date().toISOString(),
        },
        { onConflict: "code" }
      )
      .select("id")
      .single();

    const compId = compRow?.id;
    if (!compId) return { success: false, synced: 0 };

    let count = 0;
    for (const m of matches) {
      const { data: homeRow } = await supabase
        .from("hockey_teams")
        .upsert(
          {
            external_id: m.homeTeam.id,
            provider: "espn",
            name: m.homeTeam.name,
            short_name: m.homeTeam.shortName,
            tla: m.homeTeam.tla,
            crest_url: m.homeTeam.crest,
            last_synced_at: new Date().toISOString(),
          },
          { onConflict: "external_id" }
        )
        .select("id")
        .single();

      const { data: awayRow } = await supabase
        .from("hockey_teams")
        .upsert(
          {
            external_id: m.awayTeam.id,
            provider: "espn",
            name: m.awayTeam.name,
            short_name: m.awayTeam.shortName,
            tla: m.awayTeam.tla,
            crest_url: m.awayTeam.crest,
            last_synced_at: new Date().toISOString(),
          },
          { onConflict: "external_id" }
        )
        .select("id")
        .single();

      if (homeRow?.id && awayRow?.id) {
        await supabase.from("hockey_fixtures").upsert(
          {
            external_id: m.id,
            provider: "espn",
            competition_id: compId,
            home_team_id: homeRow.id,
            away_team_id: awayRow.id,
            utc_kickoff: m.utcDate,
            status: m.status,
            home_score: m.score.fullTime.home,
            away_score: m.score.fullTime.away,
            winner:
              m.score.fullTime.home != null && m.score.fullTime.away != null
                ? m.score.fullTime.home > m.score.fullTime.away
                  ? "HOME_TEAM"
                  : m.score.fullTime.away > m.score.fullTime.home
                  ? "AWAY_TEAM"
                  : "DRAW"
                : null,
            last_synced_at: new Date().toISOString(),
          },
          { onConflict: "external_id" }
        );
        count++;
      }
    }

    return { success: true, synced: count };
  } catch (err: any) {
    console.error(`[ESPN-Hockey-Sync] Error syncing ${competitionCode}:`, err);
    return { success: false, synced: 0 };
  }
}
