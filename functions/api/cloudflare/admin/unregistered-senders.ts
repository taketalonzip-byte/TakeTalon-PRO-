interface AdminEnv {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  VITE_SUPABASE_ANON_KEY?: string;
}

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const allowedRoles = new Set(["ADMIN", "SUPER_ADMIN", "OWNER"]);

export const onRequest = async ({ request, env }: { request: Request; env: AdminEnv }) => {
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  const base = (env.SUPABASE_URL || "").replace(/\/$/, "");
  const anonKey = env.VITE_SUPABASE_ANON_KEY || "";
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!token || !base || !anonKey) return json({ ok: false, error: "Admin authentication required." }, 401);

  try {
    const userResponse = await fetch(`${base}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!userResponse.ok) return json({ ok: false, error: "Admin authentication required." }, 401);
    const user: any = await userResponse.json();
    const userId = String(user?.id || "");
    if (!userId) return json({ ok: false, error: "Admin authentication required." }, 401);

    const dbKey = serviceKey || token;
    const profileResponse = await fetch(`${base}/rest/v1/profiles?select=role&auth_user_id=eq.${encodeURIComponent(userId)}&limit=1`, {
      headers: { apikey: dbKey, Authorization: `Bearer ${dbKey}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!profileResponse.ok) return json({ ok: false, error: "Admin authorization unavailable." }, 503);
    const profiles: any[] = await profileResponse.json();
    const role = String(profiles[0]?.role || "").toUpperCase();
    if (!allowedRoles.has(role)) return json({ ok: false, error: "Admin access required." }, 403);

    const rpcResponse = await fetch(`${base}/rest/v1/rpc/admin_get_unregistered_senders`, {
      method: "POST",
      headers: { apikey: dbKey, Authorization: `Bearer ${dbKey}`, "Content-Type": "application/json" },
      body: "{}",
      signal: AbortSignal.timeout(8000),
    });
    if (!rpcResponse.ok) return json({ ok: true, data: [] });
    const data = await rpcResponse.json();
    return json({ ok: true, data: Array.isArray(data) ? data : [] });
  } catch {
    return json({ ok: false, error: "Admin service unavailable." }, 503);
  }
};
