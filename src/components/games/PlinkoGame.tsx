import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  Zap,
  ShieldCheck,
  Trophy,
  Sparkles,
  Layers,
  ArrowDown,
  Flame,
  AlertTriangle,
  Volume2,
  VolumeX,
} from "lucide-react";
import confetti from "canvas-confetti";
import {
  calculatePlinkoPath,
  PLINKO_RISK_MULTIPLIERS,
  PlinkoRisk,
  computeCombinedHash,
  formatFBU,
} from "@/lib/casino/provablyFair";
import { sound } from "@/lib/casino/sound";

interface PlinkoGameProps {
  balanceFBU: number;
  onPlaceBet: (
    amountFBU: number,
    payoutFBU: number,
    details: string,
    gameId: "plinko",
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

export const PlinkoGame: React.FC<PlinkoGameProps> = ({
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
  const [risk, setRisk] = useState<PlinkoRisk>("medium");
  const [isDropping, setIsDropping] = useState<boolean>(false);
  const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);
  const [autoDrop, setAutoDrop] = useState<boolean>(false);
  const [landedBucket, setLandedBucket] = useState<number | null>(null);
  const [lastMultiplier, setLastMultiplier] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const autoDropRef = useRef(autoDrop);
  autoDropRef.current = autoDrop;

  const currentMultipliers = PLINKO_RISK_MULTIPLIERS[risk];

  const toggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    sound.setMuted(next);
  };

  const handleDropBall = () => {
    if (isDropping || balanceFBU < betFBU) {
      if (balanceFBU < betFBU) setAutoDrop(false);
      return;
    }

    sound.playClick();
    setIsDropping(true);
    setLandedBucket(null);
    setLastMultiplier(null);
    setActiveRowIndex(0);

    const combinedHash = computeCombinedHash(serverSeed, clientSeed, nonce);
    const { directions, bucketIndex, multiplier } = calculatePlinkoPath(combinedHash, 8, risk);

    // Bounce step timer: 8 rows over ~5.2 seconds (650ms per row)
    let step = 0;
    const bounceInterval = setInterval(() => {
      step++;
      if (step < 8) {
        setActiveRowIndex(step);
        sound.playPlinkoBounce();
      } else {
        clearInterval(bounceInterval);
      }
    }, 650);

    setTimeout(() => {
      setActiveRowIndex(null);
      setLandedBucket(bucketIndex);
      setLastMultiplier(multiplier);
      setIsDropping(false);

      const payout = Math.round(betFBU * multiplier);
      const won = multiplier >= 1.0;

      if (won) {
        if (multiplier >= 100) {
          sound.playJackpotFanfare();
        } else if (multiplier >= 2) {
          sound.playWinFanfare();
        } else {
          sound.playClick();
        }
        if (multiplier >= 10) {
          confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
        }
      } else {
        sound.playBombExplosion();
      }

      onPlaceBet(
        betFBU,
        payout,
        `Plinko [${risk.toUpperCase()}] -> Bucket #${bucketIndex} (${multiplier}x)`,
        "plinko",
        won,
        combinedHash,
        multiplier,
      );

      incrementNonce();
    }, 5500);
  };

  // Auto drop loop
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (autoDrop && !isDropping && balanceFBU >= betFBU) {
      timer = setTimeout(() => {
        if (autoDropRef.current) {
          handleDropBall();
        }
      }, 600);
    }
    return () => clearTimeout(timer);
  }, [autoDrop, isDropping, balanceFBU, betFBU]);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Game Header */}
      <div className="bg-slate-900/90 border border-purple-500/30 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-black bg-gradient-to-r from-purple-300 via-fuchsia-400 to-amber-300 bg-clip-text text-transparent">
                4. PLINKO PYRAMID
              </span>
              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 font-mono text-[10px] font-bold">
                DANGER DYNAMICS
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              8-Row Plinko pyramid with SHA-256 peg trajectory and up to 1000x Extreme Danger Mode.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleSound}
              className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 font-mono transition-colors ${
                isMuted
                  ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                  : "bg-purple-500/10 text-purple-300 border-purple-500/30"
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

        {/* Danger / Risk Mode Selector */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-950 rounded-xl border border-slate-800">
          <div className="text-[10px] font-mono font-bold text-slate-400 flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-amber-400" /> DANGER LEVEL:
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setRisk("low")}
              className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold transition-all border ${
                risk === "low"
                  ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20"
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
              }`}
            >
              LOW RISK (Max 5.6x)
            </button>
            <button
              onClick={() => setRisk("medium")}
              className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold transition-all border ${
                risk === "medium"
                  ? "bg-purple-500 text-slate-950 border-purple-400 shadow-md shadow-purple-500/20"
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
              }`}
            >
              MEDIUM RISK (Max 29x)
            </button>
            <button
              onClick={() => setRisk("extreme")}
              className={`px-3 py-1 rounded-lg text-[10px] font-mono font-black transition-all border flex items-center gap-1 ${
                risk === "extreme"
                  ? "bg-gradient-to-r from-rose-500 to-amber-500 text-slate-950 border-rose-400 shadow-lg shadow-rose-500/30 animate-pulse"
                  : "bg-slate-900 text-rose-400 border-rose-500/40 hover:bg-rose-500/10"
              }`}
            >
              <AlertTriangle className="w-3 h-3" /> EXTREME DANGER (Max 1000x! 🔥)
            </button>
          </div>
        </div>

        {/* Plinko Pyramid Visualization */}
        <div className="my-5 bg-slate-950 p-4 sm:p-6 rounded-2xl border border-slate-800 shadow-2xl flex flex-col items-center relative overflow-hidden">
          {risk === "extreme" && (
            <div className="absolute top-2 right-3 text-[9px] font-mono font-bold text-rose-400/80 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-full">
              🔥 EXTREME VOLATILITY ACTIVE
            </div>
          )}

          <div className="space-y-3 w-full max-w-sm">
            {/* Rows of Pegs */}
            {[2, 3, 4, 5, 6, 7, 8, 9].map((pegCount, rowIndex) => (
              <div key={rowIndex} className="flex justify-center items-center gap-4 sm:gap-6">
                {Array.from({ length: pegCount }).map((_, pegIndex) => {
                  const isActiveRow = activeRowIndex === rowIndex;
                  return (
                    <div
                      key={pegIndex}
                      className={`w-2.5 h-2.5 rounded-full shadow-sm transition-all duration-300 ${
                        isActiveRow
                          ? "bg-amber-300 border-2 border-amber-400 scale-125 shadow-lg shadow-amber-400/80 animate-ping"
                          : "bg-slate-700 border border-slate-600"
                      }`}
                    />
                  );
                })}
              </div>
            ))}

            {/* Bottom Multiplier Buckets */}
            <div className="grid grid-cols-9 gap-1 mt-4 pt-3 border-t border-slate-800 font-mono text-center">
              {currentMultipliers.map((mult, idx) => {
                const isLanded = landedBucket === idx;
                const isExtreme = mult >= 100;
                const isHigh = mult >= 10;
                const isMedium = mult >= 1.5;

                return (
                  <div
                    key={idx}
                    className={`py-2 px-0.5 rounded-lg text-[8px] sm:text-[10px] font-extrabold transition-all ${
                      isLanded
                        ? "bg-amber-400 text-slate-950 scale-110 shadow-lg shadow-amber-500/50 animate-bounce"
                        : isExtreme
                          ? "bg-gradient-to-b from-rose-500 to-amber-500 text-slate-950 border border-amber-300 font-black shadow-md shadow-rose-500/20"
                          : isHigh
                            ? "bg-rose-500/20 border border-rose-500/40 text-rose-300"
                            : isMedium
                              ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300"
                              : "bg-slate-900 border border-slate-800 text-slate-500"
                    }`}
                  >
                    {mult}x
                  </div>
                );
              })}
            </div>
          </div>

          {lastMultiplier !== null && (
            <div className="mt-4 text-center">
              <span className="px-3 py-1.5 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-lg">
                Landed: {lastMultiplier}x Multiplier (+
                {formatFBU(Math.round(betFBU * lastMultiplier))})
              </span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-slate-950/60 p-3 sm:p-4 rounded-xl border border-slate-800">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Kiasi cha Dau (FBU) - Max 100,000 FBU
              </label>
              <span className="text-[10px] font-mono text-purple-400 font-bold">
                {formatFBU(betFBU)}
              </span>
            </div>
            <div className="mb-2">
              <input
                type="number"
                min="100"
                max={Math.min(balanceFBU, 100000)}
                value={betFBU}
                onChange={(e) =>
                  setBetFBU(Math.max(100, Math.min(100000, parseInt(e.target.value) || 100)))
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 font-mono text-xs font-bold text-purple-300 focus:outline-none focus:border-purple-500"
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
                      ? "bg-purple-500 text-slate-950 border-purple-400 shadow-md shadow-purple-500/20"
                      : "bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700/80"
                  }`}
                >
                  {preset >= 1000 ? `${preset / 1000}K` : preset}
                </button>
              ))}
              <button
                onClick={() => setBetFBU(Math.min(balanceFBU, 100000))}
                className="px-2 py-1 rounded text-[10px] font-mono font-extrabold bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40"
              >
                MAX (100K)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDropBall}
              disabled={isDropping || balanceFBU < betFBU}
              className={`flex-1 py-3 px-4 rounded-xl font-extrabold text-xs uppercase flex items-center justify-center gap-2 shadow-lg transition-all ${
                isDropping
                  ? "bg-slate-800 text-slate-500"
                  : risk === "extreme"
                    ? "bg-gradient-to-r from-rose-500 via-amber-400 to-rose-600 hover:from-rose-400 text-slate-950 shadow-rose-500/30"
                    : "bg-gradient-to-r from-purple-500 via-fuchsia-400 to-amber-400 hover:from-purple-400 text-slate-950"
              }`}
            >
              <ArrowDown className="w-4 h-4" />
              {isDropping ? "DROPPING BALL..." : "DROP PLINKO BALL"}
            </button>

            <button
              onClick={() => setAutoDrop(!autoDrop)}
              className={`py-3 px-3 rounded-xl font-bold text-xs uppercase flex items-center gap-1 border ${
                autoDrop
                  ? "bg-rose-500/20 text-rose-300 border-rose-500/50"
                  : "bg-slate-800 text-purple-400 border-purple-500/30"
              }`}
            >
              {autoDrop ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {autoDrop ? "STOP AUTO" : "AUTO DROP"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
