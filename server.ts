import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import crypto from "crypto";
import { hush } from "./src/lib/hush/presentation/hush-facade";
import { syncEspnCompetition, fetchEspnScoreboard, ESPN_LEAGUE_SLUGS } from "./src/lib/espnService";
import {
  getBasketballMatchesFromEspn,
  fetchEspnBasketballScoreboard,
  syncEspnBasketballToSupabase,
  ESPN_BASKETBALL_LEAGUES,
} from "./src/lib/espnBasketballService";
import {
  getTennisMatchesFromEspn,
  fetchEspnTennisScoreboard,
  syncEspnTennisToSupabase,
  ESPN_TENNIS_TOURS,
} from "./src/lib/espnTennisService";
import {
  getVolleyballMatchesFromEspn,
  ESPN_VOLLEYBALL_LEAGUES,
} from "./src/lib/espnVolleyballService";
import {
  getHockeyMatchesFromEspn,
  ESPN_HOCKEY_LEAGUES,
} from "./src/lib/espnHockeyService";
import {
  getRugbyMatchesFromEspn,
  ESPN_RUGBY_LEAGUES,
  DEFAULT_RUGBY_CODES,
} from "./src/lib/espnRugbyService";
import {
  getBaseballMatchesFromEspn,
  ESPN_BASEBALL_LEAGUES,
  DEFAULT_BASEBALL_CODES,
} from "./src/lib/espnBaseballService";
import {
  getCricketMatchesFromEspn,
  ESPN_CRICKET_LEAGUES,
  DEFAULT_CRICKET_CODES,
} from "./src/lib/espnCricketService";
import {
  getGolfTournamentsFromEspn,
  ESPN_GOLF_TOURS,
  DEFAULT_GOLF_CODES,
} from "./src/lib/espnGolfService";
import { getHandballMatchesFromEspn } from "./src/lib/espnHandballService";
import { getBoxingBoutsFromEspn } from "./src/lib/espnBoxingService";
import type { EspnGenericMatch } from "./src/lib/espnEventCore";
import { getLeagueLogoUrl } from "./src/lib/leagueLogos";

dotenv.config();

const app = express();
const PORT = 3000;


// ─────────────────────────────────────────────────────────────────────────────
// ESPN generic mappers (rugby, baseball, cricket, hockey, handball, golf, boxing)
// Every sport below is sourced from ESPN only.
// ─────────────────────────────────────────────────────────────────────────────
function espnMatchToGame(m: EspnGenericMatch, sportName: string, broadcastLabel: string) {
  const statusText = m.isLive
    ? m.shortDetail || m.summary || (m.statusDescription ? `LIVE - ${m.statusDescription}` : "LIVE")
    : m.status === "FINISHED"
    ? m.summary || m.shortDetail || "Final"
    : m.status;

  return {
    id: String(m.id),
    sport: sportName,
    league: m.competition.name,
    league_logo: m.competition.emblem,
    country: m.competition.country,
    league_id: m.competition.code.toLowerCase(),
    home: {
      name: m.homeTeam.name,
      short_name: m.homeTeam.shortName || m.homeTeam.tla,
      logo_url: m.homeTeam.crest,
      display_score: m.homeTeam.displayScore,
    },
    away: {
      name: m.awayTeam.name,
      short_name: m.awayTeam.shortName || m.awayTeam.tla,
      logo_url: m.awayTeam.crest,
      display_score: m.awayTeam.displayScore,
    },
    kickoff_utc: m.utcDate,
    status: statusText,
    status_description: m.statusDescription,
    display_clock: m.displayClock,
    short_detail: m.shortDetail,
    summary: m.summary,
    period: m.period,
    is_live: m.isLive,
    venue: m.venue,
    period_scores: m.score.periods,
    score:
      m.score.fullTime.home == null && m.score.fullTime.away == null
        ? null
        : { home: m.score.fullTime.home ?? 0, away: m.score.fullTime.away ?? 0 },
    broadcast: m.broadcast || broadcastLabel,
    has_odds: true,
    odds: m.odds,
  };
}


app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// ─────────────────────────────────────────────────────────────────────────────
// Supabase Backend Admin Client Initialization (Server-Side)
// ─────────────────────────────────────────────────────────────────────────────
const rawSupabaseUrl =
  (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").trim() ||
  "https://placeholder-project.supabase.co";

const supabaseUrl = rawSupabaseUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
const supabaseServiceKey =
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "").trim() ||
  "placeholder-key";

const isDbConfigured =
  supabaseUrl !== "https://placeholder-project.supabase.co" &&
  supabaseUrl.length > 0 &&
  supabaseServiceKey !== "placeholder-key" &&
  supabaseServiceKey.length > 0;

const supabaseAdmin = isDbConfigured
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

const AVIATOR_BETTING_MS = 10_000;
const AVIATOR_BUSTED_MS = 4_000;
let aviatorRoundNonce = 0;
let aviatorLoopStarted = false;

async function writeAviatorRoundState(patch: Record<string, any>) {
  if (!supabaseAdmin) return;
  try {
    const { error } = await supabaseAdmin
      .from("aviator_round_state")
      .upsert({ id: 1, updated_at: new Date().toISOString(), ...patch });
    if (error) throw error;
  } catch (e: any) {
    console.error("[Aviator] Imeshindwa kuandika round state:", e?.message || e);
  }
}

async function runAviatorBettingPhase() {
  aviatorRoundNonce += 1;
  await writeAviatorRoundState({
    round_id: crypto.randomUUID(),
    phase: "BETTING",
    phase_started_at: new Date().toISOString(),
    betting_duration_ms: AVIATOR_BETTING_MS,
    busted_duration_ms: AVIATOR_BUSTED_MS,
    crash_point: null,
    round_nonce: aviatorRoundNonce,
  });
  setTimeout(() => {
    runAviatorLaunchedPhase().catch((e) => console.error("[Aviator] LAUNCHED error:", e));
  }, AVIATOR_BETTING_MS);
}

async function runAviatorLaunchedPhase() {
  let crashPoint = 1.15;
  try {
    await hush.initialize();
    const outcome = await hush.generateNextOutcome();
    const generatedCrashPoint = Number(outcome.multiplier);
    if (Number.isFinite(generatedCrashPoint) && generatedCrashPoint >= 1) {
      crashPoint = parseFloat(generatedCrashPoint.toFixed(2));
    }
  } catch (e: any) {
    console.error("[Aviator] HUSH generation error, natumia fallback ya nasibu:", e?.message || e);
    crashPoint = parseFloat((1.05 + Math.random() * 5.0).toFixed(2));
  }

  // Never expose the crash point before the BUSTED phase.
  await writeAviatorRoundState({
    phase: "LAUNCHED",
    phase_started_at: new Date().toISOString(),
    crash_point: null,
  });

  const elapsedForCrash = Math.pow(Math.max(0, crashPoint - 1.0) / 0.08, 1 / 1.3);
  const launchDurationMs = Math.max(200, elapsedForCrash * 1000);

  setTimeout(() => {
    runAviatorBustedPhase(crashPoint).catch((e) => console.error("[Aviator] BUSTED error:", e));
  }, launchDurationMs);
}

async function runAviatorBustedPhase(crashPoint: number) {
  await writeAviatorRoundState({
    phase: "BUSTED",
    phase_started_at: new Date().toISOString(),
    crash_point: crashPoint,
  });
  setTimeout(() => {
    runAviatorBettingPhase().catch((e) => console.error("[Aviator] BETTING error:", e));
  }, AVIATOR_BUSTED_MS);
}

function startAviatorRoundLoop() {
  if (aviatorLoopStarted) return;
  aviatorLoopStarted = true;
  if (!supabaseAdmin) {
    console.warn("[Aviator] Supabase haijasanidiwa — live round engine haitaanza.");
    return;
  }
  console.log("[Aviator] Live round engine (24/7) inaanza...");
  runAviatorBettingPhase().catch((e) => console.error("[Aviator] Boot error:", e));
}

app.get("/api/aviator/round", async (_req, res) => {
  if (!supabaseAdmin) return res.status(503).json({ ok: false, message: "Database haijasanidiwa" });
  try {
    const { data, error } = await supabaseAdmin
      .from("aviator_round_state")
      .select("round_id, phase, phase_started_at, betting_duration_ms, busted_duration_ms, crash_point, round_nonce, updated_at")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw error;
    return res.json({ ok: true, round: data });
  } catch (e: any) {
    return res.status(500).json({ ok: false, message: e?.message || "Imeshindwa kupata round" });
  }
});

// In-Memory Fallback Audit Log Store
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
// SMS Regex Parser
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

  let extractedPhoneFromHeader = "";
  const headerPhoneMatch = body.match(/De\s*:\s*(\+?\d{8,15})/i) || body.match(/From\s*:\s*(\+?\d{8,15})/i);
  if (headerPhoneMatch) {
    extractedPhoneFromHeader = normalizePhone(headerPhoneMatch[1]);
  }

  // 1. Direct Subscriber Transfer format:
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

  // 5. General System Message
  const anyPhone = body.match(/(\+?257\d{8}|\b0?7[1-9]\d{7}\b|\b0?6[1-9]\d{7}\b)/);
  const detectedPhone = extractedPhoneFromHeader || (anyPhone ? normalizePhone(anyPhone[1]) : normalizePhone(rawSender || ""));

  return {
    phone: detectedPhone || normalizePhone(rawSender || ""),
    amount: 0,
    transactionCode: `MSG_${Date.now()}`,
    isValidFormat: false,
  };
}

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

