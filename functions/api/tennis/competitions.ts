const competitions = [
  { code: "ATP", slug: "atp", name: "ATP Tour", tour: "ATP", country: "International", emblemUrl: "https://a.espncdn.com/i/teamlogos/leagues/500/atp.png" },
  { code: "WTA", slug: "wta", name: "WTA Tour", tour: "WTA", country: "International", emblemUrl: "https://a.espncdn.com/i/teamlogos/leagues/500/wta.png" },
];
export const onRequest = async () => Response.json({ ok: true, provider: "espn", competitions });
