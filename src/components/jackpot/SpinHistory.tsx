import React from "react";
import { History, ShieldCheck } from "lucide-react";
import { SpinHistoryRecord } from "@/types/jackpot";

interface SpinHistoryProps {
  history: SpinHistoryRecord[];
  onVerifyRecord: (record: SpinHistoryRecord) => void;
}

export const SpinHistory: React.FC<SpinHistoryProps> = ({ history, onVerifyRecord }) => {
  if (history.length === 0) return null;

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg backdrop-blur-md space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <History className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Spin History ({history.length})
          </span>
        </div>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        {history.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs"
          >
            <div className="flex items-center space-x-3">
              <span
                className="px-2 py-0.5 rounded font-bold text-white text-[11px] border"
                style={{
                  backgroundColor: `${item.segment.color}30`,
                  borderColor: item.segment.color,
                }}
              >
                {item.segment.label}
              </span>
              <span className="text-[11px] text-slate-400">
                #{item.winningNumber} · Nonce: <span className="text-slate-200">{item.nonce}</span>
              </span>
            </div>
            <button
              onClick={() => onVerifyRecord(item)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-cyan-400 hover:text-cyan-300 hover:bg-slate-800/80 transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Verify
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
