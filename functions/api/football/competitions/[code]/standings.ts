import { api, getCompetition, type FootballEnv } from "../../_shared";

type Context = { env: FootballEnv; params: { code: string } };
export const onRequest = async ({ env, params }: Context) => {
  try {
    const competition = await getCompetition(env, params.code);
    if (!competition) return Response.json({ standings: [], source: "empty" });
    const response = await api(env, `football_standings?select=position,played,won,draw,lost,points,goals_for,goals_against,goal_difference,form,season,team:football_teams!football_standings_team_id_fkey(id,external_id,name,short_name,tla,crest_url,logo_storage_path)&competition_id=eq.${encodeURIComponent(competition.id)}&order=position.asc&limit=200`);
    if (!response.ok) return Response.json({ standings: [], source: "empty" });
    const rows: any[] = await response.json();
    return Response.json({ standings: rows.map((row) => ({ position: row.position, played: row.played, won: row.won, draw: row.draw, lost: row.lost, points: row.points, goalsFor: row.goals_for, goalsAgainst: row.goals_against, goalDifference: row.goal_difference, form: row.form, season: row.season, team: row.team })) , source: "cache" });
  } catch {
    return Response.json({ standings: [], source: "empty" });
  }
};
