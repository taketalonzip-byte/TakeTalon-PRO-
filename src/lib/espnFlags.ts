/**
 * Stable ESPN country/team flag asset mapping.
 *
 * ESPN's country flag CDN uses three-letter sport codes (for example, usa and
 * eng), not ISO-2 codes. Keep the mapping explicit so a provider code cannot
 * accidentally create a broken image URL.
 */
export const ESPN_COUNTRY_FLAG_BASE = "https://a.espncdn.com/i/teamlogos/countries/500";

export const ESPN_FLAG_CODES: Record<string, string> = {
  // Common ESPN country codes and aliases
  us: "usa", usa: "usa", unitedstates: "usa", unitedstatesofamerica: "usa",
  england: "eng", eng: "eng", uk: "eng", unitedkingdom: "eng",
  spain: "spa", spa: "spa", espana: "spa",
  germany: "ger", ger: "ger", deutschland: "ger",
  france: "fra", fra: "fra",
  italy: "ita", ita: "ita", italia: "ita",
  portugal: "por", por: "por",
  netherlands: "ned", ned: "ned", nederland: "ned",
  brazil: "bra", bra: "bra", brasil: "bra",
  saudiarabia: "ksa", ksa: "ksa",
  canada: "can", can: "can",
  sweden: "swe", swe: "swe",
  russia: "rus", rus: "rus",
  poland: "pol", pol: "pol",
  argentina: "arg", arg: "arg",
  switzerland: "sui", sui: "sui",
  japan: "jpn", jpn: "jpn",
  china: "chn", chn: "chn",
  greece: "gre", gre: "gre",
  serbia: "srb", srb: "srb",
  australia: "aus", aus: "aus",
  mexico: "mex", mex: "mex",
  india: "ind", ind: "ind",
  southkorea: "kor", korea: "kor", kor: "kor",
  // ESPN has assets for these non-country groupings as well.
  europe: "eu", eu: "eu",
  international: "int", int: "int", world: "int",
};

function normalizeFlagKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function getEspnFlagUrl(countryOrCode?: string | null): string | null {
  if (!countryOrCode) return null;
  const code = ESPN_FLAG_CODES[normalizeFlagKey(countryOrCode)];
  return code ? ESPN_COUNTRY_FLAG_BASE + "/" + code + ".png" : null;
}
