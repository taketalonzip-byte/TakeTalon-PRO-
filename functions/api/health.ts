interface HealthEnv {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

type PagesRequestContext<Env> = {
  request: Request;
  env: Env;
};

export const onRequest = async ({ request, env }: PagesRequestContext<HealthEnv>) => {
  const requestUrl = new URL(request.url);
  const supabaseUrl = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  const anonKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY || "";
  let dbConnected = false;

  if (supabaseUrl && anonKey) {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/profiles?select=id&limit=1`, {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
      });
      dbConnected = response.ok;
    } catch {
      dbConnected = false;
    }
  }

  if (requestUrl.searchParams.get("probe") === "profile-history") {
    const userId = (requestUrl.searchParams.get("user_id") || "").trim();
    if (!userId || !supabaseUrl || !anonKey) return Response.json({ ok: false, profile_id: userId, activePhotos: [], deletedPhotos: [], is_first_profile: true });
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
      const filter = isUuid ? `or=(id.eq.${userId},auth_user_id.eq.${userId})` : `or=(email.eq.${encodeURIComponent(userId)},username.eq.${encodeURIComponent(userId)})`;
      const auth = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };
      const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?select=id,avatar_url&${filter}&limit=1`, { headers: auth, signal: AbortSignal.timeout(8000) });
      const profiles: any[] = profileResponse.ok ? await profileResponse.json() : [];
      const profileId = profiles[0]?.id || userId;
      const photosResponse = await fetch(`${supabaseUrl}/rest/v1/profile_photos?select=*&user_id=eq.${encodeURIComponent(profileId)}&order=created_at.desc`, { headers: auth, signal: AbortSignal.timeout(8000) });
      const photos: any[] = photosResponse.ok ? await photosResponse.json() : [];
      const activePhotos = photos.filter((photo) => !photo.is_deleted); const deletedPhotos = photos.filter((photo) => photo.is_deleted); const current = activePhotos.find((photo) => photo.is_current) || activePhotos[0];
      return Response.json({ ok: true, profile_id: profileId, current_avatar_url: current?.photo_url || profiles[0]?.avatar_url || null, activePhotos, deletedPhotos, cooldown_active: false, remaining_ms: 0, next_allowed_at: null, is_first_profile: activePhotos.length === 0, backend: "cloudflare-pages-function" });
    } catch { return Response.json({ ok: true, profile_id: userId, activePhotos: [], deletedPhotos: [], is_first_profile: true, backend: "cloudflare-pages-function" }); }
  }
  return Response.json({
    status: "ok",
    app: "TakeTalon PRO",
    dbConnected,
    backend: "cloudflare-pages-function",
    timestamp: new Date().toISOString(),
  });
};
