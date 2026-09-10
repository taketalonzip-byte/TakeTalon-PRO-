import { type SupabaseEnv } from "../_shared";
interface StatusEnv extends SupabaseEnv { VITE_SUPABASE_ANON_KEY?: string; }
export const onRequest = async ({ env }: { env: StatusEnv }) => {
  const start = Date.now();
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY || "";
  if (!env.SUPABASE_URL || !key) return Response.json({ ok: false, configured: false, status: "NOT_CONFIGURED", message: "Supabase credentials hazijawekwa kwenye server." });
  try {
    const response = await fetch(`${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/profiles?select=id&limit=1`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(8000) });
    const latencyMs = Date.now() - start;
    if (!response.ok) return Response.json({ ok: false, configured: true, status: "DB_ERROR", latencyMs, message: "Hitilafu ya Supabase." });
    return Response.json({ ok: true, configured: true, status: "ONLINE", latencyMs, message: "Seva ya Supabase ipo mtandaoni na inafanya kazi vizuri." });
  } catch (error: any) { return Response.json({ ok: false, configured: true, status: "TIMEOUT_OR_UNREACHABLE", latencyMs: Date.now() - start, error: error?.message || String(error) }); }
};
