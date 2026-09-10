import { supabaseGet, type SupabaseEnv } from "./_shared";
export const onRequest = async ({ request, env }: { request: Request; env: SupabaseEnv }) => {
  const q = (new URL(request.url).searchParams.get("q") || "").trim();
  if (!q) return Response.json([]);
  try {
    const escaped = q.replace(/,/g, "");
    const filter = encodeURIComponent(`or=(username.ilike.*${escaped}*,first_name.ilike.*${escaped}*,last_name.ilike.*${escaped}*,phone.ilike.*${escaped}*)`);
    const response = await supabaseGet(env, `profiles?select=id,auth_user_id,username,first_name,last_name,avatar_url,is_pro,is_verified,role,phone,created_at&${filter}&limit=50`);
    return response.ok ? Response.json(await response.json()) : Response.json([]);
  } catch { return Response.json([]); }
};
