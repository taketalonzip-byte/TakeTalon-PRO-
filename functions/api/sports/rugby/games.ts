import { genericEspnGames } from "../_generic-espn";
export const onRequest = async () => Response.json({ games: await genericEspnGames("rugby", [{ code: "PREM", slug: "267979", path: "rugby", name: "Gallagher Premiership", country: "England" }, { code: "TOP14", slug: "270559", path: "rugby", name: "French Top 14", country: "France" }]), source: "espn" });
