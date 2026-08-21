import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "5000", 10);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// ─────────────────────────────────────────────────────────────────────────────
// Supabase Backend Admin Client Initialization (Server-Side)
// ─────────────────────────────────────────────────────────────────────────────
const rawSupabaseUrl =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "https://placeholder-project.supabase.co";

const supabaseUrl = rawSupabaseUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  "placeholder-key";

const isDbConfigured =
  supabaseUrl !== "https://placeholder-project.supabase.co" &&
  supabaseServiceKey !== "placeholder-key";

const supabaseAdmin = isDbConfigured
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

// In-Memory Fallback Audit Log Store (for real-time dashboard updates)
interface AuditLogItem {
  requestId: string;
  timestamp: string;
  sender: string;
  phone: string;
  amount: number;
  currency: string;
  transactionCode: string;
  matchedUser: string | null;
  status: "SUCCESS" | "FAILED" | "UNMATCHED" | "DUPLICATE";
  rawBody: string;
  errorMessage?: string;
}

const auditLogs: AuditLogItem[] = [];

// Helper to push audit logs (max 100 items retained in memory)
function pushAuditLog(log: AuditLogItem) {
  auditLogs.unshift(log);
  if (auditLogs.length > 100) {
    auditLogs.pop();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Clean & Normalize Phone Numbers
// ─────────────────────────────────────────────────────────────────────────────
function normalizePhone(phone: string): string {
  if (!phone) return "";
  let clean = phone.replace(/[^0-9+]/g, "");
  if (clean.startsWith("+257")) clean = clean.substring(4);
  else if (clean.startsWith("257") && clean.length > 8) clean = clean.substring(3);
  else if (clean.startsWith("0")) clean = clean.substring(1);
  return clean;
}

// ─────────────────────────────────────────────────────────────────────────────
// SMS Regex Parser (Lumicash, M-Pesa, EcoCash, Airtel Money, Mobile Money Fbu)
// ─────────────────────────────────────────────────────────────────────────────
interface ParsedSms {
  phone: string;
  amount: number;
  transactionCode: string;
  claimedBalance?: number;
  isValidFormat: boolean;
}

function parseSmsBody(body: string, rawSender?: string): ParsedSms {
  if (!body) {
    return { phone: normalizePhone(rawSender || ""), amount: 0, transactionCode: `SMS_${Date.now()}`, isValidFormat: false };
  }

  // Extract phone from 'De : +25779123456(...)' prefix if present
  let extractedPhoneFromHeader = "";
  const headerPhoneMatch = body.match(/De\s*:\s*(\+?\d{8,15})/i) || body.match(/From\s*:\s*(\+?\d{8,15})/i);
  if (headerPhoneMatch) {
    extractedPhoneFromHeader = normalizePhone(headerPhoneMatch[1]);
  }

  // 1. Direct Subscriber Transfer format:
  // "L'abonne 62411400 vous a envoye 2000 Fbu.  Votre solde de credit est 2000.45 Fbu. Merci."
  // "L'abonne 68375032 vous a envoye 300 Fbu.  Votre solde de credit est 305.81 Fbu. Merci."
  const subscriberTransferRegex = /(?:L['’`\s]?abonne|Abonne|Abonné|Subscriber)\s*(\+?\d+)\s+vous\s+a\s+envoye\s+([\d,]+(?:\.\d+)?)\s*(?:Fbu|fbu|F|BIF)?/i;
  const subscriberTransferMatch = body.match(subscriberTransferRegex);

  if (subscriberTransferMatch) {
    const phone = normalizePhone(subscriberTransferMatch[1]);
    const amount = parseFloat(subscriberTransferMatch[2].replace(/,/g, ""));
    const balanceMatch = body.match(/(?:solde|balance)\s+(?:de\s+credit\s+est|est|is)?\s*([\d,]+(?:\.\d+)?)\s*(?:Fbu|fbu|F|BIF)?/i);

    return {
      phone: phone || extractedPhoneFromHeader || normalizePhone(rawSender || ""),
      amount: amount,
      transactionCode: `UNIT_${Date.now()}_${phone}`,
      claimedBalance: balanceMatch ? parseFloat(balanceMatch[1].replace(/,/g, "")) : undefined,
      isValidFormat: true,
    };
  }

  // 2. Recharge message:
  // "Vous avez recharge avec succes 2000 F. Votre solde: 2001 F. Validite: 17/09/2026..."
  const rechargeRegex = /recharge\s+(?:avec\s+succes|avec\s+succès)?\s*([\d,]+(?:\.\d+)?)\s*(?:Fbu|fbu|F|BIF)?/i;
  const rechargeMatch = body.match(rechargeRegex);

  if (rechargeMatch) {
    const amount = parseFloat(rechargeMatch[1].replace(/,/g, ""));
    const balanceMatch = body.match(/solde\s*:\s*([\d,]+(?:\.\d+)?)\s*(?:Fbu|fbu|F|BIF)?/i);

    return {
      phone: extractedPhoneFromHeader || normalizePhone(rawSender || ""),
      amount: amount,
      transactionCode: `RCH_${Date.now()}`,
      claimedBalance: balanceMatch ? parseFloat(balanceMatch[1].replace(/,/g, "")) : undefined,
      isValidFormat: true,
    };
  }

  // 3. Lumicash / Generic Mobile Money format:
  const lumicashPhoneRegex = /(?:L['’`\s]?abonne|Abonne|Abonné|Subscriber|From|Mtumiaji|De\s*:?)\s*(\+?\d+)/i;
  const lumicashAmountRegex = /(?:envoye|envoyé|received|umepokea|sent|credit|a\s+envoye)\s+([\d,]+(?:\.\d+)?)\s*(?:Fbu|fbu|BIF|KES|USD)?/i;
  const lumicashBalanceRegex = /(?:solde|balance|salio)\s+(?:de\s+credit\s+est|is|ni)?\s*([\d,]+(?:\.\d+)?)\s*(?:Fbu|fbu|BIF|KES|USD)?/i;

  const phoneMatch = body.match(lumicashPhoneRegex);
  const amountMatch = body.match(lumicashAmountRegex);
  const balanceMatch = body.match(lumicashBalanceRegex);

  if (amountMatch) {
    const codeMatch = body.match(/Ref:?\s*([A-Z0-9]+)/i) || body.match(/ID:?\s*([A-Z0-9]+)/i) || body.match(/Txn:?\s*([A-Z0-9]+)/i);
    const rawAmount = amountMatch[1].replace(/,/g, "");
    
    let detectedPhone = extractedPhoneFromHeader;
    if (!detectedPhone && phoneMatch) {
      detectedPhone = normalizePhone(phoneMatch[1]);
    }
    if (!detectedPhone && rawSender) {
      detectedPhone = normalizePhone(rawSender);
    }

    return {
      phone: detectedPhone || normalizePhone(rawSender || ""),
      amount: parseFloat(rawAmount),
      transactionCode: codeMatch ? codeMatch[1] : `LUM_${Date.now()}`,
      claimedBalance: balanceMatch ? parseFloat(balanceMatch[1].replace(/,/g, "")) : undefined,
      isValidFormat: true,
    };
  }

  // 4. M-Pesa / Standard Mobile Money format:
  const codeRegex = /^([A-Z0-9]{8,12})\s+Confirmed/i;
  const mpesaCodeMatch = body.match(codeRegex);
  const generalAmountRegex = /(?:received|envoye|kutumiwa|pata)\s+(?:Fbu|KSh|TSH|\$)?\s*([\d,]+(?:\.\d+)?)/i;
  const generalPhoneRegex = /(?:from|kutoka|par)\s+(\+?\d{8,15})/i;

  const mAmount = body.match(generalAmountRegex);
  const mPhone = body.match(generalPhoneRegex);

  if (mAmount) {
    const cleanAmount = parseFloat(mAmount[1].replace(/,/g, ""));
    const phone = extractedPhoneFromHeader || (mPhone ? normalizePhone(mPhone[1]) : normalizePhone(rawSender || ""));
    return {
      phone: phone || normalizePhone(rawSender || ""),
      amount: cleanAmount,
      transactionCode: mpesaCodeMatch ? mpesaCodeMatch[1] : `TX_${Date.now()}`,
      isValidFormat: true,
    };
  }

  // 5. General System Message / Promotional Text / Call detail / Low balance alert:
  // Extracts phone number if present in text, otherwise uses rawSender. Always returns amount 0.
  const anyPhone = body.match(/(\+?257\d{8}|\b0?7[1-9]\d{7}\b|\b0?6[1-9]\d{7}\b)/);
  const detectedPhone = extractedPhoneFromHeader || (anyPhone ? normalizePhone(anyPhone[1]) : normalizePhone(rawSender || ""));

  return {
    phone: detectedPhone || normalizePhone(rawSender || ""),
    amount: 0,
    transactionCode: `MSG_${Date.now()}`,
    isValidFormat: false,
  };
}

// Timing-safe string comparison helper (prevents timing side-channel attacks)
function safeCompare(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, Buffer.alloc(bufA.length));
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

// In-Memory Rate Limiter for SMS Forwarder (max 30 requests / minute / IP)
const smsRateLimitMap = new Map<string, { count: number; resetTime: number }>();

function isSmsRateLimited(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 30;

  const record = smsRateLimitMap.get(ip);
  if (!record || now > record.resetTime) {
    smsRateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return false;
  }

  record.count += 1;
  return record.count > maxRequests;
}

// ─────────────────────────────────────────────────────────────────────────────
// API Endpoint 1: /api/sms-forwarder & /api/sms (Webhook Endpoint for Android SMS Forwarder)
// ─────────────────────────────────────────────────────────────────────────────
const handleSmsForwarder = async (req: Request, res: Response) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clientIp = (req.ip || req.headers["x-forwarded-for"] || "127.0.0.1").toString();
  const nowIso = new Date().toISOString();

  // 0. RATE LIMITING CHECK (max 30 requests / min / IP)
  if (isSmsRateLimited(clientIp)) {
    console.warn(`[SMS-FORWARDER][${requestId}][429] Rate limit exceeded. IP: ${clientIp}, Timestamp: ${nowIso}`);
    return res.status(429).json({
      success: false,
      requestId,
      error: "Too Many Requests. Max 30 requests per minute.",
    });
  }

  // ============================================================
  // 1. SECRET KEY CHECK -- TIMING-SAFE COMPARISON & DETAILED LOGGING
  // ============================================================
  const rawSecretList = [
    process.env.SMS_FORWARDER_SECRET,
    process.env.SMS_SECRET_KEY,
    process.env.SMS_PIN_CODE,
  ];
  const validSecrets = rawSecretList
    .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    .map((s) => s.trim())
    .filter((s) => !s.startsWith("http://") && !s.startsWith("https://"));

  const configuredSecret = validSecrets[0] || (process.env.SMS_FORWARDER_SECRET || process.env.SMS_SECRET_KEY || "").trim();
  const providedSecretRaw =
    req.headers["x-sms-secret"] ||
    req.headers["x-secret"] ||
    req.headers["x-pin-code"] ||
    req.headers["x-pin"] ||
    (req.headers["authorization"] as string | undefined)?.replace("Bearer ", "") ||
    req.query.secret ||
    req.query.pin ||
    req.query.key ||
    req.body?.secret ||
    req.body?.pin ||
    req.body?.key ||
    req.body?.pin_code;

  const providedSecret = typeof providedSecretRaw === "string" ? providedSecretRaw.trim() : "";

  if (!configuredSecret) {
    // Usalama: kama secret HAIJAWEKWA kwenye server env, ZUIA KABISA (fail-closed)
    console.error(`[SMS-FORWARDER][${requestId}][503] SMS_FORWARDER_SECRET haijawekwa server-side. Timestamp: ${nowIso}, IP: ${clientIp}`);
    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from("sms_auth_failures").insert({
          reason: "no_secret_configured",
          provided_secret_length: providedSecret ? String(providedSecret).length : 0,
          provided_secret_prefix: providedSecret ? String(providedSecret).substring(0, 2) : null,
          client_ip: (req.ip || req.headers["x-forwarded-for"] || null)?.toString() || null,
          headers_received: Object.keys(req.headers),
        });
      } catch (logErr) {
        console.error(`[SMS-FORWARDER][${requestId}] Failed to log auth failure:`, logErr);
      }
    }
    return res.status(503).json({ success: false, error: "SMS forwarder haijasanidiwa (secret haipo)." });
  }

  if (!providedSecret || !safeCompare(providedSecret, configuredSecret)) {
    console.warn(`[SMS-FORWARDER][${requestId}][401] Secret key si sahihi / haipo. Timestamp: ${nowIso}, IP: ${clientIp}, ProvidedSecretLength: ${providedSecret.length}`);
    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from("sms_auth_failures").insert({
          reason: !providedSecret ? "missing_secret_header" : "wrong_secret",
          provided_secret_length: providedSecret ? String(providedSecret).length : 0,
          provided_secret_prefix: providedSecret ? String(providedSecret).substring(0, 2) : null,
          client_ip: (req.ip || req.headers["x-forwarded-for"] || null)?.toString() || null,
          headers_received: Object.keys(req.headers),
        });
      } catch (logErr) {
        console.error(`[SMS-FORWARDER][${requestId}] Failed to log auth failure:`, logErr);
      }
    }
    return res.status(401).json({ success: false, error: "Secret key si sahihi." });
  }

  // ============================================================
  // 2. TOA TAARIFA ZA SMS (parseSmsBody haigusiki -- ni sahihi)
  // ============================================================
  const rawSender =
    req.body?.sender || req.body?.from || req.body?.phone || req.body?.address ||
    (req.query.from as string) || (req.query.sender as string) || "SMS_FORWARDER";

  const rawBody =
    req.body?.body || req.body?.text || req.body?.message || req.body?.content ||
    req.body?.msg || (req.query.text as string) || (req.query.msg as string) || "";

  if (!rawBody) {
    return res.status(400).json({ success: false, error: "Missing SMS content body" });
  }

  console.log(`[SMS-FORWARDER][${requestId}] Received: "${rawBody}" from ${rawSender}`);

  const parsed = parseSmsBody(rawBody, rawSender as string);

  // ============================================================
  // 3. ANDIKA KUPITIA process_sms_deposit() PEKEE -- SINGLE SOURCE OF TRUTH
  // ============================================================
  if (!supabaseAdmin) {
    console.error(`[SMS-FORWARDER][${requestId}][503] supabaseAdmin haijaanzishwa (env keys hazipo). Timestamp: ${nowIso}`);
    return res.status(503).json({ success: false, error: "Database haijaunganishwa." });
  }

  const { data: rpcRes, error: rpcErr } = await supabaseAdmin.rpc("process_sms_deposit", {
    p_sender_phone: parsed.phone || (rawSender as string),
    p_amount: parsed.amount,
    p_sms_reference: parsed.transactionCode,
    p_raw_sms: rawBody,
  });

  if (rpcErr) {
    console.error(`[SMS-FORWARDER][${requestId}] RPC error:`, rpcErr.message);
    return res.status(500).json({
      success: false,
      requestId,
      error: "Imeshindikana kuchakata SMS kupitia database.",
      details: rpcErr.message,
    });
  }

  console.log(`[SMS-FORWARDER][${requestId}] process_sms_deposit result:`, rpcRes);

  return res.status(200).json({
    success: true,
    requestId,
    parsed,
    result: rpcRes,
    message: rpcRes?.ok
      ? "✅ SMS imepokelewa na fedha zimeongezwa kwenye wallet."
      : "✅ SMS imepokelewa na kuhifadhiwa kwenye database (sms_deposit_logs), lakini haikuweza kuunganishwa na akaunti: " + (rpcRes?.error || "sababu isiyojulikana"),
  });
};

app.post("/api/sms-forwarder", handleSmsForwarder);
app.get("/api/sms-forwarder", handleSmsForwarder);
app.post("/api/sms", handleSmsForwarder);
app.get("/api/sms", handleSmsForwarder);
app.post("/api/sms-gateway", handleSmsForwarder);

// ─────────────────────────────────────────────────────────────────────────────
// API Endpoint 2: /api/sms-gateway (Query Logs / Agent Dashboard Sync from sms_deposit_logs)
// ─────────────────────────────────────────────────────────────────────────────
app.get("/api/sms-gateway", async (req: Request, res: Response) => {
  if (supabaseAdmin) {
    try {
      // Primary: query sms_deposit_logs with profiles join
      const { data: rows, error: logErr } = await supabaseAdmin
        .from("sms_deposit_logs")
        .select(`
          *,
          profiles:matched_profile_id (username, phone)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!logErr && rows) {
        const dbLogs = rows.map((r: any) => {
          const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
          const matchedName = profile?.username || (r.matched_profile_id ? `User:${r.matched_profile_id}` : null);

          return {
            id: r.id,
            requestId: r.id,
            timestamp: r.created_at || r.processed_at,
            sender: r.sender_phone || "SMS_FORWARDER",
            phone: r.sender_phone || "N/A",
            phone_normalized: r.phone_normalized || r.sender_phone || "N/A",
            amount: Number(r.parsed_amount) || Number(r.amount) || 0,
            currency: "FBU",
            transactionCode: r.sms_reference || "N/A",
            matchedUser: matchedName,
            matchedProfileId: r.matched_profile_id || null,
            status: r.status === "matched" ? "SUCCESS" : r.status || "UNMATCHED",
            rawBody: r.raw_sms || r.body || "",
            errorMessage: r.error_details || r.error || null,
          };
        });

        return res.json({ status: "ok", auditLogs: dbLogs, logs: dbLogs });
      }

      // Fallback simple query if join fails
      const { data: fallbackRows } = await supabaseAdmin
        .from("sms_deposit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (fallbackRows) {
        const dbLogs = fallbackRows.map((r: any) => ({
          id: r.id,
          requestId: r.id,
          timestamp: r.created_at || r.processed_at,
          sender: r.sender_phone || "SMS_FORWARDER",
          phone: r.sender_phone || "N/A",
          phone_normalized: r.phone_normalized || r.sender_phone || "N/A",
          amount: Number(r.parsed_amount) || Number(r.amount) || 0,
          currency: "FBU",
          transactionCode: r.sms_reference || "N/A",
          matchedUser: r.matched_profile_id ? `User:${r.matched_profile_id}` : null,
          status: r.status === "matched" ? "SUCCESS" : r.status || "UNMATCHED",
          rawBody: r.raw_sms || r.body || "",
          errorMessage: r.error_details || r.error || null,
        }));

        return res.json({ status: "ok", auditLogs: dbLogs, logs: dbLogs });
      }
    } catch (e) {
      console.warn("[SMS-GATEWAY] Fetching sms_deposit_logs error:", e);
    }
  }

  res.json({ status: "ok", auditLogs: [], logs: [] });
});

app.post("/api/sms-gateway", handleSmsForwarder);

// ─────────────────────────────────────────────────────────────────────────────
// Supporting Supabase & App Routes for Full-Stack Compatibility
// ─────────────────────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    app: "TakeTalon PRO",
    dbConnected: isDbConfigured,
    timestamp: new Date().toISOString(),
  });
});

// Unified Team Sports API Endpoints (Ice Hockey, Rugby, Baseball, Cricket, Volleyball, Handball, etc.)
app.get("/api/team-sports/fixtures", async (req, res) => {
  const sport = (req.query.sport as string || "cricket").toLowerCase();
  const limit = parseInt(req.query.limit as string || "50", 10);

  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from("team_sports_fixtures")
        .select(`
          id,
          sport,
          competition_id,
          external_id,
          provider,
          home_team_id,
          away_team_id,
          home_team_name,
          away_team_name,
          match_date,
          status,
          home_score,
          away_score,
          winner,
          extra_stats,
          team_sports_competitions ( name, logo_url )
        `)
        .eq("sport", sport)
        .order("match_date", { ascending: true })
        .limit(limit);

      if (!error && Array.isArray(data)) {
        return res.json({ ok: true, sport, count: data.length, data });
      }
    } catch (e: any) {
      console.warn(`[SERVER] Error querying team_sports_fixtures for ${sport}:`, e?.message);
    }
  }

  return res.json({ ok: true, sport, count: 0, data: [] });
});

app.post("/api/team-sports/sync", async (req, res) => {
  const sport = (req.body?.sport as string || "cricket").toLowerCase();
  const provider = req.body?.provider || "api-sports";
  const fixtures = Array.isArray(req.body?.fixtures) ? req.body.fixtures : [];

  if (!supabaseAdmin) {
    return res.status(500).json({ ok: false, error: "Database client not initialized" });
  }

  let processedCount = 0;
  try {
    for (const item of fixtures) {
      const { error } = await supabaseAdmin.from("team_sports_fixtures").upsert(
        {
          sport,
          provider,
          external_id: item.external_id || `ext-${Date.now()}-${Math.random()}`,
          home_team_name: item.home_team_name,
          away_team_name: item.away_team_name,
          match_date: item.match_date || new Date().toISOString(),
          status: item.status || "NS",
          home_score: item.home_score || 0,
          away_score: item.away_score || 0,
          winner: item.winner || null,
          extra_stats: item.extra_stats || {},
          updated_at: new Date().toISOString(),
        },
        { onConflict: "sport,external_id,provider" }
      );
      if (!error) processedCount++;
    }

    // Log to sports_sync_logs and update config
    await supabaseAdmin.from("sports_sync_logs").insert({
      sport,
      action: "API_SYNC",
      status: "SUCCESS",
      records_processed: processedCount,
    });

    await supabaseAdmin
      .from("sports_sync_config")
      .upsert(
        { sport, is_enabled: true, provider, last_synced_at: new Date().toISOString() },
        { onConflict: "sport" }
      );

    return res.json({ ok: true, sport, processedCount });
  } catch (err: any) {
    await supabaseAdmin.from("sports_sync_logs").insert({
      sport,
      action: "API_SYNC",
      status: "FAILED",
      records_processed: processedCount,
      error_message: err?.message || String(err),
    });
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

// ============================================================
// PROFILE PHOTO MANAGEMENT API ENDPOINTS
// Rules:
// 1. All operations are 0 FBu (FREE).
// 2. Profile photo changes are allowed at ANY TIME without time restrictions or cooldowns.
// 3. Deleting or restoring photos is FREE (0 FBu).
// ============================================================

async function getProfileAndWallet(userIdInput: string) {
  if (!supabaseAdmin) return null;
  const inputClean = (userIdInput || "").trim();
  if (!inputClean) return null;

  const isInputUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(inputClean);
  let query = supabaseAdmin.from("profiles").select("*");
  if (isInputUuid) {
    query = query.or(`id.eq.${inputClean},auth_user_id.eq.${inputClean}`);
  } else {
    query = query.or(`username.eq.${inputClean},email.eq.${inputClean},phone.eq.${inputClean}`);
  }

  let { data: profile } = await query.maybeSingle();

  if (!profile) {
    // Attempt auto-creation of profile record if missing in Supabase
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(inputClean);
      const insertObj: any = {
        username: inputClean,
        full_name: inputClean,
        created_at: new Date().toISOString(),
      };
      if (isUuid) {
        insertObj.id = inputClean;
      }
      const { data: createdProf } = await supabaseAdmin
        .from("profiles")
        .upsert(insertObj, { onConflict: isUuid ? "id" : "username" })
        .select("*")
        .maybeSingle();

      profile = createdProf || {
        id: inputClean,
        username: inputClean,
        full_name: inputClean,
      };
    } catch (e) {
      profile = {
        id: inputClean,
        username: inputClean,
        full_name: inputClean,
      };
    }
  }

  let wallet: any = null;
  try {
    let { data: existingWallet } = await supabaseAdmin
      .from("wallets")
      .select("*")
      .eq("profile_id", profile.id)
      .maybeSingle();

    if (!existingWallet) {
      const { data: createdWallet } = await supabaseAdmin
        .from("wallets")
        .upsert({ profile_id: profile.id, balance: 0, reserved_balance: 0 }, { onConflict: "profile_id" })
        .select("*")
        .maybeSingle();
      wallet = createdWallet;
    } else {
      wallet = existingWallet;
    }
  } catch (wErr) {
    // Ignore wallet creation failure for photo management
  }

  const balance = Number(wallet?.balance || 0);
  const reserved = Number(wallet?.reserved_balance || 0);
  const available = Math.max(0, balance - reserved);

  return { profile, wallet, availableBalance: available };
}

// 1. Fetch Profile Photo History & Current Active Avatar
app.get("/api/profile-photo/history", async (req, res) => {
  const userId = (req.query.user_id as string || "").trim();
  if (!userId) return res.status(400).json({ ok: false, error: "Missing user_id" });

  try {
    let activePhotos: any[] = [];
    let deletedPhotos: any[] = [];
    let currentAvatarUrl: string | null = null;
    let profileId = userId;

    if (supabaseAdmin) {
      const pw = await getProfileAndWallet(userId);
      if (pw?.profile) {
        profileId = pw.profile.id;
        currentAvatarUrl = pw.profile.avatar_url || null;

        const { data: photos, error } = await supabaseAdmin
          .from("profile_photos")
          .select("*")
          .eq("user_id", profileId)
          .order("created_at", { ascending: false });

        if (!error && photos) {
          activePhotos = photos.filter((p: any) => !p.is_deleted);
          deletedPhotos = photos.filter((p: any) => p.is_deleted);
          const currentPhoto = activePhotos.find((p: any) => p.is_current) || activePhotos[0];
          if (currentPhoto) {
            currentAvatarUrl = currentPhoto.photo_url;
          }
        }
      }
    }

    return res.json({
      ok: true,
      profile_id: profileId,
      current_avatar_url: currentAvatarUrl,
      activePhotos,
      deletedPhotos,
      cooldown_active: false,
      remaining_ms: 0,
      next_allowed_at: null,
      is_first_profile: activePhotos.length === 0,
    });
  } catch (err: any) {
    return res.json({
      ok: true,
      profile_id: userId,
      current_avatar_url: null,
      activePhotos: [],
      deletedPhotos: [],
      cooldown_active: false,
      remaining_ms: 0,
      next_allowed_at: null,
      is_first_profile: true,
    });
  }
});

// 2. Upload New Profile Photo (0 FBu, instant unlimited freedom)
app.post(["/api/profile-photo/upload", "/api/supabase/upload-avatar"], async (req, res) => {
  const userId = req.body?.user_id || req.body?.profile_id || req.body?.auth_user_id;
  const base64Data = req.body?.base64_data;
  const clientFileName = req.body?.file_name || "profile.jpg";

  if (!userId || !base64Data) {
    return res.status(400).json({ ok: false, error: "Missing user_id or base64_data" });
  }

  try {
    const nowIso = new Date().toISOString();
    let generatedPhotoId = `photo-${Date.now()}`;
    let finalPublicAvatarUrl = base64Data;

    if (supabaseAdmin) {
      try {
        const pw = await getProfileAndWallet(userId);
        if (pw?.profile) {
          const profileId = pw.profile.id;

          // Attempt uploading file buffer to Supabase Storage ('avatars' bucket)
          try {
            const matches = base64Data.match(/^data:(image\/\w+);base64,(.+)$/);
            const mimeType = matches ? matches[1] : "image/jpeg";
            const rawBase64 = matches ? matches[2] : base64Data.replace(/^data:image\/\w+;base64,/, "");
            const imageBuffer = Buffer.from(rawBase64, "base64");

            const ext = mimeType.split("/")[1] || "jpg";
            const storagePath = `avatars/${profileId}/${Date.now()}.${ext}`;
            const bucketName = "avatars";

            // Ensure bucket exists or create public 'avatars' bucket
            try {
              await supabaseAdmin.storage.createBucket(bucketName, { public: true });
            } catch (e) {
              // Ignore if bucket already exists
            }

            const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
              .from(bucketName)
              .upload(storagePath, imageBuffer, {
                contentType: mimeType,
                upsert: true,
              });

            if (!uploadError && uploadData?.path) {
              const { data: publicUrlData } = supabaseAdmin.storage
                .from(bucketName)
                .getPublicUrl(storagePath);
              
              if (publicUrlData?.publicUrl) {
                finalPublicAvatarUrl = publicUrlData.publicUrl;
              }
            } else if (uploadError) {
              console.warn("[PROFILE_PHOTO_STORAGE] Storage upload warning, fallback to URL:", uploadError);
            }
          } catch (storageErr) {
            console.warn("[PROFILE_PHOTO_STORAGE] Storage process error:", storageErr);
          }

          // Unset current profile photo flag
          try {
            await supabaseAdmin
              .from("profile_photos")
              .update({ is_current: false })
              .eq("user_id", profileId);
          } catch (e) {
            // Ignore if profile_photos table missing
          }

          // Insert new photo into history
          try {
            const { data: newPhoto } = await supabaseAdmin
              .from("profile_photos")
              .insert({
                user_id: profileId,
                photo_url: finalPublicAvatarUrl,
                is_current: true,
                is_deleted: false,
                created_at: nowIso,
              })
              .select("*")
              .maybeSingle();

            if (newPhoto?.id) {
              generatedPhotoId = newPhoto.id;
            }
          } catch (e) {
            // Ignore if profile_photos table missing
          }

          // Update profile main avatar_url with storage reference
          try {
            await supabaseAdmin
              .from("profiles")
              .update({ avatar_url: finalPublicAvatarUrl, last_profile_changed_at: nowIso })
              .eq("id", profileId);
          } catch (e) {
            console.warn("[PROFILE_PHOTO_UPLOAD] Failed to update avatar_url in profiles table:", e);
          }

          // Log transaction
          try {
            await supabaseAdmin.from("profile_photo_transactions").insert({
              user_id: profileId,
              photo_id: generatedPhotoId,
              action: "NEW_PROFILE",
              amount: 0,
              currency: "FBu",
              status: "SUCCESS",
              reference_id: `tx-photo-new-${Date.now()}`,
            });
          } catch (e) {
            // Ignore transaction table missing
          }
        }
      } catch (dbErr) {
        console.warn("[PROFILE_PHOTO_UPLOAD] DB update error, continuing with client payload:", dbErr);
      }
    }

    return res.json({
      ok: true,
      avatar_url: finalPublicAvatarUrl,
      photo_id: generatedPhotoId,
      last_profile_changed_at: nowIso,
      cooldown_active: false,
      remaining_ms: 0,
      next_allowed_at: null,
      message: "Picha mpya ya wasifu imewasilishwa na kuhifadhiwa kwa ufanisi!",
    });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

// 3. Switch to Previously Owned Profile Photo (0 FBu, instant unlimited freedom)
app.post("/api/profile-photo/switch", async (req, res) => {
  const { user_id, photo_id } = req.body || {};
  if (!user_id || !photo_id) {
    return res.status(400).json({ ok: false, error: "Missing user_id or photo_id" });
  }
  if (!supabaseAdmin) return res.status(503).json({ ok: false, error: "DB offline" });

  try {
    const pw = await getProfileAndWallet(user_id);
    if (!pw) return res.status(404).json({ ok: false, error: "User profile not found" });

    const { profile } = pw;

    const { data: targetPhoto } = await supabaseAdmin
      .from("profile_photos")
      .select("*")
      .eq("id", photo_id)
      .eq("user_id", profile.id)
      .eq("is_deleted", false)
      .maybeSingle();

    if (!targetPhoto) {
      return res.status(403).json({
        ok: false,
        error: "UNAUTHORIZED_OR_NOT_FOUND",
        message: "Picha hii haitambuliki kwenye historia yako ya picha.",
      });
    }

    if (targetPhoto.is_current) {
      return res.json({
        ok: true,
        avatar_url: targetPhoto.photo_url,
        message: "Tayari picha hii ndiyo inayotumika kama picha yako ya wasifu.",
      });
    }

    const nowIso = new Date().toISOString();

    await supabaseAdmin
      .from("profile_photos")
      .update({ is_current: false })
      .eq("user_id", profile.id);

    await supabaseAdmin
      .from("profile_photos")
      .update({ is_current: true, updated_at: nowIso })
      .eq("id", photo_id);

    await supabaseAdmin
      .from("profiles")
      .update({ avatar_url: targetPhoto.photo_url, last_profile_changed_at: nowIso })
      .eq("id", profile.id);

    await supabaseAdmin.from("profile_photo_transactions").insert({
      user_id: profile.id,
      photo_id: targetPhoto.id,
      action: "SWITCH_EXISTING",
      amount: 0,
      currency: "FBu",
      status: "SUCCESS",
      reference_id: `tx-photo-switch-${Date.now()}`,
    });

    return res.json({
      ok: true,
      avatar_url: targetPhoto.photo_url,
      photo_id: targetPhoto.id,
      last_profile_changed_at: nowIso,
      cooldown_active: false,
      remaining_ms: 0,
      next_allowed_at: null,
      message: "Picha ya wasifu imebadilishwa kikamilifu!",
    });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

// 4. Soft Delete Profile Photo (0 FBu, does NOT reset 24h cooldown)
app.post("/api/profile-photo/delete", async (req, res) => {
  const { user_id, photo_id } = req.body || {};
  if (!user_id || !photo_id) {
    return res.status(400).json({ ok: false, error: "Missing user_id or photo_id" });
  }
  if (!supabaseAdmin) return res.status(503).json({ ok: false, error: "DB offline" });

  try {
    const pw = await getProfileAndWallet(user_id);
    if (!pw) return res.status(404).json({ ok: false, error: "User profile not found" });

    const { profile } = pw;

    const { data: targetPhoto } = await supabaseAdmin
      .from("profile_photos")
      .select("*")
      .eq("id", photo_id)
      .eq("user_id", profile.id)
      .maybeSingle();

    if (!targetPhoto) {
      return res.status(403).json({
        ok: false,
        error: "UNAUTHORIZED_OR_NOT_FOUND",
        message: "Picha hii haijapatikana au si ya akaunti yako.",
      });
    }

    const wasCurrent = targetPhoto.is_current;

    await supabaseAdmin
      .from("profile_photos")
      .update({
        is_deleted: true,
        is_current: false,
        deleted_at: new Date().toISOString(),
      })
      .eq("id", photo_id);

    let nextAvatarUrl: string | null = null;

    if (wasCurrent) {
      const { data: remainingActive } = await supabaseAdmin
        .from("profile_photos")
        .select("*")
        .eq("user_id", profile.id)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(1);

      if (remainingActive && remainingActive.length > 0) {
        nextAvatarUrl = remainingActive[0].photo_url;
        await supabaseAdmin
          .from("profile_photos")
          .update({ is_current: true })
          .eq("id", remainingActive[0].id);
      }

      await supabaseAdmin
        .from("profiles")
        .update({ avatar_url: nextAvatarUrl })
        .eq("id", profile.id);
    }

    await supabaseAdmin.from("profile_photo_transactions").insert({
      user_id: profile.id,
      photo_id: targetPhoto.id,
      action: "DELETE_PHOTO",
      amount: 0,
      currency: "FBu",
      status: "SUCCESS",
      reference_id: `tx-photo-del-${Date.now()}`,
    });

    return res.json({
      ok: true,
      photo_id: targetPhoto.id,
      is_deleted: true,
      new_avatar_url: nextAvatarUrl,
      message: "Picha imeondolewa kikamilifu.",
    });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

// 5. Restore Soft-Deleted Profile Photo (0 FBu)
app.post("/api/profile-photo/restore", async (req, res) => {
  const { user_id, photo_id } = req.body || {};
  if (!user_id || !photo_id) {
    return res.status(400).json({ ok: false, error: "Missing user_id or photo_id" });
  }
  if (!supabaseAdmin) return res.status(503).json({ ok: false, error: "DB offline" });

  try {
    const pw = await getProfileAndWallet(user_id);
    if (!pw) return res.status(404).json({ ok: false, error: "User profile not found" });

    const { profile } = pw;

    const { data: targetPhoto } = await supabaseAdmin
      .from("profile_photos")
      .select("*")
      .eq("id", photo_id)
      .eq("user_id", profile.id)
      .eq("is_deleted", true)
      .maybeSingle();

    if (!targetPhoto) {
      return res.status(403).json({
        ok: false,
        error: "UNAUTHORIZED_OR_NOT_FOUND",
        message: "Picha hii haijapatikana kwenye picha zako zilizofutwa.",
      });
    }

    await supabaseAdmin
      .from("profile_photos")
      .update({
        is_deleted: false,
        restored_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", photo_id);

    await supabaseAdmin.from("profile_photo_transactions").insert({
      user_id: profile.id,
      photo_id: targetPhoto.id,
      action: "RESTORE_PHOTO",
      amount: 0,
      currency: "FBu",
      status: "SUCCESS",
      reference_id: `tx-photo-restore-${Date.now()}`,
    });

    return res.json({
      ok: true,
      photo_id: targetPhoto.id,
      is_deleted: false,
      message: "Picha imerejeshwa kwenye historia yako.",
    });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

app.get("/api/supabase/tipsters", async (req, res) => {
  if (!supabaseAdmin) return res.json([]);
  try {
    const exclude = req.query.exclude as string;
    let query = supabaseAdmin
      .from("profiles")
      .select("id, auth_user_id, username, first_name, last_name, avatar_url, is_pro, is_verified, role, created_at")
      .order("is_pro", { ascending: false })
      .order("is_verified", { ascending: false })
      .limit(100);

    if (exclude) query = query.neq("auth_user_id", exclude);
    const { data } = await query;
    res.json(data || []);
  } catch (err) {
    res.json([]);
  }
});

app.get("/api/supabase/search-profiles", async (req, res) => {
  const q = ((req.query.q as string) || "").trim();
  if (!q) return res.json([]);

  const defaultDioufProfile = {
    id: "p-diouf-68375032",
    auth_user_id: "auth-diouf-68375032",
    username: "diouf_maniga",
    first_name: "Diouf",
    last_name: "Maniga",
    avatar_url: null,
    is_pro: true,
    is_verified: true,
    role: "USER",
    phone: "68375032",
    created_at: new Date().toISOString(),
  };

  let results: any[] = [];
  if (supabaseAdmin) {
    try {
      const { data } = await supabaseAdmin
        .from("profiles")
        .select("id, auth_user_id, username, first_name, last_name, avatar_url, is_pro, is_verified, role, phone, created_at")
        .or(`username.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%,phone.ilike.%${q}%`)
        .limit(50);
      if (data && data.length > 0) {
        results = data;
      }
    } catch (err) {
      console.warn("[SERVER] search-profiles DB error:", err);
    }
  }

  // Ensure Diouf Maniga profile is present if searching for diouf / maniga / 68375032
  const lowerQ = q.toLowerCase();
  const isMatchDiouf =
    "diouf".includes(lowerQ) ||
    "maniga".includes(lowerQ) ||
    "diouf maniga".includes(lowerQ) ||
    "68375032".includes(lowerQ) ||
    lowerQ.includes("diouf") ||
    lowerQ.includes("maniga") ||
    lowerQ.includes("68375032");

  if (isMatchDiouf && !results.some((r) => r.username === "diouf_maniga" || r.id === "p-diouf-68375032")) {
    results.unshift(defaultDioufProfile);
  }

  res.json(results);
});

// Admin RPC API Wrappers
app.get("/api/admin/unregistered-senders", async (req, res) => {
  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin.rpc("admin_get_unregistered_senders");
      if (!error && Array.isArray(data) && data.length > 0) {
        return res.json({ ok: true, data });
      }
    } catch (e: any) {
      console.warn("[ADMIN] admin_get_unregistered_senders RPC error:", e?.message);
    }
  }

  // Return real database data or empty array if none found
  return res.json({
    ok: true,
    data: [],
  });
});

app.post("/api/admin/reconcile-unregistered-sender", async (req, res) => {
  const { phone_normalized, profile_id } = req.body || {};
  if (!phone_normalized || !profile_id) {
    return res.status(400).json({ ok: false, error: "Parameta za phone_normalized na profile_id zinahitajika." });
  }

  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin.rpc("admin_reconcile_unregistered_sender", {
        p_phone_normalized: phone_normalized,
        p_profile_id: profile_id,
      });
      if (!error && data) {
        return res.json(data);
      }
    } catch (e: any) {
      console.warn("[ADMIN] admin_reconcile_unregistered_sender RPC error:", e?.message);
    }
  }

  return res.status(500).json({
    ok: false,
    error: "Database haijaunganishwa au muamala haukupatikana.",
  });
});

app.post("/api/supabase/request-unlock", async (req, res) => {
  if (!supabaseAdmin) return res.status(503).json({ error: "DB offline" });
  try {
    const { unlocker_id, unlocked_id } = req.body;
    if (!unlocker_id || !unlocked_id) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    if (unlocker_id === unlocked_id) {
      return res.status(400).json({ error: "cannot_unlock_self", message: "Huwezi ku-unlock akaunti yako mwenyewe." });
    }

    // 1. Check if contract already exists between unlocker and unlocked
    const { data: existingContract } = await supabaseAdmin
      .from("unlock_contracts")
      .select("*")
      .eq("unlocker_id", unlocker_id)
      .eq("unlocked_id", unlocked_id)
      .in("status", ["active", "pending"])
      .maybeSingle();

    if (existingContract) {
      return res.status(200).json({ ok: true, record: existingContract, message: "Akaunti hii tayari imefunguliwa." });
    }

    // 2. Fetch unlocker's wallet
    let { data: unlockerWallet } = await supabaseAdmin
      .from("wallets")
      .select("*")
      .eq("profile_id", unlocker_id)
      .maybeSingle();

    if (!unlockerWallet) {
      const { data: newW } = await supabaseAdmin
        .from("wallets")
        .upsert({ profile_id: unlocker_id, balance: 0, reserved_balance: 0 }, { onConflict: "profile_id" })
        .select("*")
        .maybeSingle();
      unlockerWallet = newW;
    }

    const currentBal = Number(unlockerWallet?.balance || 0);
    const reservedBal = Number(unlockerWallet?.reserved_balance || 0);
    const availableBal = Math.max(0, currentBal - reservedBal);
    const UNLOCK_COST = 500; // Business rule: 500 FBU monthly unlock fee
    const TIPSTER_SHARE = 450; // Tipster receives 450 FBU

    // 3. Strict Check: Reject if balance is insufficient
    if (availableBal < UNLOCK_COST) {
      return res.status(400).json({
        error: "insufficient_balance",
        message: `Salio lako (FBU ${availableBal.toLocaleString()}) halitoshi ku-unlock akaunti hii. Unahitaji angalau FBU ${UNLOCK_COST}.`,
      });
    }

    // 4. Fetch unlocked user profile for notification & transaction logging
    const { data: unlockedProfile } = await supabaseAdmin
      .from("profiles")
      .select("username, full_name")
      .eq("id", unlocked_id)
      .maybeSingle();

    const { data: unlockerProfile } = await supabaseAdmin
      .from("profiles")
      .select("username, full_name")
      .eq("id", unlocker_id)
      .maybeSingle();

    const unlockedName = unlockedProfile?.username || unlockedProfile?.full_name || "Mchambuzi";
    const unlockerName = unlockerProfile?.username || unlockerProfile?.full_name || "Mtumiaji";

    // 5. Deduct 500 FBU from unlocker wallet
    const newUnlockerBal = currentBal - UNLOCK_COST;
    await supabaseAdmin
      .from("wallets")
      .update({ balance: newUnlockerBal, updated_at: new Date().toISOString() })
      .eq("profile_id", unlocker_id);

    // 6. Credit 450 FBU to unlocked tipster wallet
    let { data: tipsterWallet } = await supabaseAdmin
      .from("wallets")
      .select("*")
      .eq("profile_id", unlocked_id)
      .maybeSingle();

    if (!tipsterWallet) {
      const { data: createdTipsterW } = await supabaseAdmin
        .from("wallets")
        .upsert({ profile_id: unlocked_id, balance: 0, reserved_balance: 0 }, { onConflict: "profile_id" })
        .select("*")
        .maybeSingle();
      tipsterWallet = createdTipsterW;
    }

    const tipsterCurrentBal = Number(tipsterWallet?.balance || 0);
    await supabaseAdmin
      .from("wallets")
      .update({ balance: tipsterCurrentBal + TIPSTER_SHARE, updated_at: new Date().toISOString() })
      .eq("profile_id", unlocked_id);

    // 7. Record transaction for unlocker (Debit -500 FBU)
    try {
      await supabaseAdmin.from("wallet_transactions").insert({
        wallet_id: unlockerWallet?.id,
        profile_id: unlocker_id,
        type: "UNLOCK_PAYMENT",
        amount: -UNLOCK_COST,
        description: `Malipo ya ku-unlock akaunti ya @${unlockedName}`,
        created_at: new Date().toISOString(),
      });
    } catch (txErr) {
      console.warn("[request-unlock] wallet_transactions insert warn:", txErr);
    }

    // 8. Record transaction for tipster (Credit +450 FBU)
    try {
      await supabaseAdmin.from("wallet_transactions").insert({
        wallet_id: tipsterWallet?.id,
        profile_id: unlocked_id,
        type: "UNLOCK_EARNING",
        amount: TIPSTER_SHARE,
        description: `Mapato ya ku-unlock kutoka kwa @${unlockerName}`,
        created_at: new Date().toISOString(),
      });
    } catch (txErr) {
      console.warn("[request-unlock] tipster wallet_transactions insert warn:", txErr);
    }

    // 9. Create unlock_contract
    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from("unlock_contracts")
      .insert({
        unlocker_id,
        unlocked_id,
        status: "active",
        requested_at: new Date().toISOString(),
        accepted_at: new Date().toISOString(),
        last_charged_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertErr) return res.status(400).json({ error: insertErr.message });

    res.json({
      ok: true,
      record: inserted,
      new_unlocker_balance: newUnlockerBal - reservedBal,
    });
  } catch (e: any) {
    console.error("[request-unlock] error:", e);
    res.status(500).json({ error: e.message });
  }
});

// Helper function to guarantee Agent/Admin role for account with phone 68769887 in database
async function ensureAgentRoleFor68769887() {
  if (!supabaseAdmin) return;
  try {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update({ role: "ADMIN", is_verified: true })
      .or("phone.ilike.%68769887%,phone.eq.68769887,phone.eq.+25768769887,phone.eq.25768769887")
      .select("id, username, phone, role");

    if (error) {
      console.warn("[SERVER] ensureAgentRoleFor68769887 error:", error.message);
    } else if (data && data.length > 0) {
      console.log("[SERVER] Successfully set ADMIN role for account 68769887 in DB:", data);
    }
  } catch (err: any) {
    console.warn("[SERVER] ensureAgentRoleFor68769887 exception:", err?.message || err);
  }
}

// Helper function to guarantee ADMIN role for account amissi640 in database
async function ensureAdminRoleForAmissi640() {
  if (!supabaseAdmin) return;
  try {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update({ role: "ADMIN", is_verified: true })
      .or("username.ilike.%amissi640%,email.ilike.%amissi640%")
      .select("id, username, email, role");

    if (error) {
      console.warn("[SERVER] ensureAdminRoleForAmissi640 error:", error.message);
    } else if (data && data.length > 0) {
      console.log("[SERVER] Successfully set ADMIN role for amissi640 in DB:", data);
    }
  } catch (err: any) {
    console.warn("[SERVER] ensureAdminRoleForAmissi640 exception:", err?.message || err);
  }
}

app.get("/api/agent/sync-role", async (req, res) => {
  await ensureAgentRoleFor68769887();
  await ensureAdminRoleForAmissi640();
  res.json({ status: "ok", message: "Synced AGENT/ADMIN roles" });
});

app.get("/api/auth/profile-lookup", async (req, res) => {
  if (!supabaseAdmin) return res.json({ ok: false, profile: null, wallet: null });
  try {
    const queryId = ((req.query.id as string) || (req.query.auth_user_id as string) || "").trim();
    if (!queryId) return res.json({ ok: false, profile: null, wallet: null });

    let query = supabaseAdmin.from("profiles").select("*");
    
    // Check if queryId matches any identifier (id, auth_user_id, username, email, phone)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(queryId);
    if (isUuid) {
      query = query.or(`id.eq.${queryId},auth_user_id.eq.${queryId}`);
    } else {
      query = query.or(`email.eq.${queryId},username.eq.${queryId},phone.eq.${queryId}`);
    }

    const { data: profileData, error: profileErr } = await query.maybeSingle();

    if (profileErr) {
      console.warn("[profile-lookup] DB query error:", profileErr.message);
    }

    if (profileData) {
      if (profileData.phone && (profileData.phone.includes("68769887") || profileData.phone === "68769887")) {
        profileData.role = "ADMIN";
        profileData.is_verified = true;
        ensureAgentRoleFor68769887().catch(() => {});
      }
      if (
        (profileData.username && profileData.username.toLowerCase().includes("amissi640")) ||
        (profileData.email && profileData.email.toLowerCase().includes("amissi640"))
      ) {
        profileData.role = "ADMIN";
        profileData.is_verified = true;
        ensureAdminRoleForAmissi640().catch(() => {});
      }

      // 2. Fetch or initialize wallet for this profile directly in Supabase DB
      let { data: walletData } = await supabaseAdmin
        .from("wallets")
        .select("*")
        .eq("profile_id", profileData.id)
        .maybeSingle();

      if (!walletData) {
        const { data: newWallet } = await supabaseAdmin
          .from("wallets")
          .upsert({ profile_id: profileData.id, balance: 0, reserved_balance: 0 }, { onConflict: "profile_id" })
          .select("*")
          .maybeSingle();
        walletData = newWallet;
      }

      const balance = Number(walletData?.balance || 0);
      const reserved = Number(walletData?.reserved_balance || 0);
      const available = Math.max(0, balance - reserved);

      return res.json({
        ok: true,
        profile: profileData,
        wallet: {
          ...walletData,
          balance,
          reserved_balance: reserved,
          available_balance: available,
        },
      });
    }

    res.json({ ok: false, profile: null, wallet: null });
  } catch (err: any) {
    console.error("[profile-lookup] exception:", err);
    res.json({ ok: false, profile: null, wallet: null, error: err?.message || String(err) });
  }
});

// Endpoint to fetch active unlock contracts for a given user from DB
app.get("/api/supabase/user-contracts", async (req, res) => {
  if (!supabaseAdmin) return res.json({ ok: false, contracts: [] });
  try {
    const profileId = (req.query.profile_id as string) || (req.query.auth_user_id as string);
    if (!profileId) return res.json({ ok: false, contracts: [] });

    // Find profile first if auth_user_id passed
    let pId = profileId;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(profileId);
    
    const { data: pData } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .or(isUuid ? `id.eq.${profileId},auth_user_id.eq.${profileId}` : `email.eq.${profileId},username.eq.${profileId},phone.eq.${profileId}`)
      .maybeSingle();

    if (pData?.id) pId = pData.id;

    const { data: contracts, error } = await supabaseAdmin
      .from("unlock_contracts")
      .select("*")
      .eq("unlocker_id", pId)
      .in("status", ["active", "pending"]);

    if (error) {
      console.warn("[user-contracts] error:", error.message);
      return res.json({ ok: false, contracts: [] });
    }

    res.json({ ok: true, contracts: contracts || [] });
  } catch (err: any) {
    console.error("[user-contracts] exception:", err);
    res.json({ ok: false, contracts: [] });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Vite Middleware / Static File Serving Setup
// ─────────────────────────────────────────────────────────────────────────────
async function startServer() {
  // Sync Agent role for 68769887 and Admin role for amissi640 on start
  ensureAgentRoleFor68769887().catch(() => {});
  ensureAdminRoleForAmissi640().catch(() => {});

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[TakeTalon Server] Running on http://0.0.0.0:${PORT}`);
    console.log(`[SMS Forwarder Webhook] Active at http://0.0.0.0:${PORT}/api/sms-forwarder`);
  });
}

startServer();
