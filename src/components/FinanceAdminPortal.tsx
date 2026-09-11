import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpRight,
  Clock3,
  Database,
  LogOut,
  RefreshCw,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { supabase } from "../lib/supabase";

interface FinanceAdminPortalProps {
  currentUser: any;
  theme: "light" | "dark" | "blue";
  lang: "en" | "fr" | "sw";
}

type Dashboard = {
  role: string;
  summary: {
    wallet_count: number;
    wallet_balance_total: number;
    wallet_reserved_total: number;
    pending_transactions: number;
    completed_deposits: number;
    failed_transactions: number;
    unmatched_deposit_groups: number;
  };
  recent_transactions: Array<{
    id: string;
    username?: string;
    email?: string;
    type: string;
    amount: number;
    status: string;
    description?: string;
    created_at: string;
  }>;
  unmatched_deposits: Array<{
    phone_normalized: string;
    amount?: number;
    total_unmatched_amount?: number;
    parsed_amount?: number;
    deposit_count: number;
    last_seen_at: string;
  }>;
};

const number = (value: unknown) => Number(value || 0).toLocaleString();
const date = (value: string) => new Date(value).toLocaleString();

export default function FinanceAdminPortal({ currentUser, theme, lang }: FinanceAdminPortalProps) {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isLight = theme === "light";
  const card = isLight ? "bg-white border-slate-200" : "bg-slate-900/80 border-slate-700/70";
  const inner = isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800";
  const primary = isLight ? "text-slate-950" : "text-white";
  const secondary = isLight ? "text-slate-600" : "text-slate-400";

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: rpcError } = await supabase.rpc("finance_admin_dashboard", { p_limit: 30 });
    if (rpcError) {
      setError(rpcError.message || "Finance dashboard haikuweza kupakiwa.");
      setDashboard(null);
    } else if (data?.ok) {
      setDashboard(data as Dashboard);
    } else {
      setError("Huna ruhusa ya kufikia Finance Admin Portal au RPC haijatumika kwenye database.");
      setDashboard(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const title = lang === "sw" ? "Finance Admin Portal" : "Finance Admin Portal";
  const subtitle = lang === "sw"
    ? "Mazingira ya staff ya fedha — hakuna betting wala user-level actions."
    : "Finance staff workspace — betting and user-level actions are unavailable.";
  const summary = dashboard?.summary;
  const stats = [
    { label: "Wallet balance total", value: number(summary?.wallet_balance_total), icon: WalletCards, color: "text-emerald-400" },
    { label: "Reserved balance", value: number(summary?.wallet_reserved_total), icon: Database, color: "text-amber-400" },
    { label: "Pending transactions", value: number(summary?.pending_transactions), icon: Clock3, color: "text-sky-400" },
    { label: "Failed / reversed", value: number(summary?.failed_transactions), icon: AlertTriangle, color: "text-rose-400" },
  ];

  return (
    <div className={`min-h-screen overflow-y-auto ${isLight ? "bg-slate-100" : "bg-[#07111f]"} ${primary}`}>
      <header className={`sticky top-0 z-10 border-b ${isLight ? "bg-white/95 border-slate-200" : "bg-[#07111f]/95 border-slate-800"} backdrop-blur`}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400"><ShieldCheck className="w-6 h-6" /></div>
            <div>
              <h1 className="text-lg font-black tracking-tight">{title}</h1>
              <p className={`text-xs ${secondary}`}>{subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-xs font-bold text-emerald-400">@{currentUser?.username || "finance-admin"}</span>
            <button onClick={loadDashboard} disabled={loading} className={`p-2 rounded-lg border ${card} hover:border-emerald-400 disabled:opacity-50`} title="Refresh">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button onClick={signOut} className="p-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20" title="Sign out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className={`rounded-2xl border ${card} p-5 flex flex-col md:flex-row md:items-center justify-between gap-4`}>
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-400 font-black">Finance operations</p>
            <h2 className="mt-1 text-2xl font-black">{lang === "sw" ? "Muhtasari wa fedha" : "Financial overview"}</h2>
            <p className={`mt-1 text-sm ${secondary}`}>Role: <span className="font-black text-emerald-400">{dashboard?.role || "ADMIN"}</span> · Read-only operational view</p>
          </div>
          <div className={`rounded-xl border ${inner} px-4 py-3 text-xs ${secondary} max-w-md`}>
            <strong className="text-amber-400">Safety boundary:</strong> Finance Admin hawezi kubet, kuweka bet, kubadilisha balance moja kwa moja, au kufanya payout kutoka portal hii.
          </div>
        </div>

        {error && <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-300 px-4 py-3 text-sm">{error}</div>}

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {stats.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className={`rounded-2xl border ${card} p-5`}>
              <div className="flex items-center justify-between"><span className={`text-xs ${secondary}`}>{label}</span><Icon className={`w-5 h-5 ${color}`} /></div>
              <p className="mt-3 text-2xl font-black tracking-tight">{loading ? "—" : value}</p>
            </div>
          ))}
        </section>

        <section className={`rounded-2xl border ${card} overflow-hidden`}>
          <div className="px-5 py-4 border-b border-inherit flex items-center justify-between"><div><h3 className="font-black">Recent transactions</h3><p className={`text-xs ${secondary}`}>View only; approval and balance mutation workflows will be added separately.</p></div><ArrowUpRight className="w-5 h-5 text-sky-400" /></div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs"><thead className={isLight ? "bg-slate-50" : "bg-slate-950/70"}><tr className={secondary}><th className="px-5 py-3">Time</th><th className="px-5 py-3">User</th><th className="px-5 py-3">Type</th><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Status</th></tr></thead><tbody>
              {(dashboard?.recent_transactions || []).map((tx) => <tr key={tx.id} className="border-t border-inherit"><td className={`px-5 py-3 whitespace-nowrap ${secondary}`}>{date(tx.created_at)}</td><td className="px-5 py-3"><span className="font-bold">@{tx.username || "unknown"}</span><span className={`block ${secondary}`}>{tx.email || ""}</span></td><td className="px-5 py-3 font-bold">{tx.type}</td><td className="px-5 py-3 font-mono">{number(tx.amount)} FBU</td><td className="px-5 py-3"><span className={`px-2 py-1 rounded-md text-[10px] font-black ${tx.status === "COMPLETED" ? "bg-emerald-500/15 text-emerald-400" : tx.status === "PENDING" ? "bg-amber-500/15 text-amber-400" : "bg-rose-500/15 text-rose-400"}`}>{tx.status}</span></td></tr>)}
              {!loading && !dashboard?.recent_transactions?.length && <tr><td colSpan={5} className={`px-5 py-10 text-center ${secondary}`}>No transactions found.</td></tr>}
            </tbody></table>
          </div>
        </section>

        <section className={`rounded-2xl border ${card} overflow-hidden`}>
          <div className="px-5 py-4 border-b border-inherit flex items-center gap-2"><ArrowDownToLine className="w-5 h-5 text-amber-400" /><div><h3 className="font-black">Unmatched deposits</h3><p className={`text-xs ${secondary}`}>Deposit records waiting for safe reconciliation.</p></div></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-5">{(dashboard?.unmatched_deposits || []).map((row) => { const amount = row.amount ?? row.total_unmatched_amount ?? row.parsed_amount ?? 0; return <div key={row.phone_normalized} className={`rounded-xl border ${inner} p-4`}><p className="font-mono font-bold">{row.phone_normalized}</p><p className="mt-2 text-lg font-black text-amber-400">{number(amount)} FBU</p><p className={`text-xs ${secondary}`}>{row.deposit_count || 1} deposit(s) · {date(row.last_seen_at)}</p></div>; })}{!loading && !dashboard?.unmatched_deposits?.length && <p className={`md:col-span-3 text-center py-6 ${secondary}`}>No unmatched deposits.</p>}</div>
        </section>
      </main>
    </div>
  );
}
