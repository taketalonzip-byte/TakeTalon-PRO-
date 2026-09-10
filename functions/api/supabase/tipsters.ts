import { supabaseGet, type SupabaseEnv } from "./_shared";
export const onRequest = async ({ request, env }: { request: Request; env: SupabaseEnv }) => {
  try {
    const exclude = new URL(request.url).searchParams.get("exclude");
    let path = "profiles?select=id,auth_user_id,username,first_name,last_name,avatar_url,is_pro,is_verified,role,created_at&order=is_pro.desc,is_verified.desc&limit=100";
    if (exclude) path += `&auth_user_id=neq.${encodeURIComponent(exclude)}`;
    const response = await supabaseGet(env, path);
    return response.ok ? Response.json(await response.json()) : Response.json([]);
  } catch { return Response.json([]); }
};
