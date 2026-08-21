/**
 * PublicProfilePage — Ukurasa wa profile ya mtu mwingine
 * Inaonyesha: avatar, jina, badges, unlock stats, posts zake
 */

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  CheckCircle,
  Users,
  Unlock,
  FileText,
  Star,
  Award,
  UserCheck,
  Clock,
  ChevronRight,
  Check,
  Copy,
  Bell,
  ShieldAlert,
  X,
} from "lucide-react";
import SettingsIcon from "./SettingsIcon";
import ShareIcon from "./ShareIcon";
import {
  PublicProfile,
  UnlockRecord,
  BusinessRules,
  getUnlockBetween,
  fetchProfileUnlockStats,
  ProfileUnlockStats,
} from "../lib/unlockService";
import UnlockButton from "./UnlockButton";
import VerifiedBadge from "./VerifiedBadge";
import MatchList, { UserCircleSingleIcon } from "./MatchList";
import { MatchTip, UserProfile } from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const displayName = (p: PublicProfile) =>
  [p.first_name, p.last_name].filter(Boolean).join(" ") || p.username || "—";

const avatarLetter = (p: PublicProfile) =>
  (p.first_name?.[0] || p.username?.[0] || "?").toUpperCase();

// ─── Props ────────────────────────────────────────────────────────────────────

interface PublicProfilePageProps {
  profile: PublicProfile;
  theme: "blue" | "dark" | "light";
  onBack: () => void;
  matchTips: MatchTip[];
  currentProfileId: string | null;
  unlockRecords: UnlockRecord[];
  businessRules: BusinessRules;
  isPro: boolean;
  onUnlock: (targetProfileId: string) => Promise<boolean>;
  onCancelUnlock: (id: string) => Promise<void | boolean>;
  onAcceptUnlock: (id: string) => Promise<void | boolean>;
  onRejectUnlock: (id: string) => Promise<void | boolean>;
  t: any;
  lang: "en" | "fr" | "sw";
  currentUser?: UserProfile | null;
  onOpenComments?: (match: MatchTip) => void;
  onAddNotification?: (msg: string, type: "success" | "error" | "info") => void;
  onShakeTrigger?: () => void;
}

type TabId = "posts" | "unlockers" | "unlocking";

// ─── Component ────────────────────────────────────────────────────────────────

