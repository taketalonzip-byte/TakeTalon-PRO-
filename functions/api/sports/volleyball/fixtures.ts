const ESPN_BASE = "https://site.web.api.espn.com/apis/site/v2/sports/volleyball";
const LEAGUES = [
  { code: "NCAAWVB", slug: "womens-college-volleyball", name: "NCAA Women's Volleyball", country: "USA", emblem: "https://a.espncdn.com/i/teamlogos/leagues/500/womens-college-volleyball.png" },
  { code: "NCAAMVB", slug: "mens-college-volleyball", name: "NCAA Men's Volleyball", country: "USA", emblem: "https://a.espncdn.com/i/teamlogos/leagues/500/mens-college-volleyball.png" },
];

const odds = (id: string, home: string, away: string) => {
  const hash = Math.abs((Number(id.replace(/\D/g, "").slice(-6)) || 1) ^ home.length * 31 ^ away.length * 17);
  return { home: Math.max(1.1, Math.round((1.3 + (hash % 190) / 100) * 100) / 100), away: Math.max(1.1, Math.round((1.3 + ((hash >> 4) % 190) / 100) * 100) / 100), draw: 1 };
};

const mapEvent = (event: any, league: any) => {
  const competition = event?.competitions?.[0];
  const competitors = competition?.competitors || [];
  const home = competitors.find((c: any) => c.homeAway === "home") || competitors[0];
  const away = competitors.find((c: any) => c.homeAway === "away") || competitors[1];
  if (!competition || !home || !away) return null;
  const type = competition.status?.type || event.status?.type || {};
  const state = type.state;
  const status = state === "in" ? (String(type.shortDetail || "").toLowerCase().includes("break") ? "HALFTIME" : "LIVE") : state === "post" || type.completed ? "FINISHED" : type.name === "STATUS_CANCELLED" ? "CANCELLED" : type.name === "STATUS_POSTPONED" ? "POSTPONED" : "SCHEDULED";
  const homeLines = home.linescores || [];
  const awayLines = away.linescores || [];
  const setScores = Array.from({ length: Math.max(homeLines.length, awayLines.length) }, (_, i) => `${homeLines[i]?.value ?? 0}-${awayLines[i]?.value ?? 0}`);
  const team = (c: any, fallback: string) => ({ id: String(c.team?.id || c.id || fallback), name: c.team?.displayName || c.team?.name || fallback, shortName: c.team?.shortDisplayName || c.team?.abbreviation, tla: c.team?.abbreviation, crest: c.team?.logo || `https://a.espncdn.com/i/teamlogos/ncaa/500/${c.team?.id || "default"}.png` });
  const homeTeam = team(home, "Home Team");
  const awayTeam = team(away, "Away Team");
  const matchId = String(event.id);
  return {
    id: matchId,
    sport: "volleyball",
    competition: { id: league.code, name: league.name, code: league.code, country: league.country, emblem: league.emblem },
    homeTeam,
    awayTeam,
    utcDate: competition.date || competition.startDate || event.date || new Date().toISOString(),
    status,
    statusDescription: type.description || type.detail,
    displayClock: competition.status?.displayClock || null,
    shortDetail: type.shortDetail,
    detail: type.detail,
    period: Number(competition.status?.period || 0),
    isLive: status === "LIVE" || status === "HALFTIME",
    curScore: home.curScore != null || away.curScore != null ? { home: home.curScore != null ? String(home.curScore) : undefined, away: away.curScore != null ? String(away.curScore) : undefined } : undefined,
    score: { sets: { home: Number(home.score || 0), away: Number(away.score || 0) }, setScores, currentSet: Number(competition.status?.period || 0) },
    odds: odds(matchId, homeTeam.id, awayTeam.id),
  };
};

export const onRequest = async () => {
  const results = await Promise.all(LEAGUES.map(async (league) => {
    try {
      const response = await fetch(`${ESPN_BASE}/${league.slug}/scoreboard`, { headers: { Accept: "application/json, text/plain, */*", "Accept-Language": "en-US,en;q=0.9", "User-Agent": "Mozilla/5.0 (compatible; TakeTalon/1.0; +https://taketalon.pages.dev/)", Referer: "https://www.espn.com/" }, signal: AbortSignal.timeout(10000) });
      if (!response.ok) return [];
      const data: any = await response.json();
      return (data.events || []).map((event: any) => mapEvent(event, league)).filter(Boolean);
    } catch { return []; }
  }));
  const matches = results.flat().sort((a: any, b: any) => Number(b.isLive) - Number(a.isLive) || new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime());
  return Response.json({ ok: true, sport: "volleyball", provider: "espn", matches });
};
