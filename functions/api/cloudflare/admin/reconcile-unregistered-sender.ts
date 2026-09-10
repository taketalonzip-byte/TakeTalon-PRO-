interface AdminEnv { SUPABASE_URL?: string; SUPABASE_SERVICE_ROLE_KEY?: string; VITE_SUPABASE_ANON_KEY?: string }
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const allowedRoles = new Set(["ADMIN", "SUPER_ADMIN", "OWNER"]);
export const onRequest = async ({ request, env }: { request: Request; env: AdminEnv }) => {
  if (request.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);
  const token = request.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  const base = (env.SUPABASE_URL || "").replace(/\/$/, "");
  const anonKey = env.VITE_SUPABASE_ANON_KEY || "";
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!token || !base || !anonKey) return json({ ok: false, error: "Admin authentication required." }, 401);
  let body: any;
  try { body = await request.json(); } catch { return json({ ok: false, error: "Invalid JSON" }, 400); }
  const phone = String(body?.phone_normalized || "").trim();
  const profileId = String(body?.profile_id || "").trim();
  if (!phone || !profileId) return json({ ok: false, error: "phone_normalized and profile_id are required" }, 400);
  try {
    const userResponse = await fetch(`${base}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5000) });
    if (!userResponse.ok) return json({ ok: false, error: "Admin authentication required." }, 401);
    const user: any = await userResponse.json();
    const dbKey = serviceKey || token;
    const profileResponse = await fetch(`${base}/rest/v1/profiles?select=role&auth_user_id=eq.${encodeURIComponent(user.id)}&limit=1`, { headers: { apikey: dbKey, Authorization: `Bearer ${dbKey}` }, signal: AbortSignal.timeout(5000) });
    const profiles: any[] = await profileResponse.json();
    if (!allowedRoles.has(String(profiles[0]?.role || "").toUpperCase())) return json({ ok: false, error: "Admin access required." }, 403);
    const rpc = await fetch(`${base}/rest/v1/rpc/admin_reconcile_unregistered_sender`, { method: "POST", headers: { apikey: dbKey, Authorization: `Bearer ${dbKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ p_phone_normalized: phone, p_profile_id: profileId }), signal: AbortSignal.timeout(10000) });
    const result = await rpc.json().catch(() => ({}));
    return json(result, rpc.ok ? 200 : 502);
  } catch { return json({ ok: false, error: "Admin reconciliation unavailable" }, 503); }
};
