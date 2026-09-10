import { supabaseGet, type SupabaseEnv } from "./_shared";
export const onRequest = async ({ env }: { env: SupabaseEnv }) => {
  const start = Date.now();
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return Response.json({ ok: false, configured: false, status: "NOT_CONFIGURED", message: "Supabase credentials hazijawekwa kwenye server." });
  try {
    const response = await supabaseGet(env, "profiles?select=id&limit=1");
    const latencyMs = Date.now() - start;
    if (!response.ok) return Response.json({ ok: false, configured: true, status: "DB_ERROR", latencyMs, message: "Hitilafu ya Supabase." });
    return Response.json({ ok: true, configured: true, status: "ONLINE", latencyMs, message: "Seva ya Supabase ipo mtandaoni na inafanya kazi vizuri." });
  } catch (error: any) { return Response.json({ ok: false, configured: true, status: "TIMEOUT_OR_UNREACHABLE", latencyMs: Date.now() - start, error: error?.message || String(error) }); }
};
