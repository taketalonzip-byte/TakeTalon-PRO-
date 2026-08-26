/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * espnEventCore.ts
 *
 * Shared ESPN scoreboard core used by the team-based sport services
 * (rugby, baseball, cricket, handball, ...). It mirrors the behaviour that
 * espnHockeyService.ts / espnVolleyballService.ts already implement:
 *   - timeout-protected fetch of `.../{sport}/{league}/scoreboard`
 *   - in-memory cache with a short TTL while a match is live
 *   - normalised status + real live clock / period ("time movement")
 *   - deterministic odds fallback when ESPN ships no moneyline
 *
 * Every consumer stays ESPN-only: no other provider is contacted.
 */

export const ESPN_SITE_BASE = "https://site.api.espn.com/apis/site/v2/sports";
export const ESPN_TIMEOUT_MS = 8000;


/**
 * ESPN's edge rejects unknown User-Agent strings with HTTP 403, so requests
 * fall back through a list of accepted client identifiers.
 */
export const ESPN_USER_AGENTS = ["curl/8.7.1", "okhttp/4.9.3", "Go-http-client/2.0"];

export async function espnFetch(url: string, signal?: AbortSignal): Promise<Response | null> {
  let last: Response | null = null;
  for (const ua of ESPN_USER_AGENTS) {
    const res = await fetch(url, {
      signal,
      headers: { Accept: "application/json", "User-Agent": ua },
    });
    if (res.ok) return res;
    last = res;
    if (res.status !== 403) break;
  }
  return last;
}

export const CACHE_TTL_LIVE_MS = 20_000;
export const CACHE_TTL_IDLE_MS = 180_000;

export interface EspnLeagueConfig {
  /** Internal stable code used by the API + UI (e.g. "TOP14", "MLB", "IPL"). */
  code: string;
  /** ESPN path segment or numeric league id (e.g. "mlb", "270559"). */
  slug: string;
  name: string;
  country: string;
  emblemUrl: string;
}

export type EspnMatchStatus =
  | "SCHEDULED"
  | "IN_PLAY"
  | "PAUSED"
  | "FINISHED"
  | "POSTPONED"
  | "CANCELLED";

export interface EspnTeamSide {
  id: string;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
  /** Raw ESPN score string — cricket uses "161/5 (18/20 ov)". */
  displayScore?: string;
}

export interface EspnOdds {
  home: number;
  away: number;
  draw: number;
}

export interface EspnPeriodScore {
  period: number;
  home: number;
  away: number;
  /** Cricket innings extras. */
  homeDetail?: string;
  awayDetail?: string;
}

export interface EspnGenericMatch {
  id: string;
  sport: string;
  competition: {
    id: string;
    code: string;
    name: string;
    country: string;
    emblem: string;
  };
  homeTeam: EspnTeamSide;
  awayTeam: EspnTeamSide;
  utcDate: string;
  status: EspnMatchStatus;
  statusDescription?: string;
  /** Live movement fields. */
  clock: string | null;
  displayClock: string | null;
  shortDetail?: string;
  detail?: string;
  summary?: string;
  period: number;
  isLive: boolean;
  venue?: string;
  broadcast?: string;
  score: {
    fullTime: { home: number | null; away: number | null };
    periods: EspnPeriodScore[];
  };
  odds: EspnOdds;
}

interface CacheEntry {
  matches: EspnGenericMatch[];
  expiresAt: number;
}

const MEMORY_CACHE = new Map<string, CacheEntry>();

export function mapEspnState(type: any): EspnMatchStatus {
  const state = type?.state || "pre";
  const name = (type?.name || type?.description || "").toUpperCase();

  if (state === "pre") return "SCHEDULED";
  if (state === "in") {
    if (
      name.includes("INTERMISSION") ||
      name.includes("HALFTIME") ||
      name.includes("BREAK") ||
      name.includes("RAIN") ||
      name.includes("DELAY") ||
      name.includes("STUMPS") ||
      name.includes("INNINGS BREAK")
    ) {
      return "PAUSED";
    }
    return "IN_PLAY";
  }
  if (state === "post") {
    if (name.includes("POSTPONE")) return "POSTPONED";
    if (name.includes("CANCEL") || name.includes("ABANDON")) return "CANCELLED";
    return "FINISHED";
  }
  return "SCHEDULED";
}

