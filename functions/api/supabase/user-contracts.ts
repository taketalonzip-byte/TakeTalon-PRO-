import { supabaseGet, type SupabaseEnv } from "./_shared";
const uuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export const onRequest = async ({ request, env }: { request: Request; env: SupabaseEnv }) => {
  const input = (new URL(request.url).searchParams.get("profile_id") || new URL(request.url).searchParams.get("auth_user_id") || "").trim();
  if (!input) return Response.json({ ok: false, contracts: [] });
  try {
    let profileId = input;
    const filter = uuid(input) ? `or=(id.eq.${input},auth_user_id.eq.${input})` : `or=(email.eq.${encodeURIComponent(input)},username.eq.${encodeURIComponent(input)},phone.eq.${encodeURIComponent(input)})`;
    const profileResponse = await supabaseGet(env, `profiles?select=id&${filter}&limit=1`);
    if (profileResponse.ok) { const profiles: any[] = await profileResponse.json(); if (profiles[0]?.id) profileId = profiles[0].id; }
    const contracts = await supabaseGet(env, `unlock_contracts?select=*&unlocker_id=eq.${encodeURIComponent(profileId)}&status=in.(active,pending)`);
    if (!contracts.ok) return Response.json({ ok: false, contracts: [] });
    return Response.json({ ok: true, contracts: await contracts.json() });
  } catch { return Response.json({ ok: false, contracts: [] }); }
};
