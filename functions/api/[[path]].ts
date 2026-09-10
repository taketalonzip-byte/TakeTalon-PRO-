interface PagesEnv {
  BACKEND_URL: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  VITE_SUPABASE_ANON_KEY?: string;
}

type PagesRequestContext<Env> = {
  request: Request;
  env: Env;
};

export const onRequest = async ({ request, env }: PagesRequestContext<PagesEnv>) => {
  const incomingUrl = new URL(request.url);
  if ((incomingUrl.pathname === "/api/supabase/status" || incomingUrl.pathname === "/api/cloudflare/supabase-status") && request.method === "GET") {
    const key = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY || "";
    const start = Date.now();
    if (!env.SUPABASE_URL || !key) return Response.json({ ok: false, configured: false, status: "NOT_CONFIGURED" });
    try {
      const response = await fetch(`${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/profiles?select=id&limit=1`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(8000) });
      const latencyMs = Date.now() - start;
      return Response.json(response.ok ? { ok: true, configured: true, status: "ONLINE", latencyMs, message: "Seva ya Supabase ipo mtandaoni na inafanya kazi vizuri." } : { ok: false, configured: true, status: "DB_ERROR", latencyMs });
    } catch (error: any) {
      return Response.json({ ok: false, configured: true, status: "TIMEOUT_OR_UNREACHABLE", latencyMs: Date.now() - start, error: error?.message || String(error) });
    }
  }
  const backendBase = (env.BACKEND_URL || "https://taketalon-pro.onrender.com").replace(/\/$/, "");
  const backendUrl = `${backendBase}${incomingUrl.pathname}${incomingUrl.search}`;

  const headers = new Headers(request.headers);
  headers.set("host", new URL(backendBase).host);
  headers.delete("cf-connecting-ip");
  headers.delete("cf-ray");

  const proxiedRequest = new Request(backendUrl, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
    redirect: "manual",
  });

  return fetch(proxiedRequest);
};
