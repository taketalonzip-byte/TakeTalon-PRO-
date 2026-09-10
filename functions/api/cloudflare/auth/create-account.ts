interface CreateEnv {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const text = (value: unknown) => String(value || "").trim();

export const onRequest = async ({ request, env }: { request: Request; env: CreateEnv }) => {
  if (request.method !== "POST") return json({ success: false, error: "Method not allowed." }, 405);
  let body: any;
  try { body = await request.json(); } catch { body = {}; }
  const email = text(body?.email).toLowerCase();
  const password = String(body?.password || "");
  const firstName = text(body?.first_name);
  const lastName = text(body?.last_name);
  const phone = text(body?.phone);
  const genderValue = text(body?.gender).toUpperCase();
  const gender = ["MALE", "FEMALE", "OTHER"].includes(genderValue) ? genderValue : "";
  const birthday = body?.birthday ? String(body.birthday) : null;
  const accepted = body?.terms_accepted === true;
  if (!email || !email.includes("@")) return json({ success: false, error: "Barua pepe (email) inahitajika." }, 400);
  if (!password || password.length < 6) return json({ success: false, error: "Neno la siri (password) lazima liwe na angalau herufi 6." }, 400);

  const base = (env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!base || !key) return json({ success: false, isConnectionError: true, error: "Auth server haijaunganishwa na Supabase. Tafadhali jaribu tena." }, 503);
  const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  try {
    const otpResponse = await fetch(`${base}/rest/v1/otp_verifications?select=email,verified,expires_at&email=eq.${encodeURIComponent(email)}&purpose=eq.registration&limit=1`, { headers, signal: AbortSignal.timeout(6000) });
    if (!otpResponse.ok) return json({ success: false, isConnectionError: true, error: "Seva ya OTP haijibu kwa wakati." }, 504);
    const otpRecord = (await otpResponse.json())[0];
    if (!otpRecord?.verified || Date.now() > new Date(otpRecord.expires_at).getTime()) return json({ success: false, error: "Tafadhali thibitisha OTP ya barua pepe kabla ya kuunda akaunti." }, 403);

    const baseUsername = (firstName || email.split("@")[0]).toLowerCase().replace(/[^a-z0-9]/g, "") || "user";
    const username = `${baseUsername}${Math.floor(100 + Math.random() * 900)}`;
    const authResponse = await fetch(`${base}/auth/v1/admin/users`, { method: "POST", headers, body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { first_name: firstName, last_name: lastName, username, phone, gender: gender || null, birthday } }), signal: AbortSignal.timeout(12000) });
    const authBody: any = await authResponse.json().catch(() => ({}));
    if (!authResponse.ok || !authBody?.id) {
      const message = String(authBody?.msg || authBody?.message || authBody?.error || "");
      if (/already|exists|registered|duplicate/i.test(message)) return json({ success: false, error: "Email hii tayari inatumika kwenye akaunti nyingine." }, 409);
      return json({ success: false, error: message || "Supabase imeshindwa kuunda akaunti." }, authResponse.status >= 500 ? 502 : 409);
    }
    const authUserId = authBody.id;
    const profilePayload: any = { auth_user_id: authUserId, username, first_name: firstName, last_name: lastName, email, phone, gender: gender || null, birthday, role: "USER", is_verified: true, is_pro: false, otp_verified: true, terms_accepted_at: accepted ? new Date().toISOString() : null, updated_at: new Date().toISOString() };
    const profileResponse = await fetch(`${base}/rest/v1/profiles?on_conflict=email`, { method: "POST", headers: { ...headers, Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(profilePayload), signal: AbortSignal.timeout(7000) });
    const profileRows: any[] = await profileResponse.json().catch(() => []);
    if (!profileResponse.ok || !profileRows[0]?.id) {
      await fetch(`${base}/auth/v1/admin/users/${encodeURIComponent(authUserId)}`, { method: "DELETE", headers, signal: AbortSignal.timeout(5000) }).catch(() => {});
      return json({ success: false, error: "Profile database haikuweza kuhifadhi taarifa za akaunti kwa sasa. Tafadhali jaribu tena." }, 500);
    }
    const profile = profileRows[0];
    const walletResponse = await fetch(`${base}/rest/v1/wallets?on_conflict=profile_id`, { method: "POST", headers: { ...headers, Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ profile_id: profile.id, balance: 0, reserved_balance: 0 }), signal: AbortSignal.timeout(6000) });
    if (!walletResponse.ok) console.warn("[create-account-canary] wallet initialization returned", walletResponse.status);
    await fetch(`${base}/rest/v1/otp_verifications?email=eq.${encodeURIComponent(email)}&purpose=eq.registration`, { method: "DELETE", headers, signal: AbortSignal.timeout(5000) }).catch(() => {});
    return json({ success: true, username: profile.username || username, profile, message: "Hongera! Akaunti imeundwa kikamilifu kwenye TakeTalon PRO.", canary: true, sessionCreated: false });
  } catch {
    return json({ success: false, isConnectionError: true, error: "Hitilafu ya muunganisho wakati wa kuunda akaunti." }, 504);
  }
};
