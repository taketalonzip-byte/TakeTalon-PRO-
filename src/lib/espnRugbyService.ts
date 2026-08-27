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
  PREM: {
    code: "PREM",
    slug: "267979",
    path: "rugby",
    name: "Gallagher Premiership",
    country: "England",
    emblemUrl: RUGBY_LOGO("267979"),
  },
  URC: {
    code: "URC",
    slug: "270557",
    path: "rugby",
    name: "United Rugby Championship",
    country: "Europe",
    emblemUrl: RUGBY_LOGO("270557"),
  },
  CHAMPCUP: {
    code: "CHAMPCUP",
    slug: "271937",
    path: "rugby",
    name: "European Rugby Champions Cup",
    country: "Europe",
    emblemUrl: RUGBY_LOGO("271937"),
  },
  CHALLCUP: {
    code: "CHALLCUP",
    slug: "272073",
    path: "rugby",
    name: "European Rugby Challenge Cup",
    country: "Europe",
    emblemUrl: RUGBY_LOGO("272073"),
  },
  SIXNAT: {
    code: "SIXNAT",
    slug: "180659",
    path: "rugby",
    name: "Six Nations",
    country: "Europe",
    emblemUrl: RUGBY_LOGO("180659"),
  },
  NATCHAMP: {
    code: "NATCHAMP",
    slug: "17567",
    path: "rugby",
    name: "Nations Championship",
    country: "International",
    emblemUrl: RUGBY_LOGO("17567"),
  },
  SUPER: {
    code: "SUPER",
    slug: "242041",
    path: "rugby",
    name: "Super Rugby Pacific",
    country: "Oceania",
    emblemUrl: RUGBY_LOGO("242041"),
  },
  SRAOTEAROA: {
    code: "SRAOTEAROA",
    slug: "289271",
    path: "rugby",
    name: "Super Rugby Aotearoa",
    country: "New Zealand",
    emblemUrl: RUGBY_LOGO("289271"),
  },
  SRAU: {
    code: "SRAU",
    slug: "289272",
    path: "rugby",
    name: "Super Rugby AU",
    country: "Australia",
    emblemUrl: RUGBY_LOGO("289272"),
  },
  SRTT: {
    code: "SRTT",
    slug: "289277",
    path: "rugby",
    name: "Super Rugby Trans-Tasman",
    country: "Oceania",
    emblemUrl: RUGBY_LOGO("289277"),
  },
  NPC: {
    code: "NPC",
    slug: "270563",
    path: "rugby",
    name: "Bunnings NPC (Mitre 10 Cup)",
    country: "New Zealand",
    emblemUrl: RUGBY_LOGO("270563"),
  },
  CURRIE: {
    code: "CURRIE",
    slug: "270555",
    path: "rugby",
    name: "Currie Cup",
    country: "South Africa",
    emblemUrl: RUGBY_LOGO("270555"),
  },
  TRC: {
    code: "TRC",
    slug: "244293",
    path: "rugby",
    name: "The Rugby Championship",
    country: "International",
    emblemUrl: RUGBY_LOGO("244293"),
  },
  TRINATIONS: {
    code: "TRINATIONS",
    slug: "289274",
    path: "rugby",
    name: "Tri Nations",
    country: "International",
    emblemUrl: RUGBY_LOGO("289274"),
  },
  RWC: {
    code: "RWC",
    slug: "164205",
    path: "rugby",
    name: "Rugby World Cup",
    country: "International",
    emblemUrl: RUGBY_LOGO("164205"),
  },
  WRWC: {
    code: "WRWC",
    slug: "289237",
    path: "rugby",
    name: "Women's Rugby World Cup",
    country: "International",
    emblemUrl: RUGBY_LOGO("289237"),
  },
  LIONS: {
    code: "LIONS",
    slug: "268565",
    path: "rugby",
    name: "British and Irish Lions Tour",
    country: "International",
    emblemUrl: RUGBY_LOGO("268565"),
  },
  TEST: {
    code: "TEST",
    slug: "289234",
    path: "rugby",
    name: "International Test Match",
    country: "International",
    emblemUrl: RUGBY_LOGO("289234"),
  },
  MLR: {
    code: "MLR",
    slug: "289262",
    path: "rugby",
    name: "Major League Rugby",
    country: "USA",
    emblemUrl: RUGBY_LOGO("289262"),
  },
  URBA: {
    code: "URBA",
    slug: "2009",
    path: "rugby",
    name: "URBA Primera A",
    country: "Argentina",
    emblemUrl: RUGBY_LOGO("2009"),
  },
  URBA14: {
    code: "URBA14",
    slug: "289279",
    path: "rugby",
    name: "URBA Top 14",
    country: "Argentina",
    emblemUrl: RUGBY_LOGO("289279"),
  },
  AWC: {
    code: "AWC",
    slug: "236461",
    path: "rugby",
    name: "Anglo-Welsh Cup",
    country: "England",
    emblemUrl: RUGBY_LOGO("236461"),
  },
  OLYM7: {
    code: "OLYM7",
    slug: "282",
    path: "rugby",
    name: "Olympic Men's Rugby Sevens",
    country: "International",
    emblemUrl: RUGBY_LOGO("282"),
  },
  OLYW7: {
    code: "OLYW7",
    slug: "283",
    path: "rugby",
    name: "Olympic Women's Rugby Sevens",
    country: "International",
    emblemUrl: RUGBY_LOGO("283"),
  },
};

export const DEFAULT_RUGBY_CODES = ["TOP14", "PREM", "URC", "CHAMPCUP", "CHALLCUP", "SIXNAT", "NATCHAMP", "SUPER", "SRAOTEAROA", "SRAU", "SRTT", "NPC", "CURRIE", "TRC", "TRINATIONS", "RWC", "WRWC", "LIONS", "TEST", "MLR", "URBA", "URBA14", "AWC", "OLYM7", "OLYW7"];

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
