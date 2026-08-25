/**
 * footballCache.ts
 *
 * Frontend local-storage caching layer for football data.
 *
 * Flow (stale-while-revalidate):
 *   1. Check localStorage — if present and FRESH, return immediately
 *   2. If STALE cache exists, return it immediately AND trigger background refresh
 *   3. If NO cache, fetch synchronously from backend (/api/football/*)
 *   4. On backend failure with stale cache, return stale as fallback
 *   5. Backend NEVER exposed to Football-Data.org from frontend — always /api/football/*
 *
 * This module runs entirely in the browser — no secrets, no API keys.
 */

const CACHE_PREFIX = "tt_fd_";

// TTL per data category (milliseconds).
// LIVE matches always use the short `live` TTL regardless of category — see hasLiveMatch()
// below — because a single "fixtures" response commonly mixes live + scheduled + finished
// matches, and the old flat 24h TTL here meant live scores never refreshed in-session.
const TTL = {
  fixtures: 60 * 60_000, // 1 h    — upcoming matches (matches football_sync_config.fixtures_refresh_minutes)
  finished: 6 * 60 * 60_000, // 6 h    — completed matches
  competition: 24 * 60 * 60_000, // 24 h   — static competition info
  teams: 24 * 60 * 60_000, // 24 h   — static team info
  standings: 6 * 60 * 60_000, // 6 h    — standings (matches football_sync_config.standings_refresh_minutes)
  live: 20_000, // 20 s   — matches football_sync_config.espn_live_refresh_seconds
};

type TTLKey = keyof typeof TTL;

/** True if any match in this payload is currently live — forces the short `live` TTL. */
function hasLiveMatch(data: unknown): boolean {
  const matches = (data as any)?.matches;
  if (!Array.isArray(matches)) return false;
  return matches.some((m: any) => m?.status === "IN_PLAY" || m?.status === "PAUSED" || m?.status === "LIVE");
}

interface CacheEntry<T> {
  data: T;
  ts: number;
}

/**
 * Self-Correction Engine:
 * Corrects and enriches matches with logos, odds, formatted dates, and status.
 */
export function normalizeAndCorrectMatch(m: any): FootballMatch {
  const homeId = m.homeTeam?.id || 0;
  const awayId = m.awayTeam?.id || 0;
  const matchId = m.id || Math.floor(Math.random() * 100000);

  // Logo self-correction for teams
  const homeCrest =
    m.homeTeam?.crest || (homeId ? `https://crests.football-data.org/${homeId}.png` : "");
  const awayCrest =
    m.awayTeam?.crest || (awayId ? `https://crests.football-data.org/${awayId}.png` : "");

  // Logo self-correction for competition emblem
  const compCode = m.competition?.code || "PL";
  const compEmblem = m.competition?.emblem || `https://crests.football-data.org/${compCode}.png`;

  // Odds calculation if missing
  let odds = m.odds;
  if (!odds) {
    let s = (matchId ^ (homeId * 31) ^ (awayId * 17)) >>> 0;
    const rng = () => {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 0x100000000;
    };
    const hp = 0.28 + rng() * 0.28;
    const dp = 0.2 + rng() * 0.13;
    const ap = Math.max(0.12, 1 - hp - dp);
    const k = 1.07;
    odds = {
      home: +(k / hp).toFixed(2),
      draw: +(k / dp).toFixed(2),
      away: +(k / ap).toFixed(2),
    };
  }

  return {
    id: matchId,
    utcDate: m.utcDate || new Date().toISOString(),
    status: m.status || "SCHEDULED",
    minute: m.minute ?? null,
    displayClock: m.displayClock ?? (m.minute ? `${m.minute}'` : null),
    matchday: m.matchday ?? 1,
    competition: {
      id: m.competition?.id || 0,
      name: m.competition?.name || "Football League",
      code: compCode,
      emblem: compEmblem,
    },
    area: {
      id: m.area?.id || 0,
      name: m.area?.name || "Global",
      code: m.area?.code || "",
      flag: m.area?.flag || "",
    },
    homeTeam: {
      id: homeId,
      name: m.homeTeam?.name || "Home Team",
      shortName: m.homeTeam?.shortName || m.homeTeam?.name || "Home",
      tla: m.homeTeam?.tla || "HOM",
      crest: homeCrest,
    },
    awayTeam: {
      id: awayId,
      name: m.awayTeam?.name || "Away Team",
      shortName: m.awayTeam?.shortName || m.awayTeam?.name || "Away",
      tla: m.awayTeam?.tla || "AWY",
      crest: awayCrest,
    },
    score: {
      winner: m.score?.winner ?? null,
      fullTime: {
        home: m.score?.fullTime?.home ?? null,
        away: m.score?.fullTime?.away ?? null,
      },
      halfTime: {
        home: m.score?.halfTime?.home ?? null,
        away: m.score?.halfTime?.away ?? null,
      },
    },
    odds,
  } as any;
}

