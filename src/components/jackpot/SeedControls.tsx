import React, { useState } from "react";
import { ShieldCheck, RefreshCw, Copy, Check, Lock } from "lucide-react";
import { generateRandomSeed } from "@/lib/jackpotCrypto";

interface SeedControlsProps {
  commitHash: string;
  clientSeed: string;
  onClientSeedChange: (seed: string) => void;
  nonce: number;
  isSpinning: boolean;
  onOpenVerifier: () => void;
}

export const SeedControls: React.FC<SeedControlsProps> = ({
  commitHash,
  clientSeed,
  onClientSeedChange,
  nonce,
  isSpinning,
  onOpenVerifier,
}) => {
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedSeed, setCopiedSeed] = useState(false);

  const copyToClipboard = async (text: string, which: "hash" | "seed") => {
    try {
      await navigator.clipboard.writeText(text);
      if (which === "hash") {
        setCopiedHash(true);
        setTimeout(() => setCopiedHash(false), 1500);
      } else {
        setCopiedSeed(true);
        setTimeout(() => setCopiedSeed(false), 1500);
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-lg">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Provably Fair
          </span>
        </div>
        <button
          onClick={onOpenVerifier}
          className="text-[11px] text-cyan-400 hover:text-cyan-300 underline font-semibold transition-colors"
        >
          Open Verifier
        </button>
      </div>

      {/* Server seed commitment hash */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-medium text-slate-300 flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-slate-400" />
            Server Seed Commit (SHA-256)
          </label>
          <span className="text-[10px] text-slate-500">Revealed after spin</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex-1 bg-slate-950/90 border border-slate-800 rounded-lg px-3 py-2 font-mono text-[10px] text-slate-300 truncate">
            {commitHash || "Generating..."}
          </div>
          <button
            onClick={() => copyToClipboard(commitHash, "hash")}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            {copiedHash ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Client seed */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-medium text-slate-300">Your Client Seed</label>
          <span className="text-[10px] text-slate-400 font-mono">
            Nonce: <span className="text-cyan-400 font-bold">{nonce}</span>
          </span>
        </div>
        <div className="flex gap-1.5">
          <div className="relative flex-1">
            <input
              value={clientSeed}
              onChange={(e) => onClientSeedChange(e.target.value)}
              disabled={isSpinning}
              placeholder="Enter custom seed..."
              className="w-full pr-8 pl-3 py-2 text-[11px] text-slate-100 bg-slate-950/90 border border-slate-800 rounded-lg outline-none focus:border-amber-500/50 transition-colors disabled:opacity-60"
            />
            <button
              onClick={() => copyToClipboard(clientSeed, "seed")}
              className="absolute right-2 top-2 text-slate-400 hover:text-white transition-colors"
            >
              {copiedSeed ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          <button
            onClick={() => onClientSeedChange(generateRandomSeed(16))}
            disabled={isSpinning}
            className="px-2.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors disabled:opacity-60"
            title="Randomize seed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSpinning ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>
    </div>
  );
};
