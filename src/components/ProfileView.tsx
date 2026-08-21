import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  LogOut,
  Coins,
  Award,
  Edit3,
  Save,
  RefreshCw,
  CheckCircle2,
  KeyRound,
  ArrowLeft,
  MoreVertical,
  Camera,
  Check,
  Sparkles,
  Clock,
  Unlock,
  History,
  Users,
  TrendingUp,
  Plus,
  Shield,
  Trash2,
  RotateCcw,
  Maximize2,
  X,
  ZoomIn,
  Crown,
  ChevronRight,
  Loader2,
  UploadCloud,
  AlertCircle,
} from "lucide-react";
import { processProfilePhotoUpload, type UploadStatusState } from "../lib/photoUploader";
import SettingsIcon from "./SettingsIcon";
import { INITIAL_MATCH_TIPS } from "../data";
import { INITIAL_UNLOCKERS_TIPS } from "../unlockersData";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { MatchTip } from "../types";
import { getTeamLogoUrl } from "../lib/teamLogos";
import { fetchUserDatabasePosts } from "../lib/postsService";
import MatchList, { UserCircleSingleIcon } from "./MatchList";
import GovernancePanel from "./GovernancePanel";

const formatVirtualName = (name: string) => {
  if (!name) return "";
  if (name.toLowerCase().startsWith("v-")) {
    return `v- ${name.substring(2)}`;
  }
  return name;
};

interface ProfileViewProps {
  currentUser: {
    id?: string;
    authUserId?: string;
    username: string;
    fullName?: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string | null;
    email: string;
    phone: string;
    isLoggedIn: boolean;
  } | null;
  setCurrentUser: (user: any) => void;
  userBalance: number;
  isPro: boolean;
  setIsPro: (val: boolean) => void;
  theme: "light" | "dark" | "blue";
  onAddNotification: (msg: string, type: "success" | "error" | "info") => void;
  onOpenAuth: () => void;
  transactions: any[];
  unlockedMatchIds: string[];
  creatorIsPublished: boolean;
  creatorMatchedBetters: any[];
  creatorDeposit: number;
  creatorMinBetterBalance: number;
  creatorMatch?: MatchTip | null;
  userPublishedTips?: MatchTip[];
  onBackToHome: () => void;
  t: any;
  lang: "en" | "fr" | "sw";
  subscribedTipsters?: string[];
  /** Idadi ya watu wanaokufungua (active unlockers — DB data) */
  activeUnlockersCount?: number;
  /** Idadi ya watu uliowafungua (active unlocking — DB data) */
  activelyUnlockingCount?: number;
  onShakeTrigger?: () => void;
}

