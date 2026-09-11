import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, AlertTriangle, ArrowDownToLine, ChevronRight, Database,
  LayoutDashboard, LogOut, RefreshCw, Search, ShieldCheck, Table2,
  WalletCards, X,
} from "lucide-react";
import { supabase } from "../lib/supabase";

interface FinanceAdminPortalProps {
  currentUser: any;
  theme: "light" | "dark" | "blue";
  lang: "en" | "fr" | "sw";
}

type Transaction = {
  id: string; username?: string; email?: string; type: string; amount: number;
  status: string; description?: string; sender_phone?: string;
  phone_normalized?: string; created_at: string; updated_at?: string;
};
type Wallet = {
  id: string; profile_id?: string; username?: string; email?: string;
  balance: number; available_balance?: number; reserved_balance?: number; updated_at: string;
};
type Unmatched = {
  phone_normalized: string; total_unmatched_amount?: number; parsed_amount?: number;
  deposit_count: number; last_seen_at: string; last_raw_sms_text?: string;
};
type Dashboard = {
  role: string;
  summary: { wallet_count: number; wallet_balance_total: number; wallet_reserved_total: number; pending_transactions: number; completed_deposits: number; failed_transactions: number; unmatched_deposit_groups: number };
  recent_transactions: Transaction[]; wallets: Wallet[]; unmatched_deposits: Unmatched[];
};
type Section = "overview" | "wallets" | "deposits" | "unmatched";

const money = (value: unknown) => `${Number(value || 0).toLocaleString()} FBU`;
const date = (value?: string) => value ? new Date(value).toLocaleString() : "—";
const statusTone = (status: string, light: boolean) => {
  const s = status.toUpperCase();
  if (["COMPLETED", "MATCHED", "SUCCESS"].includes(s)) return "bg-emerald-500/12 text-emerald-500";
  if (s === "PENDING") return "bg-amber-500/12 text-amber-500";
  return light ? "bg-rose-100 text-rose-600" : "bg-rose-500/12 text-rose-400";
};

