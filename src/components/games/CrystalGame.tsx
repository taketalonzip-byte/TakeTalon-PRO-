import React, { useState, useEffect, useRef } from "react";
import {
  Gem,
  Bomb,
  ShieldCheck,
  Play,
  Pause,
  Zap,
  RefreshCw,
  Trophy,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
import confetti from "canvas-confetti";
import { calculateCrystalGrid, computeCombinedHash, formatFBU } from "@/lib/casino/provablyFair";
import { sound } from "@/lib/casino/sound";

interface CrystalGameProps {
  balanceFBU: number;
  onPlaceBet: (
    amountFBU: number,
    payoutFBU: number,
    details: string,
    gameId: "crystal",
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

export const CrystalGame: React.FC<CrystalGameProps> = ({
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
  const [bombCount, setBombCount] = useState<number>(3);
  const [gameState, setGameState] = useState<"idle" | "playing" | "cashed_out" | "busted">("idle");
  const [revealedTiles, setRevealedTiles] = useState<boolean[]>(new Array(25).fill(false));
  const [currentGrid, setCurrentGrid] = useState<any[]>([]);
  const [currentMultiplier, setCurrentMultiplier] = useState<number>(1.0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [autoCashoutTarget, setAutoCashoutTarget] = useState<number>(2.0);
  const [lastHash, setLastHash] = useState<string>("");
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const autoPlayRef = useRef(autoPlay);
  autoPlayRef.current = autoPlay;

  const toggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    sound.setMuted(next);
  };

  const startNewGame = () => {
    if (balanceFBU < betFBU) {
      setAutoPlay(false);
      return;
    }

    sound.playClick();
    const combinedHash = computeCombinedHash(serverSeed, clientSeed, nonce);
    setLastHash(combinedHash);
    const grid = calculateCrystalGrid(combinedHash, bombCount);

    setCurrentGrid(grid);
    setRevealedTiles(new Array(25).fill(false));
    setCurrentMultiplier(1.0);
    setGameState("playing");

    if (autoPlay) {
      executeAutoExcavation(grid, combinedHash);
    }
  };

  const handleRevealTile = (index: number) => {
    if (gameState !== "playing" || revealedTiles[index]) return;

    const newRevealed = [...revealedTiles];
    newRevealed[index] = true;
    setRevealedTiles(newRevealed);

    const tile = currentGrid[index];

    if (tile.isBomb) {
      sound.playBombExplosion();
      setGameState("busted");
      setRevealedTiles(new Array(25).fill(true));
      onPlaceBet(betFBU, 0, `Hit Bomb at tile #${index}. Busted.`, "crystal", false, lastHash, 0);
      incrementNonce();
    } else {
      sound.playCrystalUncover();
      const newMult = Number((currentMultiplier + tile.multiplier * 0.25).toFixed(2));
      setCurrentMultiplier(newMult);

      if (autoPlay && newMult >= autoCashoutTarget) {
        cashoutGame(newMult);
      }
    }
  };

  const cashoutGame = (multiplierToUse?: number) => {
    if (gameState !== "playing") return;
    const finalMult = multiplierToUse || currentMultiplier;
    const payout = Math.round(betFBU * finalMult);

    sound.playWinFanfare();
    setGameState("cashed_out");
    setRevealedTiles(new Array(25).fill(true));

    if (finalMult >= 3) {
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
    }

    onPlaceBet(
      betFBU,
      payout,
      `Cashed out crystal cavern at ${finalMult}x`,
      "crystal",
      true,
      lastHash,
      finalMult,
    );
    incrementNonce();
  };

  const executeAutoExcavation = (grid: any[], hash: string) => {
    let currentMult = 1.0;
    const safeTiles = grid.filter((t) => !t.isBomb);
    const bombTiles = grid.filter((t) => t.isBomb);

    // Pick 2-4 safe tiles automatically
    const tilesToPickCount = Math.min(safeTiles.length, 3);
    const newRevealed = new Array(25).fill(false);

    let hitBomb = false;
    // 80% chance auto picks safe, 20% hits bomb for randomness simulation matching hash
    const hashInt = parseInt(hash.substring(0, 4), 16);
    const simBusted = hashInt % 100 < bombCount * 12;

    if (simBusted) {
      hitBomb = true;
      const bombIndex = bombTiles[0].index;
      newRevealed[bombIndex] = true;
    } else {
      for (let i = 0; i < tilesToPickCount; i++) {
        newRevealed[safeTiles[i].index] = true;
        currentMult += safeTiles[i].multiplier * 0.25;
      }
    }

    setTimeout(() => {
      setRevealedTiles(new Array(25).fill(true));
      if (hitBomb) {
        setGameState("busted");
        onPlaceBet(betFBU, 0, `Auto Mine hit Bomb trap.`, "crystal", false, hash, 0);
      } else {
        const finalMult = Number(currentMult.toFixed(2));
        const payout = Math.round(betFBU * finalMult);
        setCurrentMultiplier(finalMult);
        setGameState("cashed_out");
        onPlaceBet(
          betFBU,
          payout,
          `Auto Cashout at ${finalMult}x`,
          "crystal",
          true,
          hash,
          finalMult,
        );
      }
      incrementNonce();
    }, 600);
  };

  // Auto Play Loop
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (
      autoPlay &&
      (gameState === "idle" || gameState === "cashed_out" || gameState === "busted")
    ) {
      timer = setTimeout(() => {
        if (autoPlayRef.current && balanceFBU >= betFBU) {
          startNewGame();
        }
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [autoPlay, gameState, balanceFBU, betFBU]);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Game Header */}
      <div className="bg-slate-900/90 border border-sky-500/30 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-black bg-gradient-to-r from-sky-300 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                CRYSTAL CAVERN MINES
              </span>
              <span className="px-2 py-0.5 rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-300 font-mono text-[10px] font-bold">
                PROVABLY FAIR GRID
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Uncover rare gemstones while avoiding hidden bomb traps generated by SHA-256.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleSound}
              className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 font-mono transition-colors ${
                isMuted
                  ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                  : "bg-sky-500/10 text-sky-300 border-sky-500/30"
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

        {/* 5x5 Mine Grid */}
        <div className="my-5 flex flex-col items-center">
          <div className="flex items-center justify-between w-full max-w-md mb-3 px-2">
            <div className="text-xs font-mono font-bold text-slate-300">
              Traps: <span className="text-rose-400">{bombCount} Bombs</span>
            </div>
            <div className="text-sm font-mono font-extrabold text-emerald-400 bg-slate-950 px-3 py-1 rounded-lg border border-emerald-500/30">
              Current Multiplier: {currentMultiplier.toFixed(2)}x
            </div>
          </div>

          <div className="grid grid-cols-5 gap-2 w-full max-w-md bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-2xl">
            {new Array(25).fill(0).map((_, idx) => {
              const isRevealed = revealedTiles[idx];
              const tile = currentGrid[idx];

              return (
                <button
                  key={idx}
                  onClick={() => handleRevealTile(idx)}
                  disabled={gameState !== "playing" || isRevealed}
                  className={`h-12 sm:h-14 rounded-xl flex items-center justify-center font-bold text-lg transition-all transform active:scale-95 ${
                    !isRevealed
                      ? "bg-slate-800 hover:bg-sky-500/20 hover:border-sky-400/50 border border-slate-700/80 shadow-md"
                      : tile?.isBomb
                        ? "bg-rose-500/20 border-2 border-rose-500 text-rose-400 animate-bounce"
                        : "bg-emerald-500/20 border-2 border-emerald-400 text-emerald-300"
                  }`}
                >
                  {!isRevealed ? (
                    <span className="text-slate-600 text-xs font-mono">#{idx + 1}</span>
                  ) : tile?.isBomb ? (
                    <Bomb className="w-6 h-6 text-rose-400" />
                  ) : (
                    <div className="flex flex-col items-center">
                      <Gem className="w-5 h-5 text-emerald-400" />
                      <span className="text-[9px] font-mono font-bold text-emerald-300">
                        +{tile?.multiplier}x
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-slate-950/60 p-3 sm:p-4 rounded-xl border border-slate-800">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Bet Amount (FBU) - Max 100,000 FBU
              </label>
              <span className="text-[10px] font-mono text-sky-400 font-bold">
                {formatFBU(betFBU)}
              </span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="number"
                min="100"
                max={Math.min(balanceFBU, 100000)}
                value={betFBU}
                onChange={(e) =>
                  setBetFBU(Math.max(100, Math.min(100000, parseInt(e.target.value) || 100)))
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 font-mono text-xs font-bold text-sky-300 focus:outline-none focus:border-sky-500"
              />
              <select
                value={bombCount}
                onChange={(e) => setBombCount(parseInt(e.target.value))}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 font-mono text-xs font-bold text-slate-200"
              >
                <option value={1}>1 Bomb</option>
                <option value={3}>3 Bombs</option>
                <option value={5}>5 Bombs</option>
                <option value={10}>10 Bombs</option>
              </select>
            </div>
            {/* Quick Bet Presets: 1000, 2000, 5000, 50000, 100000 FBU */}
            <div className="flex flex-wrap gap-1">
              {[1000, 2000, 5000, 50000, 100000].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setBetFBU(Math.min(balanceFBU, preset))}
                  className={`px-2 py-1 rounded text-[10px] font-mono font-extrabold border transition-all ${
                    betFBU === preset
                      ? "bg-sky-500 text-slate-950 border-sky-400 shadow-md shadow-sky-500/20"
                      : "bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700/80"
                  }`}
                >
                  {preset >= 1000 ? `${preset / 1000}K` : preset}
                </button>
              ))}
              <button
                onClick={() => setBetFBU(Math.min(balanceFBU, 100000))}
                className="px-2 py-1 rounded text-[10px] font-mono font-extrabold bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40"
              >
                MAX (100K)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {gameState !== "playing" ? (
              <button
                onClick={startNewGame}
                disabled={balanceFBU < betFBU}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-sky-500 to-cyan-400 hover:from-sky-400 hover:to-cyan-300 text-slate-950 font-extrabold text-xs uppercase rounded-xl shadow-lg transition-all"
              >
                START CAVERN EXPLORE
              </button>
            ) : (
              <button
                onClick={() => cashoutGame()}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 text-slate-950 font-extrabold text-xs uppercase rounded-xl shadow-lg transition-all animate-pulse"
              >
                CASHOUT {formatFBU(Math.round(betFBU * currentMultiplier))}
              </button>
            )}

            <button
              onClick={() => setAutoPlay(!autoPlay)}
              className={`py-3 px-3 rounded-xl font-bold text-xs uppercase flex items-center gap-1 border ${
                autoPlay
                  ? "bg-rose-500/20 text-rose-300 border-rose-500/50"
                  : "bg-slate-800 text-sky-400 border-sky-500/30"
              }`}
            >
              {autoPlay ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {autoPlay ? "STOP AUTO" : "AUTO MINE"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
