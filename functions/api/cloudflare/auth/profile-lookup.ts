interface AuthLookupEnv {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  VITE_SUPABASE_ANON_KEY?: string;
}

const uuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export const onRequest = async ({ request, env }: { request: Request; env: AuthLookupEnv }) => {
  const base = (env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY || "";
  if (!base || !key) {
    return json({ ok: false, isConnectionError: true, profile: null, wallet: null, error: "Seva ya Supabase haijaunganishwa." }, 503);
  }

  const query = new URL(request.url).searchParams;
  const queryId = (query.get("id") || query.get("auth_user_id") || "").trim();
  if (!queryId) return json({ ok: false, profile: null, wallet: null, isNotFound: true });

  const encoded = encodeURIComponent(queryId);
  let filter: string;
  if (uuid(queryId)) {
    filter = `or=(id.eq.${encoded},auth_user_id.eq.${encoded})`;
  } else {
    const sanitizedPhone = queryId.replace(/[^0-9]/g, "");
    filter = sanitizedPhone.length >= 6
      ? `or=(email.ilike.${encoded},username.ilike.${encoded},phone.ilike.*${encodeURIComponent(sanitizedPhone)}*)`
      : `or=(email.ilike.${encoded},username.ilike.${encoded})`;
  }

  const headers = { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json" };
  try {
    const profileResponse = await fetch(`${base}/rest/v1/profiles?select=*&${filter}&limit=2`, {
      headers,
      signal: AbortSignal.timeout(4500),
    });
    if (!profileResponse.ok) {
      return json({ ok: false, profile: null, wallet: null, isConnectionError: false, error: "Imeshindikana kutafuta akaunti." }, 502);
    }
    const profiles: any[] = await profileResponse.json();
    if (!profiles.length) return json({ ok: false, isNotFound: true, profile: null, wallet: null, error: "Akaunti haijapatikana." });
    if (profiles.length > 1) return json({ ok: false, profile: null, wallet: null, error: "Akaunti haijatambulika kwa usahihi." }, 409);

    const profile = profiles[0];
    const walletResponse = await fetch(`${base}/rest/v1/wallets?select=*&profile_id=eq.${encodeURIComponent(profile.id)}&limit=1`, {
      headers,
      signal: AbortSignal.timeout(3500),
    });
    let wallet: any = null;
    if (walletResponse.ok) {
      const wallets: any[] = await walletResponse.json();
      wallet = wallets[0] || null;
    }
    if (wallet) {
      const balance = Number(wallet.balance || 0);
      const reserved = Number(wallet.reserved_balance || 0);
      wallet = { ...wallet, balance, reserved_balance: reserved, available_balance: Math.max(0, balance - reserved) };
    }
    return json({ ok: true, profile, wallet, backend: "cloudflare-pages-function", walletCreated: false });
  } catch (error: any) {
    const message = String(error?.message || error || "").toLowerCase();
    const isTimeout = message.includes("timeout") || message.includes("timed out") || message.includes("abort") || message.includes("fetch");
    return json({ ok: false, profile: null, wallet: null, isConnectionError: isTimeout, error: isTimeout ? "Hitilafu ya muunganisho wa seva ya Supabase." : "Imeshindikana kutafuta akaunti." }, isTimeout ? 504 : 500);
  }
};
