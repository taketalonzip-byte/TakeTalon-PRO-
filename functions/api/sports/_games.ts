export const buildGamesHandler = (loadMatches: (request: Request, env: any) => Promise<Response>, sport: string) => async ({ request, env }: { request: Request; env: any }) => {
  try {
    const response = await loadMatches(request, env);
    const data: any = await response.json();
    const games = (data.matches || []).map((match: any) => {
      const isTennis = sport === "tennis";
      const isVolleyball = sport === "volleyball";
      const home = isTennis ? match.player1 : match.homeTeam;
      const away = isTennis ? match.player2 : match.awayTeam;
      return {
        id: String(match.id), sport: sport[0].toUpperCase() + sport.slice(1),
        league: isTennis ? match.tournament?.name : match.competition?.name,
        league_logo: isTennis ? match.tournament?.emblem || null : match.competition?.emblem || null,
        country: isTennis ? match.tournament?.country || "International" : match.competition?.country || "International",
        league_id: isTennis ? match.tournament?.id : match.competition?.code,
        home: { name: home?.name || "Home Team", short_name: home?.shortName || home?.name || "Home", logo_url: home?.flagUrl || home?.crest || null },
        away: { name: away?.name || "Away Team", short_name: away?.shortName || away?.name || "Away", logo_url: away?.flagUrl || away?.crest || null },
        kickoff_utc: match.utcDate,
        status: match.isLive ? (match.shortDetail || match.status) : match.status,
        period: match.period || 0,
        is_live: Boolean(match.isLive),
        score: match.score || null,
        broadcast: "ESPN",
        has_odds: Boolean(match.odds),
        odds: match.odds || undefined,
      };
    });
    return Response.json({ games, source: "espn" });
  } catch (error: any) {
    return Response.json({ games: [], source: "espn", error: error?.message || String(error) });
  }
};
