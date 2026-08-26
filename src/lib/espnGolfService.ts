/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * espnGolfService.ts — ESPN Golf leaderboards (PGA, DP World, LPGA, LIV,
 * PGA TOUR Champions).
 * Data source: ESPN only (site.api.espn.com/.../golf/{tour}/scoreboard).
 *
 * Golf is not a two-team fixture: an event is a tournament with a field of
 * athletes, so it gets its own shape (`GolfTournament` + `GolfPlayer`) instead
 * of the home/away match shape used by the other sports.
 */

import { espnFetch } from "./espnEventCore";

const ESPN_GOLF_BASE = "https://site.api.espn.com/apis/site/v2/sports/golf";
const ESPN_TIMEOUT_MS = 8000;
const CACHE_TTL_LIVE_MS = 30_000;
const CACHE_TTL_IDLE_MS = 300_000;

export interface GolfTourConfig {
  code: string;
  slug: string;
  name: string;
  country: string;
  emblemUrl: string;
}

export const ESPN_GOLF_TOURS: Record<string, GolfTourConfig> = {
  PGA: {
    code: "PGA",
    slug: "pga",
    name: "PGA TOUR",
    country: "USA",
    emblemUrl: "https://a.espncdn.com/i/leaguelogos/golf/500/pga.png",
  },
  EUR: {
    code: "EUR",
    slug: "eur",
    name: "DP World Tour",
    country: "Europe",
    emblemUrl: "https://a.espncdn.com/i/leaguelogos/golf/500/eur.png",
  },
  LPGA: {
    code: "LPGA",
    slug: "lpga",
    name: "LPGA Tour",
    country: "USA",
    emblemUrl: "https://a.espncdn.com/i/leaguelogos/golf/500/lpga.png",
  },
  LIV: {
    code: "LIV",
    slug: "liv",
    name: "LIV Golf",
    country: "International",
    emblemUrl: "https://a.espncdn.com/i/leaguelogos/golf/500/liv.png",
  },
  CHAMPIONS: {
    code: "CHAMPIONS",
    slug: "champions-tour",
    name: "PGA TOUR Champions",
    country: "USA",
    emblemUrl: "https://a.espncdn.com/i/leaguelogos/golf/500/champions-tour.png",
  },
};

export const DEFAULT_GOLF_CODES = ["PGA", "EUR", "LPGA", "LIV", "CHAMPIONS"];

export type GolfStatus = "SCHEDULED" | "IN_PLAY" | "FINISHED" | "CANCELLED";

export interface GolfPlayer {
  id: string;
  name: string;
  shortName: string;
  country?: string;
  flag?: string;
  position: number;
  /** Score to par, e.g. "-7", "E". */
  score: string;
  thru?: string;
  today?: string;
  /** Deterministic outright price. */
  odds: number;
}

export interface GolfTournament {
  id: string;
  sport: "golf";
  tour: {
    code: string;
    name: string;
    country: string;
    emblem: string;
  };
  name: string;
  shortName: string;
  startDate: string;
  endDate?: string;
  status: GolfStatus;
  statusDescription?: string;
  shortDetail?: string;
  /** Current round number ("time movement" equivalent for golf). */
  round: number;
  isLive: boolean;
  course?: string;
  broadcast?: string;
  leaderboard: GolfPlayer[];
}

const MEMORY_CACHE = new Map<string, { tournaments: GolfTournament[]; expiresAt: number }>();

function mapStatus(type: any): GolfStatus {
  const state = type?.state || "pre";
  const name = (type?.name || "").toUpperCase();
  if (name.includes("CANCEL")) return "CANCELLED";
  if (state === "in") return "IN_PLAY";
  if (state === "post") return "FINISHED";
  return "SCHEDULED";
}

function computeOutrightOdds(position: number, seed: string): number {
  const hash = seed.split("").reduce((acc, ch) => (Math.imul(acc, 31) + ch.charCodeAt(0)) >>> 0, 11);
  const jitter = (hash % 400) / 100; // 0 - 4
  return Number((3 + position * 1.6 + jitter).toFixed(2));
}

