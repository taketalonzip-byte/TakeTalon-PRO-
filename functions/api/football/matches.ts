import { getMatches, jsonError, type FootballEnv } from "./_shared";

export const onRequest = async ({ request, env }: { request: Request; env: FootballEnv }) => {
  const url = new URL(request.url);
  const codes = (url.searchParams.get("competitions") || "").split(",").map((code) => code.trim().toUpperCase()).filter(Boolean);
  if (!codes.length) return Response.json({ matches: [], source: "empty" });
  try {
    const results = await Promise.all(codes.map((code) => getMatches(env, code, url.searchParams)));
    return Response.json({ matches: results.flatMap((result) => result.matches), source: results.some((result) => result.matches.length) ? "cache" : "empty" });
  } catch (error: any) {
    return jsonError(error);
  }
};
