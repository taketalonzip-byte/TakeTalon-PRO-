import React, { useState } from "react";
import { ArrowLeft, Wallet, Clock, ShieldAlert, Save, Info } from "lucide-react";
import { Transaction } from "../types";

interface GamblingControlsViewProps {
  transactions: Transaction[];
  theme: "blue" | "dark" | "light";
  lang: "en" | "fr" | "sw";
  onBack: () => void;
  onAddNotification: (msg: string, type: "success" | "error" | "info") => void;
}

type LimitPeriod = "none" | "daily" | "weekly" | "monthly";

export default function GamblingControlsView({
  transactions,
  theme,
  lang,
  onBack,
  onAddNotification,
}: GamblingControlsViewProps) {
  const tr = (sw: string, fr: string, en: string) => (lang === "sw" ? sw : lang === "fr" ? fr : en);

  const containerBg =
    theme === "light"
      ? "bg-gradient-to-br from-[#f8fbfe] via-[#f0f5fc] to-[#e6effa] border-slate-200/90 shadow-sm"
      : theme === "dark"
        ? "bg-neutral-900 border-neutral-800"
        : "bg-[#1f3d5c] border-blue-400/30";
  const textPrimary = theme === "light" ? "text-slate-800" : "text-white";
  const textSecondary = theme === "light" ? "text-slate-500" : "text-slate-400";
  const inputBg = theme === "light" ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800";

  const [limitPeriod, setLimitPeriod] = useState<LimitPeriod>(
    (localStorage.getItem("taketalon_deposit_limit_period") as LimitPeriod) || "none",
  );
  const [limitAmount, setLimitAmount] = useState<string>(
    localStorage.getItem("taketalon_deposit_limit_amount") || "",
  );
  const [reminderEnabled, setReminderEnabled] = useState<boolean>(
    localStorage.getItem("taketalon_session_reminder_enabled") !== "false",
  );
  const [reminderMinutes, setReminderMinutes] = useState<string>(
    localStorage.getItem("taketalon_session_reminder_minutes") || "60",
  );

  const getPeriodTotal = (period: "daily" | "weekly" | "monthly"): number => {
    const now = new Date();
    const cutoff = new Date(now);
    if (period === "daily") cutoff.setHours(0, 0, 0, 0);
    if (period === "weekly") cutoff.setDate(now.getDate() - 7);
    if (period === "monthly") cutoff.setDate(now.getDate() - 30);
    return transactions
      .filter((t) => t.type === "DEPOSIT" && !isNaN(new Date(t.date).getTime()) && new Date(t.date).getTime() >= cutoff.getTime())
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const currentTotal = limitPeriod !== "none" ? getPeriodTotal(limitPeriod) : 0;
  const limitNum = parseFloat(limitAmount) || 0;
  const progressPct = limitNum > 0 ? Math.min(100, (currentTotal / limitNum) * 100) : 0;

  const handleSaveDepositLimit = () => {
    localStorage.setItem("taketalon_deposit_limit_period", limitPeriod);
    localStorage.setItem("taketalon_deposit_limit_amount", limitAmount);
    onAddNotification(tr("Kikomo cha malipo kimehifadhiwa.", "Limite de dépôt enregistrée.", "Deposit limit saved."), "success");
  };

  const handleSaveReminder = () => {
    localStorage.setItem("taketalon_session_reminder_enabled", String(reminderEnabled));
    localStorage.setItem("taketalon_session_reminder_minutes", reminderMinutes);
    onAddNotification(tr("Kikumbusho kimehifadhiwa.", "Rappel enregistré.", "Reminder saved."), "success");
  };

  const periodLabels: Record<LimitPeriod, string> = {
    none: tr("Hakuna", "Aucune", "None"),
    daily: tr("Kila Siku", "Quotidien", "Daily"),
    weekly: tr("Kila Wiki", "Hebdomadaire", "Weekly"),
    monthly: tr("Kila Mwezi", "Mensuel", "Monthly"),
  };

  return (
    <div className="p-3 pb-24 max-w-lg mx-auto">
      <div className="flex items-center space-x-2 mb-4">
        <button onClick={onBack} className={`p-2 rounded-xl border ${containerBg}`}>
          <ArrowLeft className={`w-4 h-4 ${textPrimary}`} />
        </button>
        <h2 className={`text-sm font-black uppercase ${textPrimary}`}>
          {tr("Vikomo vya Kucheza", "Contrôles de Jeu", "Gambling Controls")}
        </h2>
      </div>

      <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-300 text-[10.5px] flex items-start space-x-2 mb-4">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <p>
          {tr(
            "Vikomo hivi vinakusaidia kudhibiti matumizi yako. Soma sera kamili kwenye Menu → Sheria na Masharti → Responsible Gaming.",
            "Ces limites vous aident à contrôler vos dépenses. Lisez la politique complète dans Menu → Légal → Jeu Responsable.",
            "These limits help you control your spending. Read the full policy in Menu → Legal → Responsible Gaming.",
          )}
        </p>
      </div>

      {/* SECTION 1: DEPOSIT LIMIT */}
      <div className={`p-4 rounded-2xl border space-y-3 mb-3 ${containerBg}`}>
        <div className="flex items-center space-x-2">
          <Wallet className="w-4 h-4 text-emerald-400" />
          <h3 className={`text-xs font-black uppercase ${textPrimary}`}>
            {tr("Kikomo cha Kuweka Salio", "Limite de Dépôt", "Deposit Limit")}
          </h3>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {(Object.keys(periodLabels) as LimitPeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => setLimitPeriod(p)}
              className={`py-2 rounded-lg border text-[9px] font-bold uppercase transition-all ${
                limitPeriod === p
                  ? "bg-emerald-500 border-emerald-500 text-white"
                  : `${inputBg} ${textSecondary}`
              }`}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>

        {limitPeriod !== "none" && (
          <>
            <div>
              <label className={`text-[9.5px] font-bold ${textSecondary}`}>
                {tr("Kiasi cha Juu (FBU)", "Montant Maximum (FBU)", "Maximum Amount (FBU)")}
              </label>
              <input
                type="number"
                value={limitAmount}
                onChange={(e) => setLimitAmount(e.target.value)}
                placeholder="50000"
                className={`w-full mt-1 p-2.5 rounded-lg border text-sm font-bold ${inputBg} ${textPrimary}`}
              />
            </div>

            {limitNum > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-[9.5px]">
                  <span className={textSecondary}>
                    {tr("Umetumia", "Utilisé", "Used")}: {currentTotal.toLocaleString()} FBU
                  </span>
                  <span className={textSecondary}>{Math.round(progressPct)}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800/40 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${progressPct >= 100 ? "bg-rose-500" : progressPct >= 75 ? "bg-amber-500" : "bg-emerald-500"}`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleSaveDepositLimit}
              className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-black text-xs uppercase flex items-center justify-center space-x-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{tr("Hifadhi Kikomo", "Enregistrer", "Save Limit")}</span>
            </button>
          </>
        )}
      </div>

      {/* SECTION 2: SESSION REMINDER */}
      <div className={`p-4 rounded-2xl border space-y-3 mb-3 ${containerBg}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <h3 className={`text-xs font-black uppercase ${textPrimary}`}>
              {tr("Kikumbusho cha Muda", "Rappel de Session", "Session Reminder")}
            </h3>
          </div>
          <input
            type="checkbox"
            checked={reminderEnabled}
            onChange={(e) => setReminderEnabled(e.target.checked)}
            className="w-4 h-4 rounded-sm cursor-pointer"
          />
        </div>
        {reminderEnabled && (
          <>
            <div>
              <label className={`text-[9.5px] font-bold ${textSecondary}`}>
                {tr("Nikumbushe baada ya (dakika)", "Me rappeler après (minutes)", "Remind me after (minutes)")}
              </label>
              <input
                type="number"
                value={reminderMinutes}
                onChange={(e) => setReminderMinutes(e.target.value)}
                className={`w-full mt-1 p-2.5 rounded-lg border text-sm font-bold ${inputBg} ${textPrimary}`}
              />
            </div>
            <button
              onClick={handleSaveReminder}
              className="w-full py-2.5 rounded-xl bg-amber-600 text-white font-black text-xs uppercase flex items-center justify-center space-x-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{tr("Hifadhi", "Enregistrer", "Save")}</span>
            </button>
          </>
        )}
      </div>

      {/* SECTION 3: SELF-EXCLUSION (PREVIEW ONLY - HONEST, NOT YET ENFORCED) */}
      <div className={`p-4 rounded-2xl border space-y-2 opacity-70 ${containerBg}`}>
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <h3 className={`text-xs font-black uppercase ${textPrimary}`}>
            {tr("Kujizuia Kabisa", "Auto-Exclusion", "Self-Exclusion")}
          </h3>
          <span className="text-[8px] font-mono font-bold px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30">
            {tr("HIVI KARIBUNI", "BIENTÔT", "COMING SOON")}
          </span>
        </div>
        <p className={`text-[10px] leading-relaxed ${textSecondary}`}>
          {tr(
            "Kipengele hiki kinajengwa kwa uangalifu wa hali ya juu ili kihakikishe ulinzi kamili unapowashwa (litazuia matumizi ya app moja kwa moja, si tu mpangilio). Kwa msaada wa haraka, piga simu ya bure ya Responsible Gaming kwenye Legal → Responsible Gaming.",
            "Cette fonctionnalité est développée avec le plus grand soin pour garantir une protection complète (blocage réel de l'app, pas juste un réglage). Pour une aide immédiate, appelez la ligne Jeu Responsable.",
            "This feature is being built with extra care to guarantee full protection when enabled (it will genuinely lock the app, not just a setting). For immediate help, call the free Responsible Gaming line under Legal → Responsible Gaming.",
          )}
        </p>
      </div>
    </div>
  );
}
