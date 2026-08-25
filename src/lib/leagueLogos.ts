/**
 * Official & Modern League Logos from ESPN CDN (500x500 high-resolution).
 * Always up-to-date with current official branding (e.g. new modern LaLiga, Ligue 1, Serie A, etc.).
 */

export const ESPN_LEAGUE_LOGOS: Record<string, string> = {
  // Spain
  PD: "https://a.espncdn.com/i/leaguelogos/soccer/500/15.png", // Modern LALIGA
  LALIGA: "https://a.espncdn.com/i/leaguelogos/soccer/500/15.png",
  CDR: "https://a.espncdn.com/i/leaguelogos/soccer/500/80.png", // Copa del Rey
  "esp.copa_del_rey": "https://a.espncdn.com/i/leaguelogos/soccer/500/80.png",
  "esp.1": "https://a.espncdn.com/i/leaguelogos/soccer/500/15.png",

  // United Kingdom / England / Scotland
  PL: "https://a.espncdn.com/i/leaguelogos/soccer/500/23.png", // Premier League
  EPL: "https://a.espncdn.com/i/leaguelogos/soccer/500/23.png",
  "eng.1": "https://a.espncdn.com/i/leaguelogos/soccer/500/23.png",
  ELC: "https://a.espncdn.com/i/leaguelogos/soccer/500/24.png", // Championship
  "eng.2": "https://a.espncdn.com/i/leaguelogos/soccer/500/24.png",
  FAC: "https://a.espncdn.com/i/leaguelogos/soccer/500/40.png", // FA Cup
  "eng.fa": "https://a.espncdn.com/i/leaguelogos/soccer/500/40.png",
  EFL: "https://a.espncdn.com/i/leaguelogos/soccer/500/41.png", // Carabao Cup
  "eng.league_cup": "https://a.espncdn.com/i/leaguelogos/soccer/500/41.png",
  ENG3: "https://a.espncdn.com/i/leaguelogos/soccer/500/25.png", // League One
  "eng.3": "https://a.espncdn.com/i/leaguelogos/soccer/500/25.png",
  ENG4: "https://a.espncdn.com/i/leaguelogos/soccer/500/26.png", // League Two
  "eng.4": "https://a.espncdn.com/i/leaguelogos/soccer/500/26.png",
  SCO1: "https://a.espncdn.com/i/leaguelogos/soccer/500/45.png", // Scottish Premiership
  "sco.1": "https://a.espncdn.com/i/leaguelogos/soccer/500/45.png",

  // Italy
  SA: "https://a.espncdn.com/i/leaguelogos/soccer/500/12.png", // Serie A
  "ita.1": "https://a.espncdn.com/i/leaguelogos/soccer/500/12.png",
  CIT: "https://a.espncdn.com/i/leaguelogos/soccer/500/2192.png", // Coppa Italia
  "ita.coppa_italia": "https://a.espncdn.com/i/leaguelogos/soccer/500/2192.png",

  // Germany
  BL1: "https://a.espncdn.com/i/leaguelogos/soccer/500/10.png", // Bundesliga
  "ger.1": "https://a.espncdn.com/i/leaguelogos/soccer/500/10.png",
  DFB: "https://a.espncdn.com/i/leaguelogos/soccer/500/2061.png", // DFB-Pokal
  "ger.dfb_pokal": "https://a.espncdn.com/i/leaguelogos/soccer/500/2061.png",

  // France
  FL1: "https://a.espncdn.com/i/leaguelogos/soccer/500/9.png", // Ligue 1
  "fra.1": "https://a.espncdn.com/i/leaguelogos/soccer/500/9.png",
  CDF: "https://a.espncdn.com/i/leaguelogos/soccer/500/182.png", // Coupe de France
  "fra.coupe_de_france": "https://a.espncdn.com/i/leaguelogos/soccer/500/182.png",

  // Netherlands & Portugal
  DED: "https://a.espncdn.com/i/leaguelogos/soccer/500/11.png", // Eredivisie
  "ned.1": "https://a.espncdn.com/i/leaguelogos/soccer/500/11.png",
  PPL: "https://a.espncdn.com/i/leaguelogos/soccer/500/14.png", // Primeira Liga
  "por.1": "https://a.espncdn.com/i/leaguelogos/soccer/500/14.png",

  // Brazil & Turkey & Saudi Arabia
  BSA: "https://a.espncdn.com/i/leaguelogos/soccer/500/85.png", // Brasileirão
  "bra.1": "https://a.espncdn.com/i/leaguelogos/soccer/500/85.png",
  TUR1: "https://a.espncdn.com/i/leaguelogos/soccer/500/18.png", // Süper Lig
  "tur.1": "https://a.espncdn.com/i/leaguelogos/soccer/500/18.png",
  KSA1: "https://a.espncdn.com/i/leaguelogos/soccer/500/2488.png", // Saudi Pro League
  "ksa.1": "https://a.espncdn.com/i/leaguelogos/soccer/500/2488.png",

  // UEFA & FIFA Tournaments
  CL: "https://a.espncdn.com/i/leaguelogos/soccer/500/2.png", // UEFA Champions League
  "uefa.champions": "https://a.espncdn.com/i/leaguelogos/soccer/500/2.png",
  UEL: "https://a.espncdn.com/i/leaguelogos/soccer/500/2310.png", // UEFA Europa League
  "uefa.europa": "https://a.espncdn.com/i/leaguelogos/soccer/500/2310.png",
  UECL: "https://a.espncdn.com/i/leaguelogos/soccer/500/20296.png", // UEFA Conference League
  "uefa.europa.conf": "https://a.espncdn.com/i/leaguelogos/soccer/500/20296.png",
  WC: "https://a.espncdn.com/i/leaguelogos/soccer/500/4.png", // FIFA World Cup
  "fifa.world": "https://a.espncdn.com/i/leaguelogos/soccer/500/4.png",
  CLI: "https://a.espncdn.com/i/leaguelogos/soccer/500/58.png", // CONMEBOL Libertadores
  "conmebol.libertadores": "https://a.espncdn.com/i/leaguelogos/soccer/500/58.png",
};

