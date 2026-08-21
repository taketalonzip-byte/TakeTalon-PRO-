/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * basketballCache.ts — Frontend client cache & SWR layer for Basketball Data.
 * Mirrors footballCache.ts pattern.
 */

export interface BasketballMatch {
  id: string;
  sport: "basketball";
  competition: {
    code: string;
    name: string;
    country: string;
    logo?: string;
  };
  homeTeam: {
    id: number;
    name: string;
    shortName: string;
    crest?: string;
  };
  awayTeam: {
    id: number;
    name: string;
    shortName: string;
    crest?: string;
  };
  utcDate: string;
  status: string; // 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'POSTPONED'
  quarter?: string | null;
  score: {
    fullTime: { home: number | null; away: number | null };
    quarterScores?: any;
  };
  syncedAt?: string;
}

export interface BasketballCompetition {
  code: string;
  id: number;
  name: string;
  country: string;
  logo?: string;
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

/**
 * Fetch basketball matches with SWR local caching
 */
export async function getBasketballFixtures(
  codes: string[] = ["NBA", "EURO", "ACB", "LNB", "NBL"],
  statusFilter?: string,
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
  statusFilter?: string,
): Promise<{ matches: BasketballMatch[] }> {
  try {
    const params = new URLSearchParams();
    if (codes.length > 0) params.set("competitions", codes.join(","));
    if (statusFilter) params.set("status", statusFilter);

    const res = await fetch(`/api/basketball/matches?${params.toString()}`);
    if (!res.ok) return { matches: [] };
    const data = await res.json();
    return { matches: data.matches || [] };
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
  statusFilter?: string,
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
