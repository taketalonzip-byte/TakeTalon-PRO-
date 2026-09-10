import { onRequest as loadBouts } from "./fixtures";
export const onRequest = async () => {
  try {
    const response = await loadBouts();
    const data: any = await response.json();
    const games = (data.bouts || []).map((bout: any) => ({
      id: String(bout.id), sport: "Boxing", league: bout.event, league_logo: null, country: "International", league_id: "espn-boxing",
      home: { name: bout.fighterA?.name || "Fighter A", short_name: bout.fighterA?.name || "Fighter A", logo_url: bout.fighterA?.flag || null },
      away: { name: bout.fighterB?.name || "Fighter B", short_name: bout.fighterB?.name || "Fighter B", logo_url: bout.fighterB?.flag || null },
      kickoff_utc: bout.utcDate, status: bout.isLive ? bout.shortDetail || `Round ${bout.round}` : bout.status, period: bout.round, is_live: Boolean(bout.isLive), score: null, broadcast: "ESPN", has_odds: true, odds: bout.odds,
    }));
    return Response.json({ games, source: "espn", available: data.available, note: data.note });
  } catch (error: any) { return Response.json({ games: [], source: "espn", error: error?.message || String(error) }); }
};
