interface OtpEnv {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  BREVO_API_KEY?: string;
  BREVO_SENDER_EMAIL?: string;
  BREVO_SENDER_NAME?: string;
}

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const normalizeEmail = (value: unknown) => String(value || "").trim().toLowerCase();
const digest = async (email: string, otp: string) => {
  const bytes = new TextEncoder().encode(`${email}:${otp}`);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
};
const otpCode = () => String(Math.floor(100000 + Math.random() * 900000));

export const onRequest = async ({ request, env }: { request: Request; env: OtpEnv }) => {
  if (request.method !== "POST") return json({ success: false, error: "Method not allowed." }, 405);
  let body: any;
  try { body = await request.json(); } catch { body = {}; }
  const email = normalizeEmail(body?.email);
  const firstName = String(body?.first_name || "").trim();
  if (!email || !email.includes("@")) return json({ success: false, error: "Tafadhali weka barua pepe (email) sahihi." }, 400);

  const base = (env.SUPABASE_URL || "").replace(/\/$/, "");
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || "";
  const brevoKey = env.BREVO_API_KEY || "";
  const senderEmail = env.BREVO_SENDER_EMAIL || "";
  if (!base || !serviceKey || !brevoKey || !senderEmail) return json({ success: false, error: "OTP service haijasaanidiwa kikamilifu." }, 503);

  try {
    const dbHeaders = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" };
    const existingResponse = await fetch(`${base}/rest/v1/otp_verifications?select=email,last_sent_at,resend_count&email=eq.${encodeURIComponent(email)}&purpose=eq.registration&limit=1`, { headers: dbHeaders, signal: AbortSignal.timeout(5000) });
    if (!existingResponse.ok) return json({ success: false, isConnectionError: true, error: "Seva ya OTP haijibu kwa wakati." }, 504);
    const existingRows: any[] = await existingResponse.json();
    const existing = existingRows[0];
    const elapsed = existing?.last_sent_at ? Date.now() - new Date(existing.last_sent_at).getTime() : Infinity;
    if (elapsed < 60000) {
      const cooldown = Math.ceil((60000 - elapsed) / 1000);
      return json({ success: false, cooldown_left: cooldown, error: `Tafadhali subiri sekunde ${cooldown} kabla ya kuomba OTP nyingine.` }, 429);
    }

    const otp = otpCode();
    const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;background:#0e1e2d;color:#fff;border-radius:12px"><h1 style="color:#60a5fa">TAKETALON PRO</h1><p>Hujambo <strong>${firstName || "Mteja"}</strong>,</p><p>Tumia nambari hii ya tarakimu 6 kukamilisha usajili:</p><div style="font-size:32px;font-weight:bold;letter-spacing:6px;color:#38bdf8">${otp}</div><p>Nambari hii itaisha baada ya dakika 10. Usishiriki na mtu yeyote.</p></div>`;
    const mailResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST", headers: { accept: "application/json", "api-key": brevoKey, "content-type": "application/json" },
      body: JSON.stringify({ sender: { name: env.BREVO_SENDER_NAME || "TakeTalon PRO", email: senderEmail }, to: [{ email, name: firstName || email }], subject: `[TakeTalon PRO] ${otp} ni Nambari Yako ya Uthibitisho (OTP)`, htmlContent: html }),
      signal: AbortSignal.timeout(15000),
    });
    if (!mailResponse.ok) return json({ success: false, error: "Imeshindikana kutuma OTP. Tafadhali jaribu tena baadaye." }, 502);

    const now = new Date();
    const hash = await digest(email, otp);
    const upsertResponse = await fetch(`${base}/rest/v1/otp_verifications?on_conflict=email,purpose`, {
      method: "POST", headers: { ...dbHeaders, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ email, purpose: "registration", otp_hash: hash, first_name: firstName, expires_at: new Date(now.getTime() + 600000).toISOString(), attempts: 0, max_attempts: 5, attempts_left: 5, last_sent_at: now.toISOString(), resend_count: existing ? Number(existing.resend_count || 0) + 1 : 0, max_resends: 5, verified: false, verified_at: null, updated_at: now.toISOString() }),
      signal: AbortSignal.timeout(6000),
    });
    if (!upsertResponse.ok) return json({ success: false, error: "OTP imetumwa lakini haikuweza kuhifadhiwa. Tafadhali jaribu tena." }, 502);
    return json({ success: true, message: `Code ya OTP imetumwa kwenye barua pepe ${email}.`, expiry_minutes: 10 });
  } catch {
    return json({ success: false, isConnectionError: true, error: "Hitilafu ya muunganisho wakati wa kutuma OTP." }, 504);
  }
};
