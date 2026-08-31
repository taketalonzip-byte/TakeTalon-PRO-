/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * basketballCache.ts — Frontend client cache & SWR layer for Basketball Data.
 * Mirrors footballCache.ts pattern.
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * basketballCache.ts — Frontend client cache & SWR layer for Basketball Data.
 * Mirrors footballCache.ts pattern.
 */

export interface BasketballTeam {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest?: string;
}

export interface BasketballOdds {
  home: number;
  away: number;
  draw?: number;
}

export interface BasketballMatch {
  id: string | number;
  sport: "basketball";
  competition: {
    code: string;
    name: string;
    country: string;
    emblem?: string;
    logo?: string;
  };
  homeTeam: BasketballTeam;
  awayTeam: BasketballTeam;
  utcDate: string;
  status: "SCHEDULED" | "IN_PLAY" | "PAUSED" | "FINISHED" | "POSTPONED" | string;
  period?: number;
  clock?: string | null;
  quarter?: string | null;
  isLive?: boolean;
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
  odds?: BasketballOdds;
  syncedAt?: string;
}

export interface BasketballCompetition {
  code: string;
  id?: number;
  name: string;
  country: string;
  logo?: string;
  emblemUrl?: string;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const MEM_CACHE = new Map<string, CacheEntry<any>>();
const DEFAULT_TTL_MS = 60_000; // 1 min TTL

function cacheGet<T>(key: string, ttlMs = DEFAULT_TTL_MS): T | null {
  const mem = MEM_CACHE.get(key);
  if (mem && Date.now() - mem.timestamp < ttlMs) return mem.data;
  return null;
}

function cacheSet<T>(key: string, data: T): void {
  const entry = { data, timestamp: Date.now() };
  MEM_CACHE.set(key, entry);
}

export function normalizeBasketballMatch(m: any): BasketballMatch {
  const homeId = Number(m.homeTeam?.id || m.home?.id || 1);
  const awayId = Number(m.awayTeam?.id || m.away?.id || 2);

  let odds = m.odds;
  if (!odds && m.odds_home != null && m.odds_away != null) {
    odds = {
      home: Number(m.odds_home),
      away: Number(m.odds_away),
      draw: m.odds_draw != null ? Number(m.odds_draw) : undefined,
    };
  }


  return {
    id: m.id,
    sport: "basketball",
    competition: {
      code: m.competition?.code || "NBA",
      name: m.competition?.name || "National Basketball Association",
      country: m.competition?.country || "USA",
      emblem: m.competition?.emblem || m.competition?.logo,
      logo: m.competition?.logo || m.competition?.emblem,
    },
    homeTeam: {
      id: homeId,
      name: m.homeTeam?.name || m.home?.name || "Home Team",
      shortName: m.homeTeam?.shortName || m.home?.short_name || "Home",
      tla: m.homeTeam?.tla || m.home?.short_name || "HOM",
      crest: m.homeTeam?.crest || m.home?.logo_url,
    },
    awayTeam: {
      id: awayId,
      name: m.awayTeam?.name || m.away?.name || "Away Team",
      shortName: m.awayTeam?.shortName || m.away?.short_name || "Away",
      tla: m.awayTeam?.tla || m.away?.short_name || "AWY",
      crest: m.awayTeam?.crest || m.away?.logo_url,
    },
    utcDate: m.utcDate || m.kickoff_utc || new Date().toISOString(),
    status: m.status || "SCHEDULED",
    period: m.period,
    clock: m.clock || m.quarter,
    quarter: m.quarter || m.clock,
    isLive: m.isLive || m.status === "IN_PLAY" || m.status === "LIVE",
    score: m.score || {
      fullTime: { home: null, away: null },
    },
    odds,
    syncedAt: m.syncedAt,
  };
}

/**
 * Fetch basketball matches with SWR local caching
 */
export async function getBasketballFixtures(
  codes: string[] = ["NBA", "WNBA", "NCAAM", "ACB", "LBA", "NBL", "NBB", "EURO", "FIBA"],
  statusFilter?: string
): Promise<{ matches: BasketballMatch[]; source: string }> {
  const cacheKey = `fixtures_${codes.sort().join("_")}_${statusFilter || "all"}`;
  const cached = cacheGet<{ matches: BasketballMatch[] }>(cacheKey);

  if (cached && Array.isArray(cached.matches)) {
    // SWR background refresh
    fetchBasketballFixturesApi(codes, statusFilter)
      .then((fresh) => {
        if (fresh?.matches) cacheSet(cacheKey, fresh);
      })
      .catch(() => {});
    return { matches: cached.matches, source: "cache" };
  }

  const fresh = await fetchBasketballFixturesApi(codes, statusFilter);
  if (fresh && Array.isArray(fresh.matches)) {
    cacheSet(cacheKey, fresh);
    return { matches: fresh.matches, source: "api" };
  }

  return { matches: [], source: "empty" };
}

async function fetchBasketballFixturesApi(
  codes: string[],
  statusFilter?: string
): Promise<{ matches: BasketballMatch[] }> {
  try {
    const params = new URLSearchParams();
    if (codes.length > 0) params.set("competitions", codes.join(","));
    if (statusFilter) params.set("status", statusFilter);

    const res = await fetch(`/api/basketball/matches?${params.toString()}`);
    if (!res.ok) return { matches: [] };
    const data = await res.json();
    const rawMatches = data.matches || [];
    return { matches: rawMatches.map(normalizeBasketballMatch) };
  } catch (err) {
    console.warn("[bkCache] API fetch failed:", err);
    return { matches: [] };
  }
}

/**
 * Fetch basketball matches for a single competition
 */
export async function getBasketballCompetitionFixtures(
  code: string,
  statusFilter?: string
): Promise<{ matches: BasketballMatch[]; source: string }> {
  return getBasketballFixtures([code.toUpperCase()], statusFilter);
}

/**
 * Trigger background basketball sync
 */
export async function triggerBasketballSync(): Promise<boolean> {
  try {
    const res = await fetch("/api/basketball/sync", { method: "POST" });
    return res.ok;
  } catch {
    return false;
  }
}

