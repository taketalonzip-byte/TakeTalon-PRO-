import { actor, dbHeaders, response } from "./_shared";
export const onRequest = async ({ request, env }: any) => {
  if (request.method !== "POST") return response({ ok: false, error: "Method not allowed." }, 405);
  let body: any; try { body = await request.json(); } catch { body = {}; }
  if (!body?.photo_id) return response({ ok: false, error: "Missing user_id or photo_id" }, 400);
  const auth = await actor(request, env); if (!auth) return response({ ok: false, error: "Authenticated access required." }, 401);
  try {
    const h = dbHeaders(auth.key); const url = `${auth.base}/rest/v1/profile_photos?id=eq.${encodeURIComponent(body.photo_id)}&user_id=eq.${encodeURIComponent(auth.profile.id)}&limit=1`;
    const rows: any[] = await (await fetch(`${url}&select=*`, { headers: h, signal: AbortSignal.timeout(6000) })).json().catch(() => []); const photo = rows[0];
    if (!photo) return response({ ok: false, error: "UNAUTHORIZED_OR_NOT_FOUND", message: "Picha hii haijapatikana au si ya akaunti yako." }, 403);
    await fetch(url, { method: "PATCH", headers: { ...h, Prefer: "return=minimal" }, body: JSON.stringify({ is_deleted: true, is_current: false, deleted_at: new Date().toISOString() }), signal: AbortSignal.timeout(5000) });
    let next: any = null;
    if (photo.is_current) { const remaining: any[] = await (await fetch(`${auth.base}/rest/v1/profile_photos?select=*&user_id=eq.${encodeURIComponent(auth.profile.id)}&is_deleted=eq.false&order=created_at.desc&limit=1`, { headers: h, signal: AbortSignal.timeout(5000) })).json().catch(() => []); if (remaining[0]) { next = remaining[0].photo_url; await fetch(`${auth.base}/rest/v1/profile_photos?id=eq.${encodeURIComponent(remaining[0].id)}`, { method: "PATCH", headers: { ...h, Prefer: "return=minimal" }, body: JSON.stringify({ is_current: true }), signal: AbortSignal.timeout(5000) }); } await fetch(`${auth.base}/rest/v1/profiles?id=eq.${encodeURIComponent(auth.profile.id)}`, { method: "PATCH", headers: { ...h, Prefer: "return=minimal" }, body: JSON.stringify({ avatar_url: next }), signal: AbortSignal.timeout(5000) }); }
    return response({ ok: true, photo_id: photo.id, is_deleted: true, new_avatar_url: next, message: "Picha imeondolewa kikamilifu." });
  } catch { return response({ ok: false, error: "Profile photo service unavailable." }, 503); }
};
