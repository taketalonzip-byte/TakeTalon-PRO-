import { actor, dbHeaders, response } from "./_shared";
export const onRequest = async ({ request, env }: any) => {
  if (request.method !== "POST") return response({ ok: false, error: "Method not allowed." }, 405);
  let body: any; try { body = await request.json(); } catch { body = {}; }
  const base64 = String(body?.base64_data || ""); if (!base64) return response({ ok: false, error: "Missing user_id or base64_data" }, 400);
  const auth = await actor(request, env); if (!auth) return response({ ok: false, error: "Authenticated access required." }, 401);
  try {
    const match = base64.match(/^data:(image\/[\w.+-]+);base64,(.+)$/); const mime = match?.[1] || "image/jpeg"; const encoded = match?.[2] || base64.replace(/^data:image\/[^;]+;base64,/, "");
    const binary = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0)); if (binary.byteLength > 8 * 1024 * 1024) return response({ ok: false, error: "Image file is too large." }, 413);
    const ext = mime.split("/")[1]?.replace("jpeg", "jpg") || "jpg"; const path = `avatars/${auth.profile.id}/${Date.now()}.${ext}`; const storageUrl = `${auth.base}/storage/v1/object/${path}`;
    const upload = await fetch(storageUrl, { method: "POST", headers: { apikey: auth.key, Authorization: `Bearer ${auth.key}`, "Content-Type": mime, "x-upsert": "true" }, body: binary, signal: AbortSignal.timeout(15000) });
    if (!upload.ok) return response({ ok: false, error: "Picha haikuweza kuhifadhiwa kwenye storage." }, 502);
    const avatarUrl = `${auth.base}/storage/v1/object/public/${path}`; const now = new Date().toISOString(); const h = dbHeaders(auth.key);
    await fetch(`${auth.base}/rest/v1/profile_photos?user_id=eq.${encodeURIComponent(auth.profile.id)}`, { method: "PATCH", headers: { ...h, Prefer: "return=minimal" }, body: JSON.stringify({ is_current: false }), signal: AbortSignal.timeout(5000) });
    const photoResponse = await fetch(`${auth.base}/rest/v1/profile_photos`, { method: "POST", headers: { ...h, Prefer: "return=representation" }, body: JSON.stringify({ user_id: auth.profile.id, photo_url: avatarUrl, is_current: true, is_deleted: false, created_at: now }), signal: AbortSignal.timeout(7000) });
    const photos: any[] = await photoResponse.json().catch(() => []); if (!photoResponse.ok || !photos[0]?.id) return response({ ok: false, error: "Profile photo metadata haikuweza kuhifadhiwa." }, 502);
    await fetch(`${auth.base}/rest/v1/profiles?id=eq.${encodeURIComponent(auth.profile.id)}`, { method: "PATCH", headers: { ...h, Prefer: "return=minimal" }, body: JSON.stringify({ avatar_url: avatarUrl, last_profile_changed_at: now }), signal: AbortSignal.timeout(5000) });
    return response({ ok: true, avatar_url: avatarUrl, photo_id: photos[0].id, last_profile_changed_at: now, message: "Picha mpya ya wasifu imewasilishwa na kuhifadhiwa kwa ufanisi!" });
  } catch { return response({ ok: false, error: "Profile photo upload service unavailable." }, 503); }
};
