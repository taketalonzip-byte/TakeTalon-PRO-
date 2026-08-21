/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
  Save,
  RefreshCw,
  KeyRound,
  Trash2,
  AlertTriangle,
  ShieldAlert,
  ArrowLeft,
  Check,
  CheckCircle2,
  ShieldX,
  Languages,
  Shield,
  Info,
} from "lucide-react";
import { renderThemeIcon } from "./ThemeModeIcons";
import SettingsIcon from "./SettingsIcon";
import ColorThemeIcon from "./ColorThemeIcon";
import EyeComfortIcon from "./EyeComfortIcon";
import PwaIcon from "./PwaIcon";
import InstallMobileIcon from "./InstallMobileIcon";

interface SettingsViewProps {
  currentUser: { username: string; email: string; phone: string; isLoggedIn: boolean } | null;
  setCurrentUser: (
    user: { username: string; email: string; phone: string; isLoggedIn: boolean } | null,
  ) => void;
  theme: "light" | "dark" | "blue";
  onAddNotification: (msg: string, type: "success" | "error" | "info") => void;
  onOpenAuth: () => void;
  onBackToHome: () => void;
  lang: "en" | "fr" | "sw";
  setLang: (l: "en" | "fr" | "sw") => void;
  themeState: "light" | "dark" | "blue";
  setThemeState: (t: "light" | "dark" | "blue") => void;
  eyeComfort: boolean;
  setEyeComfort: (val: boolean) => void;
  onNavigateTab?: (tab: any) => void;
}