/** Deterministic odds so the same fixture always yields the same price. */
export function computeDeterministicOdds(
  seedId: string,
  homeId: string,
  awayId: string,
  options: { drawEnabled: boolean; drawOdds?: number } = { drawEnabled: false }
): EspnOdds {
  const hashOf = (value: string) =>
    value.split("").reduce((acc, ch) => (Math.imul(acc, 31) + ch.charCodeAt(0)) >>> 0, 7);

  let s = (hashOf(seedId) ^ Math.imul(hashOf(homeId), 37) ^ Math.imul(hashOf(awayId), 19)) >>> 0;
  const rng = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };

  const margin = 1.07;
  const drawProb = options.drawEnabled ? 0.12 + rng() * 0.1 : 0;
  const homeProb = (1 - drawProb) * (0.38 + rng() * 0.26);
  const awayProb = Math.max(0.12, 1 - drawProb - homeProb);

  return {
    home: Number(Math.max(1.05, margin / homeProb).toFixed(2)),
    away: Number(Math.max(1.05, margin / awayProb).toFixed(2)),
    draw: options.drawEnabled
      ? Number(Math.max(2.5, margin / Math.max(0.05, drawProb)).toFixed(2))
      : options.drawOdds ?? 1.0,
  };
}

function parseNumericScore(raw: any): number | null {
  if (raw == null || raw === "") return null;
  const match = String(raw).match(/-?\d+/);
  if (!match) return null;
  const value = parseInt(match[0], 10);
  return Number.isFinite(value) ? value : null;
}

function buildSide(competitor: any, fallback: string): EspnTeamSide {
  const team = competitor?.team || {};
  const id = String(team.id || competitor?.id || fallback);
  const name = team.displayName || team.name || competitor?.athlete?.displayName || fallback;
  const abbreviation = (team.abbreviation || name.substring(0, 3) || fallback).toUpperCase();

  return {
    id,
    name,
    shortName: team.shortDisplayName || team.abbreviation || name,
    tla: abbreviation,
    crest:
      team.logo ||
      team.logos?.[0]?.href ||
      competitor?.athlete?.flag?.href ||
      `https://a.espncdn.com/i/teamlogos/countries/500/${(team.countryCode || "int").toLowerCase()}.png`,
    displayScore: competitor?.score != null ? String(competitor.score) : undefined,
  };
}

export interface MapOptions {
  sport: string;
  drawEnabled: boolean;
  drawOdds?: number;
}

export function mapEspnEvent(
  event: any,
  league: EspnLeagueConfig,
  options: MapOptions
): EspnGenericMatch | null {
  try {
    const comp = event?.competitions?.[0];
    if (!comp) return null;

    const competitors: any[] = comp.competitors || [];
    const homeComp = competitors.find((c) => c.homeAway === "home") || competitors[0];
    const awayComp = competitors.find((c) => c.homeAway === "away") || competitors[1];
    if (!homeComp || !awayComp) return null;

    const statusBlock = comp.status || event.status || {};
    const statusType = statusBlock.type || {};
    const status = mapEspnState(statusType);
    const isLive = status === "IN_PLAY" || status === "PAUSED";

    const homeTeam = buildSide(homeComp, "Home");
    const awayTeam = buildSide(awayComp, "Away");

    const periods: EspnPeriodScore[] = [];
    const homeLines: any[] = Array.isArray(homeComp.linescores) ? homeComp.linescores : [];
    const awayLines: any[] = Array.isArray(awayComp.linescores) ? awayComp.linescores : [];
    const periodCount = Math.max(homeLines.length, awayLines.length);

    for (let i = 0; i < periodCount; i++) {
      const h = homeLines[i] || {};
      const a = awayLines[i] || {};
      periods.push({
        period: h.period ?? a.period ?? i + 1,
        home: Number(h.runs ?? h.value ?? 0),
        away: Number(a.runs ?? a.value ?? 0),
        homeDetail:
          h.wickets != null || h.overs != null ? `${h.runs ?? 0}/${h.wickets ?? 0} (${h.overs ?? 0} ov)` : undefined,
        awayDetail:
          a.wickets != null || a.overs != null ? `${a.runs ?? 0}/${a.wickets ?? 0} (${a.overs ?? 0} ov)` : undefined,
      });
    }

    let odds: EspnOdds;
    const providerOdds = Array.isArray(comp.odds) ? comp.odds[0] : null;
    if (providerOdds?.moneyline?.home?.close?.odds || providerOdds?.moneyline?.home?.moneyLine) {
      const ml = providerOdds.moneyline;
      odds = {
        home: Number(ml.home?.close?.odds ?? ml.home?.moneyLine ?? 1.9) || 1.9,
        away: Number(ml.away?.close?.odds ?? ml.away?.moneyLine ?? 1.9) || 1.9,
        draw: options.drawEnabled ? Number(ml.draw?.close?.odds ?? 3.4) || 3.4 : options.drawOdds ?? 1.0,
      };
    } else {
      odds = computeDeterministicOdds(String(event.id), homeTeam.id, awayTeam.id, {
        drawEnabled: options.drawEnabled,
        drawOdds: options.drawOdds,
      });
    }

    return {
      id: String(event.id),
      sport: options.sport,
      competition: {
        id: league.slug,
        code: league.code,
        name: league.name,
        country: league.country,
        emblem: league.emblemUrl,
      },
      homeTeam,
      awayTeam,
      utcDate: comp.date || event.date || new Date().toISOString(),
      status,
      statusDescription: statusType.description || statusType.detail || undefined,
      clock: statusBlock.displayClock ?? null,
      displayClock: statusBlock.displayClock ?? null,
      shortDetail: statusType.shortDetail || undefined,
      detail: statusType.detail || undefined,
      summary: statusBlock.summary || event.status?.summary || undefined,
      period: Number(statusBlock.period ?? 0),
      isLive,
      venue: comp.venue?.fullName || undefined,
      broadcast: comp.broadcast || comp.broadcasts?.[0]?.names?.join("/") || undefined,
      score: {
        fullTime: {
          home: parseNumericScore(homeComp.score),
          away: parseNumericScore(awayComp.score),
        },
        periods,
      },
      odds,
    };
  } catch (err: any) {
    console.warn(`[ESPN-${options.sport}] Mapping error:`, err?.message || err);
    return null;
  }
}

