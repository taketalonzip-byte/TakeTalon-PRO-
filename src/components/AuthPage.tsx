/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import {
  getFreshRegisterDraft,
  REGISTER_DRAFT_KEY,
  removeRegisterDraft,
} from "../lib/registerDraftStorage";
import {
  X,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  ChevronRight,
  Phone,
  Send,
  AlertCircle,
  Clock,
  Check,
  ChevronDown,
  ShieldCheck,
  User,
  KeyRound,
  UserCheck,
} from "lucide-react";

const OTP_VALIDITY_MS = 10 * 60 * 1000;
const AUTH_REQUEST_TIMEOUT_MS = 90_000;

function isAuthRequestAbort(error: unknown): boolean {
  const candidate = error as { name?: string; message?: string } | null;
  return candidate?.name === "AbortError" || candidate?.name === "TimeoutError" || /signal is aborted|aborted without reason|timed out|timeout/i.test(candidate?.message || "");
}

async function fetchAuthRequest(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(new DOMException("TakeTalon auth request timed out", "TimeoutError")),
    AUTH_REQUEST_TIMEOUT_MS,
  );
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

type RegisterDraft = {
  regStep: 1 | 2 | 3;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  gender: "MALE" | "FEMALE" | "OTHER" | "";
  birthday: string;
  acceptTerms: boolean;
  otpSentAt?: number;
  otpVerifiedAt?: number;
  updatedAt: number;
};

export interface AuthPageProps {
  isOpen?: boolean;
  onClose: () => void;
  theme: "light" | "dark" | "blue";
  onAuthSuccess: (user: { username: string; email: string; phone: string; role?: string }) => void;
  onNotification?: (message: string, type?: "success" | "error" | "info") => void;
  initialMode?: "login" | "register" | "forgot";
  lang?: string;
}

