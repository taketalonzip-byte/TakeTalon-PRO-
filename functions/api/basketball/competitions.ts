const competitions = [
  { code: "NBA", slug: "nba", name: "National Basketball Association", country: "USA", emblemUrl: "https://a.espncdn.com/i/teamlogos/leagues/500/nba.png" },
  { code: "WNBA", slug: "wnba", name: "Women's NBA", country: "USA", emblemUrl: "https://a.espncdn.com/i/teamlogos/leagues/500/wnba.png" },
  { code: "NCAAM", slug: "mens-college-basketball", name: "NCAA Men's Basketball", country: "USA", emblemUrl: "https://a.espncdn.com/i/teamlogos/leagues/500/ncaam.png" },
  { code: "ACB", slug: "acb", name: "Liga Endesa", country: "Spain", emblemUrl: "https://a.espncdn.com/i/teamlogos/leagues/500/acb.png" },
  { code: "LBA", slug: "italy", name: "Lega Basket Serie A", country: "Italy", emblemUrl: "https://a.espncdn.com/i/teamlogos/leagues/500/italy.png" },
  { code: "NBL", slug: "nbl", name: "Australian NBL", country: "Australia", emblemUrl: "https://a.espncdn.com/i/teamlogos/leagues/500/nbl.png" },
  { code: "NBB", slug: "nbl", name: "Novo Basquete Brasil", country: "Brazil", emblemUrl: "https://a.espncdn.com/i/teamlogos/leagues/500/nbb.png" },
  { code: "EURO", slug: "euroleague", name: "EuroLeague", country: "Europe", emblemUrl: "https://a.espncdn.com/i/teamlogos/leagues/500/euroleague.png" },
  { code: "FIBA", slug: "fiba", name: "FIBA Basketball", country: "International", emblemUrl: "https://a.espncdn.com/i/teamlogos/leagues/500/fiba.png" },
];
export const onRequest = async () => Response.json({ ok: true, provider: "espn", competitions });