/** Fetch + map one league scoreboard from ESPN. */
export async function fetchEspnLeagueScoreboard(
  espnSportPath: string,
  league: EspnLeagueConfig,
  options: MapOptions,
  dateRange?: string
): Promise<EspnGenericMatch[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ESPN_TIMEOUT_MS);

  try {
    const url = `${ESPN_SITE_BASE}/${espnSportPath}/${league.slug}/scoreboard${
      dateRange ? `?dates=${dateRange}` : ""
    }`;

    const res = await espnFetch(url, controller.signal);

    if (!res || !res.ok) {
      console.warn(`[ESPN-${options.sport}] HTTP ${res?.status ?? "no response"} for ${league.slug}`);
      return [];
    }

    const data = await res.json();
    const events = Array.isArray(data.events) ? data.events : [];
    const matches: EspnGenericMatch[] = [];

    for (const evt of events) {
      const mapped = mapEspnEvent(evt, league, options);
      if (mapped) matches.push(mapped);
    }

    return matches;
  } catch (err: any) {
    console.warn(`[ESPN-${options.sport}] Fetch failed for ${league.slug}:`, err?.message || err);
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

/** Fetch many leagues concurrently, cached, live matches sorted first. */
export async function getEspnMatches(
  espnSportPath: string,
  leagues: Record<string, EspnLeagueConfig>,
  codes: string[],
  options: MapOptions
): Promise<EspnGenericMatch[]> {
  const targetCodes = codes.length > 0 ? codes : Object.keys(leagues);
  const all: EspnGenericMatch[] = [];

  await Promise.allSettled(
    targetCodes.map(async (rawCode) => {
      const code = rawCode.toUpperCase();
      const league = leagues[code];
      if (!league) return;

      const cacheKey = `${espnSportPath}:${code}`;
      const cached = MEMORY_CACHE.get(cacheKey);
      if (cached && Date.now() < cached.expiresAt) {
        all.push(...cached.matches);
        return;
      }

      const matches = await fetchEspnLeagueScoreboard(espnSportPath, league, options);
      const anyLive = matches.some((m) => m.isLive);
      MEMORY_CACHE.set(cacheKey, {
        matches,
        expiresAt: Date.now() + (anyLive ? CACHE_TTL_LIVE_MS : CACHE_TTL_IDLE_MS),
      });
      all.push(...matches);
    })
  );

  return all.sort((a, b) => {
    if (a.isLive && !b.isLive) return -1;
    if (!a.isLive && b.isLive) return 1;
    return new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime();
  });
}