const smsRateLimitMap = new Map<string, { count: number; resetTime: number }>();

function isSmsRateLimited(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000;
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
// API Endpoint: /api/sms-forwarder & /api/sms
// ─────────────────────────────────────────────────────────────────────────────
const handleSmsForwarder = async (req: Request, res: Response) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clientIp = (req.ip || req.headers["x-forwarded-for"] || "127.0.0.1").toString();
  const nowIso = new Date().toISOString();

  if (isSmsRateLimited(clientIp)) {
    console.warn(`[SMS-FORWARDER][${requestId}][429] Rate limit exceeded. IP: ${clientIp}, Timestamp: ${nowIso}`);
    return res.status(429).json({
      success: false,
      requestId,
      error: "Too Many Requests. Max 30 requests per minute.",
    });
  }

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
// API Endpoint: /api/sms-gateway (Audit Logs)
// ─────────────────────────────────────────────────────────────────────────────
app.get("/api/sms-gateway", async (req: Request, res: Response) => {
  if (supabaseAdmin) {
    try {
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

// ─────────────────────────────────────────────────────────────────────────────
// Health Check
// ─────────────────────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    app: "TakeTalon PRO",
    dbConnected: isDbConfigured,
    timestamp: new Date().toISOString(),
  });
});

// Unified Team Sports API Endpoints
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

app.get("/api/sports/status", (req, res) => {
  const apis = {
    football: {
      name: "Football Data (football-data.org)",
      configured: Boolean(process.env.FOOTBALL_DATA_API_KEY),
      sport: "football",
    },
    tennis: {
      name: "API Tennis (api-tennis.com / RapidAPI)",
      configured: Boolean(process.env.API_TENNIS_KEY),
      sport: "tennis",
    },
    basketball: {
      name: "Basketball API (api-sports / RapidAPI)",
      configured: Boolean(process.env.BASKETBALL_API_KEY),
      sport: "basketball",
    },
    golf: {
      name: "Open Golf API (RapidAPI)",
      configured: Boolean(process.env.OPEN_GOLF_API_KEY),
      sport: "golf",
    },
    highlights: {
      name: "Highlightly API (Video Highlights)",
      configured: Boolean(process.env.HIGHLIGHTLY_API_KEY),
      sport: "highlights",
    },
    brevo: {
      name: "Brevo (Transactional Email / SMS)",
      configured: Boolean(process.env.BREVO_API_KEY),
      service: "communication",
    },
  };

  const configuredCount = Object.values(apis).filter((a) => a.configured).length;
  const totalCount = Object.keys(apis).length;

  res.json({
    ok: true,
    status: configuredCount === totalCount ? "ALL_CONFIGURED" : "PARTIAL_CONFIGURED",
    configuredCount,
    totalCount,
    apis,
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/sports/:sport/games", async (req, res) => {
  const sportParam = (req.params.sport || "basketball").toLowerCase();
  const now = new Date();

  if (sportParam === "basketball") {
    try {
      const espnMatches = await getBasketballMatchesFromEspn([
        "NBA", "WNBA", "NCAAM", "NCAAW", "NBAG", "ACB", "LBA", "NBL", "NBB", "EURO", "FIBA", "OLYM"
      ]);

      if (espnMatches && espnMatches.length > 0) {
        const mapped = espnMatches.map((m) => ({
          id: String(m.id),
          sport: "Basketball",
          league: m.competition.name,
          league_logo: m.competition.emblem,
          country: m.competition.country,
          league_id: m.competition.code.toLowerCase(),
          home: {
            name: m.homeTeam.name,
            short_name: m.homeTeam.shortName || m.homeTeam.tla,
            logo_url: m.homeTeam.crest,
          },
          away: {
            name: m.awayTeam.name,
            short_name: m.awayTeam.shortName || m.awayTeam.tla,
            logo_url: m.awayTeam.crest,
          },
          kickoff_utc: m.utcDate,
          status: m.status,
          display_clock: m.clock,
          period: m.period,
          score: m.score.fullTime.home != null && m.score.fullTime.away != null
            ? { home: m.score.fullTime.home, away: m.score.fullTime.away }
            : null,
          broadcast: "ESPN",
          has_odds: true,
          odds: m.odds,
        }));
        return res.json({ games: mapped, source: "espn" });
      }
    } catch (e: any) {
      console.warn("[BASKETBALL-ESPN] Scoreboard fetch error:", e?.message);
    }

    const games = [
      {
        id: "nba-101",
        sport: "Basketball",
        league: "NBA",
        league_logo: "https://upload.wikimedia.org/wikipedia/en/0/03/National_Basketball_Association_logo.svg",
        country: "USA",
        league_id: "nba",
        home: { name: "Boston Celtics", short_name: "BOS", logo_url: "https://content.sportslogos.net/logos/6/213/thumbs/21367762024.gif" },
        away: { name: "Los Angeles Lakers", short_name: "LAL", logo_url: "https://content.sportslogos.net/logos/6/237/thumbs/23773242024.gif" },
        kickoff_utc: new Date(now.getTime() + 1800 * 1000).toISOString(),
        status: "LIVE (Q3)",
        score: { home: 84, away: 79 },
        broadcast: "ESPN",
        has_odds: true,
      },
      {
        id: "nba-102",
        sport: "Basketball",
        league: "NBA",
        league_logo: "https://upload.wikimedia.org/wikipedia/en/0/03/National_Basketball_Association_logo.svg",
        country: "USA",
        league_id: "nba",
        home: { name: "Golden State Warriors", short_name: "GSW", logo_url: "https://content.sportslogos.net/logos/6/235/thumbs/23531522020.gif" },
        away: { name: "Milwaukee Bucks", short_name: "MIL", logo_url: "https://content.sportslogos.net/logos/6/225/thumbs/22582752016.gif" },
        kickoff_utc: new Date(now.getTime() + 7200 * 1000).toISOString(),
        status: "SCHEDULED",
        score: null,
        broadcast: "TNT",
        has_odds: true,
      },
    ];

    return res.json({ games, source: "live_system" });
  }

  if (sportParam === "tennis") {
    try {
      const espnMatches = await getTennisMatchesFromEspn(["atp", "wta"]);
      if (espnMatches && espnMatches.length > 0) {
        const mapped = espnMatches.map((m) => {
          const p1Sets = m.score.sets.player1;
          const p2Sets = m.score.sets.player2;
          const setStr = m.score.setScores.length > 0 ? ` (${m.score.setScores.join(", ")})` : "";
          const statusText = m.isLive
            ? (m.shortDetail || (m.statusDescription ? `LIVE - ${m.statusDescription}` : `LIVE - Set ${m.period || m.score.currentSet || 1}`))
            : m.status === "FINISHED"
            ? (m.shortDetail || "Final")
            : m.status;

          return {
            id: String(m.id),
            sport: "Tennis",
            league: `${m.tournament.name}${m.round ? " — " + m.round : ""}`,
            league_logo: m.tournament.emblem,
            country: m.tournament.country,
            league_id: m.tournament.id.toLowerCase().replace(/\s+/g, "-"),
            home: {
              name: m.player1.name,
              short_name: m.player1.shortName,
              logo_url: m.player1.flagUrl || null,
            },
            away: {
              name: m.player2.name,
              short_name: m.player2.shortName,
              logo_url: m.player2.flagUrl || null,
            },
            kickoff_utc: m.utcDate,
            status: statusText,
            status_description: m.statusDescription,
            display_clock: m.displayClock,
            short_detail: m.shortDetail,
            period: m.period,
            cur_score: m.curScore,
            set_scores: m.score.setScores,
            score: { home: p1Sets, away: p2Sets },
            broadcast: "ESPN Tennis",
            has_odds: true,
            odds: {
              home: m.odds.home,
              away: m.odds.away,
              draw: 1.0,
            },
          };
        });
        return res.json({ games: mapped, source: "espn" });
      }
    } catch (e: any) {
      console.warn("[TENNIS-ESPN] Scoreboard fetch error:", e?.message);
    }

    const games = [
      {
        id: "tennis-101",
        sport: "Tennis",
        league: "US Open (Grand Slam)",
        league_logo: "https://a.espncdn.com/i/teamlogos/leagues/500/us-open.png",
        country: "USA",
        league_id: "us-open",
        home: { name: "Carlos Alcaraz", short_name: "ALC", logo_url: "https://a.espncdn.com/i/teamlogos/countries/500/esp.png" },
        away: { name: "Jannik Sinner", short_name: "SIN", logo_url: "https://a.espncdn.com/i/teamlogos/countries/500/ita.png" },
        kickoff_utc: new Date(now.getTime() + 1200 * 1000).toISOString(),
        status: "LIVE (Set 3)",
        score: { home: 2, away: 1 },
        broadcast: "ESPN Tennis",
        has_odds: true,
        odds: { home: 1.85, away: 1.95, draw: 1.0 },
      },
    ];

    return res.json({ games, source: "live_system" });
  }

  if (sportParam === "volleyball") {
    try {
      const espnMatches = await getVolleyballMatchesFromEspn(["NCAAWVB", "NCAAMVB"]);
      if (espnMatches && espnMatches.length > 0) {
        const mapped = espnMatches.map((m) => {
          const homeSets = m.score.sets.home;
          const awaySets = m.score.sets.away;
          const statusText = m.isLive
            ? (m.shortDetail || (m.statusDescription ? `LIVE - ${m.statusDescription}` : `LIVE - Set ${m.period || m.score.currentSet || 1}`))
            : m.status === "FINISHED"
            ? (m.shortDetail || "Final")
            : m.status;

          return {
            id: String(m.id),
            sport: "Volleyball",
            league: m.competition.name,
            league_logo: m.competition.emblem,
            country: m.competition.country,
            league_id: m.competition.code.toLowerCase(),
            home: {
              name: m.homeTeam.name,
              short_name: m.homeTeam.shortName || m.homeTeam.tla,
              logo_url: m.homeTeam.crest,
            },
            away: {
              name: m.awayTeam.name,
              short_name: m.awayTeam.shortName || m.awayTeam.tla,
              logo_url: m.awayTeam.crest,
            },
            kickoff_utc: m.utcDate,
            status: statusText,
            status_description: m.statusDescription,
            display_clock: m.displayClock,
            short_detail: m.shortDetail,
            period: m.period,
            cur_score: m.curScore,
            set_scores: m.score.setScores,
            score: { home: homeSets, away: awaySets },
            broadcast: "ESPN Volleyball",
            has_odds: true,
            odds: {
              home: m.odds.home,
              away: m.odds.away,
              draw: 1.0,
            },
          };
        });
        return res.json({ games: mapped, source: "espn" });
      }
    } catch (e: any) {
      console.warn("[VOLLEYBALL-ESPN] Scoreboard fetch error:", e?.message);
    }

    const games = [
      {
        id: "vb-101",
        sport: "Volleyball",
        league: "FIVB Volleyball Nations League",
        league_logo: "https://upload.wikimedia.org/wikipedia/en/e/e0/FIVB_logo.svg",
        country: "International",
        league_id: "fivb-vnl",
        home: { name: "Poland", short_name: "POL", logo_url: "https://a.espncdn.com/i/teamlogos/countries/500/pol.png" },
        away: { name: "Brazil", short_name: "BRA", logo_url: "https://a.espncdn.com/i/teamlogos/countries/500/bra.png" },
        kickoff_utc: new Date(now.getTime() + 1500 * 1000).toISOString(),
        status: "LIVE (Set 3)",
        score: { home: 1, away: 1 },
        set_scores: ["25-22", "21-25", "18-16"],
        short_detail: "Set 3 (18-16)",
        broadcast: "Volleyball World TV",
        has_odds: true,
        odds: { home: 1.68, away: 2.15, draw: 1.0 },
      },
      {
        id: "vb-102",
        sport: "Volleyball",
        league: "CEV Champions League",
        league_logo: "https://upload.wikimedia.org/wikipedia/en/e/e0/FIVB_logo.svg",
        country: "Europe",
        league_id: "cev-cl",
        home: { name: "Trentino Volley", short_name: "TRE", logo_url: "https://a.espncdn.com/i/teamlogos/countries/500/ita.png" },
        away: { name: "Jastrzębski Węgiel", short_name: "JAS", logo_url: "https://a.espncdn.com/i/teamlogos/countries/500/pol.png" },
        kickoff_utc: new Date(now.getTime() + 7200 * 1000).toISOString(),
        status: "SCHEDULED",
        score: null,
        broadcast: "EuroVolley TV",
        has_odds: true,
        odds: { home: 1.82, away: 1.98, draw: 1.0 },
      },
    ];

    return res.json({ games, source: "live_system" });
  }

  const ESPN_TEAM_SPORTS: Record<
    string,
    { label: string; broadcast: string; load: () => Promise<EspnGenericMatch[]> }
  > = {
    hockey: {
      label: "Ice Hockey",
      broadcast: "ESPN Hockey",
      load: () => getHockeyMatchesFromEspn() as unknown as Promise<EspnGenericMatch[]>,
    },
    icehockey: {
      label: "Ice Hockey",
      broadcast: "ESPN Hockey",
      load: () => getHockeyMatchesFromEspn() as unknown as Promise<EspnGenericMatch[]>,
    },
    rugby: { label: "Rugby", broadcast: "ESPN Rugby", load: () => getRugbyMatchesFromEspn() },
    baseball: { label: "Baseball", broadcast: "ESPN Baseball", load: () => getBaseballMatchesFromEspn() },
    cricket: { label: "Cricket", broadcast: "ESPN Cricinfo", load: () => getCricketMatchesFromEspn() },
  };

  const espnTeamSport = ESPN_TEAM_SPORTS[sportParam];
  if (espnTeamSport) {
    try {
      const matches = await espnTeamSport.load();
      return res.json({
        games: matches.map((m) => espnMatchToGame(m, espnTeamSport.label, espnTeamSport.broadcast)),
        source: "espn",
      });
    } catch (e: any) {
      console.warn(`[${sportParam.toUpperCase()}-ESPN] Scoreboard fetch error:`, e?.message);
      return res.json({ games: [], source: "espn", error: e?.message || String(e) });
    }
  }

  if (sportParam === "handball") {
    const feed = await getHandballMatchesFromEspn();
    return res.json({
      games: feed.matches.map((m) => espnMatchToGame(m, "Handball", "ESPN")),
      source: "espn",
      available: feed.available,
      note: feed.reason,
    });
  }

  if (sportParam === "boxing") {
    const feed = await getBoxingBoutsFromEspn();
    return res.json({
      games: feed.bouts.map((b) => ({
        id: b.id,
        sport: "Boxing",
        league: b.event,
        league_logo: null,
        country: "International",
        league_id: "espn-boxing",
        home: { name: b.fighterA.name, short_name: b.fighterA.name, logo_url: b.fighterA.flag || null },
        away: { name: b.fighterB.name, short_name: b.fighterB.name, logo_url: b.fighterB.flag || null },
        kickoff_utc: b.utcDate,
        status: b.isLive ? b.shortDetail || `Round ${b.round}` : b.status,
        period: b.round,
        is_live: b.isLive,
        score: null,
        broadcast: "ESPN",
        has_odds: true,
        odds: b.odds,
      })),
      source: "espn",
      available: feed.available,
      note: feed.reason,
    });
  }

  if (sportParam === "golf") {
    try {
      const tournaments = await getGolfTournamentsFromEspn();
      return res.json({
        games: tournaments.map((t) => {
          const leader = t.leaderboard && t.leaderboard.length > 0 ? t.leaderboard[0] : null;
          const runnerUp = t.leaderboard && t.leaderboard.length > 1 ? t.leaderboard[1] : null;
          return {
            id: t.id,
            sport: "Golf",
            league: t.tour.name,
            league_logo: t.tour.emblem,
            country: t.tour.country,
            league_id: t.tour.code.toLowerCase(),
            name: t.name,
            course: t.course,
            home: {
              name: leader ? leader.name : (t.name || "Tournament Leader"),
              short_name: leader ? (leader.shortName || leader.name.slice(0, 3).toUpperCase()) : "LDR",
              logo_url: null,
            },
            away: {
              name: runnerUp ? runnerUp.name : (t.course || "Field"),
              short_name: runnerUp ? (runnerUp.shortName || runnerUp.name.slice(0, 3).toUpperCase()) : "FLD",
              logo_url: null,
            },
            kickoff_utc: t.startDate,
            end_utc: t.endDate,
            status: t.isLive ? t.shortDetail || `Round ${t.round}` : t.status,
            short_detail: t.shortDetail,
            period: t.round,
            is_live: t.isLive,
            score: null,
            broadcast: t.broadcast || "ESPN Golf",
            has_odds: true,
            leaderboard: t.leaderboard.slice(0, 20),
          };
        }),
        source: "espn",
      });
    } catch (e: any) {
      console.warn("[GOLF-ESPN] Leaderboard fetch error:", e?.message);
      return res.json({ games: [], source: "espn", error: e?.message || String(e) });
    }
  }

  const defaultSportName = sportParam.charAt(0).toUpperCase() + sportParam.slice(1);
  const genericGames = [
    {
      id: `${sportParam}-101`,
      sport: defaultSportName,
      league: `World ${defaultSportName} League`,
      league_logo: null,
      country: "International",
      league_id: `${sportParam}-world`,
      home: { name: "Team Alpha", short_name: "ALP", logo_url: null },
      away: { name: "Team Beta", short_name: "BET", logo_url: null },
      kickoff_utc: new Date(now.getTime() + 3600 * 1000).toISOString(),
      status: "SCHEDULED",
      score: null,
      broadcast: "TakeTalon Stream",
      has_odds: true,
    },
  ];

  return res.json({ games: genericGames, source: "live_system" });
});

app.get("/api/sports/football/fixtures", async (req, res) => {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      ok: false,
      error: "FOOTBALL_DATA_API_KEY not configured in environment.",
    });
  }

  try {
    const competition = (req.query.competition as string) || "PL";
    const response = await fetch(`https://api.football-data.org/v4/competitions/${competition}/matches?status=SCHEDULED,LIVE,IN_PLAY,PAUSED`, {
      headers: { "X-Auth-Token": apiKey },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ ok: false, error: errorText });
    }

    const data = await response.json();
    return res.json({ ok: true, sport: "football", data });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message || String(err) });
  }
});