export default function PublicProfilePage({
  profile,
  theme,
  onBack,
  matchTips,
  currentProfileId,
  unlockRecords,
  businessRules,
  isPro,
  onUnlock,
  onCancelUnlock,
  onAcceptUnlock,
  onRejectUnlock,
  t,
  lang,
  currentUser,
  onOpenComments,
  onAddNotification,
  onShakeTrigger,
}: PublicProfilePageProps) {
  const isDark = theme !== "light";

  const [activeTab, setActiveTab] = useState<TabId>("posts");
  const [stats, setStats] = useState<ProfileUnlockStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(false);

  // Fetch unlock stats kwa profile hii
  useEffect(() => {
    setStatsLoading(true);
    fetchProfileUnlockStats(profile.profile_id).then((s) => {
      setStats(s);
      setStatsLoading(false);
    });
  }, [profile.profile_id]);

  // Handle Share profile
  const handleShare = async () => {
    const shareData = {
      title: `${displayName(profile)} - TakeTalon`,
      text: `Angalia wasifu wa @${profile.username} kwenye TakeTalon!`,
      url: window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // user dismissed share
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy link:", err);
      }
    }
  };

  // Posts za mtu huyu (kutafuta kwa username)
  const theirPosts = matchTips.filter(
    (tip) =>
      tip.isUserCreated &&
      (tip.tipster.name.toLowerCase() === profile.username.toLowerCase() ||
        tip.tipster.name.toLowerCase() === displayName(profile).toLowerCase()),
  );

  // Contract kati yangu na huyu
  const myContract = currentProfileId
    ? getUnlockBetween(unlockRecords, currentProfileId, profile.profile_id)
    : null;
  const iAmUnlocker = !!myContract && myContract.unlocker_id === currentProfileId;
  const iAmUnlocked = !!myContract && myContract.unlocked_id === currentProfileId;

  const monthlyCost = businessRules.monthly_cost_fbu;

  // ── Styles ────────────────────────────────────────────────────────────────
  const bg = isDark
    ? theme === "blue"
      ? "bg-transparent text-white"
      : "bg-transparent text-white"
    : "bg-transparent text-slate-900";

  const cardBg =
    theme === "light"
      ? "bg-white border border-slate-200 shadow-sm text-slate-900"
      : theme === "dark"
        ? "bg-[#0d0d0d] border border-neutral-800/60 text-slate-100"
        : "bg-[#3B6D99] border border-blue-400/40 text-white font-semibold";

  const subText = isDark ? "text-slate-400" : "text-slate-500";
  const titleText = isDark ? "text-white" : "text-slate-900";

  const tabActiveClass = isDark
    ? "bg-blue-600/20 text-blue-400 border-blue-500/30"
    : "bg-blue-50 text-blue-600 border-blue-200";
  const tabInactiveClass = isDark
    ? "text-slate-500 border-transparent hover:text-slate-300"
    : "text-slate-400 border-transparent hover:text-slate-600";

  const buttonStyle = `flex items-center justify-center p-2 rounded-xl border transition-all active:scale-95 cursor-pointer ${
    isDark
      ? "bg-slate-900 border-slate-800 text-slate-300 hover:text-white"
      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
  }`;

  const i18n = {
    en: {
      posts: "Posts",
      unlockers: "Unlockers",
      unlocking: "Unlocking",
      noPosts: "No posts yet",
      noPostsSub: "This tipster hasn't shared any tips yet.",
      unlockLabel: "Unlock profile",
      back: "Back",
      copiedMsg: "Link copied!",
      settingsTitle: "Profile Settings",
    },
    fr: {
      posts: "Posts",
      unlockers: "Débloqueurs",
      unlocking: "Débloqués",
      noPosts: "Aucun post",
      noPostsSub: "Ce tipster n'a pas encore partagé de pronostics.",
      unlockLabel: "Débloquer le profil",
      back: "Retour",
      copiedMsg: "Lien copié !",
      settingsTitle: "Paramètres du profil",
    },
    sw: {
      posts: "Machapisho",
      unlockers: "Unlockers",
      unlocking: "Unlocking",
      noPosts: "Hakuna machapisho",
      noPostsSub: "Mtabiri huyu hajashirikisha kadi yoyote bado.",
      unlockLabel: "Fungua Wasifu",
      back: "Rudi",
      copiedMsg: "Link imenakiliwa!",
      settingsTitle: "Mipangilio ya Wasifu",
    },
  };
  const tx = i18n[lang] || i18n.en;

  return (
    <motion.div
      className={`w-full max-w-xl mx-auto space-y-3 p-2 sm:p-3 pb-6 ${bg}`}
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.2 }}
    >
      {/* ── Top Header Navigation Bar: Back, Share & Settings ─────────── */}
      <div className="flex items-center justify-between mb-3">
        {/* Back Button */}
        <button onClick={onBack} className={`${buttonStyle} space-x-1.5 px-3`}>
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">{tx.back}</span>
        </button>

        {/* Action Buttons: Share & Settings */}
        <div className="flex items-center space-x-2">
          {/* Share Button */}
          <button onClick={handleShare} title="Share Profile" className={`relative ${buttonStyle}`}>
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <ShareIcon className="w-3.5 h-3.5" />
            )}
            {copied && (
              <span className="absolute -bottom-7 right-0 text-[9px] font-semibold text-emerald-400 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800 shadow-md whitespace-nowrap z-20">
                {tx.copiedMsg}
              </span>
            )}
          </button>

          {/* Settings Button */}
          <button
            onClick={() => setShowSettingsModal(true)}
            title="Settings"
            className={buttonStyle}
          >
            <SettingsIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Profile header info (Directly on container) ───────────────────── */}
      <div className="py-2 mb-3">
        <div className="flex items-start justify-between gap-3">
          {/* Avatar */}
          <div className="relative shrink-0">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.username}
                className="w-14 h-14 rounded-2xl object-cover border border-white/10"
              />
            ) : (
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${
                  isDark
                    ? "bg-gradient-to-br from-neutral-800 to-neutral-700 border-neutral-700/80 text-white"
                    : "bg-blue-50 text-blue-600 border-blue-200"
                }`}
              >
                <UserCircleSingleIcon className="w-8 h-8" />
              </div>
            )}
            {/* Online dot */}
            <span
              className={`absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full border-2 bg-emerald-500 ${
                isDark ? "border-neutral-900" : "border-white"
              }`}
            />
          </div>

          {/* Name + badges */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-1 mb-0.5">
              <span className={`text-sm font-black tracking-wide ${titleText}`}>
                {displayName(profile)}
              </span>
              {profile.is_verified && <VerifiedBadge className="w-4 h-4 text-blue-500 shrink-0" />}
              {profile.is_pro && (
                <span className="text-[7px] font-black px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/20 uppercase tracking-wider shrink-0">
                  PRO
                </span>
              )}
              {profile.role === "TIPSTER" && (
                <span
                  className={`text-[7px] font-black px-1.5 py-0.5 rounded-md border uppercase tracking-wider shrink-0 ${
                    isDark
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-emerald-50 text-emerald-600 border-emerald-200"
                  }`}
                >
                  TIPSTER
                </span>
              )}
            </div>
            <p className={`text-[10px] font-mono ${subText}`}>@{profile.username}</p>

            {/* Stats row */}
            <div className="flex items-center gap-3 mt-2">
              <div className="text-center">
                <p className={`text-xs font-black ${titleText}`}>
                  {statsLoading
                    ? unlockRecords.filter(
                        (r) => r.unlocked_id === profile.profile_id && r.status === "active",
                      ).length
                    : (stats?.unlockersCount ??
                      unlockRecords.filter(
                        (r) => r.unlocked_id === profile.profile_id && r.status === "active",
                      ).length)}
                </p>
                <p className={`text-[8px] ${subText}`}>{tx.unlockers}</p>
              </div>
              <div className={`w-px h-6 ${isDark ? "bg-slate-800" : "bg-slate-200"}`} />
              <div className="text-center">
                <p className={`text-xs font-black ${titleText}`}>
                  {statsLoading
                    ? unlockRecords.filter(
                        (r) => r.unlocker_id === profile.profile_id && r.status === "active",
                      ).length
                    : (stats?.unlockingCount ??
                      unlockRecords.filter(
                        (r) => r.unlocker_id === profile.profile_id && r.status === "active",
                      ).length)}
                </p>
                <p className={`text-[8px] ${subText}`}>{tx.unlocking}</p>
              </div>
              <div className={`w-px h-6 ${isDark ? "bg-slate-800" : "bg-slate-200"}`} />
              <div className="text-center">
                <p className={`text-xs font-black ${titleText}`}>{theirPosts.length}</p>
                <p className={`text-[8px] ${subText}`}>{tx.posts}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Unlock button row */}
        <div
          className={`mt-3 pt-3 border-t flex items-center justify-between gap-2 ${
            isDark ? "border-slate-800/40" : "border-slate-100"
          }`}
        >
          <span className={`text-[10px] font-medium ${subText}`}>
            {tx.unlockLabel}
            <span className={`ml-1 font-bold ${isDark ? "text-slate-300" : "text-slate-700"}`}>
              · {monthlyCost} FBU/mo
            </span>
          </span>
          <UnlockButton
            theme={theme}
            record={myContract}
            iAmUnlocker={iAmUnlocker}
            iAmUnlocked={iAmUnlocked}
            onUnlock={async () => {
              await onUnlock(profile.profile_id);
            }}
            onCancel={onCancelUnlock}
            onAccept={onAcceptUnlock}
            onReject={onRejectUnlock}
            isPro={isPro}
            disabled={!currentProfileId}
          />
        </div>
      </div>

      {/* ── Tab bar ───────────────────────────────────────────────────────── */}
      <div className="flex gap-1.5 mb-3">
        {(
          [
            { id: "posts" as TabId, label: tx.posts, icon: FileText },
            { id: "unlockers" as TabId, label: tx.unlockers, icon: Users },
            { id: "unlocking" as TabId, label: tx.unlocking, icon: Unlock },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex items-center justify-center gap-1 py-2 px-2 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === id ? tabActiveClass : tabInactiveClass
            }`}
          >
            <Icon className="w-3 h-3" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab content ───────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {activeTab === "posts" && (
          <motion.div
            key="posts"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {theirPosts.length === 0 ? (
              <div className={`rounded-2xl border p-8 text-center ${cardBg}`}>
                <FileText className={`w-8 h-8 mx-auto mb-2 ${subText} opacity-40`} />
                <p className={`text-xs font-bold ${titleText}`}>{tx.noPosts}</p>
                <p className={`text-[9px] mt-1 ${subText}`}>{tx.noPostsSub}</p>
              </div>
            ) : (
              <MatchList
                tips={theirPosts}
                isProfileMode={true}
                isPro={isPro}
                theme={theme}
                lang={lang}
                t={t}
                currentUser={currentUser}
                onOpenComments={onOpenComments}
                onAddNotification={onAddNotification}
                onShakeTrigger={onShakeTrigger}
              />
            )}
          </motion.div>
        )}

        {activeTab === "unlockers" && (
          <motion.div
            key="unlockers"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div className={`rounded-2xl border p-6 text-center ${cardBg}`}>
              <Users className={`w-8 h-8 mx-auto mb-2 ${subText} opacity-40`} />
              <p className={`text-xs font-black ${titleText}`}>
                {statsLoading ? "—" : (stats?.unlockersCount ?? 0)} {tx.unlockers}
              </p>
              <p className={`text-[9px] mt-1 ${subText}`}>
                {lang === "sw"
                  ? "Watu wanaolipa kufungua profaili hii"
                  : lang === "fr"
                    ? "Personnes qui ont débloqué ce profil"
                    : "People who unlocked this profile"}
              </p>
            </div>
          </motion.div>
        )}

        {activeTab === "unlocking" && (
          <motion.div
            key="unlocking"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div className={`rounded-2xl border p-6 text-center ${cardBg}`}>
              <Unlock className={`w-8 h-8 mx-auto mb-2 ${subText} opacity-40`} />
              <p className={`text-xs font-black ${titleText}`}>
                {statsLoading ? "—" : (stats?.unlockingCount ?? 0)} {tx.unlocking}
              </p>
              <p className={`text-[9px] mt-1 ${subText}`}>
                {lang === "sw"
                  ? "Profaili ambazo mtu huyu amefungua"
                  : lang === "fr"
                    ? "Profils que cet utilisateur a débloqués"
                    : "Profiles this person has unlocked"}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Profile Settings Modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showSettingsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={`w-full max-w-sm rounded-2xl border p-4 shadow-2xl ${
                isDark
                  ? "bg-[#0d1526] border-slate-800 text-white"
                  : "bg-white border-slate-200 text-slate-900"
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/40">
                <div className="flex items-center space-x-2">
                  <SettingsIcon className="w-4 h-4 text-blue-400" />
                  <h3 className="text-xs font-black uppercase tracking-wider">
                    {tx.settingsTitle}
                  </h3>
                </div>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="p-1 rounded-lg hover:bg-slate-800/50 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="py-3 space-y-2">
                {/* Option 1: Copy Link */}
                <button
                  onClick={() => {
                    handleShare();
                    setShowSettingsModal(false);
                  }}
                  className={`w-full flex items-center space-x-3 p-2.5 rounded-xl border text-left transition-all text-xs font-semibold cursor-pointer ${
                    isDark
                      ? "bg-slate-900/60 border-slate-800/80 hover:bg-slate-800 text-slate-200"
                      : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
                  }`}
                >
                  <Copy className="w-4 h-4 text-blue-400 shrink-0" />
                  <div>
                    <p className="font-bold text-xs">
                      {lang === "sw" ? "Nakili Linki ya Wasifu" : "Copy Profile Link"}
                    </p>
                    <p className="text-[9px] text-slate-400">
                      {lang === "sw" ? "Shirikisha na wengine" : "Share profile with friends"}
                    </p>
                  </div>
                </button>

                {/* Option 2: Notifications */}
                <button
                  onClick={() => setNotifEnabled(!notifEnabled)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all text-xs font-semibold cursor-pointer ${
                    isDark
                      ? "bg-slate-900/60 border-slate-800/80 hover:bg-slate-800 text-slate-200"
                      : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Bell className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <p className="font-bold text-xs">
                        {lang === "sw" ? "Arifa za Mtabiri" : "Tipster Notifications"}
                      </p>
                      <p className="text-[9px] text-slate-400">
                        {lang === "sw"
                          ? "Arifa akiposti utabiri mpya"
                          : "Get notified when new tips are posted"}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                      notifEnabled
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {notifEnabled
                      ? lang === "sw"
                        ? "Wazi"
                        : "ON"
                      : lang === "sw"
                        ? "Zimezimwa"
                        : "OFF"}
                  </span>
                </button>

                {/* Option 3: Report/Mute */}
                <button
                  onClick={() => {
                    alert(
                      lang === "sw"
                        ? "Ripoti imetumwa kwa wakaguzi."
                        : "Report submitted to moderators.",
                    );
                    setShowSettingsModal(false);
                  }}
                  className={`w-full flex items-center space-x-3 p-2.5 rounded-xl border text-left transition-all text-xs font-semibold cursor-pointer ${
                    isDark
                      ? "bg-red-500/10 border-red-500/20 hover:bg-red-500/20 text-red-400"
                      : "bg-red-50 border-red-200 hover:bg-red-100 text-red-600"
                  }`}
                >
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <div>
                    <p className="font-bold text-xs">
                      {lang === "sw" ? "Ripoti Wasifu au Kuzuia" : "Report Profile or Mute"}
                    </p>
                    <p className="text-[9px] opacity-80">
                      {lang === "sw" ? "Ripotia maudhui yasiyofaa" : "Report inappropriate content"}
                    </p>
                  </div>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
