export interface PhotoEnv { SUPABASE_URL?: string; SUPABASE_SERVICE_ROLE_KEY?: string; VITE_SUPABASE_ANON_KEY?: string; }
export const response = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function actor(request: Request, env: PhotoEnv) {
  const token = request.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  const base = (env.SUPABASE_URL || "").replace(/\/$/, "");
  const anon = env.VITE_SUPABASE_ANON_KEY || "";
  const key = env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!token || !base || !anon || !key) return null;
  const auth = await fetch(`${base}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5000) });
  if (!auth.ok) return null;
  const user: any = await auth.json();
  const profileResponse = await fetch(`${base}/rest/v1/profiles?select=id,auth_user_id,avatar_url&auth_user_id=eq.${encodeURIComponent(user.id)}&limit=1`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(5000) });
  const profiles: any[] = await profileResponse.json().catch(() => []);
  return profiles[0] ? { base, key, profile: profiles[0] } : null;
}
export const dbHeaders = (key: string) => ({ apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" });
