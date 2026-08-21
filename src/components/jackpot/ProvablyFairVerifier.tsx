import React, { useState, useEffect } from "react";
import { ShieldCheck, CheckCircle2, XCircle, Code, Calculator } from "lucide-react";
import { WheelSegment } from "@/types/jackpot";
import { verifyProvablyFair } from "@/lib/jackpotCrypto";

interface ProvablyFairVerifierProps {
  isOpen: boolean;
  onClose: () => void;
  segments: WheelSegment[];
  initialServerSeed?: string;
  initialClientSeed?: string;
  initialNonce?: number;
  initialCommitHash?: string;
  initialSegmentIndex?: number;
}

export const ProvablyFairVerifier: React.FC<ProvablyFairVerifierProps> = ({
  isOpen,
  onClose,
  segments,
  initialServerSeed = "",
  initialClientSeed = "",
  initialNonce = 1,
  initialCommitHash = "",
  initialSegmentIndex = 0,
}) => {
  const [serverSeed, setServerSeed] = useState(initialServerSeed);
  const [clientSeed, setClientSeed] = useState(initialClientSeed);
  const [nonce, setNonce] = useState(initialNonce);
  const [commitHash, setCommitHash] = useState(initialCommitHash);
  const [verificationResult, setVerificationResult] = useState<{
    isValidCommit: boolean;
    isResultMatched: boolean;
    calculatedIndex: number;
    calculatedCommit: string;
    fullHash: string;
    hexSub: string;
    intVal: number;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setServerSeed(initialServerSeed);
      setClientSeed(initialClientSeed);
      setNonce(initialNonce);
      setCommitHash(initialCommitHash);
      setVerificationResult(null);
    }
  }, [isOpen, initialServerSeed, initialClientSeed, initialNonce, initialCommitHash]);

  useEffect(() => {
    if (serverSeed && clientSeed && isOpen) {
      verifyProvablyFair(
        serverSeed,
        clientSeed,
        nonce,
        commitHash,
        segments.length,
        initialSegmentIndex,
      )
        .then(setVerificationResult)
        .catch(console.warn);
    }
  }, [serverSeed, clientSeed, nonce, commitHash, isOpen]);

  const winningSegment = verificationResult ? segments[verificationResult.calculatedIndex] : null;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-blue-600/20 text-cyan-400 border border-blue-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Provably Fair Verifier</h2>
              <p className="text-slate-400 text-xs">Verify SHA-256 results independently</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Inputs */}
          <div className="space-y-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800/80">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Code className="w-3.5 h-3.5 text-cyan-400" /> Game Input Seeds
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Revealed Server Seed</label>
                <input
                  value={serverSeed}
                  onChange={(e) => setServerSeed(e.target.value)}
                  placeholder="Paste server seed..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 text-[11px] font-mono outline-none focus:border-amber-500/50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Client Seed</label>
                <input
                  value={clientSeed}
                  onChange={(e) => setClientSeed(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 text-[11px] font-mono outline-none focus:border-amber-500/50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Nonce</label>
                <input
                  type="number"
                  value={nonce}
                  onChange={(e) => setNonce(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 text-[11px] font-mono outline-none focus:border-amber-500/50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Commit Hash</label>
                <input
                  value={commitHash}
                  onChange={(e) => setCommitHash(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 text-[11px] font-mono outline-none focus:border-amber-500/50"
                />
              </div>
            </div>
          </div>

          {/* Results */}
          {verificationResult && (
            <div className="space-y-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800/80">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5 text-amber-400" /> Verification Result
              </h4>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div
                  className={`p-3 rounded-xl border flex items-center gap-2 ${verificationResult.isValidCommit ? "bg-emerald-950/50 border-emerald-500/30 text-emerald-400" : "bg-rose-950/50 border-rose-500/30 text-rose-400"}`}
                >
                  {verificationResult.isValidCommit ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span className="font-bold">
                    {verificationResult.isValidCommit ? "Valid Commit" : "Invalid Commit"}
                  </span>
                </div>
                <div
                  className={`p-3 rounded-xl border flex items-center gap-2 ${verificationResult.isResultMatched ? "bg-emerald-950/50 border-emerald-500/30 text-emerald-400" : "bg-rose-950/50 border-rose-500/30 text-rose-400"}`}
                >
                  {verificationResult.isResultMatched ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span className="font-bold">
                    {verificationResult.isResultMatched ? "Result Matched" : "Result Mismatch"}
                  </span>
                </div>
              </div>

              {winningSegment && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs">
                  <span
                    className="w-3 h-3 rounded-full border border-white/30 shrink-0"
                    style={{ backgroundColor: winningSegment.color }}
                  />
                  <span className="text-slate-200 font-bold">
                    Calculated Segment: {winningSegment.label}
                  </span>
                  <span className="ml-auto text-amber-400 font-black">
                    +{winningSegment.points} PTS
                  </span>
                </div>
              )}

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 font-mono text-[11px] text-slate-300">
                <div className="text-slate-400 font-sans text-xs font-bold uppercase tracking-wider mb-2">
                  Math Steps
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between border-b border-slate-800/60 pb-1.5 gap-2 flex-wrap">
                    <span className="text-slate-400">1. Input:</span>
                    <span className="text-cyan-300 break-all text-right">
                      {serverSeed}:{clientSeed}:{nonce}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/60 pb-1.5 gap-2 flex-wrap">
                    <span className="text-slate-400 shrink-0">2. SHA-256:</span>
                    <span className="text-slate-100 break-all text-right">
                      {verificationResult.fullHash}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                    <span className="text-slate-400">3. First 8 hex:</span>
                    <span className="text-amber-300 font-bold">{verificationResult.hexSub}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                    <span className="text-slate-400">4. Decimal:</span>
                    <span className="text-cyan-400">
                      {verificationResult.intVal.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-slate-400">5. % {segments.length}:</span>
                    <span className="text-emerald-400 font-bold">
                      = {verificationResult.calculatedIndex} ({winningSegment?.label})
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
