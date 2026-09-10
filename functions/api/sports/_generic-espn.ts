const headers = { Accept: "application/json, text/plain, */*", "Accept-Language": "en-US,en;q=0.9", "User-Agent": "Mozilla/5.0 (compatible; TakeTalon/1.0; +https://taketalon.pages.dev/)", Referer: "https://www.espn.com/" };
export const genericEspnGames = async (sport: string, leagues: Array<{ code: string; slug: string; name: string; country: string; path?: string }>) => {
  const results = await Promise.all(leagues.map(async (league) => {
    try {
      const path = league.path || sport;
      const response = await fetch(`https://site.web.api.espn.com/apis/site/v2/sports/${path}/${league.slug}/scoreboard`, { headers, signal: AbortSignal.timeout(10000) });
      if (!response.ok) return [];
      const data: any = await response.json();
      return (data.events || []).map((event: any) => {
        const comp = event.competitions?.[0]; const home = comp?.competitors?.find((c: any) => c.homeAway === "home") || comp?.competitors?.[0]; const away = comp?.competitors?.find((c: any) => c.homeAway === "away") || comp?.competitors?.[1];
        if (!home || !away) return null;
        const state = event.status?.type?.state || comp?.status?.type?.state; const status = state === "in" ? "IN_PLAY" : state === "post" ? "FINISHED" : "SCHEDULED";
        return { id: String(event.id), sport, league: league.name, league_logo: null, country: league.country, league_id: league.code.toLowerCase(), home: { name: home.team?.displayName || home.team?.name || "Home Team", short_name: home.team?.abbreviation || "HOME", logo_url: home.team?.logo || null }, away: { name: away.team?.displayName || away.team?.name || "Away Team", short_name: away.team?.abbreviation || "AWAY", logo_url: away.team?.logo || null }, kickoff_utc: event.date || comp.date, status, period: Number(event.status?.period || 0), is_live: status === "IN_PLAY", score: { home: home.score != null ? Number(home.score) : null, away: away.score != null ? Number(away.score) : null }, broadcast: `ESPN ${sport}`, has_odds: false };
      }).filter(Boolean);
    } catch { return []; }
  }));
  return results.flat().sort((a: any, b: any) => Number(b.is_live) - Number(a.is_live) || new Date(a.kickoff_utc).getTime() - new Date(b.kickoff_utc).getTime());
};
