import React, { useState } from "react";
import { ArrowLeft, ArrowDownLeft, ArrowUpRight, Coins, Sparkles, ShieldCheck, Filter } from "lucide-react";
import { Transaction } from "../types";

interface TransactionHistoryViewProps {
  transactions: Transaction[];
  theme: "blue" | "dark" | "light";
  lang: "en" | "fr" | "sw";
  onBack: () => void;
}

export default function TransactionHistoryView({
  transactions,
  theme,
  lang,
  onBack,
}: TransactionHistoryViewProps) {
  const [filter, setFilter] = useState<"ALL" | "DEPOSIT" | "WITHDRAW" | "BET_WIN" | "BET_PLACE">("ALL");

  const filtered = transactions.filter((t) => {
    if (filter === "ALL") return true;
    return t.type === filter;
  });

  const cardBg =
    theme === "light"
      ? "bg-gradient-to-br from-[#f8fbfe] via-[#f0f5fc] to-[#e6effa] border-slate-200/90 text-slate-800 shadow-sm"
      : theme === "dark"
        ? "bg-neutral-900 border-neutral-800 text-white"
        : "bg-[#1f3d5c] border-blue-400/30 text-white";

  return (
    <div className="px-3.5 py-3 space-y-3.5 max-w-lg mx-auto pb-20 text-left">
      <div className="flex items-center space-x-2">
        <button
          onClick={onBack}
          className={`p-2 rounded-xl border transition-all active:scale-95 cursor-pointer ${
            theme === "light"
              ? "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              : "bg-slate-900 border-slate-800 text-slate-300 hover:text-white"
          }`}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
        <div>
          <h2 className="font-display font-black text-xs tracking-wide uppercase">
            {lang === "sw" ? "Historia Kamili ya Miamala" : lang === "fr" ? "Historique des Transactions" : "Full Transaction History"}
          </h2>
          <p className="text-[9px] text-slate-500">
            {lang === "sw" ? "Orodha yote ya miamala yako" : "Complete list of your account activity"}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
        {[
          { key: "ALL", label: lang === "sw" ? "Yote" : "All" },
          { key: "DEPOSIT", label: lang === "sw" ? "Kuweka" : "Deposits" },
          { key: "WITHDRAW", label: lang === "sw" ? "Kutoa" : "Withdrawals" },
          { key: "BET_WIN", label: lang === "sw" ? "Ushindi" : "Wins" },
          { key: "BET_PLACE", label: lang === "sw" ? "Kamari" : "Bets" },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setFilter(item.key as any)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold shrink-0 transition-all cursor-pointer border ${
              filter === item.key
                ? "bg-indigo-600 text-white border-indigo-500"
                : theme === "light"
                  ? "bg-white text-slate-600 border-slate-200"
                  : "bg-slate-900 text-slate-400 border-slate-800"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className={`rounded-xl border divide-y overflow-hidden ${cardBg}`}>
        {filtered.length === 0 ? (
          <p className="p-4 text-xs text-slate-500 text-center">
            {lang === "sw" ? "Hakuna miamala katika kategoria hii." : "No transactions found."}
          </p>
        ) : (
          filtered.map((t) => {
            const isProfit = t.type === "DEPOSIT" || t.type === "BET_WIN";
            return (
              <div key={t.id} className="p-3 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2.5">
                  <div
                    className={`p-1.5 rounded-lg border ${
                      isProfit
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                    }`}
                  >
                    {t.type === "DEPOSIT" && <ArrowDownLeft className="w-3.5 h-3.5" />}
                    {t.type === "WITHDRAW" && <ArrowUpRight className="w-3.5 h-3.5" />}
                    {t.type === "BET_PLACE" && <Coins className="w-3.5 h-3.5" />}
                    {t.type === "BET_WIN" && <Sparkles className="w-3.5 h-3.5" />}
                    {t.type === "UPGRADE_PRO" && <ShieldCheck className="w-3.5 h-3.5" />}
                  </div>
                  <div>
                    <p className="font-bold">{t.description}</p>
                    <p className="text-[9px] text-slate-500 mt-0.5">
                      {(() => {
                        const d = new Date(t.date);
                        return isNaN(d.getTime())
                          ? t.date
                          : d.toLocaleString(lang === "sw" ? "sw-TZ" : lang === "fr" ? "fr-FR" : "en-US", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            });
                      })()}
                    </p>
                  </div>
                </div>

                <span className={`font-mono font-black text-xs ${isProfit ? "text-emerald-400" : "text-blue-400"}`}>
                  {isProfit ? "+" : "-"} {t.amount.toLocaleString()} FBU
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