function mapTournament(event: any, tour: GolfTourConfig): GolfTournament | null {
  try {
    const comp = event?.competitions?.[0];
    if (!comp) return null;

    const statusBlock = comp.status || event.status || {};
    const statusType = statusBlock.type || {};
    const status = mapStatus(statusType);

    const competitors: any[] = Array.isArray(comp.competitors) ? comp.competitors : [];
    const leaderboard: GolfPlayer[] = competitors
      .slice()
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
      .map((c, index) => {
        const athlete = c.athlete || {};
        const position = c.order ?? index + 1;
        const id = String(c.id || athlete.id || index);
        const linescore = Array.isArray(c.linescores) ? c.linescores[c.linescores.length - 1] : null;

        return {
          id,
          name: athlete.displayName || athlete.fullName || `Player ${position}`,
          shortName: athlete.shortName || athlete.displayName || `P${position}`,
          country: athlete.flag?.alt,
          flag: athlete.flag?.href,
          position,
          score: c.score != null ? String(c.score) : "E",
          thru: c.status?.thru != null ? String(c.status.thru) : linescore?.thru ? String(linescore.thru) : undefined,
          today: linescore?.displayValue != null ? String(linescore.displayValue) : undefined,
          odds: computeOutrightOdds(position, `${event.id}-${id}`),
        };
      });

    return {
      id: String(event.id),
      sport: "golf",
      tour: {
        code: tour.code,
        name: tour.name,
        country: tour.country,
        emblem: tour.emblemUrl,
      },
      name: event.name || tour.name,
      shortName: event.shortName || event.name || tour.name,
      startDate: comp.startDate || event.date || new Date().toISOString(),
      endDate: event.endDate || comp.endDate,
      status,
      statusDescription: statusType.description || statusType.detail,
      shortDetail: statusType.shortDetail,
      round: Number(statusBlock.period ?? 0),
      isLive: status === "IN_PLAY",
      course: comp.course?.name || comp.venue?.fullName,
      broadcast: comp.broadcast || comp.broadcasts?.[0]?.names?.join("/"),
      leaderboard,
    };
  } catch (err: any) {
    console.warn("[ESPN-Golf] Mapping error:", err?.message || err);
    return null;
  }
}

async function fetchTour(tour: GolfTourConfig): Promise<GolfTournament[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ESPN_TIMEOUT_MS);

  try {
    const res = await espnFetch(`${ESPN_GOLF_BASE}/${tour.slug}/scoreboard`, controller.signal);
    if (!res || !res.ok) {
      console.warn(`[ESPN-Golf] HTTP ${res?.status ?? "no response"} for ${tour.slug}`);
      return [];
    }
    const data = await res.json();
    const events = Array.isArray(data.events) ? data.events : [];
    const tournaments: GolfTournament[] = [];
    for (const evt of events) {
      const mapped = mapTournament(evt, tour);
      if (mapped) tournaments.push(mapped);
    }
    return tournaments;
  } catch (err: any) {
    console.warn(`[ESPN-Golf] Fetch failed for ${tour.slug}:`, err?.message || err);
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

export async function getGolfTournamentsFromEspn(
  codes: string[] = DEFAULT_GOLF_CODES
): Promise<GolfTournament[]> {
  const targetCodes = codes.length > 0 ? codes : DEFAULT_GOLF_CODES;
  const all: GolfTournament[] = [];

  await Promise.allSettled(
    targetCodes.map(async (rawCode) => {
      const code = rawCode.toUpperCase();
      const tour = ESPN_GOLF_TOURS[code];
      if (!tour) return;

      const cached = MEMORY_CACHE.get(code);
      if (cached && Date.now() < cached.expiresAt) {
        all.push(...cached.tournaments);
        return;
      }

      const tournaments = await fetchTour(tour);
      const anyLive = tournaments.some((t) => t.isLive);
      MEMORY_CACHE.set(code, {
        tournaments,
        expiresAt: Date.now() + (anyLive ? CACHE_TTL_LIVE_MS : CACHE_TTL_IDLE_MS),
      });
      all.push(...tournaments);
    })
  );

  return all.sort((a, b) => {
    if (a.isLive && !b.isLive) return -1;
    if (!a.isLive && b.isLive) return 1;
    return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
  });
}

export async function fetchEspnGolfLeaderboard(code: string): Promise<GolfTournament[]> {
  const tour = ESPN_GOLF_TOURS[code.toUpperCase()];
  if (!tour) throw new Error(`Unsupported golf tour code: ${code}`);
  return fetchTour(tour);
}