app.get("/api/tennis/competitions", (req, res) => {
  res.json({
    ok: true,
    provider: "espn",
    competitions: Object.values(ESPN_TENNIS_TOURS),
  });
});

app.get("/api/tennis/matches", async (req, res) => {
  try {
    const rawTours = req.query.tours as string | undefined;
    const tours = rawTours
      ? rawTours.split(",").map((t) => t.trim().toLowerCase())
      : ["atp", "wta"];

    const statusFilter = req.query.status as string | undefined;
    const matches = await getTennisMatchesFromEspn(tours);

    let filtered = matches;
    if (statusFilter) {
      const sf = statusFilter.toUpperCase();
      filtered = matches.filter((m) => {
        if (sf === "LIVE" || sf === "IN_PLAY") return m.isLive;
        if (sf === "SCHEDULED") return m.status === "SCHEDULED";
        if (sf === "FINISHED") return m.status === "FINISHED";
        return m.status === sf;
      });
    }

    return res.json({
      ok: true,
      provider: "espn",
      count: filtered.length,
      matches: filtered,
    });
  } catch (err: any) {
    console.error("[API-Tennis] Error fetching matches:", err);
    return res.status(500).json({ ok: false, error: err.message || "Failed to fetch tennis matches" });
  }
});

app.post("/api/tennis/sync", async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(503).json({ ok: false, error: "Database not configured for tennis sync." });
  }

  const tour = ((req.body?.tour as string | undefined)?.toLowerCase() || "atp") as "atp" | "wta";
  try {
    const result = await syncEspnTennisToSupabase(supabaseAdmin, tour);
    return res.json({ ok: true, provider: "espn", result });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/api/sports/tennis/fixtures", async (req, res) => {
  try {
    const matches = await getTennisMatchesFromEspn(["atp", "wta"]);
    return res.json({ ok: true, sport: "tennis", provider: "espn", matches });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message || String(err) });
  }
});

