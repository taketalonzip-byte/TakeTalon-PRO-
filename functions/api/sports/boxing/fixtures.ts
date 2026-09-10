const ESPN_BOXING_URL = "https://site.api.espn.com/apis/site/v2/sports/boxing/scoreboard";

const emptyFeed = (reason: string) => ({
  ok: true,
  sport: "boxing",
  provider: "espn",
  available: false,
  note: reason,
  count: 0,
  bouts: [],
});

const mapBout = (event: any) => {
  const competition = event?.competitions?.[0];
  if (!competition) return null;
  const [a, b] = competition.competitors || [];
  const status = competition.status || event.status || {};
  const statusType = status.type || {};
  const state = statusType.state || "pre";
  const side = (competitor: any, fallback: string) => ({
    id: String(competitor?.id || fallback),
    name: competitor?.athlete?.displayName || competitor?.athlete?.fullName || fallback,
    record: competitor?.records?.[0]?.summary,
    flag: competitor?.athlete?.flag?.href,
  });
  return {
    id: String(event.id),
    sport: "boxing",
    event: event.name || "Boxing",
    weightClass: competition.type?.text || event.season?.slug,
    rounds: competition.format?.regulation?.periods,
    utcDate: competition.date || event.date || new Date().toISOString(),
    status: state === "in" ? "IN_PLAY" : state === "post" ? "FINISHED" : statusType.name?.includes("CANCEL") ? "CANCELLED" : "SCHEDULED",
    isLive: state === "in",
    round: Number(status.period ?? 0),
    shortDetail: statusType.shortDetail,
    fighterA: side(a, "Fighter A"),
    fighterB: side(b, "Fighter B"),
    odds: { home: 1.9, away: 1.9, draw: 15.0 },
  };
};

export const onRequest = async () => {
  try {
    const response = await fetch(ESPN_BOXING_URL, { signal: AbortSignal.timeout(6000) });
    if (!response.ok) return Response.json(emptyFeed("ESPN does not expose a boxing scoreboard endpoint."));
    const data: any = await response.json();
    const events = Array.isArray(data.events) ? data.events : [];
    const bouts = events.map(mapBout).filter(Boolean);
    return Response.json({
      ok: true,
      sport: "boxing",
      provider: "espn",
      available: true,
      ...(bouts.length === 0 ? { note: "No boxing events scheduled." } : {}),
      count: bouts.length,
      bouts,
    });
  } catch (error: any) {
    return Response.json(emptyFeed(`ESPN boxing probe failed: ${error?.message || String(error)}`));
  }
};