export default function ProfileView({
  currentUser,
  setCurrentUser,
  userBalance,
  isPro,
  setIsPro,
  theme,
  onAddNotification,
  onOpenAuth,
  transactions = [],
  unlockedMatchIds = [],
  creatorIsPublished = false,
  creatorMatchedBetters = [],
  creatorDeposit = 0,
  creatorMinBetterBalance = 1000,
  creatorMatch,
  userPublishedTips = [],
  onBackToHome,
  t,
  lang,
  subscribedTipsters = [],
  activeUnlockersCount = 0,
  activelyUnlockingCount,
  onShakeTrigger,
}: ProfileViewProps) {
  // Local edit states
  const [fullName, setFullName] = useState<string>(() => {
    return (
      currentUser?.fullName ||
      [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(" ") ||
      currentUser?.username ||
      ""
    );
  });
  const [username, setUsername] = useState(currentUser?.username || "");
  const [email, setEmail] = useState(currentUser?.email || "");
  const [phone, setPhone] = useState(currentUser?.phone || "");
  const [infoLoading, setInfoLoading] = useState(false);

  // Security password states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showPass, setShowPass] = useState({ current: false, new: false, confirm: false });
  const [securityLoading, setSecurityLoading] = useState(false);

  // Interactive three-dots menu state
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);

  // Profile image state (synced with Supabase profiles.avatar_url & profile_photos)
  const [profileImage, setProfileImage] = useState<string | null>(currentUser?.avatarUrl || null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [dbPublishedTips, setDbPublishedTips] = useState<MatchTip[]>([]);
  const [isPostsLoading, setIsPostsLoading] = useState(false);

  // Profile Photo DB states
  const [activePhotos, setActivePhotos] = useState<any[]>([]);
  const [deletedPhotos, setDeletedPhotos] = useState<any[]>([]);
  const [isPhotoLoading, setIsPhotoLoading] = useState(false);
  const [isFirstProfile, setIsFirstProfile] = useState(false);
  const [photoSubTab, setPhotoSubTab] = useState<"active" | "deleted">("active");
  const [showGovernanceModal, setShowGovernanceModal] = useState(false);

  const userKey = currentUser?.id || currentUser?.authUserId || currentUser?.username || "me";

  const safeParseJsonResponse = async (res: Response) => {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return {
        ok: false,
        message:
          res.status === 413
            ? lang === "sw"
              ? "Picha ni kubwa mno kuwasilishwa."
              : "Photo payload is too large."
            : res.statusText || `Server error (${res.status})`,
      };
    }
  };

  // Fetch photo history directly from database server
  const fetchProfilePhotosFromDatabase = React.useCallback(async () => {
    const key = currentUser?.id || currentUser?.authUserId || currentUser?.username;
    if (!key) return;
    setIsPhotoLoading(true);
    try {
      const res = await fetch(`/api/profile-photo/history?user_id=${encodeURIComponent(key)}`);
      const data = await safeParseJsonResponse(res);
      if (res.ok && data.ok) {
        setActivePhotos(data.activePhotos || []);
        setDeletedPhotos(data.deletedPhotos || []);
        setIsFirstProfile(!!data.is_first_profile);

        if (data.current_avatar_url) {
          setProfileImage(data.current_avatar_url);
          if (currentUser && currentUser.avatarUrl !== data.current_avatar_url) {
            const updatedUser = { ...currentUser, avatarUrl: data.current_avatar_url };
            setCurrentUser(updatedUser);
          }
        }
      }
    } catch (e) {
      console.warn("Failed to fetch photo history from backend:", e);
    } finally {
      setIsPhotoLoading(false);
    }
  }, [currentUser, setCurrentUser]);

  useEffect(() => {
    if (currentUser?.id || currentUser?.authUserId || currentUser?.username) {
      fetchProfilePhotosFromDatabase();
    }
  }, [currentUser?.id, currentUser?.authUserId, currentUser?.username]);

  // Tabs for history / posts / photo management
  const [activeHistoryTab, setActiveHistoryTab] = useState<"tickets" | "photo" | "posts">(
    "tickets",
  );

  // Load user posts directly from Supabase DB
  useEffect(() => {
    if (activeHistoryTab === "posts" && currentUser?.id) {
      setIsPostsLoading(true);
      fetchUserDatabasePosts(currentUser.id)
        .then((tips) => {
          setDbPublishedTips(tips);
        })
        .finally(() => {
          setIsPostsLoading(false);
        });
    }
  }, [activeHistoryTab, currentUser?.id]);

  const avatars = [
    { id: 1, label: "🦁 Simba" },
    { id: 2, label: "🦅 Kipanga" },
    { id: 3, label: "🔥 Moto" },
    { id: 4, label: "💎 Almasi" },
  ];

  // Update input states when currentUser changes
  useEffect(() => {
    if (currentUser) {
      setUsername(currentUser.username);
      setEmail(currentUser.email);
      setPhone(currentUser.phone);
      const derivedFull =
        currentUser.fullName ||
        [currentUser.firstName, currentUser.lastName].filter(Boolean).join(" ") ||
        currentUser.username ||
        "";
      setFullName(derivedFull);
    }
  }, [currentUser]);

  // Helper function to compress & optimize images up to 40MB before uploading
  const compressAndOptimizeImage = (file: File, maxDimension = 800, quality = 0.85): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = () => reject(new Error("Failed to load image"));
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
          resolve(compressedDataUrl);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const [uploadStatus, setUploadStatus] = useState<UploadStatusState | null>(null);

  // Handle avatar upload with instant local preview, compression, IndexedDB offline resilience & Supabase Storage
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const key = currentUser?.id || currentUser?.authUserId || currentUser?.username;
    if (!key) {
      onAddNotification(
        lang === "sw" ? "Tafadhali ingia kwenye akaunti kwanza!" : "Please login first!",
        "error"
      );
      return;
    }

    // Safety: retain previous photo reference in case of unrecoverable failure
    const previousPhoto = profileImage;
    setIsPhotoLoading(true);

    try {
      const result = await processProfilePhotoUpload(file, key, (statusInfo) => {
        setUploadStatus(statusInfo);

        // Immediate memory object preview update
        if (statusInfo.previewUrl) {
          setProfileImage(statusInfo.previewUrl);
        }

        if (statusInfo.avatarUrl) {
          setProfileImage(statusInfo.avatarUrl);
          const updatedUser = {
            ...currentUser,
            avatarUrl: statusInfo.avatarUrl,
            avatar_url: statusInfo.avatarUrl,
          };
          setCurrentUser(updatedUser);
        }
      });

      if (result.ok && result.avatarUrl) {
        setProfileImage(result.avatarUrl);
        const updatedUser = {
          ...currentUser,
          avatarUrl: result.avatarUrl,
          avatar_url: result.avatarUrl,
        };
        setCurrentUser(updatedUser);

        // Update Supabase profile directly if configured
        if (isSupabaseConfigured && (currentUser?.id || currentUser?.authUserId || currentUser?.username)) {
          try {
            const targetId = currentUser.id || currentUser.authUserId || currentUser.username;
            if (targetId) {
              const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId);
              let profQuery = supabase.from("profiles").update({ avatar_url: result.avatarUrl });
              if (isUuid) {
                profQuery = profQuery.or(`id.eq.${targetId},auth_user_id.eq.${targetId}`);
              } else {
                profQuery = profQuery.eq("username", targetId);
              }
              await profQuery;
            }
          } catch (dbErr) {
            console.warn("Direct Supabase avatar update error:", dbErr);
          }
        }

        await fetchProfilePhotosFromDatabase();

        onAddNotification(
          result.message || (lang === "sw" ? "Picha ya wasifu imewasilishwa kwa ufanisi! 📸" : "Profile photo saved! 📸"),
          "success"
        );
      } else if (result.message) {
        onAddNotification(result.message, "info");
      }
    } catch (err) {
      console.error("Avatar upload error:", err);
      setProfileImage(previousPhoto);
      onAddNotification(
        lang === "sw" ? "Hitilafu wakati wa kuwasilisha picha." : "Error uploading photo.",
        "error"
      );
    } finally {
      setIsPhotoLoading(false);
      // Auto-hide status badge after 4s
      setTimeout(() => setUploadStatus(null), 4000);
    }
  };

  // Switch active profile avatar to a previously uploaded photo from history
  const handleSelectHistoryPhoto = async (photoId: string) => {
    const key = currentUser?.id || currentUser?.authUserId || currentUser?.username;
    if (!key) return;

    setIsPhotoLoading(true);
    try {
      const res = await fetch("/api/profile-photo/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: key,
          photo_id: photoId,
        }),
      });

      const data = await safeParseJsonResponse(res);
      if (!res.ok || !data.ok) {
        onAddNotification(
          data.message || (lang === "sw" ? "Imefeli kubadilisha picha." : "Failed to switch photo."),
          "error"
        );
        return;
      }

      const selectedAvatarUrl = data.avatar_url;
      setProfileImage(selectedAvatarUrl);
      const updatedUser = { ...currentUser, avatarUrl: selectedAvatarUrl, avatar_url: selectedAvatarUrl };
      setCurrentUser(updatedUser);

      if (isSupabaseConfigured && (currentUser?.id || currentUser?.authUserId || currentUser?.username)) {
        try {
          const targetId = currentUser.id || currentUser.authUserId || currentUser.username;
          if (targetId) {
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId);
            let profQuery = supabase.from("profiles").update({ avatar_url: selectedAvatarUrl });
            if (isUuid) {
              profQuery = profQuery.or(`id.eq.${targetId},auth_user_id.eq.${targetId}`);
            } else {
              profQuery = profQuery.eq("username", targetId);
            }
            await profQuery;
          }
        } catch (dbErr) {
          console.warn("Direct Supabase avatar update error:", dbErr);
        }
      }

      await fetchProfilePhotosFromDatabase();

      onAddNotification(
        data.message || (lang === "sw" ? "Picha ya wasifu imebadilishwa! 📸" : "Photo switched! 📸"),
        "success"
      );
    } catch (err) {
      console.error("Switch photo error:", err);
      onAddNotification(
        lang === "sw" ? "Hitilafu wakati wa kubadilisha picha." : "Error switching photo.",
        "error"
      );
    } finally {
      setIsPhotoLoading(false);
    }
  };

  // Soft delete photo item (0 FBu, free)
  const handleDeleteHistoryPhoto = async (photoId: string) => {
    const key = currentUser?.id || currentUser?.authUserId || currentUser?.username;
    if (!key) return;

    setIsPhotoLoading(true);
    try {
      const res = await fetch("/api/profile-photo/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: key,
          photo_id: photoId,
        }),
      });

      const data = await safeParseJsonResponse(res);
      if (!res.ok || !data.ok) {
        onAddNotification(
          data.message || (lang === "sw" ? "Imefeli kufuta picha." : "Failed to delete photo."),
          "error",
        );
        return;
      }

      if (data.new_avatar_url !== undefined) {
        setProfileImage(data.new_avatar_url);
        const updatedUser = { ...currentUser, avatarUrl: data.new_avatar_url };
        setCurrentUser(updatedUser);
      }

      await fetchProfilePhotosFromDatabase();

      onAddNotification(
        data.message || (lang === "sw" ? "Picha imeondolewa kikamilifu." : "Photo deleted."),
        "info",
      );
    } catch (err) {
      console.error("Delete photo error:", err);
      onAddNotification(
        lang === "sw" ? "Hitilafu wakati wa kufuta picha." : "Error deleting photo.",
        "error",
      );
    } finally {
      setIsPhotoLoading(false);
    }
  };

  // Restore soft-deleted photo (0 FBu, free)
  const handleRestorePhoto = async (photoId: string) => {
    const key = currentUser?.id || currentUser?.authUserId || currentUser?.username;
    if (!key) return;

    setIsPhotoLoading(true);
    try {
      const res = await fetch("/api/profile-photo/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: key,
          photo_id: photoId,
        }),
      });

      const data = await safeParseJsonResponse(res);
      if (!res.ok || !data.ok) {
        onAddNotification(
          data.message || (lang === "sw" ? "Imefeli kurejesha picha." : "Failed to restore photo."),
          "error",
        );
        return;
      }

      await fetchProfilePhotosFromDatabase();

      onAddNotification(
        data.message || (lang === "sw" ? "Picha imerejeshwa kwenye historia yako! 📸" : "Photo restored! 📸"),
        "success",
      );
    } catch (err) {
      console.error("Restore photo error:", err);
      onAddNotification(
        lang === "sw" ? "Hitilafu wakati wa kurejesha picha." : "Error restoring photo.",
        "error",
      );
    } finally {
      setIsPhotoLoading(false);
    }
  };

  const handleUpdateInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.isLoggedIn) {
      onAddNotification(
        lang === "sw"
          ? "Tafadhali ingia kwenye akaunti kwanza!"
          : lang === "fr"
            ? "Veuillez vous connecter d'abord !"
            : "Please log in first!",
        "error",
      );
      return;
    }
    if (!username || !email || !phone) {
      onAddNotification(
        lang === "sw"
          ? "Nyanja zote lazima zijazwe!"
          : lang === "fr"
            ? "Tous les champs sont obligatoires !"
            : "All fields are required!",
        "error",
      );
      return;
    }

    setInfoLoading(true);
    setTimeout(async () => {
      setInfoLoading(false);
      const nameParts = (fullName || username).trim().split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      const updatedUser = {
        ...currentUser,
        fullName: fullName || username,
        firstName,
        lastName,
        username,
        email,
        phone,
      };
      setCurrentUser(updatedUser);

      // Sync with Supabase profiles table if available
      if (currentUser?.id) {
        try {
          await supabase
            .from("profiles")
            .update({
              username,
              first_name: firstName,
              last_name: lastName,
              email,
            })
            .eq("auth_user_id", currentUser.id);
        } catch (err) {
          console.warn("[PROFILE] Supabase profile update sync error:", err);
        }
      }

      onAddNotification(
        lang === "sw"
          ? "Maelezo yako ya wasifu yamehifadhiwa kwa ufanisi!"
          : lang === "fr"
            ? "Détails de profil enregistrés avec succès !"
            : "Profile details saved successfully!",
        "success",
      );
    }, 1000);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.isLoggedIn) {
      onAddNotification(
        lang === "sw"
          ? "Tafadhali ingia kwenye akaunti kwanza!"
          : lang === "fr"
            ? "Veuillez vous connecter d'abord !"
            : "Please log in first!",
        "error",
      );
      return;
    }
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      onAddNotification(
        lang === "sw"
          ? "Tafadhali jaza nyanja zote za nywila!"
          : lang === "fr"
            ? "Veuillez remplir tous les champs de mot de passe !"
            : "Please fill in all password fields!",
        "error",
      );
      return;
    }
    if (newPassword.length < 5) {
      onAddNotification(
        lang === "sw"
          ? "Nywila mpya lazima iwe na angalau herufi 5!"
          : lang === "fr"
            ? "Le nouveau mot de passe doit comporter au moins 5 caractères !"
            : "New password must be at least 5 characters long!",
        "error",
      );
      return;
    }
    if (newPassword !== confirmNewPassword) {
      onAddNotification(
        lang === "sw"
          ? "Nywila mpya ulizoweka hazifanani! Hakiki tena."
          : lang === "fr"
            ? "Les nouveaux mots de passe ne correspondent pas ! Réessayez."
            : "New passwords do not match! Please check again.",
        "error",
      );
      return;
    }

    setSecurityLoading(true);
    setTimeout(() => {
      setSecurityLoading(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      onAddNotification(
        lang === "sw"
          ? "Nywila yako imebadilishwa salama!"
          : lang === "fr"
            ? "Votre mot de passe a été modifié avec succès !"
            : "Your password has been changed securely!",
        "success",
      );
    }, 1500);
  };

  const handleUpgradeToPro = () => {
    setIsPro(true);
    setShowMenuDropdown(false);
    onAddNotification(
      lang === "sw"
        ? "Hongera! Umefanikiwa kuwa Mchambuzi wa VIP PRO! 🌟"
        : lang === "fr"
          ? "Félicitations ! Vous êtes maintenant un Pronostiqueur VIP PRO ! 🌟"
          : "Congratulations! You have successfully become a VIP PRO Analyst! 🌟",
      "success",
    );
  };

  const handleLogout = async () => {
    // Rudi Home MARA MOJA kabla ya kitu kingine chochote
    onBackToHome();
    try {
      const { supabase } = await import("../lib/supabase");
      await supabase.auth.signOut();
    } catch {
      // puuza — tunaendelea kufuta hali ya ndani
    }
    setCurrentUser(null);
    setProfileImage(null);
    onAddNotification(
      lang === "sw"
        ? "Umetoka kwenye akaunti kwa usalama. Karibu tena!"
        : lang === "fr"
          ? "Déconnexion réussie. À bientôt !"
          : "Logged out safely. Welcome back anytime!",
      "info",
    );
  };

  // Resolve unlocked matches info from system data (both static and unlockers tips)
  const unlockedMatches = [...INITIAL_MATCH_TIPS, ...INITIAL_UNLOCKERS_TIPS].filter((tip) =>
    unlockedMatchIds.includes(tip.id),
  );

  // Theme support helpers for optimal accessibility contrast in Light mode
  const isLight = theme === "light";
  const labelColor = isLight ? "text-slate-700 font-bold" : "text-slate-400";
  const descColor = isLight ? "text-slate-600 font-medium" : "text-slate-500";
  const titleColor = isLight ? "text-slate-900" : "text-slate-100";
  const borderSubtle = isLight ? "border-slate-300" : "border-slate-800/40";

  // High contrast colored texts for Light mode
  const emeraldText = isLight ? "text-emerald-700 font-bold" : "text-emerald-400";
  const skyText = isLight ? "text-sky-700 font-bold" : "text-sky-400";
  const amberText = isLight ? "text-amber-700 font-bold" : "text-amber-400";

  // Visual classes based on active theme
  const containerBg =
    theme === "light"
      ? "bg-gradient-to-br from-[#f8fbfe] via-[#f0f5fc] to-[#e6effa] border border-slate-200/90 text-slate-900 shadow-sm"
      : theme === "dark"
        ? "bg-[#0d0d0d] border border-neutral-800/60 text-slate-100"
        : "bg-[#3B6D99] border border-blue-400/40 text-white font-semibold";

  const cardBg =
    theme === "light"
      ? "bg-gradient-to-br from-[#f8fbfe] via-[#f0f5fc] to-[#e6effa] border border-slate-200/90 shadow-sm hover:border-blue-300/70 text-slate-900"
      : theme === "dark"
        ? "bg-[#0d0d0d] border border-neutral-800/60 text-slate-100"
        : "bg-[#3B6D99] border border-blue-400/40 text-white font-semibold";

  const inputClass =
    theme === "light"
      ? "w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 transition-all duration-200 shadow-sm"
      : "w-full bg-slate-950/60 border border-slate-850 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-neutral-700 focus:ring-2 focus:ring-neutral-700/10 transition-all duration-200";

  return (
    <div className="w-full max-w-xl mx-auto space-y-3 p-2 sm:p-3 pb-6 text-[11px]">
      {/* Custom Premium Profile Top Header Bar (Hiding global top header) */}
      <div
        className={`p-2.5 rounded-b-2xl border-b flex items-center justify-between sticky top-0 z-50 backdrop-blur-xl ${
          theme === "light"
            ? "bg-white/95 border-slate-200 text-slate-950"
            : "bg-[#0c0c0c]/95 border-neutral-900"
        }`}
      >
        <button
          onClick={onBackToHome}
          className={`p-1.5 rounded-lg hover:bg-slate-500/10 transition-colors flex items-center justify-center cursor-pointer ${
            theme === "light" ? "text-slate-800" : "text-white"
          }`}
          title={
            lang === "sw" ? "Rudi Nyumbani" : lang === "fr" ? "Retour à l'accueil" : "Back to Home"
          }
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="text-center">
          <span
            className={`text-[9px] font-black uppercase tracking-widest block ${theme === "light" ? "text-slate-600" : "text-slate-500"}`}
          >
            {lang === "sw"
              ? "Kipengele Binafsi"
              : lang === "fr"
                ? "Espace Personnel"
                : "Personal Space"}
          </span>
          <h1
            className={`text-xs font-black font-display tracking-tight leading-none ${theme === "light" ? "text-slate-900" : "text-slate-100"}`}
          >
            {lang === "sw" ? "WASIFU WAKO" : lang === "fr" ? "VOTRE PROFIL" : "YOUR PROFILE"}
          </h1>
        </div>

        {/* Dynamic Three-Dots Option Menu */}
        <div className="relative">
          <button
            onClick={() => {
              if (!currentUser || !currentUser.isLoggedIn) {
                if (onShakeTrigger) onShakeTrigger();
                return;
              }
              setShowMenuDropdown(!showMenuDropdown);
            }}
            className="p-1.5 rounded-lg hover:bg-slate-500/10 transition-colors flex items-center justify-center cursor-pointer"
            title={
              lang === "sw"
                ? "Chaguzi za Ziada"
                : lang === "fr"
                  ? "Options Supplémentaires"
                  : "Extra Options"
            }
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          <AnimatePresence>
            {showMenuDropdown && (
              <>
                {/* Click outside backdrop */}
                <div className="fixed inset-0 z-40" onClick={() => setShowMenuDropdown(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -5 }}
                  className={`absolute right-0 mt-2 w-56 rounded-2xl border p-2 shadow-xl z-50 ${
                    theme === "light"
                      ? "bg-white border-slate-200 text-slate-800"
                      : "bg-[#141414] border-neutral-800 text-slate-100"
                  }`}
                >
                  <div className="p-2 border-b border-neutral-800/20 mb-1">
                    <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest block">
                      {lang === "sw"
                        ? "Meneja wa Akaunti"
                        : lang === "fr"
                          ? "Gestionnaire de Compte"
                          : "Account Manager"}
                    </span>
                  </div>

                  {!isPro ? (
                    <button
                      onClick={handleUpgradeToPro}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-amber-500/10 text-amber-500 font-bold text-xs flex items-center space-x-2 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 shrink-0" />
                      <span>
                        {lang === "sw"
                          ? "Boresha kuwa Mchambuzi wa Pro"
                          : lang === "fr"
                            ? "Devenir VIP Pro"
                            : "Upgrade to VIP Pro"}
                      </span>
                    </button>
                  ) : (
                    <div className="p-2.5 text-[11px] text-emerald-500 font-bold flex items-center space-x-2">
                      <Shield className="w-4 h-4 shrink-0" />
                      <span>
                        {lang === "sw"
                          ? "Mwanachama wa VIP PRO"
                          : lang === "fr"
                            ? "Membre VIP PRO"
                            : "VIP PRO Member"}
                      </span>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      onAddNotification(
                        lang === "sw"
                          ? "Kipengele hiki kinakuja hivi karibuni!"
                          : lang === "fr"
                            ? "Cette fonctionnalité arrive bientôt !"
                            : "This feature is coming soon!",
                        "info",
                      );
                      setShowMenuDropdown(false);
                    }}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-slate-500/5 text-[11px] font-semibold flex items-center space-x-2 transition-colors cursor-pointer"
                  >
                    <SettingsIcon className="w-4 h-4 shrink-0 text-slate-400" />
                    <span>
                      {lang === "sw"
                        ? "Mipangilio ya Mfumo"
                        : lang === "fr"
                          ? "Paramètres du Système"
                          : "System Settings"}
                    </span>
                  </button>

                  {currentUser?.isLoggedIn && (
                    <button
                      onClick={() => {
                        handleLogout();
                        setShowMenuDropdown(false);
                      }}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-rose-500/10 text-rose-500 font-bold text-xs flex items-center space-x-2 transition-colors border-t border-neutral-800/20 mt-1 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 shrink-0" />
                      <span>
                        {lang === "sw"
                          ? "Ondoka kwenye Akaunti"
                          : lang === "fr"
                            ? "Se Déconnecter"
                            : "Log Out"}
                      </span>
                    </button>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="px-3.5 space-y-3">
        {/* 1. Profile Header Info (Directly on container) */}
        <div className="relative flex flex-col items-center text-center py-2">
          {currentUser?.isLoggedIn ? (
            <>
              {/* Profile image view & upload frame */}
              <div className="relative group">
                <div
                  onClick={() => {
                    if (profileImage) {
                      setLightboxImage(profileImage);
                    }
                  }}
                  className={`w-20 h-20 sm:w-22 sm:h-22 rounded-full overflow-hidden flex items-center justify-center font-display font-black text-2xl border-2 relative shadow-2xl transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                    isPro
                      ? "bg-amber-500/10 border-amber-500 text-amber-400 shadow-amber-500/20 hover:border-amber-400"
                      : theme === "dark"
                        ? "bg-gradient-to-br from-neutral-800 to-neutral-700 border-neutral-700/80 text-white shadow-neutral-900/40 hover:border-neutral-600"
                        : theme === "blue"
                          ? "bg-gradient-to-br from-blue-500/30 to-indigo-500/30 border-blue-400/30 text-blue-100 shadow-blue-500/20 hover:border-blue-400"
                          : "bg-blue-600/10 border-blue-500 text-blue-400 shadow-blue-500/20 hover:border-blue-400"
                  }`}
                  title={lang === "sw" ? "Bonyeza kuona picha kwa upana" : "Click to view full image"}
                >
                  {profileImage ? (
                    <img
                      src={profileImage}
                      alt="Uploaded avatar"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <UserCircleSingleIcon className="w-10 h-10" />
                  )}

                  {/* Expand view overlay on hover/tap */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-white p-1">
                    <Maximize2 className="w-5 h-5 mb-0.5 text-sky-300" />
                    <span className="text-[7.5px] font-extrabold uppercase tracking-wider text-center leading-tight">
                      {lang === "sw" ? "Tazama Picha" : "View Photo"}
                    </span>
                  </div>
                </div>

                {/* Camera upload button badge at bottom right */}
                <label
                  className="absolute -bottom-1 -right-1 p-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-full border-2 border-slate-950 transition-transform active:scale-90 flex items-center justify-center cursor-pointer shadow-xl z-10"
                  title={lang === "sw" ? "Badili / Pakia Picha" : "Change / Upload Photo"}
                >
                  {isPhotoLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Camera className="w-3.5 h-3.5" />
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/heic"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Background Non-Blocking Upload Status Indicator */}
              <AnimatePresence>
                {uploadStatus && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="mt-2.5 px-3 py-1.5 rounded-full border border-sky-500/30 bg-sky-950/80 backdrop-blur-md flex items-center justify-center space-x-2 text-[10px] font-bold shadow-lg"
                  >
                    {uploadStatus.status === "compressing" || uploadStatus.status === "uploading" ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400 shrink-0" />
                        <span className="text-sky-200">{uploadStatus.message || "Inapakia picha..."}</span>
                        <div className="w-12 bg-sky-900/60 rounded-full h-1 overflow-hidden ml-1">
                          <div
                            className="bg-sky-400 h-full transition-all duration-300"
                            style={{ width: `${uploadStatus.progress}%` }}
                          />
                        </div>
                      </>
                    ) : uploadStatus.status === "retrying" ? (
                      <>
                        <RotateCcw className="w-3.5 h-3.5 animate-spin text-amber-400 shrink-0" />
                        <span className="text-amber-300">{uploadStatus.message || "Connection ipo chini — inaji-retry background..."}</span>
                      </>
                    ) : uploadStatus.status === "uploaded" ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="text-emerald-300">{uploadStatus.message || "Imepakiwa na kuhifadhiwa!"}</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span className="text-rose-300">{uploadStatus.message || "Hitilafu imetokea."}</span>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Badges and Names */}
              <div className="mt-2">
                <div className="flex items-center justify-center space-x-1.5">
                  <h2 className="text-sm font-display font-black tracking-tight">
                    {fullName || (username ? `@${username}` : "User")}
                  </h2>
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider flex items-center space-x-1 ${
                      isPro
                        ? "bg-amber-400/15 border border-amber-400/25 text-amber-400"
                        : "bg-sky-50/15 border border-sky-500/25 text-sky-450"
                    }`}
                  >
                    {isPro ? (
                      <>
                        <Sparkles className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                        <span>VIP PRO</span>
                      </>
                    ) : (
                      <span>STANDARD</span>
                    )}
                  </span>
                </div>
                <p
                  className={`text-[9.5px] font-bold mt-0.5 ${theme === "light" ? "text-slate-600 font-semibold" : "text-sky-400"}`}
                >
                  @{username || email?.split("@")[0]}
                </p>
              </div>

              {/* Followers and Following stats counter (Unlocking and Unlockers) */}
              <div
                className={`grid grid-cols-2 gap-2.5 w-full mt-3.5 pt-3.5 border-t ${borderSubtle}`}
              >
                {/* Unlocking count */}
                <div
                  className={`p-2 rounded-lg border text-center transition-all hover:scale-[1.01] ${cardBg}`}
                >
                  <span
                    className={`text-[8px] font-black uppercase tracking-widest block ${labelColor}`}
                  >
                    {lang === "sw" ? "Uliofungua" : lang === "fr" ? "Débloqués" : "Unlocked"}
                  </span>
                  <div className="flex items-center justify-center space-x-1 mt-1">
                    <Users
                      className={`w-3.5 h-3.5 ${theme === "light" ? "text-blue-600" : "text-sky-400"}`}
                    />
                    <span
                      className={`text-xs font-black font-mono ${theme === "light" ? "text-slate-900" : "text-slate-100"}`}
                    >
                      {activelyUnlockingCount ?? subscribedTipsters.length}
                    </span>
                  </div>
                  <span className={`text-[8px] mt-0.5 block ${descColor}`}>
                    {lang === "sw"
                      ? "Wachambuzi Unao-unlock"
                      : lang === "fr"
                        ? "Abonnements Suivis"
                        : "Analysts Unlocked by You"}
                  </span>
                </div>

                {/* Unlockers count */}
                <div
                  className={`p-2 rounded-lg border text-center transition-all hover:scale-[1.01] ${cardBg}`}
                >
                  <span
                    className={`text-[8px] font-black uppercase tracking-widest block ${labelColor}`}
                  >
                    {lang === "sw" ? "Wanaokufungua" : lang === "fr" ? "Abonnés" : "Unlockers"}
                  </span>
                  <div className="flex items-center justify-center space-x-1 mt-1">
                    <TrendingUp
                      className={`w-3.5 h-3.5 ${theme === "light" ? "text-emerald-650" : "text-emerald-400"}`}
                    />
                    <span
                      className={`text-xs font-black font-mono ${theme === "light" ? "text-slate-900" : "text-slate-100"}`}
                    >
                      {activeUnlockersCount}
                    </span>
                  </div>
                  <span className={`text-[8px] mt-0.5 block ${descColor}`}>
                    {lang === "sw"
                      ? "Wachezaji wanao-unlock kadi"
                      : lang === "fr"
                        ? "Abonnés Déverrouillant"
                        : "Players Unlocking Your Cards"}
                  </span>
                </div>
              </div>

              {/* Wallet Quick status */}
              <div
                className={`w-full mt-2 p-2.5 rounded-lg border flex items-center justify-between ${cardBg}`}
              >
                <div className="flex items-center space-x-1.5">
                  <Coins
                    className={`w-3.5 h-3.5 ${theme === "light" ? "text-amber-600" : "text-amber-500"}`}
                  />
                  <span
                    className={`text-[9px] font-bold ${theme === "light" ? "text-slate-700" : "text-slate-400"}`}
                  >
                    {lang === "sw"
                      ? "Salio Lako la Sasa:"
                      : lang === "fr"
                        ? "Votre Solde Actuel:"
                        : "Your Current Balance:"}
                  </span>
                </div>
                <span className={`font-mono text-[11px] font-black ${emeraldText}`}>
                  FBU {userBalance.toLocaleString()}
                </span>
              </div>

              {/* Governance Panel Trigger Button */}
              <button
                onClick={() => setShowGovernanceModal(true)}
                className="w-full mt-2 py-2 px-3 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-black text-[10px] uppercase tracking-wider flex items-center justify-between transition-all cursor-pointer shadow-sm"
              >
                <span className="flex items-center space-x-2">
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  <span>Governance & Ownership Panel</span>
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
              </button>
            </>
          ) : (
            <div className="py-3 flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-slate-500/10 text-slate-400 border border-slate-800/50 flex items-center justify-center mb-2">
                <User className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-black">
                {lang === "sw"
                  ? "Wasifu Umefungwa (Hujaingia)"
                  : lang === "fr"
                    ? "Profil Verrouillé (Non Connecté)"
                    : "Locked Profile (Not Logged In)"}
              </h3>
              <p className="text-[10px] text-slate-500 max-w-[200px] mt-1 leading-relaxed">
                {lang === "sw"
                  ? "Tafadhali ingia kwenye akaunti yako ili kurekebisha wasifu, ku-upload picha, na kuona historia yako ya ubashiri."
                  : lang === "fr"
                    ? "Veuillez vous connecter pour modifier votre profil, télécharger une photo de profil et voir votre historique de paris."
                    : "Please log in to your account to modify your profile, upload an avatar, and track your betting history."}
              </p>
              <button
                onClick={onOpenAuth}
                className="mt-3 px-4 py-2 bg-gradient-to-r from-blue-500 to-sky-400 text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-lg hover:scale-[1.02] active:scale-[0.98] transition-transform cursor-pointer"
              >
                {lang === "sw"
                  ? "Ingia / Jisajili Sasa"
                  : lang === "fr"
                    ? "Se Connecter / S'inscrire"
                    : "Login / Register Now"}
              </button>
            </div>
          )}
        </div>

        {/* Dynamic Navigation History / Posts Section tabs */}
        {currentUser?.isLoggedIn && (
          <div className="space-y-2.5">
            {/* Tabs Trigger Navigation */}
            <div
              className={`flex space-x-1 p-0.5 rounded-lg border ${
                theme === "light"
                  ? "bg-slate-100 border-slate-200"
                  : "bg-slate-950/40 border-neutral-900/60"
              }`}
            >
              <button
                onClick={() => setActiveHistoryTab("tickets")}
                className={`flex-1 py-1 text-center rounded-md text-[9px] font-black uppercase tracking-wider transition-all ${
                  activeHistoryTab === "tickets"
                    ? "bg-blue-600 text-white shadow"
                    : theme === "light"
                      ? "text-slate-600 hover:text-slate-900"
                      : "text-slate-400 hover:text-white"
                }`}
              >
                {lang === "sw" ? "Jamvi Langu" : lang === "fr" ? "Mon Ticket" : "My Ticket"} (
                {transactions.filter((t) => t.type === "BET_PLACE").length})
              </button>
              <button
                onClick={() => setActiveHistoryTab("photo")}
                className={`flex-1 py-1 text-center rounded-md text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center space-x-1 ${
                  activeHistoryTab === "photo"
                    ? "bg-blue-600 text-white shadow"
                    : theme === "light"
                      ? "text-slate-600 hover:text-slate-900"
                      : "text-slate-400 hover:text-white"
                }`}
              >
                <Camera className="w-3 h-3 shrink-0" />
                <span>{lang === "sw" ? "Picha Yako" : lang === "fr" ? "Photo de Profil" : "Profile Photo"}</span>
              </button>
              <button
                onClick={() => setActiveHistoryTab("posts")}
                className={`flex-1 py-1 text-center rounded-md text-[9px] font-black uppercase tracking-wider transition-all ${
                  activeHistoryTab === "posts"
                    ? "bg-blue-600 text-white shadow"
                    : theme === "light"
                      ? "text-slate-600 hover:text-slate-900"
                      : "text-slate-400 hover:text-white"
                }`}
              >
                {lang === "sw"
                  ? "Kadi Ulizopost"
                  : lang === "fr"
                    ? "Fiches Publiées"
                    : "Your Posted Cards"}
              </button>
            </div>

            {/* Tab 1: Jamvi / Placed Ticket Slips */}
            {activeHistoryTab === "tickets" && (
              <div className="space-y-1.5">
                {transactions.filter((t) => t.type === "BET_PLACE").length === 0 ? (
                  <div className={`p-4 rounded-lg border text-center ${cardBg}`}>
                    <Clock className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                    <p
                      className={`text-[11px] font-bold ${theme === "light" ? "text-slate-800" : "text-white"}`}
                    >
                      {lang === "sw"
                        ? "Hujacheza jamvi lolote bado"
                        : lang === "fr"
                          ? "Aucun ticket placé pour le moment"
                          : "No tickets placed yet"}
                    </p>
                    <p
                      className={`text-[9px] mt-0.5 ${theme === "light" ? "text-slate-600" : "text-slate-500"}`}
                    >
                      {lang === "sw"
                        ? "Ubashiri wowote unaocheza utaonekana hapa kama kadi ya tiketi."
                        : lang === "fr"
                          ? "Toutes vos mises placées s'afficheront ici sous forme de fiches."
                          : "Any bets you place will appear here as a ticket card."}
                    </p>
                  </div>
                ) : (
                  transactions
                    .filter((t) => t.type === "BET_PLACE")
                    .map((tx) => (
                      <div
                        key={tx.id}
                        className={`p-2.5 rounded-lg border flex flex-col space-y-1 ${cardBg}`}
                      >
                        <div className="flex justify-between items-center">
                          <span
                            className={`text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                              theme === "light"
                                ? "bg-blue-50 border border-blue-200 text-blue-600"
                                : "bg-blue-500/10 border border-blue-500/20 text-sky-400"
                            }`}
                          >
                            {lang === "sw"
                              ? "JAMVI LA KUBASHIRI"
                              : lang === "fr"
                                ? "TICKET DE PARI"
                                : "BET TICKET"}
                          </span>
                          <span
                            className={`text-[8px] font-mono ${theme === "light" ? "text-slate-700" : "text-slate-500"}`}
                          >
                            {tx.date}
                          </span>
                        </div>
                        <p
                          className={`text-[10px] font-bold leading-normal ${theme === "light" ? "text-slate-900" : "text-slate-100"}`}
                        >
                          {tx.description}
                        </p>
                        <div
                          className={`flex justify-between items-center pt-1.5 border-t text-[9px] ${theme === "light" ? "border-slate-200" : "border-slate-800/20"}`}
                        >
                          <div>
                            <span
                              className={theme === "light" ? "text-slate-600" : "text-slate-500"}
                            >
                              {lang === "sw" ? "Kiasi: " : lang === "fr" ? "Montant: " : "Amount: "}
                            </span>
                            <span className={`font-bold font-mono ${emeraldText}`}>
                              FBU {tx.amount.toLocaleString()}
                            </span>
                          </div>
                          <span
                            className={`${theme === "light" ? "text-amber-700" : "text-amber-500"} font-black uppercase tracking-wider flex items-center space-x-1`}
                          >
                            <Clock
                              className={`w-2.5 h-2.5 shrink-0 ${theme === "light" ? "text-amber-700" : "text-amber-500"}`}
                            />
                            <span>
                              {lang === "sw" ? "INASUBIRI" : lang === "fr" ? "EN COURS" : "PENDING"}
                            </span>
                          </span>
                        </div>
                      </div>
                    ))
                )}
              </div>
            )}

            {/* Tab 2: Picha Yako / Your Profile Photo Manager & History */}
            {activeHistoryTab === "photo" && (
              <div className="space-y-4">
                {/* Unlimited Freedom & Free Status Banner */}
                <div
                  className="p-3.5 rounded-xl border transition-all bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div className="min-w-0">
                        <h4 className="text-[11px] font-black uppercase tracking-wider truncate">
                          {lang === "sw"
                            ? "Kubadilisha Picha ni BURE Kabisa (Muda Wowote)"
                            : "Profile Photo Changes = 100% FREE (Anytime)"}
                        </h4>
                        <p className="text-[10px] mt-0.5 opacity-90 font-medium">
                          {lang === "sw"
                            ? "Unaweza kupakia, kubadilisha, au kuchagua picha yoyote ya wasifu wakati wowote bila kizuizi cha muda."
                            : "You can upload, change, or select any profile photo anytime with zero restrictions."}
                        </p>
                      </div>
                    </div>
                    <span
                      className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase font-mono tracking-wider shrink-0 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    >
                      0 FBu (FREE)
                    </span>
                  </div>
                </div>

                {/* Active Photo Card */}
                <div
                  className={`p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${cardBg}`}
                >
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <div className="relative group shrink-0">
                      <div
                        className={`w-20 h-20 rounded-full overflow-hidden border-2 shadow-xl flex items-center justify-center text-xl font-black ${
                          theme === "light"
                            ? "bg-slate-100 border-blue-500 text-slate-800"
                            : "bg-blue-600/20 border-blue-500 text-sky-400 shadow-blue-500/10"
                        }`}
                      >
                        {profileImage ? (
                          <img
                            src={profileImage}
                            alt="Profile Avatar"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            loading="lazy"
                          />
                        ) : (
                          <span>
                            {(username || currentUser?.username || "TT")
                              .substring(0, 2)
                              .toUpperCase()}
                          </span>
                        )}
                      </div>
                      <label className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity cursor-pointer text-white">
                        <Camera className="w-5 h-5 mb-0.5" />
                        <span className="text-[7.5px] font-bold uppercase">
                          {lang === "sw" ? "Pakia Mpya" : "Change"}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          disabled={isPhotoLoading}
                        />
                      </label>
                    </div>

                    <div className="text-left min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <h3
                          className={`text-xs font-black truncate ${theme === "light" ? "text-slate-900" : "text-white"}`}
                        >
                          {lang === "sw"
                            ? "Picha Inayotumika Sasa"
                            : lang === "fr"
                              ? "Photo Actuelle"
                              : "Current Active Photo"}
                        </h3>
                        <span className="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[7px] font-black uppercase rounded">
                          {lang === "sw" ? "Inatumika" : "Active"}
                        </span>
                      </div>
                      <p
                        className={`text-[10px] mt-0.5 ${theme === "light" ? "text-slate-600" : "text-slate-400"}`}
                      >
                        {lang === "sw"
                          ? "Kila picha unayopakia inahifadhiwa moja kwa moja kwenye database ya akaunti yako."
                          : "Your profile photo is linked directly to your backend user account."}
                      </p>
                      <div className="flex items-center space-x-1.5 mt-1 text-[8px] font-mono text-emerald-400">
                        <ShieldCheck className="w-3 h-3 shrink-0" />
                        <span>Database Ownership & Optimization Active</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0 w-full sm:w-auto">
                    <label
                      className={`flex-1 sm:flex-initial px-4 py-2.5 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-all shadow-md ${
                        isPhotoLoading
                          ? "bg-slate-700/60 text-slate-400 cursor-not-allowed border border-slate-600/30"
                          : "bg-blue-600 hover:bg-blue-500 cursor-pointer active:scale-95 shadow-blue-500/20"
                      }`}
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>
                        {lang === "sw" ? "Badili Picha ya Wasifu" : "Change Profile Photo"}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={isPhotoLoading}
                      />
                    </label>
                  </div>
                </div>

                {/* Photo Sub-Tabs: Active vs Deleted */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setPhotoSubTab("active")}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center space-x-1.5 ${
                          photoSubTab === "active"
                            ? "bg-blue-600 text-white shadow"
                            : theme === "light"
                              ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              : "bg-slate-800/60 text-slate-400 hover:bg-slate-800"
                        }`}
                      >
                        <Camera className="w-3 h-3" />
                        <span>{lang === "sw" ? "Picha Zote za Wasifu" : "Active Photos"}</span>
                        <span className="px-1.5 py-0.2 bg-white/20 rounded-full text-[8px] font-mono">
                          {activePhotos.length}
                        </span>
                      </button>

                      <button
                        onClick={() => setPhotoSubTab("deleted")}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center space-x-1.5 ${
                          photoSubTab === "deleted"
                            ? "bg-rose-600 text-white shadow"
                            : theme === "light"
                              ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              : "bg-slate-800/60 text-slate-400 hover:bg-slate-800"
                        }`}
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>{lang === "sw" ? "Picha Zilizofutwa" : "Deleted Photos"}</span>
                        <span className="px-1.5 py-0.2 bg-white/20 rounded-full text-[8px] font-mono">
                          {deletedPhotos.length}
                        </span>
                      </button>
                    </div>

                    <button
                      onClick={fetchProfilePhotosFromDatabase}
                      disabled={isPhotoLoading}
                      className="p-1.5 rounded bg-slate-800/40 text-slate-400 hover:text-white transition-colors"
                      title={lang === "sw" ? "Pakia upya kutoka server" : "Refresh"}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isPhotoLoading ? "animate-spin" : ""}`} />
                    </button>
                  </div>

                  {/* ACTIVE PHOTOS GALLERY */}
                  {photoSubTab === "active" && (
                    <>
                      {activePhotos.length === 0 ? (
                        <div className={`p-6 rounded-xl border text-center ${cardBg}`}>
                          <Camera className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-50" />
                          <p className={`text-[11px] font-bold ${theme === "light" ? "text-slate-800" : "text-white"}`}>
                            {lang === "sw" ? "Hujapakia picha yoyote bado" : "No active profile photos"}
                          </p>
                          <p className={`text-[9px] mt-0.5 ${theme === "light" ? "text-slate-600" : "text-slate-400"}`}>
                            {lang === "sw"
                              ? "Pakia picha yako ya kwanza bure kabisa. Picha zote zitahifadhiwa salama kwenye akaunti yako."
                              : "Upload your first photo for free. All photos are linked permanently to your account."}
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                          {activePhotos.map((item) => {
                            const isCurrent = item.is_current;
                            return (
                              <div
                                key={item.id}
                                className={`relative group rounded-xl border overflow-hidden transition-all ${
                                  isCurrent
                                    ? "border-blue-500 ring-2 ring-blue-500/40 shadow-lg"
                                    : theme === "light"
                                      ? "border-slate-200 bg-slate-50 hover:border-slate-300"
                                      : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                                }`}
                              >
                                <div
                                  onClick={() => setLightboxImage(item.photo_url)}
                                  className="aspect-square relative overflow-hidden bg-slate-950 flex items-center justify-center cursor-pointer group/img"
                                  title={lang === "sw" ? "Bonyeza kuona kwa upana" : "Click to enlarge"}
                                >
                                  <img
                                    src={item.photo_url}
                                    alt="Profile Avatar"
                                    className="w-full h-full object-cover transition-transform group-hover/img:scale-105"
                                    loading="lazy"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity text-white">
                                    <Maximize2 className="w-5 h-5 text-sky-300" />
                                  </div>
                                  {isCurrent && (
                                    <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-blue-600 text-white text-[7px] font-black uppercase tracking-wider shadow flex items-center space-x-1 z-10">
                                      <Check className="w-2.5 h-2.5" />
                                      <span>{lang === "sw" ? "Inatumika" : "Current"}</span>
                                    </div>
                                  )}
                                </div>

                                <div className="p-2 space-y-1.5">
                                  <p className="text-[8px] font-mono text-slate-400 truncate">
                                    {new Date(item.created_at).toLocaleDateString()}
                                  </p>
                                  <div className="flex items-center space-x-1 pt-0.5">
                                    {!isCurrent ? (
                                      <button
                                        onClick={() => handleSelectHistoryPhoto(item.id)}
                                        disabled={isPhotoLoading}
                                        className="flex-1 py-1 rounded text-[8px] font-black uppercase tracking-wider transition-all flex items-center justify-center space-x-1 bg-purple-600/20 hover:bg-purple-600 text-purple-400 hover:text-white border border-purple-500/30"
                                        title="Tumia picha hii"
                                      >
                                        <Check className="w-2.5 h-2.5" />
                                        <span>{lang === "sw" ? "Tumia Hii" : "Use Photo"}</span>
                                      </button>
                                    ) : (
                                      <span className="flex-1 py-1 bg-emerald-500/10 text-emerald-400 text-center rounded text-[8px] font-black uppercase tracking-wider border border-emerald-500/20">
                                        {lang === "sw" ? "Inatumika" : "Active"}
                                      </span>
                                    )}
                                    <button
                                      onClick={() => handleDeleteHistoryPhoto(item.id)}
                                      disabled={isPhotoLoading}
                                      className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors disabled:opacity-50"
                                      title={lang === "sw" ? "Futa picha (Bure)" : "Delete photo (Free)"}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}

                  {/* DELETED PHOTOS GALLERY (RESTOREABLE) */}
                  {photoSubTab === "deleted" && (
                    <>
                      {deletedPhotos.length === 0 ? (
                        <div className={`p-6 rounded-xl border text-center ${cardBg}`}>
                          <Trash2 className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-50" />
                          <p className={`text-[11px] font-bold ${theme === "light" ? "text-slate-800" : "text-white"}`}>
                            {lang === "sw" ? "Hakuna picha zilizofutwa" : "No deleted photos"}
                          </p>
                          <p className={`text-[9px] mt-0.5 ${theme === "light" ? "text-slate-600" : "text-slate-400"}`}>
                            {lang === "sw"
                              ? "Picha zote unazofuta zitaonekana hapa na unaweza kuziwezesha au kuziweka tena BURE kabisa."
                              : "Deleted photos show up here and can be restored anytime for FREE."}
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                          {deletedPhotos.map((item) => {
                            return (
                              <div
                                key={item.id}
                                className={`relative group rounded-xl border overflow-hidden transition-all opacity-80 hover:opacity-100 ${
                                  theme === "light"
                                    ? "border-rose-200 bg-rose-50/30"
                                    : "border-rose-900/30 bg-slate-900/40"
                                }`}
                              >
                                <div className="aspect-square relative overflow-hidden bg-slate-950 flex items-center justify-center">
                                  <img
                                    src={item.photo_url}
                                    alt="Deleted Avatar"
                                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all"
                                    loading="lazy"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-rose-600/90 text-white text-[7px] font-black uppercase tracking-wider shadow">
                                    {lang === "sw" ? "Iliyofutwa" : "Deleted"}
                                  </div>
                                </div>

                                <div className="p-2 space-y-1.5">
                                  <p className="text-[8px] font-mono text-slate-400 truncate">
                                    {item.deleted_at ? new Date(item.deleted_at).toLocaleDateString() : ""}
                                  </p>
                                  <button
                                    onClick={() => handleRestorePhoto(item.id)}
                                    disabled={isPhotoLoading}
                                    className="w-full py-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 rounded text-[8px] font-black uppercase tracking-wider transition-all flex items-center justify-center space-x-1 disabled:opacity-50"
                                  >
                                    <RotateCcw className="w-2.5 h-2.5" />
                                    <span>{lang === "sw" ? "Rejesha (BURE)" : "Restore (FREE)"}</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Tab 3: Kadi Ulizopost / Your Published Creator Game Cards */}
            {activeHistoryTab === "posts" && (
              <div className="space-y-2">
                {isPostsLoading ? (
                  /* Elegant Profile Posts Skeleton loader */
                  <div className={`p-3 rounded-lg border space-y-2.5 ${cardBg} animate-pulse`}>
                    <div className="flex justify-between items-center">
                      <div className="w-20 h-2 bg-slate-300 dark:bg-neutral-800 rounded" />
                      <div className="w-12 h-2 bg-slate-300 dark:bg-neutral-800 rounded" />
                    </div>
                    <div className="w-28 h-3.5 bg-slate-400 dark:bg-neutral-700 rounded mt-1.5" />
                    <div className="grid grid-cols-3 gap-1.5 text-center text-[9px] pt-1.5">
                      <div className="p-1.5 rounded-lg border border-dashed border-slate-200 dark:border-neutral-800 space-y-1">
                        <div className="w-8 h-1.5 bg-slate-300 dark:bg-neutral-800 rounded mx-auto" />
                        <div className="w-10 h-2 bg-slate-400 dark:bg-neutral-700 rounded mx-auto" />
                      </div>
                      <div className="p-1.5 rounded-lg border border-dashed border-slate-200 dark:border-neutral-800 space-y-1">
                        <div className="w-8 h-1.5 bg-slate-300 dark:bg-neutral-800 rounded mx-auto" />
                        <div className="w-5 h-2 bg-slate-400 dark:bg-neutral-700 rounded mx-auto" />
                      </div>
                      <div className="p-1.5 rounded-lg border border-dashed border-slate-200 dark:border-neutral-800 space-y-1">
                        <div className="w-8 h-1.5 bg-slate-300 dark:bg-neutral-800 rounded mx-auto" />
                        <div className="w-10 h-2 bg-slate-400 dark:bg-neutral-700 rounded mx-auto" />
                      </div>
                    </div>
                  </div>
                ) : (() => {
                  const publishedList = (
                    dbPublishedTips.length > 0
                      ? dbPublishedTips
                      : userPublishedTips.length > 0
                        ? userPublishedTips
                        : creatorMatch ? [creatorMatch] : []
                  )
                    .filter(Boolean)
                    .map((tip: any) => ({
                      ...tip,
                      tipster: tip.tipster || {
                        profile_id: currentUser?.username || "me",
                        name: currentUser?.fullName || currentUser?.username || "You",
                        username: currentUser?.username || "you",
                        badge: "PRO UNLOCKER",
                        avatarUrl: currentUser?.avatarUrl,
                        winRate: "94%",
                        isOfficial: false,
                      },
                    }));

                  if (publishedList.length === 0) {
                    return (
                      <div className={`p-4 rounded-lg border text-center ${cardBg}`}>
                        <Award className="w-6 h-6 text-slate-600 mx-auto mb-1.5" />
                        <p className="text-[11px] font-bold">
                          {lang === "sw"
                            ? "Hujachapisha kadi yoyote bado"
                            : lang === "fr"
                              ? "Aucune fiche publiée pour le moment"
                              : "No published cards yet"}
                        </p>
                        <p className="text-[9px] text-slate-500 mt-1 leading-relaxed">
                          {lang === "sw"
                            ? "Wewe ni mchambuzi wa Pro? Nenda kwenye Console Pro utengeneze kadi yako na upate kipato kila watu wanapo-unlock kadi yako!"
                            : lang === "fr"
                              ? "Vous êtes un pronostiqueur Pro ? Accédez à la Console Pro pour créer votre fiche et générer des revenus !"
                              : "Are you a Pro analyst? Head over to the Pro Console to create your card and earn income whenever people unlock it!"}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <MatchList
                      tips={publishedList}
                      isProfileMode={true}
                      currentUser={currentUser}
                      theme={theme}
                      lang={lang}
                      isPro={isPro}
                      onShakeTrigger={onShakeTrigger}
                      onNavigateTab={onBackToHome}
                    />
                  );
                })()}
              </div>
            )}

            {/* 2. Redirection to Settings card */}
            <div
              className={`p-3 rounded-xl border border-dashed text-center space-y-2 ${
                theme === "light"
                  ? "bg-slate-50/50 border-slate-300"
                  : "bg-slate-950/20 border-slate-800/40"
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 mx-auto flex items-center justify-center">
                <SettingsIcon className="w-4 h-4 animate-spin-slow" />
              </div>
              <div className="space-y-0.5">
                <h4
                  className={`text-[10px] font-black uppercase tracking-wider ${theme === "light" ? "text-slate-800" : "text-white"}`}
                >
                  {lang === "sw"
                    ? "Usimamizi wa Wasifu & Usalama"
                    : lang === "fr"
                      ? "Gestion du Profil & Sécurité"
                      : "Profile Management & Security"}
                </h4>
                <p className="text-[9px] text-slate-500 leading-normal max-w-sm mx-auto">
                  {lang === "sw"
                    ? "Maelezo yako binafsi ya wasifu, ulinzi wa nywila, na ufungaji wa mwanga salama (Eye Comfort) vimehamishiwa kwenye taba mpya ya Mipangilio (Settings) ⚙️ katika menu ya chini."
                    : lang === "fr"
                      ? "Vos informations personnelles, la sécurité du mot de passe et le mode confort oculaire ont été déplacés vers le nouvel onglet Paramètres ⚙️ dans le menu inférieur."
                      : "Your personal profile details, password security, and Eye Comfort safe light mode have been moved to the new Settings tab ⚙️ in the bottom menu."}
                </p>
              </div>
            </div>

            {/* 4. Logout Session Action button */}
            <button
              onClick={handleLogout}
              className={`w-full py-2 border rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-all hover:scale-[1.01] active:scale-[0.98] cursor-pointer ${
                theme === "light"
                  ? "border-rose-300 text-rose-600 bg-rose-50/50 hover:bg-rose-100/50"
                  : "border-rose-500/20 text-rose-400 bg-rose-500/5 hover:bg-rose-500/10"
              }`}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>
                {lang === "sw"
                  ? "Ondoka kwenye Akaunti"
                  : lang === "fr"
                    ? "Se Déconnecter"
                    : "Log Out"}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Lightbox Modal: Profile Photo Expanded View */}
      <AnimatePresence>
        {lightboxImage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md">
            {/* Backdrop click to dismiss */}
            <div
              className="absolute inset-0 z-0"
              onClick={() => setLightboxImage(null)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: 15 }}
              className="relative z-10 max-w-sm sm:max-w-md w-full bg-[#111111] border border-neutral-800 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 text-center overflow-hidden"
            >
              {/* Lightbox Header */}
              <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3">
                <div className="flex items-center space-x-2">
                  <Maximize2 className="w-4 h-4 text-sky-400" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">
                    {lang === "sw" ? "Picha ya Wasifu (Muonekano Wazi)" : "Profile Picture (Full View)"}
                  </h3>
                </div>
                <button
                  onClick={() => setLightboxImage(null)}
                  className="p-1.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title={lang === "sw" ? "Funga" : "Close"}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* High-Res Image Preview Box */}
              <div className="relative w-full aspect-square max-w-[280px] sm:max-w-[340px] mx-auto rounded-2xl overflow-hidden border-2 border-neutral-700/80 shadow-2xl bg-neutral-950 flex items-center justify-center group">
                <img
                  src={lightboxImage}
                  alt="Expanded profile avatar"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white text-[8px] font-mono font-bold flex items-center space-x-1">
                  <ZoomIn className="w-2.5 h-2.5 text-sky-400" />
                  <span>100% HD</span>
                </div>
              </div>

              {/* User Metadata Label */}
              <div className="space-y-1">
                <div className="flex items-center justify-center space-x-1.5">
                  <h4 className="text-sm font-black text-white font-display">
                    {fullName || (username ? `@${username}` : "User")}
                  </h4>
                  {isPro && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[8px] font-black uppercase tracking-wider border border-amber-500/30">
                      VIP PRO
                    </span>
                  )}
                </div>
                <p className="text-[10px] font-mono text-sky-400 font-semibold">
                  @{username || email?.split("@")[0]}
                </p>
              </div>

              {/* Action buttons */}
              <div className="pt-2 flex items-center space-x-2">
                <label className="flex-1 py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center space-x-2 cursor-pointer transition-all active:scale-95 shadow-lg shadow-blue-600/20">
                  <Camera className="w-4 h-4" />
                  <span>{lang === "sw" ? "Badilisha Picha" : "Change Photo"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      handleImageUpload(e);
                      setLightboxImage(null);
                    }}
                    className="hidden"
                  />
                </label>
                <button
                  onClick={() => setLightboxImage(null)}
                  className="py-2.5 px-4 bg-neutral-800 hover:bg-neutral-700 text-slate-300 rounded-xl text-xs font-bold uppercase transition-colors cursor-pointer"
                >
                  {lang === "sw" ? "Funga" : "Close"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Governance Modal Popup Overlay */}
      <AnimatePresence>
        {showGovernanceModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
          >
            <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto my-auto">
              <GovernancePanel
                currentUser={currentUser}
                theme={theme}
                lang={lang}
                onAddNotification={onAddNotification}
                onClose={() => setShowGovernanceModal(false)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
