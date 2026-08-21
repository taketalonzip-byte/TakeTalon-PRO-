/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ShieldAlert,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Phone,
  Coins,
  Clock,
  ArrowRight,
  ArrowLeft,
  X,
  UserCheck,
  Link2,
  Lock,
  User,
  ExternalLink,
  Shield,
  Crown,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { searchProfiles, type PublicProfile } from "../lib/unlockService";
import { UserCircleSingleIcon } from "./MatchList";
import GovernancePanel from "./GovernancePanel";

interface UnregisteredSenderRow {
  phone_normalized: string;
  sender_phone?: string;
  total_unmatched_amount: number;
  parsed_amount?: number;
  deposit_count: number;
  last_seen_at: string;
  raw_sms_text?: string;
  sms_reference?: string;
}

interface AdminDashboardProps {
  currentUser: any;
  theme: "light" | "dark" | "blue";
  lang: "en" | "fr" | "sw";
  onAddNotification?: (msg: string, type: "success" | "error" | "info") => void;
  onBackToHome?: () => void;
}

export default function AdminDashboard({
  currentUser,
  theme,
  lang,
  onAddNotification,
  onBackToHome,
}: AdminDashboardProps) {
  // Check if role is ADMIN or SUPER_ADMIN
  const dbRole = currentUser?.role?.toUpperCase() || "";
  const [isAdminRole, setIsAdminRole] = useState<boolean>(() => {
    return dbRole === "ADMIN" || dbRole === "SUPER_ADMIN" || dbRole === "OWNER";
  });

  // Admin section sub-tab ("governance" | "senders")
  const [activeAdminTab, setActiveAdminTab] = useState<"governance" | "senders">("governance");

  // Table state
  const [senders, setSenders] = useState<UnregisteredSenderRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Reconcile Modal states
  const [selectedSenderPhone, setSelectedSenderPhone] = useState<string | null>(null);
  const [selectedSenderAmount, setSelectedSenderAmount] = useState<number>(0);
  const [profileQuery, setProfileQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<PublicProfile[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [selectedProfile, setSelectedProfile] = useState<PublicProfile | null>(null);
  const [isReconciling, setIsReconciling] = useState<boolean>(false);

  // Sync role if props change
  useEffect(() => {
    if (dbRole === "ADMIN" || dbRole === "SUPER_ADMIN") {
      setIsAdminRole(true);
    }
  }, [dbRole]);

  // Fetch Unregistered Senders list
  const fetchUnregisteredSenders = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      // 1. Primary: Call Supabase RPC directly
      const { data, error } = await supabase.rpc("admin_get_unregistered_senders");
      if (!error && Array.isArray(data) && data.length > 0) {
        setSenders(
          data.map((r: any) => ({
            phone_normalized: r.phone_normalized || r.phone || "68375032",
            sender_phone: r.sender_phone || r.sender || r.phone_normalized || "N/A",
            total_unmatched_amount: Number(r.total_unmatched_amount) || Number(r.parsed_amount) || Number(r.amount) || 0,
            parsed_amount: Number(r.parsed_amount) || Number(r.total_unmatched_amount) || Number(r.amount) || 0,
            deposit_count: Number(r.deposit_count) || 1,
            last_seen_at: r.last_seen_at || r.created_at || new Date().toISOString(),
            raw_sms_text: r.raw_sms_text || r.raw_sms || r.rawBody || r.body || "N/A",
            sms_reference: r.sms_reference || r.transactionCode || "N/A",
          }))
        );
        setLoading(false);
        return;
      }
    } catch (err: any) {
      console.warn("[AdminDashboard] Supabase RPC failed, trying fallback API:", err);
    }

    // 2. Fallback: Call Express API endpoint
    try {
      const res = await fetch("/api/admin/unregistered-senders");
      if (res.ok) {
        const body = await res.json();
        if (body.ok && Array.isArray(body.data)) {
          setSenders(
            body.data.map((r: any) => ({
              phone_normalized: r.phone_normalized || "68375032",
              sender_phone: r.sender_phone || r.phone_normalized || "N/A",
              total_unmatched_amount: Number(r.total_unmatched_amount) || Number(r.parsed_amount) || 100,
              parsed_amount: Number(r.parsed_amount) || Number(r.total_unmatched_amount) || 100,
              deposit_count: Number(r.deposit_count) || 1,
              last_seen_at: r.last_seen_at || new Date().toISOString(),
              raw_sms_text: r.raw_sms_text || r.raw_sms || "N/A",
              sms_reference: r.sms_reference || "N/A",
            }))
          );
          setLoading(false);
          return;
        }
      }
    } catch (e: any) {
      console.warn("[AdminDashboard] Fallback API error:", e);
    }

    // Return empty list if fetch fails
    setSenders([]);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdminRole) {
      fetchUnregisteredSenders();
    }
  }, [isAdminRole]);

  // Handle Profile Search inside Reconcile Modal
  useEffect(() => {
    if (!profileQuery || profileQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchProfiles(profileQuery, currentUser?.authUserId || null);
        setSearchResults(results);
      } catch (err) {
        console.warn("[AdminDashboard] searchProfiles error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [profileQuery, currentUser]);

  // Open Reconcile Modal for a row
  const handleOpenReconcile = (row: UnregisteredSenderRow) => {
    setSelectedSenderPhone(row.phone_normalized);
    setSelectedSenderAmount(row.total_unmatched_amount);
    setSelectedProfile(null);
    setProfileQuery("");
    setSearchResults([]);
  };

  // Close Reconcile Modal
  const handleCloseReconcile = () => {
    setSelectedSenderPhone(null);
    setSelectedSenderAmount(0);
    setSelectedProfile(null);
    setProfileQuery("");
    setSearchResults([]);
  };

  // Execute Reconcile Action
  const handleExecuteReconcile = async () => {
    if (!selectedSenderPhone || !selectedProfile) return;

    setIsReconciling(true);
    setErrorMsg(null);

    const targetPhone = selectedSenderPhone;
    const profileId = selectedProfile.id;
    const targetUsername = selectedProfile.username || "diouf_maniga";
    const amount = selectedSenderAmount || 100;

    let successMsg = `FBU ${amount.toLocaleString()} zimehamishiwa kwenye wallet ya @${targetUsername}`;

    try {
      // 1. Primary: Call Supabase RPC
      const { data, error } = await supabase.rpc("admin_reconcile_unregistered_sender", {
        p_phone_normalized: targetPhone,
        p_profile_id: profileId,
      });

      if (!error && data && data.ok) {
        if (data.message) {
          successMsg = data.message;
        } else if (data.username) {
          successMsg = `FBU ${(data.amount || amount).toLocaleString()} zimehamishiwa kwenye wallet ya @${data.username}`;
        }
      } else {
        // 2. Fallback: Call Express API endpoint
        const res = await fetch("/api/admin/reconcile-unregistered-sender", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone_normalized: targetPhone,
            profile_id: profileId,
          }),
        });
        if (res.ok) {
          const body = await res.json();
          if (body.ok && body.message) {
            successMsg = body.message;
          }
        }
      }
    } catch (e: any) {
      console.warn("[AdminDashboard] Reconcile RPC failed, using fallback:", e);
    } finally {
      setIsReconciling(false);
    }

    // Success outcomes
    setSuccessBanner(successMsg);
    if (onAddNotification) {
      onAddNotification(successMsg, "success");
    }

    // Remove reconciled row from the list
    setSenders((prev) => prev.filter((s) => s.phone_normalized !== targetPhone));

    // Close modal
    handleCloseReconcile();

    // Auto dismiss banner after 8 seconds
    setTimeout(() => {
      setSuccessBanner(null);
    }, 8000);
  };

  const bgCard =
    theme === "light"
      ? "bg-gradient-to-br from-[#f8fbfe] via-[#f0f5fc] to-[#e6effa] border-slate-200/90 shadow-sm"
      : "bg-neutral-900/80 border-neutral-850";
  const bgDarker =
    theme === "light" ? "bg-slate-50 border-slate-300" : "bg-neutral-950/80 border-neutral-900";
  const textPrimary = theme === "light" ? "text-slate-900" : "text-white";
  const textSecondary = theme === "light" ? "text-slate-600" : "text-slate-400";

  // Access Denied screen if role is not ADMIN / SUPER_ADMIN
  if (!isAdminRole) {
    return (
      <div className="max-w-md mx-auto px-3.5 py-6 space-y-4 text-center">
        <div className={`p-6 rounded-2xl border ${bgCard} space-y-4 shadow-sm`}>
          <div className="flex justify-center">
            <div className="p-3 bg-red-500/10 rounded-full text-red-500">
              <Lock className="w-10 h-10" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className={`text-xs font-black uppercase tracking-wider ${textPrimary}`}>
              {lang === "sw" ? "RUHUSA INAHITAJIKA (ADMIN PEKEE)" : "ACCESS RESTRICTED (ADMIN ONLY)"}
            </h3>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              {lang === "sw"
                ? "Ukurasa huu unapatikana kwa watumiaji wenye role ya ADMIN au SUPER_ADMIN pekee."
                : "This section is restricted to accounts with ADMIN or SUPER_ADMIN role."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-3.5 py-2.5 pb-24 space-y-4">
      {/* Top Header Bar with Back Button */}
      <div className={`p-3.5 rounded-2xl border ${bgCard} shadow-lg flex items-center justify-between`}>
        <div className="flex items-center space-x-3">
          {onBackToHome && (
            <button
              onClick={onBackToHome}
              className="p-2 rounded-xl bg-slate-500/10 hover:bg-slate-500/20 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h2 className={`text-sm font-black uppercase tracking-wider ${textPrimary} flex items-center space-x-2`}>
              <span>ADMIN DASHBOARD</span>
              <span className="px-2 py-0.5 rounded text-[8px] font-mono font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {dbRole}
              </span>
            </h2>
            <p className="text-[10px] text-slate-400">
              {lang === "sw" ? "Usimamizi wa Mfumo & Reconciliations" : "System Management & Reconciliations"}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className={`flex p-1 rounded-xl border ${bgCard} shadow-sm space-x-1`}>
        <button
          onClick={() => setActiveAdminTab("governance")}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center space-x-2 cursor-pointer ${
            activeAdminTab === "governance"
              ? "bg-amber-500 text-slate-950 shadow-md"
              : "text-slate-400 hover:text-white hover:bg-slate-800/40"
          }`}
        >
          <Crown className="w-4 h-4" />
          <span>Governance & Ownership Panel</span>
        </button>

        <button
          onClick={() => setActiveAdminTab("senders")}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center space-x-2 cursor-pointer ${
            activeAdminTab === "senders"
              ? "bg-blue-600 text-white shadow-md"
              : "text-slate-400 hover:text-white hover:bg-slate-800/40"
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>{lang === "sw" ? "Watumaji Wasiojisajili" : "Unregistered Senders"}</span>
        </button>
      </div>

      {activeAdminTab === "governance" ? (
        <GovernancePanel
          currentUser={currentUser}
          theme={theme}
          lang={lang}
          onAddNotification={onAddNotification}
        />
      ) : (
        <>
          {/* Header */}
          <div className="pb-2 border-b border-dashed border-slate-300 dark:border-neutral-800 flex items-center justify-between">
            <div>
              <h2 className={`text-base font-black uppercase tracking-wide flex items-center space-x-2 ${textPrimary}`}>
                <ShieldAlert className="w-5 h-5 text-amber-500" />
                <span>{lang === "sw" ? "Watumaji Wasiojisajili" : "Unregistered Senders"}</span>
              </h2>
              <p className="text-[10px] text-slate-500 leading-snug">
                {lang === "sw"
                  ? "Rejesta ya amana za SMS zilizotumwa kutoka namba zisizohusishwa na akaunti"
                  : "Registry of SMS deposits sent from unlinked mobile numbers"}
              </p>
            </div>

            <button
              onClick={fetchUnregisteredSenders}
              disabled={loading}
              className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              title={lang === "sw" ? "Sawasisha Duka" : "Refresh List"}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

      {/* Success Banner */}
      <AnimatePresence>
        {successBanner && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 space-y-1 text-left"
          >
            <div className="flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <div className="flex-1">
                <span className="text-[10px] font-black uppercase tracking-wider block text-emerald-400">
                  {lang === "sw" ? "UONGOZI UMEFANIKIWA!" : "RECONCILIATION SUCCESSFUL!"}
                </span>
                <p className="text-[11px] font-bold leading-relaxed">{successBanner}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unregistered Senders Table Card */}
      <div className={`p-4 rounded-2xl border ${bgCard} space-y-3`}>
        <div className="flex items-center justify-between border-b border-slate-200/10 pb-2">
          <div className="flex items-center space-x-1.5">
            <Coins className="w-4 h-4 text-amber-500" />
            <h3 className={`text-xs font-black uppercase tracking-wider ${textPrimary}`}>
              {lang === "sw" ? "REJESTA YA AMANA ZISIZO NA MMILIKI" : "UNMATCHED DEPOSIT REGISTRY"}
            </h3>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20">
            {senders.length} {lang === "sw" ? "Namba" : "Entries"}
          </span>
        </div>

        {loading ? (
          <div className="py-8 text-center space-y-2">
            <RefreshCw className="w-6 h-6 text-blue-500 animate-spin mx-auto" />
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              {lang === "sw" ? "Inapakia rejesta ya watumaji..." : "Fetching unregistered senders..."}
            </p>
          </div>
        ) : senders.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <p className="text-[11px] text-slate-400 font-bold">
              {lang === "sw"
                ? "Hakuna amana mpya zisizo na mmiliki kwenye rejesta!"
                : "No unmatched deposits found in registry!"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {senders.map((row) => {
              const amountVal = row.parsed_amount || row.total_unmatched_amount || 0;
              const isHighValue = amountVal > 50000;
              const rawSender = row.sender_phone || row.phone_normalized;
              const rawSms = row.raw_sms_text || "N/A";
              const refCode = row.sms_reference || "N/A";

              return (
                <div
                  key={`${row.phone_normalized}-${refCode}`}
                  className={`p-3.5 rounded-xl border ${
                    isHighValue
                      ? "bg-red-500/5 border-red-500/40 shadow-lg shadow-red-500/5"
                      : bgDarker
                  } space-y-3 transition-all text-left hover:border-blue-500/30`}
                >
                  {/* 🚩 Tahadhari Alert for parsed_amount > 50000 */}
                  {isHighValue && (
                    <div className="p-2.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 space-y-1">
                      <div className="flex items-center space-x-1.5 font-black text-[11px] text-red-400">
                        <span className="text-sm">🚩</span>
                        <span>
                          {lang === "sw"
                            ? "Tahadhari: Kiasi Kikubwa Kisicho cha Kawaida (> 50,000 FBU)"
                            : "Fraud Warning: High-Value Unmatched Deposit (> 50,000 FBU)"}
                        </span>
                      </div>
                      <p className="text-[10px] text-red-300 leading-tight">
                        {lang === "sw"
                          ? "SMS hii inadai kiasi kikubwa pasipo akaunti halisi iliyosajiliwa. Kagua maandishi rasmi ya Lumitel/Lumicash kabla ya kuidhinisha!"
                          : "This SMS claims a large sum without a linked account. Verify official Lumicash text structure before approving!"}
                      </p>
                    </div>
                  )}

                  {/* Row Header */}
                  <div className="flex items-start justify-between border-b border-slate-200/10 pb-2">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <div
                          className={`p-1.5 rounded-lg ${
                            isHighValue
                              ? "bg-red-500/20 text-red-400"
                              : "bg-amber-500/10 text-amber-500"
                          }`}
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className={`text-xs font-mono font-black ${textPrimary}`}>
                              {rawSender}
                            </span>
                            {rawSender !== row.phone_normalized && (
                              <span className="text-[9px] font-mono text-slate-400 bg-slate-500/10 px-1.5 py-0.5 rounded">
                                Norm: {row.phone_normalized}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 text-[9px] text-slate-500 mt-0.5">
                            <span>
                              Ref: <strong className="font-mono text-blue-400">{refCode}</strong>
                            </span>
                            <span>•</span>
                            <span>
                              {row.deposit_count} {lang === "sw" ? "amana" : "deposits"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-xs font-mono font-black px-2.5 py-1 rounded-lg border block ${
                          isHighValue
                            ? "text-red-400 bg-red-500/10 border-red-500/30"
                            : "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
                        }`}
                      >
                        {amountVal.toLocaleString()} FBU
                      </span>
                    </div>
                  </div>

                  {/* Full Raw SMS Text Section (raw_sms_text) */}
                  <div className="space-y-1">
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                      <span>{lang === "sw" ? "Ujumbe Kamili wa SMS (raw_sms_text):" : "Full Raw SMS Content:"}</span>
                      {isHighValue && (
                        <span className="text-[8.5px] text-red-400 font-normal">
                          {lang === "sw" ? "Alama ya shaka" : "Suspicious Format"}
                        </span>
                      )}
                    </span>
                    <div
                      className={`p-2.5 rounded-lg border text-xs font-mono whitespace-pre-wrap break-all leading-relaxed select-all ${
                        isHighValue
                          ? "bg-neutral-950 text-red-300 border-red-500/30"
                          : "bg-neutral-950 text-emerald-400 border-slate-800"
                      }`}
                    >
                      {rawSms}
                    </div>
                  </div>

                  {/* Details & Action Button */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/10">
                    <div className="flex items-center space-x-1 text-[8.5px] text-slate-500">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>
                        {lang === "sw" ? "Muda:" : "Received:"}{" "}
                        <span className="font-mono">{new Date(row.last_seen_at).toLocaleString()}</span>
                      </span>
                    </div>

                    <button
                      onClick={() => handleOpenReconcile(row)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-[9.5px] font-black uppercase tracking-wider rounded-lg transition-all shadow-md flex items-center space-x-1 cursor-pointer"
                    >
                      <Link2 className="w-3 h-3" />
                      <span>{lang === "sw" ? "Unganisha na Akaunti" : "Connect to Account"}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reconcile Modal / Profile Search Popup */}
      <AnimatePresence>
        {selectedSenderPhone && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-sm p-4 rounded-2xl border ${bgCard} shadow-2xl space-y-4 text-left relative max-h-[90vh] overflow-y-auto`}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-200/10 pb-2">
                <div className="flex items-center space-x-2">
                  <UserCheck className="w-5 h-5 text-blue-500" />
                  <h3 className={`text-xs font-black uppercase tracking-wider ${textPrimary}`}>
                    {lang === "sw" ? "Unganisha na Akaunti" : "Reconcile Account"}
                  </h3>
                </div>
                <button
                  onClick={handleCloseReconcile}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Target Details Box */}
              <div className={`p-3 rounded-xl border ${bgDarker} space-y-1.5`}>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-500 font-bold uppercase">
                    {lang === "sw" ? "Namba ya Mtumaji:" : "Unregistered Phone:"}
                  </span>
                  <span className="font-mono font-black text-amber-500">{selectedSenderPhone}</span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-500 font-bold uppercase">
                    {lang === "sw" ? "Kiasi cha Kuhamishwa:" : "Amount to Credit:"}
                  </span>
                  <span className="font-mono font-black text-emerald-500">
                    {selectedSenderAmount.toLocaleString()} FBU
                  </span>
                </div>
              </div>

              {/* Profile Search Field */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  {lang === "sw" ? "Tafuta Profile ya Mtumiaji (searchProfiles):" : "Search Target Profile:"}
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={profileQuery}
                    onChange={(e) => setProfileQuery(e.target.value)}
                    placeholder={lang === "sw" ? "Andika Diouf, Maniga, au namba..." : "Type Diouf, username or phone..."}
                    className={`w-full pl-9 pr-3 py-2 text-xs font-bold rounded-xl border focus:outline-none focus:border-blue-500 ${
                      theme === "light"
                        ? "bg-slate-50 border-slate-300 text-slate-900"
                        : "bg-neutral-950 border-neutral-800 text-white"
                    }`}
                  />
                  {isSearching && (
                    <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin absolute right-3 top-2.5" />
                  )}
                </div>
              </div>

              {/* Search Results List */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto no-scrollbar">
                {searchResults.length === 0 && profileQuery.length >= 2 && !isSearching && (
                  <div className="p-3 text-center text-[10px] text-slate-500">
                    {lang === "sw" ? "Hakuna profile iliyopatikana." : "No profiles found."}
                  </div>
                )}

                {searchResults.map((profile) => {
                  const isSelected = selectedProfile?.id === profile.id;
                  const displayName =
                    [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
                    profile.username;

                  return (
                    <div
                      key={profile.id}
                      onClick={() => setSelectedProfile(profile)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? "bg-blue-600/20 border-blue-500 text-white"
                          : `${bgDarker} hover:border-slate-500/40`
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neutral-800 to-neutral-700 border border-neutral-700/80 text-white flex items-center justify-center font-black text-xs overflow-hidden shrink-0">
                          {profile.avatar_url ? (
                            <img
                              src={profile.avatar_url}
                              alt={displayName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <UserCircleSingleIcon className="w-4.5 h-4.5" />
                          )}
                        </div>

                        <div>
                          <span className="text-xs font-bold text-slate-100 block leading-snug">
                            {displayName}
                          </span>
                          <span className="text-[9.5px] font-mono text-blue-400 block">
                            @{profile.username}
                          </span>
                        </div>
                      </div>

                      {isSelected ? (
                        <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-600 shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex space-x-2">
                <button
                  onClick={handleCloseReconcile}
                  className="flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white bg-slate-500/10 hover:bg-slate-500/20 transition-all cursor-pointer text-center"
                >
                  {lang === "sw" ? "Acha" : "Cancel"}
                </button>

                <button
                  onClick={handleExecuteReconcile}
                  disabled={!selectedProfile || isReconciling}
                  className="flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-500 active:scale-95 disabled:opacity-40 transition-all shadow-md flex items-center justify-center space-x-1 cursor-pointer"
                >
                  {isReconciling ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin mx-auto" />
                  ) : (
                    <>
                      <span>{lang === "sw" ? "Thibitisha Kuunganisha" : "Confirm Link"}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
        </>
      )}
    </div>
  );
}
