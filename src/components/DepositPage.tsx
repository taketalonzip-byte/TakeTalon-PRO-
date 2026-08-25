import React, { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Coins,
  Copy,
  Check,
  Smartphone,
  ShieldCheck,
  RefreshCw,
  Info,
  CheckCircle2,
  Sparkles,
  Zap,
  Bot,
  Send,
  AlertCircle,
  FileWarning,
  Hash,
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

interface DepositPageProps {
  userBalance: number;
  setUserBalance: React.Dispatch<React.SetStateAction<number>>;
  onAddTransaction: (type: "DEPOSIT" | "WITHDRAW" | "BET_PLACE" | "BET_WIN" | "UPGRADE_PRO", amount: number, desc: string) => void;
  theme: "blue" | "dark" | "light";
  onAddNotification: (msg: string, type?: "success" | "error" | "info") => void;
  lang: "en" | "fr" | "sw";
  onBack: () => void;
  currentUser?: { isLoggedIn: boolean; username: string; phone?: string; email?: string } | null;
  profileId?: string | null;
}

const VERIFY_TOTAL_WAIT_SECONDS = 60;
const VERIFY_POLL_INTERVAL_MS = 5000;

export default function DepositPage({
  userBalance,
  setUserBalance,
  onAddTransaction,
  theme,
  onAddNotification,
  lang,
  onBack,
  currentUser,
  profileId,
}: DepositPageProps) {
  const tr = (sw: string, fr: string, en: string) => (lang === "sw" ? sw : lang === "fr" ? fr : en);

  const [selectedMethod, setSelectedMethod] = useState<
    "lumicash" | "lumitel_units" | "ecocash" | "econet_units" | null
  >(null);

  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);
  const [transactionRef, setTransactionRef] = useState("");
  const [senderPhone, setSenderPhone] = useState(currentUser?.phone || "");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    status: "success" | "pending" | "error" | null;
    message?: string;
  }>({ status: null });

  // Countdown / polling state for the "up to 60s" verification wait
  const [verifyCountdown, setVerifyCountdown] = useState<number | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Report-an-incomplete-transaction state
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportNumber, setReportNumber] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);

  // Gemini AI Q&A state
  const [geminiQuestion, setGeminiQuestion] = useState("");
  const [geminiAnswer, setGeminiAnswer] = useState("");
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [geminiError, setGeminiError] = useState("");

  // Agents data for each method
  const agentsMap = {
    lumicash: {
      title: "Lumicash",
      phone: "COMING",
      ussd: "*163#",
      rawPhone: "",
      isAvailable: false,
      type: "Kadi ya Njano (Yellow Card)",
      color: "yellow",
      steps: [
        "Namba ya Wakala ya njia hii ya Lumicash inakuja hivi karibuni (COMING SOON).",
        "Tafadhali tumia kadi ya 'les unités du lumitel' kuweka amana kwa sasa.",
      ],
    },
    lumitel_units: {
      title: "les unités du lumitel",
      phone: "+257 68 769 887",
      ussd: "*160#",
      rawPhone: "68769887",
      isAvailable: true,
      type: "Kadi ya Njano (Yellow Card)",
      color: "yellow",
      steps: [
        "Piga *160# au tumia Menu ya Lumitel Unités",
        "Chagua Transfert d'unités (Kutuma Unités)",
        "Tuma Unités kwenda namba ya Wakala: 68769887",
        "Ingiza kiasi cha Unités cha kuweka",
        "Thibitisha kwa kuweka PIN yako",
      ],
    },
    ecocash: {
      title: "Ecocash",
      phone: "COMING",
      ussd: "*555#",
      rawPhone: "",
      isAvailable: false,
      type: "Kadi Nyekundu na Weupe (Red & White Card)",
      color: "red_white",
      steps: [
        "Namba ya Wakala ya njia hii ya Ecocash inakuja hivi karibuni (COMING SOON).",
        "Tafadhali tumia kadi ya 'les unités du lumitel' kuweka amana kwa sasa.",
      ],
    },
    econet_units: {
      title: "Les unités du Econet",
      phone: "COMING",
      ussd: "*100#",
      rawPhone: "",
      isAvailable: false,
      type: "Kadi Nyekundu na Weupe (Red & White Card)",
      color: "red_white",
      steps: [
        "Namba ya Wakala ya njia hii ya Econet Unités inakuja hivi karibuni (COMING SOON).",
        "Tafadhali tumia kadi ya 'les unités du lumitel' kuweka amana kwa sasa.",
      ],
    },
  };

  const handleCopy = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopiedNumber(num);
    onAddNotification(
      tr(`Namba ${num} imenakiliwa!`, `Numéro ${num} copié !`, `Number ${num} copied!`),
      "success"
    );
    setTimeout(() => setCopiedNumber(null), 2500);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Verification timers helpers
  // ─────────────────────────────────────────────────────────────────────────
  const clearVerifyTimers = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearVerifyTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  type DepositCheckResult =
    | { status: "success"; amount: number; methodName: string }
    | { status: "pending" }
    | { status: "error"; message: string };

  // Single "did the deposit land yet?" check — reused by the polling loop below
  const checkDepositStatus = async (): Promise<DepositCheckResult> => {
    try {
      // Query recent sms_messages in Supabase database to verify real deposit
      let query = supabase.from("sms_messages").select("*").order("created_at", { ascending: false }).limit(10);
      const { data, error } = await query;

      if (error) {
        console.warn("[DepositPage] verification db check warning:", error.message);
      }

      const matchedSms = (data || []).find((msg: any) => {
        const body = (msg.message || msg.body || "").toLowerCase();
        const sender = (msg.sender || msg.sender_phone || "").toLowerCase();
        const ref = transactionRef.trim().toLowerCase();
        const phone = senderPhone.trim().toLowerCase();

        if (ref && body.includes(ref)) return true;
        if (phone && sender.includes(phone)) return true;
        return false;
      });

      if (matchedSms) {
        const amount = matchedSms.amount || 1000;
        const methodName = selectedMethod ? agentsMap[selectedMethod].title : "Mobile Money";
        return { status: "success", amount, methodName };
      }

      // If not immediately found in DB, trigger backend SMS poll sync check
      const syncRes = await fetch("/api/sms").then((r) => r.json()).catch(() => null);

      if (syncRes && syncRes.data && syncRes.data.length > 0) {
        const freshMatched = syncRes.data.find((m: any) => {
          const b = (m.message || "").toLowerCase();
          const ref = transactionRef.trim().toLowerCase();
          return ref && b.includes(ref);
        });

        if (freshMatched) {
          const amount = freshMatched.amount || 1000;
          const methodName = selectedMethod ? agentsMap[selectedMethod].title : "Mobile Money";
          return { status: "success", amount, methodName };
        }
      }

      return { status: "pending" };
    } catch (err: any) {
      console.error("[DepositPage] Verification error:", err);
      return {
        status: "error",
        message:
          lang === "sw"
            ? "Imefeli kuhakiki muamala. Hakikisha umetuma pesa kwenda kwa Wakala kwanza."
            : "Failed to verify transaction. Please send funds to the Agent first.",
      };
    }
  };

  // Applies a confirmed deposit: refresh balance from DB + record transaction + notify
  const applySuccessResult = async (amount: number, methodName: string) => {
    const cAny = currentUser as any;
    const lookupId = cAny?.id || cAny?.authUserId || cAny?.email || cAny?.username;
    if (lookupId) {
      try {
        const res = await fetch(`/api/auth/profile-lookup?id=${encodeURIComponent(lookupId)}`);
        if (res.ok) {
          const pData = await res.json();
          if (pData?.wallet?.available_balance !== undefined) {
            setUserBalance(Number(pData.wallet.available_balance));
          }
        }
      } catch (err) {
        console.warn("[DepositPage] balance refresh warning:", err);
      }
    }

    onAddTransaction(
      "DEPOSIT",
      amount,
      lang === "sw" ? `Amana Halisi kupitia ${methodName}` : `Real Deposit via ${methodName}`
    );

    setVerificationResult({
      status: "success",
      message:
        lang === "sw"
          ? `Muamala umethibitishwa kwenye database! Salio lako limesasishwa.`
          : `Transaction verified in database! Your balance was updated.`,
    });

    onAddNotification(
      lang === "sw"
        ? `Amana ya FBU ${amount.toLocaleString()} imethibitishwa vyema kwenye database!`
        : `Deposit of FBU ${amount.toLocaleString()} verified successfully in database!`,
      "success"
    );
  };

  const handleVerifyDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionRef.trim() && !senderPhone.trim()) {
      onAddNotification(
        tr(
          "Tafadhali weka Reference ID au namba ya simu",
          "Veuillez saisir l'ID de référence ou le numéro de téléphone",
          "Please enter Reference ID or phone number"
        ),
        "error"
      );
      return;
    }

    clearVerifyTimers();
    setIsVerifying(true);
    setVerificationResult({ status: null });
    setShowReportForm(false);
    setReportSubmitted(false);
    setVerifyCountdown(VERIFY_TOTAL_WAIT_SECONDS);

    // Purely visual 1s countdown ticker
    countdownIntervalRef.current = setInterval(() => {
      setVerifyCountdown((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const startTime = Date.now();
    let resolved = false;

    const finishSuccess = async (amount: number, methodName: string) => {
      resolved = true;
      clearVerifyTimers();
      setVerifyCountdown(null);
      await applySuccessResult(amount, methodName);
      setIsVerifying(false);
    };

    const finishError = (message: string) => {
      resolved = true;
      clearVerifyTimers();
      setVerifyCountdown(null);
      setVerificationResult({ status: "error", message });
      setIsVerifying(false);
    };

    const finishTimeout = () => {
      resolved = true;
      clearVerifyTimers();
      setVerifyCountdown(null);
      const rNum = `RPT-${Date.now().toString(36).toUpperCase()}`;
      setReportNumber(rNum);
      setShowReportForm(true);
      setVerificationResult({
        status: "pending",
        message: tr(
          "Muda wa sekunde 60 umeisha bila majibu ya moja kwa moja kutoka kwa mfumo. Bado mfumo huu wa uhakiki unajengwa na mchakato huu bado unaigwa (simulated) kwa sasa, kwa hiyo majibu halisi ya deposit yako huenda yakachukua muda zaidi. Kama umeshatuma Unités na kuhakiki lakini muamala haujakamilika, tafadhali jaza fomu ya ripoti hapa chini ili tuisimamie.",
          "Le délai de 60 secondes s'est écoulé sans réponse directe du système. Ce système de vérification est encore en construction et ce processus est actuellement simulé, une réponse réelle peut donc prendre plus de temps. Si vous avez déjà envoyé les unités et vérifié mais que la transaction n'est pas terminée, veuillez remplir le formulaire de rapport ci-dessous.",
          "The 60 second wait ended without a direct answer from the system. This verification system is still being built and this process is currently simulated, so a real response may take longer. If you've already sent the units and verified but the transaction isn't complete, please fill out the report form below."
        ),
      });
      setIsVerifying(false);
    };

    const pollLoop = async () => {
      if (resolved) return;

      const elapsed = Date.now() - startTime;
      if (elapsed >= VERIFY_TOTAL_WAIT_SECONDS * 1000) {
        finishTimeout();
        return;
      }

      const result = await checkDepositStatus();
      if (resolved) return;

      if (result.status === "success") {
        await finishSuccess(result.amount, result.methodName);
        return;
      }

      if (result.status === "error") {
        finishError(result.message);
        return;
      }

      // Still pending — no need to wait the full 60s once a real answer shows up,
      // but keep the reassurance message live while we wait for one.
      setVerificationResult({
        status: "pending",
        message: tr(
          "Ujumbe wako wa SMS unapokelewa na kuhakikiwa na mfumo wa TakeTalon. Ukishapokewa, salio lako litaongezeka kiotomatiki. Bado mfumo huu unajengwa, kwa hiyo hii ni sehemu ya mchakato unaoigwa (simulated) kwa sasa.",
          "Votre transaction SMS est en cours de traitement et de vérification par le système TakeTalon. Une fois reçue, votre solde sera mis à jour automatiquement. Ce système est encore en construction, il s'agit donc actuellement d'une partie simulée du processus.",
          "Your SMS transaction is being processed and verified by the TakeTalon system. Once received, your balance will update automatically. This system is still being built, so this is currently a simulated part of the process."
        ),
      });

      const remainingMs = VERIFY_TOTAL_WAIT_SECONDS * 1000 - (Date.now() - startTime);
      if (remainingMs <= 0) {
        finishTimeout();
        return;
      }

      pollTimeoutRef.current = setTimeout(pollLoop, Math.min(VERIFY_POLL_INTERVAL_MS, remainingMs));
    };

    pollLoop();
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Gemini AI Q&A (server-side call — never expose GEMINI_API_KEY client-side)
  // ─────────────────────────────────────────────────────────────────────────
  const handleAskGemini = async () => {
    if (!geminiQuestion.trim() || geminiLoading) return;
    setGeminiLoading(true);
    setGeminiError("");
    setGeminiAnswer("");
    try {
      const res = await fetch("/api/deposit/gemini-ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: geminiQuestion.trim(),
          lang,
          context: {
            method: selectedMethod ? agentsMap[selectedMethod].title : null,
            verificationStatus: verificationResult.status,
          },
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok && data?.answer) {
        setGeminiAnswer(data.answer);
      } else {
        setGeminiError(
          tr(
            "Gemini AI haikuweza kujibu kwa sasa. Jaribu tena baadaye.",
            "Gemini AI n'a pas pu répondre pour le moment. Réessayez plus tard.",
            "Gemini AI couldn't answer right now. Please try again later."
          )
        );
      }
    } catch (err) {
      setGeminiError(
        tr("Hitilafu ya mtandao. Jaribu tena.", "Erreur réseau. Réessayez.", "Network error. Please try again.")
      );
    } finally {
      setGeminiLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Report an incomplete transaction
  // ─────────────────────────────────────────────────────────────────────────
  const handleSubmitReport = async () => {
    if (!reportDescription.trim()) {
      onAddNotification(
        tr(
          "Tafadhali eleza tatizo lako kabla ya kutuma ripoti",
          "Veuillez décrire votre problème avant d'envoyer le rapport",
          "Please describe your issue before submitting the report"
        ),
        "error"
      );
      return;
    }
    setReportSubmitting(true);
    try {
      const res = await fetch("/api/deposit/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportNumber,
          method: selectedMethod ? agentsMap[selectedMethod].title : null,
          phone: senderPhone,
          transactionRef,
          description: reportDescription.trim(),
          username: currentUser?.username || null,
          lang,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        setReportSubmitted(true);
        onAddNotification(
          tr(
            `Ripoti namba ${reportNumber} imetumwa kikamilifu. Timu yetu itaifanyia kazi.`,
            `Le rapport n°${reportNumber} a été envoyé avec succès. Notre équipe le traitera.`,
            `Report number ${reportNumber} was submitted successfully. Our team will look into it.`
          ),
          "success"
        );
      } else {
        onAddNotification(
          tr(
            "Imefeli kutuma ripoti. Jaribu tena.",
            "Échec de l'envoi du rapport. Réessayez.",
            "Failed to submit report. Please try again."
          ),
          "error"
        );
      }
    } catch (err) {
      onAddNotification(
        tr(
          "Hitilafu ya mtandao wakati wa kutuma ripoti.",
          "Erreur réseau lors de l'envoi du rapport.",
          "Network error while submitting the report."
        ),
        "error"
      );
    } finally {
      setReportSubmitting(false);
    }
  };

  const openReportFormManually = () => {
    const rNum = reportNumber || `RPT-${Date.now().toString(36).toUpperCase()}`;
    setReportNumber(rNum);
    setShowReportForm(true);
  };

  return (
    <div className="px-3.5 py-4 space-y-4 max-w-lg mx-auto pb-24 text-left animate-fadeIn">
      {/* Top Navigation Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2.5">
          <button
            onClick={onBack}
            className={`p-2 rounded-xl border transition-all active:scale-95 cursor-pointer ${
              theme === "light"
                ? "bg-white border-slate-200 text-slate-800 hover:bg-slate-50"
                : "bg-slate-900 border-slate-800 text-slate-300 hover:text-white"
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2
              className={`font-display font-black text-sm tracking-wide uppercase leading-tight ${
                theme === "light" ? "text-slate-900" : "text-slate-100"
              }`}
            >
              {lang === "sw"
                ? "Ukurasa wa Amana Halisi"
                : lang === "fr"
                  ? "Page de Dépôt Réel"
                  : "Real Deposit Page"}
            </h2>
            <p className="text-[10px] text-slate-500">
              {lang === "sw"
                ? "Chagua njia ya malipo kuweka salio"
                : "Choose payment method to deposit"}
            </p>
          </div>
        </div>

        {/* Balance badge */}
        <div
          className={`text-xs font-mono font-bold px-3 py-1.5 rounded-xl flex items-center space-x-1.5 border shrink-0 ${
            theme === "light"
              ? "bg-white border-slate-200 text-slate-900 shadow-sm"
              : "bg-slate-900 border-slate-800 text-slate-200"
          }`}
        >
          <Coins className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
          <span className="text-emerald-500 font-black">
            FBU {userBalance.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Real Deposit Notice Banner */}
      <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] leading-relaxed flex items-start space-x-2.5 shadow-sm">
        <Zap className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5 animate-pulse" />
        <div>
          <span className="font-extrabold uppercase tracking-wide block text-emerald-300 text-[11.5px]">
            {lang === "sw" ? "Mfumo wa Amana Halisi (Real Deposit)" : "Real Deposit System Active"}
          </span>
          <p className="text-slate-300 text-[10.5px] mt-0.5">
            {lang === "sw"
              ? "Amana za majaribio zimeondolewa. Tuma pesa moja kwa moja kupitia kadi zifuatazo na salio lako litaongezwa kiotomatiki."
              : "Test deposits removed. Deposit directly using the official Burundi cards below for instant automatic balance credit."}
          </p>
        </div>
      </div>

      {/* THE 4 REQUIRED CARDS SECTION */}
      <div className="space-y-3">
        <h3
          className={`text-xs font-black uppercase tracking-wider text-left ${
            theme === "light" ? "text-slate-600" : "text-slate-400"
          }`}
        >
          {lang === "sw" ? "Njia 4 za Amana (Deposit Cards):" : "4 Deposit Cards:"}
        </h3>

        {/* GRID OF THE 4 SPECIFIC CARDS */}
        <div className="grid grid-cols-1 gap-3">
          {/* CARD 1: YELLOW CARD - Lumicash */}
          <div
            onClick={() => setSelectedMethod(selectedMethod === "lumicash" ? null : "lumicash")}
            className={`relative overflow-hidden rounded-2xl p-4 cursor-pointer transition-all duration-300 active:scale-[0.99] border-2 shadow-lg ${
              selectedMethod === "lumicash"
                ? "ring-4 ring-yellow-400/50 scale-[1.01]"
                : ""
            } bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 border-yellow-300`}
          >
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-yellow-300/40 rounded-full blur-xl pointer-events-none"></div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-slate-950/10 border border-slate-950/20 flex items-center justify-center font-black text-slate-950 text-base shadow-inner">
                  📱
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-900/80 block">
                    LUMITEL BURUNDI
                  </span>
                  <h4 className="text-xl font-display font-black tracking-tight text-slate-950 leading-none">
                    Lumicash
                  </h4>
                </div>
              </div>

              <div className="text-right">
                <span className="px-2.5 py-1 rounded-lg text-[9.5px] font-black tracking-wider uppercase bg-slate-950 text-yellow-400 shadow-md">
                  KADI YA NJANO
                </span>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-950/15 flex items-center justify-between text-xs font-bold text-slate-900">
              <span>USSD: *163#</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-950 text-amber-300">
                COMING
              </span>
            </div>
          </div>

          {/* CARD 2: YELLOW CARD - les unités du lumitel */}
          <div
            onClick={() => setSelectedMethod(selectedMethod === "lumitel_units" ? null : "lumitel_units")}
            className={`relative overflow-hidden rounded-2xl p-4 cursor-pointer transition-all duration-300 active:scale-[0.99] border-2 shadow-lg ${
              selectedMethod === "lumitel_units"
                ? "ring-4 ring-amber-300/50 scale-[1.01]"
                : ""
            } bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-400 text-slate-950 border-amber-300`}
          >
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-amber-200/50 rounded-full blur-xl pointer-events-none"></div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-slate-950/10 border border-slate-950/20 flex items-center justify-center font-black text-slate-950 text-base shadow-inner">
                  ⚡
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-900/80 block">
                    UNITÉS AIRTIME
                  </span>
                  <h4 className="text-lg font-display font-black tracking-tight text-slate-950 leading-none">
                    les unités du lumitel
                  </h4>
                </div>
              </div>

              <div className="text-right">
                <span className="px-2.5 py-1 rounded-lg text-[9.5px] font-black tracking-wider uppercase bg-slate-950 text-amber-300 shadow-md">
                  KADI YA NJANO
                </span>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-950/15 flex items-center justify-between text-xs font-bold text-slate-900">
              <span>USSD: *160#</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-950 text-emerald-400">
                WAKALA: 68769887
              </span>
            </div>
          </div>

          {/* CARD 3: RED & WHITE CARD - Ecocash */}
          <div
            onClick={() => setSelectedMethod(selectedMethod === "ecocash" ? null : "ecocash")}
            className={`relative overflow-hidden rounded-2xl p-4 cursor-pointer transition-all duration-300 active:scale-[0.99] border-2 shadow-lg ${
              selectedMethod === "ecocash"
                ? "ring-4 ring-rose-500/50 scale-[1.01]"
                : ""
            } bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white border-white/80`}
          >
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/20 rounded-full blur-xl pointer-events-none"></div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-white text-red-600 flex items-center justify-center font-black text-base shadow-md">
                  💳
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/80 block">
                    ECONET LEO BURUNDI
                  </span>
                  <h4 className="text-xl font-display font-black tracking-tight text-white leading-none">
                    Ecocash
                  </h4>
                </div>
              </div>

              <div className="text-right">
                <span className="px-2.5 py-1 rounded-lg text-[9.5px] font-black tracking-wider uppercase bg-white text-red-600 shadow-md">
                  KADI NYEKUNDU NA WEUPE
                </span>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-white/20 flex items-center justify-between text-xs font-bold text-white">
              <span>USSD: *555#</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-white text-red-600">
                COMING
              </span>
            </div>
          </div>

          {/* CARD 4: RED & WHITE CARD - Les unités du Econet */}
          <div
            onClick={() => setSelectedMethod(selectedMethod === "econet_units" ? null : "econet_units")}
            className={`relative overflow-hidden rounded-2xl p-4 cursor-pointer transition-all duration-300 active:scale-[0.99] border-2 shadow-lg ${
              selectedMethod === "econet_units"
                ? "ring-4 ring-rose-500/50 scale-[1.01]"
                : ""
            } bg-gradient-to-r from-rose-700 via-red-600 to-rose-800 text-white border-white/80`}
          >
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/20 rounded-full blur-xl pointer-events-none"></div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-white text-red-600 flex items-center justify-center font-black text-base shadow-md">
                  📡
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/80 block">
                    ECONET AIRTIME
                  </span>
                  <h4 className="text-lg font-display font-black tracking-tight text-white leading-none">
                    Les unités du Econet
                  </h4>
                </div>
              </div>

              <div className="text-right">
                <span className="px-2.5 py-1 rounded-lg text-[9.5px] font-black tracking-wider uppercase bg-white text-red-600 shadow-md">
                  KADI NYEKUNDU NA WEUPE
                </span>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-white/20 flex items-center justify-between text-xs font-bold text-white">
              <span>USSD: *100#</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-white text-red-600">
                COMING
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SELECTED METHOD DETAILS & VERIFICATION INSTRUCTIONS */}
      {selectedMethod && (
        <div
          className={`p-4 rounded-2xl border space-y-4 text-left shadow-xl animate-fadeIn ${
            theme === "light"
              ? "bg-white border-slate-200 shadow-md"
              : "bg-slate-900 border-slate-800"
          }`}
        >
          <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block">
                MAELEKEZO YA AMANA HALISI
              </span>
              <h3 className="text-base font-black text-emerald-500 dark:text-emerald-400">
                {agentsMap[selectedMethod].title}
              </h3>
            </div>
            <span
              className={`px-2 py-1 rounded-md text-[9px] font-black uppercase ${
                agentsMap[selectedMethod].color === "yellow"
                  ? "bg-amber-400 text-slate-950"
                  : "bg-red-600 text-white"
              }`}
            >
              {agentsMap[selectedMethod].type}
            </span>
          </div>

          {/* Agent Phone Number Box */}
          <div
            className={`p-3 rounded-xl border flex items-center justify-between ${
              theme === "light"
                ? "bg-slate-50 border-slate-200"
                : "bg-slate-950 border-slate-850"
            }`}
          >
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-500 block">
                Namba ya Wakala (Receiver Agent Number):
              </span>
              <span
                className={`text-base font-mono font-black ${
                  agentsMap[selectedMethod].isAvailable
                    ? "text-blue-500 dark:text-sky-400"
                    : "text-amber-500 dark:text-amber-400"
                }`}
              >
                {agentsMap[selectedMethod].phone}
              </span>
            </div>

            {agentsMap[selectedMethod].isAvailable ? (
              <button
                onClick={() => handleCopy(agentsMap[selectedMethod].phone)}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center space-x-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
              >
                {copiedNumber === agentsMap[selectedMethod].phone ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Imenakiliwa!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Nakili Namba</span>
                  </>
                )}
              </button>
            ) : (
              <span className="px-3 py-1.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-black uppercase tracking-wider">
                COMING SOON
              </span>
            )}
          </div>

          {/* Steps List */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase text-slate-400">
              Hatua za kufuata (Steps):
            </h4>
            <ol className="space-y-1.5 list-decimal pl-4 text-xs leading-relaxed text-slate-300">
              {agentsMap[selectedMethod].steps.map((step, idx) => (
                <li key={idx} className={theme === "light" ? "text-slate-700" : "text-slate-300"}>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          {/* VERIFY TRANSACTION FORM */}
          <form
            onSubmit={handleVerifyDeposit}
            className={`p-3.5 rounded-xl border space-y-3 ${
              theme === "light"
                ? "bg-blue-50/50 border-blue-200"
                : "bg-slate-950/80 border-slate-800"
            }`}
          >
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <h4
                className={`text-xs font-black uppercase ${
                  theme === "light" ? "text-slate-800" : "text-slate-200"
                }`}
              >
                Hakiki Deposit Yako (SMS Instant Verification)
              </h4>
            </div>

            <p className="text-[10px] text-slate-500 leading-relaxed -mt-1.5">
              {tr(
                "Kumbuka: mfumo huu bado unajengwa na mchakato wa uhakiki bado unaigwa (simulated). Tutakupa majibu haraka iwezekanavyo, kwa kiwango cha juu cha sekunde 60.",
                "Remarque : ce système est encore en construction et le processus de vérification est actuellement simulé. Nous vous répondrons le plus rapidement possible, en 60 secondes maximum.",
                "Note: this system is still being built and the verification process is currently simulated. We'll respond as fast as possible, within 60 seconds max."
              )}
            </p>

            <div className="space-y-2">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Namba ya Simu Yako ya Muamala:
                </label>
                <input
                  type="text"
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                  placeholder="mf. +257 68000000 au 79000000"
                  className={`w-full px-3 py-2 text-xs font-mono rounded-xl border focus:outline-none ${
                    theme === "light"
                      ? "bg-white border-slate-300 text-slate-900"
                      : "bg-slate-900 border-slate-800 text-slate-100"
                  }`}
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Kumbukumbu ya Muamala / Reference ID (SMS):
                </label>
                <input
                  type="text"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  placeholder="mf. MP260806.1234.A001"
                  className={`w-full px-3 py-2 text-xs font-mono rounded-xl border focus:outline-none ${
                    theme === "light"
                      ? "bg-white border-slate-300 text-slate-900"
                      : "bg-slate-900 border-slate-800 text-slate-100"
                  }`}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isVerifying}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>
                    {verifyCountdown !== null
                      ? tr(
                          `Inasubiri Majibu... ${verifyCountdown}s`,
                          `En attente de réponse... ${verifyCountdown}s`,
                          `Waiting for response... ${verifyCountdown}s`
                        )
                      : tr("Inahakiki Kwenye Database...", "Vérification en cours...", "Verifying...")}
                  </span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                  <span>HAKIKI AMANA SASA ⚡</span>
                </>
              )}
            </button>

            {/* Verification Result Message */}
            {verificationResult.status && (
              <div
                className={`p-3 rounded-xl border text-xs leading-relaxed flex items-start space-x-2 ${
                  verificationResult.status === "success"
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    : verificationResult.status === "pending"
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                      : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                }`}
              >
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold uppercase block mb-0.5">
                    {verificationResult.status === "success"
                      ? "Amana Imethibitishwa!"
                      : verificationResult.status === "pending"
                        ? "Inasubiri Uhakiki wa SMS"
                        : "Uhakiki Umefeli"}
                  </span>
                  <p>{verificationResult.message}</p>
                </div>
              </div>
            )}

            {/* Manual trigger to report an incomplete transaction */}
            {verificationResult.status && verificationResult.status !== "success" && !showReportForm && (
              <button
                type="button"
                onClick={openReportFormManually}
                className="text-[11px] font-bold text-amber-500 underline underline-offset-2 cursor-pointer"
              >
                {tr(
                  "Muamala haujakamilika? Bonyeza hapa kutuma ripoti",
                  "Transaction non terminée ? Cliquez ici pour signaler",
                  "Transaction not complete? Click here to report"
                )}
              </button>
            )}
          </form>

          {/* GEMINI AI HELP BOX */}
          <div
            className={`p-3.5 rounded-xl border space-y-3 ${
              theme === "light"
                ? "bg-indigo-50/50 border-indigo-200"
                : "bg-slate-950/80 border-slate-800"
            }`}
          >
            <div className="flex items-center space-x-2">
              <Bot className="w-4 h-4 text-indigo-400" />
              <h4
                className={`text-xs font-black uppercase ${
                  theme === "light" ? "text-slate-800" : "text-slate-200"
                }`}
              >
                {tr(
                  "Uliza Gemini AI",
                  "Demandez à Gemini AI",
                  "Ask Gemini AI"
                )}
              </h4>
            </div>

            <p className="text-[10.5px] text-slate-400 leading-relaxed">
              {tr(
                "Unaweza kuuliza swali lolote kuhusu TakeTalon, michezo, sheria, au hatua za miamala.",
                "Vous pouvez poser n'importe quelle question sur TakeTalon, les jeux, les règles ou les transactions.",
                "You can ask any question about TakeTalon, games, rules, or transactions."
              )}
            </p>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={geminiQuestion}
                onChange={(e) => setGeminiQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAskGemini();
                  }
                }}
                placeholder={tr(
                  "mf. Andika swali lako hapa...",
                  "ex. Posez votre question ici...",
                  "e.g. Type your question here..."
                )}
                className={`flex-1 px-3 py-2 text-xs rounded-xl border focus:outline-none ${
                  theme === "light"
                    ? "bg-white border-slate-300 text-slate-900"
                    : "bg-slate-900 border-slate-800 text-slate-100"
                }`}
              />
              <button
                type="button"
                onClick={handleAskGemini}
                disabled={geminiLoading || !geminiQuestion.trim()}
                className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black flex items-center space-x-1.5 shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {geminiLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {geminiAnswer && (
              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs leading-relaxed flex items-start space-x-2">
                <Bot className="w-4 h-4 shrink-0 mt-0.5" />
                <p>{geminiAnswer}</p>
              </div>
            )}
            {geminiError && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[11px]">
                {geminiError}
              </div>
            )}
          </div>

          {/* REPORT AN INCOMPLETE TRANSACTION */}
          {showReportForm && (
            <div
              className={`p-3.5 rounded-xl border space-y-3 ${
                theme === "light"
                  ? "bg-amber-50/60 border-amber-200"
                  : "bg-slate-950/80 border-amber-900/40"
              }`}
            >
              <div className="flex items-center space-x-2">
                <FileWarning className="w-4 h-4 text-amber-400" />
                <h4
                  className={`text-xs font-black uppercase ${
                    theme === "light" ? "text-slate-800" : "text-slate-200"
                  }`}
                >
                  {tr(
                    "Ripoti Muamala Usiokamilika",
                    "Signaler une transaction incomplète",
                    "Report an incomplete transaction"
                  )}
                </h4>
              </div>

              <p className="text-[10.5px] text-slate-400 leading-relaxed">
                {tr(
                  "Kama umetuma Unités na kuhakiki lakini muamala haujakamilika, jaza maelezo hapa chini. Timu yetu itafuatilia ripoti yako kwa kutumia namba iliyotolewa.",
                  "Si vous avez envoyé les unités et vérifié mais que la transaction n'est pas terminée, remplissez les détails ci-dessous. Notre équipe suivra votre rapport à l'aide du numéro fourni.",
                  "If you've sent the units and verified but the transaction isn't complete, fill in the details below. Our team will follow up using the provided number."
                )}
              </p>

              <div
                className={`p-2.5 rounded-xl border flex items-center justify-between ${
                  theme === "light" ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Hash className="w-3.5 h-3.5 text-amber-400" />
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-500 block">
                      {tr("Namba ya Ripoti", "Numéro de rapport", "Report Number")}
                    </span>
                    <span className="text-xs font-mono font-black text-amber-400">{reportNumber}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(reportNumber)}
                  className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-[10px] font-bold flex items-center space-x-1 active:scale-95 transition-all cursor-pointer"
                >
                  {copiedNumber === reportNumber ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{tr("Nakili", "Copier", "Copy")}</span>
                </button>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  {tr("Maelezo ya Tatizo", "Description du problème", "Issue Description")}
                </label>
                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  rows={3}
                  placeholder={tr(
                    "Eleza kwa ufupi ulichofanya na tatizo lililotokea...",
                    "Décrivez brièvement ce que vous avez fait et le problème rencontré...",
                    "Briefly describe what you did and the issue you're facing..."
                  )}
                  className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none resize-none ${
                    theme === "light"
                      ? "bg-white border-slate-300 text-slate-900"
                      : "bg-slate-900 border-slate-800 text-slate-100"
                  }`}
                />
              </div>

              {reportSubmitted ? (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>
                    {tr(
                      `Ripoti namba ${reportNumber} imetumwa. Tutawasiliana nawe hivi karibuni.`,
                      `Rapport n°${reportNumber} envoyé. Nous vous contacterons bientôt.`,
                      `Report number ${reportNumber} submitted. We'll be in touch soon.`
                    )}
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmitReport}
                  disabled={reportSubmitting}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60"
                >
                  {reportSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{tr("Inatuma Ripoti...", "Envoi en cours...", "Submitting...")}</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{tr("TUMA RIPOTI", "ENVOYER LE RAPPORT", "SUBMIT REPORT")}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
