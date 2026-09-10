interface SmsEnv {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  VITE_SUPABASE_ANON_KEY?: string;
}

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const allowedRoles = new Set(["AGENT", "ADMIN", "SUPER_ADMIN", "OWNER"]);

export const onRequest = async ({ request, env }: { request: Request; env: SmsEnv }) => {
  const token = request.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  const base = (env.SUPABASE_URL || "").replace(/\/$/, "");
  const anonKey = env.VITE_SUPABASE_ANON_KEY || "";
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!token || !base || !anonKey) return json({ ok: false, error: "Authenticated access required." }, 401);

  try {
    const userResponse = await fetch(`${base}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5000) });
    if (!userResponse.ok) return json({ ok: false, error: "Authenticated access required." }, 401);
    const user: any = await userResponse.json();
    const userId = String(user?.id || "");
    if (!userId) return json({ ok: false, error: "Authenticated access required." }, 401);

    const dbKey = serviceKey || token;
    const profileResponse = await fetch(`${base}/rest/v1/profiles?select=role&auth_user_id=eq.${encodeURIComponent(userId)}&limit=1`, { headers: { apikey: dbKey, Authorization: `Bearer ${dbKey}` }, signal: AbortSignal.timeout(5000) });
    if (!profileResponse.ok) return json({ ok: false, error: "Authorization service unavailable." }, 503);
    const profiles: any[] = await profileResponse.json();
    const role = String(profiles[0]?.role || "").toUpperCase();
    if (!allowedRoles.has(role)) return json({ ok: false, error: "Agent or admin access required." }, 403);

    const logsResponse = await fetch(`${base}/rest/v1/sms_deposit_logs?select=*&order=created_at.desc&limit=50`, { headers: { apikey: dbKey, Authorization: `Bearer ${dbKey}` }, signal: AbortSignal.timeout(8000) });
    if (!logsResponse.ok) return json({ status: "ok", auditLogs: [], logs: [] });
    const rows: any[] = await logsResponse.json();
    const logs = rows.map((row: any) => ({
      id: row.id, requestId: row.id, timestamp: row.created_at || row.processed_at,
      sender: row.sender_phone || "SMS_FORWARDER", phone: row.sender_phone || "N/A",
      phone_normalized: row.phone_normalized || row.sender_phone || "N/A",
      amount: Number(row.parsed_amount) || Number(row.amount) || 0, currency: "FBU",
      transactionCode: row.sms_reference || "N/A", matchedUser: row.matched_profile_id ? `User:${row.matched_profile_id}` : null,
      matchedProfileId: row.matched_profile_id || null, status: row.status === "matched" ? "SUCCESS" : row.status || "UNMATCHED",
      rawBody: row.raw_sms || row.body || "", errorMessage: row.error_details || row.error || null,
    }));
    return json({ status: "ok", auditLogs: logs, logs });
  } catch {
    return json({ ok: false, error: "SMS audit service unavailable." }, 503);
  }
};
