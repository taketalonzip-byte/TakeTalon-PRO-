const leagueSlugs: Record<string, string> = {
  PL: "eng.1", ELC: "eng.2", FAC: "eng.fa", EFL: "eng.league_cup", ENG3: "eng.3", ENG4: "eng.4", SCO1: "sco.1",
  PD: "esp.1", CDR: "esp.copa_del_rey", SA: "ita.1", CIT: "ita.coppa_italia", BL1: "ger.1", DFB: "ger.dfb_pokal",
  FL1: "fra.1", CDF: "fra.coupe_de_france", DED: "ned.1", PPL: "por.1", BSA: "bra.1", TUR1: "tur.1",
  CL: "uefa.champions", UEL: "uefa.europa", UECL: "uefa.europa.conf", KSA1: "ksa.1",
};

const emptySide = () => ({ teamId: "", score: null as number | string | null, yellowCards: 0, redCards: 0, scorers: [] as Array<{ name: string; minute: string | null; assist: string | null }> });

export const onRequest = async ({ params }: { params: { league?: string; eventId?: string } }) => {
  const slug = leagueSlugs[String(params.league || "").toUpperCase()];
  const eventId = String(params.eventId || "").replace(/[^0-9]/g, "");
  if (!slug || !eventId) return Response.json({ error: "invalid_espn_event" }, { status: 400 });

  try {
    const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/summary?event=${eventId}`, {
      headers: { Accept: "application/json", "User-Agent": "TakeTalon/1.0" },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return Response.json({ error: "espn_unavailable" }, { status: 502 });
    const payload: any = await response.json();
    const result = (payload?.header?.competitions?.[0]?.competitors || []).reduce((acc: any, competitor: any) => {
      const side = competitor.homeAway === "home" ? "home" : "away";
      acc[side].teamId = String(competitor.team?.id || "");
      acc[side].score = competitor.score?.value ?? competitor.score?.displayValue ?? null;
      return acc;
    }, { home: emptySide(), away: emptySide() });

    for (const play of Array.isArray(payload?.plays) ? payload.plays : []) {
      const teamId = String(play.team?.id || "");
      const side = teamId === result.home.teamId ? "home" : teamId === result.away.teamId ? "away" : null;
      if (!side) continue;
      const text = String(play.text || play.type?.text || "");
      const typeText = String(play.type?.text || "").toLowerCase();
      if (/yellow card|yellow-card/i.test(text) || typeText.includes("yellow")) result[side].yellowCards += 1;
      if (/red card|red-card|sent off|second yellow/i.test(text) || typeText.includes("red")) result[side].redCards += 1;
      if (play.scoringPlay === true || (/goal/i.test(typeText) && !/missed|offside/i.test(text))) {
        const athlete = play.participants?.[0]?.athlete || play.athlete || {};
        const name = athlete.displayName || athlete.shortName || text.split(" - ")[0];
        if (name) {
          const assist = text.match(/assisted by\s+([^.(]+?)(?:\s*\(|\.|$)/i)?.[1]?.trim() || null;
          result[side].scorers.push({ name, minute: play.clock?.displayValue || null, assist });
        }
      }
    }
    return Response.json({ eventId, home: result.home, away: result.away });
  } catch {
    return Response.json({ error: "espn_unavailable" }, { status: 502 });
  }
};