/**
 * Returns the modern official ESPN logo URL for any league code or name.
 */
export function getLeagueLogoUrl(codeOrName?: string | null): string {
  if (!codeOrName) return ESPN_LEAGUE_LOGOS.PL;

  const clean = codeOrName.trim().toUpperCase();
  if (ESPN_LEAGUE_LOGOS[clean]) return ESPN_LEAGUE_LOGOS[clean];
  if (ESPN_LEAGUE_LOGOS[codeOrName.trim()]) return ESPN_LEAGUE_LOGOS[codeOrName.trim()];

  // Name heuristic checks
  const lower = codeOrName.toLowerCase();
  if (lower.includes("laliga") || lower.includes("la liga") || lower.includes("espagne") || lower.includes("spain") || lower.includes("primera")) {
    return ESPN_LEAGUE_LOGOS.PD;
  }
  if (lower.includes("premier") || lower.includes("epl") || lower.includes("uk") || lower.includes("england") || lower.includes("uingereza")) {
    return ESPN_LEAGUE_LOGOS.PL;
  }
  if (lower.includes("championship")) return ESPN_LEAGUE_LOGOS.ELC;
  if (lower.includes("carabao") || lower.includes("efl cup") || lower.includes("league cup")) return ESPN_LEAGUE_LOGOS.EFL;
  if (lower.includes("fa cup")) return ESPN_LEAGUE_LOGOS.FAC;
  if (lower.includes("serie a") || lower.includes("italy") || lower.includes("italia")) return ESPN_LEAGUE_LOGOS.SA;
  if (lower.includes("bundesliga") || lower.includes("germany") || lower.includes("allemagne") || lower.includes("ujerumani")) return ESPN_LEAGUE_LOGOS.BL1;
  if (lower.includes("ligue 1") || lower.includes("france") || lower.includes("ufaransa")) return ESPN_LEAGUE_LOGOS.FL1;
  if (lower.includes("champions league") || lower.includes("ucl")) return ESPN_LEAGUE_LOGOS.CL;
  if (lower.includes("europa league") || lower.includes("uel")) return ESPN_LEAGUE_LOGOS.UEL;
  if (lower.includes("conference") || lower.includes("uecl")) return ESPN_LEAGUE_LOGOS.UECL;
  if (lower.includes("eredivisie") || lower.includes("netherlands") || lower.includes("dutch")) return ESPN_LEAGUE_LOGOS.DED;
  if (lower.includes("primeira") || lower.includes("portugal")) return ESPN_LEAGUE_LOGOS.PPL;
  if (lower.includes("saudi") || lower.includes("spl")) return ESPN_LEAGUE_LOGOS.KSA1;
  if (lower.includes("brasil") || lower.includes("brazil")) return ESPN_LEAGUE_LOGOS.BSA;
  if (lower.includes("turkey") || lower.includes("super lig")) return ESPN_LEAGUE_LOGOS.TUR1;
  if (lower.includes("scottish") || lower.includes("scotland")) return ESPN_LEAGUE_LOGOS.SCO1;
  if (lower.includes("world cup") || lower.includes("fifa")) return ESPN_LEAGUE_LOGOS.WC;
  if (lower.includes("libertadores")) return ESPN_LEAGUE_LOGOS.CLI;

  return ESPN_LEAGUE_LOGOS.PL;
}
