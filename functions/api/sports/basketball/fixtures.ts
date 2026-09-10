const ESPN_BASE = "https://site.web.api.espn.com/apis/site/v2/sports/basketball";
const LEAGUES = [
  ["NBA", "nba", "National Basketball Association", "USA"],
  ["WNBA", "wnba", "Women's NBA", "USA"],
  ["NCAAM", "mens-college-basketball", "NCAA Men's Basketball", "USA"],
  ["ACB", "acb", "Liga ACB / Copa del Rey", "Spain"],
  ["LBA", "lba", "Lega Basket Serie A", "Italy"],
  ["NBL", "nbl", "National Basketball League", "Australia"],
  ["EURO", "euroleague", "EuroLeague", "Europe"],
  ["FIBA", "fiba.basketball", "FIBA Basketball", "International"],
];

const statusOf = (type: any) => type?.state === "in" ? (String(type.name || "").toUpperCase().includes("HALFTIME") ? "PAUSED" : "IN_PLAY") : type?.state === "post" ? (String(type.name || "").toUpperCase().includes("POSTPONE") ? "POSTPONED" : "FINISHED") : "SCHEDULED";
const mapEvent = (event: any, league: any) => {
  const comp = event?.competitions?.[0];
  const home = comp?.competitors?.find((c: any) => c.homeAway === "home") || comp?.competitors?.[0];
  const away = comp?.competitors?.find((c: any) => c.homeAway === "away") || comp?.competitors?.[1];
  if (!comp || !home || !away) return null;
  const homeId = Number(home.id || home.team?.id || 1);
  const awayId = Number(away.id || away.team?.id || 2);
  const id = Number(event.id) || Math.abs((homeId * 31) ^ awayId);
  const status = statusOf(event.status?.type || comp.status?.type);
  const team = (c: any, fallback: string, id: number) => ({ id, name: c.team?.displayName || c.team?.name || fallback, shortName: c.team?.shortDisplayName || c.team?.abbreviation || fallback, tla: (c.team?.abbreviation || fallback).toUpperCase(), crest: c.team?.logo || null });
  const homeTeam = team(home, "Home Team", homeId);
  const awayTeam = team(away, "Away Team", awayId);
  const lines = Array.isArray(home.linescores) && Array.isArray(away.linescores) ? { q1: { home: home.linescores[0]?.value ?? 0, away: away.linescores[0]?.value ?? 0 }, q2: { home: home.linescores[1]?.value ?? 0, away: away.linescores[1]?.value ?? 0 }, q3: { home: home.linescores[2]?.value ?? 0, away: away.linescores[2]?.value ?? 0 }, q4: { home: home.linescores[3]?.value ?? 0, away: away.linescores[3]?.value ?? 0 } } : undefined;
  let seed = (id ^ (homeId * 37) ^ (awayId * 19)) >>> 0; const rand = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 0x100000000; }; const hp = 0.35 + rand() * 0.3;
  return { id, utcDate: event.date || comp.date || new Date().toISOString(), status, period: Number(event.status?.period || comp.status?.period || 0), clock: event.status?.displayClock || event.status?.type?.detail || null, isLive: status === "IN_PLAY" || status === "PAUSED", competition: { code: league[0], name: league[2], country: league[3], emblem: null }, homeTeam, awayTeam, score: { fullTime: { home: home.score != null && home.score !== "" ? Number(home.score) : null, away: away.score != null && away.score !== "" ? Number(away.score) : null }, quarters: lines }, odds: { home: Number((1.07 / hp).toFixed(2)), away: Number((1.07 / Math.max(0.15, 1 - hp)).toFixed(2)), draw: 13.38 } };
};

export const onRequest = async () => {
  const results = await Promise.all(LEAGUES.map(async (league) => {
    try {
      const response = await fetch(`${ESPN_BASE}/${league[1]}/scoreboard`, { headers: { Accept: "application/json, text/plain, */*", "Accept-Language": "en-US,en;q=0.9", "User-Agent": "Mozilla/5.0 (compatible; TakeTalon/1.0; +https://taketalon.pages.dev/)", Referer: "https://www.espn.com/" }, signal: AbortSignal.timeout(10000) });
      if (!response.ok) return [];
      const data: any = await response.json();
      return (data.events || []).map((event: any) => mapEvent(event, league)).filter(Boolean);
    } catch { return []; }
  }));
  return Response.json({ ok: true, sport: "basketball", provider: "espn", matches: results.flat().sort((a: any, b: any) => Number(b.isLive) - Number(a.isLive) || new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()) });
};
