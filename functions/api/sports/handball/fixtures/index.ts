export const onRequest = async () => Response.json({ ok: true, sport: "handball", provider: "espn", available: false, note: "ESPN does not expose a handball feed.", count: 0, matches: [] });