/**
 * Scan Local Storage for any cached matches as an offline fallback when network connection fails.
 * ONLY returns matches matching the requested competition code to avoid leaking unrelated leagues.
 */
function getAnyCachedMatches(cacheKey?: string): FootballMatch[] {
  const matchComp = cacheKey?.match(/(?:comp:|:)([A-Z0-9_]+)(?:$|:)/i);
  const code = matchComp ? matchComp[1].toUpperCase() : null;

  try {
    for (const [k, entry] of FOOTBALL_MEM_CACHE.entries()) {
      if (k.startsWith(CACHE_PREFIX) && (k.includes("fixtures") || k.includes("comp:"))) {
        const parsed = entry as CacheEntry<MatchesResponse>;
        if (parsed?.data?.matches?.length) {
          const matches = parsed.data.matches.map(normalizeAndCorrectMatch);
          if (code) {
            const filtered = matches.filter((m) => m.competition?.code === code);
            if (filtered.length > 0) return filtered;
          } else {
            return matches;
          }
        }
      }
    }
  } catch {
    /* ignore */
  }

  return [];
}

function getBuiltInFallbackMatches(cacheKey?: string): FootballMatch[] {
  const today = new Date();
  const h = (ms: number) => new Date(today.getTime() + ms).toISOString();

  const all: FootballMatch[] = [
    // --- La Liga (PD) ---
    {
      id: 700001,
      utcDate: h(4 * 3600000),
      status: "SCHEDULED",
      matchday: 22,
      competition: {
        id: 2014,
        name: "La Liga",
        code: "PD",
        emblem: "https://crests.football-data.org/PD.png",
      },
      area: {
        id: 2224,
        name: "Spain",
        code: "ESP",
        flag: "https://crests.football-data.org/760.svg",
      },
      homeTeam: {
        id: 86,
        name: "Real Madrid CF",
        shortName: "Real Madrid",
        tla: "RMA",
        crest: "https://crests.football-data.org/86.png",
      },
      awayTeam: {
        id: 81,
        name: "FC Barcelona",
        shortName: "Barcelona",
        tla: "BAR",
        crest: "https://crests.football-data.org/81.svg",
      },
      score: {
        winner: null,
        fullTime: { home: null, away: null },
        halfTime: { home: null, away: null },
      },
      odds: { home: 2.15, draw: 3.4, away: 3.1 },
    },
    {
      id: 700002,
      utcDate: h(26 * 3600000),
      status: "SCHEDULED",
      matchday: 22,
      competition: {
        id: 2014,
        name: "La Liga",
        code: "PD",
        emblem: "https://crests.football-data.org/PD.png",
      },
      area: {
        id: 2224,
        name: "Spain",
        code: "ESP",
        flag: "https://crests.football-data.org/760.svg",
      },
      homeTeam: {
        id: 78,
        name: "Club Atlético de Madrid",
        shortName: "Atlético",
        tla: "ATM",
        crest: "https://crests.football-data.org/78.png",
      },
      awayTeam: {
        id: 559,
        name: "Sevilla FC",
        shortName: "Sevilla",
        tla: "SEV",
        crest: "https://crests.football-data.org/559.png",
      },
      score: {
        winner: null,
        fullTime: { home: null, away: null },
        halfTime: { home: null, away: null },
      },
      odds: { home: 1.85, draw: 3.5, away: 4.2 },
    },
    {
      id: 700003,
      utcDate: h(-20 * 3600000),
      status: "FINISHED",
      matchday: 21,
      competition: {
        id: 2014,
        name: "La Liga",
        code: "PD",
        emblem: "https://crests.football-data.org/PD.png",
      },
      area: {
        id: 2224,
        name: "Spain",
        code: "ESP",
        flag: "https://crests.football-data.org/760.svg",
      },
      homeTeam: {
        id: 92,
        name: "Real Sociedad de Fútbol",
        shortName: "Real Sociedad",
        tla: "RSO",
        crest: "https://crests.football-data.org/92.png",
      },
      awayTeam: {
        id: 77,
        name: "Athletic Club",
        shortName: "Athletic",
        tla: "ATH",
        crest: "https://crests.football-data.org/77.png",
      },
      score: {
        winner: "HOME_TEAM",
        fullTime: { home: 2, away: 1 },
        halfTime: { home: 1, away: 0 },
      },
      odds: { home: 2.3, draw: 3.2, away: 3.1 },
    },

    // --- Premier League (PL) ---
    {
      id: 700005,
      utcDate: h(2 * 3600000),
      status: "SCHEDULED",
      matchday: 24,
      competition: {
        id: 2021,
        name: "Premier League",
        code: "PL",
        emblem: "https://crests.football-data.org/PL.png",
      },
      area: {
        id: 2072,
        name: "England",
        code: "ENG",
        flag: "https://crests.football-data.org/770.svg",
      },
      homeTeam: {
        id: 66,
        name: "Manchester United FC",
        shortName: "Man United",
        tla: "MUN",
        crest: "https://crests.football-data.org/66.png",
      },
      awayTeam: {
        id: 61,
        name: "Chelsea FC",
        shortName: "Chelsea",
        tla: "CHE",
        crest: "https://crests.football-data.org/61.png",
      },
      score: {
        winner: null,
        fullTime: { home: null, away: null },
        halfTime: { home: null, away: null },
      },
      odds: { home: 2.4, draw: 3.3, away: 2.8 },
    },
    {
      id: 700006,
      utcDate: h(24 * 3600000),
      status: "SCHEDULED",
      matchday: 24,
      competition: {
        id: 2021,
        name: "Premier League",
        code: "PL",
        emblem: "https://crests.football-data.org/PL.png",
      },
      area: {
        id: 2072,
        name: "England",
        code: "ENG",
        flag: "https://crests.football-data.org/770.svg",
      },
      homeTeam: {
        id: 57,
        name: "Arsenal FC",
        shortName: "Arsenal",
        tla: "ARS",
        crest: "https://crests.football-data.org/57.png",
      },
      awayTeam: {
        id: 65,
        name: "Manchester City FC",
        shortName: "Man City",
        tla: "MCI",
        crest: "https://crests.football-data.org/65.png",
      },
      score: {
        winner: null,
        fullTime: { home: null, away: null },
        halfTime: { home: null, away: null },
      },
      odds: { home: 2.6, draw: 3.4, away: 2.55 },
    },

    // --- Bundesliga (BL1) ---
    {
      id: 700007,
      utcDate: h(48 * 3600000),
      status: "SCHEDULED",
      matchday: 20,
      competition: {
        id: 2002,
        name: "Bundesliga",
        code: "BL1",
        emblem: "https://crests.football-data.org/BL1.png",
      },
      area: {
        id: 2088,
        name: "Germany",
        code: "GER",
        flag: "https://crests.football-data.org/759.svg",
      },
      homeTeam: {
        id: 5,
        name: "FC Bayern München",
        shortName: "Bayern",
        tla: "FCB",
        crest: "https://crests.football-data.org/5.png",
      },
      awayTeam: {
        id: 4,
        name: "Borussia Dortmund",
        shortName: "Dortmund",
        tla: "BVB",
        crest: "https://crests.football-data.org/4.png",
      },
      score: {
        winner: null,
        fullTime: { home: null, away: null },
        halfTime: { home: null, away: null },
      },
      odds: { home: 1.65, draw: 4.2, away: 4.5 },
    },

    // --- Serie A (SA) ---
    {
      id: 700008,
      utcDate: h(30 * 3600000),
      status: "SCHEDULED",
      matchday: 23,
      competition: {
        id: 2019,
        name: "Serie A",
        code: "SA",
        emblem: "https://crests.football-data.org/SA.png",
      },
      area: {
        id: 2114,
        name: "Italy",
        code: "ITA",
        flag: "https://crests.football-data.org/784.svg",
      },
      homeTeam: {
        id: 109,
        name: "Juventus FC",
        shortName: "Juventus",
        tla: "JUV",
        crest: "https://crests.football-data.org/109.png",
      },
      awayTeam: {
        id: 98,
        name: "AC Milan",
        shortName: "Milan",
        tla: "ACM",
        crest: "https://crests.football-data.org/98.png",
      },
      score: {
        winner: null,
        fullTime: { home: null, away: null },
        halfTime: { home: null, away: null },
      },
      odds: { home: 2.2, draw: 3.2, away: 3.3 },
    },

    // --- Ligue 1 (FL1) ---
    {
      id: 700009,
      utcDate: h(72 * 3600000),
      status: "SCHEDULED",
      matchday: 21,
      competition: {
        id: 2015,
        name: "Ligue 1",
        code: "FL1",
        emblem: "https://crests.football-data.org/FL1.png",
      },
      area: {
        id: 2081,
        name: "France",
        code: "FRA",
        flag: "https://crests.football-data.org/773.svg",
      },
      homeTeam: {
        id: 524,
        name: "Paris Saint-Germain FC",
        shortName: "PSG",
        tla: "PSG",
        crest: "https://crests.football-data.org/524.png",
      },
      awayTeam: {
        id: 516,
        name: "Olympique de Marseille",
        shortName: "Marseille",
        tla: "OM",
        crest: "https://crests.football-data.org/516.png",
      },
      score: {
        winner: null,
        fullTime: { home: null, away: null },
        halfTime: { home: null, away: null },
      },
      odds: { home: 1.45, draw: 4.8, away: 6.2 },
    },
  ];

  if (cacheKey) {
    const matchComp = cacheKey.match(/(?:comp:|:)([A-Z0-9_]+)(?:$|:)/i);
    if (matchComp) {
      const code = matchComp[1].toUpperCase();
      const filtered = all.filter((m) => m.competition.code === code);
      return filtered;
    }
  }
  return [];
}

