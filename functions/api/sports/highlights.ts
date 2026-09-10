interface HighlightsEnv {
  HIGHLIGHTLY_API_KEY?: string;
}

export const onRequest = async ({ request, env }: { request: Request; env: HighlightsEnv }) => {
  const apiKey = String(env.HIGHLIGHTLY_API_KEY || "").trim();
  if (!apiKey) {
    return Response.json({ ok: false, error: "HIGHLIGHTLY_API_KEY not configured in environment." }, { status: 503 });
  }
  const sport = new URL(request.url).searchParams.get("sport") || "football";
  try {
    const response = await fetch(`https://sport-highlights-api.p.rapidapi.com/highlights?sport=${encodeURIComponent(sport)}`, {
      headers: { "X-RapidAPI-Key": apiKey, "X-RapidAPI-Host": "sport-highlights-api.p.rapidapi.com", Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      return Response.json({ ok: true, sport, highlights: [], note: `Highlights query returned status ${response.status}` });
    }
    const data = await response.json();
    return Response.json({ ok: true, sport, data });
  } catch (error: any) {
    return Response.json({ ok: false, error: String(error?.message || error || "Highlights unavailable") }, { status: 500 });
  }
};
