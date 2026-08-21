import React, { useEffect } from "react";
import { Trophy, ShieldCheck } from "lucide-react";
import { WheelSegment } from "@/types/jackpot";

interface ResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  segment: WheelSegment | null;
  winningNumber?: number;
  userSelectedNumbers?: number[];
  isUserWinner?: boolean;
  earnedPoints?: number;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  commitHash: string;
  onOpenVerifier: () => void;
  onSpinAgain: () => void;
}

export const ResultModal: React.FC<ResultModalProps> = ({
  isOpen,
  onClose,
  segment,
  winningNumber = 1,
  userSelectedNumbers = [],
  isUserWinner = false,
  earnedPoints = 0,
  serverSeed,
  clientSeed,
  nonce,
  onOpenVerifier,
  onSpinAgain,
}) => {
  useEffect(() => {
    if (isOpen && segment) {
      import("canvas-confetti")
        .then(({ default: confetti }) => {
          confetti({
            particleCount: isUserWinner ? 120 : 40,
            spread: 70,
            origin: { y: 0.6 },
            colors: ["#f59e0b", "#3b82f6", "#10b981", "#ec4899"],
          });
        })
        .catch(() => {});
    }
  }, [isOpen, segment, isUserWinner]);

  if (!isOpen || !segment) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl text-slate-100 text-center p-6 space-y-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-14 h-14 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-950/50">
            <Trophy className="w-7 h-7 animate-bounce" />
          </div>
          <h2 className="text-xl font-black tracking-wide text-amber-300">MATOKEO YA MZUNGUKO</h2>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-950 to-slate-900 border border-amber-500/30 space-y-2 shadow-inner">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
            Namba ya Ushindi (1-300)
          </div>
          <div className="text-5xl font-black text-amber-400 drop-shadow-lg">#{winningNumber}</div>
          <div className="flex items-center justify-center gap-2 pt-1">
            <span
              className="w-3.5 h-3.5 rounded-full border border-white/40"
              style={{ backgroundColor: segment.color }}
            />
            <span className="font-bold text-slate-200 text-sm">Rangi: {segment.label}</span>
            <span className="px-2 py-0.5 rounded text-xs font-black bg-amber-500 text-slate-950">
              +{segment.points} PTS
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 text-left space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Namba Ulizochagua:</span>
            <div className="flex gap-1 flex-wrap justify-end">
              {userSelectedNumbers.length > 0 ? (
                userSelectedNumbers.map((n) => (
                  <span
                    key={n}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${n === winningNumber ? "bg-emerald-500 text-slate-950 animate-pulse" : "bg-slate-800 text-slate-300"}`}
                  >
                    {n}
                  </span>
                ))
              ) : (
                <span className="text-slate-500">—</span>
              )}
            </div>
          </div>

          <div
            className={`text-center py-2 rounded-lg font-black text-sm ${isUserWinner ? "bg-emerald-950/80 text-emerald-400 border border-emerald-500/40" : "bg-rose-950/50 text-rose-400 border border-rose-500/30"}`}
          >
            {isUserWinner
              ? `🏆 UMESHINDA +${earnedPoints} POINTI!`
              : "Ujaribu tena — bahati inakusubiri!"}
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[10px] font-mono text-slate-500 text-left space-y-0.5">
          <div>
            Server: <span className="text-slate-400">{serverSeed.substring(0, 20)}...</span>
          </div>
          <div>
            Client: <span className="text-slate-400">{clientSeed.substring(0, 20)}...</span>
          </div>
          <div>
            Nonce: <span className="text-cyan-400">{nonce}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onOpenVerifier}
            className="flex-1 py-2.5 rounded-xl border border-cyan-500/40 text-cyan-400 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-cyan-950/50 transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Thibitisha
          </button>
          <button
            onClick={() => {
              onClose();
              onSpinAgain();
            }}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black text-xs font-black hover:brightness-110 transition-all"
          >
            ZUNGUKA TENA
          </button>
        </div>
      </div>
    </div>
  );
};
