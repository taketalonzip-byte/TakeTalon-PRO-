interface Env {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

const out = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const hash = async (email: string, otp: string) => {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${email}:${otp.replace(/[^0-9]/g, "")}`));
  return Array.from(new Uint8Array(bytes)).map((x) => x.toString(16).padStart(2, "0")).join("");
};

export const onRequest = async ({ request, env }: { request: Request; env: Env }) => {
  if (request.method !== "POST") return out({ success: false, error: "Method not allowed." }, 405);
  let body: any;
  try { body = await request.json(); } catch { body = {}; }
  const email = String(body?.email || "").trim().toLowerCase();
  const otp = String(body?.otp || "").trim();
  if (!email || !otp) return out({ success: false, error: "Tafadhali weka barua pepe na code ya OTP." }, 400);
  const base = (env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!base || !key) return out({ success: false, isConnectionError: true, error: "Uthibitishaji wa OTP haujasanidiwa kwenye server." }, 503);
  const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  try {
    const response = await fetch(`${base}/rest/v1/otp_verifications?select=otp_hash,expires_at,attempts_left,verified&email=eq.${encodeURIComponent(email)}&purpose=eq.password_reset&limit=1`, { headers, signal: AbortSignal.timeout(6000) });
    const rows: any[] = await response.json().catch(() => []);
    if (!response.ok) return out({ success: false, isConnectionError: true, error: "Seva ya OTP haijibu kwa wakati." }, 503);
    const record = rows[0];
    if (!record) return out({ success: false, error: "Hakuna OTP ya kurejesha nywila iliyoombwa kwa barua pepe hii au imekwisha muda. Tafadhali omba tena." }, 400);
    if (Date.now() > new Date(record.expires_at).getTime()) return out({ success: false, error: "Muda wa OTP umekwisha (dakika 10 zimepita). Tafadhali omba OTP mpya." }, 400);
    if (Number(record.attempts_left) <= 0) return out({ success: false, error: "Umejaribu OTP isiyo sahihi mara nyingi mno. Tafadhali omba OTP mpya." }, 400);
    if (record.verified) return out({ success: true, message: "Code ya OTP imethibitishwa kwa mafanikio! Sasa unaweza kuweka nywila mpya." });
    if (record.otp_hash !== await hash(email, otp)) {
      const remaining = Math.max(0, Number(record.attempts_left) - 1);
      await fetch(`${base}/rest/v1/otp_verifications?email=eq.${encodeURIComponent(email)}&purpose=eq.password_reset`, { method: "PATCH", headers: { ...headers, Prefer: "return=minimal" }, body: JSON.stringify({ attempts_left: remaining, attempts: 5 - remaining, updated_at: new Date().toISOString() }), signal: AbortSignal.timeout(5000) });
      return out({ success: false, remaining_attempts: remaining, error: `Code ya OTP si sahihi. Majaribio yaliyosalia: ${remaining}` }, 400);
    }
    const update = await fetch(`${base}/rest/v1/otp_verifications?email=eq.${encodeURIComponent(email)}&purpose=eq.password_reset`, { method: "PATCH", headers: { ...headers, Prefer: "return=minimal" }, body: JSON.stringify({ verified: true, verified_at: new Date().toISOString(), updated_at: new Date().toISOString() }), signal: AbortSignal.timeout(5000) });
    if (!update.ok) return out({ success: false, retryable: true, error: "Server imechelewa kuhifadhi uthibitisho wa OTP. Tafadhali jaribu tena." }, 503);
    return out({ success: true, message: "Code ya OTP imethibitishwa kwa mafanikio! Sasa unaweza kuweka nywila mpya." });
  } catch {
    return out({ success: false, retryable: true, error: "Imeshindikana kuhakiki OTP kwa sasa." }, 503);
  }
};
