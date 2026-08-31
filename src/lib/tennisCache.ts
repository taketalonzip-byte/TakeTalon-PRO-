/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * tennisCache.ts — Frontend client cache & SWR layer for Tennis Data.
 * Mirrors basketballCache.ts and footballCache.ts pattern.
 */

export interface TennisPlayer {
  id: number;
  name: string;
  shortName: string;
  country?: string;
  flagUrl?: string;
  headshot?: string;
  seed?: number;
}

export interface TennisOdds {
  home: number;
  away: number;
  draw?: number;
}

export interface TennisMatch {
  id: string | number;
  sport: "tennis";
  tournament: {
    id: string;
    name: string;
    shortName: string;
    tour: string;
    country: string;
    emblem?: string;
    category?: string;
  };
  round?: string;
  discipline: string;
  player1: TennisPlayer; // home
  player2: TennisPlayer; // away
  utcDate: string;
  status: "SCHEDULED" | "IN_PLAY" | "PAUSED" | "FINISHED" | "POSTPONED" | string;
  isLive?: boolean;
  score: {
    sets: { player1: number; player2: number };
    setScores: string[];
    currentSet?: number;
  };
  odds: TennisOdds;
  syncedAt?: string;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  source: string;
}

const TENNIS_CACHE_TTL_MS = 60_000; // 1 minute
const MEM_CACHE = new Map<string, CacheEntry<any>>();

function cacheGet<T>(key: string): CacheEntry<T> | null {
  const entry = MEM_CACHE.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > TENNIS_CACHE_TTL_MS) {
    MEM_CACHE.delete(key);
    return null;
  }
  return entry;
}

function cacheSet<T>(key: string, data: T, source: string) {
  MEM_CACHE.set(key, { data, timestamp: Date.now(), source });
}

export function normalizeTennisMatch(m: any): TennisMatch {
  const matchId = m.id || "tennis-1";
  const p1Id = Number(m.player1?.id || m.home?.id || 101);
  const p2Id = Number(m.player2?.id || m.away?.id || 102);

  let odds = m.odds;
  if (!odds && m.odds_home != null && m.odds_away != null) {
    odds = {
      home: Number(m.odds_home),
      away: Number(m.odds_away),
      draw: 1.0,
    };
  }


  return {
    id: m.id,
    sport: "tennis",
    tournament: {
      id: m.tournament?.id || m.league_id || "tour",
      name: m.tournament?.name || m.league || "Tennis Tournament",
      shortName: m.tournament?.shortName || m.league || "Tournament",
      tour: m.tournament?.tour || "ATP",
      country: m.tournament?.country || m.country || "International",
      emblem: m.tournament?.emblem || m.league_logo,
      category: m.tournament?.category || m.discipline || "Singles",
    },
    round: m.round,
    discipline: m.discipline || "Singles",
    player1: {
      id: p1Id,
      name: m.player1?.name || m.home?.name || "Player 1",
      shortName: m.player1?.shortName || m.home?.short_name || "P1",
      flagUrl: m.player1?.flagUrl || m.home?.logo_url,
      seed: m.player1?.seed,
    },
    player2: {
      id: p2Id,
      name: m.player2?.name || m.away?.name || "Player 2",
      shortName: m.player2?.shortName || m.away?.short_name || "P2",
      flagUrl: m.player2?.flagUrl || m.away?.logo_url,
      seed: m.player2?.seed,
    },
    utcDate: m.utcDate || m.kickoff_utc || new Date().toISOString(),
    status: m.status || "SCHEDULED",
    isLive: m.isLive || m.status === "IN_PLAY" || m.status === "LIVE",
    score: m.score || {
      sets: { player1: 0, player2: 0 },
      setScores: [],
    },
    odds,
    syncedAt: m.syncedAt,
  };
}

/**
 * Fetch tennis matches with SWR local caching
 */
export async function getTennisFixtures(
  tours: string[] = ["atp", "wta"],
  statusFilter?: string
): Promise<{ matches: TennisMatch[]; source: string }> {
  const cacheKey = `tennis_fixtures_${tours.sort().join("_")}_${statusFilter || "all"}`;
  const cached = cacheGet<{ matches: TennisMatch[] }>(cacheKey);

  if (cached) {
    fetchTennisFixturesApi(tours, statusFilter).then((fresh) => {
      if (fresh.matches.length > 0) {
        cacheSet(cacheKey, fresh, "network");
      }
    });
    return { matches: cached.data.matches, source: cached.source };
  }

  const fresh = await fetchTennisFixturesApi(tours, statusFilter);
  if (fresh.matches.length > 0) {
    cacheSet(cacheKey, fresh, "network");
    return { matches: fresh.matches, source: "network" };
  }

  return { matches: [], source: "empty" };
}

async function fetchTennisFixturesApi(
  tours: string[],
  statusFilter?: string
): Promise<{ matches: TennisMatch[] }> {
  try {
    const params = new URLSearchParams();
    if (tours.length > 0) params.set("tours", tours.join(","));
    if (statusFilter) params.set("status", statusFilter);

    const res = await fetch(`/api/tennis/matches?${params.toString()}`);
    if (!res.ok) return { matches: [] };
    const data = await res.json();
    const rawMatches = data.matches || [];
    return { matches: rawMatches.map(normalizeTennisMatch) };
  } catch (err) {
    console.warn("[tennisCache] API fetch failed:", err);
    return { matches: [] };
  }
}

/**
 * Trigger backend sync with Supabase for tennis
 */
export async function syncTennisWithBackend(tour = "atp"): Promise<boolean> {
  try {
    const res = await fetch("/api/tennis/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tour }),
    });
    const data = await res.json();
    return Boolean(data?.ok);
  } catch {
    return false;
  }
}
