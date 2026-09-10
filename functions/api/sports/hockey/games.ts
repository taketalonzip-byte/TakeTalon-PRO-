import { genericEspnGames } from "../_generic-espn";
export const onRequest = async () => Response.json({ games: await genericEspnGames("hockey", [{ code: "NHL", slug: "nhl", name: "National Hockey League", country: "USA" }]), source: "espn" });
