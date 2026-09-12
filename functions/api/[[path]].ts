import { onRequest as login } from "./auth/login";
import { onRequest as sendOtp } from "./auth/send-otp";
import { onRequest as verifyOtp } from "./auth/verify-otp";
import { onRequest as createAccount } from "./auth/create-account";
import { onRequest as profileLookup } from "./auth/profile-lookup";
import { onRequest as profileUpload } from "./profile-photo/upload";
import { onRequest as profileSwitch } from "./profile-photo/switch";
import { onRequest as profileDelete } from "./profile-photo/delete";
import { onRequest as profileRestore } from "./profile-photo/restore";
import { onRequest as createPost } from "./supabase/create-post";

interface PagesEnv {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  VITE_SUPABASE_ANON_KEY?: string;
}
type PagesRequestContext<Env> = { request: Request; env: Env; next?: () => Promise<Response> };
const dispatch: Record<string, (ctx: PagesRequestContext<PagesEnv>) => Promise<Response> | Response> = {
  "/api/auth/login": login,
  "/api/auth/send-otp": sendOtp,
  "/api/auth/verify-otp": verifyOtp,
  "/api/auth/create-account": createAccount,
  "/api/auth/profile-lookup": profileLookup,
  "/api/profile-photo/upload": profileUpload,
  "/api/profile-photo/switch": profileSwitch,
  "/api/profile-photo/delete": profileDelete,
  "/api/profile-photo/restore": profileRestore,
  "/api/supabase/create-post": createPost,
};
const retired = (path: string) => Response.json({ ok: false, error: "route_not_migrated", route: path }, { status: 410, headers: { "Cache-Control": "no-store" } });
export const onRequest = async ({ request, env, next }: PagesRequestContext<PagesEnv>) => {
  const incomingUrl = new URL(request.url);
  const handler = dispatch[incomingUrl.pathname];
  if (handler) return handler({ request, env });
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
  if (incomingUrl.pathname.startsWith("/api/")) return retired(incomingUrl.pathname);
  // Never intercept the SPA, static assets, robots.txt, or sitemap.xml.
  return next ? next() : new Response("Not Found", { status: 404 });
};
