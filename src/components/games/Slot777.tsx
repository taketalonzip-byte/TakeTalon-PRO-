import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  Zap,
  Sparkles,
  Trophy,
  ShieldCheck,
  RefreshCw,
  Volume2,
  VolumeX,
} from "lucide-react";
import confetti from "canvas-confetti";
import {
  SLOT_SYMBOLS,
  calculateSlotOutcome,
  formatFBU,
  computeCombinedHash,
} from "@/lib/casino/provablyFair";
import { SlotSymbol, BetHistoryItem } from "@/types/casino";
import { sound } from "@/lib/casino/sound";

interface Slot777Props {
  balanceFBU: number;
  onPlaceBet: (
    amountFBU: number,
    payoutFBU: number,
    details: string,
    gameId: "slot777",
    isWin: boolean,
    hash: string,
    multiplier: number,
  ) => void;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  incrementNonce: () => void;
  onOpenVerifier: () => void;
}

export const Slot777: React.FC<Slot777Props> = ({
  balanceFBU,
  onPlaceBet,
  serverSeed,
  serverSeedHash,
  clientSeed,
  nonce,
  incrementNonce,
  onOpenVerifier,
}) => {
  const [betFBU, setBetFBU] = useState<number>(1000);
  const [reels, setReels] = useState<SlotSymbol[]>([
    SLOT_SYMBOLS[0],
    SLOT_SYMBOLS[0],
    SLOT_SYMBOLS[0],
    SLOT_SYMBOLS[0],
  ]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [autoSpin, setAutoSpin] = useState(false);
  const [autoSpinSpeed, setAutoSpinSpeed] = useState<"normal" | "fast" | "turbo">("normal");
  const [lastPayoutFBU, setLastPayoutFBU] = useState<number | null>(null);
  const [lastMultiplier, setLastMultiplier] = useState<number | null>(null);
  const [isWin, setIsWin] = useState<boolean | null>(null);
  const [hashResult, setHashResult] = useState<string>("");
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const autoSpinRef = useRef(autoSpin);
  autoSpinRef.current = autoSpin;

  const toggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    sound.setMuted(next);
  };

  const handleSpin = () => {
    if (isSpinning) return;
    if (balanceFBU < betFBU) {
      setAutoSpin(false);
      return;
    }

    sound.playClick();
    setIsSpinning(true);
    setLastPayoutFBU(null);
    setIsWin(null);

    // Compute SHA-256 hash
    const combinedHash = computeCombinedHash(serverSeed, clientSeed, nonce);
    setHashResult(combinedHash);
    const outcome = calculateSlotOutcome(combinedHash);

    // 5 to 6 seconds duration for normal spin as requested by user (5-7 seconds)
    const duration = autoSpinSpeed === "turbo" ? 1200 : autoSpinSpeed === "fast" ? 2500 : 5500;

    let frame = 0;
    const interval = setInterval(() => {
      setReels([
        SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
        SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
        SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
        SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
      ]);
      if (frame % 2 === 0) {
        sound.playReelTick();
      }
      frame++;
    }, 70);

    setTimeout(() => {
      clearInterval(interval);
      setReels(outcome.symbols);
      setIsSpinning(false);
      sound.playReelStop();

      const payout = Math.round(betFBU * outcome.multiplier);
      const won = outcome.multiplier > 0;
      setLastPayoutFBU(payout);
      setLastMultiplier(outcome.multiplier);
      setIsWin(won);

      if (won) {
        if (outcome.isJackpot || outcome.multiplier >= 15) {
          sound.playJackpotFanfare();
          confetti({
            particleCount: 100,
            spread: 80,
            origin: { y: 0.6 },
          });
        } else {
          sound.playWinFanfare();
        }
      }

      onPlaceBet(
        betFBU,
        payout,
        `Reels: [${outcome.symbols.map((s) => s.symbol).join(" ")}] Multiplier: ${outcome.multiplier}x`,
        "slot777",
        won,
        combinedHash,
        outcome.multiplier,
      );

      incrementNonce();
    }, duration);
  };

  // Auto spin loop
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (autoSpin && !isSpinning && balanceFBU >= betFBU) {
      const delay = autoSpinSpeed === "turbo" ? 200 : autoSpinSpeed === "fast" ? 500 : 900;
      timer = setTimeout(() => {
        if (autoSpinRef.current) {
          handleSpin();
        }
      }, delay);
    } else if (autoSpin && balanceFBU < betFBU) {
      setAutoSpin(false);
    }
    return () => clearTimeout(timer);
  }, [autoSpin, isSpinning, balanceFBU, betFBU]);

  const adjustBet = (amount: number) => {
    setBetFBU((prev) => Math.max(100, Math.min(balanceFBU, prev + amount)));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Game Header Banner */}
      <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-xl">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-black bg-gradient-to-r from-yellow-300 via-amber-400 to-amber-600 bg-clip-text text-transparent">
                7777 VEGAS SLOT
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-[10px] font-bold">
                AUTO-PLAY READY
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              4-Reel Automated Casino Slot Machine powered by SHA-256 Provably Fair Seeds
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleSound}
              className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 font-mono transition-colors ${
                isMuted
                  ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                  : "bg-amber-500/10 text-amber-300 border-amber-500/30"
              }`}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              <span>{isMuted ? "MUTED" : "AUDIO"}</span>
            </button>
            <button
              onClick={onOpenVerifier}
              className="flex items-center gap-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-lg px-2.5 py-1 text-[10px] font-mono transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Nonce #{nonce}</span>
            </button>
          </div>
        </div>

        {/* The 4 Slot Reels Display */}
        <div className="my-6 bg-slate-950 p-4 sm:p-6 rounded-2xl border-2 border-amber-500/40 shadow-inner relative">
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-amber-500/10 pointer-events-none"></div>

          <div className="grid grid-cols-4 gap-2 sm:gap-4 max-w-lg mx-auto">
            {reels.map((symbol, idx) => (
              <div
                key={idx}
                className={`relative flex flex-col items-center justify-center h-24 sm:h-32 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-2 rounded-xl transition-all shadow-lg ${
                  isSpinning
                    ? "border-amber-500/50 scale-[0.98] blur-[0.5px]"
                    : isWin
                      ? "border-amber-400 bg-amber-500/10 shadow-amber-500/20"
                      : "border-slate-800"
                }`}
              >
                <div className="text-3xl sm:text-5xl select-none transform hover:scale-110 transition-transform">
                  {symbol.symbol}
                </div>
                <div
                  className="mt-2 text-[9px] font-bold tracking-wider uppercase font-mono"
                  style={{ color: symbol.color }}
                >
                  {symbol.name}
                </div>
              </div>
            ))}
          </div>

          {/* Outcome Status Overlay */}
          {lastPayoutFBU !== null && !isSpinning && (
            <div className="mt-4 text-center animate-fade-in">
              {lastPayoutFBU > 0 ? (
                <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 px-4 py-1.5 rounded-full font-mono text-xs font-bold animate-bounce">
                  <Trophy className="w-4 h-4 text-emerald-400" />
                  WIN! +{formatFBU(lastPayoutFBU)} ({lastMultiplier}x)
                </div>
              ) : (
                <div className="inline-block bg-slate-900 border border-slate-800 text-slate-400 px-3 py-1 rounded-full font-mono text-[11px]">
                  No Match - Try Next Spin
                </div>
              )}
            </div>
          )}
        </div>

        {/* Controls & Auto Play */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-slate-950/60 p-3 sm:p-4 rounded-xl border border-slate-800">
          {/* Bet Controls */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Kiasi cha Dau (FBU) - Max 100,000 FBU
              </label>
              <span className="text-[10px] font-mono text-amber-400 font-bold">
                {formatFBU(betFBU)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mb-2">
              <input
                type="number"
                min="100"
                max={Math.min(balanceFBU, 100000)}
                value={betFBU}
                onChange={(e) =>
                  setBetFBU(Math.max(100, Math.min(100000, parseInt(e.target.value) || 100)))
                }
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 font-mono text-xs font-bold text-amber-300 focus:outline-none focus:border-amber-500"
              />
            </div>
            {/* Quick Bet Presets: 1000, 2000, 5000, 50000, 100000 FBU */}
            <div className="flex flex-wrap gap-1">
              {[1000, 2000, 5000, 50000, 100000].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setBetFBU(Math.min(balanceFBU, preset))}
                  className={`px-2 py-1 rounded text-[10px] font-mono font-extrabold border transition-all ${
                    betFBU === preset
                      ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20"
                      : "bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700/80"
                  }`}
                >
                  {preset >= 1000 ? `${preset / 1000}K` : preset}
                </button>
              ))}
              <button
                onClick={() => setBetFBU(Math.min(balanceFBU, 100000))}
                className="px-2 py-1 rounded text-[10px] font-mono font-extrabold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40"
              >
                MAX (100K)
              </button>
            </div>
          </div>

          {/* Spin & Auto Spin Buttons */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            <button
              onClick={handleSpin}
              disabled={isSpinning || balanceFBU < betFBU}
              className={`flex-1 py-3 px-4 rounded-xl font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all ${
                isSpinning
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/25 active:scale-95"
              }`}
            >
              <Zap className="w-4 h-4 fill-current" />
              {isSpinning ? "SPINNING REELS..." : "SPIN SLOT"}
            </button>

            <button
              onClick={() => setAutoSpin(!autoSpin)}
              className={`py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all border ${
                autoSpin
                  ? "bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse"
                  : "bg-slate-800 hover:bg-slate-700 text-emerald-400 border-emerald-500/30"
              }`}
            >
              {autoSpin ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {autoSpin ? "STOP AUTO" : "AUTO SPIN"}
            </button>
          </div>
        </div>

        {/* Speed Controls */}
        <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400 font-mono">
          <div className="flex items-center gap-2">
            <span>Spin Speed:</span>
            <button
              onClick={() => setAutoSpinSpeed("normal")}
              className={`px-2 py-0.5 rounded ${autoSpinSpeed === "normal" ? "bg-amber-500 text-slate-950 font-bold" : "bg-slate-800"}`}
            >
              1X Normal
            </button>
            <button
              onClick={() => setAutoSpinSpeed("fast")}
              className={`px-2 py-0.5 rounded ${autoSpinSpeed === "fast" ? "bg-amber-500 text-slate-950 font-bold" : "bg-slate-800"}`}
            >
              2X Fast
            </button>
            <button
              onClick={() => setAutoSpinSpeed("turbo")}
              className={`px-2 py-0.5 rounded ${autoSpinSpeed === "turbo" ? "bg-amber-500 text-slate-950 font-bold" : "bg-slate-800"}`}
            >
              🚀 Turbo
            </button>
          </div>

          <div className="truncate max-w-[200px] text-[9px] text-slate-500" title={serverSeedHash}>
            Hash: {serverSeedHash.substring(0, 16)}...
          </div>
        </div>
      </div>

      {/* Paytable Guide */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-[10px]">
        <div className="font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1">
          <Trophy className="w-3.5 h-3.5 text-amber-400" /> 7777 Paytable Multipliers
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SLOT_SYMBOLS.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-2 bg-slate-950 p-2 rounded border border-slate-800/80"
            >
              <span className="text-xl">{s.symbol}</span>
              <div>
                <div className="font-bold text-slate-200">{s.name}</div>
                <div className="text-amber-400 font-mono">
                  4x = {s.multiplier * 5}x | 3x = {s.multiplier * 2}x
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
