import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  Zap,
  ShieldCheck,
  Trophy,
  Dices,
  ArrowRightLeft,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
import confetti from "canvas-confetti";
import { calculateDiceRoll, computeCombinedHash, formatFBU } from "@/lib/casino/provablyFair";
import { sound } from "@/lib/casino/sound";

interface DiceGameProps {
  balanceFBU: number;
  onPlaceBet: (
    amountFBU: number,
    payoutFBU: number,
    details: string,
    gameId: "dice",
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

export const DiceGame: React.FC<DiceGameProps> = ({
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
  const [targetNumber, setTargetNumber] = useState<number>(50.0);
  const [isRollOver, setIsRollOver] = useState<boolean>(true);
  const [lastRoll, setLastRoll] = useState<number | null>(null);
  const [animatedDisplayVal, setAnimatedDisplayVal] = useState<number>(50.0);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [autoRoll, setAutoRoll] = useState<boolean>(false);
  const [lastWon, setLastWon] = useState<boolean | null>(null);
  const [lastHash, setLastHash] = useState<string>("");
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const autoRollRef = useRef(autoRoll);
  autoRollRef.current = autoRoll;

  // Win Probability & Multiplier Calculation (House edge ~1%)
  const winProbability = isRollOver
    ? Number((99.99 - targetNumber).toFixed(2))
    : Number(targetNumber.toFixed(2));
  const multiplier = winProbability > 0 ? Number((99 / winProbability).toFixed(2)) : 0;

  const toggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    sound.setMuted(next);
  };

  const handleRoll = () => {
    if (isRolling || balanceFBU < betFBU) {
      if (balanceFBU < betFBU) setAutoRoll(false);
      return;
    }

    sound.playClick();
    setIsRolling(true);
    setLastRoll(null);
    setLastWon(null);

    const combinedHash = computeCombinedHash(serverSeed, clientSeed, nonce);
    setLastHash(combinedHash);
    const rolledValue = calculateDiceRoll(combinedHash);

    // Roll suspense animation lasting 5.5 seconds
    let frame = 0;
    const interval = setInterval(() => {
      setAnimatedDisplayVal(Number((Math.random() * 99.99).toFixed(2)));
      if (frame % 2 === 0) {
        sound.playDiceRoll();
      }
      frame++;
    }, 60);

    setTimeout(() => {
      clearInterval(interval);
      setLastRoll(rolledValue);
      setAnimatedDisplayVal(rolledValue);
      setIsRolling(false);

      const won = isRollOver ? rolledValue > targetNumber : rolledValue < targetNumber;
      setLastWon(won);

      const payout = won ? Math.round(betFBU * multiplier) : 0;

      if (won) {
        if (multiplier >= 10) {
          sound.playJackpotFanfare();
        } else {
          sound.playWinFanfare();
        }
        if (multiplier >= 5) {
          confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
        }
      } else {
        sound.playBombExplosion();
      }

      const conditionText = isRollOver
        ? `Over ${targetNumber.toFixed(2)}`
        : `Under ${targetNumber.toFixed(2)}`;
      onPlaceBet(
        betFBU,
        payout,
        `Rolled ${rolledValue.toFixed(2)} (${conditionText})`,
        "dice",
        won,
        combinedHash,
        won ? multiplier : 0,
      );

      incrementNonce();
    }, 5500);
  };

  // Auto Roll loop
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (autoRoll && !isRolling && balanceFBU >= betFBU) {
      timer = setTimeout(() => {
        if (autoRollRef.current) {
          handleRoll();
        }
      }, 500);
    }
    return () => clearTimeout(timer);
  }, [autoRoll, isRolling, balanceFBU, betFBU]);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Game Header */}
      <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-black bg-gradient-to-r from-emerald-300 via-teal-400 to-amber-300 bg-clip-text text-transparent">
                3. PROVABLY FAIR DICE
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-[10px] font-bold">
                AUTOMATIQUE 0-99.99
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              High-speed precision dice roll with SHA-256 seed hashing & custom multiplier target.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleSound}
              className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 font-mono transition-colors ${
                isMuted
                  ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                  : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
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

        {/* Dice Result & Slider Stage */}
        <div className="my-6 bg-slate-950 p-5 rounded-2xl border border-slate-800 shadow-2xl relative">
          {/* Big Number Readout */}
          <div className="flex flex-col items-center justify-center py-4">
            <div
              className={`text-5xl sm:text-7xl font-mono font-black tracking-tight transition-all ${
                isRolling
                  ? "text-amber-400 animate-pulse"
                  : lastWon === true
                    ? "text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]"
                    : lastWon === false
                      ? "text-rose-500"
                      : "text-amber-400"
              }`}
            >
              {isRolling
                ? animatedDisplayVal.toFixed(2)
                : lastRoll !== null
                  ? lastRoll.toFixed(2)
                  : "50.00"}
            </div>

            <div className="mt-2 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
              {isRolling
                ? "GENERATING SHA-256 DIGEST..."
                : lastWon === true
                  ? `WIN! +${formatFBU(Math.round(betFBU * multiplier))}`
                  : lastWon === false
                    ? "MISSED TARGET"
                    : "READY TO ROLL"}
            </div>
          </div>

          {/* Target Slider */}
          <div className="mt-4 px-2 space-y-2">
            <div className="flex justify-between items-center text-[10px] font-mono font-bold">
              <span className="text-slate-400">0.00</span>
              <span className="text-amber-400">
                Target: {isRollOver ? "Over" : "Under"} {targetNumber.toFixed(2)}
              </span>
              <span className="text-slate-400">99.99</span>
            </div>

            <input
              type="range"
              min="2"
              max="98"
              step="0.5"
              value={targetNumber}
              onChange={(e) => setTargetNumber(parseFloat(e.target.value))}
              className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          {/* Stats Readout */}
          <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-slate-800/80 text-center font-mono">
            <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
              <div className="text-[9px] uppercase text-slate-400 font-bold">Win Chance</div>
              <div className="text-xs sm:text-sm font-black text-sky-400">{winProbability}%</div>
            </div>
            <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
              <div className="text-[9px] uppercase text-slate-400 font-bold">Multiplier</div>
              <div className="text-xs sm:text-sm font-black text-amber-400">{multiplier}x</div>
            </div>
            <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
              <div className="text-[9px] uppercase text-slate-400 font-bold">Est. Payout</div>
              <div className="text-xs sm:text-sm font-black text-emerald-400">
                {formatFBU(Math.round(betFBU * multiplier))}
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-slate-950/60 p-3 sm:p-4 rounded-xl border border-slate-800">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Bet Amount (FBU) - Max 100,000 FBU
              </label>
              <button
                onClick={() => setIsRollOver(!isRollOver)}
                className="text-[10px] font-mono text-amber-400 hover:underline flex items-center gap-1 font-bold"
              >
                <ArrowRightLeft className="w-3 h-3" />
                Switch to {isRollOver ? "Roll Under" : "Roll Over"}
              </button>
            </div>
            <input
              type="number"
              min="100"
              max={Math.min(balanceFBU, 100000)}
              value={betFBU}
              onChange={(e) =>
                setBetFBU(Math.max(100, Math.min(100000, parseInt(e.target.value) || 100)))
              }
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 font-mono text-xs font-bold text-emerald-300 focus:outline-none focus:border-emerald-500"
            />
            {/* Quick Bet Presets: 1000, 2000, 5000, 50000, 100000 FBU */}
            <div className="flex flex-wrap gap-1 pt-1">
              {[1000, 2000, 5000, 50000, 100000].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setBetFBU(Math.min(balanceFBU, preset))}
                  className={`px-2 py-1 rounded text-[10px] font-mono font-extrabold border transition-all ${
                    betFBU === preset
                      ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20"
                      : "bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700/80"
                  }`}
                >
                  {preset >= 1000 ? `${preset / 1000}K` : preset}
                </button>
              ))}
              <button
                onClick={() => setBetFBU(Math.min(balanceFBU, 100000))}
                className="px-2 py-1 rounded text-[10px] font-mono font-extrabold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40"
              >
                MAX (100K)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRoll}
              disabled={isRolling || balanceFBU < betFBU}
              className={`flex-1 py-3 px-4 rounded-xl font-extrabold text-xs uppercase flex items-center justify-center gap-2 shadow-lg transition-all ${
                isRolling
                  ? "bg-slate-800 text-slate-500"
                  : "bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 hover:from-emerald-400 text-slate-950"
              }`}
            >
              <Dices className="w-4 h-4" />
              {isRolling ? "ROLLING DICE..." : "ROLL DICE"}
            </button>

            <button
              onClick={() => setAutoRoll(!autoRoll)}
              className={`py-3 px-3 rounded-xl font-bold text-xs uppercase flex items-center gap-1 border ${
                autoRoll
                  ? "bg-rose-500/20 text-rose-300 border-rose-500/50"
                  : "bg-slate-800 text-emerald-400 border-emerald-500/30"
              }`}
            >
              {autoRoll ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {autoRoll ? "STOP AUTO" : "AUTO ROLL"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
