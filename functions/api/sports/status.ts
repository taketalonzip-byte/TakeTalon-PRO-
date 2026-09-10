interface StatusEnv {
  FOOTBALL_DATA_API_KEY?: string;
  API_TENNIS_KEY?: string;
  BASKETBALL_API_KEY?: string;
  OPEN_GOLF_API_KEY?: string;
  HIGHLIGHTLY_API_KEY?: string;
  BREVO_API_KEY?: string;
}

export const onRequest = async ({ env }: { env: StatusEnv }) => {
  const apis = {
    football: { name: "Football Data (football-data.org)", configured: Boolean(env.FOOTBALL_DATA_API_KEY), sport: "football" },
    tennis: { name: "API Tennis (api-tennis.com / RapidAPI)", configured: Boolean(env.API_TENNIS_KEY), sport: "tennis" },
    basketball: { name: "Basketball API (api-sports / RapidAPI)", configured: Boolean(env.BASKETBALL_API_KEY), sport: "basketball" },
    golf: { name: "Open Golf API (RapidAPI)", configured: Boolean(env.OPEN_GOLF_API_KEY), sport: "golf" },
    highlights: { name: "Highlightly API (Video Highlights)", configured: Boolean(env.HIGHLIGHTLY_API_KEY), sport: "highlights" },
    brevo: { name: "Brevo (Transactional Email / SMS)", configured: Boolean(env.BREVO_API_KEY), service: "communication" },
  };
  const configuredCount = Object.values(apis).filter((api) => api.configured).length;
  const totalCount = Object.keys(apis).length;
  return Response.json({ ok: true, status: configuredCount === totalCount ? "ALL_CONFIGURED" : "PARTIAL_CONFIGURED", configuredCount, totalCount, apis, timestamp: new Date().toISOString(), backend: "cloudflare-pages-function" });
};
