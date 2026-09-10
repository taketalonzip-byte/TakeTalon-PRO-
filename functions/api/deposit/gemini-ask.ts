interface GeminiEnv { GEMINI_API_KEY?: string }
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export const onRequest = async ({ request, env }: { request: Request; env: GeminiEnv }) => {
  if (request.method !== "POST") return json({ ok: false, error: "Method not allowed." }, 405);
  let body: any;
  try { body = await request.json(); } catch { body = {}; }
  const question = typeof body?.question === "string" ? body.question.trim() : "";
  const lang = body?.lang === "fr" ? "fr" : body?.lang === "en" ? "en" : "sw";
  if (!question) return json({ ok: false, message: "Missing question" }, 400);
  const key = String(env.GEMINI_API_KEY || "").trim();
  const unavailable = lang === "sw" ? "Gemini AI haikuweza kujibu kwa sasa. Jaribu tena baadaye." : lang === "fr" ? "Gemini AI n'a pas pu répondre pour le moment. Réessayez plus tard." : "Gemini AI couldn't answer right now. Please try again later.";
  if (!key) return json({ ok: false, error: unavailable, message: unavailable }, 503);
  const system = `You are the TakeTalon AI Assistant. Answer directly and politely in ${lang}. Keep the answer to 2 to 4 sentences. Never ask for or reveal passwords, PINs, or private keys.`;
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ parts: [{ text: question }] }], generationConfig: { temperature: 0.3 } }),
      signal: AbortSignal.timeout(12000),
    });
    const data: any = await response.json().catch(() => ({}));
    const answer = data?.candidates?.[0]?.content?.parts?.map((part: any) => part?.text || "").join("").trim();
    if (response.ok && answer) return json({ ok: true, answer });
    return json({ ok: false, error: unavailable, message: unavailable }, 503);
  } catch {
    return json({ ok: false, error: unavailable, message: unavailable }, 503);
  }
};
