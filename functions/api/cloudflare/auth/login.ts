interface LoginEnv {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  VITE_SUPABASE_ANON_KEY?: string;
}

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const uuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export const onRequest = async ({ request, env }: { request: Request; env: LoginEnv }) => {
  if (request.method !== "POST") return json({ ok: false, error: "Method not allowed." }, 405);
  let body: any;
  try { body = await request.json(); } catch { body = {}; }
  const cleanId = String(body?.loginId || "").trim();
  const cleanPassword = String(body?.password || "");
  if (!cleanId || !cleanPassword) return json({ ok: false, error: "Tafadhali weka jina la mtumiaji/email na neno la siri." }, 400);

  const base = (env.SUPABASE_URL || "").replace(/\/$/, "");
  const anonKey = env.VITE_SUPABASE_ANON_KEY || "";
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!base || !anonKey) return json({ ok: false, isConnectionError: true, error: "Uthibitishaji wa login haujasanidiwa kwenye server." }, 503);

  try {
    let email = cleanId.toLowerCase();
    if (!cleanId.includes("@")) {
      if (!serviceKey) return json({ ok: false, isConnectionError: true, error: "Username login haijasidiwa kwenye canary." }, 503);
      const sanitizedPhone = cleanId.replace(/[^0-9]/g, "");
      const filter = uuid(cleanId)
        ? `or=(id.eq.${encodeURIComponent(cleanId)},auth_user_id.eq.${encodeURIComponent(cleanId)})`
        : sanitizedPhone.length >= 6
          ? `or=(username.ilike.${encodeURIComponent(cleanId)},phone.ilike.*${encodeURIComponent(sanitizedPhone)}*)`
          : `username.ilike.${encodeURIComponent(cleanId)}`;
      const profileResponse = await fetch(`${base}/rest/v1/profiles?select=id,auth_user_id,email,username,role,is_pro,is_verified,first_name,last_name,avatar_url&${filter}&limit=2`, {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }, signal: AbortSignal.timeout(5000),
      });
      if (!profileResponse.ok) return json({ ok: false, isConnectionError: true, error: "Seva ya Supabase haijibu kwa wakati." }, 504);
      const profiles: any[] = await profileResponse.json();
      if (!profiles.length) return json({ ok: false, isAccountNotFound: true, error: `Akaunti yenye jina la mtumiaji au namba "${cleanId}" haijapatikana. Tafadhali hakiki au tumia barua pepe.` }, 404);
      if (profiles.length > 1) return json({ ok: false, error: "Akaunti haijatambulika kwa usahihi." }, 409);
      email = String(profiles[0]?.email || "").toLowerCase();
      if (!email) return json({ ok: false, isAccountNotFound: true, error: "Akaunti yenye taarifa hizi haijapatikana." }, 404);
    }

    const authResponse = await fetch(`${base}/auth/v1/token?grant_type=password`, {
      method: "POST", headers: { apikey: anonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: cleanPassword }), signal: AbortSignal.timeout(7000),
    });
    const authData: any = await authResponse.json().catch(() => ({}));
    if (!authResponse.ok || !authData?.user) {
      const message = String(authData?.error_description || authData?.msg || authData?.message || "").toLowerCase();
      if (message.includes("email not confirmed")) return json({ ok: false, error: "Barua pepe yako haijathibitishwa kupitia OTP." }, 403);
      if (message.includes("invalid login credentials") || message.includes("invalid grant")) return json({ ok: false, isPasswordError: true, error: "Akaunti imepatikana, lakini neno la siri (password) uliloweka si sahihi. Tafadhali hakiki nywila yako au weka upya." }, 401);
      return json({ ok: false, error: authData?.error_description || "Maelezo ya kuingia si sahihi au akaunti haijapatikana." }, 401);
    }

    const userId = String(authData.user.id || "");
    let profile: any = null;
    let wallet: any = null;
    if (serviceKey && userId) {
      const profileResponse = await fetch(`${base}/rest/v1/profiles?select=*&auth_user_id=eq.${encodeURIComponent(userId)}&limit=1`, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }, signal: AbortSignal.timeout(5000) });
      if (profileResponse.ok) profile = (await profileResponse.json())[0] || null;
      if (profile?.id) {
        const walletResponse = await fetch(`${base}/rest/v1/wallets?select=*&profile_id=eq.${encodeURIComponent(profile.id)}&limit=1`, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }, signal: AbortSignal.timeout(5000) });
        if (walletResponse.ok) wallet = (await walletResponse.json())[0] || null;
      }
    }
    if (wallet) {
      const balance = Number(wallet.balance || 0); const reserved = Number(wallet.reserved_balance || 0);
      wallet = { ...wallet, balance, reserved_balance: reserved, available_balance: Math.max(0, balance - reserved) };
    }
    return json({ ok: true, profile: profile || { id: userId, auth_user_id: userId, email, username: authData.user.user_metadata?.username || email.split("@")[0], role: "USER" }, wallet, session: authData, canary: true, walletCreated: false });
  } catch {
    return json({ ok: false, isConnectionError: true, error: "Hitilafu ya muunganisho wa seva ya Supabase Auth." }, 504);
  }
};
