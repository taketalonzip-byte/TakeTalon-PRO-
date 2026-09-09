import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Calculator, CheckCircle2, ChevronDown, Info, Loader2, Lock, RefreshCw, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { supabase } from "../lib/supabase";

interface EconomicControlPanelProps {
  currentUser: any;
  theme: "light" | "dark" | "blue";
  lang: "en" | "fr" | "sw";
  onBack: () => void;
  onAddNotification: (message: string, type: "success" | "error" | "info") => void;
}

type RuleRow = {
  key: string;
  value: number;
  category: string;
  control_mode: string;
  version: number;
  description?: string | null;
};

type Category = "ACCESS" | "SUBSCRIPTION" | "DEPOSIT" | "WITHDRAWAL" | "FEES" | "EARNINGS" | "GAME" | "TREASURY" | "SYSTEM";

const CATEGORY_META: Record<Category, { title: string; sw: string; description: string; color: string }> = {
  ACCESS: { title: "Access & Unlock", sw: "Ufunguaji na Access", description: "Unlock price, recipient share, commission and interval.", color: "amber" },
  SUBSCRIPTION: { title: "Subscriptions", sw: "Usajili", description: "Membership and recurring subscription charges.", color: "violet" },
  DEPOSIT: { title: "Deposits", sw: "Kuweka Pesa", description: "Deposit fees, limits and processing rules.", color: "emerald" },
  WITHDRAWAL: { title: "Withdrawals", sw: "Kutoa Pesa", description: "Withdrawal fees, limits and processing rules.", color: "rose" },
  FEES: { title: "Platform Fees", sw: "Ada za Mfumo", description: "General platform fees and revenue rules.", color: "sky" },
  EARNINGS: { title: "Earnings & Payouts", sw: "Mapato na Malipo", description: "Creator, tipster and payout split rules.", color: "green" },
  GAME: { title: "Games & Betting", sw: "Michezo na Betting", description: "Game stakes, payouts and limits.", color: "orange" },
  TREASURY: { title: "Treasury", sw: "Hazina", description: "Platform reserve and treasury controls.", color: "cyan" },
  SYSTEM: { title: "System Safeguards", sw: "Usalama wa Mfumo", description: "Authentication and safety rules. Read-only here.", color: "slate" },
};

const orderedCategories = Object.keys(CATEGORY_META) as Category[];
const percentKeys = new Set(["pricing_scale_factor", "commission_month", "tva_rate"]);
const moneyKeys = new Set(["unlock_price_x_month", "unlock_price_y_month"]);

function labelFor(rule: RuleRow, lang: string) {
  const labels: Record<string, string> = {
    pricing_scale_factor: lang === "sw" ? "Asilimia ya bei ya Unlock" : "Unlock price percentage",
    commission_month: lang === "sw" ? "Asilimia ya commission" : "Commission percentage",
    unlock_price_x_month: lang === "sw" ? "Bei ya anayefungua" : "Unlocker base price",
    unlock_price_y_month: lang === "sw" ? "Sehemu ya anayefunguliwa" : "Recipient base share",
    interval_minutes: lang === "sw" ? "Muda wa malipo" : "Payment interval",
  };
  return labels[rule.key] || rule.key.replaceAll("_", " ");
}