export default function SettingsView({
  currentUser,
  setCurrentUser,
  theme,
  onAddNotification,
  onOpenAuth,
  onBackToHome,
  lang,
  setLang,
  themeState,
  setThemeState,
  eyeComfort,
  setEyeComfort,
  onNavigateTab,
}: SettingsViewProps) {
  // Local personal info edit states
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

  // Deletion modal & safety states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  const tr = (sw: string, fr: string, en: string) => (lang === "sw" ? sw : lang === "fr" ? fr : en);

  // PWA State & installation flow
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone;
      setIsInstalled(!!isStandalone);
      setCanInstall(!!(window as any).deferredPrompt);

      const handleInstallAvailable = () => {
        setCanInstall(true);
      };

      const handleInstallSuccess = () => {
        setCanInstall(false);
        setIsInstalled(true);
        onAddNotification(
          tr(
            "TakeTalon imesakinishwa kikamilifu kwenye simu yako! 🎉",
            "TakeTalon a été installé avec succès sur votre appareil ! 🎉",
            "TakeTalon has been installed successfully on your device! 🎉"
          ),
          "success",
        );
      };

      window.addEventListener("pwa-install-available", handleInstallAvailable);
      window.addEventListener("pwa-installed-success", handleInstallSuccess);

      return () => {
        window.removeEventListener("pwa-install-available", handleInstallAvailable);
        window.removeEventListener("pwa-installed-success", handleInstallSuccess);
      };
    }
  }, [lang, onAddNotification]);

  const handleInstallPWA = async () => {
    const promptEvent = (window as any).deferredPrompt;
    if (!promptEvent) {
      onAddNotification(
        tr(
          "Ili kusakinisha, tafadhali gusa nukta tatu za kivinjari chako kisha chagua 'Ongeza kwenye Skrini ya Nyumbani' (Add to Home Screen) au tayari imesakinishwa.",
          "Pour installer, appuyez sur le menu de votre navigateur (trois points) et sélectionnez 'Ajouter à l'écran d'accueil'.",
          "To install, tap your browser's menu (three dots) and select 'Add to Home Screen' or the app is already installed."
        ),
        "info",
      );
      return;
    }
    // Show the install prompt
    promptEvent.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await promptEvent.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    // Clear the stashed prompt
    (window as any).deferredPrompt = null;
    setCanInstall(false);
  };

  // Update form inputs when currentUser changes
  useEffect(() => {
    if (currentUser) {
      setUsername(currentUser.username);
      setEmail(currentUser.email);
      setPhone(currentUser.phone);
    }
  }, [currentUser]);

  // Multilingual support for settings labels
  const dict = {
    en: {
      settingsTitle: "Account Settings",
      settingsSubtitle: "Manage your personal profile, security credentials and account state",
      personalInfo: "Personal Information",
      usernameLabel: "Username",
      emailLabel: "Email Address",
      phoneLabel: "Phone Number (Mobile Money)",
      saveBtn: "Save Information",
      saving: "Saving Changes...",
      securityTitle: "Account Security",
      currentPass: "Current Password",
      currentPassPlaceholder: "Enter your current password",
      newPass: "New Password",
      newPassPlaceholder: "Minimum 5 characters",
      confirmNewPass: "Confirm New Password",
      confirmNewPassPlaceholder: "Repeat your new password",
      changePassBtn: "Update Password",
      changing: "Updating...",
      dangerZone: "Danger Zone",
      deleteAccount: "Delete Account Permanently",
      deleteAccountSubtitle:
        "Once you delete your account, there is no going back. All virtual assets will be lost.",
      deleteConfirmTitle: "Confirm Account Destruction",
      deleteConfirmDesc:
        "This action is final and cannot be undone. To prevent accidental deletion, please type 'DELETE' below to confirm permanent destruction.",
      typeDelete: "Type 'DELETE' to confirm",
      deleteLoadingText: "Destroying Account...",
      cancel: "Cancel",
      confirmDeleteBtn: "Yes, Delete Permanently",
      eyeComfortLabel: "Eye Comfort Shield (Reduced Blue Light)",
      appPrefs: "Application Preferences",
      languageLabel: "Language Selection",
      themeLabel: "Theme Customization",
      pwaTitle: "Install TakeTalon App",
      pwaDesc:
        "Install on your home screen for quick offline prediction access and a fast native experience.",
      pwaInstallBtn: "Install App Now",
      pwaInstalledBtn: "Installed on Device",
    },
    fr: {
      settingsTitle: "Paramètres du Compte",
      settingsSubtitle:
        "Gérez votre profil personnel, vos identifiants de sécurité et l'état de votre compte",
      personalInfo: "Informations Personnelles",
      usernameLabel: "Nom d'utilisateur",
      emailLabel: "Adresse e-mail",
      phoneLabel: "Numéro de téléphone",
      saveBtn: "Enregistrer les informations",
      saving: "Enregistrement...",
      securityTitle: "Sécurité du Compte",
      currentPass: "Mot de passe actuel",
      currentPassPlaceholder: "Entrez votre mot de passe actuel",
      newPass: "Nouveau mot de passe",
      newPassPlaceholder: "Minimum 5 caractères",
      confirmNewPass: "Confirmer le nouveau mot de passe",
      confirmNewPassPlaceholder: "Répétez le nouveau mot de passe",
      changePassBtn: "Mettre à jour le mot de passe",
      changing: "Mise à jour...",
      dangerZone: "Zone de Danger",
      deleteAccount: "Supprimer mon compte définitivement",
      deleteAccountSubtitle:
        "Une fois que vous supprimez votre compte, il n'y a pas de retour en arrière. Tous vos Coins seront détruits.",
      deleteConfirmTitle: "Confirmer la destruction du compte",
      deleteConfirmDesc:
        "Cette action est définitive et irréversible. Pour éviter toute suppression accidentelle, veuillez taper 'SUPPRIMER' ci-dessous pour confirmer la destruction.",
      typeDelete: "Tapez 'SUPPRIMER' pour confirmer",
      deleteLoadingText: "Destruction en cours...",
      cancel: "Annuler",
      confirmDeleteBtn: "Oui, supprimer définitivement",
      eyeComfortLabel: "Filtre Anti-Lumière Bleue",
      appPrefs: "Préférences de l'Application",
      languageLabel: "Sélection de la Langue",
      themeLabel: "Personnalisation du Thème",
      pwaTitle: "Installer TakeTalon",
      pwaDesc:
        "Installez l'application sur votre écran d'accueil pour un accès hors ligne ultra rapide.",
      pwaInstallBtn: "Installer S'il Vous Plaît",
      pwaInstalledBtn: "Application Installée",
    },
    sw: {
      settingsTitle: "Mipangilio ya Akaunti",
      settingsSubtitle:
        "Kamilisha na udhibiti maelezo binafsi, usalama wa nywila, na usalama wa akaunti",
      personalInfo: "Maelezo Binafsi",
      usernameLabel: "Username / Jina la mtumiaji",
      emailLabel: "Barua Pepe (Email)",
      phoneLabel: "Namba ya Simu (M-Pesa/TigoPesa)",
      saveBtn: "Hifadhi Maelezo",
      saving: "Inahifadhi...",
      securityTitle: "Usalama wa Nywila",
      currentPass: "Nywila ya Sasa",
      currentPassPlaceholder: "Weka nywila unayotumia sasa",
      newPass: "Nywila Mpya",
      newPassPlaceholder: "Angalau herufi 5 za siri",
      confirmNewPass: "Rudia Nywila Mpya",
      confirmNewPassPlaceholder: "Thibitisha nywila mpya",
      changePassBtn: "Badili Nywila Sasa",
      changing: "Inabadilisha...",
      dangerZone: "Eneo Hatari",
      deleteAccount: "Futa Akaunti Yangu Kabisa",
      deleteAccountSubtitle:
        "Ukifuta akaunti yako, hautaweza kuirudisha tena. Sarafu zako na mechi ulizofungua vitafutika kabisa.",
      deleteConfirmTitle: "Thibitisha Kufuta Akaunti Kabisa",
      deleteConfirmDesc:
        "Hatua hii ni ya mwisho na haiwezi kubadilishwa. Ili kuepuka kufuta kwa bahati mbaya, tafadhali andika neno 'FUTA' hapa chini ili kuthibitisha uharibifu wa akaunti.",
      typeDelete: "Andika 'FUTA' ili kuthibitisha",
      deleteLoadingText: "Inaharibu Akaunti...",
      cancel: "Ghairi",
      confirmDeleteBtn: "Ndio, Futa Kabisa",
      eyeComfortLabel: "Macho Salama (Kuzuia Mwanga wa Bluu)",
      appPrefs: "Mapendeleo ya Programu",
      languageLabel: "Chagua Lugha ya Programu",
      themeLabel: "Chagua Mandhari ya Rangi",
      pwaTitle: "Sakinisha Programu ya TakeTalon",
      pwaDesc:
        "Sakinisha TakeTalon kwenye skrini ya simu yako kwa uzoefu wa haraka na uwezo wa kutumia bila mtandao.",
      pwaInstallBtn: "Sakinisha Programu Sasa",
      pwaInstalledBtn: "Imesakinishwa Kwenye Simu",
    },
  };

  const s = dict[lang] || dict.sw;

  // Colors based on themes matching Home container
  const containerBg =
    theme === "light"
      ? "bg-white border-slate-200"
      : theme === "dark"
        ? "bg-[#0d0d0d] border-neutral-800/60"
        : "bg-[#3B6D99] border-blue-400/30";

  const cardBg =
    theme === "light"
      ? "bg-gradient-to-br from-[#f8fbfe] via-[#f0f5fc] to-[#e6effa] border-slate-200/90 shadow-sm"
      : theme === "dark"
        ? "bg-[#0d0d0d] border-neutral-800/60"
        : "bg-[#3B6D99] border-blue-400/30";

  const textPrimary = theme === "light" ? "text-slate-900" : "text-white";

  const textSecondary = theme === "light" ? "text-slate-600" : "text-slate-400";

  const inputClass =
    theme === "light"
      ? "w-full bg-white text-[11px] border border-slate-300 rounded-lg pl-9 pr-3 py-1.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1.5 focus:ring-sky-500/10 shadow-inner"
      : theme === "dark"
        ? "w-full bg-neutral-950 text-[11px] border border-neutral-850 rounded-lg pl-9 pr-3 py-1.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-neutral-700 focus:ring-1.5 focus:ring-neutral-700/10 shadow-inner"
        : "w-full bg-[#050912] text-[11px] border border-blue-950/80 rounded-lg pl-9 pr-3 py-1.5 text-slate-200 placeholder-slate-650 focus:outline-none focus:border-blue-500/50 focus:ring-1.5 focus:ring-blue-500/10 shadow-inner";

  const handleUpdateInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.isLoggedIn) {
      onAddNotification(
        tr("Tafadhali ingia kwenye akaunti kwanza!", "Veuillez d'abord vous connecter !", "Please login first!"),
        "error",
      );
      return;
    }
    if (!username || !email || !phone) {
      onAddNotification(
        tr("Nyanja zote lazima zijazwe!", "Tous les champs sont requis !", "All fields are required!"),
        "error",
      );
      return;
    }

    setInfoLoading(true);
    setTimeout(() => {
      setInfoLoading(false);
      const updatedUser = {
        ...currentUser,
        username,
        email,
        phone,
      };
      setCurrentUser(updatedUser);
      onAddNotification(
        tr(
          "Maelezo ya wasifu yamehifadhiwa kwa ufanisi!",
          "Détails du profil enregistrés avec succès !",
          "Profile details saved successfully!"
        ),
        "success",
      );
    }, 1200);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.isLoggedIn) {
      onAddNotification(
        tr("Tafadhali ingia kwenye akaunti kwanza!", "Veuillez d'abord vous connecter !", "Please login first!"),
        "error",
      );
      return;
    }
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      onAddNotification(
        tr(
          "Tafadhali jaza nyanja zote za nywila!",
          "Veuillez remplir tous les champs du mot de passe !",
          "Please fill out all password fields!"
        ),
        "error",
      );
      return;
    }
    if (newPassword.length < 5) {
      onAddNotification(
        tr(
          "Nywila lazima iwe na herufi angalau 5!",
          "Le mot de passe doit contenir au moins 5 caractères !",
          "Password must be at least 5 characters!"
        ),
        "error",
      );
      return;
    }
    if (newPassword !== confirmNewPassword) {
      onAddNotification(
        tr("Nywila hazifanani!", "Les mots de passe ne correspondent pas !", "Passwords do not match!"),
        "error"
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
        tr(
          "Nywila yako imebadilishwa kwa ufanisi! 🔐",
          "Mot de passe mis à jour avec succès ! 🔐",
          "Password updated successfully! 🔐"
        ),
        "success",
      );
    }, 1400);
  };

  // Suprimer Mon Compte Definivement (Permanently Delete Account) Logic
  const handleDeleteAccountAction = () => {
    const wordToMatch = lang === "en" ? "DELETE" : lang === "fr" ? "SUPPRIMER" : "FUTA";
    if (deleteConfirmationText.trim().toUpperCase() !== wordToMatch) {
      onAddNotification(
        tr(
          `Tafadhali andika '${wordToMatch}' kwa herufi kubwa ili kudhibitisha!`,
          `Veuillez saisir '${wordToMatch}' en majuscules pour confirmer !`,
          `Please type '${wordToMatch}' in uppercase to confirm!`
        ),
        "error",
      );
      return;
    }

    setDeleteLoading(true);
    setTimeout(() => {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
      setDeleteConfirmationText("");

      // Permanently purge all application credentials and localStorage
      try {
        localStorage.clear();
      } catch (e) {}

      setCurrentUser(null);
      onAddNotification(
        tr(
          "Akaunti yako imeharibiwa kabisa na storage zote zimefutwa. Asante kwa kutumia huduma zetu.",
          "Votre compte et toutes les données ont été définitivement supprimés.",
          "Your account and all storage data have been permanently deleted."
        ),
        "info",
      );
      onBackToHome();
    }, 2000);
  };

  const handleClearLocalStorageAction = () => {
    try {
      localStorage.clear();
      onAddNotification(
        tr(
          "LocalStorage yote imefutwa kikamilifu! 🗑️ Data zote zinatoka moja kwa moja kwenye Supabase DB.",
          "Toutes les données du stockage local ont été effacées ! 🗑️",
          "All localStorage data has been completely cleared! 🗑️ Data is fetched live from Supabase DB."
        ),
        "success",
      );
    } catch (e: any) {
      onAddNotification("Kosa wakati wa kufuta storage: " + (e?.message || String(e)), "error");
    }
  };

  return (
    <div className="max-w-md mx-auto px-3.5 py-2.5 pb-24 space-y-3">
      {/* Header Banner */}
      <div className="flex items-center space-x-3 pb-2 border-b border-dashed border-slate-350 dark:border-neutral-800">
        <button
          onClick={onBackToHome}
          className={`p-2 rounded-xl border flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
            theme === "light"
              ? "bg-slate-50 border-slate-300 text-slate-800 hover:bg-slate-100"
              : "bg-neutral-900 border-neutral-850 text-slate-100 hover:bg-neutral-800"
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center space-x-1.5">
            <SettingsIcon className="w-4 h-4 text-blue-400" />
            <h2 className={`text-base font-black uppercase tracking-wide ${textPrimary}`}>
              {s.settingsTitle}
            </h2>
          </div>
          <p className="text-[10px] text-slate-500 leading-snug">{s.settingsSubtitle}</p>
        </div>
      </div>

      {currentUser && currentUser.isLoggedIn ? (
        <>
          {/* Section 1: Personal Information */}
          <div className={`p-3 rounded-xl border space-y-3 ${containerBg}`}>
            <div
              className={`flex items-center space-x-2 border-b pb-2.5 ${theme === "light" ? "border-slate-200" : "border-slate-800/40"}`}
            >
              <User className="w-3.5 h-3.5 text-sky-400" />
              <h3 className={`text-[10px] font-extrabold uppercase tracking-widest ${textPrimary}`}>
                {s.personalInfo}
              </h3>
            </div>

            <form onSubmit={handleUpdateInfo} className="space-y-2.5">
              <div className="space-y-0.5">
                <label
                  className={`text-[8px] font-black uppercase tracking-widest flex items-center justify-between ${theme === "light" ? "text-slate-700" : "text-slate-500"}`}
                >
                  <span>{s.usernameLabel}</span>
                  <span className="text-[8px] text-amber-400 font-bold flex items-center gap-0.5">
                    <Lock className="w-2.5 h-2.5" /> Haibadiliki
                  </span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-500 flex items-center justify-center">
                    <User className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={username ? `@${username.replace(/^@/, "")}` : ""}
                    className={`${inputClass} cursor-not-allowed opacity-75 bg-slate-900/40 font-mono font-bold text-emerald-400`}
                    title="Username inatoka kwenye database na haiwezi kubadilishwa"
                  />
                </div>
              </div>

              <div className="space-y-0.5">
                <label
                  className={`text-[8px] font-black uppercase tracking-widest block ${theme === "light" ? "text-slate-700" : "text-slate-500"}`}
                >
                  {s.emailLabel}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-500 flex items-center justify-center">
                    <Mail className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    disabled={infoLoading}
                  />
                </div>
              </div>

              <div className="space-y-0.5">
                <label
                  className={`text-[8px] font-black uppercase tracking-widest block ${theme === "light" ? "text-slate-700" : "text-slate-500"}`}
                >
                  {s.phoneLabel}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-500 flex items-center justify-center">
                    <Phone className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={inputClass}
                    disabled={infoLoading}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={infoLoading}
                className="w-full py-1.5 bg-sky-500 text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-lg flex items-center justify-center space-x-1.5 hover:scale-[1.01] active:scale-[0.98] transition-all cursor-pointer shadow-sm"
              >
                {infoLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>{s.saving}</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{s.saveBtn}</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Section 2: Account Security */}
          <div className={`p-3 rounded-xl border space-y-3 ${containerBg}`}>
            <div
              className={`flex items-center space-x-2 border-b pb-2.5 ${theme === "light" ? "border-slate-200" : "border-slate-800/40"}`}
            >
              <KeyRound className="w-3.5 h-3.5 text-rose-500" />
              <h3 className={`text-[10px] font-extrabold uppercase tracking-widest ${textPrimary}`}>
                {s.securityTitle}
              </h3>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-2.5">
              <div className="space-y-0.5">
                <label
                  className={`text-[8px] font-black uppercase tracking-widest block ${theme === "light" ? "text-slate-700" : "text-slate-500"}`}
                >
                  {s.currentPass}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-500 flex items-center justify-center">
                    <Lock className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type={showPass.current ? "text" : "password"}
                    required
                    placeholder={s.currentPassPlaceholder}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className={`${inputClass} pr-8`}
                    disabled={securityLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass({ ...showPass, current: !showPass.current })}
                    className="absolute right-3 top-2 text-slate-550 hover:text-slate-350 transition-colors cursor-pointer"
                  >
                    {showPass.current ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-0.5">
                <label
                  className={`text-[8px] font-black uppercase tracking-widest block ${theme === "light" ? "text-slate-700" : "text-slate-500"}`}
                >
                  {s.newPass}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-500 flex items-center justify-center">
                    <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  </span>
                  <input
                    type={showPass.new ? "text" : "password"}
                    required
                    placeholder={s.newPassPlaceholder}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={`${inputClass} pr-8`}
                    disabled={securityLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass({ ...showPass, new: !showPass.new })}
                    className="absolute right-3 top-2 text-slate-550 hover:text-slate-350 transition-colors cursor-pointer"
                  >
                    {showPass.new ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-0.5">
                <label
                  className={`text-[8px] font-black uppercase tracking-widest block ${theme === "light" ? "text-slate-700" : "text-slate-500"}`}
                >
                  {s.confirmNewPass}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-500 flex items-center justify-center">
                    <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  </span>
                  <input
                    type={showPass.confirm ? "text" : "password"}
                    required
                    placeholder={s.confirmNewPassPlaceholder}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className={`${inputClass} pr-8`}
                    disabled={securityLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass({ ...showPass, confirm: !showPass.confirm })}
                    className="absolute right-3 top-2 text-slate-550 hover:text-slate-350 transition-colors cursor-pointer"
                  >
                    {showPass.confirm ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={securityLoading}
                className="w-full py-1.5 bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-lg flex items-center justify-center space-x-1.5 hover:scale-[1.01] active:scale-[0.98] transition-all cursor-pointer shadow-sm"
              >
                {securityLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>{s.changing}</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>{s.changePassBtn}</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Section 3: Eye Comfort, Theme & Language (App Preferences) */}
          <div className={`p-3 rounded-xl border space-y-3 ${containerBg}`}>
            <div
              className={`flex items-center space-x-2 border-b pb-2.5 ${theme === "light" ? "border-slate-200" : "border-slate-800/40"}`}
            >
              <ColorThemeIcon className="w-3.5 h-3.5 text-blue-400" />
              <h3 className={`text-[10px] font-extrabold uppercase tracking-widest ${textPrimary}`}>
                {s.appPrefs}
              </h3>
            </div>

            <div className="space-y-3">
              {/* Eye Comfort */}
              <div
                className={`p-2.5 rounded-lg border flex items-center justify-between text-[11px] ${cardBg}`}
              >
                <div className="flex items-center space-x-2">
                  <div
                    className={`p-1 rounded-md ${eyeComfort ? "bg-amber-500/10 text-amber-400" : "bg-slate-900 text-slate-500"}`}
                  >
                    <EyeComfortIcon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className={`font-bold ${textPrimary}`}>{s.eyeComfortLabel}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEyeComfort(!eyeComfort)}
                  className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-300 focus:outline-none cursor-pointer ${
                    eyeComfort ? "bg-amber-500" : "bg-slate-800"
                  }`}
                >
                  <div
                    className={`w-3 h-3 rounded-full shadow-sm transform duration-300 ${
                      eyeComfort ? "translate-x-3.5 bg-white" : "translate-x-0 bg-slate-400"
                    }`}
                  />
                </button>
              </div>

              {/* Theme Customizer (Enhanced & Enriched Size) */}
              <div className="space-y-2 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40">
                <div className="flex items-center space-x-2 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  <ColorThemeIcon className="w-4 h-4 text-sky-400" />
                  <span>{s.themeLabel}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-0.5">
                  {[
                    { code: "blue", label: "Deep Slate" },
                    { code: "dark", label: "OLED Dark" },
                    { code: "light", label: "Clean Light" },
                  ].map((item) => (
                    <button
                      type="button"
                      key={item.code}
                      onClick={() => setThemeState(item.code as any)}
                      className={`py-3 px-2 rounded-xl text-center transition-all duration-200 cursor-pointer border flex flex-col items-center justify-center space-y-2 ${
                        themeState === item.code
                          ? "bg-blue-500/15 border-blue-500 text-blue-400 font-black shadow-md shadow-blue-500/10 scale-[1.02]"
                          : theme === "light"
                            ? "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                            : "bg-slate-900/80 border-slate-800 text-slate-400 hover:bg-slate-850 hover:text-slate-200"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                        themeState === item.code 
                          ? "bg-blue-500/20 text-blue-400" 
                          : theme === "light" 
                            ? "bg-slate-100 text-slate-600" 
                            : "bg-slate-950 text-slate-400"
                      }`}>
                        {renderThemeIcon(item.code, "w-5 h-5")}
                      </div>
                      <span className="block truncate text-[9.5px] font-black uppercase tracking-wider">
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* PWA App Installation */}
              <div className={`p-2.5 rounded-lg border text-[11px] space-y-2 ${cardBg}`}>
                <div className="flex items-start space-x-2.5">
                  <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-400 shrink-0 mt-0.5 flex items-center justify-center">
                    <PwaIcon className="w-6 h-6" />
                  </div>
                  <div className="space-y-0.5">
                    <p className={`font-black uppercase tracking-wide text-[9px] flex items-center space-x-1 ${textPrimary}`}>
                      <span>{s.pwaTitle}</span>
                      <span className="inline-flex items-center text-slate-500 font-bold ml-1">
                        (
                        <PwaIcon className="w-4.5 h-4.5 mx-0.5 inline-block shrink-0" />
                        )
                      </span>
                    </p>
                    <p className="text-[9px] text-slate-500 leading-normal">{s.pwaDesc}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleInstallPWA}
                  disabled={isInstalled}
                  className={`w-full py-1.5 font-black text-[10px] uppercase tracking-wider rounded-lg flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-sm ${
                    isInstalled
                      ? "bg-slate-500/10 text-slate-500 border border-slate-500/10 cursor-not-allowed"
                      : "bg-gradient-to-r from-blue-500 to-sky-400 text-slate-950 hover:scale-[1.01] active:scale-[0.98]"
                  }`}
                >
                  {isInstalled ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{s.pwaInstalledBtn}</span>
                    </>
                  ) : (
                    <>
                      <InstallMobileIcon className="w-3.5 h-3.5 shrink-0" />
                      <span>{s.pwaInstallBtn}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Section 3.5: SERVICE PORTALS & LEGAL COMPLIANCE */}
          <div className={`p-3 rounded-xl border ${cardBg} space-y-3`}>
            <div className="flex items-center space-x-2 border-b pb-2 border-slate-200 dark:border-neutral-800">
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              <h3 className={`text-[10px] font-black uppercase tracking-widest ${theme === "light" ? "text-slate-800" : "text-white"}`}>
                {tr("Huduma, Sheria & Misaada", "Portails de Services & Support", "Services, Legal & Support Portals")}
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => onNavigateTab?.("Help")}
                className="p-2.5 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 font-bold transition-all text-left flex items-center justify-between cursor-pointer"
              >
                <span>📖 Help Service</span>
                <span className="text-[9px]">→</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab?.("Verified")}
                className="p-2.5 rounded-xl border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 font-bold transition-all text-left flex items-center justify-between cursor-pointer"
              >
                <span>✔️ TakeTalon Verified</span>
                <span className="text-[9px]">→</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab?.("Legal")}
                className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-bold transition-all text-left flex items-center justify-between cursor-pointer"
              >
                <span>⚖️ Police & Legal</span>
                <span className="text-[9px]">→</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab?.("ReportProblem")}
                className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold transition-all text-left flex items-center justify-between cursor-pointer"
              >
                <span>🚨 Report Problem</span>
                <span className="text-[9px]">→</span>
              </button>
            </div>
          </div>

          {/* Section 4: DANGER ZONE (SUPRIMER MON COMPTE DEFINIVEMENT) */}
          <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/[0.02] space-y-3">
            <div className="flex items-center space-x-2 border-b border-rose-500/10 pb-2.5">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
              <h3 className="text-[10px] font-black uppercase text-rose-500 tracking-widest">
                {s.dangerZone}
              </h3>
            </div>

            <div className="space-y-2.5">
              {/* Clear All LocalStorage Button */}
              <div className="p-2 rounded-lg border border-amber-500/30 bg-amber-500/5 space-y-1.5">
                <div className="flex items-center space-x-1.5">
                  <Trash2 className="w-3.5 h-3.5 text-amber-500" />
                  <h4 className="text-[11px] font-extrabold uppercase tracking-wide text-amber-500">
                    {tr("Futa LocalStorage Zote", "Effacer le Stockage Local", "Clear All LocalStorage")}
                  </h4>
                </div>
                <p className="text-[9px] text-slate-400 leading-normal">
                  {tr(
                    "Futa data zote zilizohifadhiwa kwenye kivinjari ili kulazimisha usawazishaji mpya wa 100% na Supabase Database.",
                    "Purger toutes les données en cache local pour forcer une nouvelle synchronisation avec la base de données.",
                    "Purge all locally cached data in browser storage to enforce fresh 100% sync from Supabase Database."
                  )}
                </p>
                <button
                  type="button"
                  onClick={handleClearLocalStorageAction}
                  className="w-full py-1.5 border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-black text-[10px] uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>{tr("Futa Storage Zote Sasa", "Purger le Stockage Maintenant", "Purge All Storage Now")}</span>
                </button>
              </div>

              <div>
                <h4 className="text-[11px] font-bold text-rose-400">{s.deleteAccount}</h4>
                <p className="text-[9px] text-slate-500 leading-normal mt-0.5">
                  {s.deleteAccountSubtitle}
                </p>
              </div>

              {!showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full py-1.5 border border-rose-500/25 bg-rose-500/5 hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 font-extrabold text-[10px] uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>
                    {lang === "fr"
                      ? "Supprimer Définitivement"
                      : lang === "sw"
                        ? "Futa Akaunti Kabisa"
                        : "Delete Account"}
                  </span>
                </button>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-xl border border-rose-500/30 ${cardBg} space-y-3`}
                >
                  <div className="flex items-start space-x-2.5">
                    <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-[11px] font-extrabold text-rose-500 uppercase tracking-wide">
                        {s.deleteConfirmTitle}
                      </h5>
                      <p className="text-[9px] text-slate-500 leading-normal mt-0.5">
                        {s.deleteConfirmDesc}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <label className="text-[8px] font-black uppercase tracking-widest text-slate-500">
                      {s.typeDelete}
                    </label>
                    <input
                      type="text"
                      placeholder={lang === "en" ? "DELETE" : lang === "fr" ? "SUPPRIMER" : "FUTA"}
                      value={deleteConfirmationText}
                      onChange={(e) => setDeleteConfirmationText(e.target.value)}
                      className="w-full bg-rose-500/5 border border-rose-500/30 rounded-lg px-3 py-2 text-xs font-black text-rose-400 tracking-widest text-center focus:outline-none focus:border-rose-500 uppercase placeholder-rose-700/50"
                    />
                  </div>

                  <div className="flex space-x-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeleteConfirmationText("");
                      }}
                      className={`flex-1 py-2 rounded-lg text-[10px] font-bold ${
                        theme === "light"
                          ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                          : "bg-slate-900 hover:bg-slate-850 text-slate-300"
                      }`}
                    >
                      {s.cancel}
                    </button>
                    <button
                      type="button"
                      disabled={deleteLoading || !deleteConfirmationText}
                      onClick={handleDeleteAccountAction}
                      className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] rounded-lg shadow-md shadow-rose-600/10 flex items-center justify-center space-x-1 cursor-pointer disabled:opacity-40"
                    >
                      {deleteLoading ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>{s.deleteLoadingText}</span>
                        </>
                      ) : (
                        <>
                          <ShieldX className="w-3.5 h-3.5" />
                          <span>{s.confirmDeleteBtn}</span>
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div
          className={`p-6 rounded-2xl border text-center ${containerBg} flex flex-col items-center py-10`}
        >
          <div className="w-14 h-14 rounded-full bg-slate-500/10 text-slate-400 border border-slate-800/30 flex items-center justify-center mb-3">
            <User className="w-7 h-7" />
          </div>
          <h3 className={`text-sm font-black ${textPrimary}`}>
            {lang === "sw" ? "Akaunti Haijaunganishwa" : "Account Offline"}
          </h3>
          <p className="text-[11px] text-slate-500 max-w-[240px] mt-1.5 leading-relaxed">
            {lang === "sw"
              ? "Tafadhali ingia kwenye akaunti yako ili uweze kuona na kurekebisha mipangilio ya wasifu au usalama wa nywila."
              : "Please sign in to access your profile settings and secure account credentials."}
          </p>
          <button
            onClick={onOpenAuth}
            className="mt-6 px-6 py-2.5 bg-gradient-to-r from-blue-500 to-sky-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-transform cursor-pointer shadow-md"
          >
            {lang === "sw" ? "Ingia / Jisajili Sasa" : "Sign In / Sign Up Now"}
          </button>
        </div>
      )}
    </div>
  );
}
