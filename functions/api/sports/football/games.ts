import { getMatches, type FootballEnv } from "../../football/_shared";

export const onRequest = async ({ env }: { env: FootballEnv }) => {
  try {
    const codes = ["PL", "PD", "SA", "BL1", "FL1"];
    const results = await Promise.all(codes.map((code) => getMatches(env, code, new URLSearchParams())));
    const games = results.flatMap((result) => result.matches).map((match: any) => ({
      id: String(match.id), sport: "Football", league: match.competition?.name, league_logo: match.competition?.emblem || null,
      country: "International", league_id: match.competition?.code, home: { name: match.homeTeam?.name || "Home Team", short_name: match.homeTeam?.shortName || "Home", logo_url: match.homeTeam?.crest || null },
      away: { name: match.awayTeam?.name || "Away Team", short_name: match.awayTeam?.shortName || "Away", logo_url: match.awayTeam?.crest || null }, kickoff_utc: match.utcDate,
      status: match.status, period: match.minute || 0, is_live: ["IN_PLAY", "PAUSED", "LIVE"].includes(String(match.status).toUpperCase()),
      score: match.score || null, broadcast: "ESPN", has_odds: Boolean(match.odds), odds: match.odds || undefined,
    }));
    return Response.json({ games, source: "cache" });
  } catch (error: any) {
    return Response.json({ games: [], source: "cache", error: error?.message || String(error) });
  }
};