export default function EconomicControlPanel({ currentUser, theme, lang, onBack, onAddNotification }: EconomicControlPanelProps) {
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category>("ACCESS");
  const [selectedKey, setSelectedKey] = useState("");
  const [inputValue, setInputValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const role = String(currentUser?.role || "").toUpperCase();
  const allowed = role === "OWNER" || role === "SUPER_ADMIN";
  const isDark = theme !== "light";
  const card = isDark ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200";
  const inner = isDark ? "bg-slate-950/70 border-slate-800" : "bg-slate-50 border-slate-200";
  const primary = isDark ? "text-slate-100" : "text-slate-900";
  const muted = isDark ? "text-slate-400" : "text-slate-600";

  const loadRules = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("business_rules").select("key,value,category,control_mode,version,description").eq("is_active", true).order("category").order("key").limit(200);
    if (error) {
      onAddNotification(lang === "sw" ? "Imeshindikana kusoma makundi ya miamala." : "Could not load transaction groups.", "error");
      setRules([]);
    } else setRules((data || []) as RuleRow[]);
    setLoading(false);
  }, [lang, onAddNotification]);

  useEffect(() => { loadRules(); }, [loadRules]);

  const categoryRules = useMemo(() => rules.filter((rule) => rule.category === selectedCategory), [rules, selectedCategory]);
  const selectedRule = rules.find((rule) => rule.key === selectedKey);
  const baseUnlockPrice = rules.find((rule) => rule.key === "unlock_price_x_month")?.value ?? 500;
  const scale = rules.find((rule) => rule.key === "pricing_scale_factor")?.value ?? 1;
  const effectiveUnlock = baseUnlockPrice * scale;

  useEffect(() => {
    if (categoryRules.length > 0 && !categoryRules.some((rule) => rule.key === selectedKey)) setSelectedKey(categoryRules[0].key);
  }, [categoryRules, selectedKey]);

  useEffect(() => {
    if (!selectedRule) return;
    setInputValue(percentKeys.has(selectedRule.key) ? selectedRule.value * 100 : selectedRule.value);
  }, [selectedRule]);

  const saveRule = async () => {
    if (!allowed || !selectedRule || selectedRule.category === "SYSTEM" || saving) return;
    const nextValue = percentKeys.has(selectedRule.key) ? inputValue / 100 : inputValue;
    if (!Number.isFinite(nextValue) || nextValue < 0) {
      onAddNotification(lang === "sw" ? "Weka namba sahihi." : "Enter a valid number.", "error");
      return;
    }
    setSaving(true); setFeedback(null);
    const { data, error } = await supabase.rpc("admin_update_business_rule", { p_key: selectedRule.key, p_new_value: nextValue });
    if (error || (data as any)?.ok === false) {
      const message = (data as any)?.error || error?.message || "update_failed";
      onAddNotification(lang === "sw" ? `Mabadiliko yamekataliwa: ${message}` : `Change rejected: ${message}`, "error");
    } else {
      setFeedback(lang === "sw" ? "Mabadiliko yamehifadhiwa na audit log imeandikwa." : "Change saved and written to the audit log.");
      onAddNotification(lang === "sw" ? "Udhibiti wa muamala umebadilishwa." : "Transaction control updated.", "success");
      await loadRules();
    }
    setSaving(false);
  };

  return (
    <div className="px-3.5 py-3 space-y-3.5 max-w-3xl mx-auto pb-20 text-left">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className={`p-2 rounded-xl border ${card} ${muted}`}><ArrowLeft className="w-4 h-4" /></button>
        <div className="text-right"><h2 className={`font-black text-sm uppercase tracking-wider ${primary}`}>{lang === "sw" ? "Udhibiti wa Miamala" : "Economic Transaction Control"}</h2><p className={`text-[10px] ${muted}`}>{lang === "sw" ? "Owner na SuperAdmin" : "Owner and SuperAdmin settings"}</p></div>
      </div>

      {!allowed ? <div className={`p-5 rounded-2xl border ${card} text-center space-y-2`}><ShieldCheck className="w-8 h-8 text-rose-400 mx-auto" /><p className={`font-black ${primary}`}>Owner/SuperAdmin only</p><p className={`text-xs ${muted}`}>This control is protected by the database role.</p></div> : <>
        <div className={`p-3 rounded-2xl border ${card}`}>
          <div className="flex items-center justify-between mb-2"><div><p className={`text-[10px] font-black uppercase tracking-wider ${muted}`}>{lang === "sw" ? "Makundi ya mfumo" : "System groups"}</p><p className={`text-[10px] ${muted}`}>{lang === "sw" ? "Chagua kundi la muamala unalotaka kudhibiti." : "Select the transaction group to control."}</p></div><SlidersHorizontal className="w-4 h-4 text-amber-400" /></div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {orderedCategories.map((category) => { const meta = CATEGORY_META[category]; const count = rules.filter((r) => r.category === category).length; const active = category === selectedCategory; return <button key={category} onClick={() => setSelectedCategory(category)} className={`text-left p-2.5 rounded-xl border transition-all ${active ? "border-amber-400/60 bg-amber-500/10" : `${inner} hover:border-slate-500`}`}><div className="flex items-center justify-between"><span className={`text-[10px] font-black uppercase ${active ? "text-amber-300" : primary}`}>{lang === "sw" ? meta.sw : meta.title}</span><span className={`text-[9px] font-mono ${muted}`}>{count}</span></div><p className={`text-[9px] mt-1 leading-tight ${muted}`}>{meta.description}</p></button>; })}
          </div>
        </div>

        <div className={`p-4 rounded-2xl border ${card} space-y-3`}>
          <div className="flex items-start justify-between gap-3"><div><h3 className={`font-black text-xs uppercase tracking-wider ${primary}`}>{lang === "sw" ? CATEGORY_META[selectedCategory].sw : CATEGORY_META[selectedCategory].title}</h3><p className={`text-[10px] mt-1 ${muted}`}>{CATEGORY_META[selectedCategory].description}</p></div>{selectedCategory === "SYSTEM" ? <Lock className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-amber-400" />}</div>
          {loading ? <div className={`py-8 flex items-center justify-center gap-2 text-xs ${muted}`}><Loader2 className="w-4 h-4 animate-spin" />{lang === "sw" ? "Inatafuta mipangilio..." : "Loading controls..."}</div> : categoryRules.length === 0 ? <div className={`p-4 rounded-xl border ${inner} flex gap-2`}><Info className="w-4 h-4 text-sky-400 shrink-0" /><p className={`text-xs ${muted}`}>{lang === "sw" ? "Kundi hili halijaunganishwa na rule yoyote bado. Litaonekana hapa likishasanidiwa kwenye database." : "No database rule is configured for this group yet. It will appear here once configured."}</p></div> : <div className="space-y-2">{categoryRules.map((rule) => <button key={rule.key} onClick={() => setSelectedKey(rule.key)} className={`w-full text-left p-3 rounded-xl border transition-all ${selectedKey === rule.key ? "border-sky-400/50 bg-sky-500/10" : inner}`}><div className="flex items-center justify-between gap-2"><span className={`text-xs font-black ${primary}`}>{labelFor(rule, lang)}</span><span className={`text-[9px] font-mono ${muted}`}>v{rule.version}</span></div><div className={`text-[10px] font-mono mt-1 ${selectedKey === rule.key ? "text-sky-300" : muted}`}>{rule.key} = {percentKeys.has(rule.key) ? `${(rule.value * 100).toFixed(2)}%` : `${rule.value}${moneyKeys.has(rule.key) ? " FBU" : ""}`}</div></button>)}</div>}
        </div>

        {selectedRule && selectedCategory !== "SYSTEM" && <div className={`p-4 rounded-2xl border ${card} space-y-3`}><div className="flex items-center gap-2"><SlidersHorizontal className="w-4 h-4 text-amber-400" /><h3 className={`font-black text-xs uppercase ${primary}`}>{lang === "sw" ? "Tekeleza mpangilio" : "Apply selected control"}</h3></div><div className={`p-3 rounded-xl border ${inner}`}><div className="flex justify-between"><span className={`text-xs font-black ${primary}`}>{labelFor(selectedRule, lang)}</span><span className={`text-[10px] ${muted}`}>{selectedRule.control_mode}</span></div><p className={`text-[10px] mt-1 ${muted}`}>{selectedRule.description || "Changes are versioned and audited."}</p><div className="flex gap-2 mt-3"><input type="number" min="0" step="0.01" value={inputValue} onChange={(e) => setInputValue(Number(e.target.value))} className={`flex-1 p-3 rounded-xl border ${inner} ${primary} font-mono`} /><span className={`self-center text-sm font-black ${muted}`}>{percentKeys.has(selectedRule.key) ? "%" : moneyKeys.has(selectedRule.key) ? "FBU" : "min"}</span></div><button onClick={saveRule} disabled={saving || loading} className="w-full mt-3 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs uppercase flex items-center justify-center gap-2">{saving ? <><Loader2 className="w-4 h-4 animate-spin" />{lang === "sw" ? "Inatafuta na kubadilisha..." : "Loading and updating..."}</> : <><CheckCircle2 className="w-4 h-4" />{lang === "sw" ? "Tekeleza mpangilio" : "Apply control"}</>}</button></div>{feedback && <p className="text-xs text-emerald-400 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />{feedback}</p>}</div>}

        <div className={`p-4 rounded-2xl border ${card} space-y-3`}><div className="flex items-center justify-between"><div className="flex items-center gap-2"><Calculator className="w-4 h-4 text-emerald-400" /><h3 className={`font-black text-xs uppercase ${primary}`}>{lang === "sw" ? "Preview ya Access" : "Access preview"}</h3></div><button onClick={loadRules} disabled={loading} className={`text-[10px] ${muted} flex items-center gap-1`}><RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />Refresh</button></div><div className="grid grid-cols-3 gap-2 text-center"><div className={`p-2.5 rounded-xl border ${inner}`}><p className={`text-[9px] ${muted}`}>BASE</p><p className={`font-black text-xs ${primary}`}>{baseUnlockPrice} FBU</p></div><div className={`p-2.5 rounded-xl border ${inner}`}><p className={`text-[9px] ${muted}`}>SCALE</p><p className={`font-black text-xs ${primary}`}>{(scale * 100).toFixed(2)}%</p></div><div className={`p-2.5 rounded-xl border ${inner}`}><p className={`text-[9px] ${muted}`}>EFFECTIVE</p><p className="font-black text-xs text-emerald-400">{effectiveUnlock} FBU</p></div></div></div>
      </>}
    </div>
  );
}
