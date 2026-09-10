import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
const percentKeys = new Set(["pricing_scale_factor", "premium_membership_scale_factor", "games_betting_minimum_scale_factor", "bet_slip_minimum_scale_factor", "aviator_minimum_scale_factor", "slot777_minimum_scale_factor", "crystal_minimum_scale_factor", "dice_minimum_scale_factor", "plinko_minimum_scale_factor", "vip_card_minimum_scale_factor", "commission_month", "tva_rate"]);
const moneyKeys = new Set(["unlock_price_x_month", "unlock_price_y_month"]);

function labelFor(rule: RuleRow, lang: string) {
  const labels: Record<string, string> = {
    pricing_scale_factor: lang === "sw" ? "Asilimia ya bei ya Unlock" : "Unlock price percentage",
    games_betting_minimum_scale_factor: lang === "sw" ? "Asilimia ya minimum za Games & Betting" : "Games & Betting minimum percentage",
    bet_slip_minimum_scale_factor: lang === "sw" ? "Asilimia ya Bet Slip" : "Bet Slip minimum percentage",
    aviator_minimum_scale_factor: lang === "sw" ? "Asilimia ya Aviator" : "Aviator minimum percentage",
    slot777_minimum_scale_factor: "Slot777 minimum percentage",
    crystal_minimum_scale_factor: "Crystal Mine minimum percentage",
    dice_minimum_scale_factor: "Dice minimum percentage",
    plinko_minimum_scale_factor: "Plinko minimum percentage",
    vip_card_minimum_scale_factor: lang === "sw" ? "Asilimia ya VIP Card" : "VIP Card linked percentage",
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
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const notifyRef = useRef(onAddNotification);

  useEffect(() => {
    notifyRef.current = onAddNotification;
  }, [onAddNotification]);

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
      notifyRef.current(lang === "sw" ? "Imeshindikana kusoma makundi ya miamala." : "Could not load transaction groups.", "error");
      setRules([]);
    } else setRules((data || []) as RuleRow[]);
    const { data: pending } = await supabase
      .from("business_rule_change_requests")
      .select("id,rule_key,requested_value,requested_by_profile_id,requested_at,status")
      .eq("status", "PENDING")
      .order("requested_at", { ascending: false })
      .limit(50);
    setPendingRequests(pending || []);
    setLoading(false);
  }, [lang]);

  useEffect(() => { loadRules(); }, [loadRules]);

  const categoryRules = useMemo(() => rules.filter((rule) => rule.category === selectedCategory && (selectedCategory !== "GAME" || (rule.control_mode === "SCALE" && rule.key !== "games_betting_minimum_scale_factor"))), [rules, selectedCategory]);
  // Access is one linked economic model: only the scale is editable.
  // Base price, commission, recipient share and per-interval amounts derive from it.
  const selectedRule = selectedCategory === "ACCESS"
    ? rules.find((rule) => rule.key === "pricing_scale_factor")
    : selectedCategory === "SUBSCRIPTION"
      ? rules.find((rule) => rule.key === "premium_membership_scale_factor")
    : rules.find((rule) => rule.key === selectedKey);
  const baseUnlockPrice = rules.find((rule) => rule.key === "unlock_price_x_month")?.value ?? 500;
  const scale = rules.find((rule) => rule.key === "pricing_scale_factor")?.value ?? 1;
  const gamesScale = rules.find((rule) => rule.key === "games_betting_minimum_scale_factor")?.value ?? 1;
  const minimumScaleFor = (baseKey: string) => rules.find((rule) => rule.key === `${baseKey.replace("_stake_fbu", "")}_scale_factor`)?.value ?? gamesScale;
  const baseMinimumFor = (baseKey: string) => {
    const defaults: Record<string, number> = {
      bet_slip_minimum_stake_fbu: 500,
      aviator_minimum_stake_fbu: 500,
      slot777_minimum_stake_fbu: 100,
      crystal_minimum_stake_fbu: 100,
      dice_minimum_stake_fbu: 100,
      plinko_minimum_stake_fbu: 100,
      vip_card_minimum_capital_fbu: 1000,
      vip_card_players_balance_filter_fbu: 1000,
    };
    return rules.find((rule) => rule.key === baseKey)?.value ?? defaults[baseKey] ?? 0;
  };
  const scaleFor = (baseKey: string) => baseKey.startsWith("vip_")
    ? rules.find((rule) => rule.key === "vip_card_minimum_scale_factor")?.value ?? 1
    : minimumScaleFor(baseKey);
  const pendingScaleFor = (baseKey: string) => {
    const scaleKey = baseKey.startsWith("vip_") ? "vip_card_minimum_scale_factor" : `${baseKey.replace("_stake_fbu", "")}_scale_factor`;
    const pending = pendingRequests.find((request) => request.rule_key === scaleKey);
    return pending ? Number(pending.requested_value) : null;
  };
  const effectiveUnlock = baseUnlockPrice * scale;
  const commissionRate = rules.find((rule) => rule.key === "commission_month")?.value ?? 0.1;
  const commissionMonth = effectiveUnlock * commissionRate;
  const recipientMonth = effectiveUnlock - commissionMonth;
  const intervalMinutes = rules.find((rule) => rule.key === "interval_minutes")?.value ?? 30;
  const periodsPerMonth = (30 * 24 * 60) / intervalMinutes;
  const recipientPerInterval = recipientMonth / periodsPerMonth;
  const commissionPerInterval = commissionMonth / periodsPerMonth;
  const pendingForSelected = pendingRequests.find((request) => request.rule_key === selectedRule?.key);
  const pendingScale = pendingForSelected ? Number(pendingForSelected.requested_value) : null;
  const pendingPremiumPrice = pendingScale === null ? null : (rules.find((r) => r.key === "premium_membership_price_fbu")?.value || 15000) * pendingScale;

  const displayValue = (rule: RuleRow) => {
    if (rule.category === "ACCESS" && rule.key === "unlock_price_x_month") return `${effectiveUnlock.toFixed(4)} FBU effective`;
    if (rule.category === "ACCESS" && rule.key === "unlock_price_y_month") return `${recipientMonth.toFixed(4)} FBU effective`;
    if (rule.category === "ACCESS" && rule.key === "commission_month") return `${(commissionRate * 100).toFixed(2)}% of effective`;
    if (rule.key === "premium_membership_scale_factor") return `${(rule.value * 100).toFixed(2)}% of PRO Elite base`;
    if (rule.key === "games_betting_minimum_scale_factor") return `${(rule.value * 100).toFixed(2)}% of every game minimum`;
    if (percentKeys.has(rule.key)) return `${(rule.value * 100).toFixed(2)}%`;
    return `${rule.value}${moneyKeys.has(rule.key) ? " FBU" : ""}`;
  };

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
      setFeedback(lang === "sw" ? "Mabadiliko yamewekwa pending na yatasubiri SuperAdmin mmoja." : "Change updated and is now pending one SuperAdmin approval.");
      onAddNotification(lang === "sw" ? "Ombi la mabadiliko linasubiri uthibitisho wa SuperAdmin." : "Change is pending one SuperAdmin approval.", "info");
      await loadRules();
    }
    setSaving(false);
  };

  const approveRequest = async (requestId: string) => {
    if (role !== "SUPER_ADMIN") return;
    setSaving(true);
    const { data, error } = await supabase.rpc("approve_economic_rule_change", { p_request_id: requestId });
    if (error || (data as any)?.ok === false) {
      onAddNotification(lang === "sw" ? `Uthibitisho umekataliwa: ${(data as any)?.error || error?.message}` : `Approval rejected: ${(data as any)?.error || error?.message}`, "error");
    } else {
      setFeedback(lang === "sw" ? "Mabadiliko yameanza kufanya kazi." : "Approved change is now active.");
      onAddNotification(lang === "sw" ? "Mabadiliko yameidhinishwa na kuanza kufanya kazi." : "Change approved and activated.", "success");
      await loadRules();
    }
    setSaving(false);
  };

  const cancelRequest = async (requestId: string) => {
    if (saving) return;
    setSaving(true);
    const { data, error } = await supabase.rpc("cancel_economic_rule_change", { p_request_id: requestId });
    if (error || (data as any)?.ok === false) {
      onAddNotification(lang === "sw" ? `Cancel imekataliwa: ${(data as any)?.error || error?.message}` : `Cancel rejected: ${(data as any)?.error || error?.message}`, "error");
    } else {
      setFeedback(lang === "sw" ? "Request ime-canceliwa. Sasa unaweza kufanya updating mpya." : "Request cancelled. You can submit a new update.");
      onAddNotification(lang === "sw" ? "Pending change imeondolewa." : "Pending change removed.", "success");
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
          {loading ? <div className={`py-8 flex items-center justify-center gap-2 text-xs ${muted}`}><Loader2 className="w-4 h-4 animate-spin" />{lang === "sw" ? "Inatafuta mipangilio..." : "Loading controls..."}</div> : categoryRules.length === 0 ? <div className={`p-4 rounded-xl border ${inner} flex gap-2`}><Info className="w-4 h-4 text-sky-400 shrink-0" /><p className={`text-xs ${muted}`}>{lang === "sw" ? "Kundi hili halijaunganishwa na rule yoyote bado. Litaonekana hapa likishasanidiwa kwenye database." : "No database rule is configured for this group yet. It will appear here once configured."}</p></div> : <div className="space-y-2">{categoryRules.map((rule) => <button key={rule.key} onClick={() => setSelectedKey(rule.key)} className={`w-full text-left p-3 rounded-xl border transition-all ${selectedKey === rule.key ? "border-sky-400/50 bg-sky-500/10" : inner}`}><div className="flex items-center justify-between gap-2"><span className={`text-xs font-black ${primary}`}>{labelFor(rule, lang)}</span><span className={`text-[9px] font-mono ${muted}`}>v{rule.version}</span></div><div className={`text-[10px] font-mono mt-1 ${selectedKey === rule.key ? "text-sky-300" : muted}`}>{rule.key} = {displayValue(rule)}</div></button>)}</div>}
        </div>

        {selectedRule && selectedCategory !== "SYSTEM" && <div className={`p-4 rounded-2xl border ${card} space-y-3`}><div className="flex items-center gap-2"><SlidersHorizontal className="w-4 h-4 text-amber-400" /><h3 className={`font-black text-xs uppercase ${primary}`}>{lang === "sw" ? "Tekeleza mpangilio" : "Apply selected control"}</h3></div><div className={`p-3 rounded-xl border ${inner}`}><div className="flex justify-between"><span className={`text-xs font-black ${primary}`}>{selectedCategory === "ACCESS" ? (lang === "sw" ? "Asilimia kuu ya Access" : "Canonical Access percentage") : selectedCategory === "SUBSCRIPTION" ? (lang === "sw" ? "Asilimia kuu ya Premium Membership" : "Canonical Premium Membership percentage") : selectedCategory === "GAME" ? (lang === "sw" ? "Asilimia kuu ya Games & Betting" : "Canonical Games & Betting percentage") : labelFor(selectedRule, lang)}</span><span className={`text-[10px] ${muted}`}>{selectedRule.control_mode}</span></div><p className={`text-[10px] mt-1 ${muted}`}>{selectedCategory === "ACCESS" ? (lang === "sw" ? "Bei, commission, share na malipo ya kila dakika 30 vitajihesabu vyenyewe." : "Price, commission, recipient share and 30-minute payouts are derived automatically.") : selectedCategory === "SUBSCRIPTION" ? (lang === "sw" ? "PRO Elite ina base ya 15,000 FBU; asilimia hii itaanza baada ya SuperAdmin mmoja kuidhinisha." : "PRO Elite has a 15,000 FBU base; this percentage activates after one SuperAdmin approval.") : selectedCategory === "GAME" ? (lang === "sw" ? "Asilimia hii itatumika kwa minimum za bet slip, Aviator, Slot777, Crystal, Dice na Plinko baada ya approval." : "This percentage scales bet slip, Aviator, Slot777, Crystal, Dice and Plinko minimums after approval.") : (selectedRule.description || "Changes are versioned and audited.")}</p><div className="flex gap-2 mt-3"><input type="number" min="0" max="100" step="0.01" value={inputValue} onChange={(e) => setInputValue(Number(e.target.value))} className={`flex-1 p-3 rounded-xl border ${inner} ${primary} font-mono`} /><span className={`self-center text-sm font-black ${muted}`}>%</span></div><button onClick={saveRule} disabled={saving || loading || !["ACCESS", "SUBSCRIPTION", "GAME"].includes(selectedCategory)} className="w-full mt-3 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs uppercase flex items-center justify-center gap-2">{saving ? <><Loader2 className="w-4 h-4 animate-spin" />{lang === "sw" ? "Inafanya updating..." : "Updating change..."}</> : <><CheckCircle2 className="w-4 h-4" />{lang === "sw" ? "Fanya updating" : "Update change"}</>}</button></div>{feedback && <p className="text-xs text-emerald-400 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />{feedback}</p>}</div>}

        <div className={`p-4 rounded-2xl border ${card} space-y-3`}><div className="flex items-center justify-between"><div className="flex items-center gap-2"><Calculator className="w-4 h-4 text-emerald-400" /><h3 className={`font-black text-xs uppercase ${primary}`}>{selectedCategory === "SUBSCRIPTION" ? (lang === "sw" ? "Preview ya Premium Membership" : "Premium Membership preview") : selectedCategory === "GAME" ? (lang === "sw" ? "Preview ya Games & Betting" : "Games & Betting preview") : (lang === "sw" ? "Preview ya Access" : "Access preview")}</h3></div><button onClick={loadRules} disabled={loading} className={`text-[10px] ${muted} flex items-center gap-1`}><RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />Refresh</button></div>{selectedCategory === "GAME" ? <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">{[["BET SLIP", "bet_slip_minimum_stake_fbu"], ["AVIATOR", "aviator_minimum_stake_fbu"], ["SLOT777", "slot777_minimum_stake_fbu"], ["CRYSTAL", "crystal_minimum_stake_fbu"], ["DICE", "dice_minimum_stake_fbu"], ["PLINKO", "plinko_minimum_stake_fbu"], ["VIP CAPITAL", "vip_card_minimum_capital_fbu"], ["VIP BALANCE", "vip_card_players_balance_filter_fbu"]].map(([label, key]) => <div key={key} className={`p-2.5 rounded-xl border ${inner}`}><p className={`text-[9px] ${muted}`}>{label} MIN</p><p className="font-black text-sm text-emerald-400">{(baseMinimumFor(key) * scaleFor(key)).toLocaleString()} FBU</p><p className={`text-[8px] ${muted}`}>Base {baseMinimumFor(key).toLocaleString()} · {(scaleFor(key) * 100).toFixed(2)}%</p>{pendingScaleFor(key) !== null && <p className="text-[8px] text-amber-300 font-bold">PENDING: {(baseMinimumFor(key) * (pendingScaleFor(key) || 0)).toLocaleString()} FBU</p>}</div>)}</div> : selectedCategory === "SUBSCRIPTION" ? <div className="grid grid-cols-2 gap-2 text-center"><div className={`p-2.5 rounded-xl border ${inner}`}><p className={`text-[9px] ${muted}`}>BASE PRO ELITE</p><p className={`font-black text-xs ${primary}`}>{rules.find((r) => r.key === "premium_membership_price_fbu")?.value.toLocaleString() || "15,000"} FBU</p></div><div className={`p-2.5 rounded-xl border ${inner}`}><p className={`text-[9px] ${muted}`}>SCALE</p><p className={`font-black text-xs ${primary}`}>{((rules.find((r) => r.key === "premium_membership_scale_factor")?.value || 1) * 100).toFixed(2)}%</p></div><div className={`p-2.5 rounded-xl border ${inner} col-span-2`}><p className={`text-[9px] ${muted}`}>EFFECTIVE PRO ELITE PRICE</p><p className="font-black text-sm text-emerald-400">{((rules.find((r) => r.key === "premium_membership_price_fbu")?.value || 15000) * (rules.find((r) => r.key === "premium_membership_scale_factor")?.value || 1)).toLocaleString()} FBU</p>{pendingPremiumPrice !== null && <p className="text-[10px] text-amber-300 font-bold mt-1">PENDING: {pendingPremiumPrice.toLocaleString()} FBU</p>}</div></div> : <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center"><div className={`p-2.5 rounded-xl border ${inner}`}><p className={`text-[9px] ${muted}`}>BASE / MONTH</p><p className={`font-black text-xs ${primary}`}>{baseUnlockPrice} FBU</p></div><div className={`p-2.5 rounded-xl border ${inner}`}><p className={`text-[9px] ${muted}`}>SCALE</p><p className={`font-black text-xs ${primary}`}>{(scale * 100).toFixed(2)}%</p></div><div className={`p-2.5 rounded-xl border ${inner}`}><p className={`text-[9px] ${muted}`}>X EFFECTIVE</p><p className="font-black text-xs text-emerald-400">{effectiveUnlock.toFixed(4)} FBU</p></div><div className={`p-2.5 rounded-xl border ${inner}`}><p className={`text-[9px] ${muted}`}>Y / MONTH</p><p className="font-black text-xs text-emerald-400">{recipientMonth.toFixed(4)} FBU</p></div><div className={`p-2.5 rounded-xl border ${inner}`}><p className={`text-[9px] ${muted}`}>Y / {intervalMinutes} MIN</p><p className={`font-black text-xs ${primary}`}>{recipientPerInterval.toFixed(4)} FBU</p></div><div className={`p-2.5 rounded-xl border ${inner}`}><p className={`text-[9px] ${muted}`}>COMMISSION / {intervalMinutes} MIN</p><p className={`font-black text-xs ${primary}`}>{commissionPerInterval.toFixed(4)} FBU</p></div></div>}</div>
        {pendingRequests.length > 0 && <div className={`p-4 rounded-2xl border ${card} space-y-2`}><div className="flex items-center justify-between"><h3 className={`font-black text-xs uppercase ${primary}`}>{lang === "sw" ? "Mabadiliko yanayosubiri" : "Pending economic changes"}</h3><span className="text-[9px] text-amber-400">1 SuperAdmin approval</span></div>{pendingRequests.map((request) => <div key={request.id} className={`p-3 rounded-xl border ${inner} flex items-center justify-between gap-3`}><div><p className={`text-xs font-black ${primary}`}>{request.rule_key}</p><p className="text-[10px] text-amber-300 font-bold">PENDING · Requested: {(Number(request.requested_value) * 100).toFixed(2)}%</p></div><div className="flex items-center gap-2">{role === "SUPER_ADMIN" && <button onClick={() => approveRequest(request.id)} disabled={saving} className="px-3 py-2 rounded-lg bg-emerald-500 text-slate-950 text-[10px] font-black uppercase disabled:opacity-50">Approve</button>}<button onClick={() => cancelRequest(request.id)} disabled={saving} className="px-3 py-2 rounded-lg border border-rose-400/40 text-rose-300 hover:bg-rose-500/10 text-[10px] font-black uppercase disabled:opacity-50">Cancel</button></div></div>)}</div>}
      </>}
    </div>
  );
}
