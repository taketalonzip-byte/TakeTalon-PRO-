/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, lazy, Suspense } from "react";
import Header from "./components/Header";
import TalonLogo from "./components/TalonLogo";
import CategoryChips from "./components/CategoryChips";
import EsportsRow from "./components/EsportsRow";
import CasinoRow from "./components/CasinoRow";
import SearchProfilesPanel from "./components/SearchProfilesPanel";
import TtGamesRow from "./components/TtGamesRow";
import MatchList from "./components/MatchList";
import BottomNavBar from "./components/BottomNavBar";
import Splash from "./components/Splash";
import {
  HomeFeedSkeleton,
  WalletSkeleton,
  ProfileSkeleton,
  TipstersSkeleton,
  FootballCountrySkeleton,
  SportPageSkeleton,
} from "./components/skeletons";
import { getFixtures, getCompetitionFixtures, invalidateCompetitions } from "./lib/footballCache";
import { syncPendingPhotoUploads } from "./lib/photoUploader";

import type { LegalSectionId } from "./components/LegalView";

// Heavy tab components — loaded on demand the first time user navigates there
const AviatorGame = lazy(() => import("./components/AviatorGame"));
const WalletView = lazy(() => import("./components/WalletView"));
const DepositPage = lazy(() => import("./components/DepositPage"));
const TipstersList = lazy(() => import("./components/TipstersList"));
const ProfileView = lazy(() => import("./components/ProfileView"));
const HelpView = lazy(() => import("./components/HelpView"));
const LegalView = lazy(() => import("./components/LegalView"));
const TransactionHistoryView = lazy(() => import("./components/TransactionHistoryView"));
const GamblingControlsView = lazy(() => import("./components/GamblingControlsView"));
const VerifiedView = lazy(() => import("./components/VerifiedView"));
const ReportProblemView = lazy(() => import("./components/ReportProblemView"));
const SettingsView = lazy(() => import("./components/SettingsView"));
const AgentView = lazy(() => import("./components/AgentView"));
const NotificationsView = lazy(() => import("./components/NotificationsView"));
const AdminDashboard = lazy(() => import("./components/AdminDashboard"));
const GovernancePanel = lazy(() => import("./components/GovernancePanel"));
const FootballPage = lazy(() => import("./components/FootballPage"));
const SportPage = lazy(() => import("./components/SportPage"));
const AuthPage = lazy(() => import("./components/AuthPage"));
const CasinoGamePlay = lazy(() => import("./components/CasinoGamePlay"));
const PublicProfilePage = lazy(() => import("./components/PublicProfilePage"));
import CommentsPage from "./components/CommentsPage";
import { INITIAL_MATCH_TIPS, TOP_TIPSTERS } from "./data";
import { INITIAL_UNLOCKERS_TIPS } from "./unlockersData";
import { MatchTip, Transaction, CartItem } from "./types";
import { useUnlocks } from "./hooks/useUnlocks";
import { PublicProfile } from "./lib/unlockService";
import { createDatabasePost, fetchAllDatabasePosts } from "./lib/postsService";
import {
  Sparkles,
  Coins,
  Trophy,
  CheckCircle,
  ChevronRight,
  X,
  User,
  ArrowRight,
  Star,
  BookmarkCheck,
  Eye,
  Languages,
  ShoppingCart,
  Trash2,
  LogOut,
  KeyRound,
  UserCheck,
  RefreshCw,
  CheckCircle2,
  Home,
  Users,
  Wallet,
  HelpCircle,
  Cpu,
  Bell,
  Download,
} from "lucide-react";
import SettingsIcon from "./components/SettingsIcon";
import ColorThemeIcon from "./components/ColorThemeIcon";
import EyeComfortIcon from "./components/EyeComfortIcon";
import InstallMobileIcon from "./components/InstallMobileIcon";
import PwaIcon from "./components/PwaIcon";
import HandshakeIcon from "./components/HandshakeIcon";
import HelpQuestionIcon from "./components/HelpQuestionIcon";
import { motion, AnimatePresence } from "motion/react";
import { locales } from "./locales";
import { supabase, isSupabaseConfigured } from "./lib/supabase";
import { renderThemeIcon } from "./components/ThemeModeIcons";

const formatVirtualName = (name: string) => {
  if (!name) return "";
  if (name.toLowerCase().startsWith("v-")) {
    return `v- ${name.substring(2)}`;
  }
  return name;
};

