/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  Shield,
  ShieldCheck,
  FileText,
  Lock,
  Scale,
  Award,
  AlertTriangle,
  BookOpen,
  Search,
  CheckCircle2,
  HelpCircle,
  ChevronRight,
  ExternalLink,
  Info,
  Server,
  UserCheck,
  Coins,
  Copy,
  Check,
  Ban,
  Trash2
} from "lucide-react";
import HelpQuestionIcon from "./HelpQuestionIcon";
import PrivacyPadlockIcon from "./PrivacyPadlockIcon";
import SecurityFillIcon from "./SecurityFillIcon";
import OfficialLicenseIcon from "./OfficialLicenseIcon";
import ThreatPhoneIcon from "./ThreatPhoneIcon";

export type LegalSectionId =
  | "terms"
  | "privacy"
  | "police_rules"
  | "anti_fraud"
  | "license"
  | "responsible"
  | "blockage"
  | "account_deletion";

interface LegalViewProps {
  theme: "light" | "dark" | "blue";
  onBackToHome: () => void;
  lang: "en" | "fr" | "sw";
  onAddNotification?: (msg: string, type?: "success" | "info" | "error") => void;
  initialSection?: LegalSectionId;
  onNavigateTab?: (tab: string) => void;
}

export default function LegalView({
  theme,
  onBackToHome,
  lang,
  onAddNotification,
  initialSection,
  onNavigateTab,
}: LegalViewProps) {
  const [activeSection, setActiveSection] = useState<LegalSectionId | null>(initialSection || null);
  const [activeSubTab, setActiveSubTab] = useState<string>("overview");

  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection);
      const sec = sections.find((s) => s.id === initialSection);
      if (sec && sec.subTabs.length > 0) {
        setActiveSubTab(sec.subTabs[0].id);
      }
    }
  }, [initialSection]);

  const [searchQuery, setSearchQuery] = useState("");
  const [copiedLicense, setCopiedLicense] = useState(false);

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

  const handleCopyLicense = () => {
    navigator.clipboard.writeText("REG-BDI-2026-TT88019-PRO");
    setCopiedLicense(true);
    if (onAddNotification) {
      onAddNotification(
        tr("Namba ya leseni imenakiliwa!", "Numéro de licence copié !", "License number copied!"),
        "info"
      );
    }
    setTimeout(() => setCopiedLicense(false), 2000);
  };

  const sections = [
    {
      id: "terms" as LegalSectionId,
      title: tr("1. Masharti ya Matumizi", "1. Conditions d'Utilisation", "1. Terms of Service"),
      subtitle: tr("Sheria za akaunti, umri wa miaka 18+, na matumizi ya mfumo", "Règles de compte, politique 18+ et directives", "Account rules, 18+ age policy & system guidelines"),
      icon: FileText,
      color: "text-blue-400 bg-blue-500/15 border-blue-500/30",
      badge: "V1.0 Legal",
      readTime: tr("Dakika 6 za kusoma", "6 min de lecture", "6 min read"),
      subTabs: [
        { id: "age_policy", label: tr("Kigezo cha 18+", "Règle 18+", "18+ Rule") },
        { id: "accounts", label: tr("Akaunti Moja", "Compte Unique", "Single Account") },
        { id: "wallet_rules", label: tr("Salio & Miamala", "Portefeuille", "Wallet & Balances") },
        { id: "ceos", label: tr("Watabiri (CEOs)", "CEOs & Pronostiqueurs", "CEOs & Tipsters") },
        { id: "aviator_game", label: tr("Mchezo wa Aviator", "Jeu Aviator", "Aviator Game") },
      ],
    },
    {
      id: "police_rules" as LegalSectionId,
      title: tr("2. Sheria za Polisi & Mamlaka", "2. Réglementation Policière", "2. Police & Gaming Regulations"),
      subtitle: tr("Utekelezaji wa sheria za kamari, udhibiti wa usalama na polisi", "Conformité aux jeux, normes policières et autorité", "Gaming compliance, police safety standards & legal authority"),
      icon: SecurityFillIcon,
      color: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30",
      badge: "Police Standard",
      readTime: tr("Dakika 7 za kusoma", "7 min de lecture", "7 min read"),
      subTabs: [
        { id: "police_overview", label: tr("Ushirikiano wa Polisi", "Partenariat Police", "Police Partnership") },
        { id: "kyc_id", label: tr("Uhakiki wa KYC", "Vérification KYC", "KYC Verification") },
        { id: "sim_sms", label: tr("SMS & Laini Rasmi", "Passerelle SMS", "Official SIM & SMS") },
        { id: "cybercrime", label: tr("Cybercrime & Audit", "Cybercriminalité & Audit", "Cybercrime & Audit") },
      ],
    },
    {
      id: "privacy" as LegalSectionId,
      title: tr("3. Sera ya Faragha na Data", "3. Confidentialité & Données", "3. Privacy & Data Protection"),
      subtitle: tr("Ulinzi wa taarifa binafsi, encryption na usalama wa data", "Protection des données personnelles et chiffrement", "Personal data protection, encryption & confidentiality"),
      icon: PrivacyPadlockIcon,
      color: "text-cyan-400 bg-cyan-500/15 border-cyan-500/30",
      badge: "AES-256 Encrypted",
      readTime: tr("Dakika 5 za kusoma", "5 min de lecture", "5 min read"),
      subTabs: [
        { id: "collected_data", label: tr("Data Tunazokusanya", "Données Collectées", "Data Collected") },
        { id: "encryption_rls", label: tr("Usimbaji & RLS", "Chiffrement & RLS", "Encryption & RLS") },
        { id: "third_parties", label: tr("Ulinzi wa Taarifa", "Protection Tiers", "Data Protection") },
      ],
    },
    {
      id: "anti_fraud" as LegalSectionId,
      title: tr("4. Mfumo wa Anti-Fraud & AML", "4. Anti-Fraude & Blanchiment", "4. Anti-Fraud & AML Compliance"),
      subtitle: tr("Kuzuia utakatishaji fedha, akaunti feki na kadi za kughushi", "Lutte contre le blanchiment d'argent et faux comptes", "Anti-money laundering, fake accounts & fraud detection"),
      icon: ShieldCheck,
      color: "text-rose-400 bg-rose-500/15 border-rose-500/30",
      badge: "Strict Protection",
      readTime: tr("Dakika 6 za kusoma", "6 min de lecture", "6 min read"),
      subTabs: [
        { id: "zero_tolerance", label: tr("Zero Tolerance", "Tolérance Zéro", "Zero Tolerance") },
        { id: "turnover", label: tr("Turnover 1x (AML)", "Règle Turnover 1x", "Turnover 1x (AML)") },
        { id: "tokens", label: tr("Cryptographic Tokens", "Tokens Cryptographiques", "Cryptographic Tokens") },
        { id: "appeals", label: tr("Utaratibu wa Rufaa", "Procédure d'Appel", "Appeals") },
      ],
    },
    {
      id: "license" as LegalSectionId,
      title: tr("5. Leseni & SHA-256 Provably Fair", "5. Licence & SHA-256 Équitable", "5. Enterprise Licensing & SHA-256"),
      subtitle: tr("Namba ya usajili wa biashara na uhakiki wa haki ya michezo", "Numéro d'enregistrement d'entreprise et vérificateur", "Enterprise registration number & provably fair verifier"),
      icon: OfficialLicenseIcon,
      color: "text-amber-400 bg-amber-500/15 border-amber-500/30",
      badge: "REG-BDI-2026",
      readTime: tr("Dakika 4 za kusoma", "4 min de lecture", "4 min read"),
      subTabs: [
        { id: "license_num", label: tr("Usajili wa Leseni", "Numéro de Licence", "License Registry") },
        { id: "provably_fair", label: tr("SHA-256 Provably Fair", "Algorithme SHA-256", "Provably Fair") },
        { id: "rtp_stats", label: tr("RTP 97.5%", "Conformité RTP", "RTP 97.5%") },
      ],
    },
    {
      id: "responsible" as LegalSectionId,
      title: tr("6. Responsible Gaming (Mchezo wa Kiasi)", "6. Jeu Responsable", "6. Responsible Gaming"),
      subtitle: tr("Ushauri wa udhibiti wa fedha, vikomo vya salio na helplines", "Limites financières, assistance et ligne directe 24/7", "Financial limits, addiction help & 24/7 hotline support"),
      icon: AlertTriangle,
      color: "text-rose-400 bg-rose-500/15 border-rose-500/30",
      badge: "18+ Safety",
      readTime: tr("Dakika 5 za kusoma", "5 min de lecture", "5 min read"),
      subTabs: [
        { id: "core_principles", label: tr("Misingi ya Mchezo", "Directives de Jeu", "Core Principles") },
        { id: "deposit_limits", label: tr("Vikomo vya Bajeti", "Limites de Dépôt", "Deposit Limits") },
        { id: "self_exclusion", label: tr("Self-Exclusion", "Auto-Exclusion", "Self-Exclusion") },
        { id: "helpline_call", label: tr("24/7 Hotline", "Ligne d'Assistance", "24/7 Hotline") },
      ],
    },
    {
      id: "blockage" as LegalSectionId,
      title: tr("7. Kufungiwa & Kusimamishwa kwa Akaunti", "7. Blocage et Suspension de Compte", "7. Account Blocking & Suspension"),
      subtitle: tr("Sababu za kufungiwa, ngazi za adhabu na utaratibu wa rufaa", "Motifs de blocage, sanctions et procédure d'appel", "Blocking triggers, penalty tiers & appeal process"),
      icon: Ban,
      color: "text-orange-400 bg-orange-500/15 border-orange-500/30",
      badge: "ENFORCEMENT",
      readTime: tr("Dakika 6 za kusoma", "6 min de lecture", "6 min read"),
      subTabs: [
        { id: "triggers", label: tr("Sababu za Kufungiwa", "Motifs de Blocage", "Blocking Triggers") },
        { id: "penalty_tiers", label: tr("Ngazi 3 za Adhabu", "3 Paliers de Sanctions", "3 Penalty Tiers") },
        { id: "frozen_funds", label: tr("Hali ya Salio", "Traitement des Soldes", "Frozen Balances") },
        { id: "appeal_action", label: tr("Rufaa ya Kufunguliwa", "Recours & Déblocage", "Appeal Steps") },
      ],
    },
    {
      id: "account_deletion" as LegalSectionId,
      title: tr("8. Kufuta Akaunti Kabisa", "8. Suppression Définitive du Compte", "8. Permanent Account Deletion"),
      subtitle: tr("Utaratibu wa kufuta akaunti, kipindi cha neema na uhifadhi wa data", "Procédure de suppression, délai de grâce et rétention", "Deletion process, grace period & data retention"),
      icon: Trash2,
      color: "text-red-400 bg-red-500/15 border-red-500/30",
      badge: "IRREVERSIBLE",
      readTime: tr("Dakika 4 za kusoma", "4 min de lecture", "4 min read"),
      subTabs: [
        { id: "delete_procedure", label: tr("Utaratibu wa Kufuta", "Procédure", "Deletion Procedure") },
        { id: "delete_prerequisites", label: tr("Vigezo vya Lazima", "Conditions", "Prerequisites") },
        { id: "grace_period", label: tr("Siku 30 za Neema", "Délai de Grâce", "30-Day Grace") },
        { id: "data_retention", label: tr("Uhifadhi wa Kisheria", "Rétention Légale", "Legal Retention") },
      ],
    },
  ];

  // Filter sections based on search query
  const filteredSections = sections.filter((sec) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      sec.title.toLowerCase().includes(q) ||
      sec.subtitle.toLowerCase().includes(q)
    );
  });

  const currentSection = sections.find((s) => s.id === activeSection);

  return (
    <div className="max-w-md mx-auto px-3.5 py-2.5 pb-28 space-y-4 text-left">
      {/* HEADER BREADCRUMB */}
      <div className="flex items-center justify-between pb-2 border-b border-dashed border-slate-300 dark:border-neutral-800">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => {
              if (activeSection) {
                setActiveSection(null);
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
            <span className="text-[9px] font-mono font-bold text-blue-400 uppercase tracking-widest">
              TAKETALON LEGAL PORTAL
            </span>
            <h2 className={`text-sm font-black uppercase tracking-wide ${textPrimary}`}>
              {tr("Sheria, Polisi & Miongozo ya Kisheria", "Portail Juridique & Conformité Policière", "Legal & Police Compliance Portal")}
            </h2>
          </div>
        </div>

        <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          POLICE VERIFIED
        </span>
      </div>

      {/* SEARCH BAR (WHEN ON INDEX) */}
      {!activeSection && (
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={tr(
              "Tafuta sheria, mamlaka, polisi, au leseni...",
              "Rechercher une réglementation, police ou licence...",
              "Search regulations, police rules, or license..."
            )}
            className={`w-full pl-9 pr-8 py-2.5 rounded-2xl text-xs border focus:outline-none transition-all ${
              theme === "light"
                ? "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500"
                : "bg-neutral-900 border-neutral-800 text-white placeholder:text-neutral-500 focus:border-blue-500"
            }`}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* QUICK SHORTCUT TO HELP & DOCUMENTATION */}
      {!activeSection && (
        <div className={`p-3 rounded-2xl border ${containerBg} space-y-2`}>
          <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest block">
            {tr("MASHARTI & MSAADA WA HARAKA", "PORTAILS LÉGAUX ET SUPPORT", "LEGAL & SUPPORT PORTALS")}
          </span>
          <div className="grid grid-cols-2 gap-2 text-center">
            <button
              type="button"
              onClick={() => onNavigateTab?.("Help")}
              className="p-2.5 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 transition-all active:scale-95 cursor-pointer flex flex-col items-center justify-center space-y-1"
            >
              <BookOpen className="w-4 h-4 text-blue-400" />
              <span className="text-[9.5px] font-bold uppercase leading-tight">
                {tr("Nyaraka & Mwongozo (Help)", "Manuel & Documentation", "Help & System Manual")}
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
      {/* 1. LEGAL INDEX MODULE CARDS (8 SECTIONS) */}
      {/* ========================================================================= */}
      {!activeSection && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className={`text-xs font-black uppercase tracking-wider flex items-center space-x-1.5 ${textPrimary}`}>
              <Scale className="w-4 h-4 text-emerald-400" />
              <span>{tr("Miongozo Rasmi ya Kisheria na Polisi (8 Sections)", "8 Sections Juridiques & Policières", "8 Legal & Police Framework Sections")}</span>
            </h3>
            <span className="text-[9px] font-mono text-slate-400">{filteredSections.length} Sections</span>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {filteredSections.map((sec) => {
              const Icon = sec.icon;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => {
                    setActiveSection(sec.id);
                    if (sec.subTabs && sec.subTabs.length > 0) {
                      setActiveSubTab(sec.subTabs[0].id);
                    }
                  }}
                  className={`p-3.5 rounded-2xl border text-left transition-all active:scale-[0.98] cursor-pointer flex items-center justify-between group ${cardBg}`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`p-2.5 rounded-xl border shrink-0 mt-0.5 ${sec.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border border-slate-500/20 text-slate-400 bg-black/20">
                          {sec.badge}
                        </span>
                        <span className="text-[9px] font-mono text-slate-400">{sec.readTime}</span>
                      </div>

                      <h4 className={`text-xs font-black uppercase tracking-wide leading-tight ${textPrimary}`}>
                        {sec.title}
                      </h4>

                      <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                        {sec.subtitle}
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
      {/* 2. READER CONTAINER FOR SELECTED SECTION WITH SUB-TABS */}
      {/* ========================================================================= */}
      <AnimatePresence mode="wait">
        {activeSection && currentSection && (
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* BREADCRUMB & SUB-TAB HEADER */}
            <div className={`p-3 rounded-2xl border ${containerBg} space-y-2.5`}>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setActiveSection(null)}
                  className="text-[10px] font-bold text-blue-400 hover:underline flex items-center space-x-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{tr("Rudi kwenye Orodha ya Sheria na Polisi", "Retour à l'index des réglementations", "Back to Legal & Police Index")}</span>
                </button>

                <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  {currentSection.badge}
                </span>
              </div>

              {/* Sub-Tab Navigation Bar within the Selected Legal Module */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 no-scrollbar border-t pt-2 border-slate-200 dark:border-neutral-800">
                {currentSection.subTabs.map((st) => (
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

            {/* MAIN CONTENT READER AREA (CLEAN FLOW - NO NESTED SUB-CARDS) */}
            <div className="space-y-3 text-[11px] leading-relaxed">
              {/* SECTION 1: TERMS OF SERVICE */}
              {activeSection === "terms" && (
                <>
                  {activeSubTab === "age_policy" && (
                    <div className={`p-4 rounded-2xl border space-y-3 ${containerBg}`}>
                      <div className="flex items-center space-x-2 border-b pb-2 border-slate-200 dark:border-neutral-800">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <h3 className={`text-xs font-black uppercase ${textPrimary}`}>Kigezo cha Umri - Miaka 18+ Pekee</h3>
                      </div>
                      <p className={textSecondary}>
                        Kujiunga na TakeTalon kunahitaji uwe na umri wa angalau miaka 18 au zaidi kulingana na sheria za nchi yako. Akaunti yoyote inayobainika kumilikiwa na mtu aliye chini ya miaka 18 itafungwa mara moja bila kurejesha salio.
                      </p>
                      <ul className="list-disc pl-4 space-y-1 text-[10.5px] text-slate-300">
                        <li>Kigezo cha miaka 18 kinalindwa na mamlaka za udhibiti wa michezo na sheria za jamhuri.</li>
                        <li>Uthibitisho wa Kitambulisho (KYC) unaweza kuombwa kabla ya kutoa fedha.</li>
                      </ul>
                    </div>
                  )}

                  {activeSubTab === "accounts" && (
                    <div className={`p-4 rounded-2xl border space-y-3 ${containerBg}`}>
                      <div className="flex items-center space-x-2 border-b pb-2 border-slate-200 dark:border-neutral-800">
                        <UserCheck className="w-4 h-4 text-blue-400" />
                        <h3 className={`text-xs font-black uppercase ${textPrimary}`}>Usajili wa Akaunti na Sheria ya Akaunti Moja</h3>
                      </div>
                      <p className={textSecondary}>
                        Kila mtumiaji anaruhusiwa kumiliki akaunti MOJA TU iliyosajiliwa na namba yake rasmi ya simu.
                      </p>
                      <ul className="list-disc pl-4 space-y-1 text-[10.5px] text-slate-300">
                        <li>Kufungua akaunti nyingi (Multi-Accounting) ili kujipatia vocha au bonasi za uongo ni marufuku kabisa.</li>
                        <li>Akaunti zote za ziada zitafungwa na salio kutaifishwa.</li>
                      </ul>
                    </div>
                  )}

                  {activeSubTab === "wallet_rules" && (
                    <div className={`p-4 rounded-2xl border space-y-3 ${containerBg}`}>
                      <div className="flex items-center space-x-2 border-b pb-2 border-slate-200 dark:border-neutral-800">
                        <Coins className="w-4 h-4 text-emerald-400" />
                        <h3 className={`text-xs font-black uppercase ${textPrimary}`}>Mfumo wa Wallet, Salio na Miamala</h3>
                      </div>
                      <p className={textSecondary}>
                        Mfumo unatumia muundo wa mikoba miwili: Real Money Wallet na Voucher Wallet.
                      </p>
                      <ul className="list-disc pl-4 space-y-1 text-[10.5px] text-slate-300">
                        <li><strong>Real Money Wallet:</strong> Salio la pesa halisi linalotumika kucheza, kununua tiketi au kutoa pesa kwenda Lumicash / Ecocash.</li>
                        <li><strong>Voucher Wallet:</strong> Salio la vocha za bonasi na punguzo. Linahitaji 1x turnover kabla ya kubadilishwa kuwa pesa taslimu.</li>
                        <li><strong>Vikomo:</strong> Kiwango cha chini cha kutoa ni FBU 1,000; Kiwango cha juu cha kutoa kwa siku ni FBU 5,000,000.</li>
                      </ul>
                    </div>
                  )}

                  {activeSubTab === "ceos" && (
                    <div className={`p-4 rounded-2xl border space-y-3 ${containerBg}`}>
                      <div className="flex items-center space-x-2 border-b pb-2 border-slate-200 dark:border-neutral-800">
                        <Award className="w-4 h-4 text-amber-400" />
                        <h3 className={`text-xs font-black uppercase ${textPrimary}`}>Haki na Wajibu wa Watabiri (CEOs & Tipsters)</h3>
                      </div>
                      <p className={textSecondary}>
                        Watabiri waliosajiliwa kama CEOs wana haki ya kupokea 90% ya mapato kutoka kwa watumiaji wanaofungua (unlock) kadi zao za utabiri.
                      </p>
                      <ul className="list-disc pl-4 space-y-1 text-[10.5px] text-slate-300">
                        <li>Ni marufuku kutoa maelekezo ya uongo, kadi zilizohaririwa (edited odds), au kudanganya jamii.</li>
                        <li>CEO anayebainika kudanganya atafutiwa badge na kusimamishwa kwa siku 30.</li>
                      </ul>
                    </div>
                  )}

                  {activeSubTab === "aviator_game" && (
                    <div className={`p-4 rounded-2xl border space-y-3 ${containerBg}`}>
                      <div className="flex items-center space-x-2 border-b pb-2 border-slate-200 dark:border-neutral-800">
                        <Server className="w-4 h-4 text-purple-400" />
                        <h3 className={`text-xs font-black uppercase ${textPrimary}`}>Mchezo wa Aviator na Mfumo wa Mtandao</h3>
                      </div>
                      <p className={textSecondary}>
                        Mchezo wa Aviator unatumia SHA-256 Provably Fair algorithm kutoa matokeo ya haki na ya nasibu (random multiplier).
                      </p>
                      <ul className="list-disc pl-4 space-y-1 text-[10.5px] text-slate-300">
                        <li>Ikiwa uliweka Auto Cashout na intaneti ikakatika, mfumo utakutoa kiotomatiki kwa multiplier uliyoweka.</li>
                        <li>Bila Auto Cashout, matokeo yatahesabiwa kulingana na server record ya mwisho.</li>
                      </ul>
                    </div>
                  )}
                </>
              )}

              {/* SECTION 2: POLICE REGULATIONS */}
              {activeSection === "police_rules" && (
                <>
                  {activeSubTab === "police_overview" && (
                    <div className={`p-4 rounded-2xl border space-y-3 ${containerBg}`}>
                      <div className="flex items-center space-x-2 border-b pb-2 border-slate-200 dark:border-neutral-800">
                        <Scale className="w-4 h-4 text-emerald-400" />
                        <h3 className={`text-xs font-black uppercase ${textPrimary}`}>Ushirikiano wa Polisi na Udhibiti</h3>
                      </div>
                      <p className={textSecondary}>
                        TakeTalon inafanya kazi kwa ushirikiano wa karibu na Jeshi la Polisi la Burundi (PNB), Mamlaka ya Udhibiti wa Michezo ya Kuhatarisha, na Wataalamu wa Usalama wa Mtandao kupambana na uhalifu wa kifedha.
                      </p>
                      <ul className="list-disc pl-4 space-y-1 text-[10.5px] text-slate-300">
                        <li>Ulinzi wa raia dhidi ya utapeli na miamala haramu ya simu.</li>
                        <li>Utekelezaji wa kanuni za kuzuia utakatishaji wa fedha (AML Standards).</li>
                      </ul>
                    </div>
                  )}

                  {activeSubTab === "kyc_id" && (
                    <div className={`p-4 rounded-2xl border space-y-3 ${containerBg}`}>
                      <div className="flex items-center space-x-2 border-b pb-2 border-slate-200 dark:border-neutral-800">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <h3 className={`text-xs font-black uppercase ${textPrimary}`}>Uhakiki wa Kitambulisho na KYC</h3>
                      </div>
                      <p className={textSecondary}>
                        Jeshi la Polisi na compliance desk za kifedha zina mamlaka ya kuomba uhakiki wa Kitambulisho cha Taifa (National ID) au Pasi ya Kusafiria kwa miamala yoyote inayoshukiwa kuwa ya wizi au udanganyifu.
                      </p>
                      <ul className="list-disc pl-4 space-y-1 text-[10.5px] text-slate-300">
                        <li>Mtumiaji anapaswa kutoa taarifa sahihi zinazolingana na usajili wa laini ya simu.</li>
                        <li>Vitambulisho feki vinachukuliwa kama kosa la jinai na kuripotiwa polisi.</li>
                      </ul>
                    </div>
                  )}

                  {activeSubTab === "sim_sms" && (
                    <div className={`p-4 rounded-2xl border space-y-3 ${containerBg}`}>
                      <div className="flex items-center space-x-2 border-b pb-2 border-slate-200 dark:border-neutral-800">
                        <Server className="w-4 h-4 text-blue-400" />
                        <h3 className={`text-xs font-black uppercase ${textPrimary}`}>Laini za Simu Rasmi na SMS Forwarder</h3>
                      </div>
                      <p className={textSecondary}>
                        Miamala yote inayotendeka kupitia SMS Forwarder lazima itoke kwenye namba za simu zilizosajiliwa rasmi kwa jina la mtumiaji.
                      </p>
                      <ul className="list-disc pl-4 space-y-1 text-[10.5px] text-slate-300">
                        <li>Ni kosa la jinai kutumia simu ya wizi au laini isiyosajiliwa kufanya miamala.</li>
                        <li>Mfumo unabaini mara moja kodi za SMS na namba za miamala (Ref IDs).</li>
                      </ul>
                    </div>
                  )}

                  {activeSubTab === "cybercrime" && (
                    <div className={`p-4 rounded-2xl border space-y-3 ${containerBg}`}>
                      <div className="flex items-center space-x-2 border-b pb-2 border-slate-200 dark:border-neutral-800">
                        <ShieldCheck className="w-4 h-4 text-rose-400" />
                        <h3 className={`text-xs font-black uppercase ${textPrimary}`}>Ulinzi wa Mtandao & Audit Trail</h3>
                      </div>
                      <p className={textSecondary}>
                        Jaribio lolote la kuediti ujumbe wa SMS, kughushi stakabadhi za malipo, au kutumia bots kuingilia mfumo litaripotiwa mara moja kwenye Kitengo cha Uhalifu wa Mtandao cha Polisi (Cybercrime Unit).
                      </p>
                      <ul className="list-disc pl-4 space-y-1 text-[10.5px] text-slate-300">
                        <li>Mfumo unahifadhi IP Address, Device Fingerprint, na audit trail ya miamala kwa miaka 5 kwa mujibu wa sheria.</li>
                      </ul>
                    </div>
                  )}
                </>
              )}

              {/* SECTION 3: PRIVACY POLICY */}
              {activeSection === "privacy" && (
                <>
                  {activeSubTab === "collected_data" && (
                    <div className={`p-4 rounded-2xl border space-y-3 ${containerBg}`}>
                      <div className="flex items-center space-x-2 border-b pb-2 border-slate-200 dark:border-neutral-800">
                        <Lock className="w-4 h-4 text-cyan-400" />
                        <h3 className={`text-xs font-black uppercase ${textPrimary}`}>Data Tunazokusanya</h3>
                      </div>
                      <p className={textSecondary}>
                        TakeTalon inakusanya taarifa za msingi pekee zinazohitajika kwa uendeshaji salama wa akaunti yako:
                      </p>
                      <ul className="list-disc pl-4 space-y-1 text-[10.5px] text-slate-300">
                        <li>Namba ya simu inayotumika kuingia na kufanya miamala.</li>
                        <li>Historia ya miamala ya mkoba (Deposit, Withdrawal, Unlock, Ticket Wagers).</li>
                        <li>IP Address na aina ya kifaa kwa ajili ya usalama dhidi ya unauthorized logins.</li>
                      </ul>
                    </div>
                  )}

                  {activeSubTab === "encryption_rls" && (
                    <div className={`p-4 rounded-2xl border space-y-3 ${containerBg}`}>
                      <div className="flex items-center space-x-2 border-b pb-2 border-slate-200 dark:border-neutral-800">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <h3 className={`text-xs font-black uppercase ${textPrimary}`}>Usimbaji na Row Level Security (RLS)</h3>
                      </div>
                      <p className={textSecondary}>
                        Taarifa zako zinalindwa kwa viwango vya juu zaidi vya usalama wa programu:
                      </p>
                      <ul className="list-disc pl-4 space-y-1 text-[10.5px] text-slate-300">
                        <li>Data zote zinasimbwa kwa kutumia <strong>AES-256 Encryption</strong>.</li>
                        <li>Database ya Supabase inatumia <strong>Row Level Security (RLS)</strong> kuhakikisha mtumiaji mwingine yeyote hawezi kuona au kufikia salio lako.</li>
                      </ul>
                    </div>
                  )}

                  {activeSubTab === "third_parties" && (
                    <div className={`p-4 rounded-2xl border space-y-3 ${containerBg}`}>
                      <div className="flex items-center space-x-2 border-b pb-2 border-slate-200 dark:border-neutral-800">
                        <Info className="w-4 h-4 text-blue-400" />
                        <h3 className={`text-xs font-black uppercase ${textPrimary}`}>Hakuna Kuuza Data kwa Watu wa Nje</h3>
                      </div>
                      <p className={textSecondary}>
                        TakeTalon HAITAUZA wala kutoa taarifa zako binafsi kwa makampuni ya matangazo au wahusika wengine wowote wa nje.
                      </p>
                      <ul className="list-disc pl-4 space-y-1 text-[10.5px] text-slate-300">
                        <li>Taarifa zitatolewa PEKEE kwa Mamlaka za Kisheria na Polisi ikitokea amri rasmi ya mahakama (Court Order).</li>
                      </ul>
                    </div>
                  )}
                </>
              )}

              {/* SECTION 4: ANTI-FRAUD & AML */}
              {activeSection === "anti_fraud" && (
                <>
                  {activeSubTab === "zero_tolerance" && (
                    <div className={`p-4 rounded-2xl border space-y-3 ${containerBg}`}>
                      <div className="flex items-center space-x-2 border-b pb-2 border-slate-200 dark:border-neutral-800">
                        <ShieldCheck className="w-4 h-4 text-rose-400" />
                        <h3 className={`text-xs font-black uppercase ${textPrimary}`}>Sera ya Zero Tolerance kwa Udanganyifu</h3>
                      </div>
                      <p className={textSecondary}>
                        Mfumo wa TakeTalon unakagua miamala elfu 10 kwa sekunde. Jaribio lolote la kuediti ujumbe au kutumia vocha feki litasababisha lock ya kiotomatiki ya akaunti.
                      </p>
                      <ul className="list-disc pl-4 space-y-1 text-[10.5px] text-slate-300">
                        <li>Ulinzi wa haraka wa salio la jamii dhidi ya ulaghai.</li>
                        <li>Kufungiwa mara moja kwa akaunti zinazojaribu kutumia bots.</li>
                      </ul>
                    </div>
                  )}

                  {activeSubTab === "turnover" && (
                    <div className={`p-4 rounded-2xl border space-y-3 ${containerBg}`}>
                      <div className="flex items-center space-x-2 border-b pb-2 border-slate-200 dark:border-neutral-800">
                        <Coins className="w-4 h-4 text-emerald-400" />
                        <h3 className={`text-xs font-black uppercase ${textPrimary}`}>Kanuni ya Turnover 1x (AML Policy)</h3>
                      </div>
                      <p className={textSecondary}>
                        Pesa zote zinazowekwa (deposit) lazima zichezwe angalau mara 1 (1x Turnover Requirement) kabla ya kuomba kutoa pesa.
                      </p>
                      <ul className="list-disc pl-4 space-y-1 text-[10.5px] text-slate-300">
                        <li>Hii inazuia matumizi ya mfumo wetu kama eneo la kutakatisha fedha (Anti-Money Laundering).</li>
                      </ul>
                    </div>
                  )}

                  {activeSubTab === "tokens" && (
                    <div className={`p-4 rounded-2xl border space-y-3 ${containerBg}`}>
                      <div className="flex items-center space-x-2 border-b pb-2 border-slate-200 dark:border-neutral-800">
                        <Lock className="w-4 h-4 text-cyan-400" />
                        <h3 className={`text-xs font-black uppercase ${textPrimary}`}>Cryptographic Token Verification</h3>
                      </div>
                      <p className={textSecondary}>
                        Vocha zote zina ufunguo wa kipekee wa cryptographic token unaothibitishwa moja kwa moja kwenye Database.
                      </p>
                      <ul className="list-disc pl-4 space-y-1 text-[10.5px] text-slate-300">
                        <li>Mfumo unabaini papo hapo vocha iliyokwisha tumika au namba bandia.</li>
                      </ul>
                    </div>
                  )}

                  {activeSubTab === "appeals" && (
                    <div className={`p-4 rounded-2xl border space-y-3 ${containerBg}`}>
                      <div className="flex items-center space-x-2 border-b pb-2 border-slate-200 dark:border-neutral-800">
                        <HelpCircle className="w-4 h-4 text-amber-400" />
                        <h3 className={`text-xs font-black uppercase ${textPrimary}`}>Utaratibu wa Rufaa ya Akaunti</h3>
                      </div>
                      <p className={textSecondary}>
                        Ikiwa akaunti yako imefungiwa kwa bahati mbaya na mfumo wa AI, unaweza kuwasilisha rufaa kwa kutuma Kitambulisho na uthibitisho wa malipo kwa barua pepe: <strong>compliance@taketalon.com</strong>.
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* SECTION 5: LICENSE & PROVABLY FAIR */}
              {activeSection === "license" && (
                <>
                  {activeSubTab === "license_num" && (
                    <div className={`p-4 rounded-2xl border space-y-3 ${containerBg}`}>
                      <div className="flex items-center space-x-2 border-b pb-2 border-slate-200 dark:border-neutral-800">
                        <OfficialLicenseIcon className="w-4 h-4 text-amber-400" />
                        <h3 className={`text-xs font-black uppercase ${textPrimary}`}>Usajili wa Leseni Rasmi</h3>
                      </div>
                      <p className={textSecondary}>
                        TakeTalon inamilikiwa na kuendeshwa chini ya usajili rasmi wa biashara na michezo ya kubahatisha:
                      </p>
                      <ul className="list-disc pl-4 space-y-1 text-[10.5px] text-slate-300">
                        <li><strong>Namba ya Leseni:</strong> REG-BDI-2026-TT88019-PRO</li>
                        <li><strong>Mamlaka ya Usajili:</strong> Burundi Gaming & Commerce Board</li>
                      </ul>
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={handleCopyLicense}
                          className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 font-bold text-[10px] hover:bg-amber-500/30 transition-all cursor-pointer flex items-center space-x-1.5"
                        >
                          {copiedLicense ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedLicense ? "Imenakiliwa!" : "Nakili Namba ya Leseni"}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {activeSubTab === "provably_fair" && (
                    <div className={`p-4 rounded-2xl border space-y-3 ${containerBg}`}>
                      <div className="flex items-center space-x-2 border-b pb-2 border-slate-200 dark:border-neutral-800">
                        <Server className="w-4 h-4 text-emerald-400" />
                        <h3 className={`text-xs font-black uppercase ${textPrimary}`}>SHA-256 Provably Fair Algorithm</h3>
                      </div>
                      <p className={textSecondary}>
                        Matokeo ya kila round ya Aviator yanatengenezwa kabla ya mchezo kuanza kwa kuchanganya Server Seed na Client Seed kwa kutumia algorithm ya HMAC-SHA256:
                      </p>
                      <ul className="list-disc pl-4 space-y-1 text-[10.5px] text-slate-300">
                        <li>Hakuna upande unaoweza kubadilisha matokeo ya ndege katikati ya mchezo.</li>
                        <li>Kila raundi inathibitishwa kupitia public hash formula.</li>
                      </ul>
                    </div>
                  )}

                  {activeSubTab === "rtp_stats" && (
                    <div className={`p-4 rounded-2xl border space-y-3 ${containerBg}`}>
                      <div className="flex items-center space-x-2 border-b pb-2 border-slate-200 dark:border-neutral-800">
                        <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                        <h3 className={`text-xs font-black uppercase ${textPrimary}`}>RTP 97.5% Return to Player Certified</h3>
                      </div>
                      <p className={textSecondary}>
                        Kiwango cha kurudisha kwa wachezaji (Return to Player) kimekaguliwa na kuthibitishwa kuwa 97.5%, kikifuata viwango vya kimataifa vya michezo ya mtandaoni.
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* SECTION 6: RESPONSIBLE GAMING */}
              {activeSection === "responsible" && (
                <>
                  {activeSubTab === "core_principles" && (
                    <div className={`p-4 rounded-2xl border space-y-3 ${containerBg}`}>
                      <div className="flex items-center space-x-2 border-b pb-2 border-slate-200 dark:border-neutral-800">
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                        <h3 className={`text-xs font-black uppercase ${textPrimary}`}>Cheza Kwa Kiasi - Mchezo Ni Burudani Tu</h3>
                      </div>
                      <p className={textSecondary}>
                        Usicheze kwa ajili ya kutafuta ada ya shule, kodi ya nyumba, au chakula cha familia. Kucheza michezo ya kubahatisha kunapaswa kuwa burudani na kutumia pesa ambazo uko tayari kuzipoteza bila kuumiza maisha yako.
                      </p>
                    </div>
                  )}

                  {activeSubTab === "deposit_limits" && (
                    <div className={`p-4 rounded-2xl border space-y-3 ${containerBg}`}>
                      <div className="flex items-center space-x-2 border-b pb-2 border-slate-200 dark:border-neutral-800">
                        <Coins className="w-4 h-4 text-amber-400" />
                        <h3 className={`text-xs font-black uppercase ${textPrimary}`}>Vikomo vya Pesa za Kila Siku (Deposit Limits)</h3>
                      </div>
                      <p className={textSecondary}>
                        Weka bajeti maalum ya kila siku au kila wiki. Usivuke bajeti uliyojiwekea hata ukipoteza dau za mwanzo.
                      </p>
                    </div>
                  )}

                  {activeSubTab === "self_exclusion" && (
                    <div className={`p-4 rounded-2xl border space-y-3 ${containerBg}`}>
                      <div className="flex items-center space-x-2 border-b pb-2 border-slate-200 dark:border-neutral-800">
                        <Lock className="w-4 h-4 text-blue-400" />
                        <h3 className={`text-xs font-black uppercase ${textPrimary}`}>Zana ya Self-Exclusion (Kujizuia Kucheza)</h3>
                      </div>
                      <p className={textSecondary}>
                        Ikiwa unahisi mchezo unakuchukulia muda au pesa nyingi, unaweza kuomba kufunga akaunti yako kwa muda wa siku 30, siku 90 au milele kupitia timu yetu ya usaidizi.
                      </p>
                    </div>
                  )}

                  {activeSubTab === "helpline_call" && (
                    <div className={`p-4 rounded-2xl border space-y-3 ${containerBg}`}>
                      <div className="flex items-center space-x-2 border-b pb-2 border-slate-200 dark:border-neutral-800">
                        <Info className="w-4 h-4 text-rose-400" />
                        <h3 className={`text-xs font-black uppercase ${textPrimary}`}>Hotline ya Msaada wa Kushauriwa (24/7 Helpline)</h3>
                      </div>
                      <p className={textSecondary}>
                        Simu zote ni za siri na huduma ya ushauri inatolewa bila malipo yoyote kupitia:
                      </p>
                      <div className="pt-1">
                        <a
                          href="tel:+25779000888"
                          className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                        >
                          <span>📞 +257 79 000 888 (Burundi & East Africa)</span>
                        </a>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* SECTION 7: BLOCKAGE / SUSPENSION */}
              {activeSection === "blockage" && (
                <>
                  {activeSubTab === "triggers" && (
                    <div className={`p-4 rounded-2xl border space-y-3 ${containerBg}`}>
                      <div className="flex items-center space-x-2 border-b pb-2 border-slate-200 dark:border-neutral-800">
                        <Ban className="w-4 h-4 text-rose-400" />
                        <h3 className={`text-xs font-black uppercase ${textPrimary}`}>Sababu za Kufungiwa Papo kwa Papo</h3>
                      </div>
                      <p className={textSecondary}>
                        Akaunti itafungiwa mara moja ikibainika mojawapo ya sababu hizi:
                      </p>
                      <ul className="list-disc pl-4 space-y-1 text-[10.5px] text-slate-300">
                        <li>Kumiliki akaunti zaidi ya moja (Multi-Accounting).</li>
                        <li>Kubainika kuwa na umri chini ya miaka 18.</li>
                        <li>Kutumia bot, script au software kuingilia matokeo ya mchezo.</li>
                        <li>Kughushi ujumbe wa SMS au stakabadhi za malipo.</li>
                      </ul>
                    </div>
                  )}

                  {activeSubTab === "penalty_tiers" && (
                    <div className={`p-4 rounded-2xl border space-y-3 ${containerBg}`}>
                      <div className="flex items-center space-x-2 border-b pb-2 border-slate-200 dark:border-neutral-800">
                        <AlertTriangle className="w-4 h-4 text-orange-400" />
                        <h3 className={`text-xs font-black uppercase ${textPrimary}`}>Mfumo wa Ngazi Tatu za Adhabu</h3>
                      </div>
                      <ul className="list-disc pl-4 space-y-1 text-[10.5px] text-slate-300">
                        <li><strong>Ngazi 1 — Onyo:</strong> Akaunti inawekwa alama (flagged), huduma chache zinasitishwa kwa muda.</li>
                        <li><strong>Ngazi 2 — Kusimamishwa kwa Muda:</strong> Siku 7 hadi 30. Salio linagandishwa (frozen) kwa ajili ya uchunguzi.</li>
                        <li><strong>Ngazi 3 — Kufungiwa Kabisa:</strong> Uchunguzi kamili wa uhalifu wa mtandao unaanza.</li>
                      </ul>
                    </div>
                  )}

                  {activeSubTab === "frozen_funds" && (
                    <div className={`p-4 rounded-2xl border space-y-3 ${containerBg}`}>
                      <div className="flex items-center space-x-2 border-b pb-2 border-slate-200 dark:border-neutral-800">
                        <Coins className="w-4 h-4 text-amber-400" />
                        <h3 className={`text-xs font-black uppercase ${textPrimary}`}>Hali ya Salio Wakati wa Uchunguzi</h3>
                      </div>
                      <p className={textSecondary}>
                        Salio halisi linagandishwa (frozen), SI kutaifishwa, mpaka uchunguzi ukamilike. Iwapo fraud itathibitishwa, salio haramu litataifishwa. Salio halali litarudishwa ndani ya siku 5-7 za kazi ikiwa akaunti itathibitika safi.
                      </p>
                    </div>
                  )}

                  {activeSubTab === "appeal_action" && (
                    <div className={`p-4 rounded-2xl border space-y-3 ${containerBg}`}>
                      <div className="flex items-center space-x-2 border-b pb-2 border-slate-200 dark:border-neutral-800">
                        <HelpCircle className="w-4 h-4 text-blue-400" />
                        <h3 className={`text-xs font-black uppercase ${textPrimary}`}>Utaratibu wa Rufaa (Appeal Steps)</h3>
                      </div>
                      <p className={textSecondary}>
                        Tuma Kitambulisho na uthibitisho wa miamala kwa barua pepe rasmi: <strong>compliance@taketalon.com</strong>. Majibu yanatolewa ndani ya siku 5-7 za kazi.
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* SECTION 8: ACCOUNT DELETION */}
              {activeSection === "account_deletion" && (
                <>
                  {activeSubTab === "delete_procedure" && (
                    <div className={`p-4 rounded-2xl border space-y-3 ${containerBg}`}>
                      <div className="flex items-center space-x-2 border-b pb-2 border-slate-200 dark:border-neutral-800">
                        <Trash2 className="w-4 h-4 text-rose-400" />
                        <h3 className={`text-xs font-black uppercase ${textPrimary}`}>Utaratibu wa Kuomba Kufutwa</h3>
                      </div>
                      <p className={textSecondary}>
                        Nenda Menu → Settings → Danger Zone → "Futa Akaunti Kabisa". Utahitajika kuthibitisha kwa password au OTP kabla ya kuendelea.
                      </p>
                    </div>
                  )}

                  {activeSubTab === "delete_prerequisites" && (
                    <div className={`p-4 rounded-2xl border space-y-3 ${containerBg}`}>
                      <div className="flex items-center space-x-2 border-b pb-2 border-slate-200 dark:border-neutral-800">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <h3 className={`text-xs font-black uppercase ${textPrimary}`}>Masharti Kabla ya Kufuta</h3>
                      </div>
                      <ul className="list-disc pl-4 space-y-1 text-[10.5px] text-slate-300">
                        <li>Salio la Real Money Wallet lazima liwe sifuri (toa pesa zote kwanza).</li>
                        <li>Mikataba ya Unlock (Unlock Contracts) inayoendelea lazima isitishwe kabla ya kufuta.</li>
                      </ul>
                    </div>
                  )}

                  {activeSubTab === "grace_period" && (
                    <div className={`p-4 rounded-2xl border space-y-3 ${containerBg}`}>
                      <div className="flex items-center space-x-2 border-b pb-2 border-slate-200 dark:border-neutral-800">
                        <Info className="w-4 h-4 text-cyan-400" />
                        <h3 className={`text-xs font-black uppercase ${textPrimary}`}>Kipindi cha Neema (Siku 30 za Cooling Off)</h3>
                      </div>
                      <p className={textSecondary}>
                        Baada ya kuomba, akaunti inaingia kipindi cha siku 30. Ukiingia tena ndani ya siku 30, ombi la kufuta linasitishwa moja kwa moja. Baada ya siku 30, kufutwa ni kwa kudumu.
                      </p>
                    </div>
                  )}

                  {activeSubTab === "data_retention" && (
                    <div className={`p-4 rounded-2xl border space-y-3 ${containerBg}`}>
                      <div className="flex items-center space-x-2 border-b pb-2 border-slate-200 dark:border-neutral-800">
                        <Scale className="w-4 h-4 text-emerald-400" />
                        <h3 className={`text-xs font-black uppercase ${textPrimary}`}>Data za Kisheria Zinazohifadhiwa</h3>
                      </div>
                      <p className={textSecondary}>
                        Kwa mujibu wa sheria za uhasibu na mamlaka za kifedha, rekodi za miamala (Audit Trail) zitahifadhiwa kwa miaka 5 kwa madhumuni ya kisheria hata baada ya akaunti kufutwa. Taarifa za kibinafsi zisizohitajika kisheria zitafutwa kabisa.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FOOTER STAMP */}
      <div className={`p-3 rounded-2xl border ${containerBg} flex items-center justify-between text-[9.5px]`}>
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-slate-400 font-mono">TAKETALON LEGAL COMPLIANCE</span>
        </div>
        <span className="text-emerald-400 font-bold font-mono">2026 APPROVED</span>
      </div>
    </div>
  );
}
