import { supabaseGet, type SupabaseEnv } from "../supabase/_shared";
export const onRequest = async ({ request, env }: { request: Request; env: SupabaseEnv }) => {
  const userId = (new URL(request.url).searchParams.get("user_id") || "").trim();
  if (!userId) return Response.json({ ok: false, error: "Missing user_id" }, { status: 400 });
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    const filter = isUuid ? `or=(id.eq.${userId},auth_user_id.eq.${userId})` : `or=(email.eq.${encodeURIComponent(userId)},username.eq.${encodeURIComponent(userId)})`;
    const profileResponse = await supabaseGet(env, `profiles?select=id,avatar_url&${filter}&limit=1`);
    const profiles: any[] = profileResponse.ok ? await profileResponse.json() : [];
    const profileId = profiles[0]?.id || userId;
    const photosResponse = await supabaseGet(env, `profile_photos?select=*&user_id=eq.${encodeURIComponent(profileId)}&order=created_at.desc`);
    const photos: any[] = photosResponse.ok ? await photosResponse.json() : [];
    const activePhotos = photos.filter((photo) => !photo.is_deleted); const deletedPhotos = photos.filter((photo) => photo.is_deleted); const current = activePhotos.find((photo) => photo.is_current) || activePhotos[0];
    return Response.json({ ok: true, profile_id: profileId, current_avatar_url: current?.photo_url || profiles[0]?.avatar_url || null, activePhotos, deletedPhotos, cooldown_active: false, remaining_ms: 0, next_allowed_at: null, is_first_profile: activePhotos.length === 0, backend: "cloudflare-pages-function" });
  } catch { return Response.json({ ok: true, profile_id: userId, current_avatar_url: null, activePhotos: [], deletedPhotos: [], cooldown_active: false, remaining_ms: 0, next_allowed_at: null, is_first_profile: true, backend: "cloudflare-pages-function" }); }
};
