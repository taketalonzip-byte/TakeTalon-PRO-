/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  Lock,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  HelpCircle,
  ArrowRight,
  Star,
  Play,
  Flame,
  ShoppingBag,
  Award,
  TrendingUp,
  Gamepad2,
  ShieldAlert,
  Zap,
  Plane,
  Calendar,
  ChevronDown,
  Shield,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { MatchTip, UserProfile } from "../types";
import CommentsPage from "./CommentsPage";
import {
  togglePostLikeInDatabase,
  getCommentCount,
  subscribeCommentCounts,
} from "../lib/commentsService";
import { getTeamLogoUrl } from "../lib/teamLogos";
import { ScrollingScoreBadge } from "./ScrollingScoreBadge";

// User Circle Single Streamline Icon for Post Card Profile
export const UserCircleSingleIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 14 14"
    id="User-Circle-Single--Streamline-Flex"
    className={className}
    width="100%"
    height="100%"
  >
    <desc>User Circle Single Streamline Icon: https://streamlinehq.com</desc>
    <g id="user-circle-single--circle-geometric-human-person-single-user">
      <path
        id="Subtract"
        fill="currentColor"
        fillRule="evenodd"
        d="M7 14c4.48 0 7 -2.52 7 -7s-2.52 -7 -7 -7 -7 2.52 -7 7 2.52 7 7 7Zm3.6366 -2.4712c-0.2546 -0.4744 -0.6015 -0.8978 -1.02442 -1.2434 -0.73718 -0.60258 -1.66 -0.93173 -2.6121 -0.93173s-1.87492 0.32915 -2.6121 0.93173c-0.42289 0.3456 -0.76977 0.769 -1.02445 1.2434 0.83239 0.5983 2.01615 0.9712 3.63658 0.9712 1.6204 0 2.80414 -0.3729 3.63649 -0.9712ZM9.35509 5.26879c0 1.5077 -0.84807 2.35577 -2.35577 2.35577 -1.50769 0 -2.35577 -0.84807 -2.35577 -2.35577 0 -1.50769 0.84808 -2.35577 2.35577 -2.35577 1.5077 0 2.35577 0.84808 2.35577 2.35577Z"
        clipRule="evenodd"
        strokeWidth="1"
      />
    </g>
  </svg>
);

// PostCardCommentTrigger — renders comment bubble icon with total comment & reply count
export const PostCardCommentTrigger = ({
  match,
  theme,
  currentUser,
  onOpenComments,
  onShakeTrigger,
  hoverColor = "hover:text-blue-500",
}: {
  match: any;
  theme: string;
  currentUser?: UserProfile | null;
  onOpenComments?: (match: MatchTip) => void;
  onShakeTrigger?: () => void;
  hoverColor?: string;
}) => {
  const matchIdStr = String(match.id);
  const [count, setCount] = useState(() => getCommentCount(matchIdStr, match.commentsCount));

  useEffect(() => {
    setCount(getCommentCount(matchIdStr, match.commentsCount));
    const unsubscribe = subscribeCommentCounts((targetId, newCount) => {
      if (targetId === matchIdStr) {
        setCount(newCount);
      }
    });
    return unsubscribe;
  }, [matchIdStr, match.commentsCount]);

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (!currentUser || !currentUser.isLoggedIn) {
          if (onShakeTrigger) onShakeTrigger();
          return;
        }
        onOpenComments?.(match);
      }}
      className={`group flex items-center gap-1 transition-all cursor-pointer ${
        theme === "light"
          ? "text-slate-400 hover:text-slate-800"
          : theme === "blue"
            ? "text-blue-100 hover:text-white"
            : "text-slate-400 hover:text-slate-200"
      } ${hoverColor}`}
      id={`comment-trigger-${match.id}`}
      title={`Maoni (${count})`}
    >
      <div className="relative flex items-center justify-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          className="w-3.5 h-3.5 transition-transform group-hover:scale-110"
        >
          <g id="chat-bubble-fill">
            <path
              id="Union"
              fill="currentColor"
              d="M22 18H5.91406L2 21.9141V2h20z"
              strokeWidth="1"
            />
          </g>
        </svg>
      </div>
      <span
        className={`text-[8.5px] font-black font-mono leading-none tracking-tight ${
          theme === "light"
            ? "text-slate-500 group-hover:text-slate-900"
            : theme === "blue"
              ? "text-blue-100 group-hover:text-white"
              : "text-slate-400 group-hover:text-slate-200"
        }`}
      >
        {count}
      </span>
    </button>
  );
};

// Interactive Profile component in the top-left corner of postcards
interface PostCardProfileProps {
  tipster?: {
    name: string;
    avatarLetter: string;
    badge?: string;
    isOfficial?: boolean;
    avatarUrl?: string;
  };
  theme: "blue" | "dark" | "light";
  onViewProfile?: (tipster: any) => void;
  onNavigateToMyProfile?: () => void;
  currentUser?: UserProfile | null;
  onShakeTrigger?: () => void;
}

function PostCardProfile({
  tipster,
  theme,
  onViewProfile,
  onNavigateToMyProfile,
  currentUser,
  onShakeTrigger,
}: PostCardProfileProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sanitize name to remove words like bot, expert, oracle, ai, elite, hot, lady, pro, virtual
  const rawName = tipster?.name || currentUser?.username || "TakeTalon Pro";
  const cleanUsername = rawName
    .replace(/^@/, "")
    .replace(/\b(bot|expert|oracle|ai|elite|hot|lady|pro|virtual)\b/gi, "")
    .trim()
    .replace(/\s+/g, " ");

  // Check if this postcard was published by the current user
  const isCurrentUserPost = Boolean(
    currentUser &&
      currentUser.isLoggedIn &&
      (((tipster as any)?.userId && ((tipster as any).userId === (currentUser as any).id || (tipster as any).userId === (currentUser as any).profileId)) ||
        (currentUser.username && rawName.toLowerCase() === currentUser.username.toLowerCase()) ||
        (currentUser.email && rawName.toLowerCase() === currentUser.email.toLowerCase()) ||
        (currentUser.fullName && rawName.toLowerCase() === currentUser.fullName.toLowerCase()))
  );

  const avatarSrc =
    isCurrentUserPost && currentUser?.avatarUrl
      ? currentUser.avatarUrl
      : tipster?.avatarUrl || null;
  const initials =
    tipster?.avatarLetter || (cleanUsername ? cleanUsername.charAt(0).toUpperCase() : "TT");

  useEffect(() => {
    if (isExpanded) {
      const timer = setTimeout(() => {
        setIsExpanded(false);
      }, 4000); // revert name back after 4 seconds
      return () => clearTimeout(timer);
    }
  }, [isExpanded]);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const containerBg =
    theme === "light"
      ? "bg-slate-100/90 border-slate-300/80 text-slate-800"
      : theme === "blue"
        ? "bg-slate-950/40 border-blue-400/20 text-white"
        : "bg-neutral-900/90 border-neutral-800/85 text-slate-200";

  const avatarBg =
    theme === "light"
      ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white"
      : theme === "blue"
        ? "bg-gradient-to-br from-blue-500/30 to-indigo-500/30 border border-blue-400/30 text-blue-100"
        : "bg-gradient-to-br from-neutral-800 to-neutral-700 border border-neutral-700/80 text-white";

  const menuBtnBg =
    theme === "light"
      ? "bg-slate-100/90 hover:bg-slate-200 border-slate-300 text-slate-500 hover:text-slate-700 shadow-sm"
      : theme === "blue"
        ? "bg-slate-950/50 hover:bg-[#0f1930] border-blue-900/60 text-slate-300 hover:text-white"
        : "bg-neutral-900/80 hover:bg-neutral-850 border-neutral-800 text-slate-400 hover:text-slate-200";

  const dropdownBg =
    theme === "light"
      ? "bg-white border-slate-200 text-slate-700 shadow-md"
      : theme === "blue"
        ? "bg-[#0f1930] border-blue-900/80 text-slate-200 shadow-xl"
        : "bg-neutral-900 border-neutral-800 text-slate-300 shadow-xl";

  return (
    <div className="absolute top-2 left-2.5 z-30 flex flex-col items-start gap-1">
      {/* Profile Button */}
      <motion.button
        onClick={(e) => {
          e.stopPropagation();
          if (!currentUser || !currentUser.isLoggedIn) {
            if (onShakeTrigger) onShakeTrigger();
            return;
          }
          setIsExpanded(!isExpanded);
        }}
        className={`flex items-center flex-row h-6 rounded-full border p-0.5 px-1 shadow-sm cursor-pointer backdrop-blur-md transition-all ${containerBg}`}
        layout
        transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Avatar circle (anchored to the left) */}
        <div
          className={`w-5 h-5 rounded-full flex items-center justify-center font-mono font-black text-[7.5px] uppercase tracking-wider shadow-inner shrink-0 overflow-hidden ${avatarBg}`}
        >
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt={cleanUsername}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <UserCircleSingleIcon className="w-3.5 h-3.5" />
          )}
        </div>

        {/* Sliding/revealing Name Container (sliding to the right) */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ width: 0, opacity: 0, marginLeft: 0 }}
              animate={{ width: "auto", opacity: 1, marginLeft: 4 }}
              exit={{ width: 0, opacity: 0, marginLeft: 0 }}
              transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden whitespace-nowrap flex items-center"
            >
              <span className="text-[8.5px] font-black tracking-wider pr-1 leading-none">
                @{cleanUsername}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Menu Button and Dropdown (Three Dots) */}
      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!currentUser || !currentUser.isLoggedIn) {
              if (onShakeTrigger) onShakeTrigger();
              return;
            }
            setIsMenuOpen(!isMenuOpen);
          }}
          className={`flex items-center justify-center h-5 w-5 rounded-full border cursor-pointer backdrop-blur-md transition-all active:scale-95 ${menuBtnBg}`}
          title="Profile Menu"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className="w-3.5 h-3.5"
            fill="currentColor"
          >
            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
          </svg>
        </button>

        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -5 }}
              transition={{ duration: 0.15 }}
              className={`absolute left-0 mt-1 w-24 rounded-lg border py-1 shadow-lg z-50 text-[10px] font-bold ${dropdownBg}`}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!currentUser || !currentUser.isLoggedIn) {
                    if (onShakeTrigger) onShakeTrigger();
                    return;
                  }
                  setIsMenuOpen(false);
                  if (onViewProfile && tipster) {
                    onViewProfile(tipster);
                  } else if (isCurrentUserPost && onNavigateToMyProfile) {
                    onNavigateToMyProfile();
                  }
                }}
                className="w-full text-left px-2.5 py-1 hover:bg-slate-500/10 transition-colors flex items-center space-x-1 cursor-pointer"
              >
                <span className="text-blue-500">.</span>
                <span>Profile</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!currentUser || !currentUser.isLoggedIn) {
                    if (onShakeTrigger) onShakeTrigger();
                    return;
                  }
                  setToastMessage("Reported");
                  setIsMenuOpen(false);
                }}
                className="w-full text-left px-2.5 py-1 hover:bg-slate-500/10 transition-colors flex items-center space-x-1"
              >
                <span className="text-red-500">.</span>
                <span>Report</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!currentUser || !currentUser.isLoggedIn) {
                    if (onShakeTrigger) onShakeTrigger();
                    return;
                  }
                  setToastMessage("Blocked");
                  setIsMenuOpen(false);
                }}
                className="w-full text-left px-2.5 py-1 hover:bg-slate-500/10 transition-colors flex items-center space-x-1"
              >
                <span className="text-red-500">.</span>
                <span>Block</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Temporary Feedback Message Toast */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="absolute left-6 top-0 ml-1.5 px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[9px] font-extrabold shadow-sm whitespace-nowrap z-50 flex items-center space-x-1"
            >
              <CheckCircle2 className="w-2.5 h-2.5" />
              <span>
                {toastMessage.startsWith("Profile")
                  ? toastMessage
                  : toastMessage === "Reported"
                    ? "Asante, umeripoti!"
                    : "Asante, ume-block!"}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Helpers for displaying players (scorers & assists) and card indicators
function getMatchPlayers(teamName: string, isHome: boolean, matchId: string) {
  const nameLower = teamName.toLowerCase();
  if (
    nameLower.includes("simba sc") ||
    nameLower.includes("simba queens") ||
    nameLower.includes("simba")
  ) {
    return isHome
      ? { scorers: "⚽ L. Onana (23')", assists: "Awesu" }
      : { scorers: "⚽ K. Denis (78')", assists: "Kapombe" };
  }
  if (nameLower.includes("yanga") || nameLower.includes("young africans")) {
    return isHome
      ? { scorers: "⚽ C. Mzize (15')", assists: "Yao" }
      : { scorers: "⚽ Pacome (62')", assists: "Maxi" };
  }
  if (nameLower.includes("real madrid") || nameLower.includes("madrid")) {
    return isHome
      ? { scorers: "⚽ Vini Jr. (18', 74')", assists: "Bellingham" }
      : { scorers: "⚽ Mbappe (45')", assists: "Valverde" };
  }
  if (nameLower.includes("barcelona") || nameLower.includes("barca")) {
    return isHome
      ? { scorers: "⚽ Lewandowski (30')", assists: "Raphinha" }
      : { scorers: "⚽ Lamine Yamal (65')", assists: "Pedri" };
  }
  if (nameLower.includes("man city") || nameLower.includes("manchester city")) {
    return isHome
      ? { scorers: "⚽ Haaland (12', 58')", assists: "De Bruyne" }
      : { scorers: "⚽ Foden (80')", assists: "Bernardo" };
  }
  if (nameLower.includes("arsenal")) {
    return isHome
      ? { scorers: "⚽ Saka (40')", assists: "Odegaard" }
      : { scorers: "⚽ Havertz (85')", assists: "Rice" };
  }
  if (nameLower.includes("chelsea")) {
    return isHome
      ? { scorers: "⚽ Palmer (33' pen)", assists: "Jackson" }
      : { scorers: "⚽ Madueke (71')", assists: "Enzo" };
  }
  if (nameLower.includes("liverpool")) {
    return isHome
      ? { scorers: "⚽ Salah (22')", assists: "Mac Allister" }
      : { scorers: "⚽ Diaz (50')", assists: "Szoboszlai" };
  }
  if (nameLower.includes("bayern")) {
    return isHome
      ? { scorers: "⚽ Kane (29')", assists: "Musiala" }
      : { scorers: "⚽ Olise (77')", assists: "Kimmich" };
  }
  if (nameLower.includes("psg") || nameLower.includes("paris")) {
    return isHome
      ? { scorers: "⚽ Barcola (10')", assists: "Dembele" }
      : { scorers: "⚽ Neves (82')", assists: "Hakimi" };
  }
  if (nameLower.includes("inter") || nameLower.includes("milan")) {
    return isHome
      ? { scorers: "⚽ Lautaro (44')", assists: "Barella" }
      : { scorers: "⚽ Thuram (69')", assists: "Dimarco" };
  }
  if (nameLower.includes("valencia")) {
    return isHome
      ? { scorers: "⚽ Hugo Duro (38')", assists: "D. López" }
      : { scorers: "⚽ J. Guerra (81')", assists: "Gayà" };
  }
  if (nameLower.includes("betis")) {
    return isHome
      ? { scorers: "⚽ Isco (24')", assists: "Fornals" }
      : { scorers: "⚽ Ayoze Pérez (53')", assists: "Isco" };
  }
  if (nameLower.includes("gor mahia")) {
    return isHome
      ? { scorers: "⚽ Benson (35')", assists: "Austin" }
      : { scorers: "⚽ Sibomana (75')", assists: "Onyango" };
  }
  if (nameLower.includes("afc leopards")) {
    return isHome
      ? { scorers: "⚽ Beja (41')", assists: "Miheso" }
      : { scorers: "⚽ Yakhama (89')", assists: "Musa" };
  }

  // Fallback for any other team
  const seed = (teamName.length + (matchId ? matchId.charCodeAt(0) : 0)) % 5;
  const genericScorers = [
    { scorers: "⚽ J. Juma (14')", assists: "S. Ally" },
    { scorers: "⚽ M. Thomas (54')", assists: "D. Brown" },
    { scorers: "⚽ K. Kamara (33')", assists: "A. Diallo" },
    { scorers: "⚽ P. Mwansa (67')", assists: "J. Phiri" },
    { scorers: "⚽ G. Mugisha (28')", assists: "E. Nsabimana" },
  ];
  return genericScorers[seed];
}

function getScoreValue(scoreStr: string, isHome: boolean): number {
  if (!scoreStr) return 0;
  const parts = scoreStr.split("-");
  if (parts.length === 2) {
    const val = parseInt(parts[isHome ? 0 : 1].trim(), 10);
    return isNaN(val) ? 0 : val;
  }
  return 0;
}

interface MatchListProps {
  tips: MatchTip[];
  isPro?: boolean;
  onUpgradeClick?: () => void;
  onPlaceBetClick?: (
    match: MatchTip,
    selectedOddType: "home" | "draw" | "away",
    oddValue: number,
  ) => void;
  onBetNowClick?: (
    match: MatchTip,
    selectedOddType: "home" | "draw" | "away",
    oddValue: number,
  ) => void;
  onInspectLockedDotClick?: (match: MatchTip) => void;
  onNavigateTab?: (tab: "Home" | "Tipsters" | "Aviator" | "Console" | "Wallet") => void;
  t?: any;
  theme?: "blue" | "dark" | "light";
  selectedBets?: { [matchId: string]: "home" | "draw" | "away" };
  isFiltered?: boolean;
  selectedSport?: string;
  selectedLeague?: string;
  selectedSubLeague?: string;
  activeSubTab?: "Kwako" | "Unlockers";
  isFeedLoading?: boolean;
  onResetFilters?: () => void;
  isLiveLoading?: boolean;
  liveApiStatus?: "connected" | "idle" | "error";
  onRefreshLiveMatches?: () => void;
  headerCategories?: React.ReactNode;
  selectedTopTab?: "All" | "Sports" | "eSports" | "Casino" | "TT Games";
  onViewProfile?: (tipster: any) => void;
  onOpenComments?: (match: MatchTip) => void;
  selectedCommentMatch?: MatchTip | null;
  onCloseComments?: () => void;
  currentUser?: UserProfile | null;
  lang?: "sw" | "fr" | "en";
  onAddNotification?: (msg: string, type: "success" | "error" | "info") => void;
  onShakeTrigger?: () => void;
  isProfileMode?: boolean;
}