app.get("/api/basketball/competitions", (req, res) => {
  res.json({
    ok: true,
    provider: "espn",
    competitions: Object.values(ESPN_BASKETBALL_LEAGUES),
  });
});

app.get("/api/basketball/matches", async (req, res) => {
  try {
    const rawComps = req.query.competitions as string | undefined;
    const codes = rawComps
      ? rawComps.split(",").map((c) => c.trim().toUpperCase())
      : ["NBA", "WNBA", "NCAAM", "ACB", "LBA", "NBL", "NBB", "EURO", "FIBA"];

    const statusFilter = req.query.status as string | undefined;
    const matches = await getBasketballMatchesFromEspn(codes);

    let filtered = matches;
    if (statusFilter) {
      const sf = statusFilter.toUpperCase();
      filtered = matches.filter((m) => {
        if (sf === "LIVE" || sf === "IN_PLAY") return m.isLive;
        if (sf === "SCHEDULED") return m.status === "SCHEDULED";
        if (sf === "FINISHED") return m.status === "FINISHED";
        return m.status === sf;
      });
    }

    return res.json({
      ok: true,
      provider: "espn",
      count: filtered.length,
      matches: filtered,
    });
  } catch (err: any) {
    console.error("[API-Basketball] Error fetching matches:", err);
    return res.status(500).json({ ok: false, error: err.message || "Failed to fetch basketball matches" });
  }
});

app.post("/api/basketball/sync", async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(503).json({ ok: false, error: "Database not configured for basketball sync." });
  }

  const code = (req.body?.code as string | undefined)?.toUpperCase() || "NBA";
  try {
    const result = await syncEspnBasketballToSupabase(supabaseAdmin, code);
    return res.json({ ok: true, provider: "espn", result });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/api/sports/basketball/fixtures", async (req, res) => {
  try {
    const matches = await getBasketballMatchesFromEspn(["NBA", "WNBA", "NCAAM", "ACB", "LBA", "NBL", "EURO", "FIBA"]);
    return res.json({ ok: true, sport: "basketball", provider: "espn", matches });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message || String(err) });
  }
});

app.get("/api/volleyball/competitions", (req, res) => {
  res.json({
    ok: true,
    provider: "espn",
    competitions: Object.values(ESPN_VOLLEYBALL_LEAGUES),
  });
});

app.get("/api/volleyball/matches", async (req, res) => {
  try {
    const matches = await getVolleyballMatchesFromEspn(["NCAAWVB", "NCAAMVB"]);
    return res.json({
      ok: true,
      provider: "espn",
      count: matches.length,
      matches,
    });
  } catch (err: any) {
    console.error("[API-Volleyball] Error fetching matches:", err);
    return res.status(500).json({ ok: false, error: err.message || "Failed to fetch volleyball matches" });
  }
});

app.get("/api/sports/volleyball/fixtures", async (req, res) => {
  try {
    const matches = await getVolleyballMatchesFromEspn(["NCAAWVB", "NCAAMVB"]);
    return res.json({ ok: true, sport: "volleyball", provider: "espn", matches });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message || String(err) });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ESPN sport endpoints: hockey, rugby, baseball, cricket, golf, handball, boxing
// ─────────────────────────────────────────────────────────────────────────────
const ESPN_SPORT_ENDPOINTS: Record<
  string,
  { competitions: Record<string, any>; load: (codes: string[]) => Promise<any[]> }
> = {
  hockey: {
    competitions: ESPN_HOCKEY_LEAGUES,
    load: (codes) => getHockeyMatchesFromEspn(codes.length ? codes : undefined) as unknown as Promise<any[]>,
  },
  rugby: {
    competitions: ESPN_RUGBY_LEAGUES,
    load: (codes) => getRugbyMatchesFromEspn(codes.length ? codes : DEFAULT_RUGBY_CODES),
  },
  baseball: {
    competitions: ESPN_BASEBALL_LEAGUES,
    load: (codes) => getBaseballMatchesFromEspn(codes.length ? codes : DEFAULT_BASEBALL_CODES),
  },
  cricket: {
    competitions: ESPN_CRICKET_LEAGUES,
    load: (codes) => getCricketMatchesFromEspn(codes.length ? codes : DEFAULT_CRICKET_CODES),
  },
};

function parseCodes(raw: unknown): string[] {
  if (typeof raw !== "string" || raw.trim() === "") return [];
  return raw.split(",").map((c) => c.trim()).filter(Boolean);
}

app.get("/api/sports/:sport/competitions", (req, res, next) => {
  const sport = (req.params.sport || "").toLowerCase();
  const entry = ESPN_SPORT_ENDPOINTS[sport];
  if (!entry) return next();
  return res.json({ ok: true, sport, provider: "espn", competitions: Object.values(entry.competitions) });
});

app.get("/api/sports/:sport/fixtures", async (req, res, next) => {
  const sport = (req.params.sport || "").toLowerCase();
  const entry = ESPN_SPORT_ENDPOINTS[sport];
  if (!entry) return next();

  try {
    const matches = await entry.load(parseCodes(req.query.competitions));
    return res.json({ ok: true, sport, provider: "espn", count: matches.length, matches });
  } catch (err: any) {
    console.error(`[API-${sport}] Error fetching fixtures:`, err);
    return res.status(500).json({ ok: false, error: err.message || String(err) });
  }
});

app.get("/api/golf/tours", (req, res) => {
  res.json({ ok: true, provider: "espn", tours: Object.values(ESPN_GOLF_TOURS) });
});

app.get("/api/sports/golf/leaderboards", async (req, res) => {
  try {
    const codes = parseCodes(req.query.tours);
    const tournaments = await getGolfTournamentsFromEspn(codes.length ? codes : DEFAULT_GOLF_CODES);
    return res.json({ ok: true, sport: "golf", provider: "espn", count: tournaments.length, tournaments });
  } catch (err: any) {
    console.error("[API-Golf] Error fetching leaderboards:", err);
    return res.status(500).json({ ok: false, error: err.message || String(err) });
  }
});

app.get("/api/sports/handball/fixtures", async (req, res) => {
  const feed = await getHandballMatchesFromEspn();
  return res.json({
    ok: true,
    sport: "handball",
    provider: "espn",
    available: feed.available,
    note: feed.reason,
    count: feed.matches.length,
    matches: feed.matches,
  });
});

app.get("/api/sports/boxing/fixtures", async (req, res) => {
  const feed = await getBoxingBoutsFromEspn();
  return res.json({
    ok: true,
    sport: "boxing",
    provider: "espn",
    available: feed.available,
    note: feed.reason,
    count: feed.bouts.length,
    bouts: feed.bouts,
  });
});

app.get("/api/sports/golf/tournaments", async (req, res) => {
  const apiKey = process.env.OPEN_GOLF_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      ok: false,
      error: "OPEN_GOLF_API_KEY not configured in environment.",
    });
  }

  try {
    const response = await fetch("https://live-golf-data.p.rapidapi.com/schedule", {
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": "live-golf-data.p.rapidapi.com",
      },
    });

    if (!response.ok) {
      return res.json({ ok: true, sport: "golf", tournaments: [], note: "Schedule query returned status " + response.status });
    }

    const data = await response.json();
    return res.json({ ok: true, sport: "golf", data });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message || String(err) });
  }
});

