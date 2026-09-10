interface VerifyEnv {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const digest = async (email: string, otp: string) => {
  const bytes = new TextEncoder().encode(`${email}:${otp.replace(/[^0-9]/g, "")}`);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

export const onRequest = async ({ request, env }: { request: Request; env: VerifyEnv }) => {
  if (request.method !== "POST") return json({ success: false, error: "Method not allowed." }, 405);
  let body: any;
  try { body = await request.json(); } catch { body = {}; }
  const email = String(body?.email || "").trim().toLowerCase();
  const otp = String(body?.otp || "").trim();
  if (!email || !otp) return json({ success: false, error: "Tafadhali weka email na OTP kamili." }, 400);

  const base = (env.SUPABASE_URL || "").replace(/\/$/, "");
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!base || !serviceKey) return json({ success: false, isConnectionError: true, error: "Uthibitishaji wa OTP haujasanidiwa kwenye server." }, 503);
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" };
  try {
    const recordResponse = await fetch(`${base}/rest/v1/otp_verifications?select=email,otp_hash,expires_at,attempts_left,verified&email=eq.${encodeURIComponent(email)}&purpose=eq.registration&limit=1`, { headers, signal: AbortSignal.timeout(6000) });
    if (!recordResponse.ok) return json({ success: false, retryable: true, error: "Seva ya OTP haijibu kwa wakati." }, 503);
    const rows: any[] = await recordResponse.json();
    const record = rows[0];
    if (!record) return json({ success: false, error: "Hakuna OTP iliyoombwa kwa barua pepe hii. Tafadhali omba OTP mpya." }, 400);
    const now = Date.now();
    if (now > new Date(record.expires_at).getTime()) {
      await fetch(`${base}/rest/v1/otp_verifications?email=eq.${encodeURIComponent(email)}&purpose=eq.registration`, { method: "DELETE", headers, signal: AbortSignal.timeout(5000) });
      return json({ success: false, error: "Muda wa OTP umekwisha (dakika 10 zimepita). Tafadhali omba tena." }, 400);
    }
    if (Number(record.attempts_left) <= 0) return json({ success: false, error: "Umejaribu vibaya mara nyingi mno. Tafadhali omba OTP mpya." }, 400);
    if (record.verified) return json({ success: true, message: "Code ya OTP imethibitishwa kwa mafanikio!" });

    const matches = record.otp_hash === await digest(email, otp);
    if (!matches) {
      const remaining = Math.max(0, Number(record.attempts_left) - 1);
      await fetch(`${base}/rest/v1/otp_verifications?email=eq.${encodeURIComponent(email)}&purpose=eq.registration`, { method: "PATCH", headers: { ...headers, Prefer: "return=minimal" }, body: JSON.stringify({ attempts_left: remaining, attempts: 5 - remaining, updated_at: new Date().toISOString() }), signal: AbortSignal.timeout(5000) });
      return json({ success: false, remaining_attempts: remaining, error: `Code ya OTP si sahihi. Majaribio yaliyosalia: ${remaining}` }, 400);
    }
    const updateResponse = await fetch(`${base}/rest/v1/otp_verifications?email=eq.${encodeURIComponent(email)}&purpose=eq.registration`, { method: "PATCH", headers: { ...headers, Prefer: "return=minimal" }, body: JSON.stringify({ verified: true, verified_at: new Date().toISOString(), updated_at: new Date().toISOString() }), signal: AbortSignal.timeout(5000) });
    if (!updateResponse.ok) return json({ success: false, retryable: true, error: "Server imechelewa kuhifadhi uthibitisho wa OTP. Tafadhali jaribu tena bila kuomba OTP mpya." }, 503);
    return json({ success: true, message: "Code ya OTP imethibitishwa kwa mafanikio!" });
  } catch {
    return json({ success: false, retryable: true, error: "Hitilafu ya muunganisho wakati wa kuhakiki OTP." }, 503);
  }
};
