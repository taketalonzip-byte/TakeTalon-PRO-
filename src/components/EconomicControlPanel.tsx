import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Calculator, CheckCircle2, Loader2, RefreshCw, ShieldCheck, SlidersHorizontal } from "lucide-react";
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

const ACCESS_RULES = [
  { key: "pricing_scale_factor", label: "Unlock price percentage", sw: "Asilimia ya bei ya Unlock", unit: "%" },
  { key: "commission_month", label: "Unlock commission rate", sw: "Asilimia ya commission ya Unlock", unit: "%" },
  { key: "interval_minutes", label: "Unlock payment interval", sw: "Muda wa malipo ya Unlock", unit: "min" },
];

export default function EconomicControlPanel({
  currentUser,
  theme,
  lang,
  onBack,
  onAddNotification,
}: EconomicControlPanelProps) {
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [selectedKey, setSelectedKey] = useState("pricing_scale_factor");
  const [inputValue, setInputValue] = useState(1);
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
    const { data, error } = await supabase
      .from("business_rules")
      .select("key,value,category,control_mode,version,description")
      .eq("category", "ACCESS")
      .eq("is_active", true)
      .order("key")
      .limit(50);
    if (error) {
      onAddNotification(lang === "sw" ? "Imeshindikana kusoma mipangilio ya miamala." : "Could not load transaction controls.", "error");
      setRules([]);
    } else {
      setRules((data || []) as RuleRow[]);
    }
    setLoading(false);
  }, [lang, onAddNotification]);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const selectedRule = useMemo(() => rules.find((r) => r.key === selectedKey), [rules, selectedKey]);
  const baseUnlockPrice = rules.find((r) => r.key === "unlock_price_x_month")?.value ?? 500;
  const scale = rules.find((r) => r.key === "pricing_scale_factor")?.value ?? 1;
  const effectiveUnlock = baseUnlockPrice * scale;

  useEffect(() => {
    if (!selectedRule) return;
    setInputValue(selectedRule.key === "pricing_scale_factor" || selectedRule.key === "commission_month" ? selectedRule.value * 100 : selectedRule.value);
  }, [selectedRule]);

  const saveRule = async () => {
    if (!allowed || !selectedRule || saving) return;
    const nextValue = selectedRule.key === "pricing_scale_factor" || selectedRule.key === "commission_month" ? inputValue / 100 : inputValue;
    if (!Number.isFinite(nextValue) || nextValue < 0) {
      onAddNotification(lang === "sw" ? "Weka namba sahihi." : "Enter a valid number.", "error");
      return;
    }
    setSaving(true);
    setFeedback(null);
    const { data, error } = await supabase.rpc("admin_update_business_rule", {
      p_key: selectedRule.key,
      p_new_value: nextValue,
    });
    if (error || (data as any)?.ok === false) {
      const message = (data as any)?.error || error?.message || "update_failed";
      onAddNotification(lang === "sw" ? `Mabadiliko yamekataliwa: ${message}` : `Change rejected: ${message}`, "error");
    } else {
      setFeedback(lang === "sw" ? "Mabadiliko yamehifadhiwa na audit log imeandikwa." : "Change saved and written to the audit log.");
      onAddNotification(lang === "sw" ? "Mipangilio ya muamala imebadilishwa." : "Transaction control updated.", "success");
      await loadRules();
    }
    setSaving(false);
  };

  return (
    <div className="px-3.5 py-3 space-y-3.5 max-w-2xl mx-auto pb-20 text-left">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className={`p-2 rounded-xl border ${card} ${muted}`}><ArrowLeft className="w-4 h-4" /></button>
        <div className="text-right">
          <h2 className={`font-black text-sm uppercase tracking-wider ${primary}`}>{lang === "sw" ? "Udhibiti wa Miamala" : "Economic Transaction Control"}</h2>
          <p className={`text-[10px] ${muted}`}>{lang === "sw" ? "Owner na SuperAdmin" : "Owner and SuperAdmin settings"}</p>
        </div>
      </div>

      {!allowed ? (
        <div className={`p-5 rounded-2xl border ${card} text-center space-y-2`}>
          <ShieldCheck className="w-8 h-8 text-rose-400 mx-auto" />
          <p className={`font-black ${primary}`}>Owner/SuperAdmin only</p>
          <p className={`text-xs ${muted}`}>This control is protected by the database role, not the frontend.</p>
        </div>
      ) : (
        <>
          <div className={`p-4 rounded-2xl border ${card} space-y-3`}>
            <div className="flex items-center gap-2"><SlidersHorizontal className="w-5 h-5 text-amber-400" /><h3 className={`font-black text-xs uppercase ${primary}`}>{lang === "sw" ? "Chagua kundi la muamala" : "Choose transaction control"}</h3></div>
            <select value={selectedKey} onChange={(e) => setSelectedKey(e.target.value)} className={`w-full p-3 rounded-xl border ${inner} ${primary} text-sm`}>
              {ACCESS_RULES.map((item) => <option key={item.key} value={item.key}>{lang === "sw" ? item.sw : item.label}</option>)}
            </select>
            {selectedRule && (
              <div className={`p-3 rounded-xl border ${inner} space-y-2`}>
                <div className="flex items-center justify-between"><span className={`text-xs font-black ${primary}`}>{selectedRule.key}</span><span className="text-[10px] text-sky-400">v{selectedRule.version}</span></div>
                <label className={`text-[10px] uppercase font-black ${muted}`}>{selectedRule.key === "interval_minutes" ? "Minutes" : "Percentage"}</label>
                <div className="flex gap-2"><input type="number" min="0" step="0.01" value={inputValue} onChange={(e) => setInputValue(Number(e.target.value))} className={`flex-1 p-3 rounded-xl border ${inner} ${primary} font-mono`} /><span className={`self-center text-sm font-black ${muted}`}>{selectedRule.key === "interval_minutes" ? "min" : "%"}</span></div>
                <button onClick={saveRule} disabled={saving || loading} className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs uppercase flex items-center justify-center gap-2">
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> {lang === "sw" ? "Inatafuta na kubadilisha..." : "Loading and updating..."}</> : <><CheckCircle2 className="w-4 h-4" /> {lang === "sw" ? "Tekeleza mpangilio" : "Apply control"}</>}
                </button>
              </div>
            )}
          </div>

          <div className={`p-4 rounded-2xl border ${card} space-y-3`}>
            <div className="flex items-center gap-2"><Calculator className="w-5 h-5 text-emerald-400" /><h3 className={`font-black text-xs uppercase ${primary}`}>{lang === "sw" ? "Preview ya Unlock" : "Unlock preview"}</h3></div>
            <div className="grid grid-cols-3 gap-2 text-center"><div className={`p-3 rounded-xl border ${inner}`}><p className={`text-[9px] ${muted}`}>BASE</p><p className={`font-black ${primary}`}>{baseUnlockPrice} FBU</p></div><div className={`p-3 rounded-xl border ${inner}`}><p className={`text-[9px] ${muted}`}>SCALE</p><p className={`font-black ${primary}`}>{(scale * 100).toFixed(2)}%</p></div><div className={`p-3 rounded-xl border ${inner}`}><p className={`text-[9px] ${muted}`}>EFFECTIVE</p><p className="font-black text-emerald-400">{effectiveUnlock} FBU</p></div></div>
            {feedback && <p className="text-xs text-emerald-400 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />{feedback}</p>}
            <button onClick={loadRules} disabled={loading} className={`text-xs ${muted} flex items-center gap-2 hover:text-sky-400`}><RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />Refresh controls</button>
          </div>
        </>
      )}
    </div>
  );
}
