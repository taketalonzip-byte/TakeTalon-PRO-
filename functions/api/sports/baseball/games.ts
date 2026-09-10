import { genericEspnGames } from "../_generic-espn";
export const onRequest = async () => Response.json({ games: await genericEspnGames("baseball", [{ code: "MLB", slug: "mlb", name: "Major League Baseball", country: "USA" }, { code: "NCAAB", slug: "college-baseball", name: "NCAA Baseball", country: "USA" }]), source: "espn" });
