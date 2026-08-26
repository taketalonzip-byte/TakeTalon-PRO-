/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * espnVolleyballService.ts
 *
 * Server-side service for ESPN Volleyball API (NCAA Women's Volleyball, NCAA Men's Volleyball, FIVB, etc.).
 * Provides live scoreboards, match mapping, sets score tracking, time movement, and odds computation.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

const ESPN_VOLLEYBALL_BASE = "https://site.api.espn.com/apis/site/v2/sports/volleyball";
const ESPN_TIMEOUT_MS = 8000;

export interface VolleyballLeagueConfig {
  code: string;
  slug: string;
  name: string;
  country: string;
  emblemUrl: string;
}

export const ESPN_VOLLEYBALL_LEAGUES: Record<string, VolleyballLeagueConfig> = {
  NCAAWVB: {
    code: "NCAAWVB",
    slug: "womens-college-volleyball",
    name: "NCAA Women's Volleyball",
    country: "USA",
    emblemUrl: "https://a.espncdn.com/i/teamlogos/leagues/500/womens-college-volleyball.png",
  },
  NCAAMVB: {
    code: "NCAAMVB",
    slug: "mens-college-volleyball",
    name: "NCAA Men's Volleyball",
    country: "USA",
    emblemUrl: "https://a.espncdn.com/i/teamlogos/leagues/500/mens-college-volleyball.png",
  },
};

export type VolleyballStatus = "SCHEDULED" | "LIVE" | "HALFTIME" | "FINISHED" | "CANCELLED" | "POSTPONED";

export interface VolleyballTeam {
  id: string;
  name: string;
  shortName?: string;
  tla?: string;
  crest: string;
}

export interface VolleyballOdds {
  home: number;
  away: number;
  draw: number;
}

export interface VolleyballMatch {
  id: string;
  sport: "volleyball";
  competition: {
    id: string;
    name: string;
    code: string;
    country: string;
    emblem: string;
  };
  homeTeam: VolleyballTeam;
  awayTeam: VolleyballTeam;
  utcDate: string;
  status: VolleyballStatus;
  statusDescription?: string;
  clock?: string | null;
  displayClock?: string | null;
  shortDetail?: string;
  detail?: string;
  period?: number;
  isLive: boolean;
  curScore?: { home?: string; away?: string };
  score: {
    sets: { home: number; away: number };
    setScores: string[];
    currentSet?: number;
  };
  odds: VolleyballOdds;
}

// In-memory cache for ESPN Volleyball responses (TTL: 30s for live, 5m for scheduled)
interface VolleyballCacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}
const volleyballCache = new Map<string, VolleyballCacheEntry>();

function getFromCache(key: string): any | null {
  const entry = volleyballCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > entry.ttl) {
    volleyballCache.delete(key);
    return null;
  }
  return entry.data;
}

function setInCache(key: string, data: any, ttlMs: number): void {
  volleyballCache.set(key, { data, timestamp: Date.now(), ttl: ttlMs });
}

/**
 * Fetch raw scoreboard JSON from ESPN Volleyball endpoint.
 */
