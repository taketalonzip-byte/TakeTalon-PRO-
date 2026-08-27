/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * espnBaseballService.ts — ESPN Baseball scoreboards (MLB, College Baseball).
 * Data source: ESPN only (site.api.espn.com/.../baseball).
 */

import {
  getEspnMatches,
  fetchEspnLeagueScoreboard,
  type EspnGenericMatch,
  type EspnLeagueConfig,
} from "./espnEventCore";

export const ESPN_BASEBALL_LEAGUES: Record<string, EspnLeagueConfig> = {
  MLB: {
    code: "MLB",
    slug: "mlb",
    name: "Major League Baseball",
    country: "USA",
    emblemUrl: "https://a.espncdn.com/i/teamlogos/leagues/500/mlb.png",
  },
  NCAAB: {
    code: "NCAAB",
    slug: "college-baseball",
    name: "NCAA College Baseball",
    country: "USA",
    emblemUrl: "https://a.espncdn.com/i/teamlogos/leagues/500/college-baseball.png",
  },
  NCAASB: {
    code: "NCAASB",
    slug: "college-softball",
    name: "NCAA College Softball",
    country: "USA",
    emblemUrl: "https://a.espncdn.com/i/teamlogos/leagues/500/college-softball.png",
  },
  LLB: {
    code: "LLB",
    slug: "llb",
    name: "Little League World Series",
    country: "International",
    emblemUrl: "https://a.espncdn.com/i/teamlogos/leagues/500/llb.png",
  },
  LLS: {
    code: "LLS",
    slug: "lls",
    name: "Little League Softball World Series",
    country: "International",
    emblemUrl: "https://a.espncdn.com/i/teamlogos/leagues/500/lls.png",
  },
  LIDOM: {
    code: "LIDOM",
    slug: "dominican-winter-league",
    name: "LIDOM — Dominican Winter League",
    country: "Dominican Republic",
    emblemUrl: "https://a.espncdn.com/i/teamlogos/leagues/500/dominican-winter-league.png",
  },
  LMP: {
    code: "LMP",
    slug: "mexican-winter-league",
    name: "Liga Mexicana del Pacifico",
    country: "Mexico",
    emblemUrl: "https://a.espncdn.com/i/teamlogos/leagues/500/mexican-winter-league.png",
  },
  LBPRC: {
    code: "LBPRC",
    slug: "puerto-rican-winter-league",
    name: "Puerto Rico Winter League",
    country: "Puerto Rico",
    emblemUrl: "https://a.espncdn.com/i/teamlogos/leagues/500/puerto-rican-winter-league.png",
  },
  LVBP: {
    code: "LVBP",
    slug: "venezuelan-winter-league",
    name: "Venezuelan Winter League",
    country: "Venezuela",
    emblemUrl: "https://a.espncdn.com/i/teamlogos/leagues/500/venezuelan-winter-league.png",
  },
  CARIB: {
    code: "CARIB",
    slug: "caribbean-series",
    name: "Serie del Caribe",
    country: "International",
    emblemUrl: "https://a.espncdn.com/i/teamlogos/leagues/500/caribbean-series.png",
  },
  WBC: {
    code: "WBC",
    slug: "world-baseball-classic",
    name: "World Baseball Classic",
    country: "International",
    emblemUrl: "https://a.espncdn.com/i/teamlogos/leagues/500/world-baseball-classic.png",
  },
  OLYB: {
    code: "OLYB",
    slug: "olympics-baseball",
    name: "Olympic Baseball",
    country: "International",
    emblemUrl: "https://a.espncdn.com/i/teamlogos/leagues/500/olympics-baseball.png",
  },
};

export const DEFAULT_BASEBALL_CODES = ["MLB", "NCAAB", "NCAASB", "LLB", "LLS", "LIDOM", "LMP", "LBPRC", "LVBP", "CARIB", "WBC", "OLYB"];

export type BaseballMatch = EspnGenericMatch;

/** Innings breakdown helper — periods[] holds one entry per inning. */
export function getInningScores(match: BaseballMatch): { inning: number; home: number; away: number }[] {
  return match.score.periods.map((p) => ({ inning: p.period, home: p.home, away: p.away }));
}

export async function getBaseballMatchesFromEspn(
  codes: string[] = DEFAULT_BASEBALL_CODES
): Promise<BaseballMatch[]> {
  return getEspnMatches("baseball", ESPN_BASEBALL_LEAGUES, codes, {
    sport: "baseball",
    drawEnabled: false,
    drawOdds: 1.0,
  });
}

export async function fetchEspnBaseballScoreboard(code: string): Promise<BaseballMatch[]> {
  const league = ESPN_BASEBALL_LEAGUES[code.toUpperCase()];
  if (!league) throw new Error(`Unsupported baseball competition code: ${code}`);
  return fetchEspnLeagueScoreboard("baseball", league, {
    sport: "baseball",
    drawEnabled: false,
    drawOdds: 1.0,
  });
}