// ─── SWR subscriber registry ───────────────────────────────────────────────────
// Components can subscribe to get notified when background refresh completes.
type SwrCallback<T> = (fresh: T) => void;
const _swrCallbacks = new Map<string, Set<SwrCallback<unknown>>>();

/** Register a callback to receive updated data after a background revalidation */
export function onCacheUpdate<T>(cacheKey: string, cb: SwrCallback<T>): () => void {
  const key = CACHE_PREFIX + cacheKey;
  if (!_swrCallbacks.has(key)) _swrCallbacks.set(key, new Set());
  _swrCallbacks.get(key)!.add(cb as SwrCallback<unknown>);
  return () => _swrCallbacks.get(key)?.delete(cb as SwrCallback<unknown>);
}

function _notifySubscribers<T>(cacheKey: string, data: T) {
  const key = CACHE_PREFIX + cacheKey;
  _swrCallbacks.get(key)?.forEach((cb) => {
    try {
      cb(data);
    } catch {
      /* ignore */
    }
  });
}

// ─── Low-level storage helpers (Memory-Only) ──────────────────────────────────
const FOOTBALL_MEM_CACHE = new Map<string, CacheEntry<any>>();

function cacheGet<T>(key: string): CacheEntry<T> | null {
  return (FOOTBALL_MEM_CACHE.get(CACHE_PREFIX + key) as CacheEntry<T>) || null;
}

