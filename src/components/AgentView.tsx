/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ShieldCheck,
  UserCheck,
  Smartphone,
  Send,
  AlertTriangle,
  HelpCircle,
  Sparkles,
  Coins,
  KeyRound,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Copy,
  ShieldAlert,
} from "lucide-react";
import AdminDashboard from "./AdminDashboard";

interface AgentViewProps {
  theme: "light" | "dark" | "blue";
  lang: "en" | "fr" | "sw";
  currentUser: any;
  userBalance: number;
  onUpdateBalance: (amount: number) => void;
  onAddTransaction: (desc: string, amount: number, type: "DEPOSIT" | "WITHDRAWAL") => void;
  onAddNotification?: (msg: string, type: "success" | "error" | "info") => void;
  onBackToHome?: () => void;
}

export default function AgentView({
  theme,
  lang,
  currentUser,
  userBalance,
  onUpdateBalance,
  onAddTransaction,
  onAddNotification,
  onBackToHome,
}: AgentViewProps) {
  // Agent Status
  const [isAgent, setIsAgent] = useState<boolean>(() => {
    return currentUser?.role === "AGENT" || currentUser?.role === "ADMIN" || currentUser?.role === "SUPER_ADMIN";
  });

  const [subTab, setSubTab] = useState<"agent" | "unregistered">("agent");

  // Secret base solde for voucher check
  const [agentSystemBalance, setAgentSystemBalance] = useState<number>(() => {
    const isRoleAgent = currentUser?.role === "AGENT" || currentUser?.role === "ADMIN" || currentUser?.role === "SUPER_ADMIN";
    return isRoleAgent ? 13.5 : 0;
  });

  const [tempInputBalance, setTempInputBalance] = useState<number>(agentSystemBalance);

  useEffect(() => {
    setTempInputBalance(agentSystemBalance);
  }, [agentSystemBalance]);

  // SMS Simulator inputs
  const [simPhone, setSimPhone] = useState<string>(currentUser?.phone || "");
  const [simAmount, setSimAmount] = useState<number>(2000);
  const [simSmsText, setSimSmsText] = useState<string>("");

  // Validation verification states
  const [showResult, setShowResult] = useState<boolean>(false);
  const [checkAccount, setCheckAccount] = useState<boolean | null>(null);
  const [checkMath, setCheckMath] = useState<boolean | null>(null);
  const [resultMessage, setResultMessage] = useState<string>("");
  const [resultType, setResultType] = useState<"success" | "error" | "">("");

  // SMS Webhook Diagnostics States
  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);
  const [fetchingLogs, setFetchingLogs] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopyWebhook = () => {
    const webhookUrl = `${window.location.origin}/api/sms-forwarder`;
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fetchSmsLogs = () => {
    setFetchingLogs(true);
    fetch("/api/sms-gateway")
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.auditLogs)) {
          setWebhookLogs((prev) => {
            const existingIds = new Set(prev.map((l) => l.requestId));
            const newLogs = data.auditLogs.filter((l: any) => !existingIds.has(l.requestId));

            let merged = data.auditLogs;
            if (data.auditLogs.length === 0 && prev.length > 0) {
              merged = prev;
            } else if (newLogs.length > 0 || prev.length > data.auditLogs.length) {
              const all = [...data.auditLogs, ...prev];
              const unique = Array.from(
                new Map(all.map((item) => [item.requestId, item])).values(),
              );
              merged = unique.sort(
                (a: any, b: any) =>
                  new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
              );
            }

            return merged;
          });
        }
      })
      .catch((err) => {
        // Silently capture or log non-intrusively to prevent "Failed to fetch" console red warnings
        console.log("[SMS-GATEWAY] Server connection is reconnecting...");
      })
      .finally(() => setFetchingLogs(false));
  };

  // Poll for live incoming SMS forwarder logs every 5 seconds when agent view is open
  useEffect(() => {
    if (!isAgent) return;
    fetchSmsLogs();
    const interval = setInterval(fetchSmsLogs, 5000);
    return () => clearInterval(interval);
  }, [isAgent]);

  // Auto-generate SMS string based on input parameters
  useEffect(() => {
    const expectedFinalBalance = agentSystemBalance + Number(simAmount);
    const formattedFinal = parseFloat(expectedFinalBalance.toFixed(2));
    setSimSmsText(
      `L'abonne ${simPhone} vous a envoye ${simAmount} Fbu. Votre solde de credit est ${formattedFinal} Fbu. Merci.`,
    );
  }, [simPhone, simAmount, agentSystemBalance]);

  const handleJoinAgent = () => {
    if (!currentUser || !currentUser.isLoggedIn) {
      alert(lang === "sw" ? "Tafadhali jisajili kwanza!" : "Please register first!");
      return;
    }

    if (userBalance < 1000) {
      alert(
        lang === "sw"
          ? "Salio lako halitoshi! Unahitaji FBU 1,000 kujiunga na Wakala wa TakeTalon."
          : "Your balance is insufficient! You need 1,000 FBU to join TakeTalon Agent.",
      );
      return;
    }

    // Deduct fee and join
    onUpdateBalance(-1000);
    onAddTransaction(
      lang === "sw" ? "Kujiunga na TakeTalon Agent" : "Joined TakeTalon Agent Program",
      -1000,
      "WITHDRAWAL",
    );
    setIsAgent(true);

    alert(
      lang === "sw"
        ? "✅ Hongera! Umefanikiwa kujiunga na Wakala wa TakeTalon. Namba yako ya uwakala imeamilishwa!"
        : "✅ Congratulations! You have successfully joined as a TakeTalon Agent. Your agent ID is now active!",
    );
  };

  const handleProcessSMS = () => {
    setShowResult(true);

    // Parse SMS elements
    // Pre-extract data using regex
    const phoneRegex = /L'abonne\s+(\d+)\s+vous\s+a\s+envoye/i;
    const amountRegex = /envoye\s+(\d+(?:\.\d+)?)\s+Fbu/i;
    const balanceRegex = /Votre\s+solde\s+de\s+credit\s+est\s+(\d+(?:\.\d+)?)\s+Fbu/i;

    const phoneMatch = simSmsText.match(phoneRegex);
    const amountMatch = simSmsText.match(amountRegex);
    const balanceMatch = simSmsText.match(balanceRegex);

    if (!phoneMatch || !amountMatch || !balanceMatch) {
      setCheckAccount(false);
      setCheckMath(false);
      setResultType("error");
      setResultMessage(
        lang === "sw"
          ? "Muundo wa SMS hautambuliki au umeharibika! Tafadhali hakiki herufi na namba."
          : "SMS format unrecognized or corrupted! Please check formatting and numbers.",
      );
      return;
    }

    const parsedPhone = phoneMatch[1];
    const parsedAmount = parseFloat(amountMatch[1]);
    const parsedFinalBalance = parseFloat(balanceMatch[1]);

    const cleanPhoneStr = (p: string) => {
      let clean = p.replace(/\s+/g, "");
      if (clean.startsWith("+257")) clean = clean.substring(4);
      else if (clean.startsWith("257") && clean.length > 8) clean = clean.substring(3);
      return clean;
    };

    // Check 1: Account Validation
    // Valid if matches our logged-in user or the simulation phone
    const hasAccount =
      parsedPhone === currentUser?.phone ||
      parsedPhone === simPhone ||
      (currentUser?.phone && cleanPhoneStr(parsedPhone) === cleanPhoneStr(currentUser.phone));
    setCheckAccount(hasAccount);

    // Check 2: Formula Validation (initial balance + amount === final balance)
    const expectedNewBalance = agentSystemBalance + parsedAmount;
    const difference = expectedNewBalance - parsedFinalBalance;
    const mathValid = Math.abs(difference) < 0.01;
    setCheckMath(mathValid);

    if (!hasAccount) {
      setResultType("error");
      setResultMessage(
        lang === "sw"
          ? `❌ Mchakato umefeli: Namba ${parsedPhone} haina akaunti yoyote ya TakeTalon.`
          : `❌ Process Failed: Phone number ${parsedPhone} has no TakeTalon account.`,
      );
      return;
    }

    if (!mathValid) {
      setResultType("error");
      setResultMessage(
        lang === "sw"
          ? `❌ Kulinda Utapeli (Scam Guard): Salio la kuanzia (${agentSystemBalance.toLocaleString()}) + kiasi kilichotumwa (${parsedAmount.toLocaleString()}) kinapaswa kulingana na salio jipya linalodaiwa (${parsedFinalBalance.toLocaleString()}). Tofauti ya kutoa ni ${difference.toLocaleString()} (inapaswa kuwa 0). Huu ni utapeli.`
          : `❌ Scam Blocked: Initial balance (${agentSystemBalance.toLocaleString()}) + transfer (${parsedAmount.toLocaleString()}) should be ${expectedNewBalance.toLocaleString()} FBU, but SMS claims it is ${parsedFinalBalance.toLocaleString()} FBU! Subtraction difference is ${difference.toLocaleString()} (expected 0). Fraud alert.`,
      );
      return;
    }

    // Both checks pass!
    setAgentSystemBalance(parsedFinalBalance);

    // Only update local logged-in user balance if the logged-in user is actually the sender!
    const loggedInClean = cleanPhoneStr(currentUser?.phone || "");
    const senderClean = cleanPhoneStr(parsedPhone);

    if (loggedInClean === senderClean) {
      onUpdateBalance(parsedAmount);
      onAddTransaction(
        lang === "sw"
          ? `Deposit ya Vocha kupitia Wakala (${parsedPhone})`
          : `Voucher Deposit via Agent (${parsedPhone})`,
        parsedAmount,
        "DEPOSIT",
      );
    }

    setResultType("success");
    setResultMessage(
      lang === "sw"
        ? `✅ Hongera! Vocha imehakikiwa kikamilifu. FBU ${parsedAmount} zimeongezwa kwenye akaunti ya namba ${parsedPhone}!`
        : `✅ Success! Voucher fully verified. ${parsedAmount} FBU credited to account ${parsedPhone}!`,
    );
  };

  const textPrimary = theme === "light" ? "text-slate-900" : "text-white";
  const textSecondary = theme === "light" ? "text-slate-600" : "text-slate-400";
  const bgCard =
    theme === "light"
      ? "bg-gradient-to-br from-[#f8fbfe] via-[#f0f5fc] to-[#e6effa] border-slate-200/90 shadow-sm"
      : "bg-neutral-900/60 border-neutral-850";
  const bgDarker =
    theme === "light" ? "bg-slate-50 border-slate-300" : "bg-neutral-950/80 border-neutral-900";

  const userRole = (currentUser?.role || "").toUpperCase();
  const isAdminOrAgent =
    userRole === "ADMIN" || userRole === "SUPER_ADMIN" || isAgent;

  if (subTab === "unregistered") {
    return (
      <div className="space-y-3">
        {/* Sub-tab switcher */}
        <div className="max-w-md mx-auto px-3.5 pt-2 flex space-x-1">
          <button
            onClick={() => setSubTab("agent")}
            className={`flex-1 py-1.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              subTab === "agent"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-slate-500/10 text-slate-400 hover:text-white"
            }`}
          >
            {lang === "sw" ? "Wakala Hub" : "Agent Hub"}
          </button>
          <button
            onClick={() => setSubTab("unregistered")}
            className={`flex-1 py-1.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              subTab === "unregistered"
                ? "bg-amber-600 text-white shadow-md"
                : "bg-slate-500/10 text-slate-400 hover:text-white"
            }`}
          >
            {lang === "sw" ? "Watumaji Wasiojisajili (Admin)" : "Unregistered Senders (Admin)"}
          </button>
        </div>

        <AdminDashboard
          currentUser={currentUser}
          theme={theme}
          lang={lang}
          onAddNotification={onAddNotification}
        />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-3.5 py-2.5 pb-24 space-y-4">
      {/* Title Header & Sub-tab switcher */}
      <div className="space-y-2 pb-2 border-b border-dashed border-slate-300 dark:border-neutral-800">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2.5">
            {onBackToHome && (
              <button
                onClick={onBackToHome}
                className={`p-2 rounded-xl border flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0 ${
                  theme === "light"
                    ? "bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200"
                    : theme === "dark"
                      ? "bg-neutral-900 border-neutral-800 text-slate-100 hover:bg-neutral-800"
                      : "bg-[#25486c] border-blue-400/30 text-white hover:bg-[#2c537b]"
                }`}
                title={lang === "sw" ? "Rudi Nyumbani" : "Back to Home"}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h2
                className={`text-base font-black uppercase tracking-wide flex items-center space-x-2 ${textPrimary}`}
              >
                <ShieldCheck className="w-5 h-5 text-blue-500" />
                <span>{lang === "sw" ? "Wakala wa TakeTalon" : "TakeTalon Agent Hub"}</span>
              </h2>
              <p className="text-[10px] text-slate-500 leading-snug">
                {lang === "sw"
                  ? "Jiunge na mtandao wa mawakala kupokea amana za vocha kote nchini"
                  : "Join the networks of agents processing mobile voucher deposits"}
              </p>
            </div>
          </div>

          <button
            onClick={() => setSubTab("unregistered")}
            className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 text-[9px] font-black uppercase tracking-wider flex items-center space-x-1 cursor-pointer shrink-0"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Admin</span>
          </button>
        </div>

        {/* Sub-tab pill bar */}
        <div className="flex space-x-1 pt-1">
          <button
            onClick={() => setSubTab("agent")}
            className={`flex-1 py-1.5 px-2 rounded-xl text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              subTab === "agent"
                ? "bg-blue-600 text-white shadow"
                : "bg-slate-500/10 text-slate-400 hover:text-white"
            }`}
          >
            {lang === "sw" ? "Wakala Hub" : "Agent Hub"}
          </button>
          <button
            onClick={() => setSubTab("unregistered")}
            className={`flex-1 py-1.5 px-2 rounded-xl text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              subTab === "unregistered"
                ? "bg-amber-600 text-white shadow"
                : "bg-slate-500/10 text-slate-400 hover:text-white"
            }`}
          >
            {lang === "sw" ? "Watumaji Wasiojisajili (Admin)" : "Unregistered Senders (Admin)"}
          </button>
        </div>
      </div>

      {!isAgent ? (
        /* Sign up Screen */
        <div className={`p-4 rounded-2xl border ${bgCard} space-y-4 shadow-sm`}>
          <div className="flex justify-center">
            <div className="p-3 bg-blue-500/10 rounded-full text-blue-500 animate-pulse">
              <UserCheck className="w-10 h-10" />
            </div>
          </div>

          <div className="text-center space-y-1">
            <h3 className={`text-xs font-black uppercase tracking-wider ${textPrimary}`}>
              {lang === "sw"
                ? "OMBA KUJIUNGA NA TAKETALON AGENT"
                : "APPLY FOR TAKETALON AGENT STATUS"}
            </h3>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              {lang === "sw"
                ? "Mawakala hupokea amana za vocha kwa namba zao za simu na mfumo wetu huzihakiki kiotomatiki sekunde chache baada ya malipo. Unapata kamisheni ya 5% ya kila amana!"
                : "Agents receive voucher code transfers on their lines. Our automated system instantly validates balances. Earn a high 5% commission on deposits!"}
            </p>
          </div>

          {/* Pricing Box */}
          <div className={`p-3 rounded-xl border ${bgDarker} flex items-center justify-between`}>
            <div className="flex items-center space-x-2">
              <Coins className="w-4 h-4 text-amber-500" />
              <div className="text-left">
                <span
                  className={`text-[10px] font-black uppercase tracking-wider block ${textPrimary}`}
                >
                  {lang === "sw" ? "Gharama ya Kujiunga" : "Admission Fee"}
                </span>
                <span className="text-[9px] text-slate-500">
                  {lang === "sw"
                    ? "Inakatwa mara moja tu kwenye mkoba"
                    : "One-time wallet deduction"}
                </span>
              </div>
            </div>
            <span className="text-xs font-mono font-black text-blue-500 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20">
              1,000 FBU
            </span>
          </div>

          <button
            onClick={handleJoinAgent}
            className="w-full py-2.5 rounded-xl text-xs font-display font-black uppercase tracking-wider text-center text-white bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all shadow-md shadow-blue-500/10 cursor-pointer flex items-center justify-center space-x-1.5"
          >
            <span>
              {lang === "sw" ? "Lipa 1,000 FBU na Kujiunga Sasa" : "Pay 1,000 FBU & Join Agent Now"}
            </span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        /* Agent Dashboard Screen */
        <div className="space-y-4">
          {/* Welcome Card */}
          <div className={`p-4 rounded-2xl border ${bgCard} space-y-3 relative overflow-hidden`}>
            <div className="absolute right-3 top-3 px-2 py-0.5 rounded-md text-[8px] font-black tracking-widest text-emerald-500 bg-emerald-500/10 border border-emerald-500/15 animate-pulse">
              ACTIVE AGENT
            </div>

            <div className="flex items-start space-x-3">
              <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h3 className={`text-xs font-black uppercase tracking-wider ${textPrimary}`}>
                  {lang === "sw"
                    ? `Wakala: ${currentUser?.username || currentUser?.name || "Mwanachama"}`
                    : `Agent: ${currentUser?.username || currentUser?.name || "Member"}`}
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                  {lang === "sw"
                    ? `Namba ya Simu: ${currentUser?.phone ? `+257 ${currentUser.phone}` : "Haijawekwa"}`
                    : `Active Phone Line: ${currentUser?.phone ? `+257 ${currentUser.phone}` : "Not set"}`}
                </p>
              </div>
            </div>

            {/* Secret Code details & Editable Balance */}
            <div className={`p-3 rounded-xl border ${bgDarker} space-y-3`}>
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                  {lang === "sw" ? "Wakala solde (Agent solde)" : "Agent Solde"}
                </span>
                <span className="text-[10px] font-mono font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  {agentSystemBalance.toLocaleString()} Fbu
                </span>
              </div>

              <div className="space-y-1.5 pt-1.5 border-t border-slate-200/50 dark:border-neutral-800/50">
                <label className="text-[8.5px] font-bold text-slate-500 uppercase tracking-wider block text-left">
                  {lang === "sw"
                    ? "Weka Solde Yako ya Kuanzia (FBU)"
                    : "Enter Your Starting Solde (FBU)"}
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    step="any"
                    value={tempInputBalance}
                    onChange={(e) =>
                      setTempInputBalance(Math.max(0, parseFloat(e.target.value) || 0))
                    }
                    className={`flex-1 px-2.5 py-1 text-[10px] font-mono border rounded-lg focus:outline-none focus:border-blue-550 ${
                      theme === "light"
                        ? "bg-white border-slate-300"
                        : "bg-neutral-950 border-neutral-800 text-white"
                    }`}
                  />
                  <button
                    onClick={() => {
                      setAgentSystemBalance(tempInputBalance);
                      alert(
                        lang === "sw"
                          ? "✅ Solde ya Wakala imesasishwa na kusawazishwa kikamilifu!"
                          : "✅ Agent Solde updated successfully!",
                      );
                    }}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-[9px] uppercase tracking-wider rounded-lg transition-all cursor-pointer"
                  >
                    {lang === "sw" ? "Hifadhi" : "Save"}
                  </button>
                </div>
              </div>

              <p className="text-[8.5px] text-slate-500 leading-relaxed text-left">
                ⚠️{" "}
                {lang === "sw"
                  ? "Kujilinda na utapeli (Anti-scam), andika solde ya awali ulilonalo hapa. Kisha mfumo utaanza kuipigia hesabu message kwa message kwa kutoa solde mpya na ya zamani."
                  : "To prevent fraudulent voucher duplicates, write your initial solde here. The system will start calculating incoming payments message-by-message using the subtraction method."}
              </p>
            </div>
          </div>

          {/* Section: Live SMS Webhook Logs */}
          <div className={`p-4 rounded-2xl border ${bgCard} space-y-3`}>
            <div className="flex items-center justify-between border-b border-slate-200/10 pb-2">
              <div className="flex items-center space-x-1.5">
                <Smartphone className="w-4 h-4 text-blue-500 animate-bounce" />
                <h3 className={`text-xs font-black uppercase tracking-wider ${textPrimary}`}>
                  {lang === "sw"
                    ? "Ujumbe wa Miamala ya Simu (Live)"
                    : "Mobile Transaction Messages (Live)"}
                </h3>
              </div>
              <button
                onClick={fetchSmsLogs}
                disabled={fetchingLogs}
                className="p-1 rounded bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${fetchingLogs ? "animate-spin" : ""}`} />
              </button>
            </div>

            {/* Real-time Webhook Configuration Box */}
            <div className="p-3 rounded-xl bg-slate-500/[0.04] border border-slate-500/10 space-y-1.5 text-left">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                {lang === "sw" ? "Webhook URL ya Copy" : "Copy Webhook URL"}
              </span>
              <div className="flex items-center space-x-1.5">
                <code className="text-[10px] font-mono p-1.5 rounded bg-black/10 dark:bg-white/10 text-blue-500 break-all select-all flex-1">
                  {typeof window !== "undefined"
                    ? `${window.location.origin}/api/sms-forwarder`
                    : "/api/sms-forwarder"}
                </code>
                <button
                  onClick={handleCopyWebhook}
                  className="p-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white active:scale-95 transition-all cursor-pointer flex items-center justify-center min-w-[50px] h-[28px]"
                  title={lang === "sw" ? "Copy URL" : "Copy URL"}
                >
                  {copied ? (
                    <span className="text-[9px] font-bold px-1">
                      {lang === "sw" ? "Tayari!" : "Copied!"}
                    </span>
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
              <p className="text-[8.5px] text-slate-400 leading-relaxed">
                {lang === "sw"
                  ? "⚠️ Hakikisha app ya kusambaza miamala ya simu inatumia Webhook URL hii kamili ili mfumo wetu upokee na kusasisha salio kiotomatiki."
                  : "⚠️ Ensure your mobile transaction gateway app is configured with this exact Webhook URL to automate transactions."}
              </p>
            </div>

            {webhookLogs.length === 0 ? (
              <div className="text-center py-6 space-y-1">
                <p className="text-[10px] text-slate-500">
                  {lang === "sw"
                    ? "Bado hakuna ujumbe mpya wa miamala uliopokelewa leo kwenye seva yetu."
                    : "No new transaction messages received yet today on our server."}
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar pr-1">
                {webhookLogs.map((log: any, idx: number) => {
                  const smsBody = log.rawPayload?.body || log.body || {};
                  const msgText =
                    smsBody.message || smsBody.text || smsBody.msg || log.rawMessage || "";
                  const sender = smsBody.sender || smsBody.from || log.sender || "Unknown";
                  const timestampStr = log.timestamp
                    ? new Date(log.timestamp).toLocaleTimeString()
                    : "";
                  const isVerified = log.parsedPayload || log.parsingStatus === "SUCCESS";

                  return (
                    <div
                      key={log.requestId || idx}
                      className={`p-2.5 rounded-xl border text-left space-y-1.5 ${
                        isVerified
                          ? "bg-emerald-500/[0.03] border-emerald-500/15"
                          : "bg-slate-500/[0.03] border-slate-500/15"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-slate-500">
                          {lang === "sw" ? "Kutoka:" : "From:"}{" "}
                          <span className="font-mono text-blue-500">{sender}</span>
                        </span>
                        <span className="text-[8px] font-mono text-slate-400">{timestampStr}</span>
                      </div>
                      <p
                        className={`text-[10px] font-mono leading-relaxed p-1.5 rounded bg-black/5 dark:bg-white/5 break-words ${textPrimary}`}
                      >
                        {msgText}
                      </p>
                      <div className="flex items-center justify-between pt-0.5">
                        <span className="text-[8px] text-slate-500">
                          ID:{" "}
                          <span className="font-mono">{log.requestId?.substring(0, 14)}...</span>
                        </span>
                        {isVerified ? (
                          <span className="flex items-center space-x-1 text-[8.5px] font-bold text-emerald-500">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{lang === "sw" ? "Imethibitishwa" : "Verified"}</span>
                          </span>
                        ) : (
                          <span className="flex items-center space-x-1 text-[8.5px] font-bold text-amber-500">
                            <AlertTriangle className="w-3 h-3" />
                            <span>{lang === "sw" ? "Haifai" : "Unverified"}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
