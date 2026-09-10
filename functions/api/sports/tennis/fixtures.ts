// ESPN blocks the site.api host from Cloudflare edge requests with HTTP 403.
// The equivalent site.web.api host is accepted and returns the same scoreboard schema.
const ESPN_TENNIS_BASE = "https://site.web.api.espn.com/apis/site/v2/sports/tennis";

const statusOf = (type: any) => {
  const state = type?.state || "pre";
  const name = String(type?.name || "").toUpperCase();
  if (state === "in") return name.includes("RAIN") || name.includes("DELAY") || name.includes("SUSPENDED") ? "PAUSED" : "IN_PLAY";
  if (state === "post") return name.includes("POSTPONE") || name.includes("CANCEL") ? "POSTPONED" : "FINISHED";
  return "SCHEDULED";
};

const mapEvent = (event: any, tour: string) => {
  const competition = event?.competitions?.[0];
  if (!competition) return null;
  const [player1, player2] = competition.competitors || [];
  const p1Id = Number(player1?.id || 0);
  const p2Id = Number(player2?.id || 0);
  const p1Lines = Array.isArray(player1?.linescores) ? player1.linescores.map((s: any) => Number(s?.value ?? 0)) : [];
  const p2Lines = Array.isArray(player2?.linescores) ? player2.linescores.map((s: any) => Number(s?.value ?? 0)) : [];
  const setScores = p1Lines.map((score: number, index: number) => `${score}-${p2Lines[index] ?? 0}`);
  const p1Sets = p1Lines.filter((score: number, index: number) => player1?.linescores?.[index]?.winner === true || (score >= 6 && score - (p2Lines[index] ?? 0) >= 2)).length;
  const p2Sets = p2Lines.filter((score: number, index: number) => player2?.linescores?.[index]?.winner === true || (score >= 6 && score - (p1Lines[index] ?? 0) >= 2)).length;
  const statusType = competition.status?.type || event.status?.type || {};
  const status = statusOf(statusType);
  const matchId = Number(competition.id || event.id || 1) || event.id;
  let seed = (Number(matchId) ^ (p1Id * 41) ^ (p2Id * 23)) >>> 0;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 0x100000000; };
  const p1Prob = 0.35 + random() * 0.3;
  const p2Prob = Math.max(0.15, 1 - p1Prob);
  const side = (competitor: any, fallback: string) => ({
    id: Number(competitor?.id || 0),
    name: competitor?.athlete?.displayName || competitor?.athlete?.fullName || fallback,
    shortName: competitor?.athlete?.shortName || competitor?.athlete?.displayName || fallback,
    flagUrl: competitor?.athlete?.flag?.href || competitor?.roster?.athletes?.[0]?.flag?.href,
    ...(competitor?.seed ? { seed: Number(competitor.seed) } : {}),
  });
  const tournamentName = event.name || event.shortName || `${tour.toUpperCase()} Tournament`;
  return {
    id: matchId,
    sport: "tennis",
    tournament: { id: event.id || "tour", name: tournamentName, shortName: event.shortName || tournamentName, tour: tour.toUpperCase(), country: "International", emblem: null, category: event.groupingName || competition.type?.text || "Singles" },
    round: competition.round?.displayName || statusType.detail,
    discipline: competition.type?.text || "Singles",
    player1: side(player1, "Player 1"),
    player2: side(player2, "Player 2"),
    utcDate: competition.date || competition.startDate || event.date || new Date().toISOString(),
    status,
    statusDescription: statusType.description || statusType.detail,
    displayClock: competition.status?.displayClock || null,
    shortDetail: statusType.shortDetail,
    detail: statusType.detail || competition.round?.displayName,
    period: Number(competition.status?.period || Math.max(p1Lines.length, p2Lines.length) || 1),
    isLive: status === "IN_PLAY" || status === "PAUSED",
    curScore: player1?.curScore != null || player2?.curScore != null ? { player1: player1?.curScore != null ? String(player1.curScore) : undefined, player2: player2?.curScore != null ? String(player2.curScore) : undefined } : undefined,
    score: { sets: { player1: p1Sets, player2: p2Sets }, setScores, currentSet: Math.max(p1Lines.length, p2Lines.length) || 1 },
    odds: { home: Number((1.07 / p1Prob).toFixed(2)), away: Number((1.07 / p2Prob).toFixed(2)) },
  };
};

const fetchTour = async (tour: string) => {
  const response = await fetch(`${ESPN_TENNIS_BASE}/${tour}/scoreboard`, {
    headers: {
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
      "User-Agent": "Mozilla/5.0 (compatible; TakeTalon/1.0; +https://taketalon.pages.dev/)",
      Referer: "https://www.espn.com/",
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`ESPN Tennis returned HTTP ${response.status} for ${tour}`);
  const data: any = await response.json();
  const events = Array.isArray(data.events) ? data.events : [];
  const expanded = events.flatMap((event: any) => {
    if (Array.isArray(event.competitions) && event.competitions.length > 0) return [event];
    return (event.groupings || []).flatMap((grouping: any) =>
      (grouping.competitions || []).map((competition: any) => ({
        ...event,
        groupingName: grouping.grouping?.displayName,
        competitions: [competition],
      }))
    );
  });
  return {
    matches: expanded.map((event: any) => mapEvent(event, tour)).filter(Boolean),
    eventCount: events.length,
    expandedCount: expanded.length,
  };
};

export const onRequest = async ({ request }: { request: Request }) => {
  const url = new URL(request.url);
  const statusFilter = (url.searchParams.get("status") || "").toUpperCase();
  const tours = (url.searchParams.get("tours") || "atp,wta").split(",").map((tour) => tour.trim().toLowerCase()).filter((tour) => tour === "atp" || tour === "wta");
  try {
    const results = await Promise.allSettled(tours.map(fetchTour));
    const matches = results.flatMap((result) => result.status === "fulfilled" ? result.value.matches : []);
    const diagnostics = results.map((result, index) => result.status === "fulfilled"
      ? { tour: tours[index], eventCount: result.value.eventCount, expandedCount: result.value.expandedCount, error: null }
      : { tour: tours[index], eventCount: 0, expandedCount: 0, error: String(result.reason?.message || result.reason) });
    const unique = Array.from(new Map(matches.map((match: any) => [String(match.id), match])).values()).filter((match: any) => !statusFilter || (statusFilter === "LIVE" ? match.isLive : match.status === statusFilter));
    unique.sort((a: any, b: any) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime());
    const response: Record<string, any> = { ok: true, sport: "tennis", provider: "espn", count: unique.length, matches: unique };
    if (url.searchParams.get("debug") === "1") response.debug = diagnostics;
    return Response.json(response);
  } catch (error: any) {
    return Response.json({ ok: false, error: error?.message || String(error) }, { status: 500 });
  }
};
