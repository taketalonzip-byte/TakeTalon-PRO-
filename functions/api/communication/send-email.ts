interface EmailEnv { BREVO_API_KEY?: string; BREVO_SENDER_EMAIL?: string; BREVO_SENDER_NAME?: string }
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
export const onRequest = async ({ request, env }: { request: Request; env: EmailEnv }) => {
  if (request.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);
  let body: any;
  try { body = await request.json(); } catch { return json({ ok: false, error: "Invalid JSON" }, 400); }
  const { toEmail, toName, subject, htmlContent } = body || {};
  if (!toEmail || !subject || !htmlContent) return json({ ok: false, error: "Missing required fields: toEmail, subject, htmlContent" }, 400);
  const apiKey = String(env.BREVO_API_KEY || "").trim();
  if (!apiKey) return json({ ok: false, error: "Email service is not configured" }, 503);
  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { accept: "application/json", "api-key": apiKey, "content-type": "application/json" },
      body: JSON.stringify({ sender: { name: env.BREVO_SENDER_NAME || "TakeTalon PRO", email: env.BREVO_SENDER_EMAIL || "support@taketalon.com" }, to: [{ email: toEmail, name: toName || toEmail }], subject, htmlContent }),
      signal: AbortSignal.timeout(12000),
    });
    const data = await response.json().catch(() => ({}));
    return json({ ok: response.ok, data }, response.ok ? 200 : 502);
  } catch { return json({ ok: false, error: "Email service unavailable" }, 504); }
};