app.get("/api/sports/highlights", async (req, res) => {
  const apiKey = process.env.HIGHLIGHTLY_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      ok: false,
      error: "HIGHLIGHTLY_API_KEY not configured in environment.",
    });
  }

  try {
    const sport = (req.query.sport as string) || "football";
    const response = await fetch(`https://sport-highlights-api.p.rapidapi.com/highlights?sport=${sport}`, {
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": "sport-highlights-api.p.rapidapi.com",
      },
    });

    if (!response.ok) {
      return res.json({ ok: true, sport, highlights: [], note: "Highlights query returned status " + response.status });
    }

    const data = await response.json();
    return res.json({ ok: true, sport, data });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message || String(err) });
  }
});

app.post("/api/communication/send-email", async (req, res) => {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      ok: false,
      error: "BREVO_API_KEY not configured in environment.",
    });
  }

  const { toEmail, toName, subject, htmlContent } = req.body;
  if (!toEmail || !subject || !htmlContent) {
    return res.status(400).json({ ok: false, error: "Missing required fields: toEmail, subject, htmlContent" });
  }

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: "TakeTalon PRO", email: "support@taketalon.com" },
        to: [{ email: toEmail, name: toName || toEmail }],
        subject,
        htmlContent,
      }),
    });

    const data = await response.json();
    return res.json({ ok: response.ok, data });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message || String(err) });
  }
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

const FOOTBALL_LIVE_STATUSES = new Set(["IN_PLAY", "PAUSED", "LIVE"]);

