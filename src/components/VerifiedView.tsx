/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Award,
  Crown,
  Search,
  Zap,
  Sparkles,
  Users,
  Lock,
  Check,
  Send,
  AlertCircle,
  HelpCircle,
  Clock,
  Coins,
  ShieldAlert,
  UserCheck
} from "lucide-react";

interface VerifiedViewProps {
  theme: "light" | "dark" | "blue";
  onBackToHome: () => void;
  lang: "en" | "fr" | "sw";
  currentUser?: {
    id?: string;
    username: string;
    fullName?: string;
    email?: string;
    phone?: string;
    isLoggedIn?: boolean;
    avatarUrl?: string | null;
  } | null;
  onAddNotification?: (msg: string, type?: "success" | "info" | "error") => void;
}

export default function VerifiedView({
  theme,
  onBackToHome,
  lang,
  currentUser,
  onAddNotification,
}: VerifiedViewProps) {
  const [searchUsername, setSearchUsername] = useState("");
  const [searchResult, setSearchResult] = useState<{
    found: boolean;
    username?: string;
    fullName?: string;
    isVerified?: boolean;
    role?: string;
    winRate?: string;
    totalUnlockers?: number;
  } | null>(null);

  // Verification request form states
  const [showAppModal, setShowAppModal] = useState(false);
  const [applicantRole, setApplicantRole] = useState<"ceo" | "tipster" | "agent">("ceo");
  const [experienceMonths, setExperienceMonths] = useState("6-12");
  const [telegramOrPhone, setTelegramOrPhone] = useState(currentUser?.phone || "");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);

  const isSwahili = lang === "sw";
  const tr = (sw: string, fr: string, en: string) => (lang === "sw" ? sw : lang === "fr" ? fr : en);

  const textPrimary = theme === "light" ? "text-slate-900" : "text-white";
  const textSecondary =
    theme === "light"
      ? "text-slate-600"
      : theme === "dark"
        ? "text-neutral-300"
        : "text-blue-100/90";

  const containerBg =
    theme === "light"
      ? "bg-gradient-to-br from-[#f8fbfe] via-[#f0f5fc] to-[#e6effa] border-slate-200/90 shadow-sm"
      : theme === "dark"
        ? "bg-neutral-900 border-neutral-800 shadow-md"
        : "bg-[#1f3d5c] border-blue-400/30 shadow-md";

  const cardBg =
    theme === "light"
      ? "bg-gradient-to-br from-[#f8fbfe] via-[#f0f5fc] to-[#e6effa] border-slate-200/90 shadow-sm hover:border-blue-400/50"
      : theme === "dark"
        ? "bg-black border-neutral-800 shadow-md hover:border-neutral-700"
        : "bg-[#1f3d5c] border-blue-400/30 shadow-md hover:border-cyan-300/40";

  const heroBg =
    theme === "light"
      ? "bg-gradient-to-r from-blue-50 via-sky-50 to-indigo-50 border-blue-200"
      : theme === "dark"
        ? "bg-gradient-to-r from-neutral-950 via-neutral-900 to-black border-neutral-800"
        : "bg-gradient-to-r from-[#1a3450] via-[#224467] to-[#1a3450] border-blue-400/35";

  // Search function to verify a tipster's status
  const handleCheckUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchUsername.trim()) return;

    const term = searchUsername.trim().toLowerCase().replace("@", "");

    // Mock verification database check
    const mockVerifiedList = [
      { username: "simba_bet", fullName: "Simba VIP Tipster", isVerified: true, role: "CEO Pro", winRate: "88.4%", totalUnlockers: 1420 },
      { username: "kassim_pro", fullName: "Kassim Predictions", isVerified: true, role: "Official CEO", winRate: "91.2%", totalUnlockers: 2850 },
      { username: "taketalon_ceo", fullName: "TakeTalon Master", isVerified: true, role: "Super Admin CEO", winRate: "94.0%", totalUnlockers: 5000 },
    ];

    const match = mockVerifiedList.find((u) => u.username.toLowerCase() === term);

    if (match) {
      setSearchResult({
        found: true,
        ...match,
      });
    } else {
      setSearchResult({
        found: false,
        username: term,
        isVerified: false,
      });
    }
  };

  // Submit verification badge request
  const handleSubmitApplication = (e: React.FormEvent) => {
    e.preventDefault();
    if (!telegramOrPhone.trim() || !reason.trim()) {
      if (onAddNotification) {
        onAddNotification(
          tr("Tafadhali jaza taarifa zote zinazohitajika!", "Veuillez remplir tous les champs requis !", "Please fill in all required fields!"),
          "error"
        );
      }
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setHasApplied(true);
      setShowAppModal(false);
      if (onAddNotification) {
        onAddNotification(
          tr(
            "Ombi lako la TakeTalon Verified limepokelewa! Timu yetu inakagua namba yako.",
            "Votre demande de vérification TakeTalon a été reçue ! Examen en cours.",
            "Verification application submitted successfully! Review in progress."
          ),
          "success"
        );
      }
    }, 1200);
  };

  return (
    <div className="max-w-md mx-auto px-3.5 py-2.5 pb-28 space-y-4 text-left">
      {/* HEADER BREADCRUMB */}
      <div className="flex items-center justify-between pb-2 border-b border-dashed border-slate-300 dark:border-neutral-800">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onBackToHome}
            className={`p-2 rounded-xl border flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
              theme === "light"
                ? "bg-slate-50 border-slate-300 text-slate-800 hover:bg-slate-100"
                : "bg-neutral-900 border-neutral-800 text-slate-100 hover:bg-neutral-800"
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <span className="text-[9px] font-mono font-bold text-blue-400 uppercase tracking-widest flex items-center space-x-1">
              <span>TAKETALON VERIFIED BADGE</span>
              <CheckCircle2 className="w-3 h-3 text-blue-400 fill-blue-400/20" />
            </span>
            <h2 className={`text-sm font-black uppercase tracking-wide ${textPrimary}`}>
              TakeTalon Verified Portal
            </h2>
          </div>
        </div>

        <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center space-x-1">
          <CheckCircle2 className="w-3 h-3 text-blue-400 fill-blue-400/20" />
          <span>VERIFIED SEAL</span>
        </span>
      </div>

      {/* HERO BANNER WITH BLUE VERIFIED BADGE */}
      <div className={`p-4 rounded-2xl border ${heroBg} space-y-3 relative overflow-hidden`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="p-3 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/30 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="absolute -bottom-1 -right-1 bg-white dark:bg-neutral-900 rounded-full p-0.5 shadow">
                <CheckCircle2 className="w-4 h-4 text-blue-500 fill-blue-500/20" />
              </div>
            </div>

            <div>
              <div className="flex items-center space-x-1.5">
                <h3 className={`text-xs font-black uppercase tracking-wider ${textPrimary}`}>
                  TakeTalon Verified CEO Badge
                </h3>
                <CheckCircle2 className="w-4 h-4 text-blue-500 fill-blue-500/20 shrink-0" />
              </div>
              <p className={`text-[10.5px] leading-snug mt-0.5 ${textSecondary}`}>
                {tr(
                  "Alama rasmi ya bluu ya kuthibitishwa kwa watabiri waliohakikiwa, yenye ulinzi dhidi ya akaunti za kughushi.",
                  "Badge bleu officiel de vérification pour les pronostiqueurs authentifiés avec protection contre les faux comptes.",
                  "Official blue verification badge for authenticated tipsters & CEOs with imposter protection."
                )}
              </p>
            </div>
          </div>
        </div>

        {/* APPLICATION STATUS / CALL TO ACTION */}
        <div className="pt-2 border-t border-slate-300/40 dark:border-neutral-800 flex items-center justify-between">
          <div className="text-[10px] text-slate-400 font-mono">
            {hasApplied
              ? "status: UNDER REVIEW (24-48 HRS)"
              : "status: OPEN FOR QUALIFIED TIPSTERS"}
          </div>

          <button
            type="button"
            onClick={() => setShowAppModal(true)}
            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase shadow-md shadow-blue-500/20 transition-all active:scale-95 cursor-pointer flex items-center space-x-1.5"
          >
            <Crown className="w-3.5 h-3.5" />
            <span>{hasApplied ? tr("Angalia Ombi", "Voir la Demande", "View Application") : tr("Omba Badge Hapa", "Demander le Badge", "Apply For Badge")}</span>
          </button>
        </div>
      </div>

      {/* VERIFICATION SEARCH & CHECKER */}
      <div className={`p-4 rounded-2xl border space-y-3 ${containerBg}`}>
        <div className="flex items-center space-x-2">
          <Search className="w-4 h-4 text-blue-400" />
          <h3 className={`text-xs font-black uppercase ${textPrimary}`}>
            {tr("Hakiki Akaunti (Verification Checker)", "Vérification de Statut du Compte", "Verify Account Status")}
          </h3>
        </div>

        <p className={`text-[10.5px] ${textSecondary}`}>
          {tr(
            "Ingiza jina la mtumiaji (username) ili kuthibitisha ikiwa ni Mtabiri halisi wa TakeTalon Verified:",
            "Saisissez un nom d'utilisateur pour vérifier s'il détient un badge certifié TakeTalon :",
            "Enter a username to verify if they hold an authentic TakeTalon Verified Badge:"
          )}
        </p>

        <form onSubmit={handleCheckUser} className="flex space-x-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">@</span>
            <input
              type="text"
              value={searchUsername}
              onChange={(e) => setSearchUsername(e.target.value)}
              placeholder="mfano: simba_bet"
              className={`w-full pl-7 pr-3 py-2 rounded-xl text-xs border transition-all ${
                theme === "light"
                  ? "bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-500"
                  : theme === "dark"
                    ? "bg-neutral-950 border-neutral-800 text-slate-100 focus:border-cyan-400"
                    : "bg-[#18334f] border-blue-400/40 text-slate-100 focus:border-cyan-300"
              }`}
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center space-x-1"
          >
            <Search className="w-3.5 h-3.5" />
            <span>{tr("Hakiki", "Vérifier", "Check")}</span>
          </button>
        </form>

        {/* SEARCH RESULT DISPLAY */}
        {searchResult && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-3 rounded-xl border text-xs ${
              searchResult.isVerified
                ? "bg-blue-500/10 border-blue-500/30 text-blue-300"
                : "bg-rose-500/10 border-rose-500/30 text-rose-300"
            }`}
          >
            {searchResult.isVerified ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center space-x-1">
                    <span>@{searchResult.username}</span>
                    <CheckCircle2 className="w-4 h-4 text-blue-400 fill-blue-400/20" />
                  </span>
                  <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[9px] uppercase font-mono">
                    {searchResult.role}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-300 pt-1 border-t border-blue-500/20 font-mono">
                  <div>Win Rate: <strong className="text-emerald-400">{searchResult.winRate}</strong></div>
                  <div>Unlockers: <strong className="text-amber-400">{searchResult.totalUnlockers?.toLocaleString()}</strong></div>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>@{searchResult.username} haijathibitishwa au haina Verified Badge!</span>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* BENEFITS OF TAKETALON VERIFIED */}
      <div className="space-y-2.5">
        <h3 className={`text-xs font-black uppercase tracking-wider flex items-center space-x-1.5 ${textPrimary}`}>
          <Zap className="w-4 h-4 text-amber-400" />
          <span>Faida za Kuwa na TakeTalon Verified Badge</span>
        </h3>

        <div className="grid grid-cols-1 gap-2.5">
          <div className={`p-3.5 rounded-2xl border space-y-1 ${cardBg}`}>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-blue-400 fill-blue-400/20 shrink-0" />
              <h4 className={`text-xs font-black uppercase ${textPrimary}`}>1. Alama ya Bluu ya Uaminifu (Trust Seal)</h4>
            </div>
            <p className="text-[10.5px] text-slate-400 leading-relaxed">
              Inatofautisha akaunti yako na watengenezaji wa maudhui wa kughushi na inawapa wateja (Unlockers) imani kamili ya kununua kadi zako.
            </p>
          </div>

          <div className={`p-3.5 rounded-2xl border space-y-1 ${cardBg}`}>
            <div className="flex items-center space-x-2">
              <Crown className="w-4 h-4 text-amber-400 shrink-0" />
              <h4 className={`text-xs font-black uppercase ${textPrimary}`}>2. Kipaumbele Kwenye Feed (Priority Ranking)</h4>
            </div>
            <p className="text-[10.5px] text-slate-400 leading-relaxed">
              Post na kadi zako za bet zinaonyeshwa juu kabisa kwenye "Top Live" na "Top Other Bet" kwa maelfu ya watumiaji wa TakeTalon.
            </p>
          </div>

          <div className={`p-3.5 rounded-2xl border space-y-1 ${cardBg}`}>
            <div className="flex items-center space-x-2">
              <Coins className="w-4 h-4 text-emerald-400 shrink-0" />
              <h4 className={`text-xs font-black uppercase ${textPrimary}`}>3. Payout ya Moja kwa Moja (90% Commission)</h4>
            </div>
            <p className="text-[10.5px] text-slate-400 leading-relaxed">
              Unapata fursa ya kutoa fedha zako za Unlockers moja kwa moja masaa 24 bila kuzuiliwa au kupitia ukaguzi wa ziada.
            </p>
          </div>
        </div>
      </div>

      {/* APPLICATION MODAL */}
      <AnimatePresence>
        {showAppModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className={`w-full max-w-sm rounded-3xl p-5 border shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto ${containerBg}`}
            >
              <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-neutral-800">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-blue-500 fill-blue-500/20" />
                  <h3 className={`text-sm font-black uppercase ${textPrimary}`}>
                    Ombi la TakeTalon Verified
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAppModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmitApplication} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Aina ya Akaunti:</label>
                  <select
                    value={applicantRole}
                    onChange={(e: any) => setApplicantRole(e.target.value)}
                    className="w-full rounded-xl p-2.5 border bg-black/20 text-slate-100 font-bold focus:outline-none"
                  >
                    <option value="ceo">CEO / Main Tipster</option>
                    <option value="tipster">Professional Predictor</option>
                    <option value="agent">Certified Partner Agent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Uzoefu Wako wa Mtabiri:</label>
                  <select
                    value={experienceMonths}
                    onChange={(e) => setExperienceMonths(e.target.value)}
                    className="w-full rounded-xl p-2.5 border bg-black/20 text-slate-100 font-bold focus:outline-none"
                  >
                    <option value="3-6">Miezi 3 - 6</option>
                    <option value="6-12">Miezi 6 - 12</option>
                    <option value="12+">Zaidi ya Mwaka 1</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Namba ya WhatsApp / Telegram:</label>
                  <input
                    type="text"
                    value={telegramOrPhone}
                    onChange={(e) => setTelegramOrPhone(e.target.value)}
                    placeholder="+257 79 000 000"
                    className="w-full rounded-xl p-2.5 border bg-black/20 text-slate-100 font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Kwa nini Unastahili Badge Hii?</label>
                  <textarea
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Eleza mafanikio yako, win rate na idadi ya wateja unaowahudumia..."
                    className="w-full rounded-xl p-2.5 border bg-black/20 text-slate-100 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-xs shadow-lg shadow-blue-500/20 transition-all active:scale-95 cursor-pointer flex items-center justify-center space-x-2"
                >
                  {isSubmitting ? (
                    <span>Inatuma Ombi...</span>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Tuma Ombi la Verification</span>
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FOOTER */}
      <div className={`p-3 rounded-2xl border ${containerBg} flex items-center justify-between text-[9.5px]`}>
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-blue-400" />
          <span className="text-slate-400 font-mono">TAKETALON VERIFIED ENGINE</span>
        </div>
        <span className="text-blue-400 font-bold font-mono">OFFICIAL SEAL</span>
      </div>
    </div>
  );
}
