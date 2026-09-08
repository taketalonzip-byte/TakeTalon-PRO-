/**
 * footballCache.ts
 *
 * Frontend local-storage caching layer for football data.
 *
 * Flow (stale-while-revalidate):
 *   1. Check memory/localStorage — if present and FRESH, return immediately
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

import { getLeagueLogoUrl } from "./leagueLogos";

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
  // Logo priority: 1) ESPN official (modern branding, e.g. new LALIGA crest)
  //                 2) football-data.org emblem (legacy fallback only)
  const compEmblem =
    getLeagueLogoUrl(compCode) ||
    m.competition?.emblem ||
    `https://crests.football-data.org/${compCode}.png`;

  // Odds resolution priority:
  // 1) Explicit `odds` object ({ home, draw, away })
  // 2) Supabase snake_case columns (`odds_home`, `odds_draw`, `odds_away`)
  // 3) CamelCase properties (`oddsHome`, `oddsDraw`, `oddsAway`)
  // Only trusted API/database odds are accepted; missing odds stay unavailable.
  let odds = m.odds;
  if (!odds && m.odds_home != null && m.odds_draw != null && m.odds_away != null) {
    odds = {
      home: Number(m.odds_home),
      draw: Number(m.odds_draw),
      away: Number(m.odds_away),
    };
  } else if (!odds && m.oddsHome != null && m.oddsDraw != null && m.oddsAway != null) {
    odds = {
      home: Number(m.oddsHome),
      draw: Number(m.oddsDraw),
      away: Number(m.oddsAway),
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
  hydratePersistedCache();
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

// ─── Low-level storage helpers (memory + persistent browser snapshot) ─────────
const FOOTBALL_MEM_CACHE = new Map<string, CacheEntry<any>>();
const FOOTBALL_STORAGE_KEY = "taketalon_football_cache_v2";
const FOOTBALL_STORAGE_MAX_AGE_MS = 48 * 60 * 60_000;

type PersistedFootballCache = Record<string, CacheEntry<any>>;

function readPersistedCache(): PersistedFootballCache {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(FOOTBALL_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PersistedFootballCache;
    const now = Date.now();
    return Object.fromEntries(
      Object.entries(parsed).filter(([, entry]) => entry && now - entry.ts <= FOOTBALL_STORAGE_MAX_AGE_MS),
    );
  } catch {
    return {};
  }
}

function persistCache(): void {
  if (typeof window === "undefined") return;
  try {
    const entries = Object.fromEntries(FOOTBALL_MEM_CACHE.entries());
    window.localStorage.setItem(FOOTBALL_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Storage may be unavailable or full; memory cache remains usable.
  }
}

function hydratePersistedCache(): void {
  for (const [key, entry] of Object.entries(readPersistedCache())) {
    if (!FOOTBALL_MEM_CACHE.has(key)) FOOTBALL_MEM_CACHE.set(key, entry);
  }
}

function cacheGet<T>(key: string): CacheEntry<T> | null {
  const memoryEntry = FOOTBALL_MEM_CACHE.get(CACHE_PREFIX + key) as CacheEntry<T> | undefined;
  if (memoryEntry) return memoryEntry;

  const persistedEntry = readPersistedCache()[CACHE_PREFIX + key] as CacheEntry<T> | undefined;
  if (persistedEntry) {
    FOOTBALL_MEM_CACHE.set(CACHE_PREFIX + key, persistedEntry);
    return persistedEntry;
  }
  return null;
}

function cacheSet<T>(key: string, data: T): void {
  FOOTBALL_MEM_CACHE.set(CACHE_PREFIX + key, { data, ts: Date.now() });
  persistCache();
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
 *   4. Fetch error → return stale cache or the persisted browser snapshot
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
  const hasCachedMatches = Array.isArray((entry?.data as any)?.matches) && (entry?.data as any).matches.length > 0;

  const isMockOrFallback =
    (entry?.data as any)?.source === "built_in_fallback" ||
    (entry?.data as any)?.source === "local_storage_fallback" ||
    (entry?.data as any)?.source === "mock" ||
    ((entry?.data as any)?.matches?.some((m: any) => m.id >= 600000) ?? false);

  // ── Case 1: Fresh real cache → return immediately ──────────────────────────
  if (entry && hasCachedMatches && !isMockOrFallback && isFresh(entry, effectiveTtlMs)) {
    return { data: entry.data, fromCache: true, stale: false };
  }

  // ── Case 2: Stale cache (or mock cache) → return immediately + background refresh
  if (entry && hasCachedMatches && !isMockOrFallback) {
    // Background refresh — don't await
    fetcher()
      .then((fresh) => {
        if ((fresh as any)?.matches) {
          (fresh as any).matches = (fresh as any).matches.map(normalizeAndCorrectMatch);
        }
        if (
          Array.isArray((fresh as any)?.matches) &&
          (fresh as any).matches.length === 0 &&
          Array.isArray((entry.data as any)?.matches) &&
          (entry.data as any).matches.length > 0
        ) return;
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
      const fallbackMatches = getAnyCachedMatches(cacheKey);
      if ((data as any).matches.length === 0 && fallbackMatches.length > 0) {
        return {
          data: { ...(data as any), matches: fallbackMatches } as T,
          fromCache: true,
          stale: true,
        };
      }
      if ((data as any).matches.length > 0) {
        cacheSet(cacheKey, data);
        return { data, fromCache: false, stale: false };
      }
      const fallbackData = { ...(data as any), matches: [] } as unknown as T;
      return { data: fallbackData, fromCache: false, stale: true };
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
  competitionDbId?: string;
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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  return fetch(fullUrl, { signal: controller.signal }).finally(() => clearTimeout(timeout));
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
 * Synchronously inspect memory / persistent cache for competition fixtures.
 * Returns the cached response immediately if present, allowing instant render without skeleton flash.
 */
export function getCachedCompetitionFixtures(
  code: string,
  status?: "SCHEDULED" | "FINISHED",
): MatchesResponse | null {
  if (!code) return null;
  const key = `comp:${code}:${status || "all"}`;
  const entry = cacheGet<MatchesResponse>(key);
  if (entry?.data && Array.isArray(entry.data.matches) && entry.data.matches.length > 0) {
    return entry.data;
  }
  if (status) {
    const fallbackEntry = cacheGet<MatchesResponse>(`comp:${code}:all`);
    if (fallbackEntry?.data && Array.isArray(fallbackEntry.data.matches) && fallbackEntry.data.matches.length > 0) {
      return fallbackEntry.data;
    }
  }
  return null;
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
  let changed = false;
  for (const k of FOOTBALL_MEM_CACHE.keys()) {
    if (!k.startsWith(CACHE_PREFIX)) continue;
    if (codes.some((code) => k.includes(code))) {
      const entry = FOOTBALL_MEM_CACHE.get(k);
      // Mark the snapshot stale, but keep it available for SWR. Deleting it
      // meant a transient empty provider response could blank an open league.
      if (entry) entry.ts = 0;
      changed = true;
    }
  }
  if (changed) persistCache();
}

/** Clear all football cache entries. */
export function clearFootballCache(): void {
  FOOTBALL_MEM_CACHE.clear();
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(FOOTBALL_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
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