export default function FinanceAdminPortal({ currentUser, theme, lang }: FinanceAdminPortalProps) {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [section, setSection] = useState<Section>("overview");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isLight = theme === "light";
  const primary = isLight ? "text-slate-900" : "text-slate-100";
  const muted = isLight ? "text-slate-500" : "text-slate-400";
  const brand = "#3B6D99";
  const panel = isLight ? "bg-white border-slate-200 shadow-sm" : "bg-[#1f3d5c] border-blue-400/20";
  const surface = isLight ? "bg-slate-50 border-slate-200" : "bg-[#162d45] border-blue-400/20";

  const loadDashboard = useCallback(async () => {
    setLoading(true); setError(null);
    const { data, error: rpcError } = await supabase.rpc("finance_admin_dashboard", { p_limit: 50 });
    if (rpcError) { setError(rpcError.message || "Finance dashboard haikuweza kupakiwa."); setDashboard(null); }
    else if (data?.ok) setDashboard(data as Dashboard);
    else { setError("Huna ruhusa au Finance RPC haijatumika kwenye database."); setDashboard(null); }
    setLoading(false);
  }, []);
  useEffect(() => { void loadDashboard(); }, [loadDashboard]);

  const filteredTransactions = useMemo(() => {
    const q = query.toLowerCase().trim();
    return (dashboard?.recent_transactions || []).filter((row) => !q || [row.username, row.email, row.status, row.type, row.phone_normalized, row.sender_phone].some((v) => String(v || "").toLowerCase().includes(q)));
  }, [dashboard, query]);
  const filteredWallets = useMemo(() => {
    const q = query.toLowerCase().trim();
    return (dashboard?.wallets || []).filter((row) => !q || [row.username, row.email, row.profile_id].some((v) => String(v || "").toLowerCase().includes(q)));
  }, [dashboard, query]);
  const filteredUnmatched = useMemo(() => {
    const q = query.toLowerCase().trim();
    return (dashboard?.unmatched_deposits || []).filter((row) => !q || row.phone_normalized.toLowerCase().includes(q));
  }, [dashboard, query]);

  const signOut = async () => { await supabase.auth.signOut(); window.location.reload(); };
  const nav = [
    { id: "overview" as Section, label: "Overview", icon: LayoutDashboard },
    { id: "wallets" as Section, label: "Wallets", icon: WalletCards, count: dashboard?.summary.wallet_count },
    { id: "deposits" as Section, label: "Deposit logs", icon: Table2, count: dashboard?.summary.completed_deposits },
    { id: "unmatched" as Section, label: "Unmatched senders", icon: AlertTriangle, count: dashboard?.summary.unmatched_deposit_groups },
  ];
  const summary = dashboard?.summary;
  const title = lang === "sw" ? "Finance Admin" : "Finance Admin";
  const statTones = isLight
    ? ["bg-white border-slate-200 shadow-sm", "bg-orange-50 border-orange-200 shadow-sm", "bg-slate-100 border-slate-300 shadow-sm", "bg-red-50 border-red-200 shadow-sm"]
    : ["bg-[#1f3d5c] border-blue-400/20", "bg-[#4a3823] border-orange-400/30", "bg-[#26384a] border-slate-500/30", "bg-[#4a2930] border-red-400/30"];

  return <div style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }} className={`min-h-screen font-sans antialiased ${isLight ? "bg-slate-100" : "bg-[#162d45]"} ${primary} text-[13px]`}>
    <aside className={`fixed inset-y-0 left-0 z-20 hidden w-60 border-r lg:flex lg:flex-col ${isLight ? "bg-white border-slate-200" : "bg-[#1f3d5c] border-blue-400/20"}`}>
      <div className="h-14 px-4 flex items-center gap-2.5 border-b border-inherit"><div className="rounded-lg bg-blue-500/15 p-1.5" style={{ color: brand }}><ShieldCheck className="h-4 w-4" /></div><div><p className="text-[13px] font-black tracking-tight">TakeTalon</p><p className={`text-[9px] uppercase tracking-[.16em] ${muted}`}>Finance control</p></div></div>
      <div className="px-2.5 pt-5"><p className={`px-2.5 mb-1.5 text-[10px] font-black uppercase tracking-[.16em] ${muted}`}>Workspace</p>{nav.map(({ id, label, icon: Icon, count }) => <button key={id} onClick={() => { setSection(id); setQuery(""); }} className={`w-full px-2.5 py-2 mb-0.5 rounded-lg flex items-center gap-2.5 text-left text-[12px] font-bold transition ${section === id ? "bg-[#3B6D99] text-white" : `${muted} hover:bg-blue-500/10`}`}><Icon className="h-3.5 w-3.5" /><span className="flex-1">{label}</span>{count !== undefined && <span className={`text-[10px] ${section === id ? "text-white/70" : muted}`}>{count}</span>}</button>)}</div>
      <div className="mt-auto p-3"><div className={`rounded-lg border ${surface} p-2.5`}><p className="text-[9px] font-black uppercase" style={{ color: brand }}>Access boundary</p><p className={`mt-1 text-[10px] leading-4 ${muted}`}>Read-only finance workspace. No direct wallet mutation or payout action.</p></div></div>
    </aside>

    <div className="lg:pl-64">
      <header className={`sticky top-0 z-10 h-14 border-b backdrop-blur ${isLight ? "bg-white/95 border-slate-200" : "bg-[#162d45]/90 border-blue-400/20"}`}><div className="h-full px-3 sm:px-5 flex items-center justify-between gap-3"><div><div className="flex items-center gap-2"><span className="text-[12px] font-black lg:hidden">TakeTalon</span><ChevronRight className={`h-3 w-3 lg:hidden ${muted}`} /><h1 className="text-[14px] font-black">{title}</h1></div><p className={`hidden sm:block text-[11px] ${muted}`}>Operational finance registry · production read model</p></div><div className="flex items-center gap-1.5"><div className={`hidden md:flex items-center gap-2 rounded-lg border ${surface} px-2.5 py-1.5 w-56`}><Search className={`h-3.5 w-3.5 ${muted}`} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search current table..." className={`w-full bg-transparent outline-none text-[12px] ${primary}`} /></div><button onClick={loadDashboard} disabled={loading} className={`rounded-lg border ${panel} p-1.5 hover:border-blue-400 disabled:opacity-50`} title="Refresh"><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /></button><div className="hidden sm:flex items-center gap-1.5 pl-1.5 border-l border-inherit"><div className="h-6 w-6 rounded-full bg-blue-500/15 flex items-center justify-center font-black" style={{ color: brand }}>{String(currentUser?.username || "A").slice(0, 1).toUpperCase()}</div><div className="leading-tight"><p className="text-[12px] font-bold">@{currentUser?.username || "finance-admin"}</p><p className={`text-[10px] ${muted}`}>{dashboard?.role || "ADMIN"}</p></div></div><button onClick={signOut} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50" title="Sign out"><LogOut className="h-3.5 w-3.5" /></button></div></div></header>

      <main className="mx-auto max-w-[1600px] p-3 sm:p-5 space-y-4">
        <div className="lg:hidden flex gap-1.5 overflow-x-auto pb-1">{nav.map(({ id, label }) => <button key={id} onClick={() => setSection(id)} className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-[11px] font-bold ${section === id ? "bg-[#3B6D99] text-white" : `${panel} border ${muted}`}`}>{label}</button>)}</div>
        {error && <div className="flex items-center justify-between gap-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-500"><span>{error}</span><button onClick={() => setError(null)}><X className="h-4 w-4" /></button></div>}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.16em]" style={{ color: brand }}>Finance operations</p><h2 className="mt-0.5 text-xl font-black">{section === "overview" ? "Operations overview" : nav.find((item) => item.id === section)?.label}</h2></div><div className={`flex items-center gap-1.5 text-[11px] ${muted}`}><Activity className="h-3.5 w-3.5" style={{ color: brand }} /> Live Supabase read model <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: brand }} /></div></div>

        {section === "overview" && <>
          <section className="grid grid-cols-2 xl:grid-cols-4 gap-2">{[
            ["Total wallet balance", money(summary?.wallet_balance_total), WalletCards, "text-emerald-500"], ["Reserved balance", money(summary?.wallet_reserved_total), Database, "text-amber-500"], ["Pending deposits", summary?.pending_transactions ?? "—", Table2, "text-sky-500"], ["Failed / reversed", summary?.failed_transactions ?? "—", AlertTriangle, "text-rose-500"],
          ].map(([label, value, Icon, color], index) => <div key={String(label)} className={`rounded-2xl border ${statTones[index]} p-3`}><div className="flex items-center justify-between"><p className={`text-[11px] font-bold ${muted}`}>{label}</p><Icon className={`h-3.5 w-3.5 ${color}`} /></div><p className="mt-1.5 text-lg font-black">{loading ? "—" : value}</p></div>)}</section>
          <div className={`rounded-3xl border-t-4 border-orange-400 ${isLight ? "bg-white border-slate-200 shadow-sm" : "bg-[#1f3d5c] border-blue-400/20"} overflow-hidden`}><TableHeader title="Recent deposit logs" subtitle="sms_deposit_logs · last 50 records" action={() => setSection("deposits")} actionLabel="View registry" muted={muted} /><DepositTable rows={filteredTransactions.slice(0, 8)} light={isLight} muted={muted} /></div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5"><div className={`rounded-3xl border ${isLight ? "bg-slate-100 border-slate-300 shadow-inner" : "bg-[#26384a] border-slate-500/30"} overflow-hidden`}><TableHeader title="Wallet registry" subtitle="wallets · balances and reservations" action={() => setSection("wallets")} actionLabel="Open table" muted={muted} /><WalletTable rows={filteredWallets.slice(0, 6)} light={isLight} muted={muted} /></div><div className={`rounded-3xl border-t-4 border-red-400 ${isLight ? "bg-red-50 border-red-200 shadow-sm" : "bg-[#4a2930] border-red-400/30"} overflow-hidden`}><TableHeader title="Unmatched senders" subtitle="unregistered_senders · reconciliation queue" action={() => setSection("unmatched")} actionLabel="Open table" muted={muted} /><UnmatchedTable rows={filteredUnmatched.slice(0, 6)} light={isLight} muted={muted} /></div></div>
        </>}
        {section === "wallets" && <div className={`rounded-3xl border ${isLight ? "bg-slate-100 border-slate-300 shadow-inner" : "bg-[#26384a] border-slate-500/30"} overflow-hidden`}><TableHeader title="Wallet registry" subtitle="public.wallets joined with public.profiles" muted={muted} /><WalletTable rows={filteredWallets} light={isLight} muted={muted} /></div>}
        {section === "deposits" && <div className={`rounded-3xl border-t-4 border-orange-400 ${isLight ? "bg-white border-slate-200 shadow-sm" : "bg-[#1f3d5c] border-blue-400/20"} overflow-hidden`}><TableHeader title="Deposit logs" subtitle="public.sms_deposit_logs joined with public.profiles" muted={muted} /><DepositTable rows={filteredTransactions} light={isLight} muted={muted} /></div>}
        {section === "unmatched" && <div className={`rounded-3xl border-t-4 border-red-400 ${isLight ? "bg-red-50 border-red-200 shadow-sm" : "bg-[#4a2930] border-red-400/30"} overflow-hidden`}><TableHeader title="Unmatched senders" subtitle="public.unregistered_senders · no mutation controls" muted={muted} /><UnmatchedTable rows={filteredUnmatched} light={isLight} muted={muted} /></div>}
      </main>
    </div>
  </div>;
}

function TableHeader({ title, subtitle, action, actionLabel, muted }: { title: string; subtitle: string; action?: () => void; actionLabel?: string; muted: string }) { return <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3"><div><h3 className="text-[13px] font-bold">{title}</h3><p className={`mt-0.5 text-[10px] font-mono ${muted}`}>{subtitle}</p></div>{action && <button onClick={action} className="text-[11px] font-bold text-[#3B6D99] hover:underline">{actionLabel}</button>}</div>; }
function TableEmpty({ cols, muted }: { cols: number; muted: string }) { return <tr><td colSpan={cols} className={`px-4 py-10 text-center text-xs ${muted}`}>No records found.</td></tr>; }
function DepositTable({ rows, light, muted }: { rows: Transaction[]; light: boolean; muted: string }) { return <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left"><thead className={`sticky top-0 z-[1] ${light ? "bg-slate-50" : "bg-[#1f3d5c]"}`}><tr className={`text-[10px] uppercase tracking-wide ${muted}`}><th className="px-4 py-2.5">Created</th><th className="px-4 py-2.5">Sender / user</th><th className="px-4 py-2.5">Reference</th><th className="px-4 py-2.5 text-right">Amount</th><th className="px-4 py-2.5">Status</th><th className="px-4 py-2.5">Matched profile</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-t border-inherit text-[12px]"><td className={`whitespace-nowrap px-4 py-2.5 ${muted}`}>{date(row.created_at)}</td><td className="px-4 py-2.5"><p className="font-bold">{row.username ? `@${row.username}` : row.phone_normalized || row.sender_phone || "Unknown"}</p><p className={`text-[10px] ${muted}`}>{row.email || row.sender_phone || "—"}</p></td><td className={`px-4 py-2.5 font-mono text-[11px] ${muted}`}>{row.description || "—"}</td><td className="px-4 py-2.5 text-right font-mono font-bold">{money(row.amount)}</td><td className="px-4 py-2.5"><span className={`rounded-md px-2 py-1 text-[10px] font-black ${statusTone(row.status, light)}`}>{row.status}</span></td><td className={`px-4 py-2.5 font-mono text-[10px] ${muted}`}>{row.phone_normalized || "—"}</td></tr>)}{!rows.length && <TableEmpty cols={6} muted={muted} />}</tbody></table></div>; }
function WalletTable({ rows, light, muted }: { rows: Wallet[]; light: boolean; muted: string }) { return <div className="max-h-[340px] overflow-auto"><table className="w-full min-w-[800px] text-left"><thead className={`sticky top-0 z-[1] ${light ? "bg-slate-50" : "bg-[#1f3d5c]"}`}><tr className={`text-[10px] uppercase tracking-wide ${muted}`}><th className="px-4 py-2.5">Profile</th><th className="px-4 py-2.5 text-right">Balance</th><th className="px-4 py-2.5 text-right">Available</th><th className="px-4 py-2.5 text-right">Reserved</th><th className="px-4 py-2.5">Updated</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-t border-inherit text-[12px]"><td className="px-4 py-2.5"><p className="font-bold">{row.username ? `@${row.username}` : "Unknown profile"}</p><p className={`font-mono text-[10px] ${muted}`}>{row.email || row.profile_id || "—"}</p></td><td className="px-4 py-2.5 text-right font-mono font-bold">{money(row.balance)}</td><td className="px-4 py-2.5 text-right font-mono text-[#3B6D99]">{money(row.available_balance)}</td><td className="px-4 py-2.5 text-right font-mono text-amber-500">{money(row.reserved_balance)}</td><td className={`whitespace-nowrap px-4 py-2.5 ${muted}`}>{date(row.updated_at)}</td></tr>)}{!rows.length && <TableEmpty cols={5} muted={muted} />}</tbody></table></div>; }
function UnmatchedTable({ rows, light, muted }: { rows: Unmatched[]; light: boolean; muted: string }) { return <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left"><thead className={`sticky top-0 z-[1] ${light ? "bg-slate-50" : "bg-[#1f3d5c]"}`}><tr className={`text-[10px] uppercase tracking-wide ${muted}`}><th className="px-4 py-2.5">Phone normalized</th><th className="px-4 py-2.5 text-right">Total unmatched</th><th className="px-4 py-2.5 text-right">Deposits</th><th className="px-4 py-2.5">Last seen</th><th className="px-4 py-2.5">Registry status</th></tr></thead><tbody>{rows.map((row) => <tr key={row.phone_normalized} className="border-t border-inherit text-[12px]"><td className="px-4 py-2.5 font-mono font-bold">{row.phone_normalized}</td><td className="px-4 py-2.5 text-right font-mono font-bold text-amber-500">{money(row.total_unmatched_amount ?? row.parsed_amount)}</td><td className="px-4 py-2.5 text-right font-mono">{row.deposit_count || 1}</td><td className={`px-4 py-2.5 whitespace-nowrap ${muted}`}>{date(row.last_seen_at)}</td><td className="px-4 py-2.5"><span className="rounded-md bg-red-50 px-2 py-1 text-[10px] font-black text-red-600">UNMATCHED</span></td></tr>)}{!rows.length && <TableEmpty cols={5} muted={muted} />}</tbody></table></div>; }