export default function MatchList({
  tips,
  isPro = false,
  onUpgradeClick,
  onPlaceBetClick,
  onBetNowClick,
  onInspectLockedDotClick,
  onNavigateTab,
  t = {},
  theme = "blue",
  selectedBets = {},
  isFiltered = false,
  selectedSport = "All",
  selectedLeague = "All",
  selectedSubLeague = "All",
  activeSubTab = "Kwako",
  isFeedLoading = false,
  onResetFilters,
  isLiveLoading = false,
  liveApiStatus = "idle",
  onRefreshLiveMatches,
  headerCategories,
  selectedTopTab = "All",
  onViewProfile,
  onOpenComments,
  selectedCommentMatch,
  onCloseComments,
  currentUser,
  lang = "sw",
  onAddNotification,
  onShakeTrigger,
  isProfileMode = false,
}: MatchListProps) {
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);

  // User-scoped key for liked match IDs
  const userLikeKey =
    currentUser && currentUser.isLoggedIn
      ? (currentUser.id || currentUser.email || currentUser.username || "guest").toLowerCase()
      : null;

  const [likedMatchIds, setLikedMatchIds] = useState<string[]>([]);

  useEffect(() => {
    if (!userLikeKey) {
      setLikedMatchIds([]);
      return;
    }
  }, [userLikeKey]);

  const toggleLike = (matchId: string) => {
    if (!currentUser || !currentUser.isLoggedIn) {
      if (onShakeTrigger) onShakeTrigger();
      return;
    }
    setLikedMatchIds((prev) => {
      const isLiked = prev.includes(matchId);
      return isLiked ? prev.filter((id) => id !== matchId) : [...prev, matchId];
    });

    if (currentUser.id) {
      togglePostLikeInDatabase(String(matchId), currentUser.id, "match").catch(() => {});
    }
  };

  // Realtime ticking clock state for the 3-minute game cycles
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => (prev >= 179 ? 0 : prev + 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Helper to get initials
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  const formatVirtualName = (name: string) => {
    if (!name) return "";
    if (name.toLowerCase().startsWith("v-")) {
      return name.substring(2).trim();
    }
    return name;
  };

  const getLiveTimerString = (matchId: string) => {
    const seed = matchId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const totalMatchSeconds = (elapsedSeconds * 30 + (seed % 60)) % 5400;
    const mins = Math.floor(totalMatchSeconds / 60);
    const secs = totalMatchSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const toggleExpand = (id: string, isLocked: boolean) => {
    if (isLocked && !isPro) return; // Prevent expanding locked unless upgraded
    setExpandedMatchId(expandedMatchId === id ? null : id);
  };

  // --- Dynamic calculations for the 5 Top Live Virtual Games ---

  // 1. Football: V-Real Madrid vs V-Man City
  const ftMin = Math.min(90, Math.floor((elapsedSeconds / 180) * 90));
  let ftScore = "0 - 0";
  if (elapsedSeconds >= 140) ftScore = "2 - 1";
  else if (elapsedSeconds >= 90) ftScore = "1 - 1";
  else if (elapsedSeconds >= 40) ftScore = "1 - 0";

  // 2. Boxing: Tyson vs Holyfield
  const boxRound = Math.min(12, Math.floor(elapsedSeconds / 15) + 1);
  const punchT = Math.floor(34 + elapsedSeconds * 0.42);
  const punchH = Math.floor(29 + elapsedSeconds * 0.38);

  // 3. Aviator Premium Flight (Climbs and crashes every 25s)
  const aviatorCycle = elapsedSeconds % 25;
  const aviatorCrashed = aviatorCycle >= 21;
  const aviatorMult = aviatorCrashed
    ? (1.0 + Math.pow(21, 1.35) * 0.055).toFixed(2)
    : (1.0 + Math.pow(aviatorCycle, 1.35) * 0.055).toFixed(2);

  // 4. Basketball: V-Lakers vs V-Celtics
  const bkQtr =
    elapsedSeconds < 45 ? "Q1" : elapsedSeconds < 90 ? "Q2" : elapsedSeconds < 135 ? "Q3" : "Q4";
  const bkSecs = String(Math.floor((60 - (elapsedSeconds % 60)) % 60)).padStart(2, "0");
  const scoreL = Math.floor(65 + elapsedSeconds * 0.32);
  const scoreC = Math.floor(62 + elapsedSeconds * 0.34);

  // 5. Tennis: Alcaraz vs Sinner
  const tennisSet = elapsedSeconds < 60 ? "Set 1" : elapsedSeconds < 120 ? "Set 2" : "Set 3";
  const tennisGames = elapsedSeconds < 60 ? "5-4" : elapsedSeconds < 120 ? "3-3" : "6-5";
  const tennisPoints = ["0-15", "15-15", "30-15", "30-30", "40-30", "Ad-40"][
    Math.floor((elapsedSeconds % 12) / 2) % 6
  ];

  const isMatchLive = (m: any) => {
    if (!m) return false;
    const s = String(m.status || "").toUpperCase();
    return s === "LIVE" || s === "IN_PLAY" || s === "PAUSED" || s === "HALFTIME" || !!m.liveMinutes || !!m.liveScore;
  };

  const getMatchLiveScore = (m: any): string => {
    if (!m) return "0 - 0";
    if (m.liveScore && typeof m.liveScore === "string" && m.liveScore.trim().length > 0) {
      return m.liveScore;
    }
    if (m.homeScore != null && m.awayScore != null) {
      return `${m.homeScore} - ${m.awayScore}`;
    }
    if (m.score?.fullTime?.home != null && m.score?.fullTime?.away != null) {
      return `${m.score.fullTime.home} - ${m.score.fullTime.away}`;
    }
    if (m.score?.home != null && m.score?.away != null) {
      return `${m.score.home} - ${m.score.away}`;
    }
    if (m.rawScore) return String(m.rawScore);
    if (m.setScores && Array.isArray(m.setScores) && m.setScores.length > 0) {
      return m.setScores.join(" ");
    }
    if (m.id && String(m.id).startsWith("live-g-1")) {
      return ftScore;
    }
    return "0 - 0";
  };

  const getMatchLiveTimerDisplay = (m: any): string => {
    if (!m) return "LIVE";
    if (m.displayClock && m.displayClock !== "0'") return String(m.displayClock);
    if (m.liveClock) return String(m.liveClock);
    if (m.shortDetail && !m.shortDetail.toLowerCase().includes("scheduled")) return String(m.shortDetail);
    if (m.liveMinutes) {
      return String(m.liveMinutes).includes("'") ? String(m.liveMinutes) : `${m.liveMinutes}'`;
    }
    if (m.period) return `Q${m.period}`;
    return "LIVE";
  };

  const getMatchLiveMinute = (m: any): string => {
    if (m.displayClock && m.displayClock !== "0'") return String(m.displayClock);
    if (m.liveMinutes) {
      return String(m.liveMinutes).includes("'") ? String(m.liveMinutes) : `${m.liveMinutes}'`;
    }
    if (m.shortDetail) return String(m.shortDetail);
    return "LIVE";
  };

  const mappedLiveMatches = [
    // --- ESPAGNE ---
    {
      id: "live-g-valencia-betis",
      sport: "Football",
      category: "Espagne",
      league: "LaLiga",
      gender: "Man",
      homeTeam: { name: "Valencia", bgGlow: "rgba(249, 115, 22, 0.4)" },
      awayTeam: { name: "Real Betis", bgGlow: "rgba(16, 185, 129, 0.4)" },
      time: "Leo, 20:30 EAT",
      confidence: 88,
      predictionTip: "Valencia Kushinda au Sare (1X) & Magoli > 1.5",
      odds: { home: 2.3, draw: 3.1, away: 2.95 },
      status: "LIVE" as const,
      liveMinutes: "74'",
      liveScore: "2 - 1",
      payoutBadge: "LALIGA LIVE",
      tipster: { name: "TakeTalon Pro", avatarLetter: "T", isOfficial: true, badge: "PRO" },
      isPremium: false,
      analysisText:
        "Valencia wako mbele kwa 2-1 Mestalla kwa mashambulizi ya kasi kupitia mabawa, huku Real Betis wakisaka bao la kusawazisha.",
    },
    {
      id: "live-g-1",
      sport: "V-Football",
      category: "Espagne",
      league: "LaLiga",
      gender: "Man",
      homeTeam: { name: "V-Real Madrid", bgGlow: "rgba(59, 130, 246, 0.4)" },
      awayTeam: { name: "V-Barcelona", bgGlow: "rgba(239, 68, 68, 0.4)" },
      time: "Mchezo wa Mtandaoni",
      confidence: 94,
      predictionTip: "Real Madrid Kushinda (FT)",
      odds: { home: 1.95, draw: 3.4, away: 2.1 },
      status: "LIVE" as const,
      liveMinutes: `${ftMin}' Min`,
      liveScore: ftScore,
      payoutBadge: "KIZIDISHO VIRTUAL",
      tipster: { name: "AI Virtual Bot", avatarLetter: "AI", isOfficial: true, badge: "BOT" },
      isPremium: false,
      analysisText:
        "Uchambuzi wa kompyuta unaonyesha Real Madrid ina ari kubwa baada ya ushindi uliopita wa 3-0 kwenye FIFA Esports cup.",
    },
    {
      id: "live-g-1-fem",
      sport: "V-Football",
      category: "Espagne",
      league: "LaLiga",
      gender: "Woman",
      homeTeam: { name: "V-Barca Femeni", bgGlow: "rgba(30, 58, 138, 0.4)" },
      awayTeam: { name: "V-Real Madrid Fem", bgGlow: "rgba(220, 38, 38, 0.3)" },
      time: "Mchezo Live",
      confidence: 95,
      predictionTip: "V-Barca Femeni Kushinda (FT)",
      odds: { home: 1.35, draw: 4.8, away: 6.0 },
      status: "LIVE" as const,
      liveMinutes: "15' Min",
      liveScore: "1 - 0",
      payoutBadge: "LADY VIRTUAL",
      tipster: { name: "DadaKipira Bot", avatarLetter: "DK", isOfficial: true, badge: "AI" },
      isPremium: false,
      analysisText:
        "V-Barcelona Femeni wanaonesha uwezo mkubwa wa kumiliki mchezo kwa 72% na kufanya mashambulizi mengi.",
    },
    {
      id: "live-g-tennis",
      sport: "V-Tennis",
      category: "Espagne",
      league: "Madrid Open",
      gender: "Man",
      homeTeam: { name: "C. Alcaraz", bgGlow: "rgba(16, 185, 129, 0.4)" },
      awayTeam: { name: "J. Sinner", bgGlow: "rgba(16, 185, 129, 0.3)" },
      time: "Mchezo Live",
      confidence: 91,
      predictionTip: "Alcaraz Kushinda Seti ya Sasa",
      odds: { home: 1.75, draw: 6.0, away: 2.1 },
      status: "LIVE" as const,
      liveMinutes: `${tennisSet} (${tennisPoints})`,
      liveScore: tennisGames,
      payoutBadge: "COURT LIVE",
      tipster: { name: "Smasher Bot", avatarLetter: "SB", isOfficial: true, badge: "AI" },
      isPremium: false,
      analysisText:
        "Carlos Alcaraz anacheza kwa usahihi wa hali ya juu akitumia makosa ya backhand ya Sinner leo.",
    },

    // --- UK (UNITED KINGDOM) ---
    {
      id: "live-g-uk-man",
      sport: "V-Football",
      category: "UK",
      league: "Premier League",
      gender: "Man",
      homeTeam: { name: "V-Man City", bgGlow: "rgba(56, 189, 248, 0.4)" },
      awayTeam: { name: "V-Arsenal", bgGlow: "rgba(244, 63, 94, 0.4)" },
      time: "Mchezo Live",
      confidence: 92,
      predictionTip: "V-Man City Kushinda (FT)",
      odds: { home: 1.8, draw: 3.5, away: 2.7 },
      status: "LIVE" as const,
      liveMinutes: `${ftMin}' Min`,
      liveScore: ftScore,
      payoutBadge: "PREMIER VIRTUAL",
      tipster: { name: "AI Virtual Bot", avatarLetter: "AI", isOfficial: true, badge: "BOT" },
      isPremium: false,
      analysisText:
        "V-Man City wanamiliki kiungo vizuri na wana uwezo mkubwa wa kupenya ulinzi wa Arsenal leo.",
    },
    {
      id: "live-g-uk-woman",
      sport: "V-Football",
      category: "UK",
      league: "Premier League",
      gender: "Woman",
      homeTeam: { name: "V-Chelsea Women", bgGlow: "rgba(59, 130, 246, 0.4)" },
      awayTeam: { name: "V-Arsenal Women", bgGlow: "rgba(239, 68, 68, 0.3)" },
      time: "Mchezo Live",
      confidence: 90,
      predictionTip: "Chelsea Women Kushinda (FT)",
      odds: { home: 1.7, draw: 3.6, away: 3.2 },
      status: "LIVE" as const,
      liveMinutes: "25' Min",
      liveScore: "0 - 0",
      payoutBadge: "LADY SHIELD",
      tipster: { name: "LionessBets", avatarLetter: "L", isOfficial: false, badge: "PRO" },
      isPremium: false,
      analysisText:
        "Chelsea wanatengeneza nafasi nyingi za pembeni wakiongozwa na washambuliaji wao wenye kasi.",
    },

    // --- TANZANIA ---
    {
      id: "live-g-tz-man",
      sport: "V-Football",
      category: "Tanzania",
      league: "Ligi Kuu Bara",
      gender: "Man",
      homeTeam: { name: "V-Simba SC", bgGlow: "rgba(239, 68, 68, 0.4)" },
      awayTeam: { name: "V-Yanga SC", bgGlow: "rgba(234, 179, 8, 0.3)" },
      time: "Dabi ya Kariakoo Virtual",
      confidence: 93,
      predictionTip: "V-Simba SC Kushinda au Sare (1X)",
      odds: { home: 1.85, draw: 3.2, away: 2.45 },
      status: "LIVE" as const,
      liveMinutes: `${ftMin}' Min`,
      liveScore: ftScore,
      payoutBadge: "DABI YA KARIAKOO",
      tipster: { name: "Mchambuzi Bot", avatarLetter: "MB", isOfficial: true, badge: "AI" },
      isPremium: false,
      analysisText:
        "Mchezo una kasi ya ajabu, huku V-Simba wakitumia mashambulizi ya kushtukiza dhidi ya mahasimu wao.",
    },
    {
      id: "live-g-tz-woman",
      sport: "V-Football",
      category: "Tanzania",
      league: "Ligi Kuu Bara",
      gender: "Woman",
      homeTeam: { name: "V-Simba Queens", bgGlow: "rgba(220, 38, 38, 0.4)" },
      awayTeam: { name: "V-Yanga Princess", bgGlow: "rgba(16, 185, 129, 0.3)" },
      time: "Ligi ya Wanawake Virtual",
      confidence: 92,
      predictionTip: "V-Simba Queens Kushinda (FT)",
      odds: { home: 1.6, draw: 3.5, away: 3.8 },
      status: "LIVE" as const,
      liveMinutes: "35' Min",
      liveScore: "2 - 0",
      payoutBadge: "QUEENS DERBY",
      tipster: { name: "DadaKipira Bot", avatarLetter: "DK", isOfficial: true, badge: "AI" },
      isPremium: false,
      analysisText:
        "Simba Queens wana uzoefu mkubwa wa dabi na wanamiliki eneo la kiungo kwa 65% hivi sasa.",
    },

    // --- BURUNDI ---
    {
      id: "live-g-bi-man",
      sport: "V-Football",
      category: "Burundi",
      league: "Primus League",
      gender: "Man",
      homeTeam: { name: "V-Vital'O FC", bgGlow: "rgba(30, 58, 138, 0.4)" },
      awayTeam: { name: "V-Bumamuru FC", bgGlow: "rgba(220, 38, 38, 0.3)" },
      time: "Mchezo Live",
      confidence: 88,
      predictionTip: "V-Vital'O FC Kushinda (FT)",
      odds: { home: 1.95, draw: 3.1, away: 2.8 },
      status: "LIVE" as const,
      liveMinutes: `${ftMin}' Min`,
      liveScore: ftScore,
      payoutBadge: "PRIMUS SPECIAL",
      tipster: { name: "Kariakoo King", avatarLetter: "KK", isOfficial: false, badge: "PRO" },
      isPremium: false,
      analysisText:
        "Vital'O wanacheza kwenye uwanja wa nyumbani mtandaoni na wanasukuma mashambulizi mengi kupitia pembeni.",
    },

    // --- RWANDA ---
    {
      id: "live-g-rw-man",
      sport: "V-Football",
      category: "Rwanda",
      league: "Rwanda Premier League",
      gender: "Man",
      homeTeam: { name: "V-APR FC", bgGlow: "rgba(15, 23, 42, 0.4)" },
      awayTeam: { name: "V-Rayon Sports", bgGlow: "rgba(59, 130, 246, 0.3)" },
      time: "Dabi ya Kigali Virtual",
      confidence: 91,
      predictionTip: "Magoli Chini ya 2.5 (Under 2.5 Goals)",
      odds: { home: 2.1, draw: 3.0, away: 2.3 },
      status: "LIVE" as const,
      liveMinutes: `${ftMin}' Min`,
      liveScore: ftScore,
      payoutBadge: "KIGALI DERBY",
      tipster: { name: "Kigali Oracle", avatarLetter: "KO", isOfficial: true, badge: "AI" },
      isPremium: false,
      analysisText:
        "Ulinzi imara kwa pande zote mbili unazuia nafasi za hatari, mchezo utakuwa na magoli machache.",
    },

    // --- KENYA ---
    {
      id: "live-g-ke-man",
      sport: "V-Football",
      category: "Kenya",
      league: "FKF Premier League",
      gender: "Man",
      homeTeam: { name: "V-Gor Mahia", bgGlow: "rgba(16, 185, 129, 0.4)" },
      awayTeam: { name: "V-AFC Leopards", bgGlow: "rgba(59, 130, 246, 0.3)" },
      time: "Dabi ya Nairobi",
      confidence: 90,
      predictionTip: "V-Gor Mahia Kushinda (FT)",
      odds: { home: 1.8, draw: 3.3, away: 3.0 },
      status: "LIVE" as const,
      liveMinutes: `${ftMin}' Min`,
      liveScore: ftScore,
      payoutBadge: "MASHEMEJI DERBY",
      tipster: { name: "Nairobi Tipster", avatarLetter: "NT", isOfficial: false, badge: "PRO" },
      isPremium: false,
      analysisText:
        "Dabi ya Mashemeji ya virtual inaonyesha upinzani mkali sana, lakini kasi ya washambuliaji wa Gor Mahia itawapa ushindi.",
    },

    // --- USA (BASKETBALL, BOXING) ---
    {
      id: "live-g-usa-bk-man",
      sport: "V-Basketball",
      category: "USA",
      league: "NBA",
      gender: "Man",
      homeTeam: { name: "V-Lakers", bgGlow: "rgba(139, 92, 246, 0.4)" },
      awayTeam: { name: "V-Celtics", bgGlow: "rgba(139, 92, 246, 0.3)" },
      time: "Mchezo Live",
      confidence: 89,
      predictionTip: "Jumla ya Alama Chini ya 182.5",
      odds: { home: 1.9, draw: 11.0, away: 1.9 },
      status: "LIVE" as const,
      liveMinutes: `${bkQtr} 0:${bkSecs}`,
      liveScore: `${scoreL} - ${scoreC}`,
      payoutBadge: "NBA VIRTUAL",
      tipster: { name: "Hoops Bot", avatarLetter: "HB", isOfficial: true, badge: "AI" },
      isPremium: false,
      analysisText:
        "Ulinzi mkali katika robo hii unaongeza uwezekano mkubwa wa kubeba matokeo ya alama chache.",
    },
    {
      id: "live-g-usa-bk-woman",
      sport: "V-Basketball",
      category: "USA",
      league: "WNBA",
      gender: "Woman",
      homeTeam: { name: "V-NY Liberty", bgGlow: "rgba(14, 116, 144, 0.4)" },
      awayTeam: { name: "V-LV Aces", bgGlow: "rgba(190, 24, 74, 0.4)" },
      time: "Mchezo Live",
      confidence: 91,
      predictionTip: "V-NY Liberty Kushinda (FT)",
      odds: { home: 1.65, draw: 12.0, away: 2.1 },
      status: "LIVE" as const,
      liveMinutes: `${bkQtr} 0:${bkSecs}`,
      liveScore: `${scoreL + 10} - ${scoreC + 5}`,
      payoutBadge: "WNBA GOLD",
      tipster: { name: "LadyHoops AI", avatarLetter: "LH", isOfficial: true, badge: "AI" },
      isPremium: false,
      analysisText:
        "New York Liberty wana kiwango cha juu cha kupiga mitupo ya pointi 3 asilimia 45 hivi sasa.",
    },
    {
      id: "live-g-usa-box",
      sport: "V-Boxing",
      category: "USA",
      league: "WBC USA",
      gender: "Man",
      homeTeam: { name: "M. Tyson", bgGlow: "rgba(239, 68, 68, 0.4)" },
      awayTeam: { name: "E. Holyfield", bgGlow: "rgba(239, 68, 68, 0.3)" },
      time: `Raundi ya ${boxRound}`,
      confidence: 96,
      predictionTip: "M. Tyson Kushinda kwa KO",
      odds: { home: 1.85, draw: 8.5, away: 2.4 },
      status: "LIVE" as const,
      liveMinutes: `Rd ${boxRound}/12`,
      liveScore: `${punchT} - ${punchH}`,
      payoutBadge: "KO SPECIAL",
      tipster: { name: "Puncher Bot", avatarLetter: "PB", isOfficial: true, badge: "AI" },
      isPremium: false,
      analysisText:
        "Tyson anaonyesha kiwango kifupi cha nguvu na upigaji wa ndondi mfululizo uliothibitishwa na mfumo.",
    },
  ];

  // --- Real-world match cards mapped as standard MatchTips (Top other bet) ---
  const mappedOtherBets = [
    // --- UK (UNITED KINGDOM) ---
    {
      id: "other-b-1",
      sport: "Football",
      category: "UK",
      league: "Premier League",
      gender: "Man",
      homeTeam: { name: "Arsenal", bgGlow: "rgba(239, 68, 68, 0.4)" },
      awayTeam: { name: "Chelsea", bgGlow: "rgba(59, 130, 246, 0.3)" },
      time: "Kesho, 18:30",
      confidence: 89,
      predictionTip: "Ushindi wa Nyumbani (Home Win)",
      odds: { home: 1.82, draw: 3.6, away: 3.9 },
      status: "UPCOMING" as const,
      liveMinutes: "",
      payoutBadge: "PREMIER GOLD",
      tipster: { name: "AI Global Expert", avatarLetter: "GE", isOfficial: true, badge: "ELITE" },
      isPremium: false,
      analysisText:
        "Timu ya nyumbani ikiwa kwenye uwanja wake wa nyumbani ina takwimu bora sana na inatazamiwa kupata ushindi wa kishindo.",
    },
    {
      id: "other-b-1-fem",
      sport: "Football",
      category: "UK",
      league: "Premier League",
      gender: "Woman",
      homeTeam: { name: "Chelsea FC Women", bgGlow: "rgba(59, 130, 246, 0.4)" },
      awayTeam: { name: "Arsenal WFC", bgGlow: "rgba(239, 68, 68, 0.3)" },
      time: "Kesho, 15:00",
      confidence: 88,
      predictionTip: "Magoli zaidi ya 2.5 (Over 2.5 Goals)",
      odds: { home: 1.95, draw: 3.4, away: 3.1 },
      status: "UPCOMING" as const,
      liveMinutes: "",
      payoutBadge: "LADY SHIELD",
      tipster: { name: "LionessBets", avatarLetter: "L", isOfficial: false, badge: "PRO" },
      isPremium: false,
      analysisText:
        "Mechi zenye ushindani mkubwa ambapo timu zote hotoa burudani ya kipekee na magoli mengi.",
    },

    // --- ESPAGNE ---
    {
      id: "other-b-2",
      sport: "Football",
      category: "Espagne",
      league: "LaLiga",
      gender: "Man",
      homeTeam: { name: "Real Madrid", bgGlow: "rgba(59, 130, 246, 0.4)" },
      awayTeam: { name: "Barcelona", bgGlow: "rgba(239, 68, 68, 0.3)" },
      time: "Jumapili, 22:00",
      confidence: 91,
      predictionTip: "Magoli zaidi ya 2.5 (Over 2.5)",
      odds: { home: 1.95, draw: 3.8, away: 3.1 },
      status: "UPCOMING" as const,
      liveMinutes: "",
      payoutBadge: "EL CLASICO",
      tipster: { name: "AI Global Expert", avatarLetter: "GE", isOfficial: true, badge: "ELITE" },
      isPremium: false,
      analysisText:
        "Mtanange huu unatarajiwa kuwa na idadi kubwa ya mabao kutokana na ushambuliaji imara wa pande zote mbili.",
    },
    {
      id: "other-b-2-fem",
      sport: "Football",
      category: "Espagne",
      league: "LaLiga",
      gender: "Woman",
      homeTeam: { name: "Barcelona Femeni", bgGlow: "rgba(30, 58, 138, 0.4)" },
      awayTeam: { name: "Real Madrid Fem", bgGlow: "rgba(255, 255, 255, 0.15)" },
      time: "Jumapili, 18:30",
      confidence: 94,
      predictionTip: "Barcelona Femeni Kushinda (FT)",
      odds: { home: 1.18, draw: 6.5, away: 12.0 },
      status: "UPCOMING" as const,
      liveMinutes: "",
      payoutBadge: "LADY CLASICO",
      tipster: { name: "DadaKipira", avatarLetter: "D", isOfficial: true, badge: "LADY" },
      isPremium: false,
      analysisText: "Utawala madhubuti wa Barcelona Femeni unaendelea kuleta matokeo bora hapa.",
    },

    // --- ITALY ---
    {
      id: "other-b-3",
      sport: "Football",
      category: "Italy",
      league: "Serie A",
      gender: "Man",
      homeTeam: { name: "AC Milan", bgGlow: "rgba(239, 68, 68, 0.4)" },
      awayTeam: { name: "Inter Milan", bgGlow: "rgba(30, 41, 59, 0.3)" },
      time: "Leo, 21:45",
      confidence: 86,
      predictionTip: "Kila Timu Ifunge (GG / BTTS)",
      odds: { home: 2.4, draw: 3.3, away: 2.25 },
      status: "UPCOMING" as const,
      liveMinutes: "",
      payoutBadge: "MILAN DERBY",
      tipster: { name: "AI Global Expert", avatarLetter: "GE", isOfficial: true, badge: "ELITE" },
      isPremium: false,
      analysisText:
        "Derby ya Milan ni yenye ushindani na timu zote mara nyingi hujitahidi kupata magoli huku ulinzi ukiacha nafasi.",
    },
    // NOTE: DadaKipira VIP Elite card moved to Today's Combo (see dadaKipiraVipEliteCard below)

    // --- ALLEMAGNE ---
    {
      id: "other-b-4",
      sport: "Football",
      category: "Allemagne",
      league: "Bundesliga",
      gender: "Man",
      homeTeam: { name: "Bayern Munich", bgGlow: "rgba(239, 68, 68, 0.4)" },
      awayTeam: { name: "Dortmund", bgGlow: "rgba(234, 179, 8, 0.3)" },
      time: "Kesho, 19:30",
      confidence: 93,
      predictionTip: "Ushindi wa Nyumbani (Home Win)",
      odds: { home: 1.45, draw: 4.8, away: 5.5 },
      status: "UPCOMING" as const,
      liveMinutes: "",
      payoutBadge: "DER KLASSIKER",
      tipster: { name: "AI Global Expert", avatarLetter: "GE", isOfficial: true, badge: "ELITE" },
      isPremium: false,
      analysisText:
        "Timu ya nyumbani ikiwa kwenye uwanja wake ina ari kubwa na inabeba dhamana kubwa ya ushindi leo.",
    },
    {
      id: "other-b-4-fem",
      sport: "Football",
      category: "Allemagne",
      league: "Bundesliga",
      gender: "Woman",
      homeTeam: { name: "Bayern Women", bgGlow: "rgba(239, 68, 68, 0.4)" },
      awayTeam: { name: "Wolfsburg Women", bgGlow: "rgba(16, 185, 129, 0.3)" },
      time: "Kesho, 16:00",
      confidence: 91,
      predictionTip: "Magoli zaidi ya 2.5 (Over 2.5)",
      odds: { home: 1.8, draw: 3.5, away: 3.8 },
      status: "UPCOMING" as const,
      liveMinutes: "",
      payoutBadge: "FRAUEN CLASSIC",
      tipster: { name: "LionessBets", avatarLetter: "L", isOfficial: false, badge: "PRO" },
      isPremium: false,
      analysisText:
        "Wolfsburg na Bayern wamekuwa na mechi zenye upinzani wa kipekee, huku idadi kubwa ya mashambulizi ikizalisha mabao.",
    },

    // --- FRANCE ---
    {
      id: "other-b-5",
      sport: "Football",
      category: "France",
      league: "Ligue 1",
      gender: "Man",
      homeTeam: { name: "Marseille", bgGlow: "rgba(59, 130, 246, 0.4)" },
      awayTeam: { name: "PSG", bgGlow: "rgba(139, 92, 246, 0.3)" },
      time: "Jumapili, 22:00",
      confidence: 85,
      predictionTip: "Marseille au PSG Kushinda (12)",
      odds: { home: 2.8, draw: 4.2, away: 2.1 },
      status: "UPCOMING" as const,
      liveMinutes: "",
      payoutBadge: "LE CLASSIQUE",
      tipster: { name: "AI Global Expert", avatarLetter: "GE", isOfficial: true, badge: "ELITE" },
      isPremium: false,
      analysisText:
        "Dabi kuu ya Ufaransa daima haina utabiri rahisi, lakini timu zote zitajitahidi kupata matokeo kamili bila sare.",
    },
    {
      id: "other-b-5-fem",
      sport: "Football",
      category: "France",
      league: "Ligue 1",
      gender: "Woman",
      homeTeam: { name: "Lyon Women", bgGlow: "rgba(190, 24, 74, 0.4)" },
      awayTeam: { name: "PSG Women", bgGlow: "rgba(59, 130, 246, 0.3)" },
      time: "Jumapili, 15:00",
      confidence: 93,
      predictionTip: "Lyon Women Kushinda (FT)",
      odds: { home: 1.5, draw: 4.0, away: 5.2 },
      status: "UPCOMING" as const,
      liveMinutes: "",
      payoutBadge: "LADY CLASSIC",
      tipster: { name: "DadaKipira", avatarLetter: "D", isOfficial: true, badge: "LADY" },
      isPremium: false,
      analysisText:
        "Lyon Women ni timu bora zaidi nchini Ufaransa na wamekuwa na takwimu thabiti kabisa nyumbani msimu huu.",
    },

    // --- TANZANIA ---
    {
      id: "other-b-tz-man",
      sport: "Football",
      category: "Tanzania",
      league: "Ligi Kuu Bara",
      gender: "Man",
      homeTeam: { name: "Simba SC", bgGlow: "rgba(239, 68, 68, 0.4)" },
      awayTeam: { name: "Yanga SC", bgGlow: "rgba(234, 179, 8, 0.3)" },
      time: "Kesho, 16:00",
      confidence: 94,
      predictionTip: "Yanga SC Kushinda au Sare (X2)",
      odds: { home: 2.6, draw: 3.1, away: 2.4 },
      status: "UPCOMING" as const,
      liveMinutes: "",
      payoutBadge: "KARIAKOO CLASSIC",
      tipster: { name: "DadaKipira", avatarLetter: "D", isOfficial: true, badge: "LADY" },
      isPremium: false,
      analysisText:
        "Yanga wapo kwenye kiwango bora cha kiufundi lakini Simba wana hamu ya kulipa kisasi cha dabi iliyopita.",
    },
    {
      id: "other-b-tz-woman",
      sport: "Football",
      category: "Tanzania",
      league: "Ligi Kuu Bara",
      gender: "Woman",
      homeTeam: { name: "Simba Queens", bgGlow: "rgba(220, 38, 38, 0.4)" },
      awayTeam: { name: "Yanga Princess", bgGlow: "rgba(16, 185, 129, 0.3)" },
      time: "Jumapili, 14:00",
      confidence: 92,
      predictionTip: "Simba Queens Kushinda (FT)",
      odds: { home: 1.55, draw: 3.4, away: 5.0 },
      status: "UPCOMING" as const,
      liveMinutes: "",
      payoutBadge: "LADY BARA",
      tipster: { name: "Mchambuzi Bot", avatarLetter: "MB", isOfficial: true, badge: "AI" },
      isPremium: false,
      analysisText:
        "Mabingwa watetezi Simba Queens wana faida kubwa ya uzoefu na wachezaji wa kimataifa katika safu yao ya ushambuliaji.",
    },

    // --- BURUNDI ---
    {
      id: "other-b-bi-man",
      sport: "Football",
      category: "Burundi",
      league: "Primus League",
      gender: "Man",
      homeTeam: { name: "Vital'O FC", bgGlow: "rgba(30, 58, 138, 0.4)" },
      awayTeam: { name: "Bumamuru FC", bgGlow: "rgba(220, 38, 38, 0.3)" },
      time: "Kesho, 15:00",
      confidence: 89,
      predictionTip: "Vital'O FC Kushinda (FT)",
      odds: { home: 1.9, draw: 3.2, away: 3.1 },
      status: "UPCOMING" as const,
      liveMinutes: "",
      payoutBadge: "PRIMUS DABI",
      tipster: { name: "AI Global Expert", avatarLetter: "GE", isOfficial: true, badge: "ELITE" },
      isPremium: false,
      analysisText:
        "Vital'O wakiwa uwanja wao wa nyumbani huko Bujumbura wana rekodi nzuri ya kutopoteza mechi 10 zilizopita.",
    },

    // --- RWANDA ---
    {
      id: "other-b-rw-man",
      sport: "Football",
      category: "Rwanda",
      league: "Rwanda Premier League",
      gender: "Man",
      homeTeam: { name: "APR FC", bgGlow: "rgba(15, 23, 42, 0.4)" },
      awayTeam: { name: "Rayon Sports", bgGlow: "rgba(59, 130, 246, 0.3)" },
      time: "Kesho, 18:00",
      confidence: 90,
      predictionTip: "Sare au APR FC Kushinda (1X)",
      odds: { home: 1.85, draw: 3.0, away: 3.2 },
      status: "UPCOMING" as const,
      liveMinutes: "",
      payoutBadge: "KIGALI CLASSIC",
      tipster: { name: "Kigali Oracle", avatarLetter: "KO", isOfficial: true, badge: "AI" },
      isPremium: false,
      analysisText:
        "APR FC wamejipanga vizuri kiulinzi na mara zote huwa wagumu kufungika kwenye uwanja wa Amahoro.",
    },

    // --- KENYA ---
    {
      id: "other-b-ke-man",
      sport: "Football",
      category: "Kenya",
      league: "FKF Premier League",
      gender: "Man",
      homeTeam: { name: "Gor Mahia", bgGlow: "rgba(16, 185, 129, 0.4)" },
      awayTeam: { name: "AFC Leopards", bgGlow: "rgba(59, 130, 246, 0.3)" },
      time: "Kesho, 15:00",
      confidence: 91,
      predictionTip: "Gor Mahia Kushinda (FT)",
      odds: { home: 1.75, draw: 3.3, away: 3.8 },
      status: "UPCOMING" as const,
      liveMinutes: "",
      payoutBadge: "NAIROBI DABI",
      tipster: { name: "Nairobi Tipster", avatarLetter: "NT", isOfficial: false, badge: "PRO" },
      isPremium: false,
      analysisText:
        "Gor Mahia wana uongozi thabiti wa ligi na wachezaji wao wana ari kubwa baada ya kurejea kwa kiungo wao mchezeshaji.",
    },

    // --- ARABIA ---
    {
      id: "other-b-sa-man",
      sport: "Football",
      category: "Arabia",
      league: "Saudi Pro League",
      gender: "Man",
      homeTeam: { name: "Al Hilal", bgGlow: "rgba(59, 130, 246, 0.4)" },
      awayTeam: { name: "Al Nassr", bgGlow: "rgba(234, 179, 8, 0.3)" },
      time: "Jumatatu, 21:00",
      confidence: 92,
      predictionTip: "Magoli zaidi ya 2.5 (Over 2.5 Goals)",
      odds: { home: 1.85, draw: 3.9, away: 3.0 },
      status: "UPCOMING" as const,
      liveMinutes: "",
      payoutBadge: "SAUDI SPECIAL",
      tipster: { name: "AI Global Expert", avatarLetter: "GE", isOfficial: true, badge: "ELITE" },
      isPremium: false,
      analysisText:
        "Wafungaji bora wa pande zote wako fiti, mchezo utakuwa na mashambulizi makali na magoli mengi.",
    },
  ];

  const getCleanSport = (s: string) => {
    if (s.startsWith("V-")) return s.substring(2);
    return s;
  };

  const filterMatches = (list: any[]) => {
    return list.filter((item) => {
      const itemSport = getCleanSport(item.sport);

      // Specifically ensure Aviator is excluded if we are in Football
      if (selectedSport.toLowerCase() === "football" && itemSport.toLowerCase() === "aviator") {
        return false;
      }

      if (selectedSport !== "All") {
        if (selectedSport.toLowerCase() === "games") {
          // It's a game if its sport starts with "V-" or is "Aviator"
          const isVirtualOrAviator =
            item.sport.startsWith("V-") || item.sport.toLowerCase() === "aviator";
          if (!isVirtualOrAviator) {
            return false;
          }
        } else {
          if (itemSport.toLowerCase() !== selectedSport.toLowerCase()) {
            return false;
          }
        }
      }

      if (selectedLeague !== "All") {
        if (!item.category || item.category.toLowerCase() !== selectedLeague.toLowerCase()) {
          return false;
        }
      }

      if (selectedSubLeague !== "All") {
        if (!item.league || item.league.toLowerCase() !== selectedSubLeague.toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  };

  const filteredLiveMatches = filterMatches(mappedLiveMatches).filter(
    (m) => m.id !== "live-g-aviator" && m.category !== "Aviator" && m.sport !== "Aviator" && m.id !== "game-tip-1"
  );
  const filteredOtherBets = filterMatches(mappedOtherBets);

  // DadaKipira VIP Elite card — moved from Top Other Bet into Today's Combo (design unchanged)
  const dadaKipiraVipEliteCard = {
    id: "other-b-3-fem",
    sport: "Football",
    category: "Italy",
    league: "Serie A",
    gender: "Woman",
    homeTeam: { name: "Juventus Women", bgGlow: "rgba(255, 255, 255, 0.15)" },
    awayTeam: { name: "Roma Women", bgGlow: "rgba(220, 38, 38, 0.3)" },
    time: "Jumatano, 19:30",
    confidence: 85,
    predictionTip: "Magoli Chini ya 2.5 (Under 2.5)",
    odds: { home: 2.1, draw: 3.3, away: 3.0 },
    status: "UPCOMING" as const,
    liveMinutes: "",
    payoutBadge: "LADY DERBY",
    tipster: { name: "DadaKipira", avatarLetter: "D", isOfficial: true, badge: "LADY" },
    isPremium: true,
    analysisText:
      "Kichwa cha dabi hii ya kipekee kitakuwa cha tahadhari. Ulinzi madhubuti wa pande zote utaleta magoli machache.",
  };

  const virtualGamesList: any[] = [];
  if (
    selectedSport === "Games" &&
    ["Football", "Basketball", "Boxing", "Multiplayer"].includes(selectedLeague)
  ) {
    let homeName = "PSG Virtual";
    let awayName = "Real Madrid Virtual";
    let leagueName = "FIFA Virtual Super Cup";
    let badge = "FIFA 25";
    let defaultOdds = { home: 1.95, draw: 3.4, away: 2.8 };

    if (selectedLeague === "Basketball") {
      homeName = "L.A. Lakers Virtual";
      awayName = "Boston Celtics Virtual";
      leagueName = "NBA 2K Championship";
      badge = "NBA 2K";
      defaultOdds = { home: 1.85, draw: 1.0, away: 1.95 };
    } else if (selectedLeague === "Boxing") {
      homeName = "Mike Tyson Virtual";
      awayName = "Muhammad Ali Virtual";
      leagueName = "Fight Night Virtual";
      badge = "BOXING VR";
      defaultOdds = { home: 1.75, draw: 1.0, away: 2.1 };
    } else if (selectedLeague === "Multiplayer") {
      const subL = selectedSubLeague !== "All" ? selectedSubLeague : "Ludo";
      homeName = `${subL} Team Alpha`;
      awayName = `${subL} Team Omega`;
      leagueName = `${subL} Pro Cup`;
      badge = subL.toUpperCase();
      defaultOdds = { home: 2.05, draw: 3.1, away: 2.2 };
    }

    const comingSoonMatch = {
      id: `coming-soon-${selectedLeague.toLowerCase()}-${selectedSubLeague.toLowerCase()}`,
      sport: "Games",
      category: selectedLeague,
      league: leagueName,
      gender: "All",
      homeTeam: { name: homeName, bgGlow: "rgba(59, 130, 246, 0.4)" },
      awayTeam: { name: awayName, bgGlow: "rgba(239, 68, 68, 0.4)" },
      time: "Coming Soon / Siku za Usoni",
      confidence: 95,
      predictionTip: "Ubashiri Utafunguliwa Hivi Karibuni!",
      odds: defaultOdds,
      status: "COMING_SOON" as any,
      liveMinutes: "",
      payoutBadge: badge,
      tipster: { name: "TakeTalon Virtual", avatarLetter: "V", isOfficial: true, badge: "VIRTUAL" },
      isPremium: false,
      analysisText:
        "Mechi hii ya mtandaoni (virtual) itaanza hivi karibuni. Unaweza kuongeza chaguo hili kwenye jamvi lako sasa ili uwe wa kwanza kushinda mara tu mchezo unapoanza!",
    };
    virtualGamesList.push(comingSoonMatch);
  }

  const tipsWithDada = selectedSport === "All" ? tips : [dadaKipiraVipEliteCard, ...tips];

  const matchesTopTab = (item: any) => {
    if (!item) return false;
    const itemSport = (item.sport || "").toLowerCase();
    const itemCategory = (item.category || "").toLowerCase();
    const itemLeague = (item.league || "").toLowerCase();
    const itemId = (item.id || "").toLowerCase();

    if (selectedTopTab === "All" || selectedTopTab === "Sports") {
      // Exclude virtual/eSports/Casino/TT Games
      if (
        itemSport === "games" ||
        itemSport === "aviator" ||
        itemCategory === "aviator" ||
        itemLeague === "aviator" ||
        itemCategory === "multiplayer" ||
        itemSport === "multiplayer" ||
        itemSport.startsWith("v-") ||
        itemId.includes("aviator")
      ) {
        return false;
      }
      // Show ONLY Football post cards when selectedSport is "All" (by default)
      if (selectedSport === "All") {
        return itemSport === "football" || itemSport === "soccer";
      }
      return true;
    } else if (selectedTopTab === "eSports") {
      // Only eSports/Virtual (i.e. Games, but not Aviator or Multiplayer)
      if (
        itemCategory === "multiplayer" ||
        itemSport === "multiplayer" ||
        itemSport === "aviator" ||
        itemCategory === "aviator" ||
        itemId.includes("aviator")
      ) {
        return false;
      }
      return (
        itemSport === "games" ||
        itemSport.startsWith("v-") ||
        itemId.startsWith("virtual") ||
        itemId.startsWith("game")
      );
    } else if (selectedTopTab === "Casino") {
      // Only Casino (e.g. Aviator)
      return (
        itemSport === "aviator" ||
        itemCategory === "aviator" ||
        itemLeague === "aviator" ||
        itemId.includes("aviator") ||
        itemId.includes("casino")
      );
    } else if (selectedTopTab === "TT Games") {
      // Only TT Games (multiplayer)
      return (
        itemCategory === "multiplayer" ||
        itemSport === "multiplayer" ||
        itemId.includes("multiplayer") ||
        itemId.includes("tt") ||
        itemId.includes("champions")
      );
    }
    return true;
  };

  // Base list of cards
  const baseCombined =
    selectedSport === "Games"
      ? selectedLeague === "All"
        ? filteredLiveMatches.filter((m) => m.id !== "live-g-aviator")
        : selectedLeague === "Aviator"
          ? filteredLiveMatches
          : virtualGamesList
      : filterMatches(tipsWithDada).filter((m) => m.id !== "live-g-aviator");

  // If specific subtabs are chosen or filtering, filter matching the tab,
  // else if we are on a specific tab (eSports, Casino, TT Games), we might want to scan the full tips array to make sure they are always fully populated with their corresponding post cards!
  const combinedTodaysCombo =
    selectedTopTab === "All" || selectedTopTab === "Sports"
      ? baseCombined.filter(matchesTopTab)
      : filterMatches(tips).filter(matchesTopTab);

  // --- Purchase plans (Top other store) ---
  const topOtherStore = [
    {
      id: "plan-1",
      title: "PRO ELITE",
      tag: "Inapendekezwa zaidi 🔥",
      price: "FBU 15,000",
      perks: "Doti za siri + Mchanganuo wa AI",
      color: "from-amber-600 to-yellow-500",
      hot: true,
    },
  ];

  // --- Beautiful Real Calendar List Item for La Liga (Espagne) ---
  const renderLaLigaListItem = (match: any) => {
    const isMatchLocked =
      activeSubTab === "Unlockers"
        ? false
        : match.isPremium && !isPro && !match.tipster?.isOfficial;
    const isHomeSelected = selectedBets?.[match.id] === "home";
    const isDrawSelected = selectedBets?.[match.id] === "draw";
    const isAwaySelected = selectedBets?.[match.id] === "away";
    const oddsAvailable = match.oddsAvailable === true;

    const isSwahiliLang =
      (t.prediction || "").includes("Doti") ||
      (t.prediction || "").includes("Ushindi") ||
      (t.home || "").toLowerCase().includes("nyumbani") ||
      (t.away || "").toLowerCase().includes("ugenini");
    const betText = isSwahiliLang ? "Kabeti" : "Bet Now";
    const buyText = isSwahiliLang ? "Nunua VIP" : "Buy VIP";

    const renderTeamLogo = (team: any, size: string = "w-6 h-6") => {
      if (team.logoUrl) {
        return (
          <img
            src={team.logoUrl}
            alt={team.name}
            className={`${size} object-contain transition-transform`}
            referrerPolicy="no-referrer"
          />
        );
      }
      return (
        <div
          className={`rounded-full flex items-center justify-center font-bold text-[8px] ${size} ${
            theme === "light"
              ? "bg-slate-100 text-slate-700 border border-slate-200"
              : "bg-neutral-900 text-slate-350 border border-neutral-800"
          }`}
        >
          {getInitials(team.name)}
        </div>
      );
    };

    return (
      <div
        key={match.id}
        className={`border transition-all duration-200 py-1.5 px-2 sm:px-3 flex flex-col md:flex-row md:items-center justify-between gap-2 rounded-xl ${
          theme === "light"
            ? "bg-white border-slate-150 hover:bg-slate-50/50"
            : theme === "blue"
              ? "bg-black/15 border border-white/10 hover:bg-black/25 text-white"
              : "bg-[#0c0c0d] border-neutral-900 hover:bg-neutral-900/40"
        }`}
      >
        {/* COL 1: Time, League & VIP Badge */}
        <div className="flex flex-col sm:flex-row md:flex-col sm:items-center md:items-start justify-between gap-1.5 shrink-0 md:min-w-[200px]">
          <div className="flex items-center space-x-1.5">
            <Calendar
              className={`w-3.5 h-3.5 shrink-0 ${theme === "blue" ? "text-blue-100" : "text-blue-500"}`}
            />
            <span
              className={`text-xs sm:text-[12.5px] font-black tracking-tight ${
                theme === "light"
                  ? "text-slate-600"
                  : theme === "blue"
                    ? "text-blue-50"
                    : "text-slate-300"
              }`}
            >
              {match.time || "18:00 EAT"}
            </span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span
              className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${
                theme === "light"
                  ? "bg-slate-100 text-slate-600"
                  : theme === "blue"
                    ? "bg-black/20 text-blue-100 border border-white/10"
                    : "bg-neutral-900 text-slate-400"
              }`}
            >
              {match.league
                ? match.league.length > 15
                  ? match.league.slice(0, 15) + ".."
                  : match.league
                : "LIGA"}
            </span>
            {isMatchLocked && (
              <span className="bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-0.5 shadow-sm shrink-0">
                VIP
              </span>
            )}
          </div>
        </div>

        {/* COL 2: Teams (Home vs Away) */}
        <div className="flex-1 flex items-center justify-between md:justify-start gap-2 min-w-[180px]">
          {/* Home Team */}
          <div className="flex items-center space-x-1.5 max-w-[45%] flex-1 justify-end">
            <span
              className={`text-[11px] font-black truncate text-right ${
                theme === "light"
                  ? "text-slate-800"
                  : theme === "blue"
                    ? "text-white"
                    : "text-slate-200"
              }`}
            >
              {match.homeTeam.name}
            </span>
            {renderTeamLogo(match.homeTeam)}
          </div>

          {/* Live Score + Time Movement or VS */}
          {isMatchLive(match) || match.status === "ENDED" ? (
            <ScrollingScoreBadge
              scoreDisplay={getMatchLiveScore(match)}
              setScoresList={match.setScores || match.set_scores}
              isEnded={match.status === "ENDED"}
              isBreak={match.status === "HALFTIME" || match.status === "PAUSED"}
              isLive={isMatchLive(match)}
              timeMovementDisplay={
                match.status === "ENDED"
                  ? "FT"
                  : match.status === "HALFTIME" || match.status === "PAUSED"
                    ? "HT"
                    : getMatchLiveTimerDisplay(match)
              }
            />
          ) : (
            <span
              className={`text-[8.5px] font-black px-1.5 py-0.5 rounded text-center shrink-0 border ${
                theme === "light"
                  ? "bg-slate-200 text-slate-900 border-slate-300"
                  : theme === "blue"
                    ? "bg-white text-slate-950 font-black border-white/60"
                    : "bg-neutral-900 text-slate-200 border-neutral-800"
              }`}
            >
              VS
            </span>
          )}

          {/* Away Team */}
          <div className="flex items-center space-x-1.5 max-w-[45%] flex-1 justify-start">
            {renderTeamLogo(match.awayTeam)}
            <span
              className={`text-[11px] font-black truncate text-left ${
                theme === "light"
                  ? "text-slate-800"
                  : theme === "blue"
                    ? "text-white"
                    : "text-slate-200"
              }`}
            >
              {match.awayTeam.name}
            </span>
          </div>
        </div>

        {/* COL 3: Odds & Actions Row */}
        <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
          {/* Odds Buttons */}
          <div className="flex items-center space-x-1 text-xs font-bold">
            <button
              onClick={() => oddsAvailable && onPlaceBetClick?.(match, "home", match.odds.home)}
              className={`px-1.5 py-0.5 rounded transition-all active:scale-95 text-[10px] font-bold flex items-center ${
                isHomeSelected
                  ? "bg-blue-600 text-white shadow-sm border border-blue-600 font-extrabold"
                  : theme === "light"
                    ? "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"
                    : theme === "blue"
                      ? "bg-black/30 hover:bg-black/45 border border-white/10 text-white"
                      : "bg-neutral-900 text-slate-350 hover:bg-neutral-850 border border-neutral-800/60"
              }`}
            >
              <span
                className={`text-[8px] font-medium mr-1 ${isHomeSelected ? "text-blue-200" : "text-blue-100/60"}`}
              >
                1
              </span>
              {oddsAvailable ? match.odds.home.toFixed(2) : "—"}
            </button>
            <button
              onClick={() => oddsAvailable && onPlaceBetClick?.(match, "draw", match.odds.draw)}
              className={`px-1.5 py-0.5 rounded transition-all active:scale-95 text-[10px] font-bold flex items-center ${
                isDrawSelected
                  ? "bg-blue-600 text-white shadow-sm border border-blue-600 font-extrabold"
                  : theme === "light"
                    ? "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"
                    : theme === "blue"
                      ? "bg-black/30 hover:bg-black/45 border border-white/10 text-white"
                      : "bg-neutral-900 text-slate-350 hover:bg-neutral-850 border border-neutral-800/60"
              }`}
            >
              <span
                className={`text-[8px] font-medium mr-1 ${isDrawSelected ? "text-blue-200" : "text-blue-100/60"}`}
              >
                X
              </span>
              {oddsAvailable ? match.odds.draw.toFixed(2) : "—"}
            </button>
            <button
              onClick={() => oddsAvailable && onPlaceBetClick?.(match, "away", match.odds.away)}
              className={`px-1.5 py-0.5 rounded transition-all active:scale-95 text-[10px] font-bold flex items-center ${
                isAwaySelected
                  ? "bg-blue-600 text-white shadow-sm border border-blue-600 font-extrabold"
                  : theme === "light"
                    ? "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"
                    : theme === "blue"
                      ? "bg-black/30 hover:bg-black/45 border border-white/10 text-white"
                      : "bg-neutral-900 text-slate-350 hover:bg-neutral-850 border border-neutral-800/60"
              }`}
            >
              <span
                className={`text-[8px] font-medium mr-1 ${isAwaySelected ? "text-blue-200" : "text-blue-100/60"}`}
              >
                2
              </span>
              {oddsAvailable ? match.odds.away.toFixed(2) : "—"}
            </button>
          </div>

          {/* Action Buttons: Bet Now & Buy Now */}
          <div className="flex items-center space-x-1 shrink-0">
            {/* BET NOW */}
            <button
              disabled={!oddsAvailable}
              onClick={() => {
                if (!oddsAvailable) return;
                const currentSelectedType = selectedBets?.[match.id] || "home";
                const currentSelectedOdd = match.odds[currentSelectedType];
                if (onBetNowClick) {
                  onBetNowClick(match, currentSelectedType, currentSelectedOdd);
                } else {
                  onPlaceBetClick?.(match, currentSelectedType, currentSelectedOdd);
                }
              }}
              className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[8.5px] font-black uppercase tracking-wider flex items-center space-x-0.5 cursor-pointer transition-all active:scale-95 shadow-sm"
            >
              <span>{betText}</span>
              <ArrowRight className="w-2.5 h-2.5" />
            </button>

            {/* BUY NOW */}
            <button
              onClick={() => onInspectLockedDotClick?.(match)}
              className="px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-[8.5px] font-black uppercase tracking-wider flex items-center space-x-0.5 cursor-pointer transition-all active:scale-95 shadow-sm"
            >
              <ShoppingBag className="w-2.5 h-2.5 text-slate-950" />
              <span>{buyText}</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  // --- Reusable Modern Premium Card Renderer Helper ---
  const renderMatchCard = (
    match: any,
    isCarousel: boolean = false,
    isOtherBet: boolean = false,
  ) => {
    const isMatchLocked =
      activeSubTab === "Unlockers"
        ? false
        : match.isPremium && !isPro && !match.tipster?.isOfficial;

    const isLive = isMatchLive(match);
    const currentLiveScore = getMatchLiveScore(match);
    const currentLiveTimer = getMatchLiveTimerDisplay(match);
    const currentLiveMinute = getMatchLiveMinute(match);

    const isSwahili =
      (t.prediction || "").includes("Doti") || (t.prediction || "").includes("Ushindi");

    const vsBadgeClass =
      theme === "light"
        ? "text-slate-900 font-extrabold bg-slate-200/80 border border-slate-300"
        : theme === "blue"
          ? "text-slate-950 font-black bg-white/90 border border-white/60"
          : "text-slate-200 font-extrabold bg-neutral-900/80 border border-neutral-800";

    const getMatchCalendarDisplay = (m: any) => {
      if (m.status === "ENDED") {
        return "Full Time";
      }

      const timeStr = m.time || "";
      const timeMatch = timeStr.match(/(\d{2}:\d{2})/);
      const timePart = timeMatch ? timeMatch[1] : "20:00";

      if (timeStr.toLowerCase().includes("leo") || timeStr.toLowerCase().includes("today")) {
        return `Today  ${timePart}`;
      }
      if (timeStr.toLowerCase().includes("kesho") || timeStr.toLowerCase().includes("tomorrow")) {
        return `Tomorrow  ${timePart}`;
      }
      if (
        timeStr.toLowerCase().includes("jumatatu") ||
        timeStr.toLowerCase().includes("monday") ||
        timeStr.toLowerCase().includes("jumapili") ||
        timeStr.toLowerCase().includes("sunday") ||
        timeStr.toLowerCase().includes("jumanne") ||
        timeStr.toLowerCase().includes("tuesday") ||
        timeStr.toLowerCase().includes("jumatano") ||
        timeStr.toLowerCase().includes("wednesday") ||
        timeStr.toLowerCase().includes("alhamisi") ||
        timeStr.toLowerCase().includes("thursday") ||
        timeStr.toLowerCase().includes("ijumaa") ||
        timeStr.toLowerCase().includes("friday") ||
        timeStr.toLowerCase().includes("jumamosi") ||
        timeStr.toLowerCase().includes("saturday")
      ) {
        let dayShort = "Mo";
        let dateStr = "Jul 20";
        if (
          timeStr.toLowerCase().includes("jumatatu") ||
          timeStr.toLowerCase().includes("monday")
        ) {
          dayShort = "Mo";
          dateStr = "Jul 20";
        } else if (
          timeStr.toLowerCase().includes("jumanne") ||
          timeStr.toLowerCase().includes("tuesday")
        ) {
          dayShort = "Tu";
          dateStr = "Jul 21";
        } else if (
          timeStr.toLowerCase().includes("jumatano") ||
          timeStr.toLowerCase().includes("wednesday")
        ) {
          dayShort = "We";
          dateStr = "Jul 22";
        } else if (
          timeStr.toLowerCase().includes("alhamisi") ||
          timeStr.toLowerCase().includes("thursday")
        ) {
          dayShort = "Th";
          dateStr = "Jul 23";
        } else if (
          timeStr.toLowerCase().includes("ijumaa") ||
          timeStr.toLowerCase().includes("friday")
        ) {
          dayShort = "Fr";
          dateStr = "Jul 17";
        } else if (
          timeStr.toLowerCase().includes("jumamosi") ||
          timeStr.toLowerCase().includes("saturday")
        ) {
          dayShort = "Sa";
          dateStr = "Jul 18";
        } else if (
          timeStr.toLowerCase().includes("jumapili") ||
          timeStr.toLowerCase().includes("sunday")
        ) {
          dayShort = "Su";
          dateStr = "Jul 19";
        }
        return `${dayShort}, ${dateStr}  ${timePart}`;
      }

      if (
        timeStr.toLowerCase().includes("juni") ||
        timeStr.toLowerCase().includes("june") ||
        timeStr.toLowerCase().includes("jun") ||
        timeStr.toLowerCase().includes("2027")
      ) {
        return `Mo, Jun 14/2027  ${timePart}`;
      }

      return `Mo, Jul 20  ${timePart}`;
    };

    const getLeagueLogoUrl = (m: any) => {
      const leagueName = (m.league || "").toLowerCase();
      const category = (m.category || "").toLowerCase();
      const sport = (m.sport || "").toLowerCase();

      if (
        !sport.includes("football") &&
        !sport.includes("soccer") &&
        !sport.includes("virtual") &&
        !sport.includes("mchezo")
      ) {
        return null;
      }

      if (
        leagueName.includes("laliga") ||
        leagueName.includes("la liga") ||
        leagueName.includes("primera") ||
        category === "espagne" ||
        m.id === "live-g-1" ||
        m.id === "live-g-1-fem"
      ) {
        return "https://a.espncdn.com/i/leaguelogos/soccer/500/15.png";
      }
      if (
        leagueName.includes("premier league") ||
        leagueName.includes("epl") ||
        category === "uk" ||
        leagueName.includes("england") ||
        leagueName.includes("premier")
      ) {
        return "https://a.espncdn.com/i/leaguelogos/soccer/500/23.png";
      }
      if (leagueName.includes("bundesliga") || category === "allemagne" || category === "germany") {
        return "https://a.espncdn.com/i/leaguelogos/soccer/500/10.png";
      }
      if (leagueName.includes("ligue 1") || category === "france") {
        return "https://a.espncdn.com/i/leaguelogos/soccer/500/9.png";
      }
      if (leagueName.includes("serie a") || category === "italy") {
        return "https://a.espncdn.com/i/leaguelogos/soccer/500/12.png";
      }
      return null;
    };

    const getTeamLogoUrl = (teamName: string) => {
      const nameLower = (teamName || "").toLowerCase().trim();

      const TEAM_LOGO_MAP: { [key: string]: string } = {
        simba: "https://upload.wikimedia.org/wikipedia/en/2/2c/Simba_SC_logo.png",
        "simba sc": "https://upload.wikimedia.org/wikipedia/en/2/2c/Simba_SC_logo.png",
        yanga: "https://upload.wikimedia.org/wikipedia/commons/b/bc/Young_Africans_S.C._logo.png",
        "yanga sc":
          "https://upload.wikimedia.org/wikipedia/commons/b/bc/Young_Africans_S.C._logo.png",
        "young africans":
          "https://upload.wikimedia.org/wikipedia/commons/b/bc/Young_Africans_S.C._logo.png",
        azam: "https://upload.wikimedia.org/wikipedia/en/e/ec/Azam_FC_logo.png",
        "azam fc": "https://upload.wikimedia.org/wikipedia/en/e/ec/Azam_FC_logo.png",
        liverpool: "https://crests.football-data.org/64.png",
        "man city": "https://crests.football-data.org/65.png",
        "manchester city": "https://crests.football-data.org/65.png",
        arsenal: "https://crests.football-data.org/57.png",
        chelsea: "https://crests.football-data.org/61.png",
        "man united": "https://crests.football-data.org/66.png",
        "manchester united": "https://crests.football-data.org/66.png",
        tottenham: "https://crests.football-data.org/73.png",
        barcelona: "https://crests.football-data.org/81.png",
        "fc barcelona": "https://crests.football-data.org/81.png",
        "real madrid": "https://crests.football-data.org/86.png",
        bayern: "https://crests.football-data.org/5.png",
        "bayern munich": "https://crests.football-data.org/5.png",
        dortmund: "https://crests.football-data.org/4.png",
        "borussia dortmund": "https://crests.football-data.org/4.png",
        psg: "https://crests.football-data.org/524.png",
        "paris saint-germain": "https://crests.football-data.org/524.png",
        "atletico madrid": "https://crests.football-data.org/78.png",
        juventus: "https://crests.football-data.org/109.png",
        "ac milan": "https://crests.football-data.org/98.png",
        inter: "https://crests.football-data.org/108.png",
        "inter milan": "https://crests.football-data.org/108.png",
        singida: "https://upload.wikimedia.org/wikipedia/en/d/db/Singida_Fountain_Gate_FC_logo.png",
        "singida fg":
          "https://upload.wikimedia.org/wikipedia/en/d/db/Singida_Fountain_Gate_FC_logo.png",
      };

      if (TEAM_LOGO_MAP[nameLower]) {
        return TEAM_LOGO_MAP[nameLower];
      }

      // Substring check
      for (const key of Object.keys(TEAM_LOGO_MAP)) {
        if (nameLower.includes(key) || key.includes(nameLower)) {
          return TEAM_LOGO_MAP[key];
        }
      }
      return null;
    };

    if (match.id === "live-g-aviator") {
      const aviatorNumBets = Math.floor(1850 + (elapsedSeconds % 120) * 11);
      const aviatorTotalBets = parseFloat((234500.5 + (elapsedSeconds % 120) * 1420.75).toFixed(2));
      const aviatorTotalWinnings = aviatorCrashed
        ? 0
        : parseFloat((162300.0 + (elapsedSeconds % 21) * 7850.5).toFixed(2));

      const isSwahiliLang = isSwahili;
      const isFrLang = (t.home || "").toLowerCase().includes("accueil");

      const systemName = isSwahiliLang
        ? "MFUMO WA AVIATOR"
        : isFrLang
          ? "SYSTÈME AVIATOR"
          : "AVIATOR SYSTEM";
      const statusText = isSwahiliLang ? "ONLINE LIVE" : isFrLang ? "EN LIGNE LIVE" : "ONLINE LIVE";
      const playNowText = isSwahiliLang
        ? "CHEZA SASA 🚀"
        : isFrLang
          ? "JOUER MAINTENANT 🚀"
          : "PLAY NOW 🚀";

      const numBetsLabel = isSwahiliLang
        ? "Idadi ya Madau"
        : isFrLang
          ? "Nbre de Mises"
          : "Number of Bets";
      const totalBetsLabel = isSwahiliLang
        ? "Jumla ya Madau"
        : isFrLang
          ? "Total des Mises"
          : "Total Bets";
      const totalWinningsLabel = isSwahiliLang
        ? "Jumla ya Ushindi"
        : isFrLang
          ? "Total des Gains"
          : "Total Winnings";

      const cardBorderClass =
        theme === "light"
          ? "border-red-500 bg-white hover:border-red-600 shadow-none"
          : theme === "dark"
            ? "border-red-500/30 bg-gradient-to-br from-[#0d0d0d] to-[#1e0a0a] hover:border-red-500/45 shadow-none"
            : "border-red-500/40 bg-gradient-to-br from-[#090e1a]/95 to-[#240c0c]/85 hover:border-red-500/55 shadow-none";

      const innerHeaderClass =
        theme === "light"
          ? "border-b border-red-100 bg-red-50/50"
          : theme === "dark"
            ? "border-b border-red-950/20 bg-neutral-950/40"
            : "border-b border-red-950/30 bg-[#1c0c0c]/30";

      return (
        <motion.div
          key={match.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className={`relative overflow-hidden rounded-2xl border transition-all duration-300 flex flex-col justify-between h-full ${
            isCarousel ? "w-[335px] min-w-[335px] shrink-0 h-[190px]" : "w-full min-h-[145px]"
          } ${cardBorderClass}`}
        >
          {/* Subtle red ambient glow */}
          <div className="absolute -left-12 -top-12 w-24 h-24 rounded-full opacity-[0.06] blur-xl bg-red-500 pointer-events-none" />

          {/* Interactive Profile Trigger */}
          <PostCardProfile
            tipster={match.tipster}
            theme={theme}
            onViewProfile={onViewProfile}
            onNavigateToMyProfile={() => (onViewProfile ? onViewProfile(match.tipster) : onNavigateTab?.("Profile" as any))}
            currentUser={currentUser}
            onShakeTrigger={onShakeTrigger}
          />

          {/* Centered Top Comment Icon with Pushed Scrolling Container */}
          <div className="absolute top-1.5 left-1/2 -translate-x-1/2 z-35 flex flex-col items-center">
            <PostCardCommentTrigger
              match={match}
              theme={theme}
              currentUser={currentUser}
              onOpenComments={onOpenComments}
              onShakeTrigger={onShakeTrigger}
              hoverColor="hover:text-red-500"
            />

            <div
              className="mt-0.5 w-[110px] xs:w-[130px] overflow-hidden bg-transparent border-transparent text-[7.5px] font-medium tracking-tight text-center cursor-default select-none relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className={`animate-marquee-r2l inline-block whitespace-nowrap ${
                  theme === "light"
                    ? "text-slate-600 font-semibold"
                    : theme === "blue"
                      ? "text-blue-100/90"
                      : "text-slate-400/90"
                }`}
              >
                {match.analysisText || "Hakuna maoni."}
              </div>
            </div>
          </div>

          {/* Card Header: Right Aligned with left padding for Profile overlap prevention */}
          <div
            className={`flex items-center justify-end pl-20 px-3.5 py-1.5 gap-2.5 ${innerHeaderClass}`}
          >
            <div className="flex items-center space-x-2 shrink-0">
              <div className="w-6 h-6 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center shadow-inner">
                <Zap className="w-3.5 h-3.5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center space-x-1">
                  <span
                    className={`text-[11px] font-bold tracking-tight truncate max-w-[80px] xs:max-w-[100px] block ${theme === "light" ? "text-slate-800" : "text-slate-200"}`}
                  >
                    {systemName}
                  </span>
                  <span className="text-[6.5px] bg-red-500/15 text-red-500 px-1 py-0.5 rounded font-mono font-black tracking-widest uppercase border border-red-500/20 animate-pulse">
                    SYSTEM
                  </span>
                </div>
              </div>
            </div>

            {/* Status with red pulsing indicator */}
            <span className="flex items-center space-x-1 text-[7.5px] font-black text-red-500 bg-red-500/10 border border-red-500/15 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping shrink-0"></span>
              <span className="tracking-wide uppercase">{statusText}</span>
            </span>
          </div>

          {/* Card Body */}
          <div className="px-3.5 pt-4 pb-2.5 flex-1 flex flex-col justify-between gap-1.5">
            {/* Top row: Odds Box (with small icon) shifted to the left, and Big Aviator Icon on the right */}
            <div className="flex items-center justify-between mt-1">
              {/* Left Side: Box of Odds with Small Aviator/Plane Icon */}
              <div className="flex items-center space-x-2">
                <div
                  className={`px-3 py-1.5 rounded-xl border flex items-center space-x-2 shadow-sm ${
                    theme === "light"
                      ? "bg-red-50/50 border-red-200 text-red-700"
                      : "bg-red-950/20 border-red-500/20 text-red-400"
                  }`}
                >
                  <Plane className="w-4 h-4 rotate-45 shrink-0 text-red-500 animate-pulse" />
                  <div className="text-left">
                    <p className="text-[7px] uppercase font-black tracking-widest text-slate-400">
                      MULTIPLIER
                    </p>
                    <span className="text-[13px] font-mono font-black tracking-tight block leading-none">
                      {aviatorCrashed ? (
                        <span className="text-red-500">CRASH!</span>
                      ) : (
                        <span>x{aviatorMult}</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Side: Big Styled Aviator/Plane Icon */}
              <div className="relative pr-2 flex items-center justify-center">
                {/* Decorative pulsing halo ring */}
                <span className="absolute w-12 h-12 rounded-full border border-red-500/10 animate-[ping_2s_infinite] pointer-events-none" />
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center border ${
                    theme === "light"
                      ? "bg-red-50 border-red-200/60 shadow-sm"
                      : "bg-red-950/10 border-red-500/20"
                  }`}
                >
                  <Plane className="w-6 h-6 text-red-500 rotate-45 animate-pulse shrink-0" />
                </div>
              </div>
            </div>

            {/* Middle Row: Compact Statistics Table (Ka tableau kadogo - increased height/padding slightly) */}
            <div
              className={`rounded-xl border overflow-hidden text-[10.5px] ${
                theme === "light"
                  ? "bg-slate-50 border-slate-200 text-slate-700"
                  : "bg-neutral-950/55 border-neutral-900/60 text-slate-400"
              }`}
            >
              <div className="grid grid-cols-3 divide-x divide-slate-800/20 text-center select-none py-3 bg-red-500/[0.02]">
                <div className="px-1">
                  <p className="text-[8.5px] uppercase font-black text-slate-500 tracking-wider">
                    {numBetsLabel}
                  </p>
                  <p className="font-mono font-black text-[12.5px] text-red-500 mt-0.5">
                    {aviatorNumBets}
                  </p>
                </div>
                <div className="px-1">
                  <p className="text-[8.5px] uppercase font-black text-slate-500 tracking-wider">
                    {totalBetsLabel}
                  </p>
                  <p className="font-mono font-black text-[12.5px] text-red-500 mt-0.5">
                    {aviatorTotalBets.toLocaleString(undefined, { maximumFractionDigits: 0 })} FBU
                  </p>
                </div>
                <div className="px-1">
                  <p className="text-[8.5px] uppercase font-black text-slate-500 tracking-wider">
                    {totalWinningsLabel}
                  </p>
                  <p className="font-mono font-black text-[12.5px] text-emerald-400 mt-0.5">
                    {aviatorTotalWinnings > 0 ? (
                      <span>
                        {aviatorTotalWinnings.toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}{" "}
                        FBU
                      </span>
                    ) : (
                      <span>0 FBU</span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Row: Play Now CTA Button */}
            <button
              id={`play-now-aviator-system-card`}
              onClick={() => onNavigateTab?.("Aviator")}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white text-[10px] font-display font-black uppercase tracking-widest flex items-center justify-center space-x-1.5 cursor-pointer transition-all shadow-[0_4px_12px_rgba(239,68,68,0.2)] hover:shadow-[0_6px_16px_rgba(239,68,68,0.35)] active:scale-95 h-[34px]"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{playNowText}</span>
            </button>
          </div>
        </motion.div>
      );
    }

    const predictionLabelText = isSwahili ? "Doti la Dhahabu 🌟" : "Golden Choice 🌟";

    const heightClass = "h-[218px]";

    // Card container class - redesigned for supreme elegance and sleek, award-winning aesthetics
    const cardClass = isMatchLocked
      ? theme === "light"
        ? "border border-amber-500 bg-gradient-to-br from-[#f8fbfe] via-[#f0f5fc] to-amber-50/[0.4] hover:border-amber-600 shadow-sm"
        : theme === "dark"
          ? "border border-amber-500/20 bg-gradient-to-br from-[#0c0c0d] to-[#120f0a] hover:border-amber-500/35 shadow-none"
          : theme === "blue"
            ? "border border-amber-500/40 bg-[#3B6D99] hover:border-amber-500/55 text-white font-semibold shadow-none"
            : "border border-amber-500/30 bg-gradient-to-br from-[#090e1a]/95 to-[#1a1410]/95 hover:border-amber-500/45 shadow-none"
      : theme === "light"
        ? "border border-slate-200/90 bg-gradient-to-br from-[#f8fbfe] via-[#f0f5fc] to-[#e6effa] hover:from-[#ffffff] hover:via-[#f4f8fe] hover:to-[#edf4fc] hover:border-blue-300/70 shadow-sm"
        : theme === "dark"
          ? "border border-neutral-800/60 bg-[#0d0d0d] hover:bg-[#121212] hover:border-neutral-700 shadow-none"
          : theme === "blue"
            ? "border border-blue-400/40 bg-[#3B6D99] text-white hover:bg-[#4379a8] hover:border-blue-300/40 font-semibold shadow-none"
            : "border border-blue-950/80 bg-[#090e1a]/95 hover:bg-[#0c1425] hover:border-blue-500/30 shadow-none";

    const headerClass =
      theme === "light"
        ? "bg-transparent text-slate-800"
        : theme === "dark"
          ? "bg-transparent text-slate-100"
          : theme === "blue"
            ? "bg-transparent text-white"
            : "bg-transparent text-blue-100";

    const avatarClass =
      theme === "light"
        ? "bg-slate-100 border border-slate-200 text-slate-700 shadow-inner font-semibold"
        : theme === "dark"
          ? "bg-neutral-900 border border-neutral-800 text-slate-200 font-semibold"
          : theme === "blue"
            ? "bg-blue-950 border border-blue-400/20 text-white font-semibold"
            : "bg-blue-950/80 border border-blue-900/60 text-blue-100 font-semibold";

    const nameClass =
      theme === "light" ? "text-slate-800" : theme === "blue" ? "text-white" : "text-slate-100";

    const teamTextClass =
      theme === "light"
        ? "text-slate-900 font-semibold"
        : theme === "blue"
          ? "text-white font-semibold"
          : "text-slate-100 font-semibold";

    const metaDividerClass =
      theme === "light"
        ? "border-slate-300"
        : theme === "dark"
          ? "border-neutral-900"
          : theme === "blue"
            ? "border-blue-400/20"
            : "border-blue-950/40";

    const tagClass =
      theme === "light"
        ? "bg-slate-50 border border-slate-200 text-slate-600"
        : theme === "dark"
          ? "bg-neutral-900/60 border border-neutral-800 text-slate-400"
          : theme === "blue"
            ? "bg-[#0c1425] border border-blue-950/60 text-blue-200"
            : "bg-blue-950/40 border border-blue-900/40 text-blue-300";

    return (
      <motion.div
        key={match.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className={`relative overflow-hidden rounded-2xl transition-all duration-300 flex flex-col justify-between h-full ${
          isCarousel ? "w-[335px] min-w-[335px] shrink-0" : "w-full"
        } ${heightClass} ${cardClass}`}
      >
        {/* Subtle decorative color dot behind matching sport type */}
        <div className="absolute -left-12 -top-12 w-24 h-24 rounded-full opacity-[0.03] blur-xl bg-blue-500 pointer-events-none" />

        {/* Visual Accent for Premium Locked Card (Aligned to Top-Right) */}
        {isMatchLocked && (
          <div className="absolute top-0 right-0 z-10">
            <span className="text-[7.5px] font-extrabold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-300 px-2.5 py-1 rounded-bl-xl uppercase tracking-wider flex items-center gap-1 shadow-sm">
              <Sparkles className="w-2.5 h-2.5 fill-slate-950 text-slate-950 animate-pulse" />
              <span>VIP ⭐</span>
            </span>
          </div>
        )}

        {/* Interactive Profile Trigger in Top-Left Corner */}
        <PostCardProfile
          tipster={match.tipster}
          theme={theme}
          onViewProfile={onViewProfile}
          onNavigateToMyProfile={() => (onViewProfile ? onViewProfile(match.tipster) : onNavigateTab?.("Profile" as any))}
          currentUser={currentUser}
          onShakeTrigger={onShakeTrigger}
        />

        {/* Centered Top Comment Icon with Pushed Scrolling Container */}
        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 z-35 flex flex-col items-center">
          <PostCardCommentTrigger
            match={match}
            theme={theme}
            currentUser={currentUser}
            onOpenComments={onOpenComments}
            onShakeTrigger={onShakeTrigger}
            hoverColor="hover:text-blue-500"
          />

          <div
            className="mt-0.5 w-[110px] xs:w-[130px] overflow-hidden bg-transparent border-transparent text-[7.5px] font-medium tracking-tight text-center cursor-default select-none relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`animate-marquee-r2l inline-block whitespace-nowrap ${
                theme === "light"
                  ? "text-slate-600 font-semibold"
                  : theme === "blue"
                    ? "text-blue-100/90"
                    : "text-slate-400/90"
              }`}
            >
              {match.analysisText || "Hakuna maoni."}
            </div>
          </div>
        </div>

        {/* Card Header: Aligned to right, leaving left side completely clear for Profile trigger */}
        <div
          className={`flex items-center justify-end px-4 py-2.5 pl-20 ${isMatchLocked ? "pr-16" : ""} ${headerClass}`}
        >
          {/* Status badge */}
          <div className="flex items-center space-x-1.5 mr-2">
            {isLive ? null : match.status === "COMING_SOON" ? (
              isOtherBet ? null : (
                <span className="text-[7.5px] font-black text-amber-550 bg-amber-550/10 border border-amber-500/15 px-2 py-0.5 rounded-full tracking-wider uppercase animate-pulse">
                  COMING SOON
                </span>
              )
            ) : match.status === "ENDED" ? (
              <span
                className={`text-[7.5px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${theme === "light" ? "bg-slate-100 text-slate-500 border border-slate-200/50" : "bg-neutral-900 text-slate-400 border border-neutral-800/40"}`}
              >
                {t.ended}
              </span>
            ) : isOtherBet ? null : (
              <span className="text-[7.5px] font-bold text-blue-500 bg-blue-500/10 border border-blue-500/15 px-2 py-0.5 rounded-full tracking-wider uppercase">
                {t.upcoming}
              </span>
            )}
          </div>

          {/* League Logo Display */}
          {(() => {
            const logoUrl = getLeagueLogoUrl(match);
            if (!logoUrl) {
              return (
                <div
                  className={`flex items-center justify-center p-1.5 w-7.5 h-7.5 rounded-lg border shadow-sm shrink-0 select-none ${theme === "light" ? "bg-slate-100/50 border-slate-200" : "bg-neutral-900/60 border-neutral-800/60"}`}
                >
                  <Shield className="w-4 h-4 text-amber-550 fill-amber-500/10" />
                </div>
              );
            }
            return (
              <div
                className={`flex items-center justify-center p-1 w-7.5 h-7.5 rounded-lg border shadow-sm shrink-0 ${theme === "light" ? "bg-white/30 border-slate-200" : "bg-neutral-900/60 border-neutral-800/60"}`}
              >
                <img
                  src={logoUrl}
                  alt={match.league}
                  className="w-6 h-6 object-contain"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const parent = (e.target as any).parentElement;
                    if (parent) {
                      parent.innerHTML = `
                        <div class="flex items-center justify-center bg-slate-100/50 dark:bg-neutral-900/60 p-1.5 w-full h-full rounded-lg">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-amber-550"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                        </div>
                      `;
                    }
                  }}
                />
              </div>
            );
          })()}
        </div>

        {/* Card Body: Match Teams in a single horizontal row for sleek rectangular design (pushed down to clear profile trigger) */}
        <div className="px-3.5 pt-5 pb-3 flex-1 min-h-0 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between w-full gap-2">
            {/* Home Team (Inverted: Name first, logo next to VS) */}
            <div className="flex flex-col items-end flex-1 min-w-0">
              <div className="flex items-center space-x-2 justify-end w-full">
                <span className={`text-[11.5px] tracking-tight whitespace-nowrap truncate max-w-[80px] xs:max-w-[100px] sm:max-w-[120px] inline-block text-right ${teamTextClass}`}>{formatVirtualName(match.homeTeam.name)}</span>
                <div className="flex flex-col items-center shrink-0">
                  <div
                    className="w-7.5 h-7.5 rounded-full flex items-center justify-center font-mono font-black text-[10.5px] shrink-0 transition-transform duration-300 hover:scale-105 overflow-hidden"
                    style={{
                      background:
                        theme === "light"
                          ? `linear-gradient(135deg, #f8fafc 0%, #cbd5e1 100%)`
                          : `linear-gradient(135deg, rgba(30,41,59,0.9) 0%, rgba(15,23,42,0.95) 100%)`,
                      boxShadow:
                        theme === "light"
                          ? `0 1px 4px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.8)`
                          : `0 2px 8px ${match.homeTeam.bgGlow}, inset 0 1px 1px rgba(255,255,255,0.05)`,
                      border:
                        theme === "light"
                          ? `1px solid #cbd5e1`
                          : `1px solid rgba(255,255,255,0.08)`,
                      color: theme === "light" ? "#334155" : "#ffffff",
                    }}
                  >
                    {(() => {
                      const logo = match.homeTeam.logoUrl || getTeamLogoUrl(match.homeTeam.name);
                      if (logo) {
                        return (
                          <img
                            src={logo}
                            alt={match.homeTeam.name}
                            className="w-full h-full object-contain bg-white p-1"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as any).style.display = "none";
                              const parent = (e.target as any).parentElement;
                              if (parent) {
                                parent.innerText = getInitials(match.homeTeam.name);
                              }
                            }}
                          />
                        );
                      }
                      return getInitials(match.homeTeam.name);
                    })()}
                  </div>

                  {/* Yellow and Red cards underneath logo */}
                  <div className="postcard-match-event-line">{match.sport === "Football" && isLive ? (
                    <div className="flex items-center space-x-1 text-[7px] font-mono font-bold select-none leading-none">
                      <div className="flex items-center space-x-0.5 bg-yellow-500/10 px-0.5 rounded border border-yellow-500/20">
                        <span className="w-1.5 h-2 rounded-[1px] bg-yellow-400 inline-block shadow-sm shadow-yellow-500/30" />
                        <span className="text-yellow-600 text-[6.5px]">3</span>
                      </div>
                      <div className="flex items-center space-x-0.5 bg-red-500/10 px-0.5 rounded border border-red-500/20">
                        <span className="w-1.5 h-2 rounded-[1px] bg-red-500 inline-block shadow-sm shadow-red-500/30" />
                        <span className="text-red-500 text-[6.5px]">1</span>
                      </div>
                    </div>
                  ) : null}</div>
                </div>
              </div>

              {/* Player scorers and assists */}
              <div className="postcard-player-line text-[7.5px] font-medium tracking-tight text-right w-full pr-9 text-slate-400 leading-none select-none">{match.sport === "Football" && isLive && getScoreValue(currentLiveScore, true) > 0 ? (<span className="postcard-text-viewport"><span className="postcard-text-loop">{getMatchPlayers(match.homeTeam.name, true, match.id).scorers}<span className="opacity-60 font-normal ml-1">({getMatchPlayers(match.homeTeam.name, true, match.id).assists})</span></span></span>) : null}</div>
            </div>

            {/* VS Divider or Score Display with high-end glassmorphic vibe */}
            <div className="flex flex-col items-center justify-center gap-0.5 shrink-0 min-w-[58px]">
              {isLive ? (
                <>
                  <div className="flex items-center justify-center bg-gradient-to-r from-emerald-500/15 via-emerald-500/25 to-emerald-500/15 border border-emerald-500/35 px-2.5 py-0.5 rounded-lg shadow-sm">
                    <span className="text-[12px] font-mono font-black text-emerald-500 dark:text-emerald-400 tracking-wider">
                      {currentLiveScore}
                    </span>
                  </div>
                  <div className="flex items-center justify-center mt-0.5">
                    <span className="text-[9.5px] font-mono font-extrabold text-emerald-500 dark:text-emerald-400 tracking-tight leading-none">
                      {currentLiveTimer}
                    </span>
                  </div>
                </>
              ) : (
                <span
                  className={`text-[8.5px] font-mono font-black px-2 py-0.5 rounded-full ${vsBadgeClass}`}
                >
                  VS
                </span>
              )}
            </div>

            {/* Away Team (Inverted: Logo next to VS, name last) */}
            <div className="flex flex-col items-start flex-1 min-w-0">
              <div className="flex items-center space-x-2 justify-start w-full">
                <div className="flex flex-col items-center shrink-0">
                  <div
                    className="w-7.5 h-7.5 rounded-full flex items-center justify-center font-mono font-black text-[10.5px] shrink-0 transition-transform duration-300 hover:scale-105 overflow-hidden"
                    style={{
                      background:
                        theme === "light"
                          ? `linear-gradient(135deg, #f8fafc 0%, #cbd5e1 100%)`
                          : `linear-gradient(135deg, rgba(30,41,59,0.9) 0%, rgba(15,23,42,0.95) 100%)`,
                      boxShadow:
                        theme === "light"
                          ? `0 1px 4px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.8)`
                          : `0 2px 8px ${match.awayTeam.bgGlow}, inset 0 1px 1px rgba(255,255,255,0.05)`,
                      border:
                        theme === "light"
                          ? `1px solid #cbd5e1`
                          : `1px solid rgba(255,255,255,0.08)`,
                      color: theme === "light" ? "#334155" : "#ffffff",
                    }}
                  >
                    {(() => {
                      const logo = match.awayTeam.logoUrl || getTeamLogoUrl(match.awayTeam.name);
                      if (logo) {
                        return (
                          <img
                            src={logo}
                            alt={match.awayTeam.name}
                            className="w-full h-full object-contain bg-white p-1"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as any).style.display = "none";
                              const parent = (e.target as any).parentElement;
                              if (parent) {
                                parent.innerText = getInitials(match.awayTeam.name);
                              }
                            }}
                          />
                        );
                      }
                      return getInitials(match.awayTeam.name);
                    })()}
                  </div>

                  {/* Yellow and Red cards underneath logo */}
                  <div className="postcard-match-event-line">{match.sport === "Football" && isLive ? (
                    <div className="flex items-center space-x-1 text-[7px] font-mono font-bold select-none leading-none">
                      <div className="flex items-center space-x-0.5 bg-yellow-500/10 px-0.5 rounded border border-yellow-500/20">
                        <span className="w-1.5 h-2 rounded-[1px] bg-yellow-400 inline-block shadow-sm shadow-yellow-500/30" />
                        <span className="text-yellow-600 text-[6.5px]">3</span>
                      </div>
                      <div className="flex items-center space-x-0.5 bg-red-500/10 px-0.5 rounded border border-red-500/20">
                        <span className="w-1.5 h-2 rounded-[1px] bg-red-500 inline-block shadow-sm shadow-red-500/30" />
                        <span className="text-red-500 text-[6.5px]">1</span>
                      </div>
                    </div>
                  ) : null}</div>
                </div>
                <span className={`text-[11.5px] tracking-tight whitespace-nowrap truncate max-w-[80px] xs:max-w-[100px] sm:max-w-[120px] inline-block text-left ${teamTextClass}`}>{formatVirtualName(match.awayTeam.name)}</span>
              </div>

              {/* Player scorers and assists */}
              <div className="postcard-player-line text-[7.5px] font-medium tracking-tight text-left w-full pl-9 text-slate-400 leading-none select-none">{match.sport === "Football" && isLive && getScoreValue(currentLiveScore, false) > 0 ? (<span className="postcard-text-viewport"><span className="postcard-text-loop">{getMatchPlayers(match.awayTeam.name, false, match.id).scorers}<span className="opacity-60 font-normal ml-1">({getMatchPlayers(match.awayTeam.name, false, match.id).assists})</span></span></span>) : null}</div>
            </div>
          </div>

          {/* Calendar Day/Time Display (Chini ya majina ya club na logo) */}
          <div className="flex items-center justify-center space-x-1 py-0.5 select-none shrink-0">
            <span
              className={`text-[10px] font-mono font-bold tracking-tight ${
                theme === "light"
                  ? "text-slate-500"
                  : theme === "blue"
                    ? "text-blue-100/90"
                    : "text-neutral-400"
              }`}
            >
              {getMatchCalendarDisplay(match)}
            </span>
          </div>

          {/* Normal / Locked interactive displays */}
          <div className="mt-1">
            {isMatchLocked ? (
              /* Frosted locked view with action button */
              <div
                className={`p-2 rounded-xl border flex items-center justify-between gap-3 ${theme === "light" ? "border-amber-500/15 bg-amber-500/[0.02]" : "border-amber-500/10 bg-amber-500/[0.01]"}`}
              >
                <div className="flex items-center space-x-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0 animate-[pulse_2.5s_infinite]" />
                  <span
                    className={`text-[8.5px] leading-tight font-medium ${theme === "light" ? "text-slate-600" : "text-slate-400"}`}
                  >
                    PRO analysis locked
                  </span>
                </div>

                {/* Inspect/Unlock shimmering premium golden button */}
                <button
                  id={`inspect-locked-${match.id}`}
                  onClick={() => onInspectLockedDotClick?.(match)}
                  className="px-3 py-1.5 rounded-xl font-display font-extrabold text-[8.5px] text-slate-950 uppercase tracking-widest shimmer-gold flex items-center justify-center space-x-1 hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-md shadow-amber-500/10 cursor-pointer shrink-0 h-[34px]"
                >
                  <Lock className="w-2.5 h-2.5" />
                  <span>{t.unlockTipNow}</span>
                </button>
              </div>
            ) : (
              /* Normal interactive view: ODDS selector buttons + Action buttons in highly uniform grids */
              <div>
                {(() => {
                  const isHomeSelected = selectedBets?.[match.id] === "home";
                  const isDrawSelected = selectedBets?.[match.id] === "draw";
                  const isAwaySelected = selectedBets?.[match.id] === "away";
                  const oddsAvailable = match.oddsAvailable === true;
                  // Post-card odds stay fixed while a match is live, so Bet Now must be ghosted.
                  const canBetNow = oddsAvailable && !isLive;

                  if (match.category === "Aviator") {
                    return (
                      <button
                        id={`play-aviator-shortcut-${match.id}`}
                        onClick={() => onNavigateTab?.("Aviator")}
                        className="w-full py-2 rounded-xl bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white text-[10px] font-display font-black uppercase tracking-wider flex items-center justify-center space-x-1 cursor-pointer transition-all shadow-[0_4px_12px_rgba(239,68,68,0.15)] hover:shadow-[0_6px_16px_rgba(239,68,68,0.25)] active:scale-95 h-[38px]"
                      >
                        <span>✈️ LIVE PLAY NOW</span>
                      </button>
                    );
                  }

                  const gridColsClass = "grid-cols-5";

                  return (
                    <div className={`grid ${gridColsClass} gap-1 w-full`}>
                      {/* 1 Button */}
                      <button
                        id={`odd-home-${match.id}`}
                        onClick={() => oddsAvailable && onPlaceBetClick?.(match, "home", match.odds.home)}
                        className={`py-1 rounded-xl text-center transition-all cursor-pointer group active:scale-95 border flex flex-col items-center justify-center h-[34px] ${
                          isHomeSelected
                            ? "bg-emerald-600 text-white border-emerald-500 shadow-[0_2px_8px_rgba(16,185,129,0.35)] scale-[1.03]"
                            : theme === "light"
                              ? "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700 active:bg-slate-300"
                              : theme === "dark"
                                ? "bg-[#1c1c1c] hover:bg-[#282828] border-neutral-800 text-slate-300"
                                : "bg-[#162544] hover:bg-[#1e325c] border-blue-900/60 text-slate-200 hover:border-blue-500/25"
                        }`}
                      >
                        <span
                          className={`block text-[7px] font-bold uppercase tracking-wider transition-colors leading-none ${
                            isHomeSelected
                              ? "text-emerald-100"
                              : "text-slate-400 group-hover:text-blue-500"
                          }`}
                        >
                          1
                        </span>
                        <span
                          className={`text-[9.5px] font-mono font-black mt-0.5 block leading-none ${
                            isHomeSelected
                              ? "text-white"
                              : theme === "light"
                                ? "text-blue-600"
                                : "text-sky-400"
                          }`}
                        >
                          {oddsAvailable ? match.odds.home.toFixed(2) : "—"}
                        </span>
                      </button>

                      {/* Draw Button */}
                      <button
                        id={`odd-draw-${match.id}`}
                        onClick={() => oddsAvailable && onPlaceBetClick?.(match, "draw", match.odds.draw)}
                        className={`py-1 rounded-xl text-center transition-all cursor-pointer group active:scale-95 border flex flex-col items-center justify-center h-[34px] ${
                          isDrawSelected
                            ? "bg-emerald-600 text-white border-emerald-500 shadow-[0_2px_8px_rgba(16,185,129,0.35)] scale-[1.03]"
                            : theme === "light"
                              ? "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700 active:bg-slate-300"
                              : theme === "dark"
                                ? "bg-[#1c1c1c] hover:bg-[#282828] border-neutral-800 text-slate-300"
                                : "bg-[#162544] hover:bg-[#1e325c] border-blue-900/60 text-slate-200 hover:border-blue-500/25"
                        }`}
                      >
                        <span
                          className={`block text-[7px] font-bold uppercase tracking-wider transition-colors leading-none ${
                            isDrawSelected
                              ? "text-emerald-100"
                              : "text-slate-400 group-hover:text-blue-500"
                          }`}
                        >
                          X
                        </span>
                        <span
                          className={`text-[9.5px] font-mono font-black mt-0.5 block leading-none ${
                            isDrawSelected
                              ? "text-white"
                              : theme === "light"
                                ? "text-blue-600"
                                : "text-sky-400"
                          }`}
                        >
                          {oddsAvailable ? match.odds.draw.toFixed(2) : "—"}
                        </span>
                      </button>

                      {/* 2 Button */}
                      <button
                        id={`odd-away-${match.id}`}
                        onClick={() => oddsAvailable && onPlaceBetClick?.(match, "away", match.odds.away)}
                        className={`py-1 rounded-xl text-center transition-all cursor-pointer group active:scale-95 border flex flex-col items-center justify-center h-[34px] ${
                          isAwaySelected
                            ? "bg-emerald-600 text-white border-emerald-500 shadow-[0_2px_8px_rgba(16,185,129,0.35)] scale-[1.03]"
                            : theme === "light"
                              ? "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700 active:bg-slate-300"
                              : theme === "dark"
                                ? "bg-[#1c1c1c] hover:bg-[#282828] border-neutral-800 text-slate-300"
                                : "bg-[#162544] hover:bg-[#1e325c] border-blue-900/60 text-slate-200 hover:border-blue-500/25"
                        }`}
                      >
                        <span
                          className={`block text-[7px] font-bold uppercase tracking-wider transition-colors leading-none ${
                            isAwaySelected
                              ? "text-emerald-100"
                              : "text-slate-400 group-hover:text-blue-500"
                          }`}
                        >
                          2
                        </span>
                        <span
                          className={`text-[9.5px] font-mono font-black mt-0.5 block leading-none ${
                            isAwaySelected
                              ? "text-white"
                              : theme === "light"
                                ? "text-blue-600"
                                : "text-sky-400"
                          }`}
                        >
                          {oddsAvailable ? match.odds.away.toFixed(2) : "—"}
                        </span>
                      </button>

                      {/* BET NOW Button */}
                      <button
                        id={`weka-bashiri-${match.id}`}
                        disabled={!canBetNow}
                        title={isLive ? "Bet Now haipatikani wakati match iko live" : undefined}
                        aria-label={isLive ? "Bet Now haipatikani wakati match iko live" : "Bet Now"}
                        onClick={() => {
                          if (!canBetNow) return;
                          const currentSelectedType = selectedBets?.[match.id] || "home";
                          const currentSelectedOdd = match.odds[currentSelectedType];
                          if (onBetNowClick) {
                            onBetNowClick(match, currentSelectedType, currentSelectedOdd);
                          } else {
                            onPlaceBetClick?.(match, currentSelectedType, currentSelectedOdd);
                          }
                        }}
                        className={`py-1 rounded-xl text-center transition-all border flex flex-col items-center justify-center h-[34px] ${
                          isLive
                            ? "bg-gradient-to-r from-slate-600 to-slate-700 border-slate-500/40 text-slate-300 opacity-80 cursor-not-allowed shadow-none"
                            : "bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white cursor-pointer active:scale-95 border-sky-600/30 shadow-[0_2px_8px_rgba(37,99,235,0.15)]"
                        }`}
                      >
                        <span
                          className={`block text-[7px] font-bold uppercase tracking-wider leading-none ${
                            isLive ? "text-slate-300/80" : "text-sky-100"
                          }`}
                        >
                          BET
                        </span>
                        <span
                          className={`text-[9px] font-display font-black mt-0.5 block uppercase tracking-tight leading-none ${
                            isLive ? "text-slate-200" : "text-white"
                          }`}
                        >
                          NOW
                        </span>
                      </button>

                      {/* Like Button */}
                      <button
                        id={`like-match-${match.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!currentUser || !currentUser.isLoggedIn) {
                            if (onShakeTrigger) onShakeTrigger();
                            return;
                          }
                          toggleLike(match.id);
                        }}
                        className={`py-1 rounded-xl text-center transition-all cursor-pointer group active:scale-95 border flex flex-col items-center justify-center h-[34px] px-1.5 ${
                          theme === "light"
                            ? "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-500 hover:text-slate-700 active:bg-slate-300"
                            : theme === "dark"
                              ? "bg-[#1c1c1c] hover:bg-[#282828] border-neutral-800 text-slate-400 hover:text-slate-200"
                              : "bg-[#162544] hover:bg-[#1e325c] border-blue-900/60 text-slate-300 hover:text-white"
                        }`}
                      >
                        {(() => {
                          const isLiked = likedMatchIds.includes(match.id);
                          const baseCount = (match as any).likesCount ?? ((match.id.charCodeAt(0) % 15) + 12);
                          const currentLikes = isLiked ? baseCount + 1 : baseCount;
                          return (
                            <div className="flex items-center gap-1">
                              <span
                                className={`block text-[7px] font-bold uppercase tracking-wider transition-colors leading-none ${
                                  isLiked
                                    ? "text-rose-500 font-extrabold"
                                    : "text-slate-400 group-hover:text-rose-500"
                                }`}
                              >
                                LIKE ({currentLikes})
                              </span>
                            </div>
                          );
                        })()}
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 14 14"
                          id={`Like-Icon-${match.id}`}
                          className={`w-3.5 h-3.5 mt-0.5 transition-transform duration-200 group-hover:scale-110 shrink-0 ${
                            likedMatchIds.includes(match.id)
                              ? "text-rose-500 scale-110"
                              : "text-slate-500 group-hover:text-rose-500"
                          }`}
                        >
                          <g id="like-1--reward-social-up-rating-media-like-thumb-hand">
                            <path
                              id="Union"
                              fill="currentColor"
                              fillRule="evenodd"
                              d="M4.41074 12.9614c0.33597 0.1601 0.70344 0.2432 1.07562 0.2432l5.34604 0c1.2317 0 2.2798 -0.897 2.47 -2.1138l0.6259 -4.00329c0.1896 -1.213 -0.7483 -2.30892 -1.976 -2.30892l-3.28374 0 0 -2.35762c0 -0.8976 -0.72765 -1.625248 -1.62525 -1.625248 -0.5883 0 -1.13068 0.317918 -1.41809 0.831238L3.54788 5.33703c-0.12537 0.2239 -0.1912 0.47621 -0.1912 0.73282l0 5.44245c0 0.5783 0.33252 1.1052 0.85463 1.354l0.19943 0.0951ZM1.04363 5.52027c-0.264251 0 -0.517678 0.10497 -0.704531 0.29182 -0.186853 0.18686 -0.2918263 0.44028 -0.2918263 0.70453l5e-7 5.11258c0 0.2643 0.1049728 0.5177 0.2918258 0.7046 0.186852 0.1868 0.440279 0.2918 0.704531 0.2918l0.00021 0 0.49636 -0.0002c0.27606 -0.0001 0.49978 -0.224 0.49978 -0.5l0 -6.10534c0 -0.13265 -0.05271 -0.25986 -0.14652 -0.35363 -0.09382 -0.09378 -0.22105 -0.14643 -0.35369 -0.14637l-0.49614 0.00021Z"
                              clipRule="evenodd"
                              strokeWidth="1"
                            />
                          </g>
                        </svg>
                      </button>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  // --- Reusable Premium Skeleton Card Renderer Helper ---
  const renderSkeletonFeed = () => {
    const cardBgClass =
      theme === "light"
        ? "border border-slate-200/90 bg-gradient-to-br from-[#f8fbfe] via-[#f0f5fc] to-[#e6effa] shadow-sm"
        : theme === "dark"
          ? "border border-neutral-800/60 bg-[#0d0d0d]"
          : "border border-blue-950/80 bg-blue-950/20";

    const headerBgClass =
      theme === "light"
        ? "border-b border-slate-200 bg-slate-50/50"
        : theme === "dark"
          ? "border-b border-neutral-900 bg-neutral-950/20"
          : "border-b border-blue-950/20 bg-blue-950/15";

    const itemBgClass =
      theme === "light"
        ? "bg-slate-200/80"
        : theme === "dark"
          ? "bg-neutral-850"
          : "bg-[#121c33]/40";

    const pulseClass = "animate-pulse";

    return (
      <div className="space-y-6">
        {/* Carousel Skeleton section for Kwako subtab */}
        {activeSubTab !== "Unlockers" && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <div className={`w-1.5 h-3.5 rounded-full ${itemBgClass} ${pulseClass}`} />
              <div className={`w-28 h-4 rounded ${itemBgClass} ${pulseClass}`} />
            </div>
            {/* Horizontal scrolling skeleton block */}
            <div className="flex space-x-4 overflow-x-auto no-scrollbar py-1 px-3 -mx-3 [touch-action:pan-x_pan-y]">
              {[1, 2].map((idx) => (
                <div
                  key={`carousel-sk-${idx}`}
                  className={`w-[335px] min-w-[335px] h-[190px] rounded-2xl p-4 flex flex-col justify-between shrink-0 ${cardBgClass}`}
                >
                  <div className="flex justify-between items-center pb-2 border-b border-dashed border-slate-200 dark:border-neutral-800">
                    <div className="flex items-center space-x-2">
                      <div className={`w-6 h-6 rounded-full ${itemBgClass} ${pulseClass}`} />
                      <div className={`w-20 h-3 rounded ${itemBgClass} ${pulseClass}`} />
                    </div>
                    <div className={`w-12 h-3 rounded ${itemBgClass} ${pulseClass}`} />
                  </div>
                  <div className="space-y-2 flex-1 flex flex-col justify-center">
                    <div className={`w-3/4 h-4 rounded ${itemBgClass} ${pulseClass}`} />
                    <div className={`w-1/2 h-3.5 rounded ${itemBgClass} ${pulseClass}`} />
                  </div>
                  <div className="flex space-x-2 pt-2 border-t border-dashed border-slate-200 dark:border-neutral-800">
                    <div className={`flex-1 h-8 rounded-lg ${itemBgClass} ${pulseClass}`} />
                    <div className={`flex-1 h-8 rounded-lg ${itemBgClass} ${pulseClass}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Feed Section Title Skeleton */}
        <div className="space-y-4 pt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`w-1.5 h-3.5 rounded-full ${itemBgClass} ${pulseClass}`} />
              <div className={`w-36 h-4 rounded ${itemBgClass} ${pulseClass}`} />
            </div>
            <div className={`w-14 h-3.5 rounded ${itemBgClass} ${pulseClass}`} />
          </div>

          {/* Grid list of vertical cards skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3].map((idx) => (
              <div
                key={`vertical-sk-${idx}`}
                className={`relative overflow-hidden rounded-2xl flex flex-col justify-between min-h-[145px] w-full ${cardBgClass}`}
              >
                {/* Header skeleton */}
                <div className={`flex items-center justify-between px-3.5 py-2.5 ${headerBgClass}`}>
                  <div className="flex items-center space-x-2">
                    <div className={`w-6 h-6 rounded-full ${itemBgClass} ${pulseClass}`} />
                    <div className="space-y-1">
                      <div className={`w-24 h-3.5 rounded ${itemBgClass} ${pulseClass}`} />
                      <div className={`w-12 h-2 rounded ${itemBgClass} ${pulseClass}`} />
                    </div>
                  </div>
                  <div className={`w-16 h-4 rounded-full ${itemBgClass} ${pulseClass}`} />
                </div>

                {/* Teams / Main area skeleton */}
                <div className="px-3.5 py-3.5 space-y-2 flex-1 flex flex-col justify-center">
                  <div className="flex justify-between items-center">
                    <div className="space-y-2 flex-1">
                      <div className={`w-4/5 h-4.5 rounded ${itemBgClass} ${pulseClass}`} />
                      <div className={`w-3/5 h-3.5 rounded ${itemBgClass} ${pulseClass}`} />
                    </div>
                    <div className={`w-12 h-6 rounded-lg ${itemBgClass} ${pulseClass}`} />
                  </div>
                </div>

                {/* Odds / Bottom row skeleton */}
                <div
                  className={`px-3.5 py-2.5 border-t flex space-x-2.5 ${
                    theme === "light"
                      ? "border-slate-200"
                      : theme === "dark"
                        ? "border-neutral-900"
                        : "border-blue-950/30"
                  }`}
                >
                  <div className={`flex-1 h-8 rounded-xl ${itemBgClass} ${pulseClass}`} />
                  <div className={`flex-1 h-8 rounded-xl ${itemBgClass} ${pulseClass}`} />
                  <div className={`flex-1 h-8 rounded-xl ${itemBgClass} ${pulseClass}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (isProfileMode) {
    return (
      <div className="space-y-4">
        {tips.length === 0 ? (
          <div
            className={`p-4 rounded-xl border text-center ${
              theme === "light"
                ? "bg-white border-slate-200 text-slate-800"
                : "bg-slate-900 border-slate-800 text-slate-300"
            }`}
          >
            <p className="text-[11px] font-bold">
              {lang === "sw"
                ? "Hujachapisha kadi yoyote bado"
                : lang === "fr"
                  ? "Aucune fiche publiée pour le moment"
                  : "No published cards yet"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tips.map((match) => renderMatchCard(match))}
          </div>
        )}
      </div>
    );
  }

  if (selectedCommentMatch) {
    return (
      <CommentsPage
        match={selectedCommentMatch}
        renderCard={() => renderMatchCard(selectedCommentMatch, false)}
        currentUser={currentUser || null}
        theme={theme}
        lang={lang}
        isPro={isPro}
        onBack={() => {
          if (onCloseComments) onCloseComments();
        }}
        onAddNotification={onAddNotification}
        onShakeTrigger={onShakeTrigger}
        onViewProfile={onViewProfile}
      />
    );
  }

  if (isFeedLoading) {
    return <div className="px-3 pt-0.5 space-y-4 pb-24">{renderSkeletonFeed()}</div>;
  }

  if (selectedSport === "Games" && selectedLeague !== "Aviator" && selectedLeague !== "All") {
    const isSw = t.home === "Nyumbani";
    const isFr = t.home === "Accueil";
    return (
      <div className="px-3 pt-0.5 space-y-4 pb-24 animate-fade-in">
        {headerCategories}
        <div className="px-4 py-12 flex flex-col items-center justify-center text-center space-y-5 max-w-sm mx-auto my-16 animate-fade-in">
          <div
            className={`p-4 rounded-full border shadow-inner ${
              theme === "light"
                ? "bg-slate-50 border-slate-300 text-slate-400"
                : theme === "blue"
                  ? "bg-blue-950/20 border-blue-900/30 text-sky-400"
                  : "bg-neutral-900/40 border-neutral-850 text-slate-300"
            } animate-bounce`}
          >
            <Gamepad2 className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3
              className={`text-xl font-display font-black uppercase tracking-wider ${theme === "light" ? "text-slate-900" : "text-slate-100"}`}
            >
              Coming soon
            </h3>
            <p
              className={`text-[11px] leading-relaxed max-w-[280px] mx-auto ${theme === "light" ? "text-slate-500 font-semibold" : "text-slate-400"}`}
            >
              {isSw
                ? "Mfumo bado unatengenezwa na haujakamilisha kutengeneza nafasi hii ya michezo ya kubahatisha (Virtual Games)."
                : isFr
                  ? "Le système est toujours en cours de développement et n'a pas encore finalisé cet espace de jeux virtuels."
                  : "The system is still under development and has not yet finalized this virtual gaming space."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isRealLeague = ["Espagne", "UK", "Italy", "Allemagne", "France"].includes(selectedLeague);

  if (isRealLeague) {
    const leagueLogo =
      selectedLeague === "Espagne"
        ? "https://a.espncdn.com/i/leaguelogos/soccer/500/15.png"
        : selectedLeague === "UK"
          ? "https://a.espncdn.com/i/leaguelogos/soccer/500/23.png"
          : selectedLeague === "Italy"
            ? "https://a.espncdn.com/i/leaguelogos/soccer/500/12.png"
            : selectedLeague === "Allemagne"
              ? "https://a.espncdn.com/i/leaguelogos/soccer/500/10.png"
              : "https://a.espncdn.com/i/leaguelogos/soccer/500/9.png";

    const leagueNameSw =
      selectedLeague === "Espagne"
        ? "La Liga (Uhispania)"
        : selectedLeague === "UK"
          ? "Premier League (Uingereza)"
          : selectedLeague === "Italy"
            ? "Serie A (Italia)"
            : selectedLeague === "Allemagne"
              ? "Bundesliga (Ujerumani)"
              : "Ligue 1 (Ufaransa)";

    return (
      <div className="px-3 pt-0.5 space-y-4 pb-24 animate-fade-in">
        {headerCategories}

        {/* Real-time Football API Status Bar */}
        {selectedSport === "Football" && (
          <div
            className={`p-3 rounded-2xl flex items-center justify-between border ${
              theme === "light"
                ? "bg-slate-50 border-slate-200"
                : theme === "dark"
                  ? "bg-neutral-950/40 border-neutral-900"
                  : "bg-blue-950/20 border-blue-950/40"
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <span className="relative flex h-2 w-2">
                {liveApiStatus === "connected" ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </>
                ) : liveApiStatus === "error" ? (
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                ) : (
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                )}
              </span>
              <div className="flex flex-col">
                <span
                  className={`text-[10px] font-black uppercase tracking-wider ${theme === "light" ? "text-slate-800" : "text-slate-200"}`}
                >
                  {liveApiStatus === "connected"
                    ? `Football API: REAL-TIME RATIBA (${selectedLeague.toUpperCase()})`
                    : liveApiStatus === "error"
                      ? "Football API: Hitilafu (Simulated)"
                      : "Football API: Inasawazisha..."}
                </span>
                <span
                  className={`text-[9px] font-medium leading-tight ${theme === "light" ? "text-slate-500" : "text-slate-400"}`}
                >
                  {liveApiStatus === "connected"
                    ? `Mechi halisi za ${leagueNameSw} zinasawazishwa moja kwa moja.`
                    : liveApiStatus === "error"
                      ? "Kuna shida ya mtandao, tunatumia mechi za kielelezo za Ligi Kuu."
                      : `Inasawazisha ratiba na football-data.org...`}
                </span>
              </div>
            </div>

            <button
              onClick={onRefreshLiveMatches}
              disabled={isLiveLoading}
              className={`px-3 py-1 rounded-xl text-[9.5px] font-bold uppercase tracking-wider flex items-center space-x-1 transition-all select-none active:scale-95 disabled:opacity-50 cursor-pointer ${
                theme === "light"
                  ? "bg-slate-200 text-slate-800 hover:bg-slate-250"
                  : "bg-neutral-900 text-white hover:bg-neutral-850 border border-neutral-800/80"
              }`}
            >
              {isLiveLoading ? (
                <span className="w-3 h-3 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <span>Refresha</span>
              )}
            </button>
          </div>
        )}

        {/* POST CARD YA KIPEKEE NDEFU - THE UNIQUE LONG PREMIUM PORTFOLIO CARD */}
        <div
          className={`border rounded-3xl overflow-hidden transition-all duration-300 ${
            theme === "light"
              ? "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
              : theme === "blue"
                ? "bg-[#3B6D99] border-blue-400/50 shadow-xl shadow-black/80 text-white"
                : "bg-[#0d0d0d] border border-neutral-800/60 hover:border-neutral-700 shadow-none"
          }`}
        >
          {/* Header Banner */}
          <div className="relative p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 overflow-hidden">
            <div className="flex items-center space-x-4 relative z-10">
              <div
                className={`w-16 h-16 rounded-2xl p-2 flex items-center justify-center border shadow-inner shrink-0 ${
                  theme === "light"
                    ? "bg-slate-100 border-slate-200"
                    : theme === "blue"
                      ? "bg-blue-950 border-blue-400/20"
                      : "bg-neutral-900 border-neutral-800"
                }`}
              >
                <img
                  src={leagueLogo}
                  alt={selectedLeague}
                  className="w-12 h-12 object-contain font-mono text-[9px]"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="bg-blue-500 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                    KIPEKEE ⭐
                  </span>
                  <span className="bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                    Safi & Salama
                  </span>
                </div>
                <h2
                  className={`text-lg font-black tracking-tight uppercase ${theme === "light" ? "text-slate-900" : "text-white"}`}
                >
                  {leagueNameSw} Ratiba na Utabiri
                </h2>
                <p
                  className={`text-[11px] font-medium ${
                    theme === "light"
                      ? "text-slate-500"
                      : theme === "blue"
                        ? "text-blue-100"
                        : "text-slate-400"
                  }`}
                >
                  Mfululizo wa mechi halisi za mwanzo zilizosawazishwa moja kwa moja
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 relative z-10">
              <span
                className={`text-[10px] font-bold uppercase ${
                  theme === "blue" ? "text-blue-100" : "text-slate-400"
                }`}
              >
                {combinedTodaysCombo.length} Mechi Zilizopo
              </span>
            </div>
          </div>

          {/* Matches List Container */}
          <div className="p-4 sm:p-6 space-y-4">
            {isLiveLoading && combinedTodaysCombo.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <span className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-bold text-slate-400 animate-pulse">
                  Inasoma ratiba halisi za{" "}
                  {selectedLeague === "Espagne" ? "La Liga" : selectedLeague}...
                </span>
              </div>
            ) : combinedTodaysCombo.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <p className="text-sm font-bold">
                  Hakuna mechi za {selectedLeague} zilizopatikana kwenye mfumo kwa sasa.
                </p>
                <p className="text-xs mt-1">
                  Tafadhali bonyeza kitufe cha 'Refresha' ili kusawazisha.
                </p>
              </div>
            ) : (
              <div className="flex flex-col space-y-4">
                {combinedTodaysCombo.slice(0, 15).map((match, idx) => (
                  <div key={match.id} className="relative">
                    {/* Visual Connector Line between list items to show flow/sequence */}
                    {idx < Math.min(combinedTodaysCombo.length, 15) - 1 && (
                      <div className="absolute left-6 top-12 bottom-[-16px] w-[1px] bg-dashed border-l border-slate-200 dark:border-neutral-800 z-0 pointer-events-none hidden sm:block" />
                    )}
                    <div className="relative z-10">{renderLaLigaListItem(match)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer of the long postcard */}
          <div
            className={`p-4 text-center border-t border-dashed ${
              theme === "light"
                ? "bg-slate-50/50 border-slate-200 text-slate-500"
                : "bg-neutral-950/20 border-neutral-900/60 text-slate-400"
            } text-[10px] font-semibold uppercase tracking-wider`}
          >
            🛡️ Takwimu na doti zote ni mali ya TakeTalon Pro. Michezo ya kubahatisha ina riski.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 pt-0.5 space-y-4 pb-24">
      {headerCategories}

      {/* Real-time Football API Status Bar */}
      {selectedSport === "Football" && (
        <div
          className={`p-3 rounded-2xl flex items-center justify-between border ${
            theme === "light"
              ? "bg-slate-50 border-slate-200"
              : theme === "dark"
                ? "bg-neutral-950/40 border-neutral-900"
                : "bg-blue-950/20 border-blue-950/40"
          }`}
        >
          <div className="flex items-center space-x-2.5">
            <span className="relative flex h-2 w-2">
              {liveApiStatus === "connected" ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </>
              ) : liveApiStatus === "error" ? (
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              ) : (
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              )}
            </span>
            <div className="flex flex-col">
              <span
                className={`text-[10px] font-black uppercase tracking-wider ${theme === "light" ? "text-slate-800" : "text-slate-200"}`}
              >
                {liveApiStatus === "connected"
                  ? "Football API: REAL-TIME (7d3746d)"
                  : liveApiStatus === "error"
                    ? "Football API: Hitilafu (Simulated)"
                    : "Football API: Inasawazisha..."}
              </span>
              <span
                className={`text-[9px] font-medium leading-tight ${theme === "light" ? "text-slate-500" : "text-slate-400"}`}
              >
                {liveApiStatus === "connected"
                  ? "Mechi za kweli za Premier League, La Liga, Serie A zinasawazishwa moja kwa moja."
                  : liveApiStatus === "error"
                    ? "Kuna shida ya mtandao, tunatumia mechi za kielelezo za Ligi Kuu."
                    : "Inasawazisha mechi na football-data.org..."}
              </span>
            </div>
          </div>

          <button
            onClick={onRefreshLiveMatches}
            disabled={isLiveLoading}
            className={`px-3 py-1 rounded-xl text-[9.5px] font-bold uppercase tracking-wider flex items-center space-x-1 transition-all select-none active:scale-95 disabled:opacity-50 cursor-pointer ${
              theme === "light"
                ? "bg-slate-200 text-slate-800 hover:bg-slate-250"
                : "bg-neutral-900 text-white hover:bg-neutral-850 border border-neutral-800/80"
            }`}
          >
            {isLiveLoading ? (
              <span className="w-3 h-3 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <span>Refresha</span>
            )}
          </button>
        </div>
      )}

      {/* 1. TOP LIVE SECTION (Previously "Doti Rasmi za Ushindi") */}
      {/* 1. TOP LIVE SECTION */}
      {activeSubTab !== "Unlockers" &&
        selectedTopTab === "All" &&
        filteredLiveMatches.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-1.5 h-3.5 bg-red-500 rounded-full animate-pulse"></span>
                <h3
                  className={`font-display font-black text-xs uppercase tracking-widest flex items-center gap-1.5 ${theme === "light" ? "text-slate-800" : "text-slate-100"}`}
                >
                  Top live
                  <span className="bg-red-500/20 text-red-500 text-[9px] font-extrabold px-1.5 py-0.5 rounded font-mono animate-pulse">
                    {filteredLiveMatches.length} GAMES
                  </span>
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-500 font-bold uppercase">
                {t.topLiveRefresh}
              </span>
            </div>

            {/* Dynamic premium visual feed horizontal scroll matching today's combo style */}
            <div className="flex items-stretch space-x-3.5 overflow-x-auto no-scrollbar pb-3 pt-1 px-3 -mx-3 [touch-action:pan-x_pan-y]">
              {filteredLiveMatches.map((match) => renderMatchCard(match, true))}
            </div>
          </div>
        )}

      {/* 2. TOP OTHER BET SECTION */}
      {activeSubTab !== "Unlockers" && selectedTopTab === "All" && filteredOtherBets.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-1.5 h-3.5 bg-blue-500 rounded-full"></span>
              <h3
                className={`font-display font-black text-xs uppercase tracking-widest flex items-center gap-1.5 ${theme === "light" ? "text-slate-800" : "text-slate-100"}`}
              >
                Top other bet
                <span className="bg-blue-500/20 text-blue-500 text-[9px] font-extrabold px-1.5 py-0.5 rounded font-mono">
                  REAL-WORLD
                </span>
              </h3>
            </div>
            <span className="text-[10px] font-semibold text-slate-500">{t.topOtherBetLabel}</span>
          </div>

          {/* Real-world betting horizontal scroll matching the exact Today's Combo style */}
          <div className="flex items-stretch space-x-3.5 overflow-x-auto no-scrollbar pb-3 pt-1 px-3 -mx-3 [touch-action:pan-x_pan-y]">
            {filteredOtherBets.map((match) => renderMatchCard(match, true, true))}
          </div>
        </div>
      )}

      {/* 3. TOP OTHER STORE SECTION REMOVED */}

      {/* --- MAIN MIXED VERTICAL FEED SECTION --- */}
      <div
        className={`border-t pt-4 space-y-4 ${
          theme === "light"
            ? "border-slate-300"
            : theme === "dark"
              ? "border-slate-900/60"
              : "border-slate-800"
        }`}
      >
        {/* New Title replacing the old header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-3.5 bg-emerald-500 rounded-full"></span>
            <h3
              className={`font-display font-black text-xs uppercase tracking-widest flex items-center gap-1.5 ${theme === "light" ? "text-slate-800" : "text-slate-100"}`}
            >
              {t.mixedFeedTitle}
              <span className="bg-emerald-500/20 text-emerald-500 text-[10px] font-bold px-1.5 py-0.5 rounded font-mono">
                {combinedTodaysCombo.length} TIPS
              </span>
            </h3>
          </div>
          <div className="flex items-center space-x-1 text-xs text-blue-500 hover:text-blue-600 font-semibold cursor-pointer">
            <span>{t.viewAll}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {(() => {
          const gridMatches = combinedTodaysCombo.filter((m) => m.id !== "live-g-aviator");
          if (gridMatches.length === 0) {
            if (selectedLeague === "Aviator") return null;
            return activeSubTab === "Kwako" && selectedSport === "All" ? (
              <div
                className={`rounded-2xl p-8 text-center border transition-all duration-300 ${
                  theme === "light"
                    ? "bg-white border-slate-200 text-slate-800 shadow-sm"
                    : "bg-slate-950/30 border-slate-800 text-slate-400"
                }`}
              >
                <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="material-symbols-rounded text-blue-500 text-xl leading-none">
                    feed
                  </span>
                </div>
                <p className="text-sm font-black uppercase tracking-wider">
                  {t.home === "Nyumbani" || t.home === "Nyumbani"
                    ? "Feed Iko Wazi"
                    : t.home === "Accueil"
                      ? "Fil d'actualité vide"
                      : "Feed is Clear"}
                </p>
                <p className="text-xs text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
                  {t.home === "Nyumbani" || t.home === "Nyumbani"
                    ? "Hakuna chapisho kutoka kwa unlockers kwa sasa. Unlockers wakianza kuposti kadi zao za VIP, zitaanza kuonekana na kutembea hapa kwenye feed yako ya Kwako (For You)."
                    : t.home === "Accueil"
                      ? "Aucune publication des débloqueurs pour le moment. Lorsque les débloqueurs commenceront à publier leurs fiches VIP, elles apparaîtront ici."
                      : "No posts from unlockers at the moment. Once unlockers start posting their VIP cards, they will appear and flow here in your For You feed."}
                </p>
              </div>
            ) : (
              <div
                className={`rounded-2xl p-8 text-center border transition-all duration-300 ${theme === "light" ? "bg-white border-slate-350 text-slate-800 shadow-sm" : "bg-slate-950/40 border-slate-800 text-slate-400"}`}
              >
                <p className="text-sm font-bold">
                  Hakuna mechi inayolingana na utafutaji wako kwa sasa.
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Uliyo-search au chujio haina data kulingana na post za users.
                </p>
                <button
                  onClick={() => {
                    if (onResetFilters) {
                      onResetFilters();
                    } else {
                      window.location.reload();
                    }
                  }}
                  className="mt-4 text-xs font-black bg-blue-600 text-white border border-blue-600 px-5 py-2.5 rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-sm cursor-pointer"
                >
                  Safi upya (Reset)
                </button>
              </div>
            );
          }

          return ["Espagne", "UK", "Italy", "Allemagne", "France"].includes(selectedLeague) ? (
            <div className="space-y-3.5">
              {/* Real-time Fixture / Calendar List Layout Header */}
              <div
                className={`p-3.5 rounded-2xl flex items-center justify-between border ${
                  theme === "light"
                    ? "bg-slate-50 border-slate-200 text-slate-800"
                    : "bg-neutral-900/40 border-neutral-850 text-slate-200"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-blue-500 animate-pulse" />
                  <span className="text-[11px] font-black uppercase tracking-wider">
                    Ratiba na Mpangilio Halisi (
                    {selectedLeague === "Espagne"
                      ? "La Liga"
                      : selectedLeague === "UK"
                        ? "Premier League"
                        : selectedLeague === "Italy"
                          ? "Serie A"
                          : selectedLeague === "Allemagne"
                            ? "Bundesliga"
                            : "Ligue 1"}
                    )
                  </span>
                </div>
                <span className="text-[10px] bg-blue-500/10 text-blue-500 px-2.5 py-0.5 rounded-lg font-black font-mono">
                  {combinedTodaysCombo.length} FIXTURES
                </span>
              </div>

              <div className="flex flex-col space-y-3">
                {gridMatches.map((match) => renderLaLigaListItem(match))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {gridMatches.map((match) => renderMatchCard(match))}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