function cacheSet<T>(key: string, data: T): void {
  FOOTBALL_MEM_CACHE.set(CACHE_PREFIX + key, { data, ts: Date.now() });
}

function isFresh(entry: CacheEntry<unknown>, ttlMs: number): boolean {
  return Date.now() - entry.ts < ttlMs;
}

/** Remove entries older than 2 hours to free up space */
function clearOldEntries(): void {
  const twoHours = 2 * 60 * 60_000;
  for (const [k, entry] of FOOTBALL_MEM_CACHE.entries()) {
    if (Date.now() - entry.ts > twoHours) {
      FOOTBALL_MEM_CACHE.delete(k);
    }
  }
}

// ─── Core stale-while-revalidate fetch ───────────────────────────────────────
/**
 * Implements SWR:
 *  - Fresh cache  → return immediately, no fetch
 *  - Stale cache  → return immediately, fetch in background, notify subscribers
 *  - No cache     → fetch synchronously, store result
 *  - Fetch error  → return stale cache or offline fallback from localStorage
 */
async function cachedFetch<T>(
  cacheKey: string,
  ttlKey: TTLKey,
  fetcher: () => Promise<T>,
): Promise<{ data: T; fromCache: boolean; stale: boolean }> {
  const ttlMs = TTL[ttlKey];
  const entry = cacheGet<T>(cacheKey);

  // Normalize cached entry if matches exist
  if (entry?.data && Array.isArray((entry.data as any).matches)) {
    (entry.data as any).matches = (entry.data as any).matches.map(normalizeAndCorrectMatch);
  }

  // A response containing any LIVE/IN_PLAY/PAUSED match must use the short live TTL,
  // even if this cache entry's category is "fixtures" (which mixes live + scheduled).
  const effectiveTtlMs = entry && hasLiveMatch(entry.data) ? TTL.live : ttlMs;

  const isMockOrFallback =
    (entry?.data as any)?.source === "built_in_fallback" ||
    (entry?.data as any)?.source === "local_storage_fallback" ||
    (entry?.data as any)?.source === "mock" ||
    ((entry?.data as any)?.matches?.some((m: any) => m.id >= 600000) ?? false);

  // ── Case 1: Fresh real cache → return immediately ──────────────────────────
  if (entry && !isMockOrFallback && isFresh(entry, effectiveTtlMs)) {
    return { data: entry.data, fromCache: true, stale: false };
  }

  // ── Case 2: Stale cache (or mock cache) → return immediately + background refresh
  if (entry && !isMockOrFallback) {
    // Background refresh — don't await
    fetcher()
      .then((fresh) => {
        if ((fresh as any)?.matches) {
          (fresh as any).matches = (fresh as any).matches.map(normalizeAndCorrectMatch);
        }
        cacheSet(cacheKey, fresh);
        _notifySubscribers(cacheKey, fresh);
      })
      .catch((err) => {
        console.warn("[footballCache] Background refresh failed for", cacheKey, err?.message);
      });

    return { data: entry.data, fromCache: true, stale: true };
  }

  // ── Case 3: No cache → synchronous fetch ──────────────────────────────────
  try {
    const data = await fetcher();
    if (data && Array.isArray((data as any).matches)) {
      (data as any).matches = (data as any).matches.map(normalizeAndCorrectMatch);
      cacheSet(cacheKey, data);
      return { data, fromCache: false, stale: false };
    }
    const fallbackMatches = getAnyCachedMatches(cacheKey);
    const fallbackData = { matches: fallbackMatches, source: "built_in_fallback" } as unknown as T;
    return { data: fallbackData, fromCache: true, stale: true };
  } catch (err) {
    console.warn("[footballCache] Network fetch failed, using fallback:", err);
    const fallbackMatches = getAnyCachedMatches(cacheKey);
    const fallbackData = { matches: fallbackMatches, source: "built_in_fallback" } as unknown as T;
    return { data: fallbackData, fromCache: true, stale: true };
  }
}

