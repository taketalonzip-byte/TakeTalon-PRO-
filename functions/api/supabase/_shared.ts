export interface SupabaseEnv { SUPABASE_URL?: string; SUPABASE_SERVICE_ROLE_KEY?: string; }
export const supabaseGet = (env: SupabaseEnv, path: string) => {
  const base = (env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = env.SUPABASE_SERVICE_ROLE_KEY || "";
  return fetch(`${base}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json" }, signal: AbortSignal.timeout(10000) });
};
export const empty = (status = 200) => Response.json([], { status });
