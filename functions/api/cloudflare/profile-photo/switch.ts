import { actor, dbHeaders, response } from "./_shared";
export const onRequest = async ({ request, env }: any) => {
  if (request.method !== "POST") return response({ ok: false, error: "Method not allowed." }, 405);
  let body: any; try { body = await request.json(); } catch { body = {}; }
  if (!body?.photo_id) return response({ ok: false, error: "Missing user_id or photo_id" }, 400);
  const auth = await actor(request, env); if (!auth) return response({ ok: false, error: "Authenticated access required." }, 401);
  try {
    const targetResponse = await fetch(`${auth.base}/rest/v1/profile_photos?select=*&id=eq.${encodeURIComponent(body.photo_id)}&user_id=eq.${encodeURIComponent(auth.profile.id)}&is_deleted=eq.false&limit=1`, { headers: dbHeaders(auth.key), signal: AbortSignal.timeout(6000) });
    const target: any[] = await targetResponse.json().catch(() => []); if (!target[0]) return response({ ok: false, error: "UNAUTHORIZED_OR_NOT_FOUND", message: "Picha hii haitambuliki kwenye historia yako ya picha." }, 403);
    const photo = target[0]; if (!photo.is_current) {
      await fetch(`${auth.base}/rest/v1/profile_photos?user_id=eq.${encodeURIComponent(auth.profile.id)}`, { method: "PATCH", headers: { ...dbHeaders(auth.key), Prefer: "return=minimal" }, body: JSON.stringify({ is_current: false }), signal: AbortSignal.timeout(5000) });
      await fetch(`${auth.base}/rest/v1/profile_photos?id=eq.${encodeURIComponent(photo.id)}`, { method: "PATCH", headers: { ...dbHeaders(auth.key), Prefer: "return=minimal" }, body: JSON.stringify({ is_current: true, updated_at: new Date().toISOString() }), signal: AbortSignal.timeout(5000) });
      await fetch(`${auth.base}/rest/v1/profiles?id=eq.${encodeURIComponent(auth.profile.id)}`, { method: "PATCH", headers: { ...dbHeaders(auth.key), Prefer: "return=minimal" }, body: JSON.stringify({ avatar_url: photo.photo_url, last_profile_changed_at: new Date().toISOString() }), signal: AbortSignal.timeout(5000) });
    }
    return response({ ok: true, avatar_url: photo.photo_url, photo_id: photo.id, message: photo.is_current ? "Tayari picha hii ndiyo inayotumika kama picha yako ya wasifu." : "Picha ya wasifu imebadilishwa kikamilifu!" });
  } catch { return response({ ok: false, error: "Profile photo service unavailable." }, 503); }
};
