interface Env { SUPABASE_URL?: string; SUPABASE_SERVICE_ROLE_KEY?: string; VITE_SUPABASE_ANON_KEY?: string; }
export const onRequest = async ({ env }: { env: Env }) => {
  const start = Date.now();
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY || "";
  if (!env.SUPABASE_URL || !key) return Response.json({ ok: false, configured: false, status: "NOT_CONFIGURED" });
  try {
    const response = await fetch(`${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/profiles?select=id&limit=1`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(8000) });
    const latencyMs = Date.now() - start;
    return Response.json(response.ok ? { ok: true, configured: true, status: "ONLINE", latencyMs, backend: "cloudflare-pages-function" } : { ok: false, configured: true, status: "DB_ERROR", latencyMs, backend: "cloudflare-pages-function" });
  } catch (error: any) {
    return Response.json({ ok: false, configured: true, status: "TIMEOUT_OR_UNREACHABLE", latencyMs: Date.now() - start, backend: "cloudflare-pages-function", error: error?.message || String(error) });
  }
};