function parseDisplayClockMinute(displayClock: string | null): number | null {
  if (!displayClock) return null;
  const m = displayClock.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

async function resolveCompetitionForRead(code: string): Promise<{ id: string; provider: string; name: string; emblem_url: string | null } | null> {
  if (!supabaseAdmin) return null;
  const { data: comps } = await supabaseAdmin
    .from("football_competitions")
    .select("id, provider, name, emblem_url")
    .eq("code", code);

  if (!comps || comps.length === 0) return null;

  const espnComp = comps.find((c: any) => c.provider === "espn");
  const fdComp = comps.find((c: any) => c.provider === "football-data.org");

  if (espnComp) {
    const { count } = await supabaseAdmin
      .from("football_fixtures")
      .select("id", { count: "exact", head: true })
      .eq("competition_id", espnComp.id);
    if ((count || 0) > 0) return espnComp;
  }

  return fdComp || espnComp || null;
}

async function getMatchesForCode(
  code: string,
  opts: { dateFrom?: string; dateTo?: string; status?: string } = {}
): Promise<{ matches: any[]; source: string }> {
  if (!supabaseAdmin) return { matches: [], source: "empty" };

  let liveClocks: Record<number, string> = {};
  let espnSyncOk = false;
  if (ESPN_LEAGUE_SLUGS[code]) {
    try {
      const result = await syncEspnCompetition(supabaseAdmin, code);
      liveClocks = result.liveClocks;
      espnSyncOk = true;
    } catch (e: any) {
      console.warn(`[football] ESPN sync failed for ${code}, falling back to cached data:`, e?.message);
    }
  }

  const comp = await resolveCompetitionForRead(code);
  if (!comp) return { matches: [], source: "empty" };

  let query = supabaseAdmin
    .from("football_fixtures")
    .select(
      `
        external_id, utc_kickoff, status, home_score, away_score, winner, matchday, provider,
        odds_home, odds_draw, odds_away, odds_model, odds_updated_at, current_minute, betting_suspended_until,
        home_team:football_teams!football_fixtures_home_team_id_fkey ( external_id, name, short_name, tla, crest_url ),
        away_team:football_teams!football_fixtures_away_team_id_fkey ( external_id, name, short_name, tla, crest_url )
      `
    )
    .eq("competition_id", comp.id)
    .order("utc_kickoff", { ascending: true })
    .limit(200);

  if (opts.dateFrom) query = query.gte("utc_kickoff", opts.dateFrom);
  if (opts.dateTo) query = query.lte("utc_kickoff", opts.dateTo);
  if (opts.status) query = query.eq("status", opts.status.toUpperCase());

  const { data: rows, error } = await query;
  if (error || !rows) return { matches: [], source: "empty" };

  const matches = rows.map((r: any) => {
    const isLive = FOOTBALL_LIVE_STATUSES.has(r.status);
    const displayClock = isLive ? (liveClocks[r.external_id] ?? null) : null;
    const dbOdds =
      r.odds_home != null && r.odds_draw != null && r.odds_away != null
        ? {
            home: Number(r.odds_home),
            draw: Number(r.odds_draw),
            away: Number(r.odds_away),
          }
        : undefined;

    return {
      id: r.external_id,
      utcDate: r.utc_kickoff,
      status: r.status,
      minute: isLive ? (r.current_minute ?? parseDisplayClockMinute(displayClock)) : null,
      displayClock: isLive ? displayClock : null,
      bettingSuspendedUntil: r.betting_suspended_until ?? null,
      matchday: r.matchday ?? null,
      competition: {
        id: 0,
        name: comp.name,
        code,
        emblem: getLeagueLogoUrl(code) || comp.emblem_url || "",
      },
      homeTeam: {
        id: r.home_team?.external_id ?? 0,
        name: r.home_team?.name ?? "Home Team",
        shortName: r.home_team?.short_name || r.home_team?.name || "Home",
        tla: r.home_team?.tla || "HOM",
        crest: r.home_team?.crest_url || "",
      },
      awayTeam: {
        id: r.away_team?.external_id ?? 0,
        name: r.away_team?.name ?? "Away Team",
        shortName: r.away_team?.short_name || r.away_team?.name || "Away",
        tla: r.away_team?.tla || "AWY",
        crest: r.away_team?.crest_url || "",
      },
      score: {
        winner: r.winner,
        fullTime: { home: r.home_score, away: r.away_score },
        halfTime: { home: null, away: null },
      },
      odds: dbOdds,
      odds_model: r.odds_model ?? null,
      odds_updated_at: r.odds_updated_at ?? null,
    };
  });

  const source = comp.provider === "espn" ? (espnSyncOk ? "espn" : "cache") : "cache";
  return { matches, source };
}

app.get("/api/football/matches", async (req, res) => {
  const codesParam = (req.query.competitions as string) || "";
  const codes = codesParam.split(",").map((c) => c.trim().toUpperCase()).filter(Boolean);

  if (codes.length === 0) {
    return res.json({ matches: [], source: "empty" });
  }

  const dateFrom = req.query.dateFrom as string | undefined;
  const dateTo = req.query.dateTo as string | undefined;

  const results = await Promise.all(
    codes.map((code) =>
      getMatchesForCode(code, { dateFrom, dateTo }).catch(() => ({ matches: [], source: "empty" }))
    )
  );

  const matches = results.flatMap((r) => r.matches);
  const anyLive = results.some((r) => r.source === "espn");
  const source = matches.length === 0 ? "empty" : anyLive ? "espn" : "cache";

  res.json({ matches, source });
});

app.get("/api/football/competitions/:code/matches", async (req, res) => {
  const code = (req.params.code || "").toUpperCase();
  const status = req.query.status as string | undefined;
  const result = await getMatchesForCode(code, { status }).catch(() => ({
    matches: [],
    source: "empty",
  }));
  res.json(result);
});

app.get("/api/football/competitions/:code/standings", async (req, res) => {
  const code = (req.params.code || "").toUpperCase();
  if (!supabaseAdmin) return res.json({ standings: [], source: "empty" });

  try {
    const { data: comps } = await supabaseAdmin
      .from("football_competitions")
      .select("id, provider")
      .eq("code", code);

    if (!comps || comps.length === 0) return res.json({ standings: [], source: "empty" });

    let chosenCompId: string | null = null;
    for (const c of comps) {
      const { count } = await supabaseAdmin
        .from("football_standings")
        .select("id", { count: "exact", head: true })
        .eq("competition_id", c.id);
      if ((count || 0) > 0) {
        chosenCompId = c.id;
        break;
      }
    }

    if (!chosenCompId) return res.json({ standings: [], source: "empty" });

    const { data: rows, error } = await supabaseAdmin
      .from("football_standings")
      .select(
        `
          position, played, won, draw, lost, points, goals_for, goals_against, goal_difference, form, season,
          team:football_teams!football_standings_team_id_fkey ( id, external_id, name, short_name, tla, crest_url, logo_storage_path )
        `
      )
      .eq("competition_id", chosenCompId)
      .order("position", { ascending: true });

    if (error || !rows) return res.json({ standings: [], source: "empty" });

    const standings = rows.map((r: any) => ({
      position: r.position,
      played: r.played,
      won: r.won,
      draw: r.draw,
      lost: r.lost,
      points: r.points,
      goals_for: r.goals_for,
      goals_against: r.goals_against,
      goal_difference: r.goal_difference,
      form: r.form,
      season: r.season,
      team: {
        id: r.team?.id,
        external_id: String(r.team?.external_id ?? ""),
        name: r.team?.name,
        short_name: r.team?.short_name,
        tla: r.team?.tla,
        crest_url: r.team?.crest_url,
        logo_storage_path: r.team?.logo_storage_path,
      },
    }));

    res.json({ standings, source: "cache" });
  } catch (e: any) {
    console.warn("[football] standings error:", e?.message);
    res.json({ standings: [], source: "empty" });
  }
});

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
    // ignore
  }

  const balance = Number(wallet?.balance || 0);
  const reserved = Number(wallet?.reserved_balance || 0);
  const available = Math.max(0, balance - reserved);

  return { profile, wallet, availableBalance: available };
}

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

          try {
            const matches = base64Data.match(/^data:(image\/\w+);base64,(.+)$/);
            const mimeType = matches ? matches[1] : "image/jpeg";
            const rawBase64 = matches ? matches[2] : base64Data.replace(/^data:image\/\w+;base64,/, "");
            const imageBuffer = Buffer.from(rawBase64, "base64");
            const ext = mimeType.split("/")[1] || "jpg";
            const storagePath = `avatars/${profileId}/${Date.now()}.${ext}`;
            const bucketName = "avatars";

            try {
              await supabaseAdmin.storage.createBucket(bucketName, { public: true });
            } catch (e) {
              // ignore
            }

            const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
              .from(bucketName)
              .upload(storagePath, imageBuffer, {
                contentType: mimeType,
                upsert: true,
              });

            if (!uploadError && uploadData?.path) {
              const { data: publicUrlData } = supabaseAdmin.storage.from(bucketName).getPublicUrl(storagePath);
              if (publicUrlData?.publicUrl) {
                finalPublicAvatarUrl = publicUrlData.publicUrl;
              }
            } else if (uploadError) {
              console.warn("[PROFILE_PHOTO_STORAGE] Storage upload warning, fallback to URL:", uploadError);
            }
          } catch (storageErr) {
            console.warn("[PROFILE_PHOTO_STORAGE] Storage process error:", storageErr);
          }

          try {
            await supabaseAdmin.from("profile_photos").update({ is_current: false }).eq("user_id", profileId);
          } catch (e) {
            // ignore
          }

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
            // ignore
          }

          try {
            await supabaseAdmin
              .from("profiles")
              .update({ avatar_url: finalPublicAvatarUrl, last_profile_changed_at: nowIso })
              .eq("id", profileId);
          } catch (e) {
            console.warn("[PROFILE_PHOTO_UPLOAD] Failed to update avatar_url in profiles table:", e);
          }

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
            // ignore
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
    await supabaseAdmin.from("profile_photos").update({ is_current: false }).eq("user_id", profile.id);
    await supabaseAdmin.from("profile_photos").update({ is_current: true, updated_at: nowIso }).eq("id", photo_id);
    await supabaseAdmin.from("profiles").update({ avatar_url: targetPhoto.photo_url, last_profile_changed_at: nowIso }).eq("id", profile.id);

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
    await supabaseAdmin.from("profile_photos").update({
      is_deleted: true,
      is_current: false,
      deleted_at: new Date().toISOString(),
    }).eq("id", photo_id);

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
        await supabaseAdmin.from("profile_photos").update({ is_current: true }).eq("id", remainingActive[0].id);
      }
      await supabaseAdmin.from("profiles").update({ avatar_url: nextAvatarUrl }).eq("id", profile.id);
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

    await supabaseAdmin.from("profile_photos").update({
      is_deleted: false,
      restored_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", photo_id);

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
    const exclude = req.query.exclude as string | undefined;
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
  return res.json({ ok: true, data: [] });
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

    const UNLOCK_COST = 500;
    const TIPSTER_SHARE = 450;

    if (availableBal < UNLOCK_COST) {
      return res.status(400).json({
        error: "insufficient_balance",
        message: `Salio lako (FBU ${availableBal.toLocaleString()}) halitoshi ku-unlock akaunti hii. Unahitaji angalau FBU ${UNLOCK_COST}.`,
      });
    }

    const { data: unlockedProfile } = await supabaseAdmin.from("profiles").select("username, full_name").eq("id", unlocked_id).maybeSingle();
    const { data: unlockerProfile } = await supabaseAdmin.from("profiles").select("username, full_name").eq("id", unlocker_id).maybeSingle();
    const unlockedName = unlockedProfile?.username || unlockedProfile?.full_name || "Mchambuzi";
    const unlockerName = unlockerProfile?.username || unlockerProfile?.full_name || "Mtumiaji";

    const newUnlockerBal = currentBal - UNLOCK_COST;
    await supabaseAdmin
      .from("wallets")
      .update({ balance: newUnlockerBal, updated_at: new Date().toISOString() })
      .eq("profile_id", unlocker_id);

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

// ─────────────────────────────────────────────────────────────────────────────
// OTP & Authentication Endpoints
// ─────────────────────────────────────────────────────────────────────────────
interface OtpRecord {
  otp: string;
  email: string;
  firstName?: string;
  expiresAt: number;
  attemptsLeft: number;
  lastSentAt: number;
  resendCount: number;
  verified: boolean;
}

const otpStore = new Map<string, OtpRecord>();

async function sendOtpEmail(email: string, firstName: string | undefined, otp: string): Promise<boolean> {
  const brevoKey = process.env.BREVO_API_KEY;

  console.log(`[OTP-SERVICE] ==========================================`);
  console.log(`[OTP-SERVICE] Verification Code for ${email} (${firstName || "User"}): ${otp}`);
  console.log(`[OTP-SERVICE] ==========================================`);

  if (!brevoKey) {
    return true;
  }

  try {
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; background-color: #0e1e2d; color: #ffffff; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #60a5fa; font-size: 24px; margin: 0; letter-spacing: 1px;">TAKETALON PRO</h1>
          <p style="color: #94a3b8; font-size: 14px; margin-top: 4px;">Uthibitisho wa Barua Pepe / Email Verification</p>
        </div>
        <div style="background-color: #172a3a; padding: 24px; border-radius: 8px; border: 1px solid #1e3a5f; text-align: center;">
          <p style="font-size: 16px; margin: 0 0 16px 0; color: #e2e8f0;">Hujambo <strong>${firstName || "Mteja"}</strong>,</p>
          <p style="font-size: 14px; color: #94a3b8; margin: 0 0 20px 0;">Tumia nambari hii ya siri ya tarakimu 6 (OTP) ili kukamilisha usajili wa akaunti yako ya TakeTalon PRO:</p>
          <div style="background: #0f172a; padding: 16px 24px; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #38bdf8; display: inline-block; margin-bottom: 20px; border: 1px dashed #38bdf8;">
            ${otp}
          </div>
          <p style="font-size: 13px; color: #64748b; margin: 0;">Nambari hii itaisha muda wake baada ya <strong>dakika 10</strong>. Usishiriki nambari hii na mtu yeyote.</p>
        </div>
        <div style="text-align: center; margin-top: 24px; font-size: 12px; color: #64748b;">
          &copy; ${new Date().getFullYear()} TakeTalon PRO. Haki zote zimehifadhiwa.
        </div>
      </div>
    `;

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": brevoKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: "TakeTalon PRO", email: "support@taketalon.com" },
        to: [{ email, name: firstName || email }],
        subject: `[TakeTalon PRO] ${otp} ni Nambari Yako ya Uthibitisho (OTP)`,
        htmlContent: html,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn("[OTP-SERVICE] Brevo API send error:", errText);
    }
    return response.ok;
  } catch (err: any) {
    console.warn("[OTP-SERVICE] Email dispatch failed:", err?.message || err);
    return false;
  }
}

const handleSendOtpRoute = async (req: Request, res: Response) => {
  try {
    const rawEmail = (req.body?.email || req.query?.email || "").toString().trim().toLowerCase();
    const firstName = (req.body?.first_name || req.query?.first_name || "").toString().trim();

    if (!rawEmail || !rawEmail.includes("@")) {
      return res.status(400).json({ success: false, error: "Tafadhali weka barua pepe (email) sahihi." });
    }

    const now = Date.now();
    const existing = otpStore.get(rawEmail);

    if (existing && now - existing.lastSentAt < 60000) {
      const waitSeconds = Math.ceil((60000 - (now - existing.lastSentAt)) / 1000);
      return res.status(429).json({
        success: false,
        cooldown_left: waitSeconds,
        error: `Tafadhali subiri sekunde ${waitSeconds} kabla ya kuomba OTP nyingine.`,
      });
    }

    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

    otpStore.set(rawEmail, {
      otp: generatedOtp,
      email: rawEmail,
      firstName,
      expiresAt: now + 10 * 60 * 1000,
      attemptsLeft: 5,
      lastSentAt: now,
      resendCount: existing ? existing.resendCount + 1 : 0,
      verified: false,
    });

    sendOtpEmail(rawEmail, firstName, generatedOtp).catch(() => {});

    return res.status(200).json({
      success: true,
      message: `Code ya OTP imetumwa kwenye barua pepe ${rawEmail}.`,
      expiry_minutes: 10,
    });
  } catch (err: any) {
    console.error("[handleSendOtpRoute] Error:", err);
    return res.status(500).json({ success: false, error: err?.message || "Hitilafu imetokea wakati wa kutuma OTP." });
  }
};

app.post("/send-otp", handleSendOtpRoute);
app.post("/api/auth/send-otp", handleSendOtpRoute);

const handleVerifyOtpRoute = async (req: Request, res: Response) => {
  try {
    const rawEmail = (req.body?.email || req.query?.email || "").toString().trim().toLowerCase();
    const cleanOtp = (req.body?.otp || req.query?.otp || "").toString().trim();

    if (!rawEmail || !cleanOtp) {
      return res.status(400).json({ success: false, error: "Tafadhali weka email na OTP kamili." });
    }

    const record = otpStore.get(rawEmail);
    const now = Date.now();

    if (!record) {
      return res.status(400).json({
        success: false,
        error: "Hakuna OTP iliyoombwa kwa barua pepe hii. Tafadhali omba OTP mpya.",
      });
    }

    if (now > record.expiresAt) {
      otpStore.delete(rawEmail);
      return res.status(400).json({
        success: false,
        error: "Muda wa OTP umekwisha (dakika 10 zimepita). Tafadhali omba tena.",
      });
    }

    if (record.attemptsLeft <= 0) {
      otpStore.delete(rawEmail);
      return res.status(400).json({
        success: false,
        error: "Umejaribu vibaya mara nyingi mno. Tafadhali omba OTP mpya.",
      });
    }

    if (record.otp !== cleanOtp) {
      record.attemptsLeft -= 1;
      return res.status(400).json({
        success: false,
        remaining_attempts: record.attemptsLeft,
        error: `Code ya OTP si sahihi. Majaribio yaliyosalia: ${record.attemptsLeft}`,
      });
    }

    record.verified = true;
    return res.status(200).json({
      success: true,
      message: "Code ya OTP imethibitishwa kwa mafanikio!",
    });
  } catch (err: any) {
    console.error("[handleVerifyOtpRoute] Error:", err);
    return res.status(500).json({ success: false, error: err?.message || "Hitilafu ya kuhakiki OTP." });
  }
};

app.post("/verify-otp", handleVerifyOtpRoute);
app.post("/api/auth/verify-otp", handleVerifyOtpRoute);

const handleResendOtpRoute = async (req: Request, res: Response) => {
  try {
    const rawEmail = (req.body?.email || req.query?.email || "").toString().trim().toLowerCase();
    if (!rawEmail || !rawEmail.includes("@")) {
      return res.status(400).json({ success: false, error: "Tafadhali weka barua pepe sahihi." });
    }

    const now = Date.now();
    const existing = otpStore.get(rawEmail);

    if (existing) {
      if (now - existing.lastSentAt < 60000) {
        const waitSeconds = Math.ceil((60000 - (now - existing.lastSentAt)) / 1000);
        return res.status(429).json({
          success: false,
          cooldown_left: waitSeconds,
          error: `Tafadhali subiri sekunde ${waitSeconds} kabla ya kuomba tena.`,
        });
      }
      if (existing.resendCount >= 5) {
        return res.status(429).json({
          success: false,
          error: "Umezidisha idadi ya maombi ya OTP kwa sasa. Tafadhali subiri kidogo.",
        });
      }
    }

    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const firstName = existing?.firstName || "";

    otpStore.set(rawEmail, {
      otp: generatedOtp,
      email: rawEmail,
      firstName,
      expiresAt: now + 10 * 60 * 1000,
      attemptsLeft: 5,
      lastSentAt: now,
      resendCount: (existing?.resendCount || 0) + 1,
      verified: false,
    });

    sendOtpEmail(rawEmail, firstName, generatedOtp).catch(() => {});

    return res.status(200).json({
      success: true,
      message: `Code mpya ya OTP imetumwa kwenye barua pepe ${rawEmail}.`,
    });
  } catch (err: any) {
    console.error("[handleResendOtpRoute] Error:", err);
    return res.status(500).json({ success: false, error: err?.message || "Hitilafu ya kutuma OTP." });
  }
};

app.post("/resend-otp", handleResendOtpRoute);
app.post("/api/auth/resend-otp", handleResendOtpRoute);

const handleCreateAccountRoute = async (req: Request, res: Response) => {
  try {
    const {
      email,
      password,
      first_name,
      last_name,
      username: reqUsername,
      phone,
      gender,
      birthday,
      terms_accepted,
    } = req.body || {};

    const cleanEmail = (email || "").toString().trim().toLowerCase();
    const cleanPassword = (password || "").toString();
    const cleanFirstName = (first_name || "").toString().trim();
    const cleanLastName = (last_name || "").toString().trim();
    const cleanPhone = (phone || "").toString().trim();

    if (!cleanEmail || !cleanEmail.includes("@")) {
      return res.status(400).json({ success: false, error: "Barua pepe (email) inahitajika." });
    }
    if (!cleanPassword || cleanPassword.length < 6) {
      return res.status(400).json({ success: false, error: "Neno la siri (password) lazima liwe na angalau herufi 6." });
    }

    let finalUsername = (reqUsername || "").toString().trim();
    if (!finalUsername) {
      const base = cleanFirstName
        ? cleanFirstName.toLowerCase().replace(/[^a-z0-9]/g, "")
        : cleanEmail.split("@")[0].replace(/[^a-z0-9]/g, "");
      finalUsername = `${base || "user"}${Math.floor(100 + Math.random() * 900)}`;
    }

    let authUserId = "";
    let profileRecord: any = null;

    if (supabaseAdmin) {
      try {
        const { data: authCreated, error: authErr } = await supabaseAdmin.auth.admin.createUser({
          email: cleanEmail,
          password: cleanPassword,
          email_confirm: true,
          user_metadata: {
            first_name: cleanFirstName,
            last_name: cleanLastName,
            username: finalUsername,
            phone: cleanPhone,
            gender: gender || null,
            birthday: birthday || null,
          },
        });

        if (authErr) {
          if (
            authErr.message?.toLowerCase().includes("already registered") ||
            authErr.message?.toLowerCase().includes("already exists")
          ) {
            const { data: userList } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 50 });
            const existingAuthUser = userList?.users?.find((u: any) => u.email?.toLowerCase() === cleanEmail);
            if (existingAuthUser) {
              authUserId = existingAuthUser.id;
              await supabaseAdmin.auth.admin.updateUserById(existingAuthUser.id, {
                password: cleanPassword,
                email_confirm: true,
                user_metadata: {
                  first_name: cleanFirstName,
                  last_name: cleanLastName,
                  username: finalUsername,
                  phone: cleanPhone,
                },
              });
            }
          } else {
            console.warn("[create-account] Supabase admin.createUser notice:", authErr.message);
          }
        } else if (authCreated?.user) {
          authUserId = authCreated.user.id;
        }
      } catch (authException: any) {
        console.warn("[create-account] Auth admin exception:", authException?.message || authException);
      }

      try {
        const profilePayload: any = {
          username: finalUsername,
          first_name: cleanFirstName,
          last_name: cleanLastName,
          email: cleanEmail,
          phone: cleanPhone,
          gender: gender || null,
          birthday: birthday || null,
          role:
            cleanPhone.includes("68769887") || finalUsername.toLowerCase().includes("amissi640")
              ? "ADMIN"
              : "USER",
          is_verified: true,
          is_pro: false,
          otp_verified: true,
          terms_accepted: terms_accepted === true,
          updated_at: new Date().toISOString(),
        };

        if (authUserId) {
          profilePayload.auth_user_id = authUserId;
        }

        const { data: upsertedProfile, error: pErr } = await supabaseAdmin
          .from("profiles")
          .upsert(profilePayload, { onConflict: "email" })
          .select("*")
          .maybeSingle();

        if (pErr) {
          console.warn("[create-account] Profile upsert notice:", pErr.message);
          const { data: existingProf } = await supabaseAdmin
            .from("profiles")
            .select("*")
            .eq("email", cleanEmail)
            .maybeSingle();
          profileRecord = existingProf;
        } else {
          profileRecord = upsertedProfile;
        }

        if (profileRecord?.id) {
          await supabaseAdmin
            .from("wallets")
            .upsert({ profile_id: profileRecord.id, balance: 0, reserved_balance: 0 }, { onConflict: "profile_id" });
        }
      } catch (dbErr: any) {
        console.warn("[create-account] DB insert error:", dbErr?.message || dbErr);
      }
    }

    otpStore.delete(cleanEmail);

    return res.status(200).json({
      success: true,
      username: profileRecord?.username || finalUsername,
      profile: profileRecord || {
        username: finalUsername,
        first_name: cleanFirstName,
        last_name: cleanLastName,
        email: cleanEmail,
        phone: cleanPhone,
        role: "USER",
      },
      message: "Hongera! Akaunti imeundwa kikamilifu kwenye TakeTalon PRO.",
    });
  } catch (err: any) {
    console.error("[handleCreateAccountRoute] Error:", err);
    return res.status(500).json({ success: false, error: err?.message || "Hitilafu ya kuunda akaunti." });
  }
};

app.post("/create-account", handleCreateAccountRoute);
app.post("/api/auth/create-account", handleCreateAccountRoute);

app.post("/api/auth/login", async (req, res) => {
  try {
    const { loginId, password } = req.body || {};
    const cleanId = (loginId || "").toString().trim();
    const cleanPassword = (password || "").toString();

    if (!cleanId || !cleanPassword) {
      return res.status(400).json({ ok: false, error: "Tafadhali weka jina la mtumiaji/email na neno la siri." });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({ ok: false, error: "Database haijaunganishwa." });
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);

    let query = supabaseAdmin.from("profiles").select("*");
    if (isUuid) {
      query = query.or(`id.eq.${cleanId},auth_user_id.eq.${cleanId}`);
    } else {
      const sanitizedPhone = cleanId.replace(/[^0-9]/g, "");
      if (sanitizedPhone.length >= 6) {
        query = query.or(`email.ilike.${cleanId},username.ilike.${cleanId},phone.ilike.%${sanitizedPhone}%`);
      } else {
        query = query.or(`email.ilike.${cleanId},username.ilike.${cleanId}`);
      }
    }

    const { data: profile, error: pErr } = await query.maybeSingle();

    if (!profile) {
      return res.status(401).json({
        ok: false,
        error: "Maelezo ya kuingia si sahihi au akaunti haijapatikana.",
      });
    }

    if (
      (profile.phone && (profile.phone.includes("68769887") || profile.phone === "68769887")) ||
      (profile.username && profile.username.toLowerCase().includes("amissi640")) ||
      (profile.email && profile.email.toLowerCase().includes("amissi640"))
    ) {
      profile.role = "ADMIN";
      profile.is_verified = true;
    }

    let { data: walletData } = await supabaseAdmin
      .from("wallets")
      .select("*")
      .eq("profile_id", profile.id)
      .maybeSingle();

    if (!walletData) {
      const { data: newWallet } = await supabaseAdmin
        .from("wallets")
        .upsert({ profile_id: profile.id, balance: 0, reserved_balance: 0 }, { onConflict: "profile_id" })
        .select("*")
        .maybeSingle();
      walletData = newWallet;
    }

    const balance = Number(walletData?.balance || 0);
    const reserved = Number(walletData?.reserved_balance || 0);
    const available = Math.max(0, balance - reserved);

    return res.status(200).json({
      ok: true,
      profile,
      wallet: {
        ...walletData,
        balance,
        reserved_balance: reserved,
        available_balance: available,
      },
    });
  } catch (err: any) {
    console.error("[api/auth/login] Error:", err);
    return res.status(500).json({ ok: false, error: err?.message || "Hitilafu wakati wa kuingia." });
  }
});

app.get("/api/auth/profile-lookup", async (req, res) => {
  if (!supabaseAdmin) return res.json({ ok: false, profile: null, wallet: null });
  try {
    const queryId = ((req.query.id as string) || (req.query.auth_user_id as string) || "").trim();
    if (!queryId) return res.json({ ok: false, profile: null, wallet: null });

    let query = supabaseAdmin.from("profiles").select("*");
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(queryId);
    if (isUuid) {
      query = query.or(`id.eq.${queryId},auth_user_id.eq.${queryId}`);
    } else {
      const sanitizedPhone = queryId.replace(/[^0-9]/g, "");
      if (sanitizedPhone.length >= 6) {
        query = query.or(`email.ilike.${queryId},username.ilike.${queryId},phone.ilike.%${sanitizedPhone}%`);
      } else {
        query = query.or(`email.ilike.${queryId},username.ilike.${queryId}`);
      }
    }

    let profileData: any = null;
    try {
      const { data, error: profileErr } = await query.maybeSingle();
      if (profileErr) {
        if (!profileErr.message?.includes("permission denied")) {
          console.warn("[profile-lookup] DB query warning:", profileErr.message);
        }
      } else {
        profileData = data;
      }
    } catch (e) {
      // ignore
    }

    if (profileData) {
      if (
        profileData.phone &&
        (profileData.phone.includes("68769887") || profileData.phone === "68769887")
      ) {
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

app.get("/api/supabase/user-contracts", async (req, res) => {
  if (!supabaseAdmin) return res.json({ ok: false, contracts: [] });
  try {
    const profileId = (req.query.profile_id as string) || (req.query.auth_user_id as string);
    if (!profileId) return res.json({ ok: false, contracts: [] });

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

app.post("/api/deposit/gemini-ask", async (req, res) => {
  try {
    const { question, lang, context } = req.body || {};
    if (!question || typeof question !== "string") {
      return res.status(400).json({ ok: false, message: "Missing question" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const isSw = lang === "sw";
    const isFr = lang === "fr";
    const unavailableMessage = isSw
      ? "Gemini AI haikuweza kujibu kwa sasa. Jaribu tena baadaye."
      : isFr
      ? "Gemini AI n'a pas pu répondre pour le moment. Réessayez plus tard."
      : "Gemini AI couldn't answer right now. Please try again later.";

    if (!apiKey) {
      return res.status(503).json({ ok: false, error: unavailableMessage, message: unavailableMessage });
    }

    try {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const systemInstruction = `You are the TakeTalon AI Assistant.
Your task is to politely, clearly, and concisely help users who have questions.
User Language: ${lang || "sw"}.
Context: ${context?.method ? `Payment method = ${context.method}` : "General user inquiry"}.
Rules:
1. Answer the user's specific question directly, accurately, and politely in the user's language (${lang || "sw"}).
2. Users have complete freedom to ask any question (about TakeTalon, games, sports, tips, betting rules, deposits, or general inquiries). Do not assume or restrict answers only to deposits unless that is specifically what they asked.
3. Keep answers concise (2 to 4 sentences maximum).
4. Security rule: never ask for, reveal, or accept account passwords, PINs, or private keys.
5. Keep tone friendly, reassuring, and professional.`;

      const candidateModels = ["gemini-3.6-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
      let answerText = "";

      for (const model of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: question,
            config: {
              systemInstruction,
              temperature: 0.3,
            },
          });
          if (response?.text) {
            answerText = response.text.trim();
            break;
          }
        } catch (modelErr) {
          // try next model
        }
      }

      if (answerText) {
        return res.json({ ok: true, answer: answerText });
      }
    } catch (genAiErr: any) {
      console.warn("[gemini-ask] GenAI SDK error:", genAiErr?.message);
    }

    return res.status(503).json({ ok: false, error: unavailableMessage, message: unavailableMessage });
  } catch (err: any) {
    console.warn("[gemini-ask] Error generating answer:", err?.message);
    const isSw = req.body?.lang === "sw";
    const isFr = req.body?.lang === "fr";
    const unavailableMessage = isSw
      ? "Gemini AI haikuweza kujibu kwa sasa. Jaribu tena baadaye."
      : isFr
      ? "Gemini AI n'a pas pu répondre pour le moment. Réessayez plus tard."
      : "Gemini AI couldn't answer right now. Please try again later.";

    return res.status(500).json({
      ok: false,
      error: unavailableMessage,
      message: unavailableMessage,
    });
  }
});

app.post("/api/deposit/report", async (req, res) => {
  try {
    const { reportNumber, method, phone, transactionRef, description, username } = req.body || {};
    console.log(`[Deposit Report] Received Report #${reportNumber} from ${username || phone}: ${description}`);

    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from("audit_logs").insert({
          action: "DEPOSIT_ISSUE_REPORT",
          entity_type: "deposit_report",
          entity_id: reportNumber,
          new_values: { reportNumber, method, phone, transactionRef, description, username },
          created_at: new Date().toISOString(),
        });
      } catch (e: any) {
        console.warn("[Deposit Report] Audit log insert warning:", e?.message);
      }
    }

    return res.json({ ok: true, reportNumber });
  } catch (err: any) {
    return res.status(500).json({ ok: false, message: err?.message || "Failed to record report" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Vite Middleware & Server Boot
// ─────────────────────────────────────────────────────────────────────────────
async function startServer() {
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
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[TakeTalon Server] Running on http://0.0.0.0:${PORT}`);
    console.log(`[SMS Forwarder Webhook] Active at http://0.0.0.0:${PORT}/api/sms-forwarder`);
    startAviatorRoundLoop();
  });
}

startServer();
