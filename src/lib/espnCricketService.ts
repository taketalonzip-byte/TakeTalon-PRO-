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
  IPL: { code: "IPL", slug: "8048", name: "Indian Premier League", country: "India", emblemUrl: CRICKET_LOGO("8048") },
  RANJI: { code: "RANJI", slug: "8050", name: "Ranji Trophy", country: "India", emblemUrl: CRICKET_LOGO("8050") },
  BBL: { code: "BBL", slug: "8044", name: "Big Bash League", country: "Australia", emblemUrl: CRICKET_LOGO("8044") },
  SHIELD: { code: "SHIELD", slug: "8043", name: "Sheffield Shield", country: "Australia", emblemUrl: CRICKET_LOGO("8043") },
  COUNTY: { code: "COUNTY", slug: "8052", name: "County Championship Division One", country: "England", emblemUrl: CRICKET_LOGO("8052") },
  T20BLAST: { code: "T20BLAST", slug: "8053", name: "Vitality T20 Blast", country: "England", emblemUrl: CRICKET_LOGO("8053") },
  SUPERSPORT: { code: "SUPERSPORT", slug: "8041", name: "SuperSport Series", country: "South Africa", emblemUrl: CRICKET_LOGO("8041") },
  STANDARDBANK: { code: "STANDARDBANK", slug: "8042", name: "Standard Bank Cup", country: "South Africa", emblemUrl: CRICKET_LOGO("8042") },
  SLT20W: { code: "SLT20W", slug: "8045", name: "Sri Lanka Inter-Provincial T20", country: "Sri Lanka", emblemUrl: CRICKET_LOGO("8045") },
  CLT20: { code: "CLT20", slug: "8082", name: "Champions League Twenty20", country: "International", emblemUrl: CRICKET_LOGO("8082") },
  WC: { code: "WC", slug: "8039", name: "ICC Cricket World Cup", country: "International", emblemUrl: CRICKET_LOGO("8039") },
  WTC: { code: "WTC", slug: "19430", name: "ICC World Test Championship", country: "International", emblemUrl: CRICKET_LOGO("19430") },
  CT: { code: "CT", slug: "8037", name: "ICC Champions Trophy", country: "International", emblemUrl: CRICKET_LOGO("8037") },
  WCQ: { code: "WCQ", slug: "8038", name: "ICC Cricket World Cup Qualifier", country: "International", emblemUrl: CRICKET_LOGO("8038") },
  T20WCQ: { code: "T20WCQ", slug: "8040", name: "ICC Men's T20 World Cup Qualifier", country: "International", emblemUrl: CRICKET_LOGO("8040") },
};

export const DEFAULT_CRICKET_CODES = Object.keys(ESPN_CRICKET_LEAGUES);

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
