const competitions = [
  { code: "NCAAWVB", slug: "womens-college-volleyball", name: "NCAA Women's Volleyball", country: "USA", emblemUrl: "https://a.espncdn.com/i/teamlogos/leagues/500/womens-college-volleyball.png" },
  { code: "NCAAMVB", slug: "mens-college-volleyball", name: "NCAA Men's Volleyball", country: "USA", emblemUrl: "https://a.espncdn.com/i/teamlogos/leagues/500/mens-college-volleyball.png" },
];
export const onRequest = async () => Response.json({ ok: true, provider: "espn", competitions });