// ─── Public types ─────────────────────────────────────────────────────────────

export interface FootballMatch {
  id: number;
  utcDate: string;
  status: string;
  minute?: number | null;
  displayClock?: string | null;
  matchday?: number | null;
  competition: { id: number; name: string; code: string; emblem: string };
  area: { id: number; name: string; code: string; flag: string };
  homeTeam: { id: number; name: string; shortName: string; tla: string; crest: string };
  awayTeam: { id: number; name: string; shortName: string; tla: string; crest: string };
  score: {
    winner: string | null;
    fullTime: { home: number | null; away: number | null };
    halfTime: { home: number | null; away: number | null };
  };
  odds?: { home: number; draw: number; away: number };
}

interface MatchesResponse {
  matches: FootballMatch[];
  source?: string;
}

export interface StandingRow {
  position: number;
  played: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  form: string | null;
  season: string;
  team: {
    id: string;
    external_id: string;
    name: string;
    short_name: string;
    tla: string;
    crest_url: string | null;
    logo_storage_path: string | null;
  };
}

interface StandingsResponse {
  standings: StandingRow[];
  source?: string;
}

function safeFetch(urlPath: string): Promise<Response> {
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const fullUrl = urlPath.startsWith("http") ? urlPath : `${origin}${urlPath}`;
  return fetch(fullUrl);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch multi-competition fixtures with optional date range.
 * Returns stale data immediately while revalidating in background.
 */
export async function getFixtures(
  competitions: string[],
  dateFrom?: string,
  dateTo?: string,
): Promise<MatchesResponse> {
  const key = `fixtures:${[...competitions].sort().join(",")}:${dateFrom || ""}:${dateTo || ""}`;

  let urlPath = `/api/football/matches?competitions=${competitions.join(",")}`;
  if (dateFrom) urlPath += `&dateFrom=${dateFrom}`;
  if (dateTo) urlPath += `&dateTo=${dateTo}`;

  const result = await cachedFetch<MatchesResponse>(key, "fixtures", async () => {
    const res = await safeFetch(urlPath);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  });

  return result.data;
}

/**
 * Fetch fixtures for a single competition, optionally filtered by status.
 * Returns stale data immediately while revalidating in background.
 */
export async function getCompetitionFixtures(
  code: string,
  status?: "SCHEDULED" | "FINISHED",
): Promise<MatchesResponse> {
  const key = `comp:${code}:${status || "all"}`;
  const urlPath = `/api/football/competitions/${code}/matches${status ? `?status=${status}` : ""}`;
  const ttlKey: TTLKey = status === "FINISHED" ? "finished" : "fixtures";

  const result = await cachedFetch<MatchesResponse>(key, ttlKey, async () => {
    const res = await safeFetch(urlPath);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  });

  return result.data;
}

/**
 * Fetch standings for a single competition.
 * Returns stale data immediately while revalidating in background.
 */
export async function getCompetitionStandings(code: string): Promise<StandingsResponse> {
  const key = `standings:${code}`;
  const urlPath = `/api/football/competitions/${code}/standings`;

  const result = await cachedFetch<StandingsResponse>(key, "standings", async () => {
    const res = await safeFetch(urlPath);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  });

  return result.data;
}

/**
 * Force-invalidate cache entries for given competitions.
 * Call after a manual sync to ensure next fetch is fresh.
 */
export function invalidateCompetitions(codes: string[]): void {
  for (const k of FOOTBALL_MEM_CACHE.keys()) {
    if (!k.startsWith(CACHE_PREFIX)) continue;
    if (codes.some((code) => k.includes(code))) {
      FOOTBALL_MEM_CACHE.delete(k);
    }
  }
}

/** Clear all football cache entries. */
export function clearFootballCache(): void {
  FOOTBALL_MEM_CACHE.clear();
}

/** Get cache stats for debugging. */
export function getCacheStats(): { keys: number; totalBytes: number } {
  let keys = 0;
  let totalBytes = 0;
  for (const [k, entry] of FOOTBALL_MEM_CACHE.entries()) {
    if (!k.startsWith(CACHE_PREFIX)) continue;
    keys++;
    totalBytes += JSON.stringify(entry).length * 2;
  }
  return { keys, totalBytes };
}
