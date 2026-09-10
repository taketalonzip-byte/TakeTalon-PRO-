interface AviatorEnv { SUPABASE_URL?: string; SUPABASE_SERVICE_ROLE_KEY?: string; VITE_SUPABASE_ANON_KEY?: string }
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
export const onRequest = async ({ request, env }: { request: Request; env: AviatorEnv }) => {
  if (request.method !== "GET") return json({ ok: false, error: "Method not allowed" }, 405);
  const base = (env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY || "";
  if (!base || !key) return json({ ok: false, error: "Aviator service unavailable" }, 503);
  try {
    const response = await fetch(`${base}/rest/v1/aviator_round_state?select=*&id=eq.1&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(6000),
    });
    const rows: any[] = await response.json().catch(() => []);
    if (!response.ok || !rows[0]) return json({ ok: false, error: "Aviator round unavailable" }, 503);
    return json({ ok: true, round: rows[0] });
  } catch { return json({ ok: false, error: "Aviator service unavailable" }, 504); }
};
