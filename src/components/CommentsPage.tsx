import React, { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Send,
  Heart,
  ThumbsUp,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Unlock,
  X,
  User,
  Clock,
  Flame,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import VerifiedBadge from "./VerifiedBadge";
import ShareIcon from "./ShareIcon";
import { MatchTip, UserProfile } from "../types";
import { UserCircleSingleIcon } from "./MatchList";
import {
  fetchCommentsForTarget,
  addCommentToDatabase,
  toggleCommentLikeInDatabase,
  fetchPostLikesFromDatabase,
  togglePostLikeInDatabase,
  updateCommentCount,
} from "../lib/commentsService";

interface CommentReply {
  id: string;
  userId?: string;
  userName: string;
  userAvatar?: string;
  isVerified?: boolean;
  timeAgo: string;
  text: string;
  likes: number;
  userLiked?: boolean;
}

interface CommentItem {
  id: string;
  userId?: string;
  userName: string;
  userAvatar?: string;
  isVerified?: boolean;
  isPro?: boolean;
  timeAgo: string;
  text: string;
  likes: number;
  userLiked?: boolean;
  replies: CommentReply[];
}

interface CommentsPageProps {
  match: MatchTip;
  renderCard?: () => React.ReactNode;
  currentUser: UserProfile | null;
  theme: "blue" | "dark" | "light";
  lang: "sw" | "fr" | "en";
  isPro?: boolean;
  onBack: () => void;
  onAddNotification?: (msg: string, type: "success" | "error" | "info") => void;
  onShakeTrigger?: () => void;
  onViewProfile?: (profile: any) => void;
}

export default function CommentsPage({
  match,
  renderCard,
  currentUser,
  theme,
  lang,
  isPro,
  onBack,
  onAddNotification,
  onShakeTrigger,
  onViewProfile,
}: CommentsPageProps) {
  const [comments, setComments] = useState<CommentItem[]>(() => {
    // Default initial comments for demonstration
    return [
      {
        id: "c-1",
        userName: "Mtabiri_Master",
        isVerified: true,
        isPro: true,
        timeAgo: lang === "sw" ? "Dakika 15 zilizopita" : "15 mins ago",
        text:
          lang === "sw"
            ? "Uchambuzi wa mchezo huu uko thabiti kabisa. Odds za timu hii zina thamani kubwa leo!"
            : "The analysis for this match is super solid. Great value on these odds!",
        likes: 14,
        userLiked: false,
        replies: [
          {
            id: "r-1-1",
            userName: "Juma_Kipira",
            timeAgo: lang === "sw" ? "Dakika 10 zilizopita" : "10 mins ago",
            text:
              lang === "sw"
                ? "Kweli kabisa brother, nimeingiza kwenye jamvi tayari 🚀"
                : "Agreed brother, placed it on my slip already!",
            likes: 4,
            userLiked: false,
          },
        ],
      },
      {
        id: "c-2",
        userName: "Anna_Betting",
        isVerified: true,
        timeAgo: lang === "sw" ? "Saa 1 iliyopita" : "1 hour ago",
        text:
          lang === "sw"
            ? "Asante sana kwa kushare kadi hii! Form ya timu ya nyumbani ipo juu sana msimu huu."
            : "Thanks for sharing this card! Home team form is top notch this season.",
        likes: 8,
        userLiked: false,
        replies: [],
      },
      {
        id: "c-3",
        userName: "Suleiman_TZ",
        isPro: true,
        timeAgo: lang === "sw" ? "Saa 2 zilizopita" : "2 hours ago",
        text:
          lang === "sw"
            ? "Kadi hii ina mwangaza mkubwa kabisa. Kila la kheri kwetu sote! 🔥"
            : "This card has great potential. Good luck to all of us!",
        likes: 5,
        userLiked: false,
        replies: [],
      },
    ];
  });

  const [inputText, setInputText] = useState("");
  const [replyingTo, setReplyingTo] = useState<{ commentId: string; userName: string } | null>(
    null,
  );
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [threadInputText, setThreadInputText] = useState("");
  const [postLikes, setPostLikes] = useState(24);
  const [postLiked, setPostLiked] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Helper to enforce auth: if user is not logged in, trigger shake animation on header login/register buttons
  const requireAuth = (): boolean => {
    if (!currentUser || !currentUser.isLoggedIn) {
      if (onShakeTrigger) {
        onShakeTrigger();
      }
      return false;
    }
    return true;
  };

  // Load comments & post likes from database on mount or match change
  useEffect(() => {
    let isMounted = true;

    async function loadDbData() {
      const dbUserId =
        currentUser && currentUser.isLoggedIn
          ? currentUser.id || currentUser.email || currentUser.username || ""
          : "";

      // Fetch comments from database
      const dbComments = await fetchCommentsForTarget(String(match.id), dbUserId);
      if (isMounted && dbComments && dbComments.length > 0) {
        setComments(dbComments);
      }

      // Fetch post/match likes from database
      const dbPostLikes = await fetchPostLikesFromDatabase(String(match.id), dbUserId);
      if (isMounted && dbPostLikes) {
        if (dbPostLikes.totalLikes > 0) {
          setPostLikes(dbPostLikes.totalLikes);
        }
        setPostLiked(dbPostLikes.userLiked);
      }
    }

    loadDbData();

    return () => {
      isMounted = false;
    };
  }, [match.id, currentUser]);

  // Handle post like
  const handleTogglePostLike = async () => {
    if (!requireAuth()) return;
    const nextLiked = !postLiked;
    const nextLikes = nextLiked ? postLikes + 1 : Math.max(0, postLikes - 1);

    const currentUserId = currentUser?.id || currentUser?.profile_id || "";

    // Optimistic update
    setPostLiked(nextLiked);
    setPostLikes(nextLikes);

    // Persist to Database
    const res = await togglePostLikeInDatabase(String(match.id), currentUserId);
    if (res) {
      setPostLiked(res.liked);
      if (res.totalLikes > 0) {
        setPostLikes(res.totalLikes);
      }
    }
  };

  // Handle comment like
  const handleToggleCommentLike = async (commentId: string) => {
    if (!requireAuth()) return;
    const currentUserId = currentUser?.id || currentUser?.profile_id || "";

    // Optimistic update
    setComments((prev) =>
      prev.map((c) => {
        if (c.id === commentId) {
          const userLiked = !c.userLiked;
          return {
            ...c,
            userLiked,
            likes: userLiked ? c.likes + 1 : Math.max(0, c.likes - 1),
          };
        }
        return c;
      }),
    );

    // Persist to Database
    const res = await toggleCommentLikeInDatabase(commentId, currentUserId);
    if (res) {
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === commentId) {
            return {
              ...c,
              userLiked: res.liked,
              likes: res.likesCount,
            };
          }
          return c;
        }),
      );
    }
  };

  // Handle reply like
  const handleToggleReplyLike = async (commentId: string, replyId: string) => {
    if (!requireAuth()) return;
    const currentUserId = currentUser?.id || currentUser?.profile_id || "";

    // Optimistic update
    setComments((prev) =>
      prev.map((c) => {
        if (c.id === commentId) {
          return {
            ...c,
            replies: c.replies.map((r) => {
              if (r.id === replyId) {
                const userLiked = !r.userLiked;
                return {
                  ...r,
                  userLiked,
                  likes: userLiked ? r.likes + 1 : Math.max(0, r.likes - 1),
                };
              }
              return r;
            }),
          };
        }
        return c;
      }),
    );

    // Persist to Database
    const res = await toggleCommentLikeInDatabase(replyId, currentUserId);
    if (res) {
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === commentId) {
            return {
              ...c,
              replies: c.replies.map((r) => {
                if (r.id === replyId) {
                  return {
                    ...r,
                    userLiked: res.liked,
                    likes: res.likesCount,
                  };
                }
                return r;
              }),
            };
          }
          return c;
        }),
      );
    }
  };

  // Handle submitting new comment or reply
  const handleSendComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!requireAuth()) return;

    const trimmed = inputText.trim();
    if (!trimmed) return;

    const currentUserId = currentUser?.id || currentUser?.profile_id || "";
    const currentUserName = currentUser?.username || "Mtumiaji_TT";

    if (replyingTo) {
      // Add nested reply locally
      const localReply: CommentReply = {
        id: `r-${Date.now()}`,
        userName: currentUserName,
        isVerified: currentUser?.is_verified,
        timeAgo: lang === "sw" ? "Sasa hivi" : "Just now",
        text: trimmed,
        likes: 0,
        userLiked: false,
      };

      setComments((prev) =>
        prev.map((c) => {
          if (c.id === replyingTo.commentId) {
            return {
              ...c,
              replies: [...c.replies, localReply],
            };
          }
          return c;
        }),
      );

      const targetParentId = replyingTo.commentId;
      setReplyingTo(null);
      setInputText("");

      if (onAddNotification) {
        onAddNotification(
          lang === "sw" ? "Jibu lako limechapishwa!" : "Your reply was posted!",
          "success",
        );
      }

      // Persist reply to Database
      await addCommentToDatabase({
        targetId: String(match.id),
        targetType: "match",
        parentId: targetParentId,
        userId: currentUserId,
        userName: currentUserName,
        userAvatar: currentUser?.avatarUrl || currentUser?.avatar_url || undefined,
        isVerified: currentUser?.is_verified,
        isPro: isPro,
        text: trimmed,
      });
    } else {
      // Add top-level comment locally
      const localComment: CommentItem = {
        id: `c-${Date.now()}`,
        userName: currentUserName,
        userAvatar: currentUser?.avatarUrl || currentUser?.avatar_url || undefined,
        isVerified: currentUser?.is_verified,
        isPro: isPro,
        timeAgo: lang === "sw" ? "Sasa hivi" : "Just now",
        text: trimmed,
        likes: 0,
        userLiked: false,
        replies: [],
      };

      setComments((prev) => [localComment, ...prev]);
      setInputText("");

      if (onAddNotification) {
        onAddNotification(
          lang === "sw" ? "Maoni yako yamechapishwa!" : "Your comment was posted!",
          "success",
        );
      }

      // Persist comment to Database
      const savedComment = await addCommentToDatabase({
        targetId: String(match.id),
        targetType: "match",
        parentId: null,
        userId: currentUserId,
        userName: currentUserName,
        userAvatar: currentUser?.avatarUrl || currentUser?.avatar_url || undefined,
        isVerified: currentUser?.is_verified,
        isPro: isPro,
        text: trimmed,
      });

      if (savedComment && "replies" in savedComment) {
        // Swap temp local ID with real DB ID
        setComments((prev) =>
          prev.map((c) => (c.id === localComment.id ? { ...c, id: savedComment.id } : c)),
        );
      }
    }
  };

  // Handle sending reply inside thread overlay
  const handleSendThreadReply = async (commentId: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!requireAuth()) return;

    const trimmed = threadInputText.trim();
    if (!trimmed) return;

    const currentUserId = currentUser?.id || currentUser?.profile_id || "";
    const currentUserName = currentUser?.username || "Mtumiaji_TT";

    const localReply: CommentReply = {
      id: `r-${Date.now()}`,
      userName: currentUserName,
      userAvatar: currentUser?.avatarUrl || currentUser?.avatar_url || undefined,
      isVerified: currentUser?.is_verified,
      timeAgo: lang === "sw" ? "Sasa hivi" : "Just now",
      text: trimmed,
      likes: 0,
      userLiked: false,
    };

    setComments((prev) =>
      prev.map((c) => {
        if (c.id === commentId) {
          return {
            ...c,
            replies: [...c.replies, localReply],
          };
        }
        return c;
      }),
    );

    setThreadInputText("");

    if (onAddNotification) {
      onAddNotification(
        lang === "sw" ? "Jibu lako limechapishwa!" : "Your reply was posted!",
        "success",
      );
    }

    // Persist thread reply to Database
    await addCommentToDatabase({
      targetId: String(match.id),
      targetType: "match",
      parentId: commentId,
      userId: currentUserId,
      userName: currentUserName,
      userAvatar: currentUser?.avatarUrl || currentUser?.avatar_url || undefined,
      isVerified: currentUser?.is_verified,
      isPro: isPro,
      text: trimmed,
    });
  };

  // Set reply thread mode
  const handleStartReply = (commentId: string, userName: string) => {
    setActiveThreadId(commentId);
  };

  // Theme styling classes
  const bgClass =
    theme === "light"
      ? "bg-white text-slate-900"
      : theme === "blue"
        ? "bg-[#1f3d5c] text-white"
        : "bg-[#141414] text-slate-100";

  const headerBg =
    theme === "light"
      ? "bg-white/95 border-slate-200 text-slate-900 shadow-sm"
      : theme === "blue"
        ? "bg-[#1f3d5c]/95 border-blue-400/30 text-white"
        : "bg-[#141414]/95 border-neutral-800 text-slate-100";

  const cardBg =
    theme === "light"
      ? "bg-white border-slate-200 shadow-sm text-slate-900"
      : theme === "blue"
        ? "bg-slate-900/50 border-slate-800 text-slate-100 shadow-sm"
        : "bg-slate-900/60 border-neutral-800/80 text-slate-100 shadow-sm";

  const commentItemBg =
    theme === "light"
      ? "bg-white border-slate-200 shadow-sm text-slate-900"
      : theme === "blue"
        ? "bg-slate-900/50 border-slate-800 text-slate-100 shadow-sm"
        : "bg-slate-900/60 border-neutral-800/80 text-slate-100 shadow-sm";

  const totalCommentCount = comments.reduce((acc, c) => acc + 1 + c.replies.length, 0);
  const activeThread = comments.find((c) => c.id === activeThreadId);

  // Synchronize total comment count (including replies) with global reactive cache
  useEffect(() => {
    updateCommentCount(String(match.id), totalCommentCount);
  }, [match.id, totalCommentCount]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 15 }}
      transition={{ duration: 0.2 }}
      className={`fixed inset-0 z-[120] flex flex-col h-full w-full overflow-hidden ${bgClass}`}
    >
      {/* 1. TOP HEADER (Replaces standard top nav) */}
      <header
        className={`sticky top-0 z-20 flex items-center justify-between px-4 py-3 border-b backdrop-blur-md ${headerBg}`}
      >
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 rounded-full hover:bg-slate-500/10 active:scale-95 transition-all text-current cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-sm font-black tracking-wide uppercase flex items-center gap-1.5">
              <span>{lang === "sw" ? "Maoni & Uchambuzi" : "Comments & Analysis"}</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-medium truncate max-w-[220px]">
              {match.homeTeam.name} vs {match.awayTeam.name}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
            {totalCommentCount} {lang === "sw" ? "Maoni" : "Comments"}
          </span>
        </div>
      </header>

      {/* 2. MAIN SCROLLABLE CONTENT AREA */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 no-scrollbar"
      >
        {/* EXPANDED POST CARD AT TOP */}
        {renderCard ? (
          <div className="w-full shrink-0">{renderCard()}</div>
        ) : (
          <div className={`rounded-2xl p-4 border relative overflow-hidden ${cardBg}`}>
            {/* Subtle background glow */}
            <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full opacity-10 blur-2xl bg-blue-500 pointer-events-none" />

            {/* Tipster Header */}
            <div className="flex items-center justify-between border-b border-slate-500/10 pb-3 mb-3">
              <div
                onClick={() => onViewProfile && match.tipster && onViewProfile(match.tipster)}
                className="flex items-center space-x-2.5 cursor-pointer group hover:opacity-85 transition-opacity"
                title={lang === "sw" ? "Angalia wasifu" : "View profile"}
              >
                <div
                  className={`w-9 h-9 rounded-full font-black text-xs flex items-center justify-center shadow-md overflow-hidden ring-1 ring-white/10 group-hover:ring-blue-500/50 transition-all ${
                    theme === "light"
                      ? "bg-gradient-to-br from-blue-600 to-indigo-700 text-white"
                      : theme === "blue"
                        ? "bg-gradient-to-br from-blue-500/30 to-indigo-500/30 border border-blue-400/30 text-blue-100"
                        : "bg-gradient-to-br from-neutral-800 to-neutral-700 border border-neutral-700/80 text-white"
                  }`}
                >
                  {match.tipster?.avatarUrl ? (
                    <img
                      src={match.tipster.avatarUrl}
                      alt={match.tipster.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UserCircleSingleIcon className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-black tracking-tight text-current group-hover:underline">
                      {match.tipster?.name || "Mtabiri Pro"}
                    </span>
                    {match.tipster?.isOfficial !== false && (
                      <VerifiedBadge className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    )}
                    {match.tipster?.badge && (
                      <span className="text-[7.5px] font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
                        {match.tipster.badge}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 text-[9.5px] text-slate-400 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {match.time}
                    </span>
                    <span>•</span>
                    <span className="font-semibold">{match.league}</span>
                  </div>
                </div>
              </div>

              {match.isPremium && (
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  VIP CARD
                </span>
              )}
            </div>

            {/* Teams Row */}
            <div className="flex items-center justify-between py-2">
              <div className="flex-1 text-center sm:text-left">
                <div className="text-sm font-black tracking-tight">{match.homeTeam.name}</div>
              </div>
              <div className="px-3 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono text-xs font-black">
                VS
              </div>
              <div className="flex-1 text-center sm:text-right">
                <div className="text-sm font-black tracking-tight">{match.awayTeam.name}</div>
              </div>
            </div>

            {/* Prediction & Odds Row */}
            <div className="mt-3 p-3 rounded-xl bg-slate-500/5 border border-slate-500/10 flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-[8px] font-black uppercase text-slate-400 block tracking-wider">
                  {lang === "sw" ? "UTABIRI WA KADI" : "CARD PREDICTION"}
                </span>
                <span className="text-xs font-black text-emerald-400 flex items-center gap-1">
                  {match.predictionTip || `${match.homeTeam.name} Win`}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="text-right">
                  <span className="text-[8px] font-black uppercase text-slate-400 block tracking-wider">
                    ODDS
                  </span>
                  <span className="text-xs font-black font-mono text-amber-400">
                    {match.odds?.home || 2.1}
                  </span>
                </div>
                {match.payoutBadge && (
                  <div className="text-right pl-2 border-l border-slate-500/15">
                    <span className="text-[8px] font-black uppercase text-slate-400 block tracking-wider">
                      PAYOUT
                    </span>
                    <span className="text-xs font-black text-blue-400">{match.payoutBadge}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Full Analysis Text Box */}
            <div className="mt-3 p-3 rounded-xl bg-blue-500/5 border border-blue-500/15">
              <div className="flex items-center space-x-1.5 mb-1 text-blue-400">
                <Sparkles className="w-3 h-3" />
                <span className="text-[8.5px] font-black uppercase tracking-wider">
                  {lang === "sw" ? "UCHAMBUZI RASMI NA MAELEZO" : "OFFICIAL ANALYSIS & DETAILS"}
                </span>
              </div>
              <p className="text-xs leading-relaxed font-medium text-slate-300">
                {match.analysisText ||
                  (lang === "sw"
                    ? "Takwimu na uwezo wa hivi karibuni wa timu hizi unaonyesha kuwa hii ni mechi yenye fursa kubwa ya matokeo chanya."
                    : "Recent stats and form indicate a high-probability opportunity for this match.")}
              </p>
            </div>

            {/* Card Interactive Action Bar */}
            <div className="mt-3 pt-2.5 border-t border-slate-500/10 flex items-center justify-between text-slate-400 text-xs font-semibold">
              <button
                onClick={handleTogglePostLike}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  postLiked
                    ? "text-blue-400 bg-blue-500/10 font-bold"
                    : "hover:bg-slate-500/10 text-slate-400"
                }`}
              >
                <ThumbsUp className={`w-3.5 h-3.5 ${postLiked ? "fill-current" : ""}`} />
                <span>{postLikes}</span>
              </button>

              <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 font-bold">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{totalCommentCount}</span>
              </div>

              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
                      text: `Utabiri: ${match.predictionTip}`,
                    });
                  } else if (onAddNotification) {
                    onAddNotification(
                      lang === "sw"
                        ? "Link ya mechi imehamishiwa kwenye clipboard!"
                        : "Match link copied!",
                      "info",
                    );
                  }
                }}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-lg hover:bg-slate-500/10 transition-colors cursor-pointer"
              >
                <ShareIcon className="w-3.5 h-3.5" />
                <span>{lang === "sw" ? "Share" : "Share"}</span>
              </button>
            </div>
          </div>
        )}

        {/* COMMENTS SECTION */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
              <span>{lang === "sw" ? "Maoni ya Wadau" : "Community Discussion"}</span>
            </h2>
            <span className="text-[10px] text-slate-500 font-medium">
              {comments.length} {lang === "sw" ? "Thread" : "Threads"}
            </span>
          </div>

          {comments.length === 0 ? (
            <div className="text-center py-8 px-4 rounded-xl border border-dashed border-slate-500/20 text-slate-400">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs font-semibold">
                {lang === "sw"
                  ? "Bado hakuna maoni kwenye mchezo huu."
                  : "No comments on this match yet."}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {lang === "sw"
                  ? "Mwe wa kwanza kuandika maoni yako hapa chini!"
                  : "Be the first to leave a comment below!"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {comments.map((c) => (
                <div
                  key={c.id}
                  className={`p-3.5 rounded-2xl border transition-all ${commentItemBg}`}
                >
                  {/* Comment Author Header */}
                  <div className="flex items-start justify-between">
                    <div
                      onClick={() =>
                        onViewProfile &&
                        onViewProfile({
                          userId: c.userId,
                          userName: c.userName,
                          userAvatar: c.userAvatar,
                          isVerified: c.isVerified,
                          isPro: c.isPro,
                        })
                      }
                      className="flex items-center space-x-2 cursor-pointer group hover:opacity-85 transition-opacity"
                      title={lang === "sw" ? "Angalia wasifu wa mtumiaji" : "View user profile"}
                    >
                      <div
                        className={`w-7 h-7 rounded-full font-black text-[10px] flex items-center justify-center shrink-0 overflow-hidden ring-1 ring-white/10 group-hover:ring-blue-500/50 transition-all ${
                          theme === "light"
                            ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white"
                            : theme === "blue"
                              ? "bg-gradient-to-br from-blue-500/30 to-indigo-500/30 border border-blue-400/30 text-blue-100"
                              : "bg-gradient-to-br from-neutral-800 to-neutral-700 border border-neutral-700/80 text-white"
                        }`}
                      >
                        {c.userAvatar ? (
                          <img
                            src={c.userAvatar}
                            alt={c.userName}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <UserCircleSingleIcon className="w-4.5 h-4.5" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-1">
                          <span className="text-xs font-black text-current group-hover:underline">
                            {c.userName}
                          </span>
                          {c.isVerified && (
                            <VerifiedBadge className="w-3 h-3 text-blue-500 shrink-0" />
                          )}
                          {c.isPro && (
                            <span className="text-[7px] font-black px-1 py-0.2 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20 uppercase">
                              PRO
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] text-slate-400 block font-medium">
                          {c.timeAgo}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Comment Text */}
                  <p
                    className={`mt-2 text-xs font-medium leading-relaxed pl-9 ${
                      theme === "light" ? "text-slate-800" : "text-slate-100"
                    }`}
                  >
                    {c.text}
                  </p>

                  {/* Comment Action Bar (Like & Thread Reply Button) */}
                  <div
                    className={`mt-2.5 pl-9 flex items-center justify-between text-[11px] font-semibold ${
                      theme === "light" ? "text-slate-500" : "text-slate-300"
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => handleToggleCommentLike(c.id)}
                        className={`flex items-center space-x-1 transition-colors cursor-pointer ${
                          c.userLiked
                            ? theme === "light"
                              ? "text-blue-600 font-bold"
                              : "text-blue-300 font-bold"
                            : theme === "light"
                              ? "hover:text-slate-900"
                              : "hover:text-white"
                        }`}
                      >
                        <ThumbsUp className={`w-3.5 h-3.5 ${c.userLiked ? "fill-current" : ""}`} />
                        <span>{c.likes > 0 ? c.likes : ""}</span>
                        <span className="ml-0.5">{lang === "sw" ? "Penda" : "Like"}</span>
                      </button>

                      <button
                        onClick={() => handleStartReply(c.id, c.userName)}
                        className={`flex items-center space-x-1 transition-colors cursor-pointer ${
                          theme === "light"
                            ? "hover:text-blue-600 text-blue-600 font-semibold"
                            : "hover:text-blue-300 text-blue-400 font-semibold"
                        }`}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{lang === "sw" ? "Jibu" : "Reply"}</span>
                      </button>
                    </div>

                    {/* Dedicated reply count button opening thread overlay */}
                    {c.replies && c.replies.length > 0 && (
                      <button
                        onClick={() => handleStartReply(c.id, c.userName)}
                        className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold transition-all cursor-pointer ${
                          theme === "light"
                            ? "bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200"
                            : "bg-blue-500/15 text-blue-300 hover:bg-blue-500/25 border border-blue-500/30"
                        }`}
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>
                          {c.replies.length}{" "}
                          {lang === "sw"
                            ? c.replies.length === 1
                              ? "Jibu"
                              : "Majibu"
                            : c.replies.length === 1
                              ? "Reply"
                              : "Replies"}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. STICKY BOTTOM INPUT BAR */}
      <div className={`sticky bottom-0 z-30 p-3 border-t backdrop-blur-md ${headerBg}`}>
        {replyingTo && (
          <div className="mb-2 px-3 py-1 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 text-[10.5px] font-extrabold flex items-center justify-between">
            <span>
              {lang === "sw" ? "Unamjibu:" : "Replying to:"} @{replyingTo.userName}
            </span>
            <button
              onClick={() => setReplyingTo(null)}
              className="p-0.5 hover:bg-blue-500/20 rounded-full cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        <form onSubmit={handleSendComment} className="flex items-center space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onFocus={() => {
              if (!currentUser || !currentUser.isLoggedIn) {
                if (onShakeTrigger) onShakeTrigger();
              }
            }}
            placeholder={
              replyingTo
                ? lang === "sw"
                  ? `Jibu kwa @${replyingTo.userName}...`
                  : `Reply to @${replyingTo.userName}...`
                : lang === "sw"
                  ? "Andika maoni yako hapa..."
                  : "Write your comment here..."
            }
            className={`flex-1 px-3.5 py-2.5 rounded-xl text-xs font-medium border outline-none transition-all ${
              theme === "light"
                ? "bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-500"
                : theme === "blue"
                  ? "bg-slate-900/50 border-slate-800 text-slate-100 placeholder-slate-400 focus:border-blue-400"
                  : "bg-[#0c0c0c] border-neutral-800 text-slate-100 focus:border-blue-500"
            }`}
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className={`p-2.5 rounded-xl font-bold flex items-center justify-center transition-all cursor-pointer ${
              inputText.trim()
                ? "bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 active:scale-95"
                : "bg-slate-500/20 text-slate-500 cursor-not-allowed"
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
      {/* 4. DEDICATED THREAD OVERLAY / DRAWER */}
      <AnimatePresence>
        {activeThread && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className={`fixed inset-0 z-[130] flex flex-col h-full w-full overflow-hidden ${bgClass}`}
          >
            {/* Thread Header */}
            <header
              className={`sticky top-0 z-30 flex items-center justify-between px-3 py-3 border-b backdrop-blur-md ${headerBg}`}
            >
              <div className="flex items-center space-x-2.5">
                <button
                  onClick={() => {
                    setActiveThreadId(null);
                    setThreadInputText("");
                  }}
                  className="p-1.5 rounded-full hover:bg-slate-500/10 text-current transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-sm font-extrabold flex items-center space-x-1.5">
                    <span>{lang === "sw" ? "Thread ya Maoni" : "Comment Thread"}</span>
                  </h2>
                  <span
                    onClick={() =>
                      onViewProfile &&
                      onViewProfile({
                        userId: activeThread.userId,
                        userName: activeThread.userName,
                        userAvatar: activeThread.userAvatar,
                        isVerified: activeThread.isVerified,
                        isPro: activeThread.isPro,
                      })
                    }
                    className="text-[10px] text-slate-400 font-medium cursor-pointer hover:underline"
                    title={lang === "sw" ? "Angalia wasifu wa mtumiaji" : "View user profile"}
                  >
                    @{activeThread.userName}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 text-[11px] font-bold">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>
                  {activeThread.replies.length}{" "}
                  {lang === "sw"
                    ? activeThread.replies.length === 1
                      ? "Jibu"
                      : "Majibu"
                    : activeThread.replies.length === 1
                      ? "Reply"
                      : "Replies"}
                </span>
              </div>
            </header>

            {/* Thread Content */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-4 custom-scrollbar">
              {/* Primary Parent Comment Card */}
              <div className={`p-3.5 rounded-2xl border ${commentItemBg}`}>
                <div className="flex items-start justify-between">
                  <div
                    onClick={() =>
                      onViewProfile &&
                      onViewProfile({
                        userId: activeThread.userId,
                        userName: activeThread.userName,
                        userAvatar: activeThread.userAvatar,
                        isVerified: activeThread.isVerified,
                        isPro: activeThread.isPro,
                      })
                    }
                    className="flex items-center space-x-2 cursor-pointer group hover:opacity-85 transition-opacity"
                    title={lang === "sw" ? "Angalia wasifu wa mtumiaji" : "View user profile"}
                  >
                    <div
                      className={`w-7 h-7 rounded-full font-black text-[10px] flex items-center justify-center shrink-0 overflow-hidden ring-1 ring-white/10 group-hover:ring-blue-500/50 transition-all ${
                        theme === "light"
                          ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white"
                          : theme === "blue"
                            ? "bg-gradient-to-br from-blue-500/30 to-indigo-500/30 border border-blue-400/30 text-blue-100"
                            : "bg-gradient-to-br from-neutral-800 to-neutral-700 border border-neutral-700/80 text-white"
                      }`}
                    >
                      {activeThread.userAvatar ? (
                        <img
                          src={activeThread.userAvatar}
                          alt={activeThread.userName}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <UserCircleSingleIcon className="w-4.5 h-4.5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center space-x-1">
                        <span className="text-xs font-black text-current group-hover:underline">
                          {activeThread.userName}
                        </span>
                        {activeThread.isVerified && (
                          <VerifiedBadge className="w-3 h-3 text-blue-500 shrink-0" />
                        )}
                        {activeThread.isPro && (
                          <span className="text-[7px] font-black px-1 py-0.2 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20 uppercase">
                            PRO
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-slate-400 block font-medium">
                        {activeThread.timeAgo}
                      </span>
                    </div>
                  </div>
                </div>

                <p
                  className={`mt-2 text-xs font-medium leading-relaxed pl-9 ${
                    theme === "light" ? "text-slate-800" : "text-slate-100"
                  }`}
                >
                  {activeThread.text}
                </p>

                <div className="mt-2.5 pl-9 flex items-center space-x-4 text-[11px] font-semibold">
                  <button
                    onClick={() => handleToggleCommentLike(activeThread.id)}
                    className={`flex items-center space-x-1 transition-colors cursor-pointer ${
                      activeThread.userLiked
                        ? theme === "light"
                          ? "text-blue-600 font-bold"
                          : "text-blue-300 font-bold"
                        : theme === "light"
                          ? "hover:text-slate-900"
                          : "hover:text-white"
                    }`}
                  >
                    <ThumbsUp
                      className={`w-3.5 h-3.5 ${activeThread.userLiked ? "fill-current" : ""}`}
                    />
                    <span>{activeThread.likes > 0 ? activeThread.likes : ""}</span>
                    <span className="ml-0.5">{lang === "sw" ? "Penda" : "Like"}</span>
                  </button>
                </div>
              </div>

              {/* Replies Header */}
              <div className="flex items-center justify-between pt-1 px-1">
                <h3 className="text-xs font-extrabold flex items-center space-x-1.5 text-slate-400">
                  <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                  <span>
                    {lang === "sw" ? "Majibu yote kwenye thread" : "All thread replies"} (
                    {activeThread.replies.length})
                  </span>
                </h3>
              </div>

              {/* Replies List */}
              {activeThread.replies.length === 0 ? (
                <div className="text-center py-8 px-4 rounded-xl border border-dashed border-slate-500/20 text-slate-400">
                  <MessageSquare className="w-7 h-7 mx-auto mb-2 opacity-30" />
                  <p className="text-xs font-semibold">
                    {lang === "sw"
                      ? "Bado hakuna majibu kwenye maoni haya."
                      : "No replies on this comment yet."}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {lang === "sw"
                      ? "Kuwa wa kwanza kuandika jibu lako hapa chini!"
                      : "Be the first to reply below!"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {activeThread.replies.map((r) => (
                    <div key={r.id} className={`p-3 rounded-2xl border ${commentItemBg}`}>
                      <div className="flex items-center justify-between">
                        <div
                          onClick={() =>
                            onViewProfile &&
                            onViewProfile({
                              userId: r.userId,
                              userName: r.userName,
                              userAvatar: r.userAvatar,
                              isVerified: r.isVerified,
                            })
                          }
                          className="flex items-center space-x-2 cursor-pointer group hover:opacity-85 transition-opacity"
                          title={lang === "sw" ? "Angalia wasifu wa mtumiaji" : "View user profile"}
                        >
                          <div
                            className={`w-6 h-6 rounded-full font-black text-[9px] flex items-center justify-center shrink-0 overflow-hidden ring-1 ring-white/10 group-hover:ring-blue-500/50 transition-all ${
                              theme === "light"
                                ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white"
                                : theme === "blue"
                                  ? "bg-gradient-to-br from-blue-500/30 to-indigo-500/30 border border-blue-400/30 text-blue-100"
                                  : "bg-gradient-to-br from-neutral-800 to-neutral-700 border border-neutral-700/80 text-white"
                            }`}
                          >
                            {r.userAvatar ? (
                              <img
                                src={r.userAvatar}
                                alt={r.userName}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <UserCircleSingleIcon className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center space-x-1">
                              <span
                                className={`text-[11px] font-bold group-hover:underline ${
                                  theme === "light" ? "text-slate-900" : "text-white"
                                }`}
                              >
                                @{r.userName}
                              </span>
                              {r.isVerified && (
                                <VerifiedBadge className="w-2.5 h-2.5 text-blue-500 shrink-0" />
                              )}
                            </div>
                            <span className="text-[8.5px] text-slate-400 block font-medium">
                              {r.timeAgo}
                            </span>
                          </div>
                        </div>
                      </div>

                      <p
                        className={`mt-1.5 text-xs font-medium leading-relaxed pl-8 ${
                          theme === "light" ? "text-slate-800" : "text-slate-100"
                        }`}
                      >
                        {r.text}
                      </p>

                      <div className="mt-2 pl-8 flex items-center space-x-3 text-[10px] font-semibold text-slate-400">
                        <button
                          onClick={() => handleToggleReplyLike(activeThread.id, r.id)}
                          className={`flex items-center space-x-1 transition-colors cursor-pointer ${
                            r.userLiked
                              ? theme === "light"
                                ? "text-blue-600 font-bold"
                                : "text-blue-300 font-bold"
                              : theme === "light"
                                ? "hover:text-slate-900"
                                : "hover:text-white"
                          }`}
                        >
                          <ThumbsUp className={`w-3 h-3 ${r.userLiked ? "fill-current" : ""}`} />
                          <span>{r.likes > 0 ? r.likes : ""}</span>
                          <span className="ml-0.5">{lang === "sw" ? "Penda" : "Like"}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sticky Bottom Thread Reply Input */}
            <div className={`sticky bottom-0 z-30 p-3 border-t backdrop-blur-md ${headerBg}`}>
              <form
                onSubmit={(e) => handleSendThreadReply(activeThread.id, e)}
                className="flex items-center space-x-2"
              >
                <input
                  type="text"
                  value={threadInputText}
                  onChange={(e) => setThreadInputText(e.target.value)}
                  onFocus={() => {
                    if (!currentUser || !currentUser.isLoggedIn) {
                      if (onShakeTrigger) onShakeTrigger();
                    }
                  }}
                  placeholder={
                    lang === "sw"
                      ? `Jibu maoni ya @${activeThread.userName}...`
                      : `Reply to @${activeThread.userName}...`
                  }
                  className={`flex-1 px-3.5 py-2.5 rounded-xl text-xs font-medium border outline-none transition-all ${
                    theme === "light"
                      ? "bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-500"
                      : theme === "blue"
                        ? "bg-slate-900/50 border-slate-800 text-slate-100 placeholder-slate-400 focus:border-blue-400"
                        : "bg-[#0c0c0c] border-neutral-800 text-slate-100 focus:border-blue-500"
                  }`}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!threadInputText.trim()}
                  className={`p-2.5 rounded-xl font-bold flex items-center justify-center transition-all cursor-pointer ${
                    threadInputText.trim()
                      ? "bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 active:scale-95"
                      : "bg-slate-500/20 text-slate-500 cursor-not-allowed"
                  }`}
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