const AUTH_LOGO_URL = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL.replace(/\/+$/, "")}/storage/v1/object/public/esports-images/tt-logo.png`
  : "/tt-logo.png";

const dictionary = {
  en: {
    back: "Back",
    secureAuth: "TakeTalon",
    loginTab: "Log In",
    registerTab: "Register",
    forgotTab: "Reset Password",
    loginTitle: "Log In",
    loginDesc: "Enter your details to continue.",
    usernameOrEmail: "Phone, Email or Username",
    password: "Password",
    forgotPassword: "Forgot password?",
    loadingLogin: "Logging in...",
    loginBtn: "Log In",
    dontHaveAccount: "Don't have an account?",
    registerSasa: "Register",
    registerTitleStep1: "Personal Details",
    registerTitleStep2: "Verify Email (OTP)",
    registerTitleStep3: "Set Password",
    registerDesc: "Create your account to continue.",
    firstNamePlaceholder: "First Name",
    lastNamePlaceholder: "Last Name",
    phonePlaceholder: "Phone Number",
    emailPlaceholder: "Email Address",
    passwordMin: "Password (Min 8 chars)",
    confirmPassword: "Confirm Password",
    termsCheckbox: "I agree to Terms & Conditions.",
    termsLinkText: "Terms",
    alreadyHaveAccount: "Already have an account?",
    loginHere: "Log In",
    forgotTitle: "Reset Password",
    forgotDesc: "Enter your email to receive a password reset link.",
    enterEmail: "Email Address",
    loadingForgot: "Sending...",
    sendForgotBtn: "Send Code",
    backToLogin: "Back to Log In",

    // Validation & Messages
    valEmptyLogin: "Please enter your username/email/phone and password!",
    valEmptyRegister: "Please fill in all fields to create your account!",
    valPhoneRequired: "Please enter your phone number!",
    valInvalidEmail: "Please enter a valid email address!",
    valPasswordLength: "Your password must be at least 8 characters long!",
    valPasswordMismatch: "Passwords do not match! Please check again.",
    valAcceptTerms: "You must agree to the terms and conditions to join!",
    valInvalidForgot: "Please enter a valid email to receive password recovery details!",
    valFirstNameRequired: "Please enter your first name!",
    valLastNameRequired: "Please enter your last name!",
    valUnder18: "Registration is restricted to users who are 18 years or older.",

    // Success
    successLogin: "Successfully logged in! Welcome back.",
    successForgot: "Reset link has been sent to email: ",
  },
  sw: {
    back: "Rudi",
    secureAuth: "TakeTalon",
    loginTab: "Ingia",
    registerTab: "Jisajili",
    forgotTab: "Weka Upya",
    loginTitle: "Ingia",
    loginDesc: "Weka taarifa zako kuendelea.",
    usernameOrEmail: "Simu, Barua pepe au Jina",
    password: "Nywila",
    forgotPassword: "Umesahau nywila?",
    loadingLogin: "Inaingia...",
    loginBtn: "Ingia",
    dontHaveAccount: "Huna akaunti?",
    registerSasa: "Jisajili Sasa",
    registerTitleStep1: "Taarifa Binafsi",
    registerTitleStep2: "Thibitisha OTP",
    registerTitleStep3: "Weka Nywila",
    registerDesc: "Unda akaunti yako kuendelea.",
    firstNamePlaceholder: "Jina la Kwanza",
    lastNamePlaceholder: "Jina la Ukoo",
    phonePlaceholder: "Namba ya Simu",
    emailPlaceholder: "Barua Pepe",
    passwordMin: "Nywila (Herufi 8+)",
    confirmPassword: "Thibitisha Nywila",
    termsCheckbox: "Ninakubali Vigezo na Masharti.",
    termsLinkText: "Vigezo",
    alreadyHaveAccount: "Tayari una akaunti?",
    loginHere: "Ingia",
    forgotTitle: "Weka Upya Nywila",
    forgotDesc: "Weka barua pepe yako kupokea kiungo cha nywila.",
    enterEmail: "Barua Pepe",
    loadingForgot: "Inatuma...",
    sendForgotBtn: "Tuma Namba",
    backToLogin: "Rudi Kuingia",

    // Validation & Messages
    valEmptyLogin: "Tafadhali jaza taarifa na nywila yako!",
    valEmptyRegister: "Tafadhali jaza taarifa zote!",
    valPhoneRequired: "Tafadhali weka namba yako ya simu!",
    valInvalidEmail: "Tafadhali weka barua pepe sahihi!",
    valPasswordLength: "Nywila lazima iwe na herufi 8 au zaidi!",
    valPasswordMismatch: "Nywila hazifanani! Tafadhali hakiki.",
    valAcceptTerms: "Kubali vigezo na masharti kuendelea!",
    valInvalidForgot: "Weka barua pepe sahihi!",
    valFirstNameRequired: "Weka jina lako la kwanza!",
    valLastNameRequired: "Weka jina lako la ukoo!",
    valUnder18: "Usajili unaruhusiwa kwa wenye umri wa miaka 18+.",

    // Success
    successLogin: "Umeingia kwa ufanisi!",
    successForgot: "Kiungo cha kufufua nywila kimetumwa kwa: ",
  },
  fr: {
    back: "Retour",
    secureAuth: "TakeTalon",
    loginTab: "Connexion",
    registerTab: "S'inscrire",
    forgotTab: "Réinitialiser",
    loginTitle: "Connexion",
    loginDesc: "Entrez vos informations pour continuer.",
    usernameOrEmail: "Téléphone, E-mail ou Nom",
    password: "Mot de passe",
    forgotPassword: "Mot de passe oublié?",
    loadingLogin: "Connexion...",
    loginBtn: "Connexion",
    dontHaveAccount: "Pas de compte?",
    registerSasa: "S'inscrire",
    registerTitleStep1: "Détails du compte",
    registerTitleStep2: "Vérifier l'OTP",
    registerTitleStep3: "Mot de passe",
    registerDesc: "Créez votre compte pour continuer.",
    firstNamePlaceholder: "Prénom",
    lastNamePlaceholder: "Nom de famille",
    phonePlaceholder: "Numéro de téléphone",
    emailPlaceholder: "Adresse e-mail",
    passwordMin: "Mot de passe (Min 8 car.)",
    confirmPassword: "Confirmer le mot de passe",
    termsCheckbox: "J'accepte les Conditions Générales.",
    termsLinkText: "Conditions",
    alreadyHaveAccount: "Vous avez déjà un compte?",
    loginHere: "Connexion",
    forgotTitle: "Réinitialiser",
    forgotDesc: "Saisissez votre e-mail pour recevoir un lien.",
    enterEmail: "Adresse e-mail",
    loadingForgot: "Envoi...",
    sendForgotBtn: "Envoyer le code",
    backToLogin: "Retour à la connexion",

    // Validation & Messages
    valEmptyLogin: "Veuillez entrer vos identifiants !",
    valEmptyRegister: "Veuillez remplir tous les champs !",
    valPhoneRequired: "Veuillez entrer votre numéro de téléphone !",
    valInvalidEmail: "Veuillez entrer une adresse e-mail valide !",
    valPasswordLength: "Votre mot de passe doit comporter au moins 8 caractères !",
    valPasswordMismatch: "Les mots de passe ne correspondent pas !",
    valAcceptTerms: "Vous devez accepter les conditions générales !",
    valInvalidForgot: "Veuillez entrer un e-mail valide !",
    valFirstNameRequired: "Veuillez entrer votre prénom !",
    valLastNameRequired: "Veuillez entrer votre nom de famille !",
    valUnder18: "L'inscription est réservée aux utilisateurs de 18 ans et plus.",

    // Success
    successLogin: "Connexion réussie !",
    successForgot: "Le lien de réinitialisation a été envoyé : ",
  },
};

export default function AuthPage({
  isOpen = true,
  onClose,
  theme,
  onAuthSuccess,
  onNotification,
  initialMode = "login",
  lang = "sw",
}: AuthPageProps) {
  // Mode state: login | register | forgot
  const [mode, setMode] = useState<"login" | "register" | "forgot">(initialMode);

  // Login fields
  const [loginId, setLoginId] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Registration Multi-Step state (1 | 2 | 3)
  const [regStep, setRegStep] = useState<1 | 2 | 3>(1);

  // Step 1 Registration Fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [retypePassword, setRetypePassword] = useState("");

  // Step 2 OTP Verification State
  const [otpCode, setOtpCode] = useState("");
  const [otpExpirySeconds, setOtpExpirySeconds] = useState(600);
  const [cooldownSeconds, setCooldownSeconds] = useState(60);
  const [resendsRemaining, setResendsRemaining] = useState(3);
  const [attemptsRemaining, setAttemptsRemaining] = useState(5);
  const [otpSentAt, setOtpSentAt] = useState<number | null>(null);
  const [otpVerifiedAt, setOtpVerifiedAt] = useState<number | null>(null);

  // Step 3 Finalization State
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "OTHER" | "">("");
  const [isGenderOpen, setIsGenderOpen] = useState(false);
  const genderRef = useRef<HTMLDivElement>(null);
  const [birthday, setBirthday] = useState("");
  const [isBirthdayFocused, setIsBirthdayFocused] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [calculatedAge, setCalculatedAge] = useState<number | null>(null);

  // Form general states
  const [showPassword, setShowPassword] = useState(false);
  const [showRetypePassword, setShowRetypePassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Supabase server connection diagnostics
  const [supabaseStatus, setSupabaseStatus] = useState<{
    checking: boolean;
    status: "ONLINE" | "TIMEOUT_OR_UNREACHABLE" | "NOT_CHECKED" | "DB_ERROR";
    message?: string;
    latencyMs?: number;
  }>({
    checking: false,
    status: "NOT_CHECKED",
  });

  const checkSupabaseServer = async () => {
    setSupabaseStatus((prev) => ({ ...prev, checking: true }));
    try {
      const res = await fetch("/api/supabase/status");
      const data = await res.json();
      setSupabaseStatus({
        checking: false,
        status: data?.status || (data?.ok ? "ONLINE" : "TIMEOUT_OR_UNREACHABLE"),
        message: data?.message,
        latencyMs: data?.latencyMs,
      });
    } catch {
      setSupabaseStatus({
        checking: false,
        status: "TIMEOUT_OR_UNREACHABLE",
        message: "Hitilafu ya mtandao kufikia seva ya programu.",
      });
    }
  };

  const activeLang = lang === "sw" || lang === "fr" ? lang : "en";
  const t = dictionary[activeLang];

  // Close custom gender dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (genderRef.current && !genderRef.current.contains(e.target as Node)) {
        setIsGenderOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const restoreRegisterDraft = () => {
    const draft = getFreshRegisterDraft<Partial<RegisterDraft>>();
    if (!draft) {
      resetForm();
      return false;
    }

    const now = Date.now();
    const sentAt = typeof draft.otpSentAt === "number" ? draft.otpSentAt : null;
    const verifiedAt = typeof draft.otpVerifiedAt === "number" ? draft.otpVerifiedAt : null;
    const verifiedOtpIsStillValid = Boolean(verifiedAt && now - verifiedAt < OTP_VALIDITY_MS);
    const savedStep = draft.regStep === 2 || draft.regStep === 3 ? draft.regStep : 1;
    const restoredStep = savedStep === 3 && !verifiedOtpIsStillValid ? 2 : savedStep;

    setRegStep(restoredStep);
    setFirstName(draft.firstName || "");
    setLastName(draft.lastName || "");
    setPhone(draft.phone || "");
    setEmail(draft.email || "");
    setGender(draft.gender || "");
    setBirthday(draft.birthday || "");
    setAcceptTerms(Boolean(draft.acceptTerms));
    setOtpSentAt(sentAt);
    setOtpVerifiedAt(verifiedOtpIsStillValid ? verifiedAt : null);
    setOtpExpirySeconds(sentAt ? Math.max(0, Math.floor((sentAt + OTP_VALIDITY_MS - now) / 1000)) : 600);
    setCooldownSeconds(sentAt ? Math.max(0, Math.floor((sentAt + 60_000 - now) / 1000)) : 60);

    if (savedStep === 3 && !verifiedOtpIsStillValid) {
      setError("OTP yako imeisha. Tafadhali tuma OTP mpya na uthibitishe tena ili kuendelea.");
    }

    return true;
  };

  // Restore only non-sensitive registration information after refresh/reconnect.
  useEffect(() => {
    if (initialMode !== "register") {
      setMode("login");
      resetForm();
      return;
    }

    setMode("register");
    restoreRegisterDraft();
  }, [initialMode]);

  // Persist only non-sensitive registration fields and current step.
  useEffect(() => {
    if (mode !== "register") return;
    if (![firstName, lastName, phone, email, gender, birthday].some(Boolean)) return;
    const draft: RegisterDraft = {
      regStep,
      firstName,
      lastName,
      phone,
      email,
      gender,
      birthday,
      acceptTerms,
      otpSentAt: otpSentAt || undefined,
      otpVerifiedAt: otpVerifiedAt || undefined,
      updatedAt: Date.now(),
    };
    try {
      window.localStorage.setItem(REGISTER_DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // Storage may be unavailable in private browsing; registration still works normally.
    }
  }, [mode, regStep, firstName, lastName, phone, email, gender, birthday, acceptTerms, otpSentAt, otpVerifiedAt]);

  // Timer effect for OTP step
  useEffect(() => {
    if (mode !== "register" || regStep !== 2) return;

    const interval = setInterval(() => {
      setOtpExpirySeconds((prev) => (prev > 0 ? prev - 1 : 0));
      setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [mode, regStep]);

  // Recalculate age when birthday changes
  useEffect(() => {
    if (!birthday) {
      setCalculatedAge(null);
      return;
    }
    const birthDate = new Date(birthday);
    if (isNaN(birthDate.getTime())) {
      setCalculatedAge(null);
      return;
    }
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    setCalculatedAge(age);
    if (age < 18) {
      setError(t.valUnder18);
    } else {
      setError("");
    }
  }, [birthday, t.valUnder18]);

  const resetForm = () => {
    setLoginId("");
    setLoginPassword("");
    setRegStep(1);
    setFirstName("");
    setLastName("");
    setPhone("");
    setEmail("");
    setPassword("");
    setRetypePassword("");
    setOtpCode("");
    setOtpExpirySeconds(600);
    setCooldownSeconds(60);
    setResendsRemaining(3);
    setAttemptsRemaining(5);
    setOtpSentAt(null);
    setOtpVerifiedAt(null);
    setGender("");
    setBirthday("");
    setAcceptTerms(false);
    setCalculatedAge(null);
    setError("");
    setSuccessMsg("");
    setShowPassword(false);
    setShowRetypePassword(false);
  };

  const handleToggleMode = (newMode: "login" | "register" | "forgot") => {
    setError("");
    setSuccessMsg("");
    setMode(newMode);
    if (newMode === "register") restoreRegisterDraft();
  };

  const validateEmail = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  };

  // ── HANDLE LOGIN SUBMIT ────────────────────────────────────────────────────
  const handleLoginSubmit = async (e: React.FormEvent) => {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
      e.stopPropagation();
    }
    setError("");
    setSuccessMsg("");

    const cleanInput = loginId.trim();
    if (!cleanInput || !loginPassword) {
      setError(t.valEmptyLogin);
      return;
    }

    setLoading(true);

    try {
      if (!isSupabaseConfigured) {
        setError("Mfumo wa Supabase haujasanidiwa vizuri.");
        setLoading(false);
        return;
      }

      // ─────────────────────────────────────────────────────────────────────────
      // HATUA YA 1 (FORMULA STEP 1):
      // Tembelea Supabase profile na uangalie kama akaunti/email ipo
      // ─────────────────────────────────────────────────────────────────────────
      let resolvedEmail = cleanInput.includes("@") ? cleanInput.toLowerCase() : "";
      let foundProfile: any = null;
      let connectionProblem = false;
      let connectionProblemMsg = "";

      try {
        const lookupController = new AbortController();
        const lookupTimeout = setTimeout(() => lookupController.abort(), 5000);

        const lRes = await fetch(
          `/api/auth/profile-lookup?id=${encodeURIComponent(cleanInput)}`,
          { signal: lookupController.signal }
        ).catch((fetchErr: any) => {
          if (fetchErr?.name === "AbortError" || String(fetchErr).includes("abort")) {
            return { ok: false, status: 504, json: async () => ({ isConnectionError: true }) } as any;
          }
          return null;
        });
        clearTimeout(lookupTimeout);

        if (lRes) {
          const lData = await lRes.json().catch(() => null);
          if (lRes.status === 504 || lData?.isConnectionError) {
            connectionProblem = true;
            connectionProblemMsg =
              lData?.error ||
              "Hitilafu ya muunganisho wa seva ya Supabase (Database Timeout). Seva ya Supabase haikujibu kwa wakati.";
          } else if (lData?.profile) {
            foundProfile = lData.profile;
            if (foundProfile.email) {
              resolvedEmail = foundProfile.email.toLowerCase();
            }
          }
        }
      } catch (lErr) {
        console.warn("[LOOKUP-SERVER-NOTICE]", lErr);
      }

      // Ikiwa kuna hitilafu ya muunganisho wa Supabase kwenye hatua ya kwanza, toa taarifa mara moja!
      if (connectionProblem) {
        setSupabaseStatus({
          checking: false,
          status: "TIMEOUT_OR_UNREACHABLE",
          message: "Seva ya Supabase haijajibu (Connection Timeout)",
        });
        setError(
          lang === "sw"
            ? `${connectionProblemMsg} Tafadhali hakiki kama mradi wako wa Supabase upo mtandaoni (Active) kwenye dashibodi ya Supabase na haujapumzishwa (Paused).`
            : "Supabase connection timed out. Please verify that your Supabase project is active and not paused in your Supabase dashboard."
        );
        setLoading(false);
        return;
      }

      // Ikiwa mtumiaji ameingiza username au simu (si email) na haijapatikana:
      if (!cleanInput.includes("@") && !foundProfile) {
        setError(
          lang === "sw"
            ? `Akaunti yenye jina la mtumiaji au namba "${cleanInput}" haijapatikana kwenye mfumo. Tafadhali hakiki maelezo yako au tumia barua pepe (Email).`
            : `No account found with username or phone "${cleanInput}". Please verify or use your email address.`
        );
        setLoading(false);
        return;
      }

      const emailToLogin = resolvedEmail || cleanInput.toLowerCase();

      // ─────────────────────────────────────────────────────────────────────────
      // HATUA YA 2 (FORMULA STEP 2):
      // Chunguza kama nywila (password) ni sahihi kupitia Supabase Auth
      // ─────────────────────────────────────────────────────────────────────────
      let authSuccessful = false;
      let user: any = null;
      let clientAuthErr: any = null;

      try {
        const clientAuthPromise = supabase.auth.signInWithPassword({
          email: emailToLogin,
          password: loginPassword,
        });
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Supabase Auth request timed out")), 6500)
        );

        const { data: authData, error: aError } = (await Promise.race([
          clientAuthPromise,
          timeoutPromise,
        ])) as any;

        if (aError) {
          clientAuthErr = aError;
        } else if (authData?.user) {
          authSuccessful = true;
          user = authData.user;
        }
      } catch (authErr: any) {
        clientAuthErr = authErr;
      }

      // Ikiwa client auth imefanikiwa:
      if (authSuccessful && user) {
        let existingProfile = foundProfile;
        if (!existingProfile) {
          try {
            const { data: clientProf } = await supabase
              .from("profiles")
              .select("*")
              .eq("auth_user_id", user.id)
              .maybeSingle();
            existingProfile = clientProf;
          } catch (cErr) {
            console.warn("[CLIENT-PROFILE-FETCH-WARN]", cErr);
          }
        }

        if (existingProfile && existingProfile.otp_verified === false) {
          await supabase.auth.signOut().catch(() => {});
          setError(
            lang === "sw"
              ? "Akaunti hii haijakamilisha usajili wa OTP na Vigezo. Tafadhali kamilisha usajili kwanza."
              : "This account has not completed OTP verification. Please complete registration first."
          );
          setLoading(false);
          return;
        }

        setSupabaseStatus({ checking: false, status: "ONLINE", message: "Seva ipo mtandaoni" });
        onAuthSuccess({
          username:
            existingProfile?.username ||
            user.user_metadata?.username ||
            user.email?.split("@")[0] ||
            "User",
          email: existingProfile?.email || user.email || "",
          phone: existingProfile?.phone || user.user_metadata?.phone || "",
          role: existingProfile?.role || "USER",
        });

        setSuccessMsg(t.successLogin);
        setTimeout(() => {
          onClose();
          resetForm();
        }, 800);
        return;
      }

      // Ikiwa client auth haikufanikiwa, piga seva (/api/auth/login) yenye root credentials
      let serverErrorMsg = "";
      let serverIsConnectionErr = false;
      let serverIsPasswordErr = false;
      let serverIsNotFound = false;

      try {
        const sLoginRes = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            loginId: cleanInput,
            password: loginPassword,
          }),
        });

        const sLoginData = await sLoginRes.json().catch(() => null);

        if (sLoginRes.ok && sLoginData?.ok && sLoginData?.profile) {
          const prof = sLoginData.profile;
          setSupabaseStatus({ checking: false, status: "ONLINE", message: "Seva ipo mtandaoni" });
          onAuthSuccess({
            username: prof.username || prof.first_name || "User",
            email: prof.email || "",
            phone: prof.phone || "",
            role: prof.role || "USER",
          });
          setSuccessMsg(t.successLogin);
          setTimeout(() => {
            onClose();
            resetForm();
          }, 700);
          return;
        }

        if (sLoginRes.status === 504 || sLoginData?.isConnectionError) {
          serverIsConnectionErr = true;
          serverErrorMsg = sLoginData?.error;
        } else if (sLoginData?.isPasswordError) {
          serverIsPasswordErr = true;
          serverErrorMsg = sLoginData?.error;
        } else if (sLoginData?.isAccountNotFound) {
          serverIsNotFound = true;
          serverErrorMsg = sLoginData?.error;
        } else if (sLoginData?.error) {
          serverErrorMsg = sLoginData.error;
        }
      } catch (sLoginErr) {
        console.warn("[SERVER-LOGIN-FALLBACK-NOTICE]", sLoginErr);
      }

      // ─────────────────────────────────────────────────────────────────────────
      // TATHMINI YA JIBU (DIAGNOSTICS):
      // ─────────────────────────────────────────────────────────────────────────
      const clientMsg = String(clientAuthErr?.message || "").toLowerCase();
      const isClientConnErr =
        clientMsg.includes("timeout") ||
        clientMsg.includes("timed out") ||
        clientMsg.includes("failed to fetch") ||
        clientMsg.includes("network");

      // Hitilafu ya Muunganisho wa Supabase Server
      if (serverIsConnectionErr || (isClientConnErr && !serverErrorMsg)) {
        setSupabaseStatus({
          checking: false,
          status: "TIMEOUT_OR_UNREACHABLE",
          message: "Seva ya Supabase haijajibu (Connection Timeout)",
        });
        setError(
          lang === "sw"
            ? (serverErrorMsg || "Hitilafu ya muunganisho wa seva ya Supabase (Connection Timeout): Seva haikujibu kwa wakati. Hili si kosa la nywila; tafadhali hakikisha mradi wako wa Supabase upo mtandaoni (Active) kwenye dashibodi ya Supabase na haujapumzishwa (Paused).")
            : "Supabase connection timed out. Please verify that your Supabase project is active and not paused in your Supabase dashboard."
        );
        return;
      }

      // Kosa maalum la Nywila
      if (serverIsPasswordErr) {
        setError(
          serverErrorMsg ||
            (lang === "sw"
              ? "Akaunti imepatikana, lakini neno la siri (password) uliloweka si sahihi. Tafadhali hakiki nywila yako au weka upya."
              : "Account found, but the password entered is incorrect. Please check your password.")
        );
        return;
      }

      // Kosa la Akaunti Kutopatikana
      if (serverIsNotFound) {
        setError(
          serverErrorMsg ||
            (lang === "sw"
              ? "Akaunti yenye barua pepe hii haijapatikana. Tafadhali hakiki herufi au sajili akaunti mpya."
              : "No account found with this email address. Please verify or register.")
        );
        return;
      }

      // Kosa la Supabase Auth credentials
      if (clientMsg.includes("invalid login credentials") || clientMsg.includes("invalid grant")) {
        if (foundProfile) {
          setError(
            lang === "sw"
              ? "Akaunti imepatikana, lakini neno la siri (password) uliloweka si sahihi. Tafadhali hakiki nywila yako au weka upya."
              : "Account found, but the password entered is incorrect. Please check your password."
          );
        } else {
          setError(
            lang === "sw"
              ? "Akaunti haijapatikana au neno la siri si sahihi. Tafadhali hakiki taarifa zako."
              : "Account not found or password incorrect. Please check your credentials."
          );
        }
        return;
      }

      if (clientMsg.includes("email not confirmed")) {
        setError(
          lang === "sw"
            ? "Barua pepe yako haijathibitishwa kupitia OTP. Tafadhali kamilisha uthibitishaji kabla ya kuingia."
            : "Your email address has not been verified yet."
        );
        return;
      }

      setError(
        serverErrorMsg ||
          (lang === "sw"
            ? "Imeshindikana kuingia kwenye akaunti. Tafadhali hakiki taarifa zako na jaribu tena."
            : "Login failed. Please check your credentials and try again.")
      );
    } catch (err: any) {
      console.warn("[LOGIN-NOTICE]", err?.message || err);
      setError(
        lang === "sw"
          ? "Hitilafu imetokea wakati wa kuingia. Tafadhali jaribu tena."
          : "An error occurred during login. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // ── STEP 1: PERSONAL DETAILS ──────────────────────────────────────────────
  const handleStep1Submit = (e: React.FormEvent) => {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
      e.stopPropagation();
    }
    setError("");
    setSuccessMsg("");

    if (!firstName.trim()) return setError(t.valFirstNameRequired);
    if (!lastName.trim()) return setError(t.valLastNameRequired);
    if (!phone.trim()) return setError(t.valPhoneRequired);
    if (!email.trim() || !validateEmail(email)) return setError(t.valInvalidEmail);
    if (!gender) return setError("Tafadhali chagua jinsia yako (Gender).");
    if (!birthday) return setError("Tafadhali chagua tarehe yako ya kuzaliwa.");
    if (calculatedAge !== null && calculatedAge < 18) return setError(t.valUnder18);

    // Navigation -> Move to Step 2 & trigger OTP send
    setRegStep(2);
    setError("");
    setSuccessMsg("");

    handleSendOtp(email.trim(), firstName.trim());
  };

  // ── STEP 2: SEND OTP ───────────────────────────────────────────────────────
  const handleSendOtp = async (targetEmail?: string, fName?: string) => {
    const emailToSend = targetEmail || email.trim();
    if (!emailToSend || !validateEmail(emailToSend)) {
      setError(t.valInvalidEmail);
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await fetchAuthRequest("/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailToSend,
          first_name: fName || firstName.trim(),
        }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch {
        data = { error: "Imeshindikana kusoma majibu kutoka kwa server." };
      }

      if (!res.ok) {
        if (data?.cooldown_left) setCooldownSeconds(data.cooldown_left);
        const message = data?.error || "Imeshindikana kutuma OTP.";
        setError(message);
        onNotification?.(message, "error");
        return;
      }

      const sentAt = Date.now();
      setOtpSentAt(sentAt);
      setOtpVerifiedAt(null);
      setOtpExpirySeconds((data.expiry_minutes || 10) * 60);
      setCooldownSeconds(60);
      setAttemptsRemaining(5);
      setResendsRemaining(3);
      const message = data.message || `Code ya OTP imetumwa kwa barua pepe ${emailToSend}`;
      setSuccessMsg(message);
      onNotification?.(message, "success");
    } catch (err: any) {
      console.error("[SEND-OTP-ERROR]", err);
      const message = isAuthRequestAbort(err)
        ? "Server imechelewa kujibu. Tafadhali subiri kidogo kisha ujaribu tena."
        : "Imeshindikana kuwasiliana na server kutuma OTP.";
      setError(message);
      onNotification?.(message, "error");
    } finally {
      setLoading(false);
    }
  };

  // ── STEP 2: VERIFY OTP ─────────────────────────────────────────────────────
  const handleStep2Verify = async (e: React.FormEvent) => {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
      e.stopPropagation();
    }
    setError("");
    setSuccessMsg("");

    const cleanOtp = otpCode.trim();
    if (!cleanOtp || cleanOtp.length < 6) {
      setError("Tafadhali weka tarakimu 6 kamili za OTP.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetchAuthRequest("/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          otp: cleanOtp,
        }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch {
        data = { error: "Imeshindikana kusoma majibu kutoka kwa server." };
      }

      if (!res.ok) {
        if (data?.remaining_attempts !== undefined) {
          setAttemptsRemaining(data.remaining_attempts);
        }
        const message = data?.error || "Code ya OTP si sahihi.";
        setError(message);
        onNotification?.(message, "error");
        return;
      }

      setOtpVerifiedAt(Date.now());
      setRegStep(3);
      const message = "Code ya OTP imethibitishwa kwa mafanikio! Sasa kamilisha usajili wako.";
      setSuccessMsg(message);
      onNotification?.(message, "success");
    } catch (err: any) {
      console.error("[STEP2-ERROR]", err);
      const message = isAuthRequestAbort(err)
        ? "Uhakiki umechelewa kwa sababu ya connection/server. Tafadhali subiri kidogo kisha ujaribu tena."
        : "Imeshindikana kuhakiki OTP kwa sasa. Tafadhali jaribu tena.";
      setError(message);
      onNotification?.(message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP handler
  const handleResendOtp = async (e?: React.MouseEvent) => {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
      e.stopPropagation();
    }
    if (cooldownSeconds > 0 || resendsRemaining <= 0 || loading) return;

    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const res = await fetchAuthRequest("/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch {
        data = { error: "Imeshindikana kusoma majibu kutoka kwa server." };
      }

      if (!res.ok) {
        if (data?.cooldown_left) setCooldownSeconds(data.cooldown_left);
        const message = data?.error || "Imeshindikana kutuma OTP mpya.";
        setError(message);
        onNotification?.(message, "error");
        return;
      }

      setResendsRemaining((prev) => Math.max(0, prev - 1));
      setCooldownSeconds(60);
      setAttemptsRemaining(5);
      const message = data.message || "Code mpya ya OTP imetumwa kwenye barua pepe yako!";
      setSuccessMsg(message);
      onNotification?.(message, "success");
    } catch (err: any) {
      console.error("[RESEND-OTP-ERROR]", err);
      setError(isAuthRequestAbort(err)
        ? "Server imechelewa kujibu. Tafadhali jaribu tena."
        : "Imeshindikana kutuma OTP.");
    } finally {
      setLoading(false);
    }
  };

  // ── STEP 3: CREATE ACCOUNT (FINALIZE) ──────────────────────────────────────
  const handleStep3Finalize = async (e: React.FormEvent) => {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
      e.stopPropagation();
    }
    setError("");
    setSuccessMsg("");

    if (!password || password.length < 8) {
      setError(t.valPasswordLength);
      return;
    }

    if (password !== retypePassword) {
      setError(t.valPasswordMismatch);
      return;
    }

    if (!acceptTerms) {
      setError(t.valAcceptTerms);
      return;
    }

    setLoading(true);

    try {
      const res = await fetchAuthRequest("/create-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          username: "",
          phone: phone.trim(),
          gender: gender.trim().toUpperCase(),
          birthday,
          terms_accepted: acceptTerms,
        }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch {
        data = { error: "Imeshindikana kusoma majibu kutoka kwa server." };
      }

      if (!res.ok || data?.success === false) {
        const message = data?.error || "Imeshindikana kuunda akaunti.";
        setError(message);
        onNotification?.(message, "error");
        return;
      }

      const assignedUsername = data?.username || email.trim().split("@")[0];
      const dbProfile: any = data.profile || null;

      if (isSupabaseConfigured) {
        supabase.auth
          .signInWithPassword({
            email: email.trim(),
            password,
          })
          .catch((clientAuthErr) => {
            console.warn("[CLIENT-SIGNIN-BACKGROUND-NOTICE]", clientAuthErr);
          });
      }

      onAuthSuccess({
        username: dbProfile?.username || assignedUsername,
        email: dbProfile?.email || email.trim(),
        phone: dbProfile?.phone || phone.trim(),
        role: dbProfile?.role || "USER",
      });

      setSuccessMsg(
        data.message || "Hongera! Akaunti imeundwa na kurekodiwa kikamilifu kwenye database!",
      );

      // REDIRECT TO HOME PAGE DIRECTLY
      removeRegisterDraft();
      setTimeout(() => {
        onClose();
        resetForm();
      }, 1000);
    } catch (err: any) {
      console.error("[FINALIZE-ERROR]", err);
      const message = isAuthRequestAbort(err)
        ? "Uundaji wa akaunti umechelewa kwa sababu ya connection. Tafadhali jaribu tena."
        : "Imeshindikana kukamilisha usajili.";
      setError(message);
      onNotification?.(message, "error");
    } finally {
      setLoading(false);
    }
  };

  // ── FORGOT PASSWORD SUBMIT ─────────────────────────────────────────────────
  const handleForgotSubmit = async (e: React.FormEvent) => {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
      e.stopPropagation();
    }
    setError("");
    setSuccessMsg("");

    if (!email || !validateEmail(email)) {
      setError(t.valInvalidForgot);
      return;
    }

    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/`,
      });

      if (resetError) throw resetError;

      setSuccessMsg(`${t.successForgot}${email}`);
      setTimeout(() => {
        handleToggleMode("login");
        setSuccessMsg("");
      }, 4000);
    } catch (err: any) {
      console.error("[FORGOT-ERROR]", err);
      setError(err?.message || "Imeshindikana kutuma kiungo cha kurejesha nywila.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isLight = theme === "light";
  const isBlue = theme === "blue";

  // Dynamic Theme Colors - Seamless, Borderless Canvas
  const pageBgClass = isLight
    ? "bg-slate-50 text-slate-900"
    : isBlue
      ? "bg-[#101f30] text-slate-100"
      : "bg-[#0a0a0a] text-slate-100";

  const inputClass = `w-full px-3.5 py-2.5 rounded-lg border text-xs sm:text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 ${
    isLight
      ? "bg-white border-slate-300/80 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500/20 shadow-xs"
      : isBlue
        ? "bg-[#14263a] border-white/10 text-white placeholder:text-slate-400 focus:border-emerald-400 focus:ring-emerald-400/20"
        : "bg-[#141414] border-white/10 text-white placeholder:text-neutral-500 focus:border-emerald-500 focus:ring-emerald-500/20"
  }`;

  const btnLoginClass =
    "bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white shadow-sm shadow-blue-600/20";
  const btnGradient =
    "bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20";

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className={`fixed inset-0 z-[60] flex flex-col overflow-y-auto ${pageBgClass}`}>
      {/* ── TOP BACK BUTTON ONLY (NO HEADER BAR, CLEAN & EMPTY TOP) ────── */}
      <div className="absolute top-4 left-4 sm:top-5 sm:left-6 z-20">
        <button
          id="auth-back-btn"
          type="button"
          onClick={onClose}
          aria-label={t.back}
          className={`p-2 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
            isLight
              ? "bg-white border border-slate-200/90 text-slate-700 hover:bg-slate-100 shadow-xs active:scale-95"
              : isBlue
                ? "bg-[#162a40] border border-white/10 text-slate-200 hover:bg-[#1a334e] active:scale-95"
                : "bg-[#181818] border border-white/10 text-neutral-200 hover:bg-neutral-800 active:scale-95"
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
      </div>

      {/* ── SEAMLESS OPEN PAGE CONTAINER ──────────────────────────────── */}
      <main className="flex-1 flex flex-col justify-center px-4 py-10 sm:px-6 sm:py-12 max-w-md w-full mx-auto">
        <div className="w-full space-y-5">
          {/* ── LOGIN MODE ────────────────────────────────────────────────── */}
          {mode === "login" && (
            <motion.div
              key="login-mode"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              {/* Logo Only (No text below logo) */}
              <div className="flex justify-center mb-2">
                <img
                  src={AUTH_LOGO_URL}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/tt-logo.png";
                  }}
                  alt="TakeTalon"
                  className={`w-12 h-12 object-contain drop-shadow-sm transition-all duration-300 ${
                    theme === "dark" ? "invert brightness-110 contrast-125" : ""
                  }`}
                />
              </div>

              {/* Status Messages */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`p-3 rounded-lg flex items-start gap-2.5 text-xs font-semibold ${
                    error.toLowerCase().includes("muunganisho") ||
                    error.toLowerCase().includes("timeout") ||
                    error.toLowerCase().includes("seva ya supabase")
                      ? "bg-amber-500/15 border border-amber-500/30 text-amber-300"
                      : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
                  }`}
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <p className="leading-relaxed">{error}</p>
                    {(error.toLowerCase().includes("muunganisho") ||
                      error.toLowerCase().includes("timeout") ||
                      error.toLowerCase().includes("supabase")) && (
                      <button
                        type="button"
                        onClick={checkSupabaseServer}
                        disabled={supabaseStatus.checking}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded bg-amber-500/25 hover:bg-amber-500/35 text-amber-200 transition-colors cursor-pointer border border-amber-500/30"
                      >
                        <RefreshCw className={`w-3 h-3 ${supabaseStatus.checking ? "animate-spin" : ""}`} />
                        <span>{supabaseStatus.checking ? "Inapima seva..." : "Pima Muunganisho wa Seva Sasa"}</span>
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
              {successMsg && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-lg flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{successMsg}</span>
                </motion.div>
              )}

              {/* Supabase Status Diagnostic Card */}
              {supabaseStatus.status !== "NOT_CHECKED" && (
                <div
                  className={`p-2.5 rounded-lg text-xs flex items-center justify-between border ${
                    supabaseStatus.status === "ONLINE"
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                      : "bg-amber-500/10 border-amber-500/30 text-amber-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        supabaseStatus.status === "ONLINE"
                          ? "bg-emerald-400 animate-pulse"
                          : "bg-amber-400"
                      }`}
                    />
                    <span className="font-medium">
                      {supabaseStatus.status === "ONLINE"
                        ? "Seva ya Supabase ipo mtandaoni (Online)"
                        : "Seva ya Supabase haijajibu (Timeout/Paused)"}
                    </span>
                  </div>
                  {supabaseStatus.latencyMs !== undefined && (
                    <span className="font-mono text-[10px] opacity-80">
                      {supabaseStatus.latencyMs}ms
                    </span>
                  )}
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleLoginSubmit} className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {t.usernameOrEmail}
                  </label>
                  <input
                    id="auth-login-identifier"
                    type="text"
                    required
                    placeholder={t.usernameOrEmail}
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    className={inputClass}
                    disabled={loading || !!successMsg}
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      {t.password}
                    </label>
                    <button
                      id="auth-forgot-password-link"
                      type="button"
                      onClick={() => handleToggleMode("forgot")}
                      className="text-[11px] font-semibold text-blue-500 hover:text-blue-400 hover:underline cursor-pointer transition-colors"
                    >
                      {t.forgotPassword}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="auth-login-password"
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder={t.password}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className={`${inputClass} pr-10`}
                      disabled={loading || !!successMsg}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-1.5 space-y-2">
                  <button
                    id="auth-login-submit-btn"
                    type="submit"
                    disabled={loading || !!successMsg}
                    className={`w-full py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm font-display font-extrabold uppercase tracking-wider flex items-center justify-center space-x-2 transition-all cursor-pointer ${btnLoginClass} ${
                      loading || !!successMsg ? "opacity-60 cursor-not-allowed" : "hover:scale-[1.01] active:scale-95"
                    }`}
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>{t.loadingLogin}</span>
                      </>
                    ) : (
                      <>
                        <span>{t.loginBtn}</span>
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <button
                    id="auth-quick-demo-btn"
                    type="button"
                    onClick={() => {
                      onAuthSuccess({
                        username: "TakeTalonVIP",
                        email: "vip@taketalon.com",
                        phone: "+25779123456",
                        role: "PRO",
                      });
                      setSuccessMsg("Umeingia kama VIP User!");
                      setTimeout(() => {
                        onClose();
                        resetForm();
                      }, 500);
                    }}
                    className={`w-full py-2 rounded-lg text-[11px] font-semibold border transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                      isLight
                        ? "bg-amber-500/10 text-amber-700 border-amber-500/25 hover:bg-amber-500/20"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/25 hover:bg-amber-500/20"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Kuingia Haraka (Demo Login)</span>
                  </button>
                </div>
              </form>

              {/* Seamless Bottom Switch */}
              <div className="text-center pt-1">
                <p className={`text-xs ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                  {t.dontHaveAccount}{" "}
                  <button
                    id="auth-go-to-register-btn"
                    type="button"
                    onClick={() => handleToggleMode("register")}
                    className="font-bold text-emerald-500 hover:text-emerald-400 hover:underline cursor-pointer transition-colors"
                    disabled={loading || !!successMsg}
                  >
                    {t.registerSasa}
                  </button>
                </p>
              </div>
            </motion.div>
          )}

          {/* ── REGISTER MODE (3 STEPS) ───────────────────────────────────── */}
          {mode === "register" && (
            <motion.div
              key={`register-step-${regStep}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              {/* Header with Logo and Step Progress Bar (No text) */}
              <div className="text-center space-y-2">
                <div className="flex justify-center mb-1">
                  <img
                    src={AUTH_LOGO_URL}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/tt-logo.png";
                    }}
                    alt="TakeTalon"
                    className={`w-12 h-12 object-contain drop-shadow-sm transition-all duration-300 ${
                      theme === "dark" ? "invert brightness-110 contrast-125" : ""
                    }`}
                  />
                </div>

                {/* Step Progress Indicators */}
                <div className="flex items-center justify-center space-x-1.5 pt-1">
                  <div
                    className={`h-1 rounded-full transition-all duration-300 ${
                      regStep >= 1 ? "w-8 bg-emerald-500" : "w-4 bg-slate-700/40"
                    }`}
                  />
                  <div
                    className={`h-1 rounded-full transition-all duration-300 ${
                      regStep >= 2 ? "w-8 bg-emerald-500" : "w-4 bg-slate-700/40"
                    }`}
                  />
                  <div
                    className={`h-1 rounded-full transition-all duration-300 ${
                      regStep >= 3 ? "w-8 bg-emerald-500" : "w-4 bg-slate-700/40"
                    }`}
                  />
                </div>
              </div>

              {/* Status Messages */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold rounded-lg flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
              {successMsg && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-lg flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{successMsg}</span>
                </motion.div>
              )}

              {/* ── STEP 1: PERSONAL DETAILS ──────────────────────────────── */}
              {regStep === 1 && (
                <form onSubmit={handleStep1Submit} className="space-y-3">
                  {/* First Name & Last Name */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        {t.firstNamePlaceholder}
                      </label>
                      <input
                        id="auth-reg-firstname"
                        type="text"
                        required
                        placeholder={t.firstNamePlaceholder}
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className={inputClass}
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        {t.lastNamePlaceholder}
                      </label>
                      <input
                        id="auth-reg-lastname"
                        type="text"
                        required
                        placeholder={t.lastNamePlaceholder}
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className={inputClass}
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      {t.phonePlaceholder}
                    </label>
                    <input
                      id="auth-reg-phone"
                      type="tel"
                      required
                      placeholder={t.phonePlaceholder}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={inputClass}
                      disabled={loading}
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      {t.emailPlaceholder}
                    </label>
                    <input
                      id="auth-reg-email"
                      type="email"
                      required
                      placeholder={t.emailPlaceholder}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputClass}
                      disabled={loading}
                    />
                  </div>

                  {/* Gender & Birthday Side-by-Side */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Gender Custom Dropdown */}
                    <div className="space-y-1 relative" ref={genderRef}>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Jinsia
                      </label>
                      <button
                        id="auth-reg-gender-btn"
                        type="button"
                        disabled={loading}
                        onClick={() => setIsGenderOpen((prev) => !prev)}
                        className={`${inputClass} flex items-center justify-between text-left w-full cursor-pointer ${
                          isGenderOpen ? "ring-2 ring-emerald-500/30 border-emerald-500" : ""
                        }`}
                      >
                        <span
                          className={
                            !gender
                              ? isLight
                                ? "text-slate-400 font-normal"
                                : "text-slate-500 font-normal"
                              : "font-semibold"
                          }
                        >
                          {gender === "MALE"
                            ? "Mwanaume"
                            : gender === "FEMALE"
                              ? "Mwanamke"
                              : gender === "OTHER"
                                ? "Nyingine"
                                : "Chagua"}
                        </span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
                            isGenderOpen ? "rotate-180 text-emerald-400" : "text-slate-400"
                          }`}
                        />
                      </button>

                      {/* Dropdown Options */}
                      <AnimatePresence>
                        {isGenderOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -3, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -3, scale: 0.98 }}
                            transition={{ duration: 0.12 }}
                            className={`absolute top-full left-0 right-0 mt-1 z-50 rounded-lg border shadow-xl overflow-hidden p-1 ${
                              isLight
                                ? "bg-white border-slate-200 shadow-slate-300/50"
                                : isBlue
                                  ? "bg-[#14263a] border-blue-400/40 shadow-black/80"
                                  : "bg-[#171717] border-neutral-700 shadow-black/90"
                            }`}
                          >
                            {[
                              { value: "MALE", label: "Mwanaume" },
                              { value: "FEMALE", label: "Mwanamke" },
                              { value: "OTHER", label: "Nyingine" },
                            ].map((item) => (
                              <button
                                key={item.value}
                                type="button"
                                onClick={() => {
                                  setGender(item.value as "MALE" | "FEMALE" | "OTHER");
                                  setIsGenderOpen(false);
                                }}
                                className={`w-full px-3 py-2 rounded-md text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                                  gender === item.value
                                    ? isLight
                                      ? "bg-emerald-50 text-emerald-600 font-bold"
                                      : "bg-emerald-500/20 text-emerald-400 font-bold"
                                    : isLight
                                      ? "text-slate-700 hover:bg-slate-100"
                                      : "text-slate-200 hover:bg-white/10"
                                }`}
                              >
                                <span>{item.label}</span>
                                {gender === item.value && (
                                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                )}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Birthday Date Picker */}
                    <div className="space-y-1">
                      <label
                        htmlFor="auth-birthday-input-page"
                        className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider"
                      >
                        Kuzaliwa
                      </label>
                      <input
                        id="auth-birthday-input-page"
                        type={birthday || isBirthdayFocused ? "date" : "text"}
                        onFocus={() => setIsBirthdayFocused(true)}
                        onBlur={() => setIsBirthdayFocused(false)}
                        placeholder="Tarehe"
                        required
                        value={birthday}
                        onChange={(e) => setBirthday(e.target.value)}
                        className={inputClass}
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {/* Instant Age Status Indicator */}
                  {calculatedAge !== null && (
                    <div className="text-xs pt-0.5">
                      {calculatedAge >= 18 ? (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          Miaka {calculatedAge} (Umeidhinishwa)
                        </span>
                      ) : (
                        <span className="text-rose-500 font-semibold flex items-center gap-1.5 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20 text-xs">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Umri wako ({calculatedAge}) uko chini ya miaka 18.</span>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Step 1 Next Button */}
                  <div className="pt-1.5">
                    <button
                      id="auth-reg-step1-next-btn"
                      type="submit"
                      disabled={
                        loading ||
                        !firstName.trim() ||
                        !lastName.trim() ||
                        !phone.trim() ||
                        !email.trim() ||
                        !gender ||
                        !birthday ||
                        (calculatedAge !== null && calculatedAge < 18)
                      }
                      className={`w-full py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm font-display font-extrabold uppercase tracking-wider flex items-center justify-center space-x-2 transition-all cursor-pointer ${btnGradient} ${
                        loading ||
                        !firstName.trim() ||
                        !lastName.trim() ||
                        !phone.trim() ||
                        !email.trim() ||
                        !gender ||
                        !birthday ||
                        (calculatedAge !== null && calculatedAge < 18)
                          ? "opacity-60 cursor-not-allowed"
                          : "hover:scale-[1.01] active:scale-95"
                      }`}
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Inatuma OTP...</span>
                        </>
                      ) : (
                        <>
                          <span>Endelea</span>
                          <ChevronRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* ── STEP 2: VERIFY EMAIL OTP ───────────────────────────────── */}
              {regStep === 2 && (
                <form onSubmit={handleStep2Verify} className="space-y-4">
                  <div className="text-center space-y-1.5">
                    <p className="text-xs text-slate-400">
                      Code ya OTP imetumwa kwa:
                    </p>
                    <p className="text-sm font-bold text-emerald-400 font-mono">{email}</p>

                    <div className="pt-0.5">
                      <button
                        id="auth-send-otp-btn"
                        type="button"
                        onClick={() => handleSendOtp()}
                        disabled={loading || cooldownSeconds > 0 || resendsRemaining <= 0}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {loading ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            <span>Inatuma...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3 h-3" />
                            <span>
                              {cooldownSeconds > 0
                                ? `Subiri sekunde ${cooldownSeconds}s`
                                : "Tuma tena OTP"}
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* 6 Digit OTP Input */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-300 text-center uppercase tracking-wider">
                      Weka Code (OTP)
                    </label>
                    <input
                      id="auth-reg-otp-code"
                      type="text"
                      maxLength={6}
                      required
                      placeholder="• • • • • •"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ""))}
                      className={`w-full py-3 px-3 rounded-lg text-center font-mono font-bold text-xl sm:text-2xl tracking-[0.3em] border transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${
                        isLight
                          ? "bg-white border-slate-300 text-slate-900 shadow-xs"
                          : isBlue
                            ? "bg-[#14263a] border-white/10 text-emerald-400"
                            : "bg-[#141414] border-white/10 text-emerald-400"
                      }`}
                      disabled={loading}
                    />
                  </div>

                  {/* Timers & Attempts Status */}
                  <div className="flex items-center justify-between text-xs px-1 text-slate-400">
                    <span className="flex items-center gap-1 text-amber-400 font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      <strong className="font-mono">{formatTime(otpExpirySeconds)}</strong>
                    </span>
                    <span className="font-medium">
                      Majaribio:{" "}
                      <strong
                        className={`font-mono ${
                          attemptsRemaining < 3 ? "text-rose-400" : "text-emerald-400"
                        }`}
                      >
                        {attemptsRemaining}/5
                      </strong>
                    </span>
                  </div>

                  {/* Resend OTP Link */}
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
                    <span className="text-slate-400">Hujapata code?</span>
                    <button
                      id="auth-resend-otp-btn"
                      type="button"
                      onClick={handleResendOtp}
                      disabled={cooldownSeconds > 0 || resendsRemaining <= 0 || loading}
                      className={`font-semibold flex items-center gap-1 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                        cooldownSeconds > 0 || resendsRemaining <= 0 || loading
                          ? "opacity-50 cursor-not-allowed text-slate-500"
                          : "text-emerald-400 hover:text-emerald-300 hover:underline"
                      }`}
                    >
                      <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
                      {cooldownSeconds > 0
                        ? `(${cooldownSeconds}s)`
                        : resendsRemaining > 0
                          ? `Tuma Tena (${resendsRemaining})`
                          : "Mwisho"}
                    </button>
                  </div>

                  {/* Step 2 Action Buttons */}
                  <div className="flex gap-2.5 pt-1.5">
                    <button
                      id="auth-reg-step2-back-btn"
                      type="button"
                      onClick={() => setRegStep(1)}
                      className={`px-4 py-2.5 rounded-lg border font-semibold text-xs transition-colors cursor-pointer ${
                        isLight
                          ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                          : "border-white/10 bg-white/5 text-slate-300 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      Rudi
                    </button>
                    <button
                      id="auth-reg-step2-verify-btn"
                      type="submit"
                      disabled={loading || otpCode.trim().length !== 6 || attemptsRemaining <= 0}
                      className={`flex-1 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm font-display font-extrabold uppercase tracking-wider flex items-center justify-center space-x-2 transition-all cursor-pointer ${btnGradient} ${
                        loading || otpCode.trim().length !== 6 || attemptsRemaining <= 0
                          ? "opacity-60 cursor-not-allowed"
                          : "hover:scale-[1.01] active:scale-95"
                      }`}
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Inahakiki...</span>
                        </>
                      ) : (
                        <>
                          <span>Thibitisha</span>
                          <ChevronRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* ── STEP 3: CREATE PASSWORD & ACCEPT TERMS ────────────────── */}
              {regStep === 3 && (
                <form onSubmit={handleStep3Finalize} className="space-y-3">
                  <div className="space-y-2.5">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        {t.passwordMin}
                      </label>
                      <div className="relative">
                        <input
                          id="auth-reg-password"
                          type={showPassword ? "text" : "password"}
                          required
                          placeholder={t.passwordMin}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className={`${inputClass} pr-10`}
                          disabled={loading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-white cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        {t.confirmPassword}
                      </label>
                      <div className="relative">
                        <input
                          id="auth-reg-confirm-password"
                          type={showRetypePassword ? "text" : "password"}
                          required
                          placeholder={t.confirmPassword}
                          value={retypePassword}
                          onChange={(e) => setRetypePassword(e.target.value)}
                          className={`${inputClass} pr-10`}
                          disabled={loading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowRetypePassword(!showRetypePassword)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-white cursor-pointer"
                        >
                          {showRetypePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Terms & Conditions Checkbox */}
                  <div className="pt-0.5">
                    <label className="flex items-start space-x-2 cursor-pointer select-none">
                      <input
                        id="auth-reg-terms-checkbox"
                        type="checkbox"
                        required
                        checked={acceptTerms}
                        onChange={(e) => setAcceptTerms(e.target.checked)}
                        className="mt-0.5 w-3.5 h-3.5 rounded text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                        disabled={loading}
                      />
                      <span className={`text-xs leading-snug ${isLight ? "text-slate-600" : "text-slate-300"}`}>
                        {t.termsCheckbox}{" "}
                        <span className="text-emerald-500 font-semibold underline">
                          {t.termsLinkText}
                        </span>
                      </span>
                    </label>
                  </div>

                  {/* Step 3 Action Buttons */}
                  <div className="flex gap-2.5 pt-1.5">
                    <button
                      id="auth-reg-step3-back-btn"
                      type="button"
                      onClick={() => setRegStep(2)}
                      className={`px-4 py-2.5 rounded-lg border font-semibold text-xs transition-colors cursor-pointer ${
                        isLight
                          ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                          : "border-white/10 bg-white/5 text-slate-300 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      Rudi
                    </button>
                    <button
                      id="auth-reg-step3-finalize-btn"
                      type="submit"
                      disabled={
                        loading ||
                        !acceptTerms ||
                        !password ||
                        password.length < 8 ||
                        password !== retypePassword
                      }
                      className={`flex-1 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm font-display font-extrabold uppercase tracking-wider flex items-center justify-center space-x-2 transition-all cursor-pointer ${btnGradient} ${
                        loading ||
                        !acceptTerms ||
                        !password ||
                        password.length < 8 ||
                        password !== retypePassword
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:scale-[1.01] active:scale-95"
                      }`}
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Inakamilisha...</span>
                        </>
                      ) : (
                        <>
                          <span>Kamilisha Usajili</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Seamless Bottom Switch */}
              <div className="text-center pt-1">
                <p className={`text-xs ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                  {t.alreadyHaveAccount}{" "}
                  <button
                    id="auth-go-to-login-btn"
                    type="button"
                    onClick={() => handleToggleMode("login")}
                    className="font-bold text-emerald-500 hover:text-emerald-400 hover:underline cursor-pointer transition-colors"
                    disabled={loading}
                  >
                    {t.loginHere}
                  </button>
                </p>
              </div>
            </motion.div>
          )}

          {/* ── FORGOT PASSWORD MODE ───────────────────────────────────────── */}
          {mode === "forgot" && (
            <motion.div
              key="forgot-mode"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              {/* Logo Only (No text below logo) */}
              <div className="flex justify-center mb-2">
                <img
                  src={AUTH_LOGO_URL}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/tt-logo.png";
                  }}
                  alt="TakeTalon"
                  className={`w-12 h-12 object-contain drop-shadow-sm transition-all duration-300 ${
                    theme === "dark" ? "invert brightness-110 contrast-125" : ""
                  }`}
                />
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold rounded-lg flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
              {successMsg && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-lg flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{successMsg}</span>
                </motion.div>
              )}

              <form onSubmit={handleForgotSubmit} className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {t.enterEmail}
                  </label>
                  <input
                    id="auth-forgot-email"
                    type="email"
                    required
                    placeholder={t.enterEmail}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    disabled={loading || !!successMsg}
                  />
                </div>

                <div className="pt-1.5">
                  <button
                    id="auth-forgot-submit-btn"
                    type="submit"
                    disabled={loading || !!successMsg}
                    className={`w-full py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm font-display font-extrabold uppercase tracking-wider flex items-center justify-center space-x-2 transition-all cursor-pointer ${btnLoginClass} ${
                      loading || !!successMsg ? "opacity-60 cursor-not-allowed" : "hover:scale-[1.01] active:scale-95"
                    }`}
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>{t.loadingForgot}</span>
                      </>
                    ) : (
                      <>
                        <span>{t.sendForgotBtn}</span>
                        <Send className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              <div className="text-center pt-1">
                <button
                  id="auth-forgot-back-to-login-btn"
                  onClick={() => handleToggleMode("login")}
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                    isLight ? "text-slate-600 hover:text-slate-900" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{t.backToLogin}</span>
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
