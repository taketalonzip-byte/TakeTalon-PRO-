interface HealthEnv {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
}

type PagesRequestContext<Env> = {
  request: Request;
  env: Env;
};

export const onRequest = async ({ env }: PagesRequestContext<HealthEnv>) => {
  const supabaseUrl = (env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  const anonKey = env.VITE_SUPABASE_ANON_KEY || "";
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

  return Response.json({
    status: "ok",
    app: "TakeTalon PRO",
    dbConnected,
    backend: "cloudflare-pages-function",
    timestamp: new Date().toISOString(),
  });
};
