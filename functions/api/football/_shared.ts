export interface FootballEnv {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

const equivalents: Record<string, string[]> = {
  PL: ["PL", "ENG_1"], PD: ["PD", "ESP_1"], SA: ["SA", "ITA_1"], BL1: ["BL1", "GER_1"], FL1: ["FL1", "FRA_1"],
};

export const api = (env: FootballEnv, path: string) => {
  const base = (env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = env.SUPABASE_SERVICE_ROLE_KEY || "";
  return fetch(`${base}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json" }, signal: AbortSignal.timeout(10000) });
};

export const getCompetition = async (env: FootballEnv, code: string) => {
  const codes = equivalents[code.toUpperCase()] || [code.toUpperCase()];
  const filter = encodeURIComponent(`(${codes.join(",")})`);
  const response = await api(env, `football_competitions?select=id,code,provider,name,emblem_url&code=in.${filter}`);
  if (!response.ok) return null;
  const rows: any[] = await response.json();
  if (!rows.length) return null;
  const espn = rows.find((row) => row.provider === "espn");
  return espn || rows[0];
};

const fixtureSelect = "external_id,utc_kickoff,status,home_score,away_score,winner,matchday,provider,odds_home,odds_draw,odds_away,odds_model,odds_updated_at,current_minute,betting_suspended_until,home_team:football_teams!football_fixtures_home_team_id_fkey(external_id,name,short_name,tla,crest_url),away_team:football_teams!football_fixtures_away_team_id_fkey(external_id,name,short_name,tla,crest_url)";

export const getMatches = async (env: FootballEnv, code: string, params: URLSearchParams) => {
  const competition = await getCompetition(env, code);
  if (!competition) return { matches: [], source: "empty" };
  const filters = [`competition_id=eq.${encodeURIComponent(competition.id)}`, "order=utc_kickoff.asc", "limit=200"];
  const dateFrom = params.get("dateFrom"); const dateTo = params.get("dateTo"); const status = params.get("status");
  if (dateFrom) filters.push(`utc_kickoff=gte.${encodeURIComponent(dateFrom)}`);
  if (dateTo) filters.push(`utc_kickoff=lte.${encodeURIComponent(dateTo)}`);
  if (status) filters.push(`status=eq.${encodeURIComponent(status.toUpperCase())}`);
  const response = await api(env, `football_fixtures?select=${fixtureSelect}&${filters.join("&")}`);
  if (!response.ok) return { matches: [], source: "empty", competitionDbId: String(competition.id) };
  const rows: any[] = await response.json();
  const matches = rows.map((row) => ({
    id: row.external_id, utcDate: row.utc_kickoff, status: row.status, minute: row.current_minute ?? null, displayClock: null,
    bettingSuspendedUntil: row.betting_suspended_until ?? null, matchday: row.matchday ?? null,
    competition: { id: 0, name: competition.name, code: competition.code || code, emblem: competition.emblem_url || "" },
    homeTeam: { id: row.home_team?.external_id ?? 0, name: row.home_team?.name ?? "Home Team", shortName: row.home_team?.short_name || row.home_team?.name || "Home", tla: row.home_team?.tla || "HOM", crest: row.home_team?.crest_url || "" },
    awayTeam: { id: row.away_team?.external_id ?? 0, name: row.away_team?.name ?? "Away Team", shortName: row.away_team?.short_name || row.away_team?.name || "Away", tla: row.away_team?.tla || "AWY", crest: row.away_team?.crest_url || "" },
    score: { winner: row.winner, fullTime: { home: row.home_score, away: row.away_score }, halfTime: { home: null, away: null } },
    odds: row.odds_home != null && row.odds_draw != null && row.odds_away != null ? { home: Number(row.odds_home), draw: Number(row.odds_draw), away: Number(row.odds_away) } : undefined,
    odds_model: row.odds_model ?? null, odds_updated_at: row.odds_updated_at ?? null,
  }));
  return { matches, source: "cache", competitionDbId: String(competition.id) };
};

export const jsonError = (error: any) => Response.json({ matches: [], source: "empty", error: error?.message || String(error) }, { status: 200 });
