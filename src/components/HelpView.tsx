/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Sparkles,
  Cpu,
  Wallet,
  Trophy,
  Play,
  ShieldCheck,
  Check,
  Search,
  Zap,
  ExternalLink,
  LifeBuoy,
  FileText,
  CheckCircle2,
  Clock,
  UserCheck,
  AlertCircle,
  Bell,
  RefreshCw,
  Copy,
  Lock,
  Database,
  Layers,
  Compass,
  BookMarked,
  Award,
  Scale,
  Terminal,
  ArrowRight,
  ChevronRight,
  Globe,
  Activity,
  FileCheck,
  ShieldAlert,
  Server,
  Coins
} from "lucide-react";
import ThreatPhoneIcon from "./ThreatPhoneIcon";

interface HelpViewProps {
  theme: "light" | "dark" | "blue";
  onBackToHome: () => void;
  lang: "en" | "fr" | "sw";
  onNavigateTab?: (tab: string) => void;
  onAddNotification?: (msg: string, type?: "success" | "info" | "error") => void;
}

// Document Sub-Pages Union Type
type DocModuleId =
  | "blueprint"
  | "business_logic"
  | "architecture"
  | "wallet_ledger"
  | "security_guide"
  | "roadmap"
  | "project_rules";

export default function HelpView({
  theme,
  onBackToHome,
  lang,
  onNavigateTab,
  onAddNotification,
}: HelpViewProps) {
  // Navigation State inside System Documentation Portal
  const [activeDocModule, setActiveDocModule] = useState<DocModuleId | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<string>("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  const isSwahili = lang === "sw";
  const isFrench = lang === "fr";
  const tr = (sw: string, fr: string, en: string) => (lang === "sw" ? sw : lang === "fr" ? fr : en);

  // Masterpiece Theme Colors
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
      ? "bg-gradient-to-r from-blue-50/95 via-indigo-50/90 to-slate-50 border-blue-200 shadow-sm"
      : theme === "dark"
        ? "bg-gradient-to-r from-neutral-950 via-neutral-900 to-black border-neutral-800 shadow-md"
        : "bg-gradient-to-r from-[#1a3450] via-[#224467] to-[#1a3450] border-blue-400/35 shadow-md";

  // Code copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeId(id);
    if (onAddNotification) {
      onAddNotification(tr("Msimbo umehesabiwa / umenakiliwa!", "Code copié dans le presse-papiers !", "Copied code snippet!"), "info");
    }
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  // 7 DOCUMENTATION MODULE DEFINITIONS
  const docModules = [
    {
      id: "blueprint" as DocModuleId,
      title: tr("1. PROJECT BLUEPRINT & VISION", "1. PLAN ET VISION DU PROJET", "1. PROJECT BLUEPRINT & VISION"),
      subtitle: tr("Dhamira Kuu, Uchumi wa Vocha & Burundi Launch", "Vision Globale, Économie de Recharges & Lancement Burundi", "Master Blueprint, Voucher Economy & Burundi Vision"),
      icon: Compass,
      color: "text-blue-400 bg-blue-500/15 border-blue-500/30",
      badge: "v1.0 Official",
      readTime: tr("Dakika 8 za kusoma", "8 min de lecture", "8 min read"),
      subTabs: [
        { id: "overview", label: tr("Utambulisho", "Aperçu", "Overview") },
        { id: "voucher_economy", label: tr("Uchumi wa Vocha", "Économie de Recharges", "Voucher Economy") },
        { id: "regional_launch", label: tr("Burundi Launch", "Lancement Burundi", "Burundi Launch") },
      ],
    },
    {
      id: "business_logic" as DocModuleId,
      title: tr("2. BUSINESS LOGIC & UNLOCK SYSTEM", "2. LOGIQUE MÉTIER ET SYSTÈME DE DÉBLOCAGE", "2. BUSINESS LOGIC & UNLOCK SYSTEM"),
      subtitle: tr("Akaunti za CEO, Mfumo wa Unlockers & Commission 90/10", "Comptes CEO, Débloqueurs & Partage 90/10", "CEO Accounts, Unlockers & 90/10 Revenue Split"),
      icon: Award,
      color: "text-amber-400 bg-amber-500/15 border-amber-500/30",
      badge: "Core Logic",
      readTime: tr("Dakika 12 za kusoma", "12 min de lecture", "12 min read"),
      subTabs: [
        { id: "account_roles", label: tr("Aina za Akaunti", "Rôles de Comptes", "Account Roles") },
        { id: "unlock_mechanics", label: tr("Mfumo wa Unlock", "Mécanique Déblocage", "Unlock Mechanics") },
        { id: "commissions", label: tr("Commission & Pricing", "Commissions", "Commissions") },
      ],
    },
    {
      id: "architecture" as DocModuleId,
      title: tr("3. SYSTEM ARCHITECTURE & ENGINE", "3. ARCHITECTURE SYSTÈME ET MOTEUR", "3. SYSTEM ARCHITECTURE & ENGINE"),
      subtitle: tr("React Vite PWA, Supabase PostgreSQL & SMS Forwarder Gateway", "React Vite PWA, Supabase & Passerelle SMS", "React Vite PWA, Supabase & SMS Gateway Subsystem"),
      icon: Server,
      color: "text-cyan-400 bg-cyan-500/15 border-cyan-500/30",
      badge: "Full Stack",
      readTime: tr("Dakika 10 za kusoma", "10 min de lecture", "10 min read"),
      subTabs: [
        { id: "tech_stack", label: tr("Teknolojia", "Technologies", "Tech Stack") },
        { id: "sms_gateway", label: tr("SMS Forwarder", "Passerelle SMS", "SMS Gateway") },
        { id: "platform_independence", label: tr("Platform Agnostic", "Liberté Plateforme", "Platform Freedom") },
      ],
    },
    {
      id: "wallet_ledger" as DocModuleId,
      title: tr("4. WALLET LEDGER & FINANCIAL ENGINE", "4. REGISTRE PORTEFEUILLE ET MOTEUR FINANCIER", "4. WALLET LEDGER & FINANCIAL ENGINE"),
      subtitle: tr("Single Source of Truth, Audit Chain & Double-Wallet Rules", "Source Unique de Vérité, Traçabilité & Double Portefeuille", "Ledger Audit Chain, Single Source of Truth & Double Wallet"),
      icon: Coins,
      color: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30",
      badge: "Ledger Engine",
      readTime: tr("Dakika 11 za kusoma", "11 min de lecture", "11 min read"),
      subTabs: [
        { id: "single_truth", label: tr("Single Source of Truth", "Source Unique", "Single Truth") },
        { id: "double_wallet", label: tr("Double Wallet System", "Double Portefeuille", "Double Wallet") },
        { id: "audit_chain", label: tr("Audit Trail & Ledger", "Piste d'Audit", "Audit Trail") },
      ],
    },
    {
      id: "security_guide" as DocModuleId,
      title: tr("5. SECURITY, RLS & FRAUD PROTECTION", "5. SÉCURITÉ, RLS ET PROTECTION ANTI-FRAUDE", "5. SECURITY, RLS & FRAUD PROTECTION"),
      subtitle: tr("Auth Roadmap (WhatsApp OTP / 2FA), RLS Rules & Aviator SHA-256", "Authentification WhatsApp OTP, Matrice RLS & SHA-256", "WhatsApp OTP / 2FA Roadmap, RLS Matrix & SHA-256"),
      icon: ShieldAlert,
      color: "text-rose-400 bg-rose-500/15 border-rose-500/30",
      badge: "Maximum Security",
      readTime: tr("Dakika 9 za kusoma", "9 min de lecture", "9 min read"),
      subTabs: [
        { id: "auth_roadmap", label: tr("Auth & OTP", "Authentification OTP", "Auth Roadmap") },
        { id: "rls_matrix", label: tr("RLS & Permissions", "Matrice RLS", "RLS Matrix") },
        { id: "fraud_engine", label: tr("Fraud & Risk Engine", "Protection Anti-Fraude", "Fraud Protection") },
      ],
    },
    {
      id: "roadmap" as DocModuleId,
      title: tr("6. DEVELOPMENT ROADMAP (PHASE 1 - 8)", "6. FEUILLE DE ROUTE DE DÉVELOPPEMENT (PHASES 1 - 8)", "6. DEVELOPMENT ROADMAP (PHASE 1 - 8)"),
      subtitle: tr("Kuanzia Foundation, Lumicash/Ecocash APIs hadi Regional Expansion", "De la Fondation aux APIs Monnaie Électronique & Expansion", "Foundation to Electronic Money APIs & East Africa Launch"),
      icon: Activity,
      color: "text-purple-400 bg-purple-500/15 border-purple-500/30",
      badge: "8 Phases",
      readTime: tr("Dakika 7 za kusoma", "7 min de lecture", "7 min read"),
      subTabs: [
        { id: "phase_1_4", label: tr("Awamu 1 - 4", "Phases 1 - 4", "Phases 1 - 4") },
        { id: "phase_5_8", label: tr("Awamu 5 - 8", "Phases 5 - 8", "Phases 5 - 8") },
        { id: "electronic_money", label: tr("Lumicash & Ecocash", "Monnaie Électronique", "Electronic Money") },
      ],
    },
    {
      id: "project_rules" as DocModuleId,
      title: tr("7. OFFICIAL PROJECT RULES & COMPLIANCE", "7. RÈGLES OFFICIELLES DU PROJET ET CONFORMITÉ", "7. OFFICIAL PROJECT RULES & COMPLIANCE"),
      subtitle: tr("Sheria 20 za Kudumu za Teketajon, Design Standards & Architecture Rules", "20 Règles Permanentes, Système Design & Politique Sans Hardcode", "20 Permanent Master Rules, Design System & Zero Hardcode Policy"),
      icon: Scale,
      color: "text-sky-400 bg-sky-500/15 border-sky-500/30",
      badge: "Strict Rules",
      readTime: tr("Dakika 10 za kusoma", "10 min de lecture", "10 min read"),
      subTabs: [
        { id: "core_20_rules", label: tr("Kanuni 20 za Mradi", "20 Règles Principales", "20 Core Rules") },
        { id: "design_rules", label: tr("Sheria za UI/UX", "Règles UI/UX", "UI/UX Rules") },
        { id: "zero_hardcode", label: tr("Zero Hardcode Policy", "Politique Zero Hardcode", "Zero Hardcode") },
      ],
    },
  ];

  // Filter modules based on search query
  const filteredModules = docModules.filter((mod) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      mod.title.toLowerCase().includes(q) ||
      mod.subtitle.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-md mx-auto px-3.5 py-2.5 pb-28 space-y-4 text-left">
      {/* HEADER BREADCRUMB & TOP CONTROLS */}
      <div className="flex items-center justify-between pb-2 border-b border-dashed border-slate-300 dark:border-neutral-800">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => {
              if (activeDocModule) {
                setActiveDocModule(null);
              } else {
                onBackToHome();
              }
            }}
            className={`p-2 rounded-xl border flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
              theme === "light"
                ? "bg-slate-50 border-slate-300 text-slate-800 hover:bg-slate-100"
                : "bg-neutral-900 border-neutral-800 text-slate-100 hover:bg-neutral-800"
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-[9px] font-mono font-bold text-blue-400 uppercase tracking-widest">
                {activeDocModule ? `DOCUMENTATION > ${activeDocModule.toUpperCase()}` : "SYSTEM KNOWLEDGE ACADEMY"}
              </span>
            </div>
            <h2 className={`text-sm font-black uppercase tracking-wide ${textPrimary}`}>
              {activeDocModule
                ? docModules.find((m) => m.id === activeDocModule)?.title
                : tr("Kituo cha Nyaraka & Miongozo ya Mfumo", "Centre de Documentation Système", "Master System Documentation Academy")}
            </h2>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
            OFFICIAL DOCS
          </span>
        </div>
      </div>

      {/* TOP HERO SYSTEM MANUAL BANNER (When on Docs Index) */}
      {!activeDocModule && (
        <div className={`p-4 rounded-2xl border ${heroBg} space-y-3`}>
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-md">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`text-xs font-black uppercase tracking-wider ${textPrimary}`}>
                {tr("Maktaba Kuu ya Mfumo wa TakeTalon v2.4", "Manuel Système Principal TakeTalon v2.4", "TakeTalon Master System Manual")}
              </h3>
              <p className={`text-[10.5px] leading-snug mt-0.5 ${textSecondary}`}>
                {tr(
                  "Soma na uelewe muundo wote wa biashara, usalama wa ledger, mambo ya CEO, na sheria 20 za mradi.",
                  "Archive complète couvrant l'architecture, le registre financier, les contrats CEO et les 20 règles.",
                  "Comprehensive reading archive covering Architecture, Ledger Engine, CEO Contracts & Project Rules."
                )}
              </p>
            </div>
          </div>

          {/* Search bar inside Documentation Academy */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                tr(
                  "Tafuta neno: CEO, Unlock, Ledger, SMS Forwarder, RLS, Lumicash...",
                  "Rechercher: CEO, Déblocage, Registre, Passerelle SMS, RLS...",
                  "Search docs: CEO, Unlockers, Ledger, SMS Forwarder, RLS..."
                )
              }
              className={`w-full pl-9 pr-8 py-2 rounded-xl text-xs border transition-all ${
                theme === "light"
                  ? "bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-500"
                  : theme === "dark"
                    ? "bg-neutral-950 border-neutral-800 text-slate-100 placeholder-neutral-500 focus:border-cyan-400"
                    : "bg-[#18334f] border-blue-400/40 text-slate-100 placeholder-blue-200/60 focus:border-cyan-300"
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      {/* QUICK SERVICE PORTALS ACCESS */}
      {!activeDocModule && (
        <div className={`p-3 rounded-2xl border ${containerBg} space-y-2`}>
          <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest block">
            {tr("MASHARTI & MSAADA WA HARAKA", "PORTAILS LÉGAUX ET SUPPORT", "LEGAL & SUPPORT PORTALS")}
          </span>
          <div className="grid grid-cols-2 gap-2 text-center">
            <button
              type="button"
              onClick={() => onNavigateTab?.("Legal")}
              className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 transition-all active:scale-95 cursor-pointer flex flex-col items-center justify-center space-y-1"
            >
              <Scale className="w-4 h-4 text-emerald-400" />
              <span className="text-[9.5px] font-bold uppercase leading-tight">
                {tr("Sheria na Mamlaka za Polisi", "Réglementation & Police", "Police & Legal Portal")}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab?.("ReportProblem")}
              className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 transition-all active:scale-95 cursor-pointer flex flex-col items-center justify-center space-y-1"
            >
              <ThreatPhoneIcon className="w-4 h-4 text-amber-400" />
              <span className="text-[9.5px] font-bold uppercase leading-tight">
                {tr("Ripoti Tatizo / Kituo cha Support", "Signaler un Problème", "Report a Problem")}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. DOCUMENTATION INDEX MODULE CARDS (7 MAIN BOOKS) */}
      {/* ========================================================================= */}
      {!activeDocModule && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className={`text-xs font-black uppercase tracking-wider flex items-center space-x-1.5 ${textPrimary}`}>
              <BookMarked className="w-4 h-4 text-blue-400" />
              <span>{tr("Miongozo na Nyaraka Rasmi (7 Core Books)", "7 Manuels Officiels du Système", "7 Official System Manual Books")}</span>
            </h3>
            <span className="text-[9px] font-mono text-slate-400">{filteredModules.length} Modules</span>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {filteredModules.map((mod) => {
              const Icon = mod.icon;
              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => {
                    setActiveDocModule(mod.id);
                    setActiveSubTab(mod.subTabs[0].id);
                  }}
                  className={`p-3.5 rounded-2xl border text-left transition-all active:scale-[0.98] cursor-pointer flex items-center justify-between group ${cardBg}`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`p-2.5 rounded-xl border shrink-0 mt-0.5 ${mod.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border border-slate-500/20 text-slate-400 bg-black/20">
                          {mod.badge}
                        </span>
                        <span className="text-[9px] font-mono text-slate-400">{mod.readTime}</span>
                      </div>

                      <h4 className={`text-xs font-black uppercase tracking-wide leading-tight ${textPrimary}`}>
                        {mod.title}
                      </h4>

                      <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                        {mod.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-500/10 text-slate-400 group-hover:text-white group-hover:bg-blue-600 transition-all shrink-0 ml-2">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SUB-PAGE READER CONTAINER FOR SELECTED MODULE */}
      {/* ========================================================================= */}
      <AnimatePresence mode="wait">
        {activeDocModule && (
          <motion.div
            key={activeDocModule}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* SUB-PAGE BREADCRUMB HEADER */}
            <div className={`p-3 rounded-2xl border ${containerBg} space-y-2.5`}>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setActiveDocModule(null)}
                  className="text-[10px] font-bold text-blue-400 hover:underline flex items-center space-x-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{tr("Rudi kwenye Orodha ya Vitabu", "Retour à l'index des manuels", "Back to Manuals Index")}</span>
                </button>

                <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30">
                  {docModules.find((m) => m.id === activeDocModule)?.badge}
                </span>
              </div>

              {/* Sub-Tab Navigation Bar within the Sub-Page */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 no-scrollbar border-t pt-2 border-slate-200 dark:border-neutral-800">
                {docModules
                  .find((m) => m.id === activeDocModule)
                  ?.subTabs.map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setActiveSubTab(st.id)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all shrink-0 cursor-pointer ${
                        activeSubTab === st.id
                          ? "bg-blue-600 text-white shadow-md"
                          : "bg-slate-500/10 text-slate-400 hover:text-white"
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
              </div>
            </div>

            {/* ------------------------------------------------------------------- */}
            {/* MODULE 1: PROJECT BLUEPRINT CONTENT */}
            {/* ------------------------------------------------------------------- */}
            {activeDocModule === "blueprint" && (
              <div className="space-y-3 text-[11px] leading-relaxed">
                {activeSubTab === "overview" && (
                  <div className={`p-4 rounded-2xl border space-y-3 ${containerBg}`}>
                    <div className="flex items-center space-x-2 border-b pb-2 border-slate-200 dark:border-neutral-800">
                      <Compass className="w-4 h-4 text-blue-400" />
                      <h3 className={`text-xs font-black uppercase ${textPrimary}`}>Utambulisho wa TakeTalon (Project Blueprint)</h3>
                    </div>
                    <p className={textSecondary}>
                      TakeTalon ni mfumo wa kisasa unaounganisha vipengele vya <strong>Media Social</strong>, <strong>Prediction Platform</strong> na <strong>Jeux de Hazard</strong> katika mazingira moja salama, yanayoweza kukua na yanayoweza kutumiwa na watu wengi.
                    </p>
                    <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 space-y-1.5">
                      <h4 className="font-bold text-blue-400 text-[10px] uppercase">Ecosystem Inavyofanya Kazi:</h4>
                      <ul className="list-disc pl-4 space-y-1 text-slate-300 text-[10.5px]">
                        <li><strong>Social Media Layer:</strong> Watumiaji wanaweza ku-post, kutoa uchambuzi na kujenga jamii zao.</li>
                        <li><strong>Prediction Platform:</strong> Mechi na Odds za mpira wa miguu zinachambuliwa kwa AI.</li>
                        <li><strong>Voucher Economy:</strong> Vocha zote za simu zinabadilishwa kuwa salio rasmi.</li>
                        <li><strong>Community Economy:</strong> Professional Users na CEOs wanajipatia kipato kupitia Unlockers.</li>
                      </ul>
                    </div>
                  </div>
                )}

                {activeSubTab === "voucher_economy" && (
                  <div className={`p-4 rounded-2xl border space-y-3 ${containerBg}`}>
                    <div className="flex items-center space-x-2 border-b pb-2 border-slate-200 dark:border-neutral-800">
                      <Coins className="w-4 h-4 text-amber-400" />
                      <h3 className={`text-xs font-black uppercase ${textPrimary}`}>Uchumi wa Vocha (Voucher Economy)</h3>
                    </div>
                    <p className={textSecondary}>
                      TakeTalon hutumia Voucher Economy kama msingi wa miamala ya awali kabla ya kuunganishwa rasmi na mifumo ya benki au Electronic Money APIs.
                    </p>
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[10.5px] space-y-1">
                      <p className="font-bold text-amber-400">Sheria za Mzunguko wa Vocha:</p>
                      <p>1. Voucher ndiyo hifadhi kuu ya mwanzo ya salio.</p>
                      <p>2. Wallet huhifadhi salio rasmi lililothibitishwa.</p>
                      <p>3. SMS Forwarder inasoma kodi za vocha na kusasisha Database kiotomatiki.</p>
                    </div>
                  </div>
                )}

                {activeSubTab === "regional_launch" && (
                  <div className={`p-4 rounded-2xl border space-y-3 ${containerBg}`}>
                    <div className="flex items-center space-x-2 border-b pb-2 border-slate-200 dark:border-neutral-800">
                      <Globe className="w-4 h-4 text-emerald-400" />
                      <h3 className={`text-xs font-black uppercase ${textPrimary}`}>Mkoa wa Kwanza wa Huduma (Burundi Launch)</h3>
                    </div>
                    <p className={textSecondary}>
                      Awamu ya kwanza ya huduma za TakeTalon inaanza rasmi nchini 🇧🇮 <strong>Burundi (FBU)</strong> kabla ya kupanuka kuelekea mataifa mengine ya Afrika Mashariki (Tanzania, Kenya, Rwanda, Uganda, DRC).
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ------------------------------------------------------------------- */}
            {/* MODULE 2: BUSINESS LOGIC CONTENT */}
            {/* ------------------------------------------------------------------- */}
            {activeDocModule === "business_logic" && (
              <div className="space-y-3 text-[11px] leading-relaxed">
                {activeSubTab === "account_roles" && (
                  <div className={`p-4 rounded-2xl border space-y-3 ${containerBg}`}>
                    <div className="flex items-center space-x-2 border-b pb-2 border-slate-200 dark:border-neutral-800">
                      <UserCheck className="w-4 h-4 text-amber-400" />
                      <h3 className={`text-xs font-black uppercase ${textPrimary}`}>Aina za Akaunti na Majukumu (Account Hierarchy)</h3>
                    </div>

                    <div className="space-y-2 text-[10.5px]">
                      <div className="p-2.5 rounded-xl border border-slate-500/20 bg-black/20">
                        <span className="font-bold text-blue-400">1. Standard User:</span>
                        <p className="text-slate-300">Anaweza kusoma, ku-unlock, ku-unlockiwa, kubet, kuweka vocha na kutoa pesa.</p>
                      </div>

                      <div className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10">
                        <span className="font-bold text-amber-400">2. Professional Account / CEO:</span>
                        <p className="text-slate-300">Account inayolipiwa. Inaweza kupost mechi, kuuza taarifa za VIP, kupata Unlockers na kupata Commission ya 90%.</p>
                      </div>

                      <div className="p-2.5 rounded-xl border border-purple-500/30 bg-purple-500/10">
                        <span className="font-bold text-purple-400">3. Admin & Super Admin:</span>
                        <p className="text-slate-300">Usimamizi wa matoleo na ripoti. Admin na Super Admin HAWAWEZI kubadilisha salio la mtumiaji wala kuhariri Ledger.</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeSubTab === "unlock_mechanics" && (
                  <div className={`p-4 rounded-2xl border space-y-3 ${containerBg}`}>
                    <div className="flex items-center space-x-2 border-b pb-2 border-slate-200 dark:border-neutral-800">
                      <Lock className="w-4 h-4 text-blue-400" />
                      <h3 className={`text-xs font-black uppercase ${textPrimary}`}>Mfumo wa Unlock na Dhamana</h3>
                    </div>
                    <p className={textSecondary}>
                      Unlock si Follow na wala si Friend. Unlock ni ruhusa ya biashara ambapo mtumiaji analipia ili kuona posts za mtabiri (CEO).
                    </p>
                    <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[10.5px] space-y-1">
                      <p className="font-bold text-blue-400">Pande Mbili za Unlock System:</p>
                      <p>• <strong>Unlocking:</strong> Watu wanaoona posts zako kwa sababu umewalipia.</p>
                      <p>• <strong>Unlockers:</strong> Watu waliokulipia ili waone posts zako.</p>
                    </div>
                  </div>
                )}

                {activeSubTab === "commissions" && (
                  <div className={`p-4 rounded-2xl border space-y-3 ${containerBg}`}>
                    <div className="flex items-center space-x-2 border-b pb-2 border-slate-200 dark:border-neutral-800">
                      <Award className="w-4 h-4 text-emerald-400" />
                      <h3 className={`text-xs font-black uppercase ${textPrimary}`}>Gawanyo la Commission (90% / 10% Split)</h3>
                    </div>
                    <p className={textSecondary}>
                      Kila unlock ya kulipia inapofanyika, mfumo unagawanya mapato kulingana na sheria rasmi zilizohifadhiwa kwenye Database:
                    </p>
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 font-mono text-[10.5px] space-y-1">
                      <p className="font-bold text-emerald-400">Total Unlock Payment = 100%</p>
                      <p>├── CEO / Tipster Share: 90% (Inakwenda kwenye Wallet)</p>
                      <p>└── TakeTalon Platform Fee: 10% (Inakwenda kwenye System Fee Ledger)</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ------------------------------------------------------------------- */}
            {/* MODULE 3: SYSTEM ARCHITECTURE CONTENT */}
            {/* ------------------------------------------------------------------- */}
            {activeDocModule === "architecture" && (
              <div className="space-y-3 text-[11px] leading-relaxed">
                {activeSubTab === "tech_stack" && (
                  <div className={`p-4 rounded-2xl border space-y-3 ${containerBg}`}>
                    <div className="flex items-center space-x-2 border-b pb-2 border-slate-200 dark:border-neutral-800">
                      <Server className="w-4 h-4 text-cyan-400" />
                      <h3 className={`text-xs font-black uppercase ${textPrimary}`}>Teknolojia za Mfumo (Full Stack Stack)</h3>
                    </div>
                    <ul className="space-y-1.5 text-[10.5px] text-slate-300">
                      <li>• <strong>Frontend:</strong> React 18+, TypeScript, Vite, Tailwind CSS & Motion.</li>
                      <li>• <strong>Database:</strong> Supabase PostgreSQL (Row Level Security & Foreign Keys).</li>
                      <li>• <strong>Runtime:</strong> Node.js Express server na ESM bundling.</li>
                      <li>• <strong>PWA Engine:</strong> Inasaidia matumizi ya simu za mkononi kama App bila hitaji la kuipakua kwenye Store.</li>
                    </ul>
                  </div>
                )}

                {activeSubTab === "sms_gateway" && (
                  <div className={`p-4 rounded-2xl border space-y-3 ${containerBg}`}>
                    <div className="flex items-center space-x-2 border-b pb-2 border-slate-200 dark:border-neutral-800">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <h3 className={`text-xs font-black uppercase ${textPrimary}`}>SMS Forwarder Gateway Subsystem</h3>
                    </div>
                    <p className={textSecondary}>
                      SMS Forwarder ni mfumo wa kando unaopokea SMS za miamala ya M-Pesa/Lumicash, kuzichambua kwa regex, na kutuma kodi kwenye backend ili kusasisha wallet salama.
                    </p>
                  </div>
                )}

                {activeSubTab === "platform_independence" && (
                  <div className={`p-4 rounded-2xl border space-y-3 ${containerBg}`}>
                    <div className="flex items-center space-x-2 border-b pb-2 border-slate-200 dark:border-neutral-800">
                      <Layers className="w-4 h-4 text-sky-400" />
                      <h3 className={`text-xs font-black uppercase ${textPrimary}`}>Uhuru wa Mfumo (Platform Agnostic Rules)</h3>
                    </div>
                    <p className={textSecondary}>
                      TakeTalon si mali ya platform au builder yoyote. Code na Business Logic zote zimejengwa kwa mtindo wa kusaidia kuhamishwa (Portable Architecture) bila kufungwa.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ------------------------------------------------------------------- */}
            {/* MODULE 4: WALLET LEDGER CONTENT */}
            {/* ------------------------------------------------------------------- */}
            {activeDocModule === "wallet_ledger" && (
              <div className="space-y-3 text-[11px] leading-relaxed">
                {activeSubTab === "single_truth" && (
                  <div className={`p-4 rounded-2xl border space-y-3 ${containerBg}`}>
                    <div className="flex items-center space-x-2 border-b pb-2 border-slate-200 dark:border-neutral-800">
                      <Database className="w-4 h-4 text-emerald-400" />
                      <h3 className={`text-xs font-black uppercase ${textPrimary}`}>Database Ndiyo Chanzo Pekee cha Ukweli</h3>
                    </div>
                    <p className={textSecondary}>
                      Hakuna salio, transaction wala miamala itakayohifadhiwa kwenye LocalStorage au kuhesabiwa upande wa Frontend. Database ya Supabase ndiyo mtawala pekee.
                    </p>
                  </div>
                )}

                {activeSubTab === "double_wallet" && (
                  <div className={`p-4 rounded-2xl border space-y-3 ${containerBg}`}>
                    <div className="flex items-center space-x-2 border-b pb-2 border-slate-200 dark:border-neutral-800">
                      <Wallet className="w-4 h-4 text-blue-400" />
                      <h3 className={`text-xs font-black uppercase ${textPrimary}`}>Mfumo wa Mikoba Miwili (Double-Wallet Architecture)</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10.5px]">
                      <div className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10">
                        <span className="font-bold text-amber-400">1. Voucher Wallet:</span>
                        <p className="text-slate-300">Hifadhi ya vocha na amana ambazo hazijabadilishwa kuwa pesa taslimu.</p>
                      </div>

                      <div className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10">
                        <span className="font-bold text-emerald-400">2. Real Money Wallet:</span>
                        <p className="text-slate-300">Salio rasmi la kutoa, kucheza na ku-unlock watabiri wengine.</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeSubTab === "audit_chain" && (
                  <div className={`p-4 rounded-2xl border space-y-3 ${containerBg}`}>
                    <div className="flex items-center space-x-2 border-b pb-2 border-slate-200 dark:border-neutral-800">
                      <FileCheck className="w-4 h-4 text-cyan-400" />
                      <h3 className={`text-xs font-black uppercase ${textPrimary}`}>Mlolongo wa Audit Ledger (Immutable Ledger)</h3>
                    </div>
                    <p className={textSecondary}>
                      Kila muamala unaofanyika kwenye mkoba lazima uhifadhi pointi hizi 5 ili kuzuia udanganyifu au mabadiliko yasiyo halali:
                    </p>
                    <div className="p-3 rounded-xl bg-black/30 font-mono text-[10px] text-cyan-300 space-y-1">
                      <p>Reference ID ──► Timestamp ──► Before Balance ──► After Balance ──► Audit Hash</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ------------------------------------------------------------------- */}
            {/* MODULE 5: SECURITY GUIDE CONTENT */}
            {/* ------------------------------------------------------------------- */}
            {activeDocModule === "security_guide" && (
              <div className="space-y-3 text-[11px] leading-relaxed">
                {activeSubTab === "auth_roadmap" && (
                  <div className={`p-4 rounded-2xl border space-y-3 ${containerBg}`}>
                    <div className="flex items-center space-x-2 border-b pb-2 border-slate-200 dark:border-neutral-800">
                      <Lock className="w-4 h-4 text-rose-400" />
                      <h3 className={`text-xs font-black uppercase ${textPrimary}`}>Authentication & OTP Roadmap</h3>
                    </div>
                    <p className={textSecondary}>
                      Mfumo wa kuingia kwenye akaunti umepangwa katika hatua 3 kuu ili kuhakikisha usalama wa hali ya juu:
                    </p>
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[10.5px] space-y-1">
                      <p>• <strong>Prototype:</strong> Email Magic Link</p>
                      <p>• <strong>Production:</strong> WhatsApp OTP Instant Verification</p>
                      <p>• <strong>Future:</strong> Multi-Factor Authentication (2FA) & Device Fingerprinting</p>
                    </div>
                  </div>
                )}

                {activeSubTab === "rls_matrix" && (
                  <div className={`p-4 rounded-2xl border space-y-3 ${containerBg}`}>
                    <div className="flex items-center space-x-2 border-b pb-2 border-slate-200 dark:border-neutral-800">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <h3 className={`text-xs font-black uppercase ${textPrimary}`}>Row Level Security (RLS) Matrix</h3>
                    </div>
                    <p className={textSecondary}>
                      Row Level Security inahakikisha kila mtumiaji anaona na kubadilisha data yake pekee. Admin au CEO hawezi kusoma jumbe za mtu mwingine au kubadilisha salio la mtumiaji bila idhini.
                    </p>
                  </div>
                )}

                {activeSubTab === "fraud_engine" && (
                  <div className={`p-4 rounded-2xl border space-y-3 ${containerBg}`}>
                    <div className="flex items-center space-x-2 border-b pb-2 border-slate-200 dark:border-neutral-800">
                      <ShieldAlert className="w-4 h-4 text-amber-400" />
                      <h3 className={`text-xs font-black uppercase ${textPrimary}`}>Uchunguzi wa Udanganyifu & Provably Fair SHA-256</h3>
                    </div>
                    <p className={textSecondary}>
                      Mchezo wa Aviator unatumia SHA-256 Provably Fair HMAC hashes. Mfumo unakagua kurejewa kwa SMS zile zile (Duplicate SMS) au miamala ya bandia kiotomatiki.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ------------------------------------------------------------------- */}
            {/* MODULE 6: ROADMAP CONTENT */}
            {/* ------------------------------------------------------------------- */}
            {activeDocModule === "roadmap" && (
              <div className="space-y-3 text-[11px] leading-relaxed">
                {activeSubTab === "phase_1_4" && (
                  <div className={`p-4 rounded-2xl border space-y-3 ${containerBg}`}>
                    <div className="flex items-center space-x-2 border-b pb-2 border-slate-200 dark:border-neutral-800">
                      <Activity className="w-4 h-4 text-purple-400" />
                      <h3 className={`text-xs font-black uppercase ${textPrimary}`}>Awamu za 1 hadi 4 za Mradi</h3>
                    </div>
                    <div className="space-y-2 text-[10.5px]">
                      <p>• <strong>Phase 1 (Foundation):</strong> Architecture, Supabase, Auth, Wallet & Posts.</p>
                      <p>• <strong>Phase 2 (Core Business):</strong> Professional Accounts, CEO Contracts & Ledger.</p>
                      <p>• <strong>Phase 3 (Platform Completion):</strong> PWA, Android APK, Performance Optimization.</p>
                      <p>• <strong>Phase 4 (Electronic Money):</strong> Lumicash, Ecocash & direct Mobile Money integrations.</p>
                    </div>
                  </div>
                )}

                {activeSubTab === "phase_5_8" && (
                  <div className={`p-4 rounded-2xl border space-y-3 ${containerBg}`}>
                    <div className="flex items-center space-x-2 border-b pb-2 border-slate-200 dark:border-neutral-800">
                      <Globe className="w-4 h-4 text-blue-400" />
                      <h3 className={`text-xs font-black uppercase ${textPrimary}`}>Awamu za 5 hadi 8 (Expansion)</h3>
                    </div>
                    <div className="space-y-2 text-[10.5px]">
                      <p>• <strong>Phase 5 (Business Expansion):</strong> Professional Marketplace & Premium Analytics.</p>
                      <p>• <strong>Phase 6 (Production Audit):</strong> Security Audit, Load Testing & Optimization.</p>
                      <p>• <strong>Phase 7 (Burundi Launch):</strong> Official Public Release & System Monitoring.</p>
                      <p>• <strong>Phase 8 (Regional Expansion):</strong> East Africa (TZ, KE, RW, UG, DRC) & International.</p>
                    </div>
                  </div>
                )}

                {activeSubTab === "electronic_money" && (
                  <div className={`p-4 rounded-2xl border space-y-3 ${containerBg}`}>
                    <div className="flex items-center space-x-2 border-b pb-2 border-slate-200 dark:border-neutral-800">
                      <Coins className="w-4 h-4 text-emerald-400" />
                      <h3 className={`text-xs font-black uppercase ${textPrimary}`}>Integration za Lumicash & Ecocash</h3>
                    </div>
                    <p className={textSecondary}>
                      Mfumo umeandaliwa kupokea API rasmi za Lumicash na Ecocash Burundi bila kubadilisha muundo mkuu wa Wallet Ledger.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ------------------------------------------------------------------- */}
            {/* MODULE 7: PROJECT RULES CONTENT */}
            {/* ------------------------------------------------------------------- */}
            {activeDocModule === "project_rules" && (
              <div className="space-y-3 text-[11px] leading-relaxed">
                {activeSubTab === "core_20_rules" && (
                  <div className={`p-4 rounded-2xl border space-y-3 ${containerBg}`}>
                    <div className="flex items-center space-x-2 border-b pb-2 border-slate-200 dark:border-neutral-800">
                      <Scale className="w-4 h-4 text-sky-400" />
                      <h3 className={`text-xs font-black uppercase ${textPrimary}`}>Muhtasari wa Sheria 20 za Mradi (Project Rules)</h3>
                    </div>
                    <div className="space-y-1.5 text-[10px] text-slate-300">
                      <p>1. Usibadilishe Architecture bila sababu ya kitaalamu.</p>
                      <p>2. Kila feature mpya lazima iwe Production-Ready.</p>
                      <p>3. Database ndiyo chanzo pekee cha ukweli.</p>
                      <p>4. Hakuna balance inayobadilishwa kupitia Frontend.</p>
                      <p>5. Material Symbols Rounded na Lucide ndizo icons rasmi (Hakuna Emojis kama icons).</p>
                      <p>6. Admin na Super Admin hawamiliki fedha na hawawezi kuhariri Ledger.</p>
                    </div>
                  </div>
                )}

                {activeSubTab === "design_rules" && (
                  <div className={`p-4 rounded-2xl border space-y-3 ${containerBg}`}>
                    <div className="flex items-center space-x-2 border-b pb-2 border-slate-200 dark:border-neutral-800">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <h3 className={`text-xs font-black uppercase ${textPrimary}`}>Sheria za UI/UX na Design System</h3>
                    </div>
                    <p className={textSecondary}>
                      UI lazima ibaki: <strong>Modern, Premium, Minimal, Fast, Accessible, Responsive</strong>. Blue Slate / Blue Gray Theme ndiyo utambulisho rasmi.
                    </p>
                  </div>
                )}

                {activeSubTab === "zero_hardcode" && (
                  <div className={`p-4 rounded-2xl border space-y-3 ${containerBg}`}>
                    <div className="flex items-center space-x-2 border-b pb-2 border-slate-200 dark:border-neutral-800">
                      <Terminal className="w-4 h-4 text-rose-400" />
                      <h3 className={`text-xs font-black uppercase ${textPrimary}`}>Zero Hardcode Policy</h3>
                    </div>
                    <p className={textSecondary}>
                      Bei zote, viwango vya commission (90%), na ada za miamala vinatoka kwenye Database pekee. Hakuna kuweka bei hardcoded ndani ya code.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* CROSS-DOCUMENT SUB-ROUTING LINKS AT THE BOTTOM OF SUB-PAGES */}
            <div className={`p-3.5 rounded-2xl border ${containerBg} space-y-2.5 mt-4`}>
              <h4 className={`text-xs font-black uppercase tracking-wider ${textPrimary}`}>
                {isSwahili ? "Soma Miongozo Inayofuata (Cross-Doc Sub-Routing)" : "Cross-Document Reading Links"}
              </h4>

              <div className="grid grid-cols-2 gap-2 text-[10px]">
                {docModules
                  .filter((m) => m.id !== activeDocModule)
                  .slice(0, 4)
                  .map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setActiveDocModule(m.id);
                        setActiveSubTab(m.subTabs[0].id);
                      }}
                      className="p-2 rounded-xl border border-blue-500/20 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 font-bold flex items-center justify-between text-left cursor-pointer active:scale-95 transition-all"
                    >
                      <span className="line-clamp-1">{m.title}</span>
                      <ArrowRight className="w-3 h-3 shrink-0 ml-1 text-blue-400" />
                    </button>
                  ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QUICK SYSTEM STATS & COMPLIANCE FOOTER */}
      <div className={`p-3 rounded-2xl border ${containerBg} flex items-center justify-between text-[9.5px]`}>
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-slate-400 font-mono">TAKETALON CORE SYSTEM v2.4</span>
        </div>
        <span className="text-emerald-400 font-bold font-mono">LEDGER VERIFIED</span>
      </div>
    </div>
  );
}
