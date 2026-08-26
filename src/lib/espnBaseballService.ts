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
    emblemUrl: "https://a.espncdn.com/i/teamlogos/leagues/500/ncaa.png",
  },
};

export const DEFAULT_BASEBALL_CODES = ["MLB", "NCAAB"];

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