export default function App() {
  // Splash state
  const [showSplash, setShowSplash] = useState(true);

  // Language switcher state
  const [lang, setLang] = useState<"en" | "fr" | "sw">("en");

  // Theme switcher state (blue, dark, light)
  const [theme, setTheme] = useState<"blue" | "dark" | "light">("blue");

  // Sync states
  useEffect(() => {
    syncPendingPhotoUploads();
  }, [lang]);

  useEffect(() => {
    document.documentElement.classList.remove("theme-blue", "theme-dark", "theme-light");
    document.documentElement.classList.add(`theme-${theme}`);
    document.body.classList.remove("theme-blue", "theme-dark", "theme-light");
    document.body.classList.add(`theme-${theme}`);

    // Dynamic Android OS System Status Bar & System Navigation Bar theme-color (matching PostCard background)
    const themeColor = theme === "blue" ? "#3B6D99" : theme === "dark" ? "#0d0d0d" : "#ffffff";

    let metaTheme = document.querySelector('meta[name="theme-color"]');
    if (!metaTheme) {
      metaTheme = document.createElement("meta");
      metaTheme.setAttribute("name", "theme-color");
      document.head.appendChild(metaTheme);
    }
    metaTheme.setAttribute("content", themeColor);

    let metaNav = document.querySelector('meta[name="msapplication-navbutton-color"]');
    if (!metaNav) {
      metaNav = document.createElement("meta");
      metaNav.setAttribute("name", "msapplication-navbutton-color");
      document.head.appendChild(metaNav);
    }
    metaNav.setAttribute("content", themeColor);

    let metaBg = document.querySelector('meta[name="background-color"]');
    if (!metaBg) {
      metaBg = document.createElement("meta");
      metaBg.setAttribute("name", "background-color");
      document.head.appendChild(metaBg);
    }
    metaBg.setAttribute("content", themeColor);

    // Apply color to body and html element backgrounds so system UI overlays blend seamlessly
    document.documentElement.style.backgroundColor = themeColor;
    document.body.style.backgroundColor = themeColor;
  }, [theme]);

  const t = locales[lang];

  // Eye Comfort (Macho Salama) State
  const [eyeComfort, setEyeComfort] = useState(false);

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<
    | "Home"
    | "Tipsters"
    | "Aviator"
    | "Console"
    | "Wallet"
    | "Deposit"
    | "Profile"
    | "Help"
    | "Legal"
    | "Verified"
    | "ReportProblem"
    | "Settings"
    | "Agent"
    | "Notifications"
    | "Admin"
    | "Governance"
    | "TransactionHistory"
    | "GamblingControls"
    | "Football"
    | "Basketball"
    | "Tennis"
    | "Volleyball"
    | "Ice Hockey"
    | "Rugby"
    | "Baseball"
    | "Cricket"
    | "Handball"
    | "Boxing"
    | "Golf"
  >("Home");
  const [activeSubTab, setActiveSubTab] = useState<"Kwako" | "Unlockers">("Kwako");
  // Casino mini-game overlay (non-Aviator slugs)
  const [selectedCasinoGame, setSelectedCasinoGame] = useState<{
    slug: string;
    title: string;
  } | null>(null);

  // Selected comment match details
  const [selectedCommentMatch, setSelectedCommentMatch] = useState<MatchTip | null>(null);

  // Step-by-Step Navigation History Stack
  const navHistoryRef = useRef<
    {
      activeTab: typeof activeTab;
      selectedPublicProfile: PublicProfile | null;
      selectedCommentMatch: MatchTip | null;
      selectedCasinoGame: { slug: string; title: string } | null;
      showProfileModal: boolean;
      showCartDrawer: boolean;
      showAuthModal: boolean;
    }[]
  >([]);
  const isNavigatingBackRef = useRef<boolean>(false);

  const pushCurrentStepToHistory = () => {
    if (isNavigatingBackRef.current) return;
    navHistoryRef.current.push({
      activeTab,
      selectedPublicProfile,
      selectedCommentMatch,
      selectedCasinoGame,
      showProfileModal,
      showCartDrawer,
      showAuthModal,
    });
    try {
      window.history.pushState({ depth: navHistoryRef.current.length }, "");
    } catch (e) {}
  };

  const goBack = () => {
    if (navHistoryRef.current.length > 0) {
      isNavigatingBackRef.current = true;
      const prevStep = navHistoryRef.current.pop()!;
      setActiveTab(prevStep.activeTab);
      setSelectedPublicProfile(prevStep.selectedPublicProfile);
      setSelectedCommentMatch(prevStep.selectedCommentMatch);
      setSelectedCasinoGame(prevStep.selectedCasinoGame);
      setShowProfileModal(prevStep.showProfileModal);
      setShowCartDrawer(prevStep.showCartDrawer);
      setShowAuthModal(prevStep.showAuthModal || false);
      setTimeout(() => {
        isNavigatingBackRef.current = false;
      }, 50);
    } else {
      if (
        showAuthModal ||
        selectedPublicProfile ||
        selectedCommentMatch ||
        selectedCasinoGame ||
        showProfileModal ||
        showCartDrawer
      ) {
        setShowAuthModal(false);
        setSelectedPublicProfile(null);
        setSelectedCommentMatch(null);
        setSelectedCasinoGame(null);
        setShowProfileModal(false);
        setShowCartDrawer(false);
      } else if (activeTab !== "Home") {
        setActiveTab("Home");
      }
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      goBack();
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleOpenComments = (match: MatchTip | null) => {
    if (match) {
      pushCurrentStepToHistory();
    }
    setSelectedCommentMatch(match);
  };

  const handleSelectCasinoGame = (game: { slug: string; title: string } | null) => {
    if (game) {
      pushCurrentStepToHistory();
    }
    setSelectedCasinoGame(game);
  };

  // Custom interactive system notifications
  const [notifications, setNotifications] = useState<
    { id: string; message: string; type: "success" | "error" | "info" }[]
  >([]);
  const [notificationHistory, setNotificationHistory] = useState<
    { id: string; message: string; type: "success" | "error" | "info"; timestamp: string; read?: boolean }[]
  >([]);

  const markAllNotificationsRead = () => {
    setNotificationHistory((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const addNotification = (message: string, type: "success" | "error" | "info" = "info") => {
    // Zuia notification zote wakati mtumiaji bado hajalogin
    if (!currentUser || !currentUser.isLoggedIn) {
      return;
    }
    const id = `${Date.now()}-${Math.random()}`;
    const timestamp = new Date().toLocaleTimeString();

    setNotifications((prev) => [...prev, { id, message, type }]);
    setNotificationHistory((prev) => {
      const updated = [{ id, message, type, timestamp, read: false }, ...prev].slice(0, 50);
      return updated;
    });

    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 4000);
  };

  // Modern Dialog replace for raw confirm
  const [pendingUnlockMatch, setPendingUnlockMatch] = useState<MatchTip | null>(null);
  const [unlockPassword, setUnlockPassword] = useState("");
  const [unlockPasswordError, setUnlockPasswordError] = useState("");

  useEffect(() => {
    if (!pendingUnlockMatch) {
      setUnlockPassword("");
      setUnlockPasswordError("");
    }
  }, [pendingUnlockMatch]);

  // Filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSport, setSelectedSport] = useState("All");
  const [selectedLeague, setSelectedLeague] = useState("All");
  const [selectedSubLeague, setSelectedSubLeague] = useState("All");
  const [selectedTopTab, setSelectedTopTab] = useState<
    "All" | "Sports" | "eSports" | "Casino" | "TT Games"
  >("All");

  // Supabase auth user ID (UUID) — separate from currentUser display object
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null); // profiles.id (primary key)

  // Premium / Wallet states
  const [currentUser, setCurrentUser] = useState<{
    id?: string;
    authUserId?: string;
    username: string;
    email: string;
    phone: string;
    role?: string;
    isLoggedIn: boolean;
    avatarUrl?: string | null;
    fullName?: string;
    firstName?: string;
    lastName?: string;
  } | null>(null);

  // Clear all localStorage on application startup as requested
  useEffect(() => {
    try {
      localStorage.clear();
      console.log("[STORAGE] Cleared all localStorage.");
    } catch (e) {
      /* ignore iframe security policy errors */
    }
  }, []);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "register" | "forgot">("login");
  const [shakeTrigger, setShakeTrigger] = useState(0);

  // Selected Public Profile state for viewing other profiles
  const [selectedPublicProfile, setSelectedPublicProfile] = useState<PublicProfile | null>(null);

  const handleViewProfile = async (tipsterOrProfile: any) => {
    if (!tipsterOrProfile) return;

    pushCurrentStepToHistory();

    // 1. Extract IDs and username
    const targetId =
      typeof tipsterOrProfile === "object"
        ? tipsterOrProfile.profile_id || tipsterOrProfile.id || tipsterOrProfile.userId
        : null;

    const name =
      typeof tipsterOrProfile === "string"
        ? tipsterOrProfile
        : tipsterOrProfile.userName || tipsterOrProfile.username || tipsterOrProfile.name || "";

    const extractedAvatar =
      typeof tipsterOrProfile === "object"
        ? tipsterOrProfile.avatarUrl ||
          tipsterOrProfile.userAvatar ||
          tipsterOrProfile.avatar_url ||
          tipsterOrProfile.avatar ||
          null
        : null;

    // 2. Check if the profile being clicked belongs to the current logged in user!
    const isSelf =
      (profileId && targetId === profileId) ||
      (authUserId && targetId === authUserId) ||
      (currentUser?.username && name && name.toLowerCase() === currentUser.username.toLowerCase()) ||
      (currentUser?.firstName && currentUser?.lastName && name && name.toLowerCase() === `${currentUser.firstName} ${currentUser.lastName}`.toLowerCase()) ||
      (currentUser?.fullName && name && name.toLowerCase() === currentUser.fullName.toLowerCase());

    if (isSelf) {
      setSelectedPublicProfile(null);
      setSelectedCommentMatch(null);
      setActiveTab("Profile");
      setShowProfileModal(false);
      return;
    }

    // Always close comments modal and sidebar drawer when navigating to a profile
    setSelectedCommentMatch(null);
    setShowProfileModal(false);

    // 3. If tipsterOrProfile is already a complete PublicProfile object with valid UUID profile_id:
    if (
      typeof tipsterOrProfile === "object" &&
      tipsterOrProfile.profile_id &&
      !tipsterOrProfile.profile_id.startsWith("profile-") &&
      tipsterOrProfile.username
    ) {
      setSelectedPublicProfile(tipsterOrProfile as PublicProfile);
      return;
    }

    // 4. Look up in memory supabaseTipsters
    let existing = supabaseTipsters.find(
      (p) =>
        (targetId && (p.profile_id === targetId || p.id === targetId)) ||
        (name && p.username.toLowerCase() === name.toLowerCase()) ||
        (name && `${p.first_name} ${p.last_name}`.trim().toLowerCase() === name.toLowerCase()),
    );

    // 5. Query Supabase profiles table directly to fetch real UUID if needed
    if (!existing && (targetId || name)) {
      try {
        let query = supabase
          .from("profiles")
          .select("id, auth_user_id, username, first_name, last_name, avatar_url, is_pro, is_verified, role");

        const isUuid = targetId ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId) : false;
        if (targetId && isUuid) {
          query = query.or(`id.eq.${targetId},auth_user_id.eq.${targetId}`);
        } else if (name || targetId) {
          query = query.ilike("username", name || targetId);
        }

        const { data: dbProfile } = await query.maybeSingle();

        if (dbProfile) {
          existing = {
            profile_id: dbProfile.id,
            id: dbProfile.auth_user_id,
            username: dbProfile.username || name,
            first_name: dbProfile.first_name || "",
            last_name: dbProfile.last_name || "",
            avatar_url: dbProfile.avatar_url || extractedAvatar,
            is_pro: dbProfile.is_pro || false,
            is_verified: dbProfile.is_verified || false,
            role: dbProfile.role || "USER",
          };
        }
      } catch (err) {
        console.warn("[handleViewProfile] DB fetch error:", err);
      }
    }

    if (existing) {
      const profileToShow =
        extractedAvatar && !existing.avatar_url
          ? { ...existing, avatar_url: extractedAvatar }
          : existing;
      setSelectedPublicProfile(profileToShow);
    } else {
      setSelectedPublicProfile({
        profile_id: targetId || `profile-${name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
        id: `auth-${name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
        username: name || "Tipster",
        first_name: name.split(" ")[0] || name,
        last_name: name.split(" ").slice(1).join(" ") || "",
        avatar_url: extractedAvatar,
        is_pro: tipsterOrProfile?.isPro || tipsterOrProfile?.badge === "PRO" || false,
        is_verified: tipsterOrProfile?.isVerified || tipsterOrProfile?.isOfficial || false,
        role: tipsterOrProfile?.isOfficial ? "OFFICIAL" : "TIPSTER",
      });
    }
  };

  const openLogin = () => {
    pushCurrentStepToHistory();
    setAuthModalMode("login");
    setShowAuthModal(true);
  };

  const openRegister = () => {
    pushCurrentStepToHistory();
    setAuthModalMode("register");
    setShowAuthModal(true);
  };

  // Synchronize with Supabase Auth state (handles automatic login on verification redirect!)
  useEffect(() => {
    if (!isSupabaseConfigured) {
      // offline mock mode — no auth sync
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // auth state changed

      if (session?.user) {
        const user = session.user;
        setAuthUserId(user.id);

        // Soma profile kutoka profiles table
        try {
          let profile: any = null;

          // 1. Client fetch by id or auth_user_id
          const { data: clientProf } = await supabase
            .from("profiles")
            .select(
              "id, auth_user_id, username, first_name, last_name, avatar_url, email, role, is_pro, is_verified",
            )
            .or(`id.eq.${user.id},auth_user_id.eq.${user.id}`)
            .maybeSingle();

          profile = clientProf;

          // 2. Fallback to server lookup endpoint if client fetch returned null (e.g. due to RLS)
          if (!profile) {
            try {
              const res = await fetch(`/api/auth/profile-lookup?auth_user_id=${encodeURIComponent(user.id)}`);
              if (res.ok) {
                const sData = await res.json();
                if (sData?.profile) {
                  profile = sData.profile;
                }
              }
            } catch (sErr) {}
          }

          if (profile) {
            setProfileId(profile.id);
            setIsPro(profile.is_pro || false);

            const fName = profile.first_name || "";
            const lName = profile.last_name || "";
            const fullN = [fName, lName].filter(Boolean).join(" ") || profile.username || "User";

            const uname =
              profile.username ||
              user.user_metadata?.username ||
              user.email?.split("@")[0] ||
              "User";

            const resolvedAvatar = profile.avatar_url || null;

            setCurrentUser({
              id: profile.id,
              authUserId: user.id,
              username: uname,
              firstName: fName,
              lastName: lName,
              fullName: fullN,
              avatarUrl: resolvedAvatar,
              avatar_url: resolvedAvatar,
              email: profile.email || user.email || "",
              phone: user.user_metadata?.phone || "",
              role: (profile as any).role || "USER",
              isLoggedIn: true,
            });

            // Soma balance kutoka wallets table (available = balance - reserved_balance)
            const { data: wallet } = await supabase
              .from("wallets")
              .select("balance, reserved_balance")
              .eq("profile_id", profile.id)
              .maybeSingle();

            if (wallet) {
              const available = Math.max(
                0,
                Number(wallet.balance) - Number(wallet.reserved_balance || 0),
              );
              setUserBalance(available);
            }
          } else {
            // Profile missing — auto create
            const unameCandidate =
              user.user_metadata?.username ||
              user.email?.split("@")[0] ||
              `user_${user.id.slice(0, 8)}`;

            try {
              const insertData: any = {
                auth_user_id: user.id,
                username: unameCandidate,
                first_name: user.user_metadata?.first_name || "",
                last_name: user.user_metadata?.last_name || "",
                email: user.email || "",
                role: "USER",
              };

              const { data: createdProf } = await supabase
                .from("profiles")
                .upsert(insertData, { onConflict: "auth_user_id" })
                .select("id, username, first_name, last_name, avatar_url, email, role, is_pro, is_verified")
                .maybeSingle();

              if (createdProf) {
                setProfileId(createdProf.id);
                setCurrentUser({
                  id: createdProf.id,
                  authUserId: user.id,
                  username: createdProf.username,
                  email: createdProf.email || user.email || "",
                  phone: user.user_metadata?.phone || "",
                  avatarUrl: createdProf.avatar_url || null,
                  avatar_url: createdProf.avatar_url || null,
                  isLoggedIn: true,
                });
              } else {
                setCurrentUser({
                  username: unameCandidate,
                  email: user.email || "",
                  phone: user.user_metadata?.phone || "",
                  avatarUrl: null,
                  avatar_url: null,
                  isLoggedIn: true,
                });
              }
            } catch (createErr) {
              setCurrentUser({
                username: unameCandidate,
                email: user.email || "",
                phone: user.user_metadata?.phone || "",
                avatarUrl: null,
                avatar_url: null,
                isLoggedIn: true,
              });
            }
          }
        } catch (err: any) {
          console.warn(
            "[AUTH-STATE-CHANGE] Profile sync failed, using metadata fallback:",
            err?.message || err,
          );
          setCurrentUser({
            username: user.user_metadata?.username || user.email?.split("@")[0] || "User",
            email: user.email || "",
            phone: user.user_metadata?.phone || "",
            isLoggedIn: true,
          });
        }
      } else {
        if (event === "SIGNED_OUT") {
          setCurrentUser(null);
          setAuthUserId(null);
          setProfileId(null);
          setUserBalance(0);
          setNotificationHistory([]);
          setActiveTab("Home");
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // User-scoped key helper for data persistence
  const currentUserKey =
    currentUser && currentUser.isLoggedIn
      ? (
          currentUser.email ||
          currentUser.username ||
          currentUser.id ||
          profileId ||
          authUserId ||
          "user"
        ).toLowerCase()
      : null;

  // Purge all localStorage items as requested by user ("futa localstorage zote")
  useEffect(() => {
    try {
      localStorage.clear();
      console.log("[STORAGE] Purged all localStorage items completely.");
    } catch (e) {
      console.warn("[STORAGE] localStorage.clear warning:", e);
    }
  }, []);

  // Database-First Profile & Wallet Loading on Mount / Refresh / User Change
  useEffect(() => {
    if (!currentUserKey) {
      setProfileId(null);
      setAuthUserId(null);
      setUserBalance(0);
      return;
    }

    let mounted = true;
    async function syncProfileAndWalletFromDatabase() {
      try {
        const lookupId = currentUser?.id || currentUser?.authUserId || currentUserKey;
        const res = await fetch(`/api/auth/profile-lookup?id=${encodeURIComponent(lookupId)}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.profile && mounted) {
            // 1. Sync Profile ID & Auth User ID
            if (data.profile.id) setProfileId(data.profile.id);
            if (data.profile.auth_user_id) setAuthUserId(data.profile.auth_user_id);

            // 2. Sync Profile Attributes
            const freshAvatar = data.profile.avatar_url || currentUser?.avatarUrl || null;
            const freshFullName =
              data.profile.full_name ||
              [data.profile.first_name, data.profile.last_name].filter(Boolean).join(" ") ||
              currentUser?.fullName ||
              "";

            const updatedUser = {
              ...currentUser,
              id: data.profile.id,
              authUserId: data.profile.auth_user_id,
              username: data.profile.username || currentUser?.username || "User",
              email: data.profile.email || currentUser?.email || "",
              phone: data.profile.phone || currentUser?.phone || "",
              role: data.profile.role || currentUser?.role || "USER",
              avatarUrl: freshAvatar,
              fullName: freshFullName,
              isLoggedIn: true,
            };

            setCurrentUser(updatedUser);

            // 3. Sync Wallet Balance strictly from Database
            if (data.wallet) {
              const available = Number(data.wallet.available_balance ?? data.wallet.balance ?? 0);
              setUserBalance(available);
            }

            if (data.profile.is_pro !== undefined) {
              setIsPro(!!data.profile.is_pro);
            }
          }
        }
      } catch (err) {
        console.warn("[DB-SYNC] Failed to fetch profile and wallet from DB:", err);
      }
    }

    syncProfileAndWalletFromDatabase();
    return () => {
      mounted = false;
    };
  }, [currentUserKey]);

  const [userBalance, setUserBalance] = useState<number>(0);
  const [isPro, setIsPro] = useState<boolean>(false);
  const [isLifetime, setIsLifetime] = useState<boolean>(false);
  const [legalSection, setLegalSection] = useState<LegalSectionId>("terms");

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [unlockedMatchIds, setUnlockedMatchIds] = useState<string[]>([]);
  const [subscribedTipsters, setSubscribedTipsters] = useState<string[]>([]);
  const [userPublishedTips, setUserPublishedTips] = useState<MatchTip[]>([]);

  // Load user data on currentUser change / login / logout
  useEffect(() => {
    if (!currentUserKey) {
      setTransactions([]);
      setUnlockedMatchIds([]);
      setSubscribedTipsters([]);
      setNotificationHistory([]);
      setUserPublishedTips([]);
      return;
    }

    // Load published tips directly from Supabase Database
    fetchAllDatabasePosts().then((dbPosts) => {
      if (dbPosts && dbPosts.length > 0) {
        setUserPublishedTips(dbPosts);
        setMatchTips((prev) => {
          const existing = new Set(prev.map((t) => t.id));
          const toAdd = dbPosts.filter((t) => !existing.has(t.id));
          return [...toAdd, ...prev];
        });
        setUnlockersTips((prev) => {
          const existing = new Set(prev.map((t) => t.id));
          const toAdd = dbPosts.filter((t) => !existing.has(t.id));
          return [...toAdd, ...prev];
        });
      }
    });
  }, [currentUserKey]);

  // Sync balance kwa real-time kutoka wallets table (Supabase Realtime)
  useEffect(() => {
    if (!profileId || !isSupabaseConfigured) return;

    const channel = supabase
      .channel(`wallet:${profileId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "wallets",
          filter: `profile_id=eq.${profileId}`,
        },
        (payload: any) => {
          const w = payload.new;
          if (w) {
            const available = Math.max(0, Number(w.balance) - Number(w.reserved_balance || 0));
            setUserBalance(available);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileId, currentUserKey]);

  // Bet placement popup states
  const [selectedMatchForBet, setSelectedMatchForBet] = useState<MatchTip | null>(null);
  const [selectedOddType, setSelectedOddType] = useState<"home" | "draw" | "away">("home");
  const [oddValue, setOddValue] = useState<number>(1.0);
  const [betStakeAmount, setBetStakeAmount] = useState<number>(3000);
  const [betSuccessModal, setBetSuccessModal] = useState(false);

  // Shopping cart (Bet Slip) states
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [cartMode, setCartMode] = useState<"regular" | "creator">("regular");
  const [creatorMatch, setCreatorMatch] = useState<MatchTip | null>(null);
  const [creatorDeposit, setCreatorDeposit] = useState<number>(50000);
  const [creatorOddHome, setCreatorOddHome] = useState<number>(5);
  const [creatorOddDraw, setCreatorOddDraw] = useState<number>(3);
  const [creatorOddAway, setCreatorOddAway] = useState<number>(4);
  const [creatorMinBetterBalance, setCreatorMinBetterBalance] = useState<number>(1000);
  const [creatorMatchedBetters, setCreatorMatchedBetters] = useState<any[]>([]);
  const [creatorIsPublished, setCreatorIsPublished] = useState<boolean>(false);
  const [creatorIsLoading, setCreatorIsLoading] = useState<boolean>(false);
  const [creatorPublishSeconds, setCreatorPublishSeconds] = useState<number>(30);
  const [creatorError, setCreatorError] = useState<string | null>(null);

  // Dynamic Live Simulation for cart's creator mode liability calculations
  const cartRealDeposit = Math.floor(creatorDeposit * 0.95);

  let cartMaxOdd = creatorOddHome || 1.8;
  let cartHighestOutcome: "Home" | "Draw" | "Away" = "Home";
  if ((creatorOddDraw || 0) > cartMaxOdd) {
    cartMaxOdd = creatorOddDraw;
    cartHighestOutcome = "Draw";
  }
  if ((creatorOddAway || 0) > cartMaxOdd) {
    cartMaxOdd = creatorOddAway;
    cartHighestOutcome = "Away";
  }
  if (cartMaxOdd < 1) cartMaxOdd = 1;

  const cartWorstCasePayoutPerBetter = cartMaxOdd * creatorMinBetterBalance;
  const cartRawCount = cartRealDeposit / (cartWorstCasePayoutPerBetter || 1);
  let cartCalculatedCount = Math.floor(cartRawCount);
  cartCalculatedCount = Math.max(1, cartCalculatedCount);

  const cartSimulatedBettersLive = Array.from({ length: cartCalculatedCount }).map((_, idx) => {
    const username = "******";
    const chosen = cartHighestOutcome;
    const oddUsed = cartMaxOdd;
    const stakeAmount = creatorMinBetterBalance;
    const potentialWin = stakeAmount * oddUsed;

    return {
      id: idx + 1,
      username,
      chosenOutcome: chosen,
      oddUsed,
      stakeAmount,
      potentialWin,
    };
  });

  const cartPayoutHome = cartSimulatedBettersLive
    .filter((b) => b.chosenOutcome === "Home")
    .reduce((acc, curr) => acc + curr.potentialWin, 0);
  const cartPayoutDraw = cartSimulatedBettersLive
    .filter((b) => b.chosenOutcome === "Draw")
    .reduce((acc, curr) => acc + curr.potentialWin, 0);
  const cartPayoutAway = cartSimulatedBettersLive
    .filter((b) => b.chosenOutcome === "Away")
    .reduce((acc, curr) => acc + curr.potentialWin, 0);
  const cartMaxLiability = Math.max(cartPayoutHome, cartPayoutDraw, cartPayoutAway);
  const cartIsLiabilityExceeded = cartMaxLiability > creatorDeposit;

  // Profile modal drawer
  const [showProfileModal, setShowProfileModal] = useState(false);

  // PWA install prompt state
  const [pwaInstallPrompt, setPwaInstallPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).deferredPrompt = e;
      setPwaInstallPrompt(e);
      window.dispatchEvent(new Event("pwa-install-available"));
    };

    const handleInstallAvailable = () => {
      setPwaInstallPrompt((window as any).deferredPrompt || null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("pwa-install-available", handleInstallAvailable);

    if ((window as any).deferredPrompt) {
      setPwaInstallPrompt((window as any).deferredPrompt);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("pwa-install-available", handleInstallAvailable);
    };
  }, []);

  const handleInstallPWA = async () => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone ||
      document.referrer.includes("android-app://");

    if (isStandalone) {
      addNotification(
        lang === "sw"
          ? "Programu hii imesakinishwa tayari kwenye kifaa chako na unaitumia sasa!"
          : lang === "fr"
            ? "Cette application est déjà installée sur votre appareil !"
            : "This app is already installed on your device and running as a PWA!",
        "success",
      );
      return;
    }

    const promptEvent = pwaInstallPrompt || (window as any).deferredPrompt;
    if (!promptEvent) {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      if (isIOS) {
        addNotification(
          lang === "sw"
            ? "Kwenye iPhone/iPad: Bofya kitufe cha 'Share' cha Safari kisha uchague 'Add to Home Screen'."
            : lang === "fr"
              ? "Sur iPhone/iPad: Appuyez sur Partager dans Safari puis 'Sur l'écran d'accueil'."
              : "On iPhone/iPad: Tap the Share icon in Safari and select 'Add to Home Screen'.",
          "info",
        );
      } else {
        addNotification(
          lang === "sw"
            ? "Ili kusakinisha, bofya menyu ya kivinjari chako (⋮) kisha uchague 'Sakinisha Programu' au 'Add to Home Screen'."
            : lang === "fr"
              ? "Pour installer, ouvrez le menu du navigateur (⋮) puis choisissez 'Installer l'application'."
              : "To install, tap your browser menu (⋮) and select 'Install App' or 'Add to Home Screen'.",
          "info",
        );
      }
      return;
    }

    try {
      promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice?.outcome === "accepted") {
        addNotification(
          lang === "sw"
            ? "Hongera! Programu inasakinishwa kwenye skrini yako kuu."
            : lang === "fr"
              ? "Félicitations ! L'application est en cours d'installation."
              : "Congratulations! App installation accepted.",
          "success",
        );
      }
      setPwaInstallPrompt(null);
      (window as any).deferredPrompt = null;
    } catch (err) {
      console.error("PWA Installation error:", err);
    }
  };

  // Dynamic Skeleton loading state for For You (Kwako) and search inputs
  // Initialized to false so Home feed renders instantly without artificial delay.
  const [isFeedLoading, setIsFeedLoading] = useState(false);

  // Subscription state managed above per user key

  const handleSubscribeTipster = (tipsterName: string) => {
    if (!currentUser || !currentUser.isLoggedIn) {
      setShakeTrigger((prev) => prev + 1);
      return;
    }
    if (subscribedTipsters.includes(tipsterName)) return;
    const cost = 500;
    if (userBalance < cost) {
      addNotification(t.insufficientFunds, "error");
      return;
    }
    setUserBalance((prev) => prev - cost);
    handleAddTransaction("WITHDRAW", cost, `${t.subscribeMonthly} - ${tipsterName}`);
    setSubscribedTipsters((prev) => [...prev, tipsterName]);

    const detailedMsg =
      lang === "sw"
        ? `Ume-unlock ${tipsterName} kwa 500 FBU! 450 FBU zimetumwa kwake, na 50 FBU kama kamisheni ya TakeTalon.`
        : lang === "fr"
          ? `Débloqué ${tipsterName} pour 500 FBU ! 450 FBU ont été envoyés au pronostiqueur et 50 FBU comme commission TakeTalon.`
          : `Unlocked ${tipsterName} for 500 FBU! 450 FBU sent to the tipster and 50 FBU kept as TakeTalon commission.`;

    addNotification(detailedMsg, "success");
  };

  // ── Unlock / Unlockers system ──────────────────────────────────────────────
  const effectiveProfileId = profileId || currentUser?.id || null;

  const {
    records: unlockRecords,
    tipsters: supabaseTipsters,
    businessRules: unlockBusinessRules,
    pendingIncoming: unlockPendingIncoming,
    canSeeFromIds: unlockCanSeeFromIds,
    mutualIds: unlockMutualIds,
    activelyUnlocking: unlockActivelyUnlocking,
    activeUnlockers: unlockActiveUnlockers,
    unlock: handleUnlockUser,
    cancel: handleCancelUnlock,
    accept: handleAcceptUnlock,
    reject: handleRejectUnlock,
    refreshTipsters: handleRefreshTipsters,
  } = useUnlocks({
    profileId: effectiveProfileId,
    authUserId,
    isPro,
    onNotification: addNotification,
    onRequireAuth: () => {
      setAuthModalMode("login");
      setShowAuthModal(true);
    },
    lang,
  });

  // Auto-hide Bottom navigation bar on scroll down — DOM-direct to avoid re-renders during scroll
  const bottomBarRef = useRef<HTMLDivElement>(null);
  const lastScrollTop = useRef(0);

  const showNav = () => {
    const el = bottomBarRef.current;
    if (!el) return;
    el.style.transform = "translateY(0)";
    el.style.opacity = "1";
    el.style.pointerEvents = "auto";
  };

  const hideNav = () => {
    const el = bottomBarRef.current;
    if (!el) return;
    el.style.transform = "translateY(96px)";
    el.style.opacity = "0";
    el.style.pointerEvents = "none";
  };

  useEffect(() => {
    showNav();
  }, [activeTab]);

  const scrollRafId = useRef<number | null>(null);

  const handleMainScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const currentScrollTop = e.currentTarget.scrollTop;
    if (scrollRafId.current !== null) {
      cancelAnimationFrame(scrollRafId.current);
    }
    scrollRafId.current = requestAnimationFrame(() => {
      if (currentScrollTop < 15) {
        showNav();
        lastScrollTop.current = currentScrollTop;
        return;
      }

      const diff = currentScrollTop - lastScrollTop.current;

      if (Math.abs(diff) > 10) {
        if (diff > 0) {
          hideNav();
        } else {
          showNav();
        }
        lastScrollTop.current = currentScrollTop;
      }
    });
  };

  // Touch gesture swipe navigation handler with strict flow rules
  const touchStartRef = useRef<{ x: number; y: number; target: HTMLElement | null } | null>(null);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        target: e.target as HTMLElement,
      };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStartRef.current || e.changedTouches.length === 0) return;
    const start = touchStartRef.current;
    touchStartRef.current = null;

    // Check if touch originated within an inner horizontally scrollable element (e.g., sports bar or odds slider)
    let elem: HTMLElement | null = start.target;
    let isSubScroll = false;
    while (elem && elem !== e.currentTarget) {
      if (elem.scrollWidth > elem.clientWidth) {
        const style = window.getComputedStyle(elem);
        if (style.overflowX === "auto" || style.overflowX === "scroll") {
          isSubScroll = true;
          break;
        }
      }
      elem = elem.parentElement;
    }
    if (isSubScroll) return;

    const deltaX = e.changedTouches[0].clientX - start.x;
    const deltaY = e.changedTouches[0].clientY - start.y;

    // Must be a clear horizontal swipe (min 45px distance and horizontal angle)
    if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4) {
      if (deltaX > 0) {
        // Forward flow: Menu -> Notifications -> Tipsters -> Home
        if (
          activeTab === "Wallet" ||
          activeTab === "Profile" ||
          activeTab === "Agent" ||
          activeTab === "Settings"
        ) {
          setActiveTab("Notifications");
        } else if (activeTab === "Notifications") {
          setActiveTab("Tipsters"); // Skips Cart as specified
        } else if (activeTab === "Tipsters") {
          setActiveTab("Home");
        }
      } else if (deltaX < 0) {
        // Backward flow: Tipsters -> Notifications -> Menu
        // STRICT RULE: At Home, scrolling backward to Tipsters is strictly blocked!
        if (activeTab === "Home") {
          return; // Strictly blocked at Home!
        } else if (activeTab === "Tipsters") {
          setActiveTab("Notifications"); // Skips Cart as specified
        } else if (activeTab === "Notifications") {
          setActiveTab("Wallet"); // Menu
        }
      }
    }
  };

  // Match tips list local state
  const [matchTips, setMatchTips] = useState<MatchTip[]>(INITIAL_MATCH_TIPS);
  const [unlockersTips, setUnlockersTips] = useState<MatchTip[]>(INITIAL_UNLOCKERS_TIPS);

  // Real-time API state indicators
  const [isLiveLoading, setIsLiveLoading] = useState(false);
  const [liveApiStatus, setLiveApiStatus] = useState<"connected" | "idle" | "error">("idle");

  const formatSwahiliDateTime = (utcDateStr: string) => {
    const matchDate = new Date(utcDateStr);
    const daysSw = [
      "Jumapili",
      "Jumatatu",
      "Jumanne",
      "Jumatano",
      "Alhamisi",
      "Ijumaa",
      "Jumamosi",
    ];
    const monthsSw = [
      "Jan",
      "Feb",
      "Mac",
      "Apr",
      "Mei",
      "Jun",
      "Jul",
      "Ago",
      "Sep",
      "Okt",
      "Nov",
      "Des",
    ];

    const dayName = daysSw[matchDate.getDay()];
    const monthName = monthsSw[matchDate.getMonth()];
    const dateDay = matchDate.getDate();
    const year = matchDate.getFullYear();

    const hours = String(matchDate.getHours()).padStart(2, "0");
    const minutes = String(matchDate.getMinutes()).padStart(2, "0");
    const timeStr = `${hours}:${minutes}`;

    const today = new Date();
    const isToday =
      today.getDate() === dateDay &&
      today.getMonth() === matchDate.getMonth() &&
      today.getFullYear() === year;
    const isTomorrow =
      new Date(today.getTime() + 86400000).getDate() === dateDay &&
      today.getMonth() === matchDate.getMonth() &&
      today.getFullYear() === year;

    if (isToday) {
      return `Leo (${dayName}), ${dateDay} ${monthName} ${timeStr} EAT`;
    } else if (isTomorrow) {
      return `Kesho (${dayName}), ${dateDay} ${monthName} ${timeStr} EAT`;
    } else {
      return `${dayName}, ${dateDay} ${monthName} ${year} - ${timeStr} EAT`;
    }
  };

  const fetchRealTimeMatches = async () => {
    setIsLiveLoading(true);

    // Map raw matches to MatchTip format
    const mapMatchesToTips = (matchesToMap: any[]) => {
      return matchesToMap.map((match: any) => {
        const matchId = match.id;
        const hash = (matchId * 17) % 21;
        const confidence = 75 + hash;

        let predictionTip = "Sare au Chini ya 2.5";
        let analysisText =
          "Uchambuzi wetu unaonesha timu hizi zitacheza kwa tahadhari kubwa sana mchezo huu.";

        if (hash % 4 === 0) {
          predictionTip = `${match.homeTeam.shortName || match.homeTeam.name} kushinda au Sare (1X)`;
          analysisText = `${match.homeTeam.shortName || match.homeTeam.name} wanacheza nyumbani wakiwa na muundo madhubuti. Safu yao ya kiungo ipo vizuri na inapewa nafasi ya kutawala mchezo.`;
        } else if (hash % 4 === 1) {
          predictionTip = `${match.awayTeam.shortName || match.awayTeam.name} kushinda (2)`;
          analysisText = `${match.awayTeam.shortName || match.awayTeam.name} wana takwimu bora sana za ugenini msimu huu. Tunatarajia watashambulia kwa kushtukiza na kupata mabao ya ushindi.`;
        } else if (hash % 4 === 2) {
          predictionTip = "Magoli Zaidi ya 2.5 (Over 2.5)";
          analysisText =
            "Hapa kuna timu mbili zenye mashambulizi hatari lakini ulinzi legelege. Mechi za mwisho zilizikutanisha timu hizi zilizalisha magoli mengi, tunategemea mchezo wa wazi leo.";
        } else {
          predictionTip = "Timu zote mbili kufunga (GG)";
          analysisText =
            "Wenyeji na wageni wana wastani mzuri sana wa kufunga hivi karibuni, lakini wote wawili wameruhusu magoli katika michezo mitano iliyopita. GG ina thamani kubwa.";
        }

        const timeDisplay = formatSwahiliDateTime(match.utcDate);

        let status: "LIVE" | "UPCOMING" | "ENDED" = "UPCOMING";
        if (match.status === "LIVE" || match.status === "IN_PLAY" || match.status === "PAUSED") {
          status = "LIVE";
        } else if (match.status === "FINISHED") {
          status = "ENDED";
        }

        const homeScore = match.score?.fullTime?.home ?? match.score?.halfTime?.home ?? null;
        const awayScore = match.score?.fullTime?.away ?? match.score?.halfTime?.away ?? null;

        let category = "International";
        if (match.competition?.code === "PL" || match.competition?.code === "ELC") category = "UK";
        else if (match.competition?.code === "PD") category = "Espagne";
        else if (match.competition?.code === "BL1") category = "Allemagne";
        else if (match.competition?.code === "FL1") category = "France";
        else if (match.competition?.code === "SA") category = "Italy";

        const homeGlow = hash % 2 === 0 ? "rgba(59, 130, 246, 0.4)" : "rgba(239, 68, 68, 0.4)";
        const awayGlow = hash % 2 === 0 ? "rgba(16, 185, 129, 0.4)" : "rgba(234, 179, 8, 0.4)";

        const oddsAvailable =
          match.odds != null &&
          Number.isFinite(Number(match.odds.home)) && Number(match.odds.home) > 1 &&
          Number.isFinite(Number(match.odds.draw)) && Number(match.odds.draw) > 1 &&
          Number.isFinite(Number(match.odds.away)) && Number(match.odds.away) > 1;
        const odds = oddsAvailable
          ? { home: Number(match.odds.home), draw: Number(match.odds.draw), away: Number(match.odds.away) }
          : { home: 0, draw: 0, away: 0 };
        const suspended = Boolean(
          match.bettingSuspendedUntil && new Date(match.bettingSuspendedUntil).getTime() > Date.now(),
        );

        return {
          id: `api-tip-${matchId}`,
          sport: "Football",
          category,
          league: match.competition?.name || "Ligi Kuu",
          gender: "Man",
          time: timeDisplay,
          status,
          liveMinutes: status === "LIVE" ? (match.displayClock ?? (match.minute != null ? `${match.minute}'` : undefined)) : undefined,
          liveClock: match.displayClock ?? (match.minute != null ? `${match.minute}'` : null),
          homeScore,
          awayScore,
          score: homeScore != null && awayScore != null ? { home: homeScore, away: awayScore } : undefined,
          confidence,
          homeTeam: {
            name: match.homeTeam.shortName || match.homeTeam.name,
            bgGlow: homeGlow,
            logoUrl: match.homeTeam.crest,
          },
          awayTeam: {
            name: match.awayTeam.shortName || match.awayTeam.name,
            bgGlow: awayGlow,
            logoUrl: match.awayTeam.crest,
          },
            odds,
            oddsAvailable: oddsAvailable && !suspended,
          payoutBadge: `FBU ${(500 + hash * 30).toLocaleString()}k`,
            isPremium: hash % 3 === 0,
            isLocked: hash % 3 === 0 || suspended,
          tipster: {
            name: hash % 2 === 0 ? "TalonTake J." : "TakeTalon Pro",
            avatarLetter: "T",
            badge: "OFFICIAL",
            isOfficial: true,
          },
          predictionTip,
          analysisText,
          realTimeApi: true,
        };
      });
    };

    // Fallback simulated raw matches to use if fetch fails or returns empty during off-season
    const getSimulatedRawMatches = () => {
      const baseToday = new Date();
      return [
        {
          id: 600001,
          utcDate: new Date(baseToday.getTime() - 15 * 60000).toISOString(), // 15 minutes ago, actively LIVE
          status: "LIVE",
          competition: { name: "Premier League", code: "PL" },
          homeTeam: {
            name: "Manchester United FC",
            shortName: "Man United",
            crest: "https://crests.football-data.org/66.png",
          },
          awayTeam: {
            name: "Chelsea FC",
            shortName: "Chelsea",
            crest: "https://crests.football-data.org/61.png",
          },
        },
        {
          id: 600002,
          utcDate: new Date(baseToday.getTime() + 50 * 60000).toISOString(), // LIVE shortly
          status: "IN_PLAY",
          competition: { name: "La Liga", code: "PD" },
          homeTeam: {
            name: "Real Madrid CF",
            shortName: "Real Madrid",
            crest: "https://crests.football-data.org/86.png",
          },
          awayTeam: {
            name: "FC Barcelona",
            shortName: "Barcelona",
            crest: "https://crests.football-data.org/81.svg",
          },
        },
        {
          id: 600003,
          utcDate: new Date(baseToday.getTime() + 4 * 3600000).toISOString(), // Upcoming today
          status: "SCHEDULED",
          competition: { name: "Premier League", code: "PL" },
          homeTeam: {
            name: "Arsenal FC",
            shortName: "Arsenal",
            crest: "https://crests.football-data.org/57.png",
          },
          awayTeam: {
            name: "Manchester City FC",
            shortName: "Man City",
            crest: "https://crests.football-data.org/65.png",
          },
        },
        {
          id: 600004,
          utcDate: new Date(baseToday.getTime() + 24 * 3600000).toISOString(), // Tomorrow
          status: "SCHEDULED",
          competition: { name: "Serie A", code: "SA" },
          homeTeam: {
            name: "Juventus FC",
            shortName: "Juventus",
            crest: "https://crests.football-data.org/109.png",
          },
          awayTeam: {
            name: "AC Milan",
            shortName: "Milan",
            crest: "https://crests.football-data.org/98.png",
          },
        },
        {
          id: 600005,
          utcDate: new Date(baseToday.getTime() + 48 * 3600000).toISOString(), // 2 days later
          status: "SCHEDULED",
          competition: { name: "Bundesliga", code: "BL1" },
          homeTeam: {
            name: "FC Bayern München",
            shortName: "Bayern",
            crest: "https://crests.football-data.org/5.png",
          },
          awayTeam: {
            name: "Borussia Dortmund",
            shortName: "Dortmund",
            crest: "https://crests.football-data.org/4.png",
          },
        },
        {
          id: 600006,
          utcDate: new Date(baseToday.getTime() + 72 * 3600000).toISOString(), // 3 days later
          status: "SCHEDULED",
          competition: { name: "Ligue 1", code: "FL1" },
          homeTeam: {
            name: "Paris Saint-Germain FC",
            shortName: "PSG",
            crest: "https://crests.football-data.org/524.png",
          },
          awayTeam: {
            name: "Olympique de Marseille",
            shortName: "Marseille",
            crest: "https://crests.football-data.org/516.png",
          },
        },
      ];
    };

    try {
      const today = new Date();
      const fromDate = new Date();
      fromDate.setDate(today.getDate() - 3); // 3 days ago
      const toDate = new Date();
      toDate.setDate(today.getDate() + 45); // 45 days ahead — catches upcoming fixtures

      const formatDate = (d: Date) => d.toISOString().split("T")[0];
      const fromStr = formatDate(fromDate);
      const toStr = formatDate(toDate);

      const data = await getFixtures(["PL", "PD", "BL1", "FL1", "SA"], fromStr, toStr);
      if (data && Array.isArray(data.matches) && data.matches.length > 0) {
        const mappedMatches = mapMatchesToTips(data.matches);
        setMatchTips((prev) => {
          const apiIds = new Set(mappedMatches.map((m: any) => m.id));
          const filteredPrev = prev.filter(
            (item) => !apiIds.has(item.id) && !item.id.startsWith("api-tip-"),
          );
          return [...mappedMatches, ...filteredPrev];
        });
        setLiveApiStatus("connected");
      } else {
        // API returned no matches — do not fall back to simulated data
        console.warn("Football API returned no matches for the requested window.");
        setLiveApiStatus("error");
      }
    } catch (err) {
      console.warn("Failed to fetch live API matches:", err);
      setLiveApiStatus("error");
    } finally {
      setIsLiveLoading(false);
    }
  };

  // Fetch football matches on load and refresh the homepage feed when the DB changes.
  useEffect(() => {
    fetchRealTimeMatches();
    if (!isSupabaseConfigured) return;

    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const channel = supabase
      .channel("football-home-live")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "football_fixtures",
          filter: "provider=eq.espn",
        },
        () => {
          invalidateCompetitions(["PL", "PD", "BL1", "FL1", "SA"]);
          if (refreshTimer) return;
          refreshTimer = setTimeout(() => {
            refreshTimer = null;
            fetchRealTimeMatches();
          }, 250);
        },
      )
      .subscribe();

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      supabase.removeChannel(channel);
    };
  }, []);

  const [leagueLoadingStates, setLeagueLoadingStates] = useState<Record<string, boolean>>({});

  const fetchLeagueMatches = async (category: string) => {
    let competitionCode = "";
    if (category === "Espagne") competitionCode = "PD";
    else if (category === "UK") competitionCode = "PL";
    else if (category === "Italy") competitionCode = "SA";
    else if (category === "Allemagne") competitionCode = "BL1";
    else if (category === "France") competitionCode = "FL1";

    if (!competitionCode) return;

    setLeagueLoadingStates((prev) => ({ ...prev, [category]: true }));
    setIsLiveLoading(true);

    try {
      const data = await getCompetitionFixtures(competitionCode, "SCHEDULED");
      if (data && Array.isArray(data.matches)) {
        // Take the first 15 matches of the season
        const upcomingMatches = data.matches.slice(0, 15);
        const mapped = upcomingMatches.map((match: any) => {
          const matchId = match.id;
          const hash = (matchId * 23) % 27;
          const confidence = 78 + (hash % 18);

          let predictionTip = "Sare au Chini ya 2.5";
          let analysisText =
            "Timu hizi mbili zina ulinzi imara na huwa zinacheza kwa tahadhari kubwa sana.";

          if (hash % 4 === 0) {
            predictionTip = `${match.homeTeam.shortName || match.homeTeam.name} Kushinda (1)`;
            analysisText = `${match.homeTeam.shortName || match.homeTeam.name} wana kikosi chenye nguvu msimu huu na msaada mkubwa wa mashabiki wa nyumbani unawapa faida kubwa.`;
          } else if (hash % 4 === 1) {
            predictionTip = `${match.awayTeam.shortName || match.awayTeam.name} Kushinda au Sare (X2)`;
            analysisText = `${match.awayTeam.shortName || match.awayTeam.name} wana rekodi nzuri ya ugenini na safu yao ya ushambuliaji ina kasi sana kuleta madhara ya kushtukiza.`;
          } else if (hash % 4 === 2) {
            predictionTip = "Magoli Zaidi ya 2.5 (Over 2.5)";
            analysisText =
              "Hapa kuna timu zenye washambuliaji hatari. Michezo yao ya hivi karibuni ina wastani mkubwa wa magoli, tunatarajia burudani safi ya magoli.";
          } else {
            predictionTip = "Timu zote mbili kufunga (GG)";
            analysisText =
              "Timu zote mbili zina tabia ya kushambulia na kuruhusu mabao pia. GG ina nafasi kubwa hapa.";
          }

          const timeDisplay = formatSwahiliDateTime(match.utcDate);
          const normalizedStatus = String(match.status || "").toUpperCase();
          const liveStatus = ["IN_PLAY", "PAUSED", "LIVE"].includes(normalizedStatus);
          const endedStatus = ["FINISHED", "AWARDED", "ENDED", "FINAL", "FT"].includes(normalizedStatus);
          const liveHomeScore = match.score?.fullTime?.home ?? match.score?.halfTime?.home ?? null;
          const liveAwayScore = match.score?.fullTime?.away ?? match.score?.halfTime?.away ?? null;

          const homeGlow = hash % 2 === 0 ? "rgba(59, 130, 246, 0.45)" : "rgba(239, 68, 68, 0.45)";
          const awayGlow = hash % 2 === 0 ? "rgba(16, 185, 129, 0.45)" : "rgba(234, 179, 8, 0.45)";

          const oddsAvailable =
            match.odds != null &&
            Number.isFinite(Number(match.odds.home)) && Number(match.odds.home) > 1 &&
            Number.isFinite(Number(match.odds.draw)) && Number(match.odds.draw) > 1 &&
            Number.isFinite(Number(match.odds.away)) && Number(match.odds.away) > 1;
          const odds = oddsAvailable
            ? { home: Number(match.odds.home), draw: Number(match.odds.draw), away: Number(match.odds.away) }
            : { home: 0, draw: 0, away: 0 };
          const suspended = Boolean(
            match.bettingSuspendedUntil && new Date(match.bettingSuspendedUntil).getTime() > Date.now(),
          );

          return {
            id: `api-tip-${matchId}`,
            sport: "Football",
            category,
            league: match.competition.name,
            gender: "Man",
            time: timeDisplay,
            status: liveStatus ? "LIVE" : endedStatus ? "ENDED" : "UPCOMING",
            liveClock: match.displayClock ?? (match.minute != null ? `${match.minute}'` : null),
            homeScore: liveHomeScore,
            awayScore: liveAwayScore,
            score: liveHomeScore != null && liveAwayScore != null ? { home: liveHomeScore, away: liveAwayScore } : undefined,
            confidence,
            homeTeam: {
              name: match.homeTeam.shortName || match.homeTeam.name,
              bgGlow: homeGlow,
              logoUrl: match.homeTeam.crest,
            },
            awayTeam: {
              name: match.awayTeam.shortName || match.awayTeam.name,
              bgGlow: awayGlow,
              logoUrl: match.awayTeam.crest,
            },
            odds,
            oddsAvailable: oddsAvailable && !suspended,
            payoutBadge: `FBU ${(600 + hash * 35).toLocaleString()}k`,
            isPremium: hash % 3 === 0,
            isLocked: hash % 3 === 0 || suspended,
            tipster: {
              name: hash % 2 === 0 ? "Kwako Specialist" : "LaLiga Maestro",
              avatarLetter: "L",
              badge: "PRO GURU",
              isOfficial: true,
            },
            predictionTip,
            analysisText,
            realTimeApi: true,
          };
        });

        if (mapped.length > 0) {
          setMatchTips((prev) => {
            const filteredPrev = prev.filter((item) => {
              if (item.id.startsWith("api-tip-") && item.category === category) {
                return false;
              }
              return true;
            });
            return [...mapped, ...filteredPrev];
          });
          setLiveApiStatus("connected");
        }
      }
    } catch (err) {
      console.error(`Failed to fetch matches for league ${category}:`, err);
      setLiveApiStatus("error");
    } finally {
      setIsLiveLoading(false);
      setLeagueLoadingStates((prev) => ({ ...prev, [category]: false }));
    }
  };

  // Trigger league-specific fetch when selectedLeague changes to an API-supported league
  useEffect(() => {
    if (["Espagne", "UK", "Italy", "Allemagne", "France"].includes(selectedLeague)) {
      fetchLeagueMatches(selectedLeague);
    }
  }, [selectedLeague]);

  // Synchronize unlocked matches when isPro is upgraded to true
  useEffect(() => {
    if (isPro) {
      // Auto unlock all premium matches in local tips list
      setMatchTips((prev) =>
        prev.map((tip) => (tip.isPremium ? { ...tip, isLocked: false } : tip)),
      );
      setUnlockersTips((prev) =>
        prev.map((tip) => (tip.isPremium ? { ...tip, isLocked: false } : tip)),
      );
    }
  }, [isPro]);

  // Simulate an unlocker posting a tip after 12 seconds to showcase real-time updates in the For You feed
  useEffect(() => {
    const timer = setTimeout(() => {
      const simulatedTip: MatchTip = {
        id: `simulated-unlocker-${Date.now()}`,
        sport: "Football",
        category: "UK",
        league: "Premier League",
        gender: "Man",
        time: "Leo, 22:00 EAT",
        status: "UPCOMING",
        confidence: 94,
        homeTeam: { name: "Chelsea", bgGlow: "rgba(37, 99, 235, 0.4)" },
        awayTeam: { name: "Arsenal", bgGlow: "rgba(239, 68, 68, 0.4)" },
        odds: { home: 2.45, draw: 3.4, away: 2.7 },
        payoutBadge: "FBU 450k",
        isPremium: true,
        isLocked: true, // Needs unlocking or PRO Elite
        isUserCreated: true, // Set to true so it floats on the For You feed!
        tipster: {
          name: "Mtabiri_TZ",
          avatarLetter: "M",
          badge: "GOLD GURU",
          isOfficial: false,
        },
        predictionTip: "Arsenal kushinda (Away Win)",
        analysisText:
          "Arsenal wapo kwenye fomu bora ya ugenini msimu huu. Chelsea wana majeruhi wengi kwenye ulinzi.",
      };

      setMatchTips((prev) => {
        if (prev.some((tip) => tip.id.startsWith("simulated-unlocker-"))) {
          return prev;
        }
        return [simulatedTip, ...prev];
      });
      setUnlockersTips((prev) => {
        if (prev.some((tip) => tip.id.startsWith("simulated-unlocker-"))) {
          return prev;
        }
        return [simulatedTip, ...prev];
      });
    }, 12000);

    return () => clearTimeout(timer);
  }, [lang]);

  const handleAddTransaction = (
    type: "DEPOSIT" | "WITHDRAW" | "BET_PLACE" | "BET_WIN" | "UPGRADE_PRO",
    amount: number,
    description: string,
  ) => {
    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      type,
      amount,
      status: "SUCCESS",
      date: new Date().toISOString(),
      description,
    };
    setTransactions((prev) => [newTx, ...prev]);
  };

  const handleSetActiveTab = (
    tab:
      | "Home"
      | "Tipsters"
      | "Aviator"
      | "Console"
      | "Wallet"
      | "Profile"
      | "Help"
      | "Settings"
      | "Agent"
      | "Notifications"
      | "Football"
      | "Basketball"
      | "Tennis"
      | "Volleyball"
      | "Ice Hockey"
      | "Rugby"
      | "Baseball"
      | "Cricket"
      | "Handball"
      | "Boxing"
      | "Golf",
  ) => {
    if (!currentUser || !currentUser.isLoggedIn) {
      setShakeTrigger((prev) => prev + 1);
      return;
    }
    if (
      activeTab === tab &&
      !selectedPublicProfile &&
      !selectedCommentMatch &&
      !selectedCasinoGame &&
      !showProfileModal &&
      !showCartDrawer
    ) {
      return;
    }
    pushCurrentStepToHistory();
    setActiveTab(tab);
    setSelectedPublicProfile(null);
    setSelectedCommentMatch(null);
    setSelectedCasinoGame(null);
    setShowProfileModal(false);
    setShowCartDrawer(false);
  };

  const handleCartClick = () => {
    if (!currentUser || !currentUser.isLoggedIn) {
      setShakeTrigger((prev) => prev + 1);
      return;
    }
    pushCurrentStepToHistory();
    setCartMode("regular");
    setShowCartDrawer(true);
  };

  const handleHeaderUpgradeClick = () => {
    if (!currentUser || !currentUser.isLoggedIn) {
      setShakeTrigger((prev) => prev + 1);
      return;
    }
    handleSetActiveTab("Wallet");
  };

  const handleHeaderProfileClick = () => {
    if (!currentUser || !currentUser.isLoggedIn) {
      setShakeTrigger((prev) => prev + 1);
      return;
    }
    pushCurrentStepToHistory();
    setShowProfileModal(true);
  };

  // Click handler to select an Odd and manage the Shopping Cart (Kikapu)
  const handlePlaceBetClick = (
    match: MatchTip,
    oddType: "home" | "draw" | "away",
    value: number,
  ) => {
    if (!currentUser || !currentUser.isLoggedIn) {
      setShakeTrigger((prev) => prev + 1);
      return;
    }
    setCartItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.match.id === match.id);
      if (existingIndex > -1) {
        const existing = prev[existingIndex];
        if (existing.oddType === oddType) {
          const updated = prev.filter((item) => item.match.id !== match.id);
          return updated;
        } else {
          const updated = [...prev];
          updated[existingIndex] = { match, oddType, oddValue: value };
          return updated;
        }
      } else {
        return [...prev, { match, oddType, oddValue: value }];
      }
    });
  };

  // Click handler for BET NOW which clears cart and opens the single card selection in bet slip
  const handleBetNowClick = (match: MatchTip, oddType: "home" | "draw" | "away", value: number) => {
    if (!currentUser || !currentUser.isLoggedIn) {
      setShakeTrigger((prev) => prev + 1);
      return;
    }
    setCartItems([{ match, oddType, oddValue: value }]);
    setCartMode("regular");
    setShowCartDrawer(true);
  };

  // Submit and kamilisha placed bet slip (multi-bet jamvi)
  const handleCartBetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) return;

    if (userBalance < betStakeAmount) {
      addNotification("Huna salio la kutosha kukamilisha jamvi hili!", "error");
      return;
    }

    const accumulatedOdds = cartItems.reduce((sum, item) => sum * item.oddValue, 1);

    // Deduct stake from wallet balance
    setUserBalance((prev) => prev - betStakeAmount);

    // Create transaction log
    handleAddTransaction(
      "BET_PLACE",
      betStakeAmount,
      `Weka Jamvi: Mechi ${cartItems.length} zenye odds jumla x${accumulatedOdds.toFixed(2)}`,
    );

    // Clear cart and close drawer
    setCartItems([]);
    setShowCartDrawer(false);

    // Add a simple elegant in-app notification in Swahili instead of showing the modal message!
    addNotification(
      lang === "sw"
        ? "Jamvi lako limekamilika kikamilifu na kupokelewa!"
        : lang === "fr"
          ? "Votre ticket a été entièrement validé et reçu !"
          : "Your bet slip has been fully completed and received!",
      "success",
    );
  };

  const handleCreatorPublishInCart = () => {
    if (!isPro) {
      setShowCartDrawer(false);
      setActiveTab("Wallet");
      addNotification(
        lang === "sw"
          ? "Akaunti yako sio Professional! Jiunge na PRO Elite kwanza ili kuweza kuchapisha VIP kadi."
          : lang === "fr"
            ? "Votre compte n'est pas Professionnel ! Rejoignez PRO Elite d'abord pour publier des fiches VIP."
            : "Your account is not Professional! Join PRO Elite first to publish VIP cards.",
        "info",
      );
      return;
    }

    if (creatorDeposit <= 0) {
      addNotification(
        lang === "sw"
          ? "Tafadhali weka kiasi halali cha dhamana!"
          : lang === "fr"
            ? "Veuillez entrer un montant de garantie valide !"
            : "Please enter a valid deposit amount!",
        "error",
      );
      return;
    }

    if (creatorDeposit > userBalance) {
      addNotification(
        lang === "sw"
          ? `Salio Halitoshi! Salio lako ni ${userBalance.toLocaleString()} FBU lakini unajaribu kuweka dhamana ya ${creatorDeposit.toLocaleString()} FBU.`
          : lang === "fr"
            ? `Solde Insuffisant ! Votre solde est de ${userBalance.toLocaleString()} FBU mais vous essayez de déposer une garantie de ${creatorDeposit.toLocaleString()} FBU.`
            : `Insufficient Balance! Your balance is ${userBalance.toLocaleString()} FBU but you are trying to post a deposit of ${creatorDeposit.toLocaleString()} FBU.`,
        "error",
      );
      return;
    }

    if (cartIsLiabilityExceeded) {
      const errorMsg =
        lang === "sw"
          ? `Malipo ya juu ya wachezaji (Solde des Joueurs: ${cartMaxLiability.toLocaleString()} FBU) yanazidi dhamana yako ya ${creatorDeposit.toLocaleString()} FBU. Mfumo unakutaka: 1) Uongeze kiasi cha deposit, 2) Upunguze salio la wachezaji (Min Better Balance), au 3) Upunguze odds za ushindi.`
          : lang === "fr"
            ? `Le paiement maximum des joueurs (Solde des Joueurs : ${cartMaxLiability.toLocaleString()} FBU) dépasse votre dépôt de garantie de ${creatorDeposit.toLocaleString()} FBU. Le système exige : 1) Augmentez le dépôt, 2) Réduisez le solde des parieurs (Min Better Balance), ou 3) Réduisez les cotes.`
            : `Maximum players payout (Solde des Joueurs: ${cartMaxLiability.toLocaleString()} FBU) exceeds your security deposit of ${creatorDeposit.toLocaleString()} FBU. Please: 1) Increase deposit, 2) Decrease players minimum balance, or 3) Decrease win odds.`;
      setCreatorError(errorMsg);
      addNotification(
        lang === "sw"
          ? "Hasara inayoweza kutokea inazidi dhamana!"
          : lang === "fr"
            ? "La perte potentielle dépasse la garantie !"
            : "Potential loss exceeds your security deposit!",
        "error",
      );
      return;
    }

    setCreatorError(null);
    setCreatorIsLoading(true);
    setCreatorIsPublished(false);
    setCreatorPublishSeconds(30);

    const publishTimer = setInterval(() => {
      setCreatorPublishSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(publishTimer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    setTimeout(() => {
      clearInterval(publishTimer);
      setCreatorIsLoading(false);
      setCreatorIsPublished(true);

      const simulated = cartSimulatedBettersLive.map((b) => ({
        ...b,
        status: "Matched",
      }));

      setCreatorMatchedBetters(simulated);

      // Create and append user-published tip so it appears in the For You feed
      if (creatorMatch) {
        const homeName = creatorMatch.homeTeam?.name || "Home Team";
        const awayName = creatorMatch.awayTeam?.name || "Away Team";
        const pTip = creatorMatch.predictionTip || "Ushindi (FT)";

        createDatabasePost({
          profileId: profileId || currentUser?.id || "",
          content: {
            text:
              creatorMatch.analysisText ||
              "Uchambuzi wa kina kutoka kwa mtabiri wetu mkuu wa kitaalamu.",
            predictionTip: pTip,
            odds: {
              home: creatorOddHome || creatorMatch.odds?.home || 1.8,
              draw: creatorOddDraw || creatorMatch.odds?.draw || 3.2,
              away: creatorOddAway || creatorMatch.odds?.away || 2.5,
            },
            creatorDeposit,
            creatorMinBetterBalance,
          },
          postType: "match_prediction",
          match: {
            sport: creatorMatch.sport || "football",
            league: creatorMatch.league || "VIP Pro League",
            homeTeamName: homeName,
            awayTeamName: awayName,
            predictionTip: pTip,
            oddsHome: creatorOddHome || creatorMatch.odds?.home || 1.8,
            oddsDraw: creatorOddDraw || creatorMatch.odds?.draw || 3.2,
            oddsAway: creatorOddAway || creatorMatch.odds?.away || 2.5,
          },
        }).then((dbTip) => {
          const userTip: MatchTip = dbTip || {
            ...creatorMatch,
            id: `user-published-${Date.now()}`,
            time:
              lang === "sw"
                ? "Hivi sasa (LIVE)"
                : lang === "fr"
                  ? "En ce moment (LIVE)"
                  : "Just now (LIVE)",
            status: "LIVE",
            liveMinutes: "1'",
            confidence: 98,
            odds: {
              home: creatorOddHome || creatorMatch.odds?.home || 1.8,
              draw: creatorOddDraw || creatorMatch.odds?.draw || 3.2,
              away: creatorOddAway || creatorMatch.odds?.away || 2.5,
            },
            payoutBadge: `FBU ${(creatorDeposit * 1.5).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
            isPremium: true,
            isLocked: false,
            isUserCreated: true, // Tag as user-created so it bypasses empty state checks
            tipster: {
              name: currentUser?.fullName || currentUser?.username || "Mtabiri Professional",
              avatarLetter: (currentUser?.username || "M").charAt(0).toUpperCase(),
              avatarUrl: currentUser?.avatarUrl || null,
              badge: "PRO UNLOCKER",
              isOfficial: false,
            },
            predictionTip: pTip,
            analysisText:
              creatorMatch.analysisText ||
              "Uchambuzi wa kina kutoka kwa mtabiri wetu mkuu wa kitaalamu.",
          };

          setUserPublishedTips((prev) => [userTip, ...prev]);
          setMatchTips((prev) => [userTip, ...prev]);
          setUnlockersTips((prev) => [userTip, ...prev]);
        });
      }

      // Deduct immediately from wallet balance
      setUserBalance((prev) => prev - creatorDeposit);

      // Create transaction log
      handleAddTransaction(
        "BET_PLACE",
        creatorDeposit,
        lang === "sw"
          ? `Dhamana ya Kadi ya VIP: ${creatorMatch ? `${creatorMatch.homeTeam.name} vs ${creatorMatch.awayTeam.name}` : "Mechi ya VIP"}`
          : lang === "fr"
            ? `Dépôt de Fiche VIP : ${creatorMatch ? `${creatorMatch.homeTeam.name} vs ${creatorMatch.awayTeam.name}` : "Match VIP"}`
            : `VIP Card Deposit: ${creatorMatch ? `${creatorMatch.homeTeam.name} vs ${creatorMatch.awayTeam.name}` : "VIP Match"}`,
      );

      addNotification(
        lang === "sw"
          ? `Kadi ya VIP imechapishwa & Wachezaji ${cartCalculatedCount} wameunganishwa kiotomatiki!`
          : lang === "fr"
            ? `Fiche VIP publiée & ${cartCalculatedCount} Joueurs connectés automatiquement !`
            : `VIP Card published & ${cartCalculatedCount} Players connected automatically!`,
        "success",
      );
    }, 1500);
  };

  // Click handler to unlock/inspect individual premium locked dots (now opens the Creator studio inside the Shopping Cart!)
  const handleInspectLockedDotClick = (match: MatchTip) => {
    if (!currentUser || !currentUser.isLoggedIn) {
      setShakeTrigger((prev) => prev + 1);
      return;
    }
    setCreatorMatch(match);
    setCartMode("creator");
    setCreatorDeposit(50000);
    setCreatorOddHome(match.odds?.home || 5);
    setCreatorOddDraw(match.odds?.draw || 3);
    setCreatorOddAway(match.odds?.away || 4);
    setCreatorMinBetterBalance(1000);
    setCreatorMatchedBetters([]);
    setCreatorIsPublished(false);
    setCreatorError(null);
    setShowCartDrawer(true);
    addNotification(
      lang === "sw"
        ? `Njia ya pili ya kupanga odds imefunguliwa kwa ajili ya: ${match.homeTeam.name} vs ${match.awayTeam.name}!`
        : lang === "fr"
          ? `La méthode d'ajustement des cotes est ouverte pour : ${match.homeTeam.name} vs ${match.awayTeam.name} !`
          : `Odds setting mode is unlocked for: ${match.homeTeam.name} vs ${match.awayTeam.name}!`,
      "success",
    );
  };

  const handleConfirmUnlock = () => {
    if (!pendingUnlockMatch) return;

    // Security validation: verify that the user entered their account password
    // (In full production integration, cryptographic verification is processed against backend auth session)
    if (!unlockPassword || unlockPassword.trim().length === 0) {
      setUnlockPasswordError(
        lang === "sw"
          ? "Tafadhali weka neno la siri la akaunti yako!"
          : lang === "fr"
            ? "Veuillez entrer votre mot de passe de compte !"
            : "Please enter your account password!",
      );
      return;
    }

    const costToUnlock = 1500;

    if (userBalance < costToUnlock) {
      addNotification(
        lang === "sw"
          ? "Huna salio la kutosha kukamilisha muamala huu! Tafadhali weka salio au upgrade kuwa PRO Elite!"
          : lang === "fr"
            ? "Votre solde est insuffisant pour compléter cette transaction ! Veuillez recharger ou passer à PRO Elite !"
            : "You have insufficient balance to complete this transaction! Please deposit funds or upgrade to PRO Elite!",
        "error",
      );
      setPendingUnlockMatch(null);
      setActiveTab("Wallet");
      return;
    }

    setUserBalance((prev) => prev - costToUnlock);
    setUnlockedMatchIds((prev) => [...prev, pendingUnlockMatch.id]);

    // Update local tips list state to mark this specific match as unlocked in both lists
    setMatchTips((prev) =>
      prev.map((tip) => (tip.id === pendingUnlockMatch.id ? { ...tip, isLocked: false } : tip)),
    );
    setUnlockersTips((prev) =>
      prev.map((tip) => (tip.id === pendingUnlockMatch.id ? { ...tip, isLocked: false } : tip)),
    );

    handleAddTransaction(
      "BET_PLACE",
      costToUnlock,
      `Ufunguzi wa doti: ${pendingUnlockMatch.homeTeam.name} vs ${pendingUnlockMatch.awayTeam.name}`,
    );

    addNotification(
      `Hongera! Umefungua doti ya siri ya ${pendingUnlockMatch.homeTeam.name} vs ${pendingUnlockMatch.awayTeam.name} kwa mafanikio!`,
      "success",
    );
    setPendingUnlockMatch(null);
  };

  // Filters calculation logic
  const filteredTips = (activeSubTab === "Unlockers" ? unlockersTips : matchTips)
    .filter((tip) => {
      const isCategoryFilterActive =
        selectedSport !== "All" || selectedLeague !== "All" || selectedSubLeague !== "All";

      // If no category chip is selected (meaning we are on the default Home Feed view)
      if (!isCategoryFilterActive) {
        // Hide other users' posts unless the current user has unlocked/subscribed to that tipster
        const isSubscribed = subscribedTipsters.includes(tip.tipster.name);
        if (!tip.isUserCreated && !isSubscribed) {
          return false;
        }
      }

      // 1. Tab-sub filter for Unlockers
      if (activeSubTab === "Unlockers") {
        // Standard VIP posts stay in Unlockers feed (NOT Lifetime Professional)
        if (tip.tipster.isOfficial) {
          return false;
        }

        // Search bar ya Home inashughulikia profile search (SearchProfilesPanel) tu —
        // haifilteri post cards za michezo. Tips/post cards zinaonekana zote.
        return true;
      }

      // Only Lifetime Professional posts, real user-created posts, or subscribed ones visit the For You (Kwako) feed
      const isSubscribed = subscribedTipsters.includes(tip.tipster.name);
      if (!tip.tipster.isOfficial && !tip.isUserCreated && !isSubscribed) {
        return false;
      }

      // New user constraint: only see posts of first-tier professional (isOfficial) profiles, user-created ones, or subscribed ones
      const isNewUser = !currentUser || !currentUser.isLoggedIn;
      if (isNewUser) {
        if (!tip.tipster.isOfficial && !tip.isUserCreated && !isSubscribed) {
          return false;
        }
      }

      // 2. Search bar ya Home inashughulikia profile search (SearchProfilesPanel) tu —
      // haifilteri post cards za michezo. Post cards zinaonekana zote bila kujali search query.

      // 3. Sport category match
      if (selectedSport !== "All" && tip.sport.toLowerCase() !== selectedSport.toLowerCase()) {
        return false;
      }

      // 4. League sub-filter match
      if (selectedLeague !== "All") {
        if (tip.category.toLowerCase() !== selectedLeague.toLowerCase()) {
          return false;
        }
      }

      // 5. Specific tournament match
      if (selectedSubLeague !== "All") {
        if (tip.league.toLowerCase() !== selectedSubLeague.toLowerCase()) {
          return false;
        }
      }

      return true;
    })
    .map((tip) => {
      // Professional profiles of the first class automatically unlock!
      if (tip.tipster.isOfficial) {
        return {
          ...tip,
          isLocked: false,
        };
      }
      return tip;
    });

  if (showSplash) {
    return <Splash theme={theme} onComplete={() => setShowSplash(false)} />;
  }

  const selectedBets = cartItems.reduce<{ [matchId: string]: "home" | "draw" | "away" }>(
    (acc, item) => {
      acc[item.match.id] = item.oddType;
      return acc;
    },
    {},
  );

  return (
    <div
      className={`h-screen max-h-screen overflow-hidden flex justify-center selection:bg-blue-500/30 selection:text-blue-200 antialiased font-sans transition-colors duration-300 ${
        theme === "light"
          ? "bg-slate-100 text-slate-900"
          : theme === "blue"
            ? "bg-[#356289] text-white"
            : "bg-[#0a0a0a] text-slate-100"
      }`}
    >
      {/* High-end unified container: Responsive layout for both mobile mockup and expanded three-column desktop views */}
      <div className="w-full max-w-7xl mx-auto h-full flex flex-row lg:p-4 lg:gap-4 overflow-hidden relative">
        {/* ========================================================
            2. CENTRAL APP BODY (Responsive layout: max-w-xl on mobile / full center on desktop)
           ======================================================== */}
        <div
          className={`w-full max-w-xl flex flex-col h-full shadow-2xl relative overflow-hidden transition-colors duration-300 ${"mx-auto lg:mx-0 lg:max-w-none lg:flex-1 lg:rounded-2xl lg:border"} ${
            theme === "light"
              ? "bg-white border-slate-200 text-slate-900 lg:border-slate-250"
              : theme === "blue"
                ? "bg-[#1f3d5c] border-blue-400/30 text-white lg:border-blue-400/20"
                : "bg-[#141414] border-neutral-900 text-slate-100 lg:border-neutral-900/60"
          }`}
        >
          {/* Eye Comfort (Low Blue Light) Overlay (Samsung/iOS style) */}
          {eyeComfort && (
            <div className="absolute inset-0 bg-amber-600/[0.045] mix-blend-multiply pointer-events-none z-[9999] transition-all duration-500" />
          )}

          {/* Main Header Component - Only rendered on Home main feed */}
          {activeTab === "Home" && !selectedPublicProfile && !selectedCommentMatch && (
            <Header
              activeSubTab={activeSubTab}
                setActiveSubTab={setActiveSubTab}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                userBalance={userBalance}
                isPro={isPro}
                onUpgradeClick={handleHeaderUpgradeClick}
                onProfileClick={handleHeaderProfileClick}
                eyeComfort={eyeComfort}
                setEyeComfort={setEyeComfort}
                t={t}
                lang={lang}
                theme={theme}
                isLoggedIn={!!(currentUser && currentUser.isLoggedIn)}
                onLoginClick={openLogin}
                onRegisterClick={openRegister}
                shakeTrigger={shakeTrigger}
                onShakeTrigger={() => setShakeTrigger((prev) => prev + 1)}
                onNotificationsClick={() => handleSetActiveTab("Notifications")}
                unreadCount={
                  currentUser && currentUser.isLoggedIn
                    ? notificationHistory.filter((n) => !n.read).length
                    : 0
                }
                username={currentUser?.username}
                activeTab={activeTab}
                setActiveTab={handleSetActiveTab}
                selectedSport={selectedSport}
                setSelectedSport={setSelectedSport}
                setSelectedLeague={setSelectedLeague}
                setSelectedSubLeague={setSelectedSubLeague}
                selectedTopTab={selectedTopTab}
                setSelectedTopTab={setSelectedTopTab}
              />
            )}

          {/* Content routing based on active tab view */}
          <main
            className={`flex-1 no-scrollbar touch-pan-y [overscroll-behavior-y:contain] will-change-scroll ${
              activeTab === "Aviator"
                ? "overflow-hidden pb-14 lg:pb-1"
                : selectedPublicProfile || activeTab === "Profile"
                  ? "pb-2 lg:pb-4 overflow-y-auto"
                  : "pb-16 lg:pb-6 overflow-y-auto"
            }`}
            onScroll={handleMainScroll}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <Suspense
              fallback={
                activeTab === "Wallet" ? (
                  <WalletSkeleton theme={theme} />
                ) : activeTab === "Profile" ? (
                  <ProfileSkeleton theme={theme} />
                ) : activeTab === "Tipsters" ? (
                  <TipstersSkeleton theme={theme} />
                ) : activeTab === "Football" ? (
                  <FootballCountrySkeleton theme={theme} />
                ) : (
                    [
                      "Basketball",
                      "Tennis",
                      "Volleyball",
                      "Ice Hockey",
                      "Rugby",
                      "Baseball",
                      "Cricket",
                      "Handball",
                      "Boxing",
                      "Golf",
                    ] as const
                  ).includes(activeTab as any) ? (
                  <SportPageSkeleton theme={theme} />
                ) : (
                  <HomeFeedSkeleton theme={theme} />
                )
              }
            >
              {selectedPublicProfile ? (
                <PublicProfilePage
                  profile={selectedPublicProfile}
                  theme={theme}
                  onBack={goBack}
                  matchTips={matchTips}
                  currentProfileId={effectiveProfileId}
                  unlockRecords={unlockRecords}
                  businessRules={unlockBusinessRules}
                  isPro={isPro}
                  onUnlock={handleUnlockUser}
                  onCancelUnlock={handleCancelUnlock}
                  onAcceptUnlock={handleAcceptUnlock}
                  onRejectUnlock={handleRejectUnlock}
                  t={t}
                  lang={lang}
                  currentUser={currentUser}
                  onOpenComments={(match) => handleOpenComments(match)}
                  onAddNotification={addNotification}
                  onShakeTrigger={() => setShakeTrigger((prev) => prev + 1)}
                />
              ) : (
                <AnimatePresence mode="wait">
                  {activeTab === "Home" && (
                    <motion.div
                      key="home-screen"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <SearchProfilesPanel
                        query={searchQuery}
                        authUserId={null}
                        theme={theme}
                        lang={lang}
                        onSelectProfile={handleViewProfile}
                      />
                      {/* Main Match cards feed is always visible as requested */}
                      <MatchList
                        tips={filteredTips}
                        isPro={isPro}
                        activeSubTab={activeSubTab}
                        isFeedLoading={isFeedLoading}
                        selectedTopTab={selectedTopTab}
                        onViewProfile={handleViewProfile}
                        onOpenComments={(match) => handleOpenComments(match)}
                        selectedCommentMatch={selectedCommentMatch}
                        onCloseComments={goBack}
                        currentUser={currentUser}
                        lang={lang}
                        onAddNotification={addNotification}
                        onShakeTrigger={() => setShakeTrigger((prev) => prev + 1)}
                        onUpgradeClick={() => {
                          if (!currentUser || !currentUser.isLoggedIn) {
                            setShakeTrigger((prev) => prev + 1);
                            openRegister();
                          } else {
                            handleSetActiveTab("Wallet");
                          }
                        }}
                        onPlaceBetClick={handlePlaceBetClick}
                        onBetNowClick={handleBetNowClick}
                        onInspectLockedDotClick={handleInspectLockedDotClick}
                        onNavigateTab={(tab) => {
                          if (!currentUser || !currentUser.isLoggedIn) {
                            setShakeTrigger((prev) => prev + 1);
                          } else {
                            handleSetActiveTab(tab);
                          }
                        }}
                        t={t}
                        theme={theme}
                        selectedBets={selectedBets}
                        isFiltered={
                          activeSubTab !== "Unlockers" &&
                          (selectedSport !== "All" ||
                            selectedLeague !== "All" ||
                            selectedSubLeague !== "All")
                        }
                        selectedSport={selectedSport}
                        selectedLeague={selectedLeague}
                        selectedSubLeague={selectedSubLeague}
                        onResetFilters={() => {
                          setSelectedSport("All");
                          setSelectedLeague("All");
                          setSelectedSubLeague("All");
                          setSearchQuery("");
                        }}
                        isLiveLoading={isLiveLoading}
                        liveApiStatus={liveApiStatus}
                        onRefreshLiveMatches={fetchRealTimeMatches}
                        headerCategories={
                          activeSubTab !== "Unlockers" ? (
                            <div className="flex flex-col space-y-1.5 w-full">
                              {(selectedTopTab === "All" || selectedTopTab === "Sports") && (
                                <CategoryChips
                                  selectedSport={selectedSport}
                                  setSelectedSport={setSelectedSport}
                                  selectedLeague={selectedLeague}
                                  setSelectedLeague={setSelectedLeague}
                                  selectedSubLeague={selectedSubLeague}
                                  setSelectedSubLeague={setSelectedSubLeague}
                                  theme={theme}
                                  lang={lang}
                                  onSportNavigate={(sport) => {
                                    if (!currentUser || !currentUser.isLoggedIn) {
                                      setShakeTrigger((prev) => prev + 1);
                                      return;
                                    }
                                    const sportTabs = [
                                      "Football",
                                      "Basketball",
                                      "Tennis",
                                      "Volleyball",
                                      "Ice Hockey",
                                      "Rugby",
                                      "Baseball",
                                      "Cricket",
                                      "Handball",
                                      "Boxing",
                                      "Golf",
                                    ] as const;
                                    if ((sportTabs as readonly string[]).includes(sport)) {
                                      handleSetActiveTab(sport as (typeof sportTabs)[number]);
                                    }
                                  }}
                                />
                              )}
                              {(selectedTopTab === "All" || selectedTopTab === "eSports") && (
                                <EsportsRow
                                  theme={theme}
                                  lang={lang}
                                  onSelectGame={(_slug) => {
                                    // Esports games
                                  }}
                                />
                              )}
                              {(selectedTopTab === "All" || selectedTopTab === "Casino") && (
                                <CasinoRow
                                  theme={theme}
                                  lang={lang}
                                  onSelectGame={(slug) => {
                                    if (slug === "aviator") {
                                      handleSetActiveTab("Aviator");
                                      return;
                                    }
                                    const titleMap: Record<string, string> = {
                                      crystal: "Crystal",
                                      "jackpot-wheel": "Jackpot Wheel",
                                      roulette: "Roulette",
                                      baccarat: "Baccarat",
                                      slot777: "Slot777",
                                      "crystal-mine": "Crystal Mine",
                                      "provably-dice": "Dice",
                                      "plinko-pyramid": "Plinko",
                                      "western-slot": "Western Slot",
                                      crash: "Crash",
                                    };
                                    handleSelectCasinoGame({
                                      slug,
                                      title: titleMap[slug] || "Casino",
                                    });
                                  }}
                                />
                              )}
                              {(selectedTopTab === "All" || selectedTopTab === "TT Games") && (
                                <TtGamesRow
                                  theme={theme}
                                  lang={lang}
                                  onSelectOption={(_optionId) => {}}
                                />
                              )}
                            </div>
                          ) : undefined
                        }
                      />
                    </motion.div>
                  )}

                  {activeTab === "Tipsters" && (
                    <motion.div
                      key="tipsters-screen"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <TipstersList
                        t={t}
                        theme={theme}
                        isPro={isPro}
                        lang={lang}
                        currentProfileId={effectiveProfileId}
                        authUserId={authUserId}
                        businessRules={unlockBusinessRules}
                        unlockRecords={unlockRecords}
                        tipsters={supabaseTipsters}
                        pendingIncoming={unlockPendingIncoming}
                        onUnlock={handleUnlockUser}
                        onCancelUnlock={handleCancelUnlock}
                        onAcceptUnlock={handleAcceptUnlock}
                        onRejectUnlock={handleRejectUnlock}
                        onRefreshTipsters={handleRefreshTipsters}
                        onAddNotification={addNotification}
                        onBackToHome={goBack}
                        onViewProfile={handleViewProfile}
                      />
                    </motion.div>
                  )}

                  {activeTab === "Aviator" && (
                    <motion.div
                      key="aviator-screen"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                    >
                      <AviatorGame
                        userBalance={userBalance}
                        setUserBalance={setUserBalance}
                        onAddTransaction={handleAddTransaction}
                        theme={theme}
                        onAddNotification={addNotification}
                        t={t}
                        lang={lang}
                        onBackToHome={goBack}
                      />
                    </motion.div>
                  )}

                  {activeTab === "Wallet" && (
                    <motion.div
                      key="wallet-screen"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <WalletView
                        userBalance={userBalance}
                        setUserBalance={setUserBalance}
                        transactions={transactions}
                        isPro={isPro}
                        setIsPro={setIsPro}
                        isLifetime={isLifetime}
                        setIsLifetime={setIsLifetime}
                        onAddTransaction={handleAddTransaction}
                        theme={theme}
                        setTheme={setTheme}
                        onAddNotification={addNotification}
                        t={t}
                        lang={lang}
                        setLang={setLang}
                        onBackToHome={goBack}
                        currentUser={currentUser}
                        setCurrentUser={setCurrentUser}
                        onOpenAuth={() => {
                          setAuthModalMode("login");
                          setShowAuthModal(true);
                        }}
                        eyeComfort={eyeComfort}
                        setEyeComfort={setEyeComfort}
                        setShowSplash={setShowSplash}
                        setActiveTab={handleSetActiveTab}
                        setLegalSection={setLegalSection}
                        handleInstallPWA={handleInstallPWA}
                        profileId={profileId}
                      />
                    </motion.div>
                  )}

                  {activeTab === "Deposit" && (
                    <motion.div
                      key="deposit-screen"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <DepositPage
                        userBalance={userBalance}
                        setUserBalance={setUserBalance}
                        onAddTransaction={handleAddTransaction}
                        theme={theme}
                        onAddNotification={addNotification}
                        lang={lang}
                        onBack={goBack}
                        currentUser={currentUser}
                        profileId={profileId}
                      />
                    </motion.div>
                  )}

                  {activeTab === "Profile" && (
                    <motion.div
                      key="profile-screen"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ProfileView
                        currentUser={currentUser}
                        setCurrentUser={setCurrentUser}
                        userBalance={userBalance}
                        isPro={isPro}
                        setIsPro={setIsPro}
                        theme={theme}
                        onAddNotification={addNotification}
                        onOpenAuth={() => setShowAuthModal(true)}
                        transactions={transactions}
                        unlockedMatchIds={unlockedMatchIds}
                        creatorIsPublished={creatorIsPublished}
                        creatorMatchedBetters={creatorMatchedBetters}
                        creatorDeposit={creatorDeposit}
                        creatorMinBetterBalance={creatorMinBetterBalance}
                        creatorMatch={creatorMatch}
                        userPublishedTips={userPublishedTips}
                        onBackToHome={goBack}
                        t={t}
                        lang={lang}
                        subscribedTipsters={subscribedTipsters}
                        activeUnlockersCount={unlockActiveUnlockers.length}
                        activelyUnlockingCount={unlockActivelyUnlocking.length}
                        onShakeTrigger={() => setShakeTrigger((prev) => prev + 1)}
                      />
                    </motion.div>
                  )}

                  {activeTab === "Help" && (
                    <motion.div
                      key="help-screen"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <HelpView
                        theme={theme}
                        onBackToHome={goBack}
                        lang={lang}
                        onNavigateTab={handleSetActiveTab}
                        onAddNotification={addNotification}
                      />
                    </motion.div>
                  )}

                  {activeTab === "Legal" && (
                    <motion.div
                      key="legal-screen"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <LegalView
                        theme={theme}
                        onBackToHome={goBack}
                        lang={lang}
                        onAddNotification={addNotification}
                        initialSection={legalSection}
                        onNavigateTab={handleSetActiveTab}
                      />
                    </motion.div>
                  )}

                  {activeTab === "TransactionHistory" && (
                    <TransactionHistoryView
                      transactions={transactions}
                      theme={theme}
                      lang={lang}
                      onBack={() => setActiveTab("Wallet")}
                    />
                  )}

                  {activeTab === "GamblingControls" && (
                    <GamblingControlsView
                      transactions={transactions}
                      theme={theme}
                      lang={lang}
                      onBack={() => setActiveTab("Wallet")}
                      onAddNotification={addNotification}
                    />
                  )}

                  {activeTab === "Verified" && (
                    <motion.div
                      key="verified-screen"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <VerifiedView
                        theme={theme}
                        onBackToHome={goBack}
                        lang={lang}
                        currentUser={currentUser}
                        onAddNotification={addNotification}
                      />
                    </motion.div>
                  )}

                  {activeTab === "ReportProblem" && (
                    <motion.div
                      key="report-problem-screen"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <ReportProblemView
                        theme={theme}
                        onBackToHome={goBack}
                        lang={lang}
                        currentUser={currentUser}
                        onAddNotification={addNotification}
                      />
                    </motion.div>
                  )}

                  {activeTab === "Agent" && (
                    <motion.div
                      key="agent-screen"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <AgentView
                        theme={theme}
                        lang={lang}
                        currentUser={currentUser}
                        userBalance={userBalance}
                        onUpdateBalance={(amount) => setUserBalance((prev) => prev + amount)}
                        onAddTransaction={(desc, amount, type) => {
                          const txType = type === "WITHDRAWAL" ? "WITHDRAW" : "DEPOSIT";
                          handleAddTransaction(txType, Math.abs(amount), desc);
                        }}
                        onBackToHome={goBack}
                      />
                    </motion.div>
                  )}

                  {activeTab === "Notifications" && (
                    <motion.div
                      key="notifications-screen"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <NotificationsView
                        history={notificationHistory}
                        onClearAll={() => {
                          setNotificationHistory([]);
                        }}
                        onMarkAllRead={markAllNotificationsRead}
                        onBackToHome={goBack}
                        theme={theme}
                        lang={lang}
                      />
                    </motion.div>
                  )}

                  {activeTab === "Settings" && (
                    <motion.div
                      key="settings-screen"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <SettingsView
                        currentUser={currentUser}
                        setCurrentUser={setCurrentUser}
                        theme={theme}
                        onAddNotification={addNotification}
                        onOpenAuth={() => setShowAuthModal(true)}
                        onBackToHome={goBack}
                        lang={lang}
                        setLang={setLang}
                        themeState={theme}
                        setThemeState={setTheme}
                        eyeComfort={eyeComfort}
                        setEyeComfort={setEyeComfort}
                        onNavigateTab={handleSetActiveTab}
                      />
                    </motion.div>
                  )}

                  {activeTab === "Admin" && (
                    <motion.div
                      key="admin-screen"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <AdminDashboard
                        currentUser={currentUser}
                        theme={theme}
                        lang={lang}
                        onAddNotification={addNotification}
                        onBackToHome={goBack}
                      />
                    </motion.div>
                  )}

                  {activeTab === "Governance" && (
                    <motion.div
                      key="governance-screen"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <GovernancePanel
                        currentUser={currentUser}
                        theme={theme}
                        lang={lang}
                        onAddNotification={addNotification}
                        onClose={() => handleSetActiveTab("Home")}
                      />
                    </motion.div>
                  )}

                  {activeTab === "Football" && (
                    <motion.div
                      key="football-screen"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex-1 h-full"
                    >
                      <FootballPage
                        theme={theme}
                        lang={lang}
                        onBack={goBack}
                        onPlaceBet={(match, oddType, value) =>
                          handlePlaceBetClick(match, oddType, value)
                        }
                        onBetNow={(match, oddType, value) =>
                          handleBetNowClick(match, oddType, value)
                        }
                        onBuyNow={(match) => handleInspectLockedDotClick(match)}
                        selectedBets={selectedBets}
                      />
                    </motion.div>
                  )}
                  {(
                    [
                      "Basketball",
                      "Tennis",
                      "Volleyball",
                      "Ice Hockey",
                      "Rugby",
                      "Baseball",
                      "Cricket",
                      "Handball",
                      "Boxing",
                      "Golf",
                    ] as const
                  ).map((sport) =>
                    activeTab === sport ? (
                      <motion.div
                        key={`${sport}-screen`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex-1 h-full"
                      >
                        <SportPage
                          sport={sport}
                          theme={theme}
                          onBack={goBack}
                          onPlaceBet={(match, oddType, value) =>
                            handlePlaceBetClick(match, oddType, value)
                          }
                          onBetNow={(match, oddType, value) =>
                            handleBetNowClick(match, oddType, value)
                          }
                          onBuyNow={(match) => handleInspectLockedDotClick(match)}
                          selectedBets={selectedBets}
                        />
                      </motion.div>
                    ) : null,
                  )}
                </AnimatePresence>
              )}
            </Suspense>
          </main>

          {/* Floating Absolute sticky Bottom NavBar (ONLY visible on mobile/tablet when on main tabs and not on standalone subpages) */}
          {!selectedPublicProfile &&
            !selectedCommentMatch &&
            activeTab !== "Profile" &&
            activeTab !== "Deposit" &&
            activeTab !== "Help" &&
            activeTab !== "Agent" &&
            activeTab !== "Settings" &&
            activeTab !== "Admin" &&
            activeTab !== "Governance" &&
            activeTab !== "Verified" &&
            activeTab !== "Legal" &&
            activeTab !== "ReportProblem" && (
              <div className="lg:hidden">
                <BottomNavBar
                  activeTab={activeTab}
                  setActiveTab={handleSetActiveTab}
                  t={t}
                  theme={theme}
                  navRef={bottomBarRef}
                  cartCount={cartItems.length}
                  onCartClick={handleCartClick}
                  lang={lang}
                  notificationsCount={
                    currentUser && currentUser.isLoggedIn
                      ? notificationHistory.filter((n) => !n.read).length
                      : 0
                  }
                />
              </div>
            )}
        </div>

        {/* ========================================================
            3. DESKTOP RIGHT SIDEBAR (Visible only on lg+)
           ======================================================== */}
        <aside
          className={`hidden lg:flex flex-col w-80 h-full p-3.5 rounded-xl border shrink-0 justify-between overflow-y-auto no-scrollbar transition-all duration-300 ${
            theme === "light"
              ? "bg-white border-slate-200/80 text-slate-900 shadow-md"
              : theme === "blue"
                ? "bg-[#090e1a]/95 border-blue-950/80 text-slate-100 shadow-2xl"
                : "bg-[#111111] border-neutral-900 text-slate-100 shadow-2xl"
          }`}
        >
          <div className="space-y-4 flex-1 flex flex-col justify-between">
            {/* Live Bet Slip */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/10 pb-1.5">
                <div className="flex items-center space-x-1.5">
                  <ShoppingCart className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    {lang === "sw"
                      ? "Jamvi Lako"
                      : lang === "fr"
                        ? "Fiche Actuelle"
                        : "Live Bet Slip"}
                  </span>
                </div>
                {cartItems.length > 0 && (
                  <button
                    onClick={() => {
                      setCartItems([]);
                      addNotification(t.cartTitle + " " + t.clearSlip, "info");
                    }}
                    className="text-[8.5px] font-black uppercase text-rose-500 hover:underline cursor-pointer"
                  >
                    {t.clearSlip}
                  </button>
                )}
              </div>

              {cartItems.length === 0 ? (
                <div
                  className={`p-4 text-center border-2 border-dashed border-slate-200/10 dark:border-slate-800/60 rounded-lg space-y-1.5 ${
                    theme === "light" ? "bg-slate-50" : "bg-slate-950/20"
                  }`}
                >
                  <ShoppingCart className="w-5 h-5 text-slate-500/50 mx-auto stroke-1 animate-bounce" />
                  <p className="text-[9.5px] font-bold text-slate-400">{t.cartEmpty}</p>
                  <p className="text-[8.5px] text-slate-500 leading-normal">{t.cartEmptyDesc}</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {/* Selections list */}
                  <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-1 no-scrollbar">
                    {cartItems.map((item) => (
                      <div
                        key={item.match.id}
                        className={`p-1.5 rounded-lg border text-[10.5px] flex justify-between items-center transition-all ${
                          theme === "light"
                            ? "bg-slate-50/50 border-slate-200 text-slate-850 hover:bg-slate-50"
                            : theme === "blue"
                              ? "bg-[#121c33]/80 border-blue-950/80 text-slate-100 hover:border-blue-500/40 hover:bg-[#121c33]/95"
                              : "bg-[#181818] border-neutral-850 text-slate-200 hover:border-neutral-800"
                        }`}
                      >
                        <div className="space-y-0.5 flex-1 min-w-0 pr-1.5">
                          <div className="flex items-center space-x-1 text-slate-500 text-[8px] font-bold uppercase truncate">
                            <span>{item.match.league}</span>
                          </div>
                          <div className="font-black text-[10.5px] truncate text-slate-300 dark:text-slate-100">
                            {formatVirtualName(item.match.homeTeam.name)} vs{" "}
                            {formatVirtualName(item.match.awayTeam.name)}
                          </div>
                          <div className="flex items-center space-x-1 mt-0.5">
                            <span className="text-emerald-500 font-extrabold bg-emerald-500/10 border border-emerald-500/20 px-1 py-0.2 rounded text-[8.5px] uppercase">
                              {item.oddType.toUpperCase()} (x{item.oddValue.toFixed(2)})
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setCartItems((prev) =>
                              prev.filter((it) => it.match.id !== item.match.id),
                            );
                            addNotification(
                              lang === "sw"
                                ? "Uchaguzi umeondolewa"
                                : lang === "fr"
                                  ? "Sélection retirée"
                                  : "Selection removed",
                              "info",
                            );
                          }}
                          className={`p-1 rounded transition-colors cursor-pointer shrink-0 ${
                            theme === "light"
                              ? "bg-slate-100 text-slate-400 hover:text-red-500"
                              : "bg-slate-900 text-slate-550 hover:text-red-400"
                          }`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Stake input */}
                  <form
                    onSubmit={handleCartBetSubmit}
                    className="space-y-2.5 border-t border-slate-250/10 dark:border-slate-800/40 pt-2"
                  >
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-500 font-black uppercase text-[8.5px]">
                          Dau Lako (Stake FBU)
                        </span>
                        <span className="text-emerald-500 font-mono font-black">
                          FBU {userBalance.toLocaleString()}
                        </span>
                      </div>
                      <input
                        type="number"
                        value={betStakeAmount}
                        onChange={(e) =>
                          setBetStakeAmount(Math.max(500, parseInt(e.target.value) || 0))
                        }
                        className={`w-full border rounded-lg px-2.5 py-1 text-center font-mono font-black focus:outline-none text-[11px] ${
                          theme === "light"
                            ? "bg-white border-slate-200 text-slate-850 focus:border-emerald-500"
                            : "bg-slate-950 border-slate-800 text-slate-200 focus:border-emerald-500"
                        }`}
                      />
                    </div>

                    {/* Calculations summary */}
                    {(() => {
                      const accumulatedOdds = cartItems.reduce(
                        (sum, item) => sum * item.oddValue,
                        1,
                      );
                      const potentialWin = Math.floor(betStakeAmount * accumulatedOdds);
                      return (
                        <div
                          className={`p-2 rounded-lg border text-[9.5px] space-y-1 ${
                            theme === "light"
                              ? "bg-slate-50 border-slate-200"
                              : "bg-slate-950/40 border-slate-900"
                          }`}
                        >
                          <div className="flex justify-between text-slate-500">
                            <span>
                              {lang === "sw"
                                ? "Odds za Jamvi:"
                                : lang === "fr"
                                  ? "Cotes Totales:"
                                  : "Total Odds:"}
                            </span>
                            <span className="font-mono font-bold text-blue-500">
                              x{accumulatedOdds.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between font-bold text-emerald-500 border-t border-slate-250/10 pt-1">
                            <span>
                              {lang === "sw"
                                ? "Ushindi Mtarajiwa:"
                                : lang === "fr"
                                  ? "Gain Potentiel:"
                                  : "Potential Win:"}
                            </span>
                            <span className="font-mono font-black text-emerald-500">
                              FBU {potentialWin.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    <button
                      type="submit"
                      className="w-full py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-[9px] font-display font-black uppercase tracking-wider flex items-center justify-center space-x-1 cursor-pointer transition-transform duration-100 active:scale-98"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>
                        {lang === "sw"
                          ? "Weka Jamvi"
                          : lang === "fr"
                            ? "Placer le Pari"
                            : "Confirm Bet"}
                      </span>
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Top Tipsters Section */}
            <div className="space-y-2.5 pt-3 border-t border-slate-200/10 dark:border-slate-800/40">
              <div className="flex items-center justify-between">
                <span className="text-[8.5px] text-slate-500 font-black uppercase tracking-wider">
                  {lang === "sw"
                    ? "Watabiri Bora"
                    : lang === "fr"
                      ? "Top Tipsters"
                      : "Top Analysts"}
                </span>
                <button
                  onClick={() => setActiveTab("Tipsters")}
                  className="text-[8px] text-sky-500 hover:underline uppercase font-bold cursor-pointer"
                >
                  {lang === "sw" ? "Wote" : lang === "fr" ? "Tous" : "View All"}
                </button>
              </div>

              <div className="space-y-1.5">
                {TOP_TIPSTERS.slice(0, 3).map((tipster) => (
                  <div
                    key={tipster.name}
                    className={`p-1.5 rounded-lg border flex items-center justify-between text-[10px] ${
                      theme === "light"
                        ? "bg-slate-50 border-slate-200"
                        : "bg-[#181818]/60 border-neutral-850"
                    }`}
                  >
                    <div className="flex items-center space-x-1.5">
                      <div className="w-5.5 h-5.5 rounded-full bg-blue-650 text-white flex items-center justify-center text-[9px] font-bold shadow-inner">
                        {tipster.name.charAt(0)}
                      </div>
                      <div>
                        <span className="font-black block text-[10px] text-slate-700 dark:text-slate-200">
                          {tipster.name}
                        </span>
                        <span className="text-[8px] text-emerald-500 font-black uppercase">
                          {tipster.winRate}% Win Rate
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleSubscribeTipster(tipster.name)}
                      className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider transition-colors cursor-pointer ${
                        subscribedTipsters.includes(tipster.name)
                          ? "bg-slate-250 dark:bg-slate-900 text-slate-400 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-500 text-white"
                      }`}
                    >
                      {subscribedTipsters.includes(tipster.name)
                        ? lang === "sw"
                          ? "Umejiunga"
                          : "Joined"
                        : lang === "sw"
                          ? "Jiunge"
                          : "Follow"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Sliding Bottom Drawer: MULTI-SELECTION SHOPPING CART */}
      <AnimatePresence>
        {showCartDrawer && (
          <>
            {/* Overlay background */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCartDrawer(false)}
              className="fixed inset-0 bg-slate-950 z-40"
            />

            {/* Slider Checkout Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "tween", ease: [0.16, 1, 0.3, 1], duration: 0.95 }}
              className={`fixed bottom-0 inset-x-0 max-w-xl mx-auto z-50 border-t rounded-t-3xl p-4 flex flex-col h-[95vh] md:h-[95vh] space-y-3 overflow-hidden ${
                theme === "light"
                  ? "bg-white border-slate-200 text-slate-800 shadow-[0_-10px_40px_rgba(15,23,42,0.15)]"
                  : theme === "blue"
                    ? "bg-[#090e1a] border-blue-950 text-slate-100 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
                    : "bg-[#141414] border-neutral-850 text-slate-100 shadow-[0_-10px_40px_rgba(0,0,0,0.7)]"
              }`}
            >
              {/* Header */}
              <div
                className={`flex items-center justify-between border-b pb-2 ${
                  theme === "light" ? "border-slate-200" : "border-slate-800"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <ShoppingCart className="w-4 h-4 text-emerald-500" />
                  <h3
                    className={`font-display font-black text-xs uppercase tracking-wider ${
                      theme === "light" ? "text-slate-850" : "text-slate-100"
                    }`}
                  >
                    {cartMode === "creator"
                      ? t.creatorTitle
                      : `${t.cartTitle} (${cartItems.length})`}
                  </h3>
                </div>
                <div className="flex items-center space-x-1.5">
                  {cartMode === "regular" && cartItems.length > 0 && (
                    <button
                      onClick={() => {
                        setCartItems([]);
                        addNotification(t.cartTitle + " " + t.clearSlip, "info");
                      }}
                      className={`p-1 rounded transition-colors cursor-pointer flex items-center gap-1 text-[9px] font-black uppercase ${
                        theme === "light"
                          ? "bg-red-55 text-red-600 hover:bg-red-100"
                          : "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                      }`}
                      title={t.clearSlip}
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>{t.clearSlip}</span>
                    </button>
                  )}
                  <button
                    onClick={() => setShowCartDrawer(false)}
                    className={`p-1 rounded-full transition-colors cursor-pointer ${
                      theme === "light"
                        ? "bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200"
                        : "bg-slate-950 text-slate-400 hover:text-white"
                    }`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Switcher Mode */}
              <div
                className={`p-1 rounded-xl flex border ${
                  theme === "light"
                    ? "bg-slate-100 border-slate-200"
                    : "bg-slate-950/80 border-slate-900"
                }`}
              >
                <button
                  onClick={() => setCartMode("regular")}
                  className={`flex-1 py-1 text-[8.5px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center space-x-1 ${
                    cartMode === "regular"
                      ? theme === "light"
                        ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                        : "bg-slate-900 text-blue-400 border border-slate-800"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>{t.cartTitle}</span>
                </button>
                <button
                  onClick={() => {
                    setCartMode("creator");
                  }}
                  className={`flex-1 py-1 text-[8.5px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center space-x-1 ${
                    cartMode === "creator"
                      ? theme === "light"
                        ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                        : "bg-slate-900 text-amber-400 border border-slate-800"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{t.creatorModeLabel}</span>
                </button>
              </div>

              {/* Body Content depending on current mode */}
              {cartMode === "regular" ? (
                /* REGULAR MODE: SELECTIONS LIST */
                cartItems.length === 0 ? (
                  <div className="flex-1 flex flex-col justify-center items-center py-8 text-center space-y-2.5">
                    <div className="w-10 h-10 rounded-full bg-slate-500/10 flex items-center justify-center mx-auto text-slate-400 shrink-0">
                      <ShoppingCart className="w-5 h-5 stroke-1.5" />
                    </div>
                    <div className="space-y-0.5">
                      <p
                        className={`text-[11px] font-black uppercase ${theme === "light" ? "text-slate-700" : "text-slate-300"}`}
                      >
                        {t.cartEmpty}
                      </p>
                      <p className="text-[10px] text-slate-400 max-w-xs mx-auto leading-normal">
                        {t.cartEmptyDesc}
                      </p>
                    </div>
                    <button
                      onClick={() => setShowCartDrawer(false)}
                      className="px-3.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[8.5px] font-black uppercase tracking-wider transition-all cursor-pointer"
                    >
                      {t.viewTopMatches}
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Selections List (scrollable) */}
                    <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar min-h-0">
                      {cartItems.map((item) => (
                        <div
                          key={item.match.id}
                          className={`p-1.5 rounded-lg border text-[10.5px] flex justify-between items-center transition-all ${
                            theme === "light"
                              ? "bg-slate-50/50 border-slate-200 text-slate-800 hover:bg-slate-50"
                              : theme === "blue"
                                ? "bg-[#121c33]/80 border-blue-950/80 text-slate-100 hover:border-blue-500/40 hover:bg-[#121c33]/95"
                                : "bg-[#181818] border-neutral-850 text-slate-200 hover:border-neutral-800"
                          }`}
                        >
                          <div className="space-y-0.5 flex-1 min-w-0 pr-2">
                            <div className="flex items-center space-x-1 text-slate-450 text-[8.5px] font-black">
                              <span
                                className={`px-1 py-0.2 rounded text-[7px] font-black whitespace-nowrap truncate inline-block max-w-[80px] uppercase ${
                                  theme === "light"
                                    ? "bg-slate-200 text-slate-700"
                                    : "bg-slate-900 text-slate-400"
                                }`}
                              >
                                {formatVirtualName(item.match.sport)}
                              </span>
                              <span className="truncate uppercase">{item.match.league}</span>
                            </div>
                            <div className="font-black text-[10.5px] whitespace-nowrap truncate">
                              {formatVirtualName(item.match.homeTeam.name)} vs{" "}
                              {formatVirtualName(item.match.awayTeam.name)}
                            </div>
                            <div className="flex items-center space-x-1 mt-0.5">
                              <span className="text-[8.5px] text-slate-500 font-bold uppercase">
                                Chaguo:
                              </span>
                              <span className="text-emerald-500 font-black bg-emerald-500/10 border border-emerald-500/20 px-1 py-0.2 rounded text-[8.5px] uppercase">
                                {item.oddType.toUpperCase()} (x{item.oddValue.toFixed(2)})
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              setCartItems((prev) =>
                                prev.filter((it) => it.match.id !== item.match.id),
                              );
                              addNotification(
                                lang === "sw"
                                  ? "Uchaguzi umeondolewa"
                                  : lang === "fr"
                                    ? "Sélection retirée"
                                    : "Selection removed",
                                "info",
                              );
                            }}
                            className={`p-1 rounded transition-colors cursor-pointer shrink-0 ${
                              theme === "light"
                                ? "bg-slate-100 text-slate-400 hover:text-red-500 hover:bg-red-55"
                                : "bg-slate-900 text-slate-550 hover:text-red-450 hover:bg-red-500/10"
                            }`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Interactive stake inputs */}
                    <form onSubmit={handleCartBetSubmit} className="space-y-2.5 pt-0.5">
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-500 font-black uppercase text-[8.5px]">
                            Dau Lako (Stake FBU)
                          </span>
                          <span className="text-slate-450 font-mono">
                            Salio:{" "}
                            <span className="font-black">FBU {userBalance.toLocaleString()}</span>
                          </span>
                        </div>

                        {/* Quick Selection Buttons */}
                        <div className="grid grid-cols-4 gap-1.5">
                          {[1000, 2000, 5000, 10000].map((v) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => setBetStakeAmount(v)}
                              className={`py-1 rounded-lg text-[10px] font-mono font-black border transition-colors cursor-pointer ${
                                betStakeAmount === v
                                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/40 shadow-sm"
                                  : theme === "light"
                                    ? "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                    : "bg-slate-950/80 text-slate-400 border-slate-800/80"
                              }`}
                            >
                              {v.toLocaleString()}
                            </button>
                          ))}
                        </div>

                        {/* Custom Input */}
                        <input
                          id="checkout-stake-input"
                          type="number"
                          value={betStakeAmount}
                          onChange={(e) =>
                            setBetStakeAmount(Math.max(500, parseInt(e.target.value) || 0))
                          }
                          className={`w-full border rounded-lg px-3 py-1.5 text-center font-mono font-black focus:outline-none text-xs ${
                            theme === "light"
                              ? "bg-white border-slate-200 text-slate-800 focus:border-emerald-500"
                              : "bg-slate-950 border-slate-800 text-slate-200 focus:border-emerald-500"
                          }`}
                        />
                      </div>

                      {/* Calculations breakdown summary */}
                      {(() => {
                        const accumulatedOdds = cartItems.reduce(
                          (sum, item) => sum * item.oddValue,
                          1,
                        );
                        const potentialWin = Math.floor(betStakeAmount * accumulatedOdds);
                        return (
                          <div
                            className={`p-2 rounded-lg border text-[9.5px] space-y-1 ${
                              theme === "light"
                                ? "bg-slate-50 border-slate-200"
                                : "bg-slate-950/40 border-slate-900"
                            }`}
                          >
                            <div className="flex justify-between text-slate-500">
                              <span>
                                {lang === "sw"
                                  ? "Idadi ya Mechi:"
                                  : lang === "fr"
                                    ? "Nombre de Matchs:"
                                    : "Match Count:"}
                              </span>
                              <span
                                className={`font-mono font-bold ${theme === "light" ? "text-slate-800" : "text-slate-300"}`}
                              >
                                {cartItems.length}
                              </span>
                            </div>
                            <div className="flex justify-between text-slate-500">
                              <span>
                                {lang === "sw"
                                  ? "Odds za Jamvi:"
                                  : lang === "fr"
                                    ? "Cotes Totales:"
                                    : "Total Odds:"}
                              </span>
                              <span className={`font-mono font-bold text-blue-500`}>
                                x{accumulatedOdds.toFixed(2)}
                              </span>
                            </div>
                            <div
                              className={`flex justify-between font-bold text-emerald-500 border-t pt-1 ${
                                theme === "light" ? "border-slate-200" : "border-slate-900"
                              }`}
                            >
                              <span>
                                {lang === "sw"
                                  ? "Uwezekano wa Kushinda:"
                                  : lang === "fr"
                                    ? "Gain Potentiel:"
                                    : "Potential Payout:"}
                              </span>
                              <span className="font-mono text-xs font-black text-emerald-500">
                                FBU {potentialWin.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        );
                      })()}

                      <button
                        id="checkout-confirm-btn"
                        type="submit"
                        className="w-full py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-[9.5px] font-display font-black uppercase tracking-wider flex items-center justify-center space-x-1 cursor-pointer shadow-md active:scale-98 transition-all"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>
                          {lang === "sw"
                            ? "Kamilisha Jamvi SASA"
                            : lang === "fr"
                              ? "CONFIRMER LE PARI"
                              : "CONFIRM BET NOW"}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </>
                )
              ) : (
                /* CREATOR MODE: PROFESSIONAL PUBLISHER FOR SETTING ODDS */
                <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-3 min-h-0">
                  {/* Header describing selected match */}
                  <div
                    className={`p-2 rounded-lg border space-y-1 ${
                      theme === "light"
                        ? "bg-blue-50 border-blue-100"
                        : "bg-slate-950 border-slate-850"
                    }`}
                  >
                    <div className="flex justify-between items-center text-[8.5px] font-black text-slate-500 uppercase">
                      <span>Mechi Inayoundwa (Match in creation)</span>
                      <span className="text-blue-500">Professional Studio</span>
                    </div>

                    {/* Selected Match Card Display (no dropdown) */}
                    <div className="flex items-center justify-between p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-100 font-bold text-xs">
                      <div className="flex items-center space-x-2 overflow-hidden">
                        <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="truncate">
                          {creatorMatch?.homeTeam?.name || "Home"} vs {creatorMatch?.awayTeam?.name || "Away"}
                        </span>
                      </div>
                      <span className="text-[9px] px-2 py-0.5 rounded bg-blue-600/30 text-blue-200 font-mono shrink-0 ml-2">
                        {creatorMatch?.league || "VIP"}
                      </span>
                    </div>
                  </div>

                  {creatorMatch ? (
                    <>
                      {/* Inputs panel */}
                      <div className="space-y-2.5">
                        {/* 1. Deposit / Dhamana Input */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <label className="text-[8.5px] uppercase font-black text-slate-500">
                              {lang === "sw"
                                ? `Kiasi cha Dhamana (Deposit FBU) • Dhamana Halisi (-5%): ${Math.floor(creatorDeposit * 0.95).toLocaleString()} FBU`
                                : lang === "fr"
                                  ? `Montant de la Garantie (Dépôt FBU) • Réduction -5%: ${Math.floor(creatorDeposit * 0.95).toLocaleString()} FBU`
                                  : `Deposit Capital Amount (FBU) • Real Deposit (-5%): ${Math.floor(creatorDeposit * 0.95).toLocaleString()} FBU`}
                            </label>
                            <button
                              type="button"
                              onClick={() => setCreatorDeposit(userBalance)}
                              className="text-[7.5px] text-sky-500 hover:text-sky-600 font-bold underline cursor-pointer"
                            >
                              {lang === "sw"
                                ? `Tumia Salio Lote (Max: ${userBalance.toLocaleString()} FBU)`
                                : lang === "fr"
                                  ? `Tout utiliser (Max: ${userBalance.toLocaleString()} FBU)`
                                  : `Use Entire Balance (Max: ${userBalance.toLocaleString()} FBU)`}
                            </button>
                          </div>
                          <input
                            type="number"
                            value={creatorDeposit}
                            onChange={(e) =>
                              setCreatorDeposit(Math.max(1000, Number(e.target.value) || 0))
                            }
                            className={`w-full rounded-lg px-2.5 py-1 text-[11px] font-mono font-black border ${
                              theme === "light"
                                ? "bg-white border-slate-200 text-slate-800"
                                : "bg-slate-950 border-slate-850 text-slate-200"
                            }`}
                            placeholder={
                              lang === "sw"
                                ? "mf. 50000"
                                : lang === "fr"
                                  ? "ex. 50000"
                                  : "e.g. 50000"
                            }
                          />
                        </div>

                        {/* 2. Set own Odds */}
                        <div className="space-y-1">
                          <label className="text-[8.5px] uppercase font-black text-slate-500">
                            {lang === "sw"
                              ? "Jipangie Odds Zako Mwenyewe (Odds Limits)"
                              : lang === "fr"
                                ? "Ajustez vos Propres Cotes (Limites)"
                                : "Set Your Own Odds (Odds Limits)"}
                          </label>
                          <div className="grid grid-cols-3 gap-1.5">
                            <div
                              className={`p-1 px-1.5 rounded-lg border text-center ${theme === "light" ? "bg-slate-50 border-slate-200" : "bg-slate-900/40 border-slate-850"}`}
                            >
                              <span className="text-[7.5px] text-slate-500 font-bold block">
                                HOME (1)
                              </span>
                              <input
                                type="number"
                                step="0.1"
                                value={creatorOddHome}
                                onChange={(e) =>
                                  setCreatorOddHome(Math.max(1, Number(e.target.value) || 0))
                                }
                                className="w-full bg-transparent text-center font-mono text-[10px] font-black text-blue-400 focus:outline-none mt-0.5"
                              />
                            </div>
                            <div
                              className={`p-1 px-1.5 rounded-lg border text-center ${theme === "light" ? "bg-slate-50 border-slate-200" : "bg-slate-900/40 border-slate-850"}`}
                            >
                              <span className="text-[7.5px] text-slate-500 font-bold block">
                                DRAW (X)
                              </span>
                              <input
                                type="number"
                                step="0.1"
                                value={creatorOddDraw}
                                onChange={(e) =>
                                  setCreatorOddDraw(Math.max(1, Number(e.target.value) || 0))
                                }
                                className="w-full bg-transparent text-center font-mono text-[10px] font-black text-amber-400 focus:outline-none mt-0.5"
                              />
                            </div>
                            <div
                              className={`p-1 px-1.5 rounded-lg border text-center ${theme === "light" ? "bg-slate-50 border-slate-200" : "bg-slate-900/40 border-slate-850"}`}
                            >
                              <span className="text-[7.5px] text-slate-500 font-bold block">
                                AWAY (2)
                              </span>
                              <input
                                type="number"
                                step="0.1"
                                value={creatorOddAway}
                                onChange={(e) =>
                                  setCreatorOddAway(Math.max(1, Number(e.target.value) || 0))
                                }
                                className="w-full bg-transparent text-center font-mono text-[10px] font-black text-purple-400 focus:outline-none mt-0.5"
                              />
                            </div>
                          </div>
                        </div>

                        {/* 3. Better Balance Limit / Kiwango cha salio ambacho hakizidi */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <label className="text-[8.5px] uppercase font-black text-slate-500">
                              {lang === "sw"
                                ? "Salio la Wachezaji (Betters)"
                                : lang === "fr"
                                  ? "Solde des Joueurs (Parieurs)"
                                  : "Players Balance Filter (Betters)"}
                            </label>
                            <span className="text-[8px] text-blue-400 font-bold">
                              {lang === "sw"
                                ? "Wenye Pesa <"
                                : lang === "fr"
                                  ? "Avec Solde <"
                                  : "With Balance <"}{" "}
                              {creatorMinBetterBalance} FBU
                            </span>
                          </div>
                          <input
                            type="number"
                            value={creatorMinBetterBalance}
                            onChange={(e) =>
                              setCreatorMinBetterBalance(Math.max(100, Number(e.target.value) || 0))
                            }
                            className={`w-full rounded-lg px-2.5 py-1 text-[11px] font-mono font-black border ${
                              theme === "light"
                                ? "bg-white border-slate-200 text-slate-800"
                                : "bg-slate-950 border-slate-850 text-slate-200"
                            }`}
                            placeholder={
                              lang === "sw" ? "mf. 1000" : lang === "fr" ? "ex. 1000" : "e.g. 1000"
                            }
                          />
                        </div>

                        {/* Warning if liability exceeds deposit */}
                        {(creatorError || cartIsLiabilityExceeded) && (
                          <div
                            className={`p-2 rounded-lg border text-[9.5px] leading-relaxed flex items-start space-x-1.5 ${
                              theme === "light"
                                ? "bg-red-50 border-red-200 text-red-800"
                                : "bg-red-500/10 border-red-500/20 text-red-400"
                            }`}
                          >
                            <X className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold block uppercase mb-0.5">
                                {lang === "sw"
                                  ? "Dhamana Haifanikishiwi (Mtaji Hatarini) ⚠️"
                                  : lang === "fr"
                                    ? "Garantie Insuffisante (Capital à Risque) ⚠️"
                                    : "Garanty Failed (Capital At Risk) ⚠️"}
                              </span>
                              {creatorError ||
                                (lang === "sw"
                                  ? `Malipo ya juu ya wachezaji (Solde des Joueurs: ${cartMaxLiability.toLocaleString()} FBU) yanazidi kiasi cha dhamana yako ya ${creatorDeposit.toLocaleString()} FBU. Mfumo unakutaka uongeze deposit au upunguze salio la wachezaji (Min Better Balance) au odds.`
                                  : lang === "fr"
                                    ? `Le paiement maximum des joueurs (Solde des Joueurs : ${cartMaxLiability.toLocaleString()} FBU) dépasse votre dépôt de garantie de ${creatorDeposit.toLocaleString()} FBU. Le système exige que vous augmentiez le dépôt ou réduisiez le solde des parieurs/cotes.`
                                    : `Maximum players payout (Solde des Joueurs: ${cartMaxLiability.toLocaleString()} FBU) exceeds your security deposit of ${creatorDeposit.toLocaleString()} FBU. Please increase deposit or decrease players minimum balance/odds.`)}
                            </div>
                          </div>
                        )}

                        {/* Warning if deposit exceeds wallet balance */}
                        {creatorDeposit > userBalance && (
                          <div
                            className={`p-2 rounded-lg border text-[9.5px] leading-relaxed flex items-start space-x-1.5 ${
                              theme === "light"
                                ? "bg-rose-50 border-rose-200 text-rose-800"
                                : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                            }`}
                          >
                            <X className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold block uppercase mb-0.5">
                                {lang === "sw"
                                  ? "Salio Halitoshi (Insufficent Wallet Balance) ⚠️"
                                  : lang === "fr"
                                    ? "Solde Insuffisant (Solde Insuffisant) ⚠️"
                                    : "Insufficient Wallet Balance ⚠️"}
                              </span>
                              {lang === "sw" ? (
                                <>
                                  Dhamana uliyoweka ya{" "}
                                  <span className="font-mono font-bold text-rose-500">
                                    {creatorDeposit.toLocaleString()} FBU
                                  </span>{" "}
                                  inazidi salio lako la sasa ambalo ni{" "}
                                  <span className="font-mono font-bold text-emerald-500">
                                    {userBalance.toLocaleString()} FBU
                                  </span>
                                  . Tafadhali punguza dhamana au ongeza salio kwenye wallet ili
                                  kuendelea.
                                </>
                              ) : lang === "fr" ? (
                                <>
                                  Le dépôt de garantie de{" "}
                                  <span className="font-mono font-bold text-rose-500">
                                    {creatorDeposit.toLocaleString()} FBU
                                  </span>{" "}
                                  dépasse votre solde actuel qui est de{" "}
                                  <span className="font-mono font-bold text-emerald-500">
                                    {userBalance.toLocaleString()} FBU
                                  </span>
                                  . Veuillez réduire le montant de la garantie ou ajouter des fonds
                                  à votre portefeuille.
                                </>
                              ) : (
                                <>
                                  The deposit guarantee of{" "}
                                  <span className="font-mono font-bold text-rose-500">
                                    {creatorDeposit.toLocaleString()} FBU
                                  </span>{" "}
                                  exceeds your current wallet balance of{" "}
                                  <span className="font-mono font-bold text-emerald-500">
                                    {userBalance.toLocaleString()} FBU
                                  </span>
                                  . Please reduce your deposit or fund your wallet to continue.
                                </>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Post Now / Chapisha Sasa Button */}
                        <button
                          onClick={handleCreatorPublishInCart}
                          disabled={
                            creatorIsLoading ||
                            creatorDeposit > userBalance ||
                            cartIsLiabilityExceeded
                          }
                          className={`w-full py-1.5 rounded-lg font-display font-black text-[10px] uppercase tracking-wider flex items-center justify-center space-x-1 transition-all ${
                            creatorDeposit > userBalance || cartIsLiabilityExceeded
                              ? "bg-slate-300 text-slate-500 cursor-not-allowed border border-slate-400/20 opacity-60"
                              : "bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:scale-[1.01] text-slate-950 cursor-pointer shadow-md active:scale-95"
                          }`}
                        >
                          {creatorIsLoading ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-950 shrink-0" />
                              <span>
                                {lang === "sw"
                                  ? `Inakusanya na Kupanga Vitu 12... (${creatorPublishSeconds}s)`
                                  : lang === "fr"
                                    ? `Assemblage de la Carte 12 Vitu... (${creatorPublishSeconds}s)`
                                    : `Assembling 12 Components... (${creatorPublishSeconds}s)`}
                              </span>
                            </>
                          ) : creatorDeposit > userBalance ? (
                            <>
                              <X className="w-3.5 h-3.5 text-rose-500" />
                              <span>
                                {lang === "sw"
                                  ? "Imefungwa - Salio Halitoshi ⚠️"
                                  : lang === "fr"
                                    ? "Verrouillé - Solde Insuffisant ⚠️"
                                    : "Locked - Insufficient Balance ⚠️"}
                              </span>
                            </>
                          ) : cartIsLiabilityExceeded ? (
                            <>
                              <X className="w-3.5 h-3.5 text-rose-500" />
                              <span>
                                {lang === "sw"
                                  ? "Imefungwa - Dhamana Ndogo ⚠️"
                                  : lang === "fr"
                                    ? "Verrouillé - Garantie Insuffisante ⚠️"
                                    : "Locked - Low Deposit ⚠️"}
                              </span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                              <span>{t.postNow}</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Results of auto-matching simulated betters */}
                      <AnimatePresence>
                        {creatorIsPublished && !creatorIsLoading && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-2.5 border-t border-slate-800/40 pt-2.5 mt-2.5"
                          >
                            {/* Success alert banner */}
                            <div
                              className={`p-2 rounded-lg border text-[9px] leading-relaxed flex items-start space-x-1.5 ${
                                theme === "light"
                                  ? "bg-emerald-50 border-emerald-200 text-slate-800"
                                  : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                              }`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold block uppercase mb-0.5">
                                  {lang === "sw"
                                    ? "Chapisho Limefanikiwa!"
                                    : lang === "fr"
                                      ? "Publication Réussie !"
                                      : "Post Published Successfully!"}
                                </span>
                                {lang === "sw" ? (
                                  <>
                                    Kadi imewekewa dhamana ya{" "}
                                    <span className="font-bold">
                                      {creatorDeposit.toLocaleString()} FBU
                                    </span>
                                    . Mfumo wa kiotomatiki umeweka{" "}
                                    <span className="font-bold">
                                      Wachezaji {creatorMatchedBetters.length} wa VIP
                                    </span>
                                    .
                                  </>
                                ) : lang === "fr" ? (
                                  <>
                                    Carte garantie avec{" "}
                                    <span className="font-bold">
                                      {creatorDeposit.toLocaleString()} FBU
                                    </span>
                                    . Le système a automatiquement associé{" "}
                                    <span className="font-bold">
                                      {creatorMatchedBetters.length} parieurs
                                    </span>
                                    .
                                  </>
                                ) : (
                                  <>
                                    Card guaranteed with{" "}
                                    <span className="font-bold">
                                      {creatorDeposit.toLocaleString()} FBU
                                    </span>
                                    . The system automatically matched{" "}
                                    <span className="font-bold">
                                      {creatorMatchedBetters.length} players
                                    </span>
                                    .
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Statistics overview */}
                            <div className="grid grid-cols-3 gap-1.5 text-center text-[8.5px]">
                              <div
                                className={`p-1.5 rounded-lg border ${theme === "light" ? "bg-slate-50" : "bg-slate-950"}`}
                              >
                                <span className="text-slate-500 block truncate">
                                  {lang === "sw"
                                    ? "Dhamana (-5%)"
                                    : lang === "fr"
                                      ? "Dépôt Réel (-5%)"
                                      : "Real Deposit (-5%)"}
                                </span>
                                <span className="font-mono font-black text-sky-400 block truncate">
                                  {Math.floor(creatorDeposit * 0.95).toLocaleString()} FBU
                                </span>
                              </div>
                              <div
                                className={`p-1.5 rounded-lg border ${theme === "light" ? "bg-slate-50" : "bg-slate-950"}`}
                              >
                                <span className="text-slate-500 block truncate">
                                  {lang === "sw"
                                    ? "Kamisheni PRO (15%)"
                                    : lang === "fr"
                                      ? "Commission PRO (15%)"
                                      : "PRO Commission (15%)"}
                                </span>
                                <span className="font-mono font-black text-emerald-400 block truncate">
                                  +
                                  {(
                                    creatorMatchedBetters.reduce(
                                      (acc, curr) => acc + curr.stakeAmount,
                                      0,
                                    ) * 0.15
                                  ).toFixed(0)}{" "}
                                  FBU
                                </span>
                              </div>
                              <div
                                className={`p-1.5 rounded-lg border ${theme === "light" ? "bg-slate-50" : "bg-slate-950"}`}
                              >
                                <span className="text-slate-500 block truncate">
                                  {lang === "sw"
                                    ? "Jumla ya Dau"
                                    : lang === "fr"
                                      ? "Total des Mises"
                                      : "Total Stakes"}
                                </span>
                                <span className="font-mono font-black text-amber-500 block truncate">
                                  {creatorMatchedBetters
                                    .reduce((acc, curr) => acc + curr.stakeAmount, 0)
                                    .toLocaleString()}{" "}
                                  FBU
                                </span>
                              </div>
                            </div>

                            {/* List of betters */}
                            <div
                              className={`rounded-lg border p-2 space-y-1.5 ${theme === "light" ? "bg-slate-50" : "bg-slate-950/40"}`}
                            >
                              <span className="text-[8.5px] font-black uppercase text-slate-500 block">
                                Wachezaji {creatorMatchedBetters.length} Waliopangwa:
                              </span>
                              <div className="space-y-1 max-h-[90px] overflow-y-auto pr-1 no-scrollbar">
                                {creatorMatchedBetters.map((better) => (
                                  <div
                                    key={better.id}
                                    className="flex justify-between items-center text-[9px] border-b border-slate-800/10 pb-1"
                                  >
                                    <div>
                                      <span className="font-black font-mono text-slate-350">
                                        {better.username}
                                      </span>
                                      <span className="text-[8px] text-slate-500 ml-1">
                                        ({better.chosenOutcome})
                                      </span>
                                    </div>
                                    <div className="text-right font-mono">
                                      <span className="font-black text-slate-300">
                                        -{better.stakeAmount.toLocaleString()} FBU
                                      </span>
                                      <span className="text-[8px] text-emerald-500 block">
                                        Win: {better.potentialWin.toLocaleString()} FBU
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Mathematical dynamic formula disclaimer as requested */}
                            <div className="p-2 rounded-lg bg-blue-500/5 border border-blue-500/10 text-[8.5px] leading-normal text-slate-400">
                              <span className="font-black text-blue-400 uppercase block mb-0.5">
                                {lang === "sw"
                                  ? "Dhamana na Usalama wa Mtaji"
                                  : lang === "fr"
                                    ? "Garantie et Sécurité du Capital"
                                    : "Guarantee & Capital Safety"}
                              </span>
                              {lang === "sw" ? (
                                <>
                                  Ikiwa wachezaji{" "}
                                  <span className="font-bold text-slate-200">
                                    {creatorMatchedBetters.length}
                                  </span>{" "}
                                  watachagua{" "}
                                  <span className="font-bold text-slate-200">
                                    {cartHighestOutcome === "Home"
                                      ? "Home"
                                      : cartHighestOutcome === "Draw"
                                        ? "Sare (Draw)"
                                        : "Away"}
                                  </span>{" "}
                                  (<span className="font-bold text-amber-400">{cartMaxOdd}x</span>)
                                  kwa dau la{" "}
                                  <span className="font-bold text-slate-200">
                                    {creatorMinBetterBalance.toLocaleString()} FBU
                                  </span>
                                  , wakishinda watalipwa{" "}
                                  <span className="font-bold text-emerald-400">
                                    {(
                                      creatorMatchedBetters.length *
                                      creatorMinBetterBalance *
                                      cartMaxOdd
                                    ).toLocaleString()}{" "}
                                    FBU
                                  </span>
                                  . Hii inalindwa na deposit yako ya{" "}
                                  <span className="font-bold text-sky-400">
                                    {cartRealDeposit.toLocaleString()} FBU
                                  </span>
                                  .
                                </>
                              ) : lang === "fr" ? (
                                <>
                                  Si les{" "}
                                  <span className="font-bold text-slate-200">
                                    {creatorMatchedBetters.length}
                                  </span>{" "}
                                  joueurs choisissent{" "}
                                  <span className="font-bold text-slate-200">
                                    {cartHighestOutcome === "Home"
                                      ? "Domicile (Home)"
                                      : cartHighestOutcome === "Draw"
                                        ? "Nul (Draw)"
                                        : "Extérieur (Away)"}
                                  </span>{" "}
                                  (<span className="font-bold text-amber-400">{cartMaxOdd}x</span>)
                                  avec une mise de{" "}
                                  <span className="font-bold text-slate-200">
                                    {creatorMinBetterBalance.toLocaleString()} FBU
                                  </span>
                                  , en cas de victoire ils seront payés{" "}
                                  <span className="font-bold text-emerald-400">
                                    {(
                                      creatorMatchedBetters.length *
                                      creatorMinBetterBalance *
                                      cartMaxOdd
                                    ).toLocaleString()}{" "}
                                    FBU
                                  </span>
                                  . Ceci est protégé par votre dépôt de{" "}
                                  <span className="font-bold text-sky-400">
                                    {cartRealDeposit.toLocaleString()} FBU
                                  </span>
                                  .
                                </>
                              ) : (
                                <>
                                  If{" "}
                                  <span className="font-bold text-slate-200">
                                    {creatorMatchedBetters.length}
                                  </span>{" "}
                                  players select{" "}
                                  <span className="font-bold text-slate-200">
                                    {cartHighestOutcome}
                                  </span>{" "}
                                  (<span className="font-bold text-amber-400">{cartMaxOdd}x</span>)
                                  with a stake of{" "}
                                  <span className="font-bold text-slate-200">
                                    {creatorMinBetterBalance.toLocaleString()} FBU
                                  </span>
                                  , if they win they will be paid{" "}
                                  <span className="font-bold text-emerald-400">
                                    {(
                                      creatorMatchedBetters.length *
                                      creatorMinBetterBalance *
                                      cartMaxOdd
                                    ).toLocaleString()}{" "}
                                    FBU
                                  </span>
                                  . This is protected by your deposit of{" "}
                                  <span className="font-bold text-sky-400">
                                    {cartRealDeposit.toLocaleString()} FBU
                                  </span>
                                  .
                                </>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col justify-center items-center py-12 text-center space-y-3 animate-fadeIn">
                      <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto text-amber-500 shrink-0">
                        <Sparkles className="w-6 h-6 animate-pulse" />
                      </div>
                      <div className="space-y-1 px-4">
                        <p
                          className={`text-[11px] font-black uppercase ${theme === "light" ? "text-slate-700" : "text-slate-300"}`}
                        >
                          {lang === "sw"
                            ? "Hakuna Mechi Iliyochaguliwa"
                            : lang === "fr"
                              ? "Aucun Match Sélectionné"
                              : "No Match Selected"}
                        </p>
                        <p className="text-[10px] text-slate-400 leading-normal max-w-xs mx-auto">
                          {lang === "sw"
                            ? "Tafadhali chagua mechi kwenye orodha ya hapo juu ili kuanza kupanga, kujiwekea kiasi cha dhamana na odds za ushindi wa kadi yako ya VIP."
                            : lang === "fr"
                              ? "Veuillez choisir un match dans la liste ci-dessus pour commencer à configurer votre dépôt de garantie et vos cotes de gain de votre fiche VIP."
                              : "Please select a match from the list above to start configuring your guarantee deposit and winning odds for your VIP card."}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Profile Modal Drawer view */}
      <AnimatePresence>
        {showProfileModal && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProfileModal(false)}
              className="fixed inset-0 bg-slate-950 z-40"
            />

            {/* Profile Drawer */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 24, stiffness: 210 }}
              className={`fixed top-0 bottom-0 left-0 max-w-[340px] w-full z-50 border-r p-5 flex flex-col justify-between shadow-2xl transition-colors duration-300 ${
                theme === "light"
                  ? "bg-white border-slate-200 text-slate-900"
                  : "bg-slate-900 border-slate-800 text-slate-100"
              }`}
            >
              <div className="space-y-5 overflow-y-auto no-scrollbar pb-4 pr-1 text-left">
                {/* Title close */}
                <div
                  className={`flex items-center justify-between border-b pb-3 ${theme === "light" ? "border-slate-100" : "border-slate-800"}`}
                >
                  <div className="flex items-center space-x-2">
                    <TalonLogo className="w-6 h-6" glow={false} theme={theme} />
                    <span className="text-xs font-black uppercase tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-sky-400">
                      TakeTalon VIP
                    </span>
                  </div>
                  <button
                    onClick={() => setShowProfileModal(false)}
                    className={`p-1.5 rounded-xl text-slate-400 hover:text-white cursor-pointer ${theme === "light" ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "bg-slate-950"}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Redefined Localized section titles helper */}
                {(() => {
                  const sec = {
                    en: {
                      account: "Account & Balance",
                      services: "VIP Core Services",
                      settings: "Preferences & Look",
                      extras: "Support & Systems",
                    },
                    fr: {
                      account: "Compte & Solde",
                      services: "Services Principaux",
                      settings: "Préférences & Style",
                      extras: "Support & Systèmes",
                    },
                    sw: {
                      account: "Akaunti & Salio",
                      services: "Huduma za VIP",
                      settings: "Marekebisho & Lugha",
                      extras: "Mifumo & Msaada",
                    },
                  }[lang] || {
                    account: "Akaunti & Salio",
                    services: "Huduma za VIP",
                    settings: "Marekebisho & Lugha",
                    extras: "Mifumo & Msaada",
                  };

                  return (
                    <div className="space-y-5">
                      {/* 1. ACCOUNT & BALANCE SEGMENT */}
                      <div className="space-y-2.5">
                        <span className="text-[9px] font-black uppercase tracking-widest text-blue-500 block">
                          {sec.account}
                        </span>

                        {/* Profile / Login info */}
                        {currentUser && currentUser.isLoggedIn ? (
                          <button
                            onClick={() => {
                              setActiveTab("Profile");
                              setShowProfileModal(false);
                            }}
                            className={`w-full text-left p-3 rounded-xl border flex items-center space-x-3 transition-all hover:scale-[1.01] active:scale-[0.98] cursor-pointer ${
                              theme === "light"
                                ? "bg-slate-50 border-slate-200 hover:bg-slate-100"
                                : "bg-slate-950/40 border-slate-800/80 hover:bg-[#111111]/80"
                            }`}
                          >
                            <div className="w-9 h-9 rounded-full bg-blue-600/25 border border-blue-500 flex items-center justify-center font-display font-black text-blue-400 text-xs shadow-md shrink-0 overflow-hidden">
                              {currentUser.avatarUrl ? (
                                <img
                                  src={currentUser.avatarUrl}
                                  alt={currentUser.username}
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                currentUser.username.substring(0, 2).toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center space-x-1.5">
                                <h4
                                  className={`text-xs font-black truncate ${theme === "light" ? "text-slate-900" : "text-slate-100"}`}
                                >
                                  {currentUser.username}
                                </h4>
                                <span className="text-[6px] font-bold text-emerald-400 bg-emerald-400/10 px-1 py-0.5 rounded-md border border-emerald-400/20 uppercase tracking-wider shrink-0">
                                  ACTIVE
                                </span>
                              </div>
                              <p className="text-[8px] text-slate-500 truncate">
                                {currentUser.email}
                              </p>
                              <span className="text-[7.5px] font-bold text-sky-500 uppercase tracking-wider block mt-0.5">
                                {t.openProfile}
                              </span>
                            </div>
                          </button>
                        ) : (
                          <div
                            className={`p-4 rounded-xl border text-center space-y-2.5 ${
                              theme === "light"
                                ? "bg-slate-50 border-slate-200"
                                : "bg-slate-950/40 border-slate-800"
                            }`}
                          >
                            <div className="w-7 h-7 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/20 flex items-center justify-center mx-auto">
                              <User className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <h4
                                className={`text-xs font-black ${theme === "light" ? "text-slate-800" : "text-slate-250"}`}
                              >
                                Karibu TakeTalon VIP
                              </h4>
                              <p className="text-[8.5px] text-slate-500 leading-relaxed max-w-[220px] mx-auto">
                                Ingia sasa ufungue jamvi lako la doti zenye asilimia kubwa za
                                ushindi.
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                setShowProfileModal(false);
                                setActiveTab("Home");
                                setShowAuthModal(true);
                              }}
                              className="w-full py-2 bg-gradient-to-r from-blue-500 to-sky-400 text-slate-950 hover:from-blue-600 hover:to-sky-500 font-extrabold text-[9.5px] rounded-lg flex items-center justify-center space-x-1 shadow-md shadow-blue-500/10 hover:scale-[1.01] active:scale-[0.98] transition-all cursor-pointer"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Ingia / Jisajili</span>
                            </button>
                          </div>
                        )}

                        {/* Wallet Balance Widget */}
                        <div
                          className={`p-3.5 rounded-xl border flex flex-col justify-between ${
                            theme === "light"
                              ? "bg-slate-50 border-slate-200 text-slate-800"
                              : "bg-slate-950/70 border-slate-850/80 text-slate-100"
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-[8px] font-extrabold uppercase tracking-widest text-slate-500">
                              {t.balance || "SALIO LA VIP"}
                            </span>
                            <span className="text-[7.5px] font-black text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                              SECURE
                            </span>
                          </div>
                          <div className="flex items-baseline justify-between mt-1">
                            <span className="text-sm font-black font-mono text-emerald-500">
                              FBU {userBalance.toLocaleString()}
                            </span>
                            <button
                              onClick={() => {
                                setShowProfileModal(false);
                                setActiveTab("Home");
                                setActiveTab("Wallet");
                              }}
                              className="text-[9px] font-extrabold text-blue-500 hover:underline cursor-pointer bg-blue-500/10 hover:bg-blue-500/15 px-2 py-0.5 rounded-md"
                            >
                              + {t.depositBtn || "Weka Pesa"}
                            </button>
                          </div>
                        </div>

                        {/* Pro status or Upgrade card */}
                        <div
                          className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                            isPro
                              ? "border-amber-500/30 bg-amber-500/[0.03] text-amber-400"
                              : theme === "light"
                                ? "border-slate-200 bg-slate-50 text-slate-600"
                                : "border-slate-850/60 bg-[#161b26]/40 text-slate-400"
                          }`}
                        >
                          <div>
                            <p className="font-extrabold uppercase tracking-wider text-[7.5px] text-slate-500">
                              {t.proMember}
                            </p>
                            <p
                              className={`text-[10px] font-black mt-0.5 ${theme === "light" ? "text-slate-800" : "text-slate-100"}`}
                            >
                              {isPro ? t.vipStatus : t.standardStatus}
                            </p>
                          </div>
                          {!isPro && (
                            <button
                              onClick={() => {
                                setShowProfileModal(false);
                                setActiveTab("Home");
                                setActiveTab("Wallet");
                              }}
                              className="px-2.5 py-1 bg-amber-500 text-slate-950 text-[9px] font-black rounded-lg hover:scale-105 transition-transform cursor-pointer shadow-sm shadow-amber-500/15"
                            >
                              Upgrade VIP
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 2. CORE SERVICES SEGMENT */}
                      <div className="space-y-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500 block">
                          {sec.services}
                        </span>
                        <div className="grid grid-cols-2 gap-1.5">
                          {[
                            {
                              id: "home",
                              label: t.home,
                              tab: "Home" as const,
                              icon: <Home className="w-3.5 h-3.5 text-sky-400" />,
                              onClick: () => {
                                setActiveTab("Home");
                                setShowProfileModal(false);
                              },
                            },
                            {
                              id: "tipsters",
                              label: t.tipsters,
                              tab: "Tipsters" as const,
                              icon: <Users className="w-3.5 h-3.5 text-indigo-400" />,
                              onClick: () => {
                                setActiveTab("Tipsters");
                                setShowProfileModal(false);
                              },
                            },
                            {
                              id: "pwa",
                              label: lang === "sw" ? "Sakinisha PWA" : lang === "fr" ? "Installer PWA" : "Install PWA",
                              icon: <Download className="w-3.5 h-3.5 text-emerald-400" />,
                              badge: "APP",
                              onClick: () => {
                                handleInstallPWA();
                                setShowProfileModal(false);
                              },
                            },
                            {
                              id: "wallet",
                              label: t.wallet,
                              tab: "Wallet" as const,
                              icon: <Wallet className="w-3.5 h-3.5 text-emerald-400" />,
                              onClick: () => {
                                setActiveTab("Wallet");
                                setShowProfileModal(false);
                              },
                            },
                            {
                              id: "notifications",
                              label: lang === "sw" ? "Arifa" : "Alerts",
                              tab: "Notifications" as const,
                              icon: <Bell className="w-3.5 h-3.5 text-amber-400" />,
                              onClick: () => {
                                setActiveTab("Notifications");
                                setShowProfileModal(false);
                              },
                            },
                            {
                              id: "agent",
                              label: lang === "sw" ? "Wakala" : "Agent",
                              tab: "Agent" as const,
                              icon: <HandshakeIcon className="w-3.5 h-3.5 text-blue-400" />,
                              onClick: () => {
                                setActiveTab("Agent");
                                setShowProfileModal(false);
                              },
                            },
                          ].map((lnk) => (
                            <button
                              key={lnk.id}
                              onClick={lnk.onClick}
                              className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] cursor-pointer ${
                                "tab" in lnk && activeTab === lnk.tab
                                  ? theme === "light"
                                    ? "bg-blue-50 border-blue-200 text-blue-600 font-black shadow-sm"
                                    : "bg-blue-500/10 border-blue-500/20 text-sky-400 font-black shadow-inner"
                                  : theme === "light"
                                    ? "bg-slate-50 hover:bg-slate-100 border-slate-150 text-slate-700"
                                    : "bg-slate-950/40 border-slate-850 hover:bg-slate-900/60 text-slate-300"
                              }`}
                            >
                              <div className="flex items-center justify-between w-full">
                                {lnk.icon}
                                {lnk.badge && (
                                  <span className="px-1 py-0.5 rounded-md text-[6.5px] font-black uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                                    {lnk.badge}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] font-extrabold tracking-tight mt-1.5 truncate">
                                {lnk.label}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 3. PREFERENCES & STYLE SEGMENT (Languages, Themes, Eye Comfort) */}
                      <div className="space-y-2.5">
                        <span className="text-[9px] font-black uppercase tracking-widest text-amber-500 block">
                          {sec.settings}
                        </span>

                        {/* Eye Comfort Mode Switcher (Samsung / iOS styled) */}
                        <div
                          className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${theme === "light" ? "border-slate-200 bg-slate-50" : "border-slate-850 bg-slate-950/40"}`}
                        >
                          <div className="flex items-center space-x-2">
                            <div
                              className={`p-1.5 rounded-lg ${eyeComfort ? "bg-amber-500/10 text-amber-400 animate-pulse" : "bg-slate-900/40 text-slate-500"}`}
                            >
                              <EyeComfortIcon className="w-3.5 h-3.5" />
                            </div>
                            <div className="text-left">
                              <p
                                className={`font-black text-[10px] ${theme === "light" ? "text-slate-800" : "text-slate-200"}`}
                              >
                                {t.machoSalama}
                              </p>
                              <p className="text-[8px] text-slate-500">{t.machoSalamaDesc}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setEyeComfort(!eyeComfort)}
                            className={`w-9 h-4.5 rounded-full p-0.5 transition-colors duration-300 focus:outline-none cursor-pointer ${
                              eyeComfort ? "bg-amber-500" : "bg-slate-850/60"
                            }`}
                          >
                            <div
                              className={`w-3.5 h-3.5 rounded-full shadow-sm transform duration-300 ${
                                eyeComfort ? "translate-x-4 bg-white" : "translate-x-0 bg-slate-400"
                              }`}
                            />
                          </button>
                        </div>

                        {/* Visual Palette Theme Selector (Enlarged & Prominent Size) */}
                        <div
                          className={`space-y-2.5 p-3 rounded-2xl border ${theme === "light" ? "border-slate-200 bg-slate-50 shadow-xs" : "border-slate-850 bg-slate-950/40"}`}
                        >
                          <div className="flex items-center space-x-2 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                            <ColorThemeIcon className="w-4 h-4 text-sky-400" />
                            <span>{t.themeSelection || "RANGI YA MFUMO"}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 pt-0.5">
                            {[
                              {
                                code: "blue",
                                label: "Slate",
                              },
                              {
                                code: "dark",
                                label: "Dark",
                              },
                              {
                                code: "light",
                                label: "Light",
                              },
                            ].map((item) => (
                              <button
                                key={item.code}
                                onClick={() => setTheme(item.code as any)}
                                className={`py-3 px-2 rounded-xl text-center transition-all duration-200 cursor-pointer border flex flex-col items-center justify-center space-y-2 ${
                                  theme === item.code
                                    ? "bg-blue-500/15 border-blue-500 text-blue-400 font-black shadow-md shadow-blue-500/10 scale-[1.02]"
                                    : theme === "light"
                                      ? "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                                      : "bg-slate-950 border-slate-850 text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                                }`}
                              >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                                  theme === item.code
                                    ? "bg-blue-500/20 text-blue-400"
                                    : theme === "light"
                                      ? "bg-slate-100 text-slate-600"
                                      : "bg-slate-900 text-slate-400"
                                }`}>
                                  {renderThemeIcon(item.code, "w-5 h-5")}
                                </div>
                                <span className="block truncate text-[9px] font-black uppercase tracking-wider">
                                  {item.label}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* 4. EXTRAS & SUPPORT SEGMENT */}
                      <div className="space-y-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block">
                          {sec.extras}
                        </span>
                        <div className="space-y-1">
                          {/* Standard Settings link */}
                          <button
                            onClick={() => {
                              setActiveTab("Settings");
                              setShowProfileModal(false);
                            }}
                            className={`w-full text-left p-2.5 rounded-xl border border-transparent flex items-center justify-between transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] cursor-pointer ${
                              theme === "light"
                                ? "text-slate-700 hover:bg-slate-100/85 hover:border-slate-200"
                                : "text-slate-300 hover:bg-slate-950/60 hover:border-slate-850/60"
                            }`}
                          >
                            <span className="flex items-center space-x-2.5 text-[10px]">
                              <SettingsIcon className="w-3.5 h-3.5 text-blue-400" />
                              <span className="font-extrabold uppercase tracking-wide">
                                {t.settings || "Mipangilio"}
                              </span>
                            </span>
                            <ChevronRight
                              className={`w-3 h-3 ${theme === "light" ? "text-slate-400" : "text-slate-600"}`}
                            />
                          </button>

                          {/* Help Link */}
                          <button
                            onClick={() => {
                              setActiveTab("Help");
                              setShowProfileModal(false);
                            }}
                            className={`w-full text-left p-2.5 rounded-xl border border-transparent flex items-center justify-between transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] cursor-pointer ${
                              theme === "light"
                                ? "text-slate-700 hover:bg-slate-100/85 hover:border-slate-200"
                                : "text-slate-300 hover:bg-slate-950/60 hover:border-slate-850/60"
                            }`}
                          >
                            <span className="flex items-center space-x-2.5 text-[10px]">
                              <HelpQuestionIcon className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                              <span className="font-extrabold uppercase tracking-wide">
                                {t.help || "Msaada / FAQ"}
                              </span>
                            </span>
                            <ChevronRight
                              className={`w-3 h-3 ${theme === "light" ? "text-slate-400" : "text-slate-600"}`}
                            />
                          </button>

                          {/* PWA Install Button */}
                          <button
                            onClick={() => {
                              handleInstallPWA();
                              setShowProfileModal(false);
                            }}
                            className={`w-full text-left p-2.5 rounded-xl border border-transparent flex items-center justify-between transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] cursor-pointer ${
                              theme === "light"
                                ? "text-slate-700 hover:bg-slate-100/85 hover:border-slate-200"
                                : "text-slate-300 hover:bg-slate-950/60 hover:border-slate-850/60"
                            }`}
                          >
                            <span className="flex items-center space-x-2.5 text-[10px]">
                              <InstallMobileIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span className="font-extrabold uppercase tracking-wide flex items-center space-x-1">
                                <span>
                                  {lang === "sw"
                                    ? "Sakinisha Programu"
                                    : lang === "fr"
                                      ? "Installer l'Appli"
                                      : "Install App"}
                                </span>
                                <span className="inline-flex items-center text-slate-500 font-bold ml-1">
                                  (
                                  <PwaIcon className="w-5 h-5 mx-0.5 inline-block shrink-0" />
                                  )
                                </span>
                              </span>
                            </span>
                            <ChevronRight
                              className={`w-3 h-3 ${theme === "light" ? "text-slate-400" : "text-slate-600"}`}
                            />
                          </button>

                          {/* Splash screen preview button */}
                          <button
                            onClick={() => {
                              setShowSplash(true);
                              setShowProfileModal(false);
                            }}
                            className={`w-full text-left p-2.5 rounded-xl border border-dashed flex items-center justify-between transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] cursor-pointer ${
                              theme === "light"
                                ? "bg-blue-500/[0.03] border-blue-200/60 text-blue-600 hover:bg-blue-500/10"
                                : "bg-blue-500/[0.02] border-blue-500/10 text-blue-400 hover:bg-blue-500/5 hover:border-blue-500/25"
                            }`}
                          >
                            <span className="text-[10px] font-extrabold uppercase tracking-wide flex items-center space-x-2.5">
                              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                              <span>{t.showSplash || "Onyesha Splash Screen"}</span>
                            </span>
                            <ChevronRight className="w-3 h-3 text-blue-400" />
                          </button>

                          {/* Logout Option */}
                          {currentUser && currentUser.isLoggedIn && (
                            <button
                              onClick={async () => {
                                await supabase.auth.signOut();
                                setShowProfileModal(false);
                                setActiveTab("Home");
                                addNotification(t.signOutNotif, "info");
                              }}
                              className="w-full text-left p-2.5 rounded-xl bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 hover:border-rose-500/25 text-rose-400 font-extrabold flex items-center justify-between mt-2 transition-all cursor-pointer"
                            >
                              <span className="flex items-center space-x-2 text-[10px] uppercase tracking-wide">
                                <LogOut className="w-3.5 h-3.5 text-rose-500" />
                                <span>{t.signout || "Toka Kwenye Akaunti"}</span>
                              </span>
                              <ChevronRight className="w-3 h-3 text-rose-500" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Footer copyright */}
              <div
                className={`border-t pt-3.5 text-center ${theme === "light" ? "border-slate-100" : "border-slate-800"}`}
              >
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider">
                  TakeTalon VIP System
                </p>
                <p className="text-[9px] text-slate-600 mt-0.5">
                  Hakimiliki © 2026. Mchezo wa kistaarabu.
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modern Custom Unlock Match Tips Confirm Modal replace for raw window.confirm */}
      <AnimatePresence>
        {pendingUnlockMatch && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setPendingUnlockMatch(null)}
              className="fixed inset-0 bg-slate-950 z-[100]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-x-4 max-w-sm mx-auto top-[25%] z-[110]"
            >
              <div
                className={`p-5 rounded-2xl border shadow-2xl space-y-4 ${
                  theme === "light"
                    ? "bg-white border-slate-200 text-slate-800"
                    : "bg-slate-900 border-slate-800 text-slate-100"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h4
                      className={`text-sm font-black uppercase ${theme === "light" ? "text-slate-800" : "text-slate-100"}`}
                    >
                      Fungua Doti ya Siri
                    </h4>
                    <p className="text-[10px] text-slate-400">
                      Gundua utabiri uliodhibitishwa na AI
                    </p>
                  </div>
                </div>

                <div
                  className={`p-3.5 rounded-xl text-xs space-y-1 ${
                    theme === "light"
                      ? "bg-slate-50 border border-slate-200"
                      : "bg-slate-950 border border-slate-850"
                  }`}
                >
                  <p
                    className={`font-bold ${theme === "light" ? "text-slate-700" : "text-slate-200"}`}
                  >
                    {pendingUnlockMatch.homeTeam.name} vs {pendingUnlockMatch.awayTeam.name}
                  </p>
                  <p className="text-[10px] text-slate-500">Mchezo: {pendingUnlockMatch.league}</p>
                  <p className="text-[11px] text-amber-500 font-extrabold mt-1">
                    Gharama: FBU 1,500 pekee!
                  </p>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Je, una uhakika ungependa kufungua utabiri huu maalum wa dhahabu? Kiasi hiki
                  kitakatwa kutoka kwenye salio la mkoba wako.
                </p>

                <div className="space-y-1 text-left">
                  <label className="text-[9px] font-black uppercase text-slate-400 block">
                    {lang === "sw" ? "Neno la Siri la Akaunti (Password)" : "Account Password"}
                  </label>
                  <input
                    type="password"
                    value={unlockPassword}
                    onChange={(e) => {
                      setUnlockPassword(e.target.value);
                      setUnlockPasswordError("");
                    }}
                    placeholder={
                      lang === "sw"
                        ? "Weka Neno la Siri"
                        : "Enter Password"
                    }
                    className={`w-full text-xs font-semibold px-3 py-2 rounded-xl border ${
                      unlockPasswordError
                        ? "border-red-500 focus:ring-red-500 bg-red-500/5 text-red-500"
                        : theme === "light"
                          ? "bg-slate-50 border-slate-200 text-slate-850 focus:border-amber-500"
                          : "bg-slate-950 border-slate-800 text-slate-100 focus:border-amber-500"
                    } focus:outline-none focus:ring-1 focus:ring-amber-500`}
                  />
                  {unlockPasswordError && (
                    <p className="text-[9px] font-bold text-red-500 mt-0.5 animate-pulse">
                      {unlockPasswordError}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setPendingUnlockMatch(null)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      theme === "light"
                        ? "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        : "bg-slate-850 border-slate-800 text-slate-300 hover:text-white"
                    }`}
                  >
                    Ghairi
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmUnlock}
                    className="py-2 rounded-xl text-xs font-display font-black uppercase tracking-wide bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-lg shadow-amber-500/15 cursor-pointer hover:scale-[1.01] active:scale-95 transition-all"
                  >
                    Fungua Sasa
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Global floating system notifications center */}
      <div className="fixed bottom-20 left-4 right-4 max-w-sm mx-auto space-y-2 pointer-events-none z-[99999]">
        <AnimatePresence>
          {notifications.map((notif) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              transition={{ type: "tween", ease: "easeOut", duration: 0.25 }}
              className={`p-3.5 rounded-xl shadow-xl flex items-start space-x-2.5 border pointer-events-auto ${
                notif.type === "success"
                  ? "bg-emerald-950/95 border-emerald-500/40 text-emerald-300"
                  : notif.type === "error"
                    ? "bg-red-950/95 border-red-500/40 text-red-300"
                    : theme === "light"
                      ? "bg-slate-900/95 border-slate-800 text-slate-100"
                      : "bg-slate-900/95 border-slate-800 text-slate-100"
              }`}
            >
              <div className="shrink-0 pt-0.5">
                {notif.type === "success" && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                {notif.type === "error" && <X className="w-4 h-4 text-red-400" />}
                {notif.type === "info" && <Sparkles className="w-4 h-4 text-blue-400" />}
              </div>
              <div className="flex-1 text-[11px] font-bold leading-normal">{notif.message}</div>
              <button
                type="button"
                onClick={() => setNotifications((prev) => prev.filter((n) => n.id !== notif.id))}
                className="shrink-0 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Full-Screen Authentication Page (Login / Register / Forgot Password) */}
      {showAuthModal && (
        <Suspense
          fallback={
            <div
              className={`fixed inset-0 z-[60] flex items-center justify-center ${
                theme === "light"
                  ? "bg-slate-100"
                  : theme === "blue"
                    ? "bg-[#182e46]"
                    : "bg-[#0d0d0d]"
              }`}
            />
          }
        >
          <AuthPage
            isOpen={showAuthModal}
            onClose={() => {
              setShowAuthModal(false);
              goBack();
            }}
            theme={theme}
            initialMode={authModalMode}
            lang={lang}
            onAuthSuccess={async (user) => {
              const updatedUser = {
                ...user,
                isLoggedIn: true,
              };
              setCurrentUser(updatedUser);
              setShowAuthModal(false);

              // Sync live profile and wallet directly from Supabase DB
              const uAny = user as any;
              const lookupId = uAny.id || uAny.authUserId || uAny.email || uAny.username;
              if (lookupId) {
                try {
                  const res = await fetch(`/api/auth/profile-lookup?id=${encodeURIComponent(lookupId)}`);
                  if (res.ok) {
                    const data = await res.json();
                    if (data?.wallet?.available_balance !== undefined) {
                      setUserBalance(Number(data.wallet.available_balance) || 0);
                    }
                    if (data?.profile?.id) {
                      setProfileId(data.profile.id);
                    }
                  }
                } catch (e) {
                  console.warn("[App] AuthSuccess DB sync error:", e);
                }
              }
            }}
          />
        </Suspense>
      )}

      {/* Casino mini-game overlay */}
      {selectedCasinoGame && (
        <div className="fixed inset-0 z-[70] overflow-y-auto">
          <Suspense fallback={<div className="min-h-screen bg-black" />}>
            <CasinoGamePlay
              slug={selectedCasinoGame.slug}
              title={selectedCasinoGame.title}
              userBalance={userBalance}
              setUserBalance={setUserBalance}
              onAddTransaction={handleAddTransaction}
              onAddNotification={addNotification}
              onBack={() => setSelectedCasinoGame(null)}
              theme={theme}
              lang={lang}
            />
          </Suspense>
        </div>
      )}
    </div>
  );
}
