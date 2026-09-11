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
  const panel = isLight ? "bg-white border-slate-200" : "bg-[#101b2b] border-slate-700/70";
  const surface = isLight ? "bg-slate-50 border-slate-200" : "bg-[#0b1524] border-slate-800";

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

  return <div className={`min-h-screen ${isLight ? "bg-[#f4f6f8]" : "bg-[#08111e]"} ${primary} text-sm`}>
    <aside className={`fixed inset-y-0 left-0 z-20 hidden w-64 border-r lg:flex lg:flex-col ${isLight ? "bg-white border-slate-200" : "bg-[#0d1828] border-slate-800"}`}>
      <div className="h-16 px-5 flex items-center gap-3 border-b border-inherit"><div className="rounded-lg bg-emerald-500/15 p-2 text-emerald-500"><ShieldCheck className="h-5 w-5" /></div><div><p className="font-black tracking-tight">TakeTalon</p><p className={`text-[10px] uppercase tracking-[.18em] ${muted}`}>Finance control</p></div></div>
      <div className="px-3 pt-6"><p className={`px-3 mb-2 text-[10px] font-black uppercase tracking-[.16em] ${muted}`}>Workspace</p>{nav.map(({ id, label, icon: Icon, count }) => <button key={id} onClick={() => { setSection(id); setQuery(""); }} className={`w-full px-3 py-2.5 mb-1 rounded-lg flex items-center gap-3 text-left text-xs font-bold transition ${section === id ? "bg-emerald-500 text-slate-950" : `${muted} hover:bg-emerald-500/10 hover:text-emerald-500`}`}><Icon className="h-4 w-4" /><span className="flex-1">{label}</span>{count !== undefined && <span className={`text-[10px] ${section === id ? "text-slate-950/70" : muted}`}>{count}</span>}</button>)}</div>
      <div className="mt-auto p-4"><div className={`rounded-xl border ${surface} p-3`}><p className="text-[10px] font-black text-emerald-500 uppercase">Access boundary</p><p className={`mt-1 text-[11px] leading-4 ${muted}`}>Read-only finance workspace. No direct wallet mutation or payout action.</p></div></div>
    </aside>

    <div className="lg:pl-64">
      <header className={`sticky top-0 z-10 h-16 border-b backdrop-blur ${isLight ? "bg-white/90 border-slate-200" : "bg-[#08111e]/90 border-slate-800"}`}><div className="h-full px-4 sm:px-7 flex items-center justify-between gap-4"><div><div className="flex items-center gap-2"><span className="text-xs font-black lg:hidden">TakeTalon</span><ChevronRight className={`h-3.5 w-3.5 lg:hidden ${muted}`} /><h1 className="font-black">{title}</h1></div><p className={`hidden sm:block text-[11px] ${muted}`}>Operational finance registry · production read model</p></div><div className="flex items-center gap-2"><div className={`hidden md:flex items-center gap-2 rounded-lg border ${surface} px-3 py-2 w-64`}><Search className={`h-4 w-4 ${muted}`} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search current table..." className={`w-full bg-transparent outline-none text-xs ${primary}`} /></div><button onClick={loadDashboard} disabled={loading} className={`rounded-lg border ${panel} p-2 hover:border-emerald-500 disabled:opacity-50`} title="Refresh"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button><div className={`hidden sm:flex items-center gap-2 pl-2 border-l border-inherit`}><div className="h-7 w-7 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center font-black">{String(currentUser?.username || "A").slice(0, 1).toUpperCase()}</div><div className="leading-tight"><p className="text-xs font-bold">@{currentUser?.username || "finance-admin"}</p><p className={`text-[10px] ${muted}`}>{dashboard?.role || "ADMIN"}</p></div></div><button onClick={signOut} className="rounded-lg p-2 text-rose-500 hover:bg-rose-500/10" title="Sign out"><LogOut className="h-4 w-4" /></button></div></div></header>

      <main className="mx-auto max-w-[1600px] p-4 sm:p-7 space-y-5">
        <div className="lg:hidden flex gap-2 overflow-x-auto pb-1">{nav.map(({ id, label }) => <button key={id} onClick={() => setSection(id)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold ${section === id ? "bg-emerald-500 text-slate-950" : `${panel} border ${muted}`}`}>{label}</button>)}</div>
        {error && <div className="flex items-center justify-between gap-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-500"><span>{error}</span><button onClick={() => setError(null)}><X className="h-4 w-4" /></button></div>}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-emerald-500">Finance operations</p><h2 className="mt-1 text-2xl font-black">{section === "overview" ? "Operations overview" : nav.find((item) => item.id === section)?.label}</h2></div><div className={`flex items-center gap-2 text-[11px] ${muted}`}><Activity className="h-3.5 w-3.5 text-emerald-500" /> Live Supabase read model <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /></div></div>

        {section === "overview" && <>
          <section className="grid grid-cols-2 xl:grid-cols-4 gap-3">{[
            ["Total wallet balance", money(summary?.wallet_balance_total), WalletCards, "text-emerald-500"], ["Reserved balance", money(summary?.wallet_reserved_total), Database, "text-amber-500"], ["Pending deposits", summary?.pending_transactions ?? "—", Table2, "text-sky-500"], ["Failed / reversed", summary?.failed_transactions ?? "—", AlertTriangle, "text-rose-500"],
          ].map(([label, value, Icon, color]) => <div key={String(label)} className={`rounded-xl border ${panel} p-4`}><div className="flex items-center justify-between"><p className={`text-[11px] font-bold ${muted}`}>{label}</p><Icon className={`h-4 w-4 ${color}`} /></div><p className="mt-3 text-xl font-black">{loading ? "—" : value}</p></div>)}</section>
          <div className={`rounded-xl border ${panel} overflow-hidden`}><TableHeader title="Recent deposit logs" subtitle="sms_deposit_logs · last 50 records" action={() => setSection("deposits")} actionLabel="View registry" muted={muted} /><DepositTable rows={filteredTransactions.slice(0, 8)} light={isLight} muted={muted} /></div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5"><div className={`rounded-xl border ${panel} overflow-hidden`}><TableHeader title="Wallet registry" subtitle="wallets · balances and reservations" action={() => setSection("wallets")} actionLabel="Open table" muted={muted} /><WalletTable rows={filteredWallets.slice(0, 6)} light={isLight} muted={muted} /></div><div className={`rounded-xl border ${panel} overflow-hidden`}><TableHeader title="Unmatched senders" subtitle="unregistered_senders · reconciliation queue" action={() => setSection("unmatched")} actionLabel="Open table" muted={muted} /><UnmatchedTable rows={filteredUnmatched.slice(0, 6)} light={isLight} muted={muted} /></div></div>
        </>}
        {section === "wallets" && <div className={`rounded-xl border ${panel} overflow-hidden`}><TableHeader title="Wallet registry" subtitle="public.wallets joined with public.profiles" muted={muted} /><WalletTable rows={filteredWallets} light={isLight} muted={muted} /></div>}
        {section === "deposits" && <div className={`rounded-xl border ${panel} overflow-hidden`}><TableHeader title="Deposit logs" subtitle="public.sms_deposit_logs joined with public.profiles" muted={muted} /><DepositTable rows={filteredTransactions} light={isLight} muted={muted} /></div>}
        {section === "unmatched" && <div className={`rounded-xl border ${panel} overflow-hidden`}><TableHeader title="Unmatched senders" subtitle="public.unregistered_senders · no mutation controls" muted={muted} /><UnmatchedTable rows={filteredUnmatched} light={isLight} muted={muted} /></div>}
      </main>
    </div>
  </div>;
}

function TableHeader({ title, subtitle, action, actionLabel, muted }: { title: string; subtitle: string; action?: () => void; actionLabel?: string; muted: string }) { return <div className="flex items-center justify-between gap-3 border-b border-inherit px-4 py-3"><div><h3 className="text-xs font-black">{title}</h3><p className={`mt-0.5 text-[10px] ${muted}`}>{subtitle}</p></div>{action && <button onClick={action} className="text-[10px] font-black text-emerald-500 hover:underline">{actionLabel}</button>}</div>; }
function TableEmpty({ cols, muted }: { cols: number; muted: string }) { return <tr><td colSpan={cols} className={`px-4 py-10 text-center text-xs ${muted}`}>No records found.</td></tr>; }
function DepositTable({ rows, light, muted }: { rows: Transaction[]; light: boolean; muted: string }) { return <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left"><thead className={light ? "bg-slate-50" : "bg-slate-950/35"}><tr className={`text-[10px] uppercase tracking-wide ${muted}`}><th className="px-4 py-3">Created</th><th className="px-4 py-3">Sender / user</th><th className="px-4 py-3">Reference</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Matched profile</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-t border-inherit text-xs"><td className={`whitespace-nowrap px-4 py-3 ${muted}`}>{date(row.created_at)}</td><td className="px-4 py-3"><p className="font-bold">{row.username ? `@${row.username}` : row.phone_normalized || row.sender_phone || "Unknown"}</p><p className={`text-[10px] ${muted}`}>{row.email || row.sender_phone || "—"}</p></td><td className={`px-4 py-3 font-mono text-[11px] ${muted}`}>{row.description || "—"}</td><td className="px-4 py-3 text-right font-mono font-bold">{money(row.amount)}</td><td className="px-4 py-3"><span className={`rounded px-2 py-1 text-[10px] font-black ${statusTone(row.status, light)}`}>{row.status}</span></td><td className={`px-4 py-3 font-mono text-[10px] ${muted}`}>{row.phone_normalized || "—"}</td></tr>)}{!rows.length && <TableEmpty cols={6} muted={muted} />}</tbody></table></div>; }
function WalletTable({ rows, light, muted }: { rows: Wallet[]; light: boolean; muted: string }) { return <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left"><thead className={light ? "bg-slate-50" : "bg-slate-950/35"}><tr className={`text-[10px] uppercase tracking-wide ${muted}`}><th className="px-4 py-3">Profile</th><th className="px-4 py-3 text-right">Balance</th><th className="px-4 py-3 text-right">Available</th><th className="px-4 py-3 text-right">Reserved</th><th className="px-4 py-3">Updated</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-t border-inherit text-xs"><td className="px-4 py-3"><p className="font-bold">{row.username ? `@${row.username}` : "Unknown profile"}</p><p className={`font-mono text-[10px] ${muted}`}>{row.email || row.profile_id || "—"}</p></td><td className="px-4 py-3 text-right font-mono font-bold">{money(row.balance)}</td><td className="px-4 py-3 text-right font-mono text-emerald-500">{money(row.available_balance)}</td><td className="px-4 py-3 text-right font-mono text-amber-500">{money(row.reserved_balance)}</td><td className={`whitespace-nowrap px-4 py-3 ${muted}`}>{date(row.updated_at)}</td></tr>)}{!rows.length && <TableEmpty cols={5} muted={muted} />}</tbody></table></div>; }
function UnmatchedTable({ rows, light, muted }: { rows: Unmatched[]; light: boolean; muted: string }) { return <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left"><thead className={light ? "bg-slate-50" : "bg-slate-950/35"}><tr className={`text-[10px] uppercase tracking-wide ${muted}`}><th className="px-4 py-3">Phone normalized</th><th className="px-4 py-3 text-right">Total unmatched</th><th className="px-4 py-3 text-right">Deposits</th><th className="px-4 py-3">Last seen</th><th className="px-4 py-3">Registry status</th></tr></thead><tbody>{rows.map((row) => <tr key={row.phone_normalized} className="border-t border-inherit text-xs"><td className="px-4 py-3 font-mono font-bold">{row.phone_normalized}</td><td className="px-4 py-3 text-right font-mono font-bold text-amber-500">{money(row.total_unmatched_amount ?? row.parsed_amount)}</td><td className="px-4 py-3 text-right font-mono">{row.deposit_count || 1}</td><td className={`px-4 py-3 whitespace-nowrap ${muted}`}>{date(row.last_seen_at)}</td><td className="px-4 py-3"><span className="rounded bg-amber-500/12 px-2 py-1 text-[10px] font-black text-amber-500">UNMATCHED</span></td></tr>)}{!rows.length && <TableEmpty cols={5} muted={muted} />}</tbody></table></div>; }
