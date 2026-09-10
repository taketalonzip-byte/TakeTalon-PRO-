interface ReportEnv {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export const onRequest = async ({ request, env }: { request: Request; env: ReportEnv }) => {
  if (request.method !== "POST") return json({ ok: false, message: "Method not allowed" }, 405);
  let body: any;
  try { body = await request.json(); } catch { return json({ ok: false, message: "Invalid JSON" }, 400); }
  const { reportNumber, method, phone, transactionRef, description, username } = body || {};
  if (!description || typeof description !== "string") return json({ ok: false, message: "Description is required" }, 400);
  const base = (env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!base || !key) return json({ ok: false, message: "Database is not configured" }, 503);
  try {
    const response = await fetch(`${base}/rest/v1/audit_logs`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({
        action: "DEPOSIT_ISSUE_REPORT",
        entity_type: "deposit_report",
        entity_id: reportNumber || null,
        new_values: { reportNumber, method, phone, transactionRef, description, username },
        created_at: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return json({ ok: false, message: "Failed to record report" }, 502);
    return json({ ok: true, reportNumber });
  } catch {
    return json({ ok: false, message: "Database connection failed" }, 504);
  }
};
