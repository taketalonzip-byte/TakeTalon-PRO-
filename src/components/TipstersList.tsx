/**
 * TakeTalon — TipstersList (v2)
 * • Search ya DB (username / jina / full name) — debounce 300ms
 * • Algorithm: PRO → Verified → wengine (sorting kutoka unlockService)
 * • Bei kutoka businessRules prop (DB)
 * • Inatumia profile_id (profiles.id) kwa unlock matching
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Award,
  CheckCircle,
  Users,
  Clock,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  Unlock,
  UserCheck,
  X,
  Search,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import UnlockButton from "./UnlockButton";
import VerifiedBadge from "./VerifiedBadge";
import { UserCircleSingleIcon } from "./MatchList";
import {
  UnlockRecord,
  PublicProfile,
  BusinessRules,
  getUnlockBetween,
  searchProfiles,
} from "../lib/unlockService";

interface TipstersListProps {
  t: any;
  theme: "blue" | "dark" | "light";
  isPro: boolean;
  lang?: "en" | "fr" | "sw";
  currentProfileId: string | null;
  authUserId: string | null; // kwa search (exclude current user)
  businessRules: BusinessRules;

  unlockRecords: UnlockRecord[];
  tipsters: PublicProfile[]; // orodha ya awali (algorithm ya DB)
  pendingIncoming: UnlockRecord[];
  onUnlock: (targetProfileId: string) => Promise<boolean>;
  onCancelUnlock: (id: string) => Promise<void | boolean>;
  onAcceptUnlock: (id: string) => Promise<void | boolean>;
  onRejectUnlock: (id: string) => Promise<void | boolean>;
  onRefreshTipsters: () => void;

  onAddNotification?: (msg: string, type: "success" | "error" | "info") => void;
  onBackToHome?: () => void;
  onViewProfile?: (profile: PublicProfile) => void;
}

export default function TipstersList({
  t,
  theme,
  isPro,
  lang = "en",
  currentProfileId,
  authUserId,
  businessRules,
  unlockRecords,
  tipsters,
  pendingIncoming,
  onUnlock,
  onCancelUnlock,
  onAcceptUnlock,
  onRejectUnlock,
  onRefreshTipsters,
  onBackToHome = () => {},
  onViewProfile,
}: TipstersListProps) {
  const isDark = theme !== "light";

  // ── Search state ─────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PublicProfile[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const q = searchQuery.trim();

    if (!q) {
      setSearchResults(null);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const results = await searchProfiles(q, authUserId);
      setSearchResults(results);
      setSearchLoading(false);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, authUserId]);

  // Orodha inayoonyeshwa: search results (kama inafanya kazi) au tipsters za awali
  const displayList = searchResults !== null ? searchResults : tipsters;
  const isSearching = searchQuery.trim().length > 0;

  // ── Style helpers ─────────────────────────────────────────────────────────────
  const cardBg = isDark
    ? theme === "blue"
      ? "bg-[#1a3a55] border-white/10"
      : "bg-neutral-950/30 border-neutral-800/60"
    : "bg-gradient-to-br from-[#f8fbfe] via-[#f0f5fc] to-[#e6effa] border-slate-200/90 shadow-sm";

  const subText = isDark ? "text-slate-400" : "text-slate-500";
  const titleText = isDark ? "text-slate-100" : "text-slate-800";

  const inputClass = `w-full pl-8 pr-8 py-2 rounded-xl text-xs font-medium border transition-all outline-none ${
    isDark
      ? "bg-white/5 border-white/10 text-slate-100 placeholder-slate-500 focus:border-blue-500/60 focus:bg-white/8"
      : "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-400 focus:bg-white"
  }`;

  const avatarLetter = (profile: PublicProfile) =>
    (profile.first_name || profile.username || "?").charAt(0).toUpperCase();

  const displayName = (profile: PublicProfile) =>
    profile.first_name && profile.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : profile.username;

  const monthlyCost = businessRules.monthly_cost_fbu;

  const i18n = {
    en: {
      searchPlaceholder: "Search by name or @username…",
      searchingLabel: "Searching database…",
      noResultsFor: (q: string) => `No results for "${q}"`,
      noResultsHint: "Try a different name or @username",
      found: (n: number) => `${n} result${n !== 1 ? "s" : ""} found`,
      unlockProfile: "Unlock profile",
      howTitle: "How Unlocking Works",
      howItems: [
        "Tap Unlock → the other user receives a notification",
        "If they Accept → payments run server-side every 30 minutes",
        "Y sees X's posts after accepting (one-directional)",
        "Mutual unlock = you can both see each other's posts",
        "You can Cancel at any time — payments stop immediately",
      ],
      proBanner:
        "You need a Professional account to unlock tipsters. Go to Wallet → Upgrade PRO Elite.",
      paymentInfo: (cost: number, share: number, commission: number) =>
        `${cost} FBU/month · ${share} FBU to tipster · ${commission} FBU commission`,
      pendingIncomingTitle: "Waiting for Your Acceptance",
      backLabel: "Tipsters",
      backDesc: "Elite tipsters",
    },
    sw: {
      searchPlaceholder: "Tafuta kwa jina au @username…",
      searchingLabel: "Inatafuta kwenye database…",
      noResultsFor: (q: string) => `Hakuna matokeo ya "${q}"`,
      noResultsHint: "Jaribu jina tofauti au @username",
      found: (n: number) => `Matokeo ${n} yamepatikana`,
      unlockProfile: "Fungua mlango",
      howTitle: "Jinsi Unlock Inavyofanya Kazi",
      howItems: [
        "Bonyeza Unlock → mtumiaji mwingine anapata arifa",
        "Akikubali → malipo yanafanya server-side kila dakika 30",
        "Y anaona posts za X baada ya kukubali (upande mmoja)",
        "Unlock ya pande zote = mnaweza kuona posts za kila mmoja",
        "Unaweza kufuta (Cancel) wakati wowote — malipo yanasimama",
      ],
      proBanner:
        "Unahitaji akaunti ya Professional ili ku-unlock wengine. Nenda Wallet → Upgrade PRO Elite.",
      paymentInfo: (cost: number, share: number, commission: number) =>
        `${cost} FBU/mwezi · ${share} FBU kwa tipster · kamisheni ${commission} FBU`,
      pendingIncomingTitle: "Wamekufungulia Mlango",
      backLabel: "Watabiri",
      backDesc: "Watabiri Elite",
    },
    fr: {
      searchPlaceholder: "Rechercher par nom ou @pseudo…",
      searchingLabel: "Recherche dans la base de données…",
      noResultsFor: (q: string) => `Aucun résultat pour "${q}"`,
      noResultsHint: "Essayez un nom différent ou @pseudo",
      found: (n: number) => `${n} résultat${n !== 1 ? "s" : ""} trouvé${n !== 1 ? "s" : ""}`,
      unlockProfile: "Débloquer le profil",
      howTitle: "Comment Fonctionne le Déblockage",
      howItems: [
        "Cliquez Débloquer → l'autre utilisateur reçoit une notification",
        "S'il accepte → les paiements côté serveur toutes les 30 min",
        "Y voit les posts de X après acceptation (sens unique)",
        "Déblockage mutuel = vous voyez les posts de l'autre",
        "Annuler à tout moment — les paiements s'arrêtent",
      ],
      proBanner:
        "Vous avez besoin d'un compte Pro pour débloquer des tipsters. Portefeuille → Upgrade PRO Elite.",
      paymentInfo: (cost: number, share: number, commission: number) =>
        `${cost} FBU/mois · ${share} FBU au tipster · commission ${commission} FBU`,
      pendingIncomingTitle: "Ont Débloqué Votre Profil",
      backLabel: "Tipsters",
      backDesc: "Tipsters Elite",
    },
  };
  const tx = i18n[lang] || i18n.en;

  return (
    <div className="px-3.5 py-3 space-y-3 max-w-lg mx-auto pb-24">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center space-x-2">
          <button
            onClick={onBackToHome}
            className={`p-2 rounded-xl border transition-all active:scale-95 cursor-pointer ${
              theme === "light"
                ? "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                : "bg-slate-900 border-slate-800 text-slate-300 hover:text-white"
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <div>
            <h2
              className={`font-display font-black text-xs tracking-wide uppercase leading-tight ${titleText}`}
            >
              {tx.backLabel} <span className="text-amber-500">Elite</span>
            </h2>
            <p className={`text-[9px] leading-tight ${subText}`}>{tx.backDesc}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isPro && (
            <div className="px-2 py-1 rounded-lg bg-amber-400/10 border border-amber-400/20 text-amber-400 font-black text-[8.5px] uppercase tracking-wider">
              PRO
            </div>
          )}
          <button
            onClick={() => {
              setSearchQuery("");
              setSearchResults(null);
              onRefreshTipsters();
            }}
            className={`p-1.5 rounded-lg border transition-all active:scale-95 ${
              theme === "light"
                ? "bg-white border-slate-200 text-slate-400 hover:text-slate-700"
                : "bg-neutral-900 border-neutral-800 text-slate-500 hover:text-slate-300"
            }`}
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* ── Search bar ─────────────────────────────────────────────────────── */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={tx.searchPlaceholder}
          className={inputClass}
          autoComplete="off"
          spellCheck={false}
        />
        {/* Clear button au spinner */}
        <div className="absolute right-2.5 top-2.5">
          {searchLoading ? (
            <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
          ) : searchQuery ? (
            <button
              onClick={() => {
                setSearchQuery("");
                setSearchResults(null);
              }}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Search status bar */}
      <AnimatePresence>
        {isSearching && !searchLoading && searchResults !== null && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className={`flex items-center justify-between px-2 py-1 rounded-lg text-[9px] font-bold ${
              isDark ? "bg-white/5 text-slate-400" : "bg-slate-100 text-slate-500"
            }`}
          >
            <span>
              {searchResults.length > 0
                ? tx.found(searchResults.length)
                : tx.noResultsFor(searchQuery.trim())}
            </span>
            {searchResults.length === 0 && (
              <span className={isDark ? "text-slate-500" : "text-slate-400"}>
                {tx.noResultsHint}
              </span>
            )}
          </motion.div>
        )}
        {isSearching && searchLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-bold ${
              isDark ? "text-blue-400 bg-blue-500/10" : "text-blue-600 bg-blue-50"
            }`}
          >
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>{tx.searchingLabel}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Pro gate banner ─────────────────────────────────────────────────── */}
      {!isPro && (
        <div
          className={`p-3 rounded-xl border flex items-center gap-3 ${
            isDark ? "bg-amber-500/5 border-amber-500/20" : "bg-amber-50 border-amber-200"
          }`}
        >
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
          <p
            className={`text-[9px] font-bold leading-tight ${isDark ? "text-amber-300" : "text-amber-700"}`}
          >
            {tx.proBanner}
          </p>
        </div>
      )}

      {/* ── Pending incoming unlocks (Y's accept panel) ──────────────────── */}
      {pendingIncoming.length > 0 && !isSearching && (
        <div
          className={`p-3 rounded-xl border space-y-2 ${
            isDark ? "bg-blue-500/5 border-blue-500/20" : "bg-blue-50 border-blue-200"
          }`}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <UserCheck className={`w-3.5 h-3.5 ${isDark ? "text-[#38bdf8]" : "text-blue-600"}`} />
            <span
              className={`text-[10px] font-black uppercase tracking-wider ${isDark ? "text-[#38bdf8]" : "text-blue-700"}`}
            >
              {tx.pendingIncomingTitle}
            </span>
            <span
              className={`ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isDark ? "bg-blue-500/20 text-blue-300" : "bg-blue-100 text-blue-600"}`}
            >
              {pendingIncoming.length}
            </span>
          </div>
          {pendingIncoming.map((rec) => {
            const tip = tipsters.find((p) => p.profile_id === rec.unlocker_id);
            const name = tip ? displayName(tip) : rec.unlocker_id.slice(0, 8) + "…";
            return (
              <div
                key={rec.id}
                className={`flex items-center justify-between p-2 rounded-lg ${isDark ? "bg-white/5" : "bg-white"}`}
              >
                <span className={`text-[9px] font-bold ${titleText}`}>{name}</span>
                <UnlockButton
                  theme={theme}
                  record={rec}
                  iAmUnlocker={false}
                  iAmUnlocked={true}
                  onUnlock={async () => {}}
                  onCancel={onCancelUnlock}
                  onAccept={onAcceptUnlock}
                  onReject={onRejectUnlock}
                  isPro={isPro}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* ── Payment info ────────────────────────────────────────────────────── */}
      {!isSearching && (
        <div
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border ${
            isDark
              ? "bg-white/3 border-white/8 text-slate-400"
              : "bg-slate-50 border-slate-200 text-slate-500"
          }`}
        >
          <Clock className="w-3 h-3 shrink-0 text-slate-400" />
          <p className="text-[8px] font-medium leading-tight">
            {tx.paymentInfo(
              businessRules.monthly_cost_fbu,
              businessRules.tipster_share_fbu,
              businessRules.commission_fbu,
            )}
          </p>
        </div>
      )}

      {/* ── Tipsters list ─────────────────────────────────────────────────── */}
      {displayList.length === 0 && !searchLoading ? (
        <div
          className={`p-6 rounded-xl border text-center space-y-3 ${
            isDark ? "bg-neutral-950/20 border-neutral-900" : "bg-slate-50 border-slate-200"
          }`}
        >
          <div className="w-10 h-10 rounded-full bg-slate-500/10 border border-slate-500/20 flex items-center justify-center mx-auto text-slate-400">
            {isSearching ? <Search className="w-5 h-5" /> : <Users className="w-5 h-5" />}
          </div>
          <div className="space-y-1">
            <p className={`text-xs font-black uppercase tracking-wider ${titleText}`}>
              {isSearching
                ? tx.noResultsFor(searchQuery.trim())
                : lang === "sw"
                  ? "Hakuna Watabiri"
                  : lang === "fr"
                    ? "Aucun Tipster"
                    : "No Tipsters Yet"}
            </p>
            <p
              className={`text-[9.5px] leading-normal max-w-[280px] mx-auto font-medium ${subText}`}
            >
              {isSearching
                ? tx.noResultsHint
                : lang === "sw"
                  ? "CEO anaamua akaunti gani zinaonekana hapa."
                  : lang === "fr"
                    ? "Le CEO décide quels comptes apparaissent ici."
                    : "The CEO decides which accounts appear here."}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          <AnimatePresence mode="popLayout">
            {displayList.map((profile, idx) => {
              const rec = getUnlockBetween(
                unlockRecords,
                currentProfileId ?? "",
                profile.profile_id,
              );
              const iAmUnlocker = !!rec && rec.unlocker_id === currentProfileId;
              const iAmUnlocked = !!rec && rec.unlocked_id === currentProfileId;

              return (
                <motion.div
                  key={profile.profile_id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: isSearching ? 0 : idx * 0.04, duration: 0.18 }}
                  className={`p-3 rounded-xl border transition-all ${cardBg}`}
                >
                  <div className="flex items-center justify-between">
                    <div
                      onClick={() => onViewProfile && onViewProfile(profile)}
                      className="flex items-center space-x-2.5 cursor-pointer hover:opacity-85 transition-opacity"
                      title={lang === "sw" ? "Angalia wasifu" : lang === "fr" ? "Voir le profil" : "View profile"}
                    >
                      {/* Rank — kahide kwa search */}
                      {!isSearching && (
                        <span
                          className={`text-[10px] font-mono font-bold w-5 text-center ${subText}`}
                        >
                          #{idx + 1}
                        </span>
                      )}

                      {/* Avatar */}
                      <div className="relative">
                        {profile.avatar_url ? (
                          <img
                            src={profile.avatar_url}
                            alt={profile.username}
                            className="w-8 h-8 rounded-full object-cover border border-white/10"
                          />
                        ) : (
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                              isDark
                                ? "bg-gradient-to-br from-neutral-800 to-neutral-700 border-neutral-700/80 text-white"
                                : "bg-blue-50 text-blue-600 border-blue-200"
                            }`}
                          >
                            <UserCircleSingleIcon className="w-4.5 h-4.5" />
                          </div>
                        )}
                        <span
                          className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border ${
                            isDark
                              ? "bg-emerald-500 border-neutral-950"
                              : "bg-emerald-500 border-white"
                          }`}
                        />
                      </div>

                      {/* Info */}
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1 flex-wrap gap-y-0.5">
                          <span
                            className={`text-xs font-black tracking-wide truncate max-w-[130px] ${titleText}`}
                          >
                            {/* Highlight search term */}
                            <HighlightedText
                              text={displayName(profile)}
                              query={isSearching ? searchQuery : ""}
                            />
                          </span>
                          {profile.is_verified && (
                            <VerifiedBadge className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          )}
                          {profile.is_pro && (
                            <span className="text-[7px] font-black px-1 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20 uppercase tracking-wider shrink-0">
                              PRO
                            </span>
                          )}
                        </div>
                        <p
                          className={`text-[9px] font-mono mt-0.5 truncate max-w-[150px] ${subText}`}
                        >
                          @
                          <HighlightedText
                            text={profile.username}
                            query={isSearching ? searchQuery.replace(/^@/, "") : ""}
                          />
                        </p>
                      </div>
                    </div>

                    {/* Role badge */}
                    {profile.role === "TIPSTER" && (
                      <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    )}
                  </div>

                  {/* Unlock action row */}
                  <div
                    className={`mt-2.5 pt-2 border-t flex items-center justify-between ${
                      isDark ? "border-slate-800/30" : "border-slate-100"
                    }`}
                  >
                    <span className={`text-[8px] font-medium ${subText}`}>
                      {tx.unlockProfile}
                      <span
                        className={`ml-1 font-bold ${isDark ? "text-slate-300" : "text-slate-600"}`}
                      >
                        · {monthlyCost} FBU/mo
                      </span>
                    </span>
                    <UnlockButton
                      theme={theme}
                      record={rec}
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
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* ── Info footer ───────────────────────────────────────────────────── */}
      <div
        className={`p-3 rounded-xl border space-y-1.5 ${
          isDark
            ? theme === "blue"
              ? "bg-[#121c33]/50 border-blue-950/80"
              : "bg-neutral-950/20 border-neutral-900/80"
            : "bg-white border-slate-200 shadow-sm"
        }`}
      >
        <h4 className={`text-[11px] font-black uppercase tracking-wider ${titleText}`}>
          <Unlock className="inline w-3 h-3 mr-1" />
          {tx.howTitle}
        </h4>
        <ul
          className={`text-[9px] leading-relaxed font-medium space-y-0.5 list-disc list-inside ${subText}`}
        >
          {tx.howItems.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─── Helper: highlight search term katika text ─────────────────────────────────

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query || !text) return <>{text}</>;

  // Gawanya query kwa nafasi, tengeneza RegExp
  const parts = query.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return <>{text}</>;

  const pattern = new RegExp(`(${parts.map(escapeRegex).join("|")})`, "gi");
  const segments = text.split(pattern);

  return (
    <>
      {segments.map((seg, i) =>
        pattern.test(seg) ? (
          <mark key={i} className="bg-blue-500/25 text-blue-300 rounded-[2px] px-0.5 not-italic">
            {seg}
          </mark>
        ) : (
          seg
        ),
      )}
    </>
  );
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