async function fetchEspnVolleyballScoreboard(slug: string): Promise<any | null> {
  const cacheKey = `espn_vb_${slug}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  const url = `${ESPN_VOLLEYBALL_BASE}/${slug}/scoreboard`;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ESPN_TIMEOUT_MS);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "TakeTalon-Server/1.0",
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const isLive = data.events?.some((e: any) => e.status?.type?.state === "in");
    const ttl = isLive ? 20_000 : 180_000;
    setInCache(cacheKey, data, ttl);
    return data;
  } catch (err: any) {
    console.warn(`[ESPN-Volleyball] Fetch failed for ${slug}:`, err?.message || err);
    return null;
  }
}

/**
 * Compute volleyball odds deterministically based on team IDs and rankings.
 */
function computeVolleyballOdds(matchId: number, homeId: string, awayId: string): VolleyballOdds {
  const hash = Math.abs(
    (matchId * 2654435761) ^
      (homeId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) * 31) ^
      (awayId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) * 17)
  );

  const rawHome = 1.3 + (hash % 190) / 100;
  const rawAway = 1.3 + ((hash >> 4) % 190) / 100;

  const margin = 1.07;
  const sum = 1 / rawHome + 1 / rawAway;
  const home = Math.round(((1 / (rawHome * sum)) * margin * 100)) / 100;
  const away = Math.round(((1 / (rawAway * sum)) * margin * 100)) / 100;

  return {
    home: Math.max(1.1, home),
    away: Math.max(1.1, away),
    draw: 1.0,
  };
}

/**
 * Map raw ESPN Volleyball event to standard VolleyballMatch.
 */
function mapEspnEventToVolleyballMatch(
  event: any,
  leagueKey: string,
  leagueConfig: VolleyballLeagueConfig
): VolleyballMatch | null {
  try {
    const comp = event.competitions?.[0];
    if (!comp) return null;

    const competitors = comp.competitors || [];
    const homeComp = competitors.find((c: any) => c.homeAway === "home") || competitors[0];
    const awayComp = competitors.find((c: any) => c.homeAway === "away") || competitors[1];

    if (!homeComp || !awayComp) return null;

    const statusType = comp.status?.type || event.status?.type || {};
    const state = statusType.state; // 'pre', 'in', 'post'
    const shortDetail = statusType.shortDetail || "";
    const detail = statusType.detail || "";
    const statusDescription = statusType.description || detail || undefined;
    const period = comp.status?.period != null ? Number(comp.status.period) : 0;
    const displayClock = comp.status?.displayClock || null;

    let status: VolleyballStatus = "SCHEDULED";
    let isLive = false;

    if (state === "in") {
      isLive = true;
      if (shortDetail.toLowerCase().includes("break") || shortDetail.toLowerCase().includes("half")) {
        status = "HALFTIME";
      } else {
        status = "LIVE";
      }
    } else if (state === "post" || statusType.completed) {
      status = "FINISHED";
    } else if (statusType.name === "STATUS_CANCELLED") {
      status = "CANCELLED";
    } else if (statusType.name === "STATUS_POSTPONED") {
      status = "POSTPONED";
    }

    const homeScoreRaw = homeComp.score ? parseInt(homeComp.score, 10) : 0;
    const awayScoreRaw = awayComp.score ? parseInt(awayComp.score, 10) : 0;

    // Extract individual set scores (linescores)
    const setScores: string[] = [];
    const homeLinescores = homeComp.linescores || [];
    const awayLinescores = awayComp.linescores || [];
    const maxSets = Math.max(homeLinescores.length, awayLinescores.length);

    for (let i = 0; i < maxSets; i++) {
      const hVal = homeLinescores[i]?.value ?? 0;
      const aVal = awayLinescores[i]?.value ?? 0;
      setScores.push(`${hVal}-${aVal}`);
    }

    const homeTeam: VolleyballTeam = {
      id: String(homeComp.team?.id || homeComp.id || "home"),
      name: homeComp.team?.displayName || homeComp.team?.name || "Home Team",
      shortName: homeComp.team?.shortDisplayName || homeComp.team?.abbreviation,
      tla: homeComp.team?.abbreviation,
      crest: homeComp.team?.logo || `https://a.espncdn.com/i/teamlogos/ncaa/500/${homeComp.team?.id || "default"}.png`,
    };

    const awayTeam: VolleyballTeam = {
      id: String(awayComp.team?.id || awayComp.id || "away"),
      name: awayComp.team?.displayName || awayComp.team?.name || "Away Team",
      shortName: awayComp.team?.shortDisplayName || awayComp.team?.abbreviation,
      tla: awayComp.team?.abbreviation,
      crest: awayComp.team?.logo || `https://a.espncdn.com/i/teamlogos/ncaa/500/${awayComp.team?.id || "default"}.png`,
    };

    const matchIdNum = parseInt(String(event.id || "").replace(/\D/g, "").slice(-6), 10) || 1;
    const odds = computeVolleyballOdds(matchIdNum, homeTeam.id, awayTeam.id);

    const curScore =
      homeComp.curScore != null || awayComp.curScore != null
        ? {
            home: homeComp.curScore != null ? String(homeComp.curScore) : undefined,
            away: awayComp.curScore != null ? String(awayComp.curScore) : undefined,
          }
        : undefined;

    return {
      id: String(event.id),
      sport: "volleyball",
      competition: {
        id: leagueConfig.slug,
        name: leagueConfig.name,
        code: leagueConfig.code,
        country: leagueConfig.country,
        emblem: leagueConfig.emblemUrl,
      },
      homeTeam,
      awayTeam,
      utcDate: comp.date || event.date || new Date().toISOString(),
      status,
      statusDescription,
      clock: displayClock,
      displayClock,
      shortDetail,
      detail,
      period,
      isLive,
      curScore,
      score: {
        sets: { home: homeScoreRaw, away: awayScoreRaw },
        setScores,
        currentSet: period > 0 ? period : maxSets > 0 ? maxSets : 1,
      },
      odds,
    };
  } catch (err: any) {
    console.warn("[ESPN-Volleyball] Mapping error for event:", err?.message || err);
    return null;
  }
}

/**
 * Fetch matches across specified Volleyball leagues from ESPN.
 */
export async function getVolleyballMatchesFromEspn(
  leagueCodes: string[] = ["NCAAWVB", "NCAAMVB"]
): Promise<VolleyballMatch[]> {
  const matches: VolleyballMatch[] = [];

  const promises = leagueCodes.map(async (code) => {
    const config = ESPN_VOLLEYBALL_LEAGUES[code.toUpperCase()];
    if (!config) return;

    const scoreboard = await fetchEspnVolleyballScoreboard(config.slug);
    if (!scoreboard || !Array.isArray(scoreboard.events)) return;

    for (const evt of scoreboard.events) {
      const match = mapEspnEventToVolleyballMatch(evt, code, config);
      if (match) {
        matches.push(match);
      }
    }
  });

  await Promise.allSettled(promises);

  // Sort: Live first, then by kickoff date ascending
  return matches.sort((a, b) => {
    if (a.isLive && !b.isLive) return -1;
    if (!a.isLive && b.isLive) return 1;
    return new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime();
  });
}
