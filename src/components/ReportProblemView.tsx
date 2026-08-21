/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  AlertCircle,
  HelpCircle,
  MessageSquare,
  Send,
  Upload,
  CheckCircle2,
  Clock,
  ShieldAlert,
  FileText,
  LifeBuoy,
  Phone,
  RefreshCw,
  Search,
  ChevronRight,
  ExternalLink,
  Paperclip,
  Check
} from "lucide-react";
import ThreatPhoneIcon from "./ThreatPhoneIcon";

interface ReportProblemViewProps {
  theme: "light" | "dark" | "blue";
  onBackToHome: () => void;
  lang: "en" | "fr" | "sw";
  currentUser?: {
    id?: string;
    username: string;
    fullName?: string;
    email?: string;
    phone?: string;
    isLoggedIn?: boolean;
  } | null;
  onAddNotification?: (msg: string, type?: "success" | "info" | "error") => void;
}

interface TicketItem {
  id: string;
  category: string;
  subject: string;
  referenceId?: string;
  status: "pending" | "investigating" | "resolved";
  createdAt: string;
  description: string;
  response?: string;
}

export default function ReportProblemView({
  theme,
  onBackToHome,
  lang,
  currentUser,
  onAddNotification,
}: ReportProblemViewProps) {
  const [activeTab, setActiveTab] = useState<"new_report" | "my_tickets">("new_report");

  // Form states
  const [category, setCategory] = useState("deposit_withdraw");
  const [subject, setSubject] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [description, setDescription] = useState("");
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tickets state
  const [tickets, setTickets] = useState<TicketItem[]>([
    {
      id: "TK-2026-8801",
      category: "Muamala wa Salio (Deposit)",
      subject: "Muamala wa Lumicash FBU 10,000 kuchelewa",
      referenceId: "TX-99812-BDI",
      status: "resolved",
      createdAt: "Leo, 12:45 PM",
      description: "Niliweka vocha ya FBU 10,000 salio halikuonekana mara moja.",
      response: "Muamala wako umethibitishwa na FBU 10,000 imeingizwa kwenye Real Money Wallet. Asante!",
    },
    {
      id: "TK-2026-8842",
      category: "Shida ya Unlock / Tipster",
      subject: "Unlock haikufungua kadi ndani ya dakika 2",
      status: "investigating",
      createdAt: "Leo, 02:10 PM",
      description: "Nilimlipia Tipster @simba_bet lakini kadi ilichelewa sekunde 30.",
      response: "Timu yetu ya kiufundi inakagua historia ya Ledger. Utapata majibu ndani ya dakika 10.",
    },
  ]);

  const isSwahili = lang === "sw";
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

  const heroBg =
    theme === "light"
      ? "bg-gradient-to-r from-amber-50 via-rose-50 to-orange-50 border-amber-200"
      : theme === "dark"
        ? "bg-gradient-to-r from-neutral-950 via-neutral-900 to-black border-neutral-800"
        : "bg-gradient-to-r from-[#1a3450] via-[#224467] to-[#1a3450] border-blue-400/35";

  // Handle file attachment upload preview
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachmentName(file.name);
    }
  };

  // Submit problem report
  const handleSubmitReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      if (onAddNotification) {
        onAddNotification(
          tr("Tafadhali jaza mada na maelezo ya tatizo!", "Veuillez saisir le sujet et la description !", "Please enter subject and description!"),
          "error"
        );
      }
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      const newTicket: TicketItem = {
        id: `TK-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        category:
          category === "deposit_withdraw"
            ? "Muamala wa Salio"
            : category === "unlock_tip"
              ? "Shida ya Unlock / Tipster"
              : category === "bug"
                ? "Hitilafu ya Kiufundi (Bug)"
                : "Ripoti ya Usalama",
        subject,
        referenceId: referenceId || undefined,
        status: "pending",
        createdAt: "Sasa hivi",
        description,
      };

      setTickets([newTicket, ...tickets]);
      setIsSubmitting(false);
      setSubject("");
      setReferenceId("");
      setDescription("");
      setAttachmentName(null);
      setActiveTab("my_tickets");

      if (onAddNotification) {
        onAddNotification(
          tr(
            "Ripoti yako imepokelewa! Tiketi # " + newTicket.id + " imeundwa.",
            "Votre rapport a été reçu ! Ticket #" + newTicket.id + " créé.",
            "Ticket created successfully #" + newTicket.id
          ),
          "success"
        );
      }
    }, 1000);
  };

  return (
    <div className="max-w-md mx-auto px-3.5 py-2.5 pb-28 space-y-4 text-left">
      {/* HEADER BREADCRUMB */}
      <div className="flex items-center justify-between pb-2 border-b border-dashed border-slate-300 dark:border-neutral-800">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onBackToHome}
            className={`p-2 rounded-xl border flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
              theme === "light"
                ? "bg-slate-50 border-slate-300 text-slate-800 hover:bg-slate-100"
                : "bg-neutral-900 border-neutral-800 text-slate-100 hover:bg-neutral-800"
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <span className="text-[9px] font-mono font-bold text-amber-400 uppercase tracking-widest flex items-center space-x-1">
              <span>SUPPORT TICKET SYSTEM</span>
            </span>
            <h2 className={`text-sm font-black uppercase tracking-wide ${textPrimary}`}>
              {tr("Ripoti Tatizo / Kituo cha Usaidizi", "Portail de Support Client", "Report a Problem Portal")}
            </h2>
          </div>
        </div>

        <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
          24/7 SUPPORT
        </span>
      </div>

      {/* HERO BANNER */}
      <div className={`p-4 rounded-2xl border ${heroBg} space-y-3`}>
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-amber-500 text-black shadow-md font-bold">
            <ThreatPhoneIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className={`text-xs font-black uppercase tracking-wider ${textPrimary}`}>
              {tr("Kituo cha Msaada na Ripoti za Mfumo", "Centre d'Assistance et Rapports", "Support Center & System Reports")}
            </h3>
            <p className={`text-[10.5px] leading-snug mt-0.5 ${textSecondary}`}>
              {tr(
                "Pata usaidizi wa haraka kuhusu miamala, unlocking, au ripoti hitilafu yoyote kwenye mfumo wetu.",
                "Obtenez une aide rapide pour les transactions, déblocages ou signalez tout problème technique.",
                "Get quick help with transactions, unlocking, or report any technical issue on our platform."
              )}
            </p>
          </div>
        </div>

        {/* SUB-TABS: NEW REPORT VS MY TICKETS */}
        <div className="flex items-center space-x-2 pt-2 border-t border-slate-300/40 dark:border-neutral-800">
          <button
            type="button"
            onClick={() => setActiveTab("new_report")}
            className={`flex-1 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer ${
              activeTab === "new_report"
                ? "bg-amber-500 text-black shadow-md"
                : "bg-slate-500/10 text-slate-400 hover:text-white"
            }`}
          >
            {tr("1. Tuma Ripoti Mpya", "1. Nouveau Rapport", "1. New Report")}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("my_tickets")}
            className={`flex-1 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer flex items-center justify-center space-x-1 ${
              activeTab === "my_tickets"
                ? "bg-amber-500 text-black shadow-md"
                : "bg-slate-500/10 text-slate-400 hover:text-white"
            }`}
          >
            <span>{tr("2. Tiketi Zangu", "2. Mes Tickets", "2. My Tickets")}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[9px]">
              {tickets.length}
            </span>
          </button>
        </div>
      </div>

      {/* CONTENT AREA */}
      {activeTab === "new_report" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl border space-y-3.5 ${containerBg}`}
        >
          <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-neutral-800">
            <h3 className={`text-xs font-black uppercase ${textPrimary}`}>Form ya Kuripoti Tatizo</h3>
            <span className="text-[9px] font-mono text-amber-400">RESPONSE TIME: &lt; 15 MINS</span>
          </div>

          <form onSubmit={handleSubmitReport} className="space-y-3 text-xs">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Aina ya Tatizo:</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl p-2.5 border bg-black/20 text-slate-100 font-bold focus:outline-none"
              >
                <option value="deposit_withdraw">Muamala wa Salio (Deposit / Withdrawal)</option>
                <option value="unlock_tip">Shida ya Unlock au Tipster Card</option>
                <option value="bug">Hitilafu ya Kiufundi / Bug ya App</option>
                <option value="security">Ripoti ya Usalama / Akaunti Bandia</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Mada (Subject):</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="mfano: Salio la Lumicash halikuonekana"
                className="w-full rounded-xl p-2.5 border bg-black/20 text-slate-100 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Namba ya Muamala / Ref ID (Kama ipo):</label>
              <input
                type="text"
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
                placeholder="mfano: TX-99812-BDI"
                className="w-full rounded-xl p-2.5 border bg-black/20 text-slate-100 font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Ufafanuzi wa Kina:</label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Eleza kile kilichotokea, muda na maelezo mengine muhimu..."
                className="w-full rounded-xl p-2.5 border bg-black/20 text-slate-100 focus:outline-none"
              />
            </div>

            {/* ATTACHMENT FIELD */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Ambatanisha Picha au Screenshot (Hiyari):</label>
              <label className="flex items-center justify-center space-x-2 p-3 rounded-xl border border-dashed border-slate-500/40 bg-black/20 hover:bg-black/30 cursor-pointer transition-all">
                <Paperclip className="w-4 h-4 text-amber-400" />
                <span className="text-[10.5px] text-slate-300">
                  {attachmentName ? attachmentName : "Bofya hapa kuweka picha/screenshot"}
                </span>
                <input type="file" onChange={handleFileChange} className="hidden" accept="image/*" />
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black uppercase text-xs shadow-lg shadow-amber-500/20 transition-all active:scale-95 cursor-pointer flex items-center justify-center space-x-2"
            >
              {isSubmitting ? (
                <span>Inatuma Ripoti...</span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Tuma Ripoti ya Tiketi</span>
                </>
              )}
            </button>
          </form>
        </motion.div>
      )}

      {/* MY TICKETS LIST */}
      {activeTab === "my_tickets" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className={`text-xs font-black uppercase tracking-wider ${textPrimary}`}>
              Orodha ya Tiketi Zako ({tickets.length})
            </h3>
            <span className="text-[9px] font-mono text-slate-400">UPDATED LIVE</span>
          </div>

          <div className="space-y-2.5">
            {tickets.map((t) => (
              <div key={t.id} className={`p-3.5 rounded-2xl border space-y-2 ${cardBg}`}>
                <div className="flex items-center justify-between border-b pb-2 border-slate-500/20">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-[10px] font-bold text-amber-400">{t.id}</span>
                    <span className="text-[9px] text-slate-400">{t.category}</span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[8.5px] font-mono font-bold uppercase ${
                      t.status === "resolved"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : t.status === "investigating"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                    }`}
                  >
                    {t.status === "resolved" ? "IMETATULIWA" : t.status === "investigating" ? "INAKAGULIWA" : "INASUBIRI"}
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <h4 className={`font-bold ${textPrimary}`}>{t.subject}</h4>
                  <p className="text-[10.5px] text-slate-400">{t.description}</p>
                </div>

                {t.response && (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-200 space-y-1">
                    <span className="font-bold uppercase text-[9px] text-amber-400">Majibu ya Support Team:</span>
                    <p>{t.response}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* EMERGENCY LIVE HOTLINE */}
      <div className={`p-3.5 rounded-2xl border ${containerBg} flex items-center justify-between text-[10.5px]`}>
        <div className="flex items-center space-x-2">
          <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
          <div>
            <span className={`font-bold block ${textPrimary}`}>Live Support WhatsApp Hotline:</span>
            <span className="text-emerald-400 font-mono font-bold">+257 79 000 888</span>
          </div>
        </div>

        <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-[9.5px]">
          ONLINE NOW
        </span>
      </div>
    </div>
  );
}
