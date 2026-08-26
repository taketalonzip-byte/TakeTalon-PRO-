/**
 * espnBasketballService.ts
 *
 * Server-side service for ESPN Basketball API.
 * Provides live scoreboards, match mapping, odds computation,
 * and Supabase persistence mirroring the football espnService.ts pattern.
 *
 * Covers 20 leagues across USA, Spain, Italy, Australia, Brazil, Europe, and International.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

const ESPN_BASKETBALL_BASE = "https://site.api.espn.com/apis/site/v2/sports/basketball";
const ESPN_TIMEOUT_MS = 8000;

export interface BasketballLeagueConfig {
  code: string;
  slug: string;
  name: string;
  country: string;
  emblemUrl: string;
}

export const ESPN_BASKETBALL_LEAGUES: Record<string, BasketballLeagueConfig> = {
  // USA
  NBA: {
    code: "NBA",
    slug: "nba",
    name: "National Basketball Association",
    country: "USA",
    emblemUrl: "https://a.espncdn.com/i/teamlogos/leagues/500/nba.png",
  },
  WNBA: {
    code: "WNBA",
    slug: "wnba",
    name: "Women's NBA",
    country: "USA",
    emblemUrl: "https://a.espncdn.com/i/teamlogos/leagues/500/wnba.png",
  },
  NCAAM: {
    code: "NCAAM",
    slug: "mens-college-basketball",
    name: "NCAA Men's Basketball",
    country: "USA",
    emblemUrl: "https://a.espncdn.com/i/teamlogos/leagues/500/mens-college-basketball.png",
  },
  NCAAW: {
    code: "NCAAW",
    slug: "womens-college-basketball",
    name: "NCAA Women's Basketball",
    country: "USA",
    emblemUrl: "https://a.espncdn.com/i/teamlogos/leagues/500/womens-college-basketball.png",
  },
  NBAG: {
    code: "NBAG",
    slug: "nba-development",
    name: "NBA G League",
    country: "USA",
    emblemUrl: "https://a.espncdn.com/i/teamlogos/leagues/500/nba-g-league.png",
  },
  NBASLV: {
    code: "NBASLV",
    slug: "nba-summer-las-vegas",
    name: "NBA Summer League (Las Vegas)",
    country: "USA",
    emblemUrl: "https://a.espncdn.com/i/teamlogos/leagues/500/nba.png",
  },
  NBASC: {
    code: "NBASC",
    slug: "nba-summer-california",
    name: "NBA California Classic",
    country: "USA",
    emblemUrl: "https://a.espncdn.com/i/teamlogos/leagues/500/nba.png",
  },
  NBASS: {
    code: "NBASS",
    slug: "nba-summer-sacramento",
    name: "NBA Sacramento Summer League",
    country: "USA",
    emblemUrl: "https://a.espncdn.com/i/teamlogos/leagues/500/nba.png",
  },
  NBAUT: {
    code: "NBAUT",
    slug: "nba-summer-utah",
    name: "NBA Salt Lake City Summer League",
    country: "USA",
    emblemUrl: "https://a.espncdn.com/i/teamlogos/leagues/500/nba.png",
  },
  NBAGS: {
    code: "NBAGS",
    slug: "nba-summer-golden-state",
    name: "NBA Golden State Summer League",
    country: "USA",
    emblemUrl: "https://a.espncdn.com/i/teamlogos/leagues/500/nba.png",
  },
  NBAOR: {
    code: "NBAOR",
    slug: "nba-summer-orlando",
    name: "NBA Orlando Summer League",
    country: "USA",
    emblemUrl: "https://a.espncdn.com/i/teamlogos/leagues/500/nba.png",
  },

  // Spain
  ACB: {
    code: "ACB",
    slug: "acb",
    name: "Liga ACB / Copa del Rey",
    country: "Spain",
    emblemUrl: "https://a.espncdn.com/i/teamlogos/leagues/500/acb.png",
  },

  // Italy
  LBA: {
    code: "LBA",
    slug: "lba",
    name: "Lega Basket Serie A",
    country: "Italy",
    emblemUrl: "https://a.espncdn.com/i/teamlogos/leagues/500/lba.png",
  },

  // Australia & NZ
  NBL: {
    code: "NBL",
    slug: "nbl",
    name: "National Basketball League",
    country: "Australia",
    emblemUrl: "https://a.espncdn.com/i/teamlogos/leagues/500/nbl.png",
  },

  // Brazil
  NBB: {
    code: "NBB",
    slug: "nbb",
    name: "Novo Basquete Brasil",
    country: "Brazil",
    emblemUrl: "https://a.espncdn.com/i/teamlogos/leagues/500/nbb.png",
  },

  // Europe (Clubs)
  EURO: {
    code: "EURO",
    slug: "euroleague",
    name: "EuroLeague",
    country: "Europe",
    emblemUrl: "https://a.espncdn.com/i/teamlogos/leagues/500/euroleague.png",
  },

  // International
  FIBA: {
    code: "FIBA",
    slug: "fiba",
    name: "FIBA Basketball World Cup",
    country: "International",
    emblemUrl: "https://a.espncdn.com/i/teamlogos/leagues/500/fiba.png",
  },
  FIBAAM: {
    code: "FIBAAM",
    slug: "fiba-americas",
    name: "FIBA AmeriCup",
    country: "International",
    emblemUrl: "https://a.espncdn.com/i/teamlogos/leagues/500/fiba-americas.png",
  },
  OLYM: {
    code: "OLYM",
    slug: "mens-olympics-basketball",
    name: "Olympics Men's Basketball",
    country: "International",
    emblemUrl: "https://a.espncdn.com/i/teamlogos/leagues/500/olympics.png",
  },
  OLYW: {
    code: "OLYW",
    slug: "womens-olympics-basketball",
    name: "Olympics Women's Basketball",
    country: "International",
    emblemUrl: "https://a.espncdn.com/i/teamlogos/leagues/500/olympics.png",
  },
};

export type BasketballStatus = "SCHEDULED" | "IN_PLAY" | "PAUSED" | "FINISHED" | "POSTPONED";

export interface BasketballTeam {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
}

export interface BasketballOdds {
  home: number;
  away: number;
  draw?: number;
}

export interface BasketballMatch {
  id: number;
  utcDate: string;
  status: BasketballStatus;
  period: number;
  clock: string | null;
  isLive: boolean;
  competition: {
    code: string;
    name: string;
    country: string;
    emblem: string;
  };
  homeTeam: BasketballTeam;
  awayTeam: BasketballTeam;
  score: {
    fullTime: { home: number | null; away: number | null };
    quarters?: {
      q1?: { home: number; away: number };
      q2?: { home: number; away: number };
      q3?: { home: number; away: number };
      q4?: { home: number; away: number };
      ot?: { home: number; away: number };
    };
  };
  odds: BasketballOdds;
}

function mapEspnStatus(type: any): BasketballStatus {
  const state = type?.state || "pre";
  const name = (type?.name || "").toUpperCase();

  if (state === "pre") return "SCHEDULED";
  if (state === "in") {
    if (name.includes("HALFTIME")) return "PAUSED";
    return "IN_PLAY";
  }
  if (state === "post") {
    if (name.includes("POSTPONE")) return "POSTPONED";
    return "FINISHED";
  }
  return "SCHEDULED";
}

function computeBasketballOdds(matchId: number, homeId: number, awayId: number): BasketballOdds {
  // Deterministic odds generation with 1.07 margin for basketball moneyline
  let s = (matchId ^ (homeId * 37) ^ (awayId * 19)) >>> 0;
  const rng = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
  const homeProb = 0.35 + rng() * 0.3; // 0.35 - 0.65
  const awayProb = Math.max(0.15, 1 - homeProb);
  const margin = 1.07;

  return {
    home: Number((margin / homeProb).toFixed(2)),
    away: Number((margin / awayProb).toFixed(2)),
    draw: Number((margin / 0.08).toFixed(2)), // Basketball regulation tie (rare)
  };
}

export function mapEspnBasketballEvent(evt: any, leagueConfig: BasketballLeagueConfig): BasketballMatch | null {
  const comp = evt.competitions?.[0];
  if (!comp) return null;

  const homeComp = comp.competitors?.find((c: any) => c.homeAway === "home") || comp.competitors?.[0];
  const awayComp = comp.competitors?.find((c: any) => c.homeAway === "away") || comp.competitors?.[1];
  if (!homeComp || !awayComp) return null;

  const homeId = parseInt(homeComp.id || homeComp.team?.id, 10) || 1;
  const awayId = parseInt(awayComp.id || awayComp.team?.id, 10) || 2;
  const eventId = parseInt(evt.id, 10) || Math.abs((homeId * 31) ^ awayId);

  const statusType = evt.status?.type;
  const status = mapEspnStatus(statusType);
  const isLive = status === "IN_PLAY" || status === "PAUSED";
  const displayClock = evt.status?.displayClock || evt.status?.type?.detail || null;
  const period = evt.status?.period || 0;

  const homeScore = homeComp.score != null && homeComp.score !== "" ? parseInt(homeComp.score, 10) : null;
  const awayScore = awayComp.score != null && awayComp.score !== "" ? parseInt(awayComp.score, 10) : null;

  const homeTeam: BasketballTeam = {
    id: homeId,
    name: homeComp.team?.displayName || homeComp.team?.name || "Home Team",
    shortName: homeComp.team?.shortDisplayName || homeComp.team?.abbreviation || "Home",
    tla: (homeComp.team?.abbreviation || homeComp.team?.name?.substring(0, 3) || "HOM").toUpperCase(),
    crest:
      homeComp.team?.logo ||
      `https://a.espncdn.com/i/teamlogos/${leagueConfig.slug}/500/${homeComp.team?.abbreviation?.toLowerCase() || homeId}.png`,
  };

  const awayTeam: BasketballTeam = {
    id: awayId,
    name: awayComp.team?.displayName || awayComp.team?.name || "Away Team",
    shortName: awayComp.team?.shortDisplayName || awayComp.team?.abbreviation || "Away",
    tla: (awayComp.team?.abbreviation || awayComp.team?.name?.substring(0, 3) || "AWY").toUpperCase(),
    crest:
      awayComp.team?.logo ||
      `https://a.espncdn.com/i/teamlogos/${leagueConfig.slug}/500/${awayComp.team?.abbreviation?.toLowerCase() || awayId}.png`,
  };

  // Quarters breakdown if available in competitors linescores
  let quarters: any = undefined;
  if (Array.isArray(homeComp.linescores) && Array.isArray(awayComp.linescores)) {
    quarters = {
      q1: { home: homeComp.linescores[0]?.value ?? 0, away: awayComp.linescores[0]?.value ?? 0 },
      q2: { home: homeComp.linescores[1]?.value ?? 0, away: awayComp.linescores[1]?.value ?? 0 },
      q3: { home: homeComp.linescores[2]?.value ?? 0, away: awayComp.linescores[2]?.value ?? 0 },
      q4: { home: homeComp.linescores[3]?.value ?? 0, away: awayComp.linescores[3]?.value ?? 0 },
    };
  }

  // Odds parsing from ESPN provider if present, otherwise calculate
  let odds: BasketballOdds;
  if (comp.odds && Array.isArray(comp.odds) && comp.odds.length > 0 && comp.odds[0].moneyline) {
    const ml = comp.odds[0].moneyline;
    odds = {
      home: ml.home?.moneyLine ? Number(ml.home.moneyLine) : 1.9,
      away: ml.away?.moneyLine ? Number(ml.away.moneyLine) : 1.9,
      draw: 15.0,
    };
  } else {
    odds = computeBasketballOdds(eventId, homeId, awayId);
  }

  return {
    id: eventId,
    utcDate: evt.date || comp.date || new Date().toISOString(),
    status,
    period,
    clock: displayClock,
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
      quarters,
    },
    odds,
  };
}

/**
 * Fetch live scoreboard for a single basketball competition from ESPN
 */
