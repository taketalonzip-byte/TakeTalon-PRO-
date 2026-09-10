import { actor, dbHeaders, response } from "./_shared";
export const onRequest = async ({ request, env }: any) => {
  if (request.method !== "POST") return response({ ok: false, error: "Method not allowed." }, 405);
  let body: any; try { body = await request.json(); } catch { body = {}; }
  if (!body?.photo_id) return response({ ok: false, error: "Missing user_id or photo_id" }, 400);
  const auth = await actor(request, env); if (!auth) return response({ ok: false, error: "Authenticated access required." }, 401);
  try {
    const h = dbHeaders(auth.key); const url = `${auth.base}/rest/v1/profile_photos?id=eq.${encodeURIComponent(body.photo_id)}&user_id=eq.${encodeURIComponent(auth.profile.id)}&is_deleted=eq.true&limit=1`;
    const rows: any[] = await (await fetch(`${url}&select=*`, { headers: h, signal: AbortSignal.timeout(6000) })).json().catch(() => []); if (!rows[0]) return response({ ok: false, error: "UNAUTHORIZED_OR_NOT_FOUND", message: "Picha hii haijapatikana kwenye picha zako zilizofutwa." }, 403);
    await fetch(url, { method: "PATCH", headers: { ...h, Prefer: "return=minimal" }, body: JSON.stringify({ is_deleted: false, restored_at: new Date().toISOString(), updated_at: new Date().toISOString() }), signal: AbortSignal.timeout(5000) });
    return response({ ok: true, photo_id: rows[0].id, is_deleted: false, message: "Picha imerejeshwa kwenye historia yako." });
  } catch { return response({ ok: false, error: "Profile photo service unavailable." }, 503); }
};
