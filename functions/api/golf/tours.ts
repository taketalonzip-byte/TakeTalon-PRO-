const tours = [
  { code: "PGA", slug: "pga", name: "PGA TOUR", country: "USA", emblemUrl: "https://a.espncdn.com/i/leaguelogos/golf/500/pga.png" },
  { code: "EUR", slug: "eur", name: "DP World Tour", country: "Europe", emblemUrl: "https://a.espncdn.com/i/leaguelogos/golf/500/eur.png" },
  { code: "LPGA", slug: "lpga", name: "LPGA Tour", country: "USA", emblemUrl: "https://a.espncdn.com/i/leaguelogos/golf/500/lpga.png" },
  { code: "LIV", slug: "liv", name: "LIV Golf", country: "International", emblemUrl: "https://a.espncdn.com/i/leaguelogos/golf/500/liv.png" },
  { code: "CHAMPIONS", slug: "champions-tour", name: "PGA TOUR Champions", country: "USA", emblemUrl: "https://a.espncdn.com/i/leaguelogos/golf/500/champions-tour.png" },
];
export const onRequest = async () => Response.json({ ok: true, provider: "espn", tours });
