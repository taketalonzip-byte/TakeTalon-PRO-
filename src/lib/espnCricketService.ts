/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * espnCricketService.ts — ESPN (Cricinfo) cricket scoreboards.
 * Data source: ESPN only (site.api.espn.com/.../cricket/{seriesId}).
 *
 * Cricket scores are strings like "161/5 (18/20 ov, target 156)". The core
 * mapper keeps the raw ESPN string on `displayScore` and exposes runs/wickets
 * per innings through `score.periods`.
 */

import {
  getEspnMatches,
  fetchEspnLeagueScoreboard,
  type EspnGenericMatch,
  type EspnLeagueConfig,
} from "./espnEventCore";

const CRICKET_LOGO = (id: string) => `https://a.espncdn.com/i/leaguelogos/cricket/500/${id}.png`;

export const ESPN_CRICKET_LEAGUES: Record<string, EspnLeagueConfig> = {
  IPL: {
    code: "IPL",
    slug: "8048",
    name: "Indian Premier League",
    country: "India",
    emblemUrl: CRICKET_LOGO("8048"),
  },
  WC: {
    code: "WC",
    slug: "8039",
    name: "ICC Cricket World Cup",
    country: "International",
    emblemUrl: CRICKET_LOGO("8039"),
  },
  WTC: {
    code: "WTC",
    slug: "19430",
    name: "ICC World Test Championship",
    country: "International",
    emblemUrl: CRICKET_LOGO("19430"),
  },
};

export const DEFAULT_CRICKET_CODES = ["IPL", "WC", "WTC"];

export type CricketMatch = EspnGenericMatch;

export interface CricketInnings {
  innings: number;
  runs: number;
  detail?: string;
}

export function getCricketInnings(match: CricketMatch): {
  home: CricketInnings[];
  away: CricketInnings[];
} {
  return {
    home: match.score.periods.map((p) => ({ innings: p.period, runs: p.home, detail: p.homeDetail })),
    away: match.score.periods.map((p) => ({ innings: p.period, runs: p.away, detail: p.awayDetail })),
  };
}

export async function getCricketMatchesFromEspn(
  codes: string[] = DEFAULT_CRICKET_CODES
): Promise<CricketMatch[]> {
  return getEspnMatches("cricket", ESPN_CRICKET_LEAGUES, codes, {
    sport: "cricket",
    drawEnabled: true,
  });
}

export async function fetchEspnCricketScoreboard(code: string): Promise<CricketMatch[]> {
  const league = ESPN_CRICKET_LEAGUES[code.toUpperCase()];
  if (!league) throw new Error(`Unsupported cricket series code: ${code}`);
  return fetchEspnLeagueScoreboard("cricket", league, { sport: "cricket", drawEnabled: true });
}
