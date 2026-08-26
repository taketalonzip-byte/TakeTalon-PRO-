/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * espnRugbyService.ts — ESPN Rugby Union + Rugby League scoreboards.
 * Data source: ESPN only (site.api.espn.com/.../rugby|rugby-league).
 */

import {
  getEspnMatches,
  fetchEspnLeagueScoreboard,
  type EspnGenericMatch,
  type EspnLeagueConfig,
} from "./espnEventCore";

const RUGBY_LOGO = (id: string) => `https://a.espncdn.com/i/leaguelogos/rugby/500/${id}.png`;

export const ESPN_RUGBY_LEAGUES: Record<string, EspnLeagueConfig & { path: string }> = {
  TOP14: {
    code: "TOP14",
    slug: "270559",
    path: "rugby",
    name: "French Top 14",
    country: "France",
    emblemUrl: RUGBY_LOGO("270559"),
  },
  URC: {
    code: "URC",
    slug: "270557",
    path: "rugby",
    name: "United Rugby Championship",
    country: "Europe",
    emblemUrl: RUGBY_LOGO("270557"),
  },
  PREM: {
    code: "PREM",
    slug: "267979",
    path: "rugby",
    name: "Gallagher Premiership",
    country: "England",
    emblemUrl: RUGBY_LOGO("267979"),
  },
  SUPER: {
    code: "SUPER",
    slug: "242041",
    path: "rugby",
    name: "Super Rugby Pacific",
    country: "Oceania",
    emblemUrl: RUGBY_LOGO("242041"),
  },
  TRC: {
    code: "TRC",
    slug: "244293",
    path: "rugby",
    name: "The Rugby Championship",
    country: "International",
    emblemUrl: RUGBY_LOGO("244293"),
  },
  RWC: {
    code: "RWC",
    slug: "164205",
    path: "rugby",
    name: "Rugby World Cup",
    country: "International",
    emblemUrl: RUGBY_LOGO("164205"),
  },
  TEST: {
    code: "TEST",
    slug: "289234",
    path: "rugby",
    name: "International Test Match",
    country: "International",
    emblemUrl: RUGBY_LOGO("289234"),
  },
};

export const DEFAULT_RUGBY_CODES = ["TOP14", "URC", "PREM", "SUPER", "TRC", "RWC", "TEST"];

export type RugbyMatch = EspnGenericMatch;

export async function getRugbyMatchesFromEspn(
  codes: string[] = DEFAULT_RUGBY_CODES
): Promise<RugbyMatch[]> {
  const grouped = new Map<string, Record<string, EspnLeagueConfig>>();

  for (const rawCode of codes.length > 0 ? codes : DEFAULT_RUGBY_CODES) {
    const league = ESPN_RUGBY_LEAGUES[rawCode.toUpperCase()];
    if (!league) continue;
    const bucket = grouped.get(league.path) || {};
    bucket[league.code] = league;
    grouped.set(league.path, bucket);
  }

  const results = await Promise.all(
    Array.from(grouped.entries()).map(([path, leagues]) =>
      getEspnMatches(path, leagues, Object.keys(leagues), {
        sport: "rugby",
        drawEnabled: true,
      })
    )
  );

  return results.flat().sort((a, b) => {
    if (a.isLive && !b.isLive) return -1;
    if (!a.isLive && b.isLive) return 1;
    return new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime();
  });
}

export async function fetchEspnRugbyScoreboard(code: string): Promise<RugbyMatch[]> {
  const league = ESPN_RUGBY_LEAGUES[code.toUpperCase()];
  if (!league) throw new Error(`Unsupported rugby competition code: ${code}`);
  return fetchEspnLeagueScoreboard(league.path, league, { sport: "rugby", drawEnabled: true });
}
