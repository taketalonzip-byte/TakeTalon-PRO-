import { CATALOG_LEAGUE_SLUGS } from "../../../src/lib/footballCatalog";

export interface FootballEnv {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

const equivalents: Record<string, string[]> = {
  PL: ["PL", "ENG_1"], PD: ["PD", "ESP_1"], SA: ["SA", "ITA_1"], BL1: ["BL1", "GER_1"], FL1: ["FL1", "FRA_1"],
};
const ESPN_ALIASES: Record<string, string> = { PL: "eng.1", PD: "esp.1", SA: "ita.1", BL1: "ger.1", FL1: "fra.1", CL: "uefa.champions", UEL: "uefa.europa", UECL: "uefa.europa.conf" };
const normalizeCode = (value: string) => String(value || "").trim().toUpperCase().replace(/[.-]/g, "_");
const espnSlug = (code: string) => {
  const raw = String(code || "").trim();
  const normalized = normalizeCode(raw);
  return ESPN_ALIASES[normalized] || CATALOG_LEAGUE_SLUGS[normalized] || raw.toLowerCase().replace(/_/g, ".");
};
const ESPN_HEADERS = { Accept: "application/json, text/plain, */*", "User-Agent": "Mozilla/5.0 (compatible; TakeTalon/1.0; +https://taketalon.pages.dev/)" };

export const api = (env: FootballEnv, path: string) => {
  const base = (env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = env.SUPABASE_SERVICE_ROLE_KEY || "";
  return fetch(`${base}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json" }, signal: AbortSignal.timeout(10000) });
};

export const getCompetition = async (env: FootballEnv, code: string) => {
  const normalized = normalizeCode(code);
  const codes = [...new Set([...(equivalents[normalized] || []), normalized, String(code).toUpperCase()])];
  const filter = encodeURIComponent(`(${codes.join(",")})`);
  const response = await api(env, `football_competitions?select=id,code,provider,name,emblem_url&code=in.${filter}`);
  if (!response.ok) return null;
  const rows: any[] = await response.json();
  if (!rows.length) return null;
  return rows.find((row) => row.provider === "espn") || rows[0];
};

const fixtureSelect = "external_id,utc_kickoff,status,home_score,away_score,winner,matchday,provider,odds_home,odds_draw,odds_away,odds_model,odds_updated_at,current_minute,betting_suspended_until,home_team:football_teams!football_fixtures_home_team_id_fkey(external_id,name,short_name,tla,crest_url),away_team:football_teams!football_fixtures_away_team_id_fkey(external_id,name,short_name,tla,crest_url)";
const mapEspnEvent = (event: any, code: string) => {
  const comp = event?.competitions?.[0];
  const home = comp?.competitors?.find((c: any) => c.homeAway === "home") || comp?.competitors?.[0];
  const away = comp?.competitors?.find((c: any) => c.homeAway === "away") || comp?.competitors?.[1];
  if (!home || !away) return null;
  const state = event?.status?.type?.state || comp?.status?.type?.state;
  const status = state === "in" ? "IN_PLAY" : state === "post" ? "FINISHED" : "SCHEDULED";
  return { id: Number(event.id) || String(event.id), utcDate: event.date || comp.date, status, minute: Number(event.status?.period || 0), displayClock: event.status?.displayClock || null, matchday: null, competition: { id: 0, name: event.league?.name || event.season?.name || code, code, emblem: event.league?.logo || "" }, homeTeam: { id: Number(home.team?.id) || 0, name: home.team?.displayName || home.team?.name || "Home Team", shortName: home.team?.abbreviation || "HOME", tla: home.team?.abbreviation || "HOM", crest: home.team?.logo || "" }, awayTeam: { id: Number(away.team?.id) || 0, name: away.team?.displayName || away.team?.name || "Away Team", shortName: away.team?.abbreviation || "AWAY", tla: away.team?.abbreviation || "AWY", crest: away.team?.logo || "" }, score: { winner: null, fullTime: { home: home.score != null ? Number(home.score) : null, away: away.score != null ? Number(away.score) : null }, halfTime: { home: null, away: null } }, odds: undefined, odds_model: null, odds_updated_at: null };
};
const getEspnMatches = async (code: string, params: URLSearchParams) => {
  const slug = espnSlug(code);
  const dates = [params.get("dateFrom"), params.get("dateTo")].filter(Boolean).map((x) => String(x).slice(0, 10).replace(/-/g, ""));
  const query = dates.length ? `?dates=${dates.length === 1 ? `${dates[0]}-${dates[0]}` : `${dates[0]}-${dates[1]}`}&limit=1000` : "?limit=1000";
  const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard${query}`, { headers: ESPN_HEADERS, signal: AbortSignal.timeout(12000) });
  if (!response.ok) return { matches: [], source: "espn" };
  const data: any = await response.json();
  let matches = (data.events || []).map((event: any) => mapEspnEvent(event, code)).filter(Boolean);
  const status = params.get("status");
  if (status) matches = matches.filter((match: any) => status === "FINISHED" ? match.status === "FINISHED" : match.status !== "FINISHED");
  return { matches, source: "espn" };
};

export const getMatches = async (env: FootballEnv, code: string, params: URLSearchParams) => {
  const competition = await getCompetition(env, code);
  if (!competition) return getEspnMatches(code, params);
  const filters = [`competition_id=eq.${encodeURIComponent(competition.id)}`, "order=utc_kickoff.asc", "limit=200"];
  const dateFrom = params.get("dateFrom"); const dateTo = params.get("dateTo"); const status = params.get("status");
  if (dateFrom) filters.push(`utc_kickoff=gte.${encodeURIComponent(dateFrom)}`);
  if (dateTo) filters.push(`utc_kickoff=lte.${encodeURIComponent(dateTo)}`);
  if (status) filters.push(`status=eq.${encodeURIComponent(status.toUpperCase())}`);
  const response = await api(env, `football_fixtures?select=${fixtureSelect}&${filters.join("&")}`);
  if (!response.ok) return getEspnMatches(code, params);
  const rows: any[] = await response.json();
  if (!rows.length && status !== "FINISHED") return getEspnMatches(code, params);
  const matches = rows.map((row) => ({ id: row.external_id, utcDate: row.utc_kickoff, status: row.status, minute: row.current_minute ?? null, displayClock: null, bettingSuspendedUntil: row.betting_suspended_until ?? null, matchday: row.matchday ?? null, competition: { id: 0, name: competition.name, code: competition.code || code, emblem: competition.emblem_url || "" }, homeTeam: { id: row.home_team?.external_id ?? 0, name: row.home_team?.name ?? "Home Team", shortName: row.home_team?.short_name || row.home_team?.name || "Home", tla: row.home_team?.tla || "HOM", crest: row.home_team?.crest_url || "" }, awayTeam: { id: row.away_team?.external_id ?? 0, name: row.away_team?.name ?? "Away Team", shortName: row.away_team?.short_name || row.away_team?.name || "Away", tla: row.away_team?.tla || "AWY", crest: row.away_team?.crest_url || "" }, score: { winner: row.winner, fullTime: { home: row.home_score, away: row.away_score }, halfTime: { home: null, away: null } }, odds: row.odds_home != null && row.odds_draw != null && row.odds_away != null ? { home: Number(row.odds_home), draw: Number(row.odds_draw), away: Number(row.odds_away) } : undefined, odds_model: row.odds_model ?? null, odds_updated_at: row.odds_updated_at ?? null }));
  return { matches, source: "supabase" as const, competitionDbId: String(competition.id) };
};

export const jsonError = (error: any) => Response.json({ matches: [], source: "empty", error: error?.message || String(error) }, { status: 200 });
