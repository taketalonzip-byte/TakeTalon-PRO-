interface SmsEnv {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SMS_FORWARDER_SECRET?: string;
  SMS_SECRET_KEY?: string;
  SMS_PIN_CODE?: string;
}
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const normalizePhone = (phone: string) => {
  let value = String(phone || "").replace(/[^0-9+]/g, "");
  if (value.startsWith("+257")) value = value.slice(4);
  else if (value.startsWith("257") && value.length > 8) value = value.slice(3);
  else if (value.startsWith("0")) value = value.slice(1);
  return value;
};
const parseSms = (body: string, sender: string) => {
  const header = body.match(/(?:De|From)\s*:\s*(\+?\d{8,15})/i)?.[1] || "";
  const phone = normalizePhone(header || sender);
  const amountMatch = body.match(/(?:envoye|envoyé|received|umepokea|sent|credit|a\s+envoye|recharge)[^\d]*([\d,]+(?:\.\d+)?)/i) || body.match(/(?:received|envoye|kutumiwa|pata)\s+(?:Fbu|KSh|TSH|\$)?\s*([\d,]+(?:\.\d+)?)/i);
  const amount = amountMatch ? Number(amountMatch[1].replace(/,/g, "")) : 0;
  const reference = body.match(/(?:Ref|ID|Txn|Transaction\s*(?:ID|Id))\s*:?\s*([A-Z0-9_-]+)/i)?.[1] || `SMS_${Date.now()}`;
  return { phone, amount, reference, valid: amount > 0 };
};
export const onRequest = async ({ request, env }: { request: Request; env: SmsEnv }) => {
  if (request.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);
  const configured = [env.SMS_FORWARDER_SECRET, env.SMS_SECRET_KEY, env.SMS_PIN_CODE].map((v) => String(v || "").trim()).find(Boolean) || "";
  const provided = request.headers.get("x-sms-secret") || request.headers.get("x-secret") || request.headers.get("x-pin-code") || request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (!configured) return json({ success: false, error: "SMS forwarder haijasanidiwa" }, 503);
  if (!provided || provided !== configured) return json({ success: false, error: "Secret key si sahihi." }, 401);
  let body: any;
  try { body = await request.json(); } catch { body = {}; }
  const rawSender = String(body?.sender || body?.from || body?.phone || "SMS_FORWARDER");
  const rawBody = String(body?.body || body?.text || body?.message || body?.content || "");
  if (!rawBody) return json({ success: false, error: "Missing SMS content body" }, 400);
  const parsed = parseSms(rawBody, rawSender);
  const base = (env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!base || !key) return json({ success: false, error: "Database haijaunganishwa." }, 503);
  try {
    const rpcResponse = await fetch(`${base}/rest/v1/rpc/process_sms_deposit`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_sender_phone: parsed.phone || rawSender, p_amount: parsed.amount, p_sms_reference: parsed.reference, p_raw_sms: rawBody, p_is_verified_provider_format: parsed.valid }),
      signal: AbortSignal.timeout(10000),
    });
    const result = await rpcResponse.json().catch(() => ({}));
    if (!rpcResponse.ok) return json({ success: false, error: "Imeshindikana kuchakata SMS kupitia database." }, 502);
    return json({ success: true, parsed, result, message: result?.ok ? "SMS imepokelewa na fedha zimeongezwa kwenye wallet." : "SMS imepokelewa lakini haikuweza kuunganishwa na akaunti." });
  } catch { return json({ success: false, error: "Database haijaunganishwa." }, 504); }
};
