import { getMatches, jsonError, type FootballEnv } from "../../_shared";

type Context = { request: Request; env: FootballEnv; params: { code: string } };
export const onRequest = async ({ request, env, params }: Context) => {
  try {
    return Response.json(await getMatches(env, params.code, new URL(request.url).searchParams));
  } catch (error: any) {
    return jsonError(error);
  }
};