export async function fetchEspnBasketballScoreboard(
  code: string,
  dateRange?: string
): Promise<{ competition: BasketballLeagueConfig; matches: BasketballMatch[] }> {
  const leagueConfig = ESPN_BASKETBALL_LEAGUES[code.toUpperCase()];
  if (!leagueConfig) {
    throw new Error(`Unsupported basketball competition code: ${code}`);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ESPN_TIMEOUT_MS);

  try {
    const url = dateRange
      ? `${ESPN_BASKETBALL_BASE}/${leagueConfig.slug}/scoreboard?dates=${dateRange}`
      : `${ESPN_BASKETBALL_BASE}/${leagueConfig.slug}/scoreboard`;

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      throw new Error(`ESPN Basketball returned HTTP ${res.status} for ${leagueConfig.slug}`);
    }

    const data = await res.json();
    const events = Array.isArray(data.events) ? data.events : [];
    const matches: BasketballMatch[] = [];

    for (const evt of events) {
      const mapped = mapEspnBasketballEvent(evt, leagueConfig);
      if (mapped) matches.push(mapped);
    }

    return {
      competition: leagueConfig,
      matches,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fetch matches across multiple basketball leagues concurrently with in-memory caching
 */
const MEMORY_CACHE = new Map<string, { matches: BasketballMatch[]; expiresAt: number }>();
const CACHE_TTL_MS = 60_000; // 1 minute cache

export async function getBasketballMatchesFromEspn(
  codes: string[] = ["NBA", "WNBA", "NCAAM", "NBL", "ACB", "EURO", "FIBA"]
): Promise<BasketballMatch[]> {
  const targetCodes = codes.length > 0 ? codes : Object.keys(ESPN_BASKETBALL_LEAGUES);
  const allMatches: BasketballMatch[] = [];

  await Promise.allSettled(
    targetCodes.map(async (code) => {
      const cleanCode = code.toUpperCase();
      const cached = MEMORY_CACHE.get(cleanCode);
      if (cached && Date.now() < cached.expiresAt) {
        allMatches.push(...cached.matches);
        return;
      }

      try {
        const result = await fetchEspnBasketballScoreboard(cleanCode);
        MEMORY_CACHE.set(cleanCode, {
          matches: result.matches,
          expiresAt: Date.now() + CACHE_TTL_MS,
        });
        allMatches.push(...result.matches);
      } catch (err: any) {
        // Fallback gracefully
        console.warn(`[ESPN-Basketball] Scoreboard failed for ${cleanCode}:`, err?.message);
      }
    })
  );

  return allMatches.sort(
    (a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()
  );
}

/**
 * Sync ESPN Basketball matches into Supabase tables if configured
 */
export async function syncEspnBasketballToSupabase(
  supabase: SupabaseClient,
  competitionCode: string
): Promise<{ success: boolean; synced: number }> {
  try {
    const { competition, matches } = await fetchEspnBasketballScoreboard(competitionCode);
    if (matches.length === 0) return { success: true, synced: 0 };

    // 1. Upsert competition
    const { data: compRow } = await supabase
      .from("basketball_competitions")
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

    // 2. Upsert teams and fixtures
    let count = 0;
    for (const m of matches) {
      // Upsert home team
      const { data: homeRow } = await supabase
        .from("basketball_teams")
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

      // Upsert away team
      const { data: awayRow } = await supabase
        .from("basketball_teams")
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
        await supabase.from("basketball_fixtures").upsert(
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
    console.error(`[ESPN-Basketball-Sync] Error syncing ${competitionCode}:`, err);
    return { success: false, synced: 0 };
  }
}
