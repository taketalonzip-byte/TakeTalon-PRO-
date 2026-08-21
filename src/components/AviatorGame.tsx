/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Plane,
  Zap,
  Award,
  Coins,
  HelpCircle,
  History,
  Info,
  Play,
  XCircle,
  Gift,
  Trophy,
  Ticket,
  Clock,
  Users,
  ArrowLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import FlightIcon from "./FlightIcon";
import { hush } from "../lib/hush/presentation/hush-facade";

interface AviatorGameProps {
  userBalance: number;
  setUserBalance: React.Dispatch<React.SetStateAction<number>>;
  onAddTransaction: (
    type: "DEPOSIT" | "WITHDRAW" | "BET_PLACE" | "BET_WIN" | "UPGRADE_PRO",
    amount: number,
    description: string,
  ) => void;
  theme: "blue" | "dark" | "light";
  onAddNotification: (message: string, type: "success" | "error" | "info") => void;
  t: any;
  lang: "en" | "fr" | "sw";
  onBackToHome?: () => void;
}

/* --- Smoldering Burn Effect Component --- */
function SmolderingBurnEffect({ x, y }: { x: number; y: number }) {
  // Delicate rising flames (flickering orange/yellow embers rising vertically)
  const embers = React.useMemo(() => {
    return Array.from({ length: 15 }).map((_, i) => {
      const xOffset = Math.random() * 24 - 12; // spread around plane body
      const yStart = Math.random() * 10 - 5;
      const xTravel = Math.random() * 10 - 5;
      const yTravel = -30 - Math.random() * 30; // rising up
      return {
        id: i,
        xStart: xOffset,
        yStart: yStart,
        xEnd: xOffset + xTravel,
        yEnd: yStart + yTravel,
        size: 3 + Math.random() * 4,
        delay: Math.random() * 0.8,
        duration: 1.2 + Math.random() * 1.0,
      };
    });
  }, []);

  // Soft, delicate, very small smoke puffs ("moshi mndogo sana") rising slowly
  const smokePuffs = React.useMemo(() => {
    return Array.from({ length: 8 }).map((_, i) => {
      const xOffset = Math.random() * 20 - 10;
      const xTravel = Math.random() * 15 - 7.5;
      const yTravel = -40 - Math.random() * 40;
      return {
        id: i,
        xStart: xOffset,
        xEnd: xOffset + xTravel,
        yEnd: yTravel,
        size: 8 + Math.random() * 8, // small sizes
        delay: Math.random() * 1.0,
        duration: 2.0 + Math.random() * 1.5,
      };
    });
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        transform: "translate(-50%, -50%)",
      }}
      className="pointer-events-none z-30 flex items-center justify-center w-36 h-36"
    >
      {/* 1. Mild background fire-glow behind the plane */}
      <motion.div
        animate={{
          scale: [0.9, 1.15, 0.9],
          opacity: [0.3, 0.65, 0.3],
        }}
        transition={{
          repeat: Infinity,
          duration: 1.2,
          ease: "easeInOut",
        }}
        className="absolute rounded-full w-14 h-14 bg-red-600/30 blur-md"
      />

      <motion.div
        animate={{
          scale: [1, 1.25, 1],
          opacity: [0.4, 0.75, 0.4],
        }}
        transition={{
          repeat: Infinity,
          duration: 0.8,
          ease: "easeInOut",
          delay: 0.3,
        }}
        className="absolute rounded-full w-8 h-8 bg-amber-500/30 blur-sm"
      />

      {/* 2. Slow rising heat/flame embers */}
      {embers.map((ember) => (
        <motion.div
          key={`ember-${ember.id}`}
          initial={{ x: ember.xStart, y: ember.yStart, scale: 0.5, opacity: 0 }}
          animate={{
            x: ember.xEnd,
            y: ember.yEnd,
            scale: [0.8, 1.2, 0.2],
            opacity: [0, 0.9, 0.6, 0],
          }}
          transition={{
            duration: ember.duration,
            delay: ember.delay,
            repeat: Infinity,
            repeatType: "loop",
            ease: "easeOut",
          }}
          className="absolute rounded-full bg-gradient-to-t from-red-500 via-amber-400 to-yellow-300 shadow-[0_0_4px_#ef4444]"
          style={{
            width: ember.size,
            height: ember.size,
          }}
        />
      ))}

      {/* 3. Small delicate smoke puffs */}
      {smokePuffs.map((puff) => (
        <motion.div
          key={`smoke-${puff.id}`}
          initial={{ x: puff.xStart, y: 0, scale: 0.4, opacity: 0 }}
          animate={{
            x: puff.xEnd,
            y: puff.yEnd,
            scale: [0.5, 1.5, 2.0],
            opacity: [0, 0.25, 0.1, 0],
          }}
          transition={{
            duration: puff.duration,
            delay: puff.delay,
            repeat: Infinity,
            repeatType: "loop",
            ease: "linear",
          }}
          className="absolute rounded-full bg-gradient-to-t from-slate-700/20 via-slate-500/10 to-transparent blur-[3px]"
          style={{
            width: puff.size,
            height: puff.size,
          }}
        />
      ))}
    </div>
  );
}

/* --- Aviator Playground Component --- */
export default function AviatorGame({
  userBalance,
  setUserBalance,
  onAddTransaction,
  theme,
  onAddNotification,
  t,
  lang,
  onBackToHome = () => {},
}: AviatorGameProps) {
  const tr = (sw: string, fr: string, en: string) => (lang === "sw" ? sw : lang === "fr" ? fr : en);
  // Game states: 'BETTING' | 'LAUNCHED' | 'BUSTED'
  const [gameState, setGameState] = useState<"BETTING" | "LAUNCHED" | "BUSTED">("BETTING");
  const [multiplier, setMultiplier] = useState(1.0);
  const [betAmount, setBetAmount] = useState(2000);
  const [placedBetAmount, setPlacedBetAmount] = useState<number | null>(null);
  const [isCashedOut, setIsCashedOut] = useState(false);
  const [history, setHistory] = useState<number[]>([
    1.25, 2.84, 1.02, 5.42, 1.88, 12.31, 1.45, 3.12, 1.15,
  ]);
  const [countdown, setCountdown] = useState(10);
  const [cashoutGain, setCashoutGain] = useState(0);

  interface FakePlayer {
    username: string;
    betAmount: number;
    targetMult: number;
    cashedOut: boolean;
    cashoutMult?: number;
    isUser?: boolean;
  }

  const [fakePlayers, setFakePlayers] = useState<FakePlayer[]>([]);
  const [stats, setStats] = useState({
    numBets: 2496,
    totalBets: 324606.84,
    totalWinnings: 0.0,
  });

  const isFlying = gameState === "LAUNCHED";
  const isPaused = gameState === "BUSTED";

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const multiplierRef = useRef(1.0);
  const nextCrashPointRef = useRef<number | null>(null);

  // Initialize HUSH provably fair engine on mount
  useEffect(() => {
    hush.initialize().catch((err) => {
      console.error("Failed to initialize HUSH engine:", err);
    });
  }, []);

  // Quick select bet amounts
  const PRESET_AMOUNTS = [1000, 2000, 5000, 10000];

  const insufficientFundsMsg = tr(
    "Huna salio la kutosha kuweka dau hili. Tafadhali weka salio!",
    "Solde insuffisant pour placer cette mise. Veuillez recharger !",
    "Insufficient balance to place this bet. Please deposit funds!"
  );

  const betDesc = tr(
    `Dau la Aviator: ${betAmount.toLocaleString()} FBU`,
    `Mise Aviator: ${betAmount.toLocaleString()} FBU`,
    `Aviator Bet: ${betAmount.toLocaleString()} FBU`
  );

  // Handle placing a bet for the current betting round
  const handlePlaceBet = () => {
    if (gameState !== "BETTING" || placedBetAmount !== null) return;

    if (userBalance < betAmount) {
      onAddNotification(insufficientFundsMsg, "error");
      return;
    }

    // Deduct bet amount
    setUserBalance((prev) => prev - betAmount);
    setPlacedBetAmount(betAmount);
    setIsCashedOut(false);
    onAddTransaction("BET_PLACE", betAmount, betDesc);

    // Add user to the fakePlayers list at the very top!
    setFakePlayers((prev) => [
      {
        username: "Wewe (Dau Lako)",
        betAmount: betAmount,
        targetMult: 999.0, // user controls their own cashout!
        cashedOut: false,
        isUser: true,
      },
      ...prev,
    ]);

    // Also update stats for the network round to include user's bet
    setStats((prev) => ({
      ...prev,
      numBets: prev.numBets + 1,
      totalBets: parseFloat((prev.totalBets + betAmount).toFixed(2)),
    }));

    const successMsg =
      lang === "sw"
        ? "Dau limewekwa kwa mafanikio! Kusubiri kupaa..."
        : lang === "fr"
          ? "Mise placée avec succès ! Attente du décollage..."
          : "Bet placed successfully! Waiting for takeoff...";
    onAddNotification(successMsg, "success");
  };

  const handleCashout = () => {
    if (gameState !== "LAUNCHED" || !placedBetAmount || isCashedOut) return;

    const currentMultiplier = multiplierRef.current;
    const winSum = Math.floor(placedBetAmount * currentMultiplier);

    const winDesc =
      lang === "sw"
        ? `Ushindi wa Aviator: x${currentMultiplier.toFixed(2)} (${winSum.toLocaleString()} FBU)`
        : lang === "fr"
          ? `Gain Aviator: x${currentMultiplier.toFixed(2)} (${winSum.toLocaleString()} FBU)`
          : `Aviator Win: x${currentMultiplier.toFixed(2)} (${winSum.toLocaleString()} FBU)`;

    setUserBalance((prev) => prev + winSum);
    setCashoutGain(winSum);
    setIsCashedOut(true);
    onAddTransaction("BET_WIN", winSum, winDesc);

    // Update user row in fakePlayers list to cashedOut!
    setFakePlayers((prev) =>
      prev.map((p) => (p.isUser ? { ...p, cashedOut: true, cashoutMult: currentMultiplier } : p)),
    );

    // Also add to network winnings statistic!
    setStats((prev) => ({
      ...prev,
      totalWinnings: parseFloat((prev.totalWinnings + winSum).toFixed(2)),
    }));

    const winNotifyMsg =
      lang === "sw"
        ? `Umetoa pesa kwa mafanikio! Umeshinda FBU ${winSum.toLocaleString()}`
        : lang === "fr"
          ? `Retrait réussi ! Vous avez gagné FBU ${winSum.toLocaleString()}`
          : `Successfully cashed out! You won FBU ${winSum.toLocaleString()}`;
    onAddNotification(winNotifyMsg, "success");
  };

  useEffect(() => {
    if (gameState === "BETTING") {
      setCountdown(10);
      setMultiplier(1.0);
      multiplierRef.current = 1.0;
      setIsCashedOut(false);
      setCashoutGain(0);

      // Asynchronously generate next provably fair outcome using HUSH
      hush
        .generateNextOutcome()
        .then((outcome) => {
          nextCrashPointRef.current = outcome.multiplier;
        })
        .catch((err) => {
          console.error("HUSH Engine outcome generation error:", err);
          // High-reliability fallback matching typical flight duration distribution
          nextCrashPointRef.current = parseFloat((1.05 + Math.random() * 5.0).toFixed(2));
        });

      // Generate a set of fake players
      const generatedPlayers: FakePlayer[] = Array.from({ length: 18 }).map(() => {
        const suffix = Math.floor(Math.random() * 90) + 10;
        const username = `*******${suffix}`;
        const isRound = Math.random() > 0.4;
        const betAmount = isRound
          ? Math.floor(Math.random() * 15 + 1) * 1000
          : parseFloat((Math.random() * 4500 + 500).toFixed(2));

        // Target multiplier where they'll cash out
        const r = Math.random();
        let targetMult = 1.1;
        if (r < 0.35) {
          targetMult = parseFloat((1.05 + Math.random() * 0.75).toFixed(2));
        } else if (r < 0.7) {
          targetMult = parseFloat((1.8 + Math.random() * 1.7).toFixed(2));
        } else if (r < 0.85) {
          targetMult = parseFloat((3.5 + Math.random() * 4.5).toFixed(2));
        } else {
          targetMult = parseFloat((8.0 + Math.random() * 25.0).toFixed(2));
        }

        return {
          username,
          betAmount,
          targetMult,
          cashedOut: false,
        };
      });

      // Calculate new header stats for the network round (Number of bets, Total bets)
      const networkNumBets = Math.floor(Math.random() * 1000) + 1500; // e.g. 1500 to 2500
      const networkTotalBets = parseFloat((150000 + Math.random() * 200000).toFixed(2));

      setStats({
        numBets: networkNumBets,
        totalBets: networkTotalBets,
        totalWinnings: 0.0,
      });

      setFakePlayers(generatedPlayers);

      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setGameState("LAUNCHED");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }

    if (gameState === "LAUNCHED") {
      // Retrieve pre-computed cryptographically secure crash point from HUSH
      const crashPoint = nextCrashPointRef.current ?? 1.15;
      // Reset ref for subsequent rounds
      nextCrashPointRef.current = null;

      const start = Date.now();
      let active = true;

      const tick = () => {
        if (!active) return;
        const elapsed = (Date.now() - start) / 1000; // in seconds
        // Exponential multiplier growth rate
        const currentMult = parseFloat((1.0 + Math.pow(elapsed, 1.3) * 0.08).toFixed(2));

        if (currentMult >= crashPoint) {
          setMultiplier(crashPoint);
          multiplierRef.current = crashPoint;
          setGameState("BUSTED");
          setHistory((prev) => [crashPoint, ...prev.slice(0, 11)]);
        } else {
          setMultiplier(currentMult);
          multiplierRef.current = currentMult;
          timerRef.current = setTimeout(tick, 50);
        }
      };

      tick();

      return () => {
        active = false;
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }

    if (gameState === "BUSTED") {
      // Show burn effect for 4 seconds, then start a new betting round
      const timer = setTimeout(() => {
        setPlacedBetAmount(null);
        setIsCashedOut(false);
        setCashoutGain(0);
        setGameState("BETTING");
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [gameState]);

  // Real-time fake players cashout handler as multiplier climbs
  useEffect(() => {
    if (gameState !== "LAUNCHED") return;

    setFakePlayers((prevPlayers) => {
      let changed = false;
      let addedWinnings = 0;

      const updated = prevPlayers.map((p) => {
        // User handles their own cashout, fake players cashout if multiplier crosses targetMult
        if (!p.isUser && !p.cashedOut && multiplier >= p.targetMult) {
          changed = true;
          const winVal = parseFloat((p.betAmount * p.targetMult).toFixed(2));
          addedWinnings += winVal;
          return {
            ...p,
            cashedOut: true,
            cashoutMult: p.targetMult,
          };
        }
        return p;
      });

      if (addedWinnings > 0) {
        setStats((prev) => ({
          ...prev,
          totalWinnings: parseFloat((prev.totalWinnings + addedWinnings).toFixed(2)),
        }));
      }

      return changed ? updated : prevPlayers;
    });
  }, [multiplier, gameState]);

  // Calculate current graph coordinates based on multiplier up to 10.0x
  // X starts at exactly 0% (at multiplier 1.0) and climbs up to 95% at 10.0x
  const xVal = Math.min(95, ((multiplier - 1) / 9) * 95);
  // Y starts at exactly 100% (at multiplier 1.0) and climbs up to 10% at 10.0x
  const yVal = Math.max(10, 100 - ((multiplier - 1) / 9) * 90);

  // Set rotation angle to exactly -10 degrees to keep it stable and elegant (prevents sharp dynamic tilting)
  const rotationAngle = -10;

  const subtitleText =
    lang === "sw"
      ? "Kuruka juu na kuvuna faida ya sekunde!"
      : lang === "fr"
        ? "Volez haut et récoltez des gains en quelques secondes !"
        : "Fly high and reap instant gains in seconds!";

  return (
    <div className="flex flex-col h-full w-full px-3.5 py-3 space-y-2 max-w-lg mx-auto overflow-hidden">
      {/* Title Header with Back Button */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <button
            onClick={onBackToHome}
            className={`p-2 rounded-xl border transition-all active:scale-95 cursor-pointer ${
              theme === "light"
                ? "bg-white border-slate-200 text-slate-750 hover:bg-slate-50"
                : "bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-850"
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <div>
            <h2
              className={`font-display font-black text-xs tracking-wide uppercase leading-tight ${theme === "light" ? "text-slate-800" : "text-slate-100"}`}
            >
              Aviator <span className="text-amber-400 font-bold">Flight</span>
            </h2>
            <p
              className={`text-[9px] leading-tight ${theme === "light" ? "text-slate-500" : "text-slate-400"}`}
            >
              {subtitleText}
            </p>
          </div>
        </div>

        <div
          className={`text-[10.5px] font-mono font-bold px-2.5 py-1.5 rounded-lg flex items-center space-x-1 border shrink-0 ${
            theme === "light"
              ? "bg-white border-slate-200 text-slate-850"
              : "bg-slate-900 border border-slate-850 text-slate-300"
          }`}
        >
          <Coins className="w-3 h-3 text-yellow-500 shrink-0" />
          <span>FBU {userBalance.toLocaleString()}</span>
        </div>
      </div>

      {/* Flight Crash Multiplier History row */}
      <div
        className={`border rounded-lg p-1.5 shrink-0 ${
          theme === "light" ? "bg-slate-50 border-slate-200" : "bg-slate-950/80 border-slate-900"
        }`}
      >
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
          <span className="text-[8.5px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 shrink-0">
            <History className="w-3 h-3" />{" "}
            {lang === "sw" ? "Hist:" : lang === "fr" ? "Hist:" : "Hist:"}
          </span>
          {history.map((val, idx) => {
            const isMega = val >= 5.0;
            const isMedium = val >= 2.0 && val < 5.0;
            return (
              <span
                key={idx}
                className={`text-[8.5px] font-mono font-extrabold px-1.5 py-0.5 rounded shadow-sm border shrink-0 ${
                  isMega
                    ? "bg-purple-950/40 text-purple-400 border-purple-500/30"
                    : isMedium
                      ? "bg-blue-950/40 text-blue-400 border-blue-500/30"
                      : "bg-slate-900 text-slate-400 border-slate-800"
                }`}
              >
                x{val.toFixed(2)}
              </span>
            );
          })}
        </div>
      </div>

      {/* Main Flight Arena Panel - Changed to aspect-[2.1/1] (Rectangle) */}
      <div className="relative overflow-hidden aspect-[2.1/1] w-full flex flex-col justify-between p-3.5 bg-transparent border border-slate-800/10 dark:border-slate-800/40 rounded-xl shrink-0">
        {/* PREMIUM MINIMALIST BACKDROP */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
          {/* Soft, professional radial orange/blue flares for realistic atmospheric depth */}
          <div className="absolute -bottom-1/4 -left-1/4 w-[130%] h-[130%] bg-[radial-gradient(circle_at_20%_80%,rgba(249,115,22,0.06)_0%,rgba(59,130,246,0.03)_40%,transparent_70%)] pointer-events-none mix-blend-screen" />

          {/* Subtle orange glow at the bottom-right for beautiful visual balance */}
          <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.03)_0%,transparent_70%)] pointer-events-none mix-blend-screen" />
        </div>

        {/* Real-time Flight Curve Path SVG overlay */}
        {(gameState === "LAUNCHED" || gameState === "BUSTED") && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-10"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="curve-stroke-grad" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0.8" />
              </linearGradient>
              <linearGradient id="curve-fill-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(239, 68, 68, 0.12)" />
                <stop offset="100%" stopColor="rgba(239, 68, 68, 0.0)" />
              </linearGradient>
            </defs>
            {/* Ambient translucent filled region under the curve */}
            <path
              d={`M 0 100 Q ${xVal * 0.4} 100, ${xVal} ${yVal} L ${xVal} 100 Z`}
              fill="url(#curve-fill-grad)"
              className="transition-all duration-75"
            />
            {/* Solid glowing stroke line */}
            <path
              d={`M 0 100 Q ${xVal * 0.4} 100, ${xVal} ${yVal}`}
              fill="transparent"
              stroke="url(#curve-stroke-grad)"
              strokeWidth="1.2"
              className="filter drop-shadow-[0_1.5px_4px_rgba(239,68,68,0.5)] transition-all duration-75"
            />
          </svg>
        )}

        {/* Empty placeholder for Top bar spacing to keep clean layout */}
        <div className="h-2 relative z-20 pointer-events-none" />

        {/* Central dynamic Multiplier display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none">
          {gameState === "BETTING" && (
            <div className="text-center space-y-1 z-20 relative px-4">
              <h3 className="text-[10px] font-black text-slate-200 uppercase tracking-widest">
                {lang === "sw"
                  ? "KUWEKA DAU..."
                  : lang === "fr"
                    ? "PRÉPARATION..."
                    : "ACCEPTING BETS..."}
              </h3>
              <div className="text-3xl font-display font-black text-white">{countdown}s</div>
              <p className="text-[8.5px] text-slate-400 max-w-xs mx-auto leading-normal">
                {placedBetAmount
                  ? lang === "sw"
                    ? "Dau limepokelewa! Kusubiri kupaa..."
                    : lang === "fr"
                      ? "Mise confirmée ! Décollage imminent..."
                      : "Bet placed! Waiting for takeoff..."
                  : lang === "sw"
                    ? "Weka dau lako sasa kabla muda kuisha!"
                    : lang === "fr"
                      ? "Placez votre mise avant la fin du décompte !"
                      : "Place your bet before time runs out!"}
              </p>
            </div>
          )}

          {gameState === "LAUNCHED" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 w-full h-full pointer-events-none select-none z-20"
            >
              {/* Dynamic plane taking off from bottom-left to top-right along a curved path */}
              <div
                style={{
                  position: "absolute",
                  left: `${xVal}%`,
                  top: `${yVal}%`,
                  transform: `translate(-50%, -50%) rotate(${rotationAngle}deg)`,
                  transition: "left 0.15s linear, top 0.15s linear, transform 0.15s linear",
                }}
                className="flex items-center justify-center"
              >
                <FlightIcon size={52} />
              </div>
            </motion.div>
          )}

          {gameState === "BUSTED" && (
            <motion.div
              initial={{ opacity: 1 }}
              className="absolute inset-0 w-full h-full pointer-events-none select-none z-20"
            >
              {/* The plane remains static & vibrates as it smolders/burns red-hot (no falling/fading away) */}
              <motion.div
                animate={{
                  x: [0, 0.6, -0.6, 0],
                  y: [0, -0.4, 0.4, 0],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 0.15,
                  ease: "easeInOut",
                }}
                style={{
                  position: "absolute",
                  left: `${xVal}%`,
                  top: `${yVal}%`,
                  transform: `translate(-50%, -50%) rotate(${rotationAngle}deg)`,
                }}
                className="flex items-center justify-center text-red-500 filter drop-shadow-[0_0_12px_#f97316] brightness-50 contrast-150"
              >
                <FlightIcon size={52} />
              </motion.div>
              {/* Slower custom smoldering and thin smoke effect at the final coordinate */}
              <SmolderingBurnEffect x={xVal} y={yVal} />
            </motion.div>
          )}

          {gameState === "BUSTED" && (
            <div className="text-center space-y-0.5 animate-[shake_0.4s_ease-in-out] z-25 relative px-4">
              <div className="text-sm font-display font-black text-red-500 uppercase tracking-widest">
                {lang === "sw"
                  ? "Ndege Imeungua!"
                  : lang === "fr"
                    ? "L'avion a brûlé !"
                    : "Plane Burned!"}
              </div>
              <div className="text-2xl font-mono font-extrabold text-slate-400">
                x{multiplier.toFixed(2)}
              </div>
              <p className="text-[9px] text-slate-500">
                {isCashedOut
                  ? lang === "sw"
                    ? "Ulitoka kwa usalama!"
                    : lang === "fr"
                      ? "Retrait réussi !"
                      : "You cashed out safely!"
                  : lang === "sw"
                    ? "Pole, ulisahau kutoa pesa mapema!"
                    : lang === "fr"
                      ? "Désolé, vous avez manqué le retrait !"
                      : "Sorry, you missed the cashout!"}
              </p>
            </div>
          )}
        </div>

        {/* Real-time small odds display at bottom-right corner */}
        {(gameState === "LAUNCHED" || gameState === "BUSTED") && (
          <div className="absolute bottom-2 right-3 z-30 font-mono font-bold select-none flex items-baseline leading-none">
            <span className="text-amber-500 text-xs mr-0.5 font-extrabold">x</span>
            <span className="text-white text-base font-black tracking-wide">
              {multiplier.toFixed(2)}
            </span>
          </div>
        )}

        {/* Empty bottom space to keep clean padding */}
        <div className="h-2 relative z-20 pointer-events-none" />
      </div>

      {/* Stake Controller and Action Buttons - Extremely Compact */}
      <div
        className={`rounded-xl p-2.5 border space-y-2 shrink-0 ${
          theme === "light" ? "bg-slate-50 border-slate-200" : "glass-panel border-slate-900"
        }`}
      >
        <div className="flex items-center justify-between text-[10px]">
          <span
            className={`font-bold uppercase ${theme === "light" ? "text-slate-600" : "text-slate-400"}`}
          >
            {lang === "sw"
              ? "Kiasi cha Dau (FBU)"
              : lang === "fr"
                ? "Montant de la Mise (FBU)"
                : "Bet Amount (FBU)"}
          </span>
          <span className="text-[9px] text-slate-500 font-medium">Min: 500 | Max: 100k</span>
        </div>

        {/* Preset value buttons */}
        <div className="grid grid-cols-4 gap-1.5">
          {PRESET_AMOUNTS.map((amt) => (
            <button
              key={amt}
              id={`preset-bet-${amt}`}
              disabled={gameState !== "BETTING" || placedBetAmount !== null}
              onClick={() => setBetAmount(amt)}
              className={`py-1 rounded-md text-[10px] font-mono font-extrabold border transition-colors cursor-pointer ${
                betAmount === amt
                  ? "bg-amber-500/15 text-amber-600 border-amber-500/50"
                  : theme === "light"
                    ? "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    : "bg-slate-900 text-slate-400 border-slate-800/80 hover:text-white"
              }`}
            >
              {amt.toLocaleString()}
            </button>
          ))}
        </div>

        {/* Direct number input field */}
        <div className="flex items-center space-x-1.5">
          <button
            disabled={gameState !== "BETTING" || placedBetAmount !== null}
            onClick={() => setBetAmount(Math.max(500, betAmount - 500))}
            className={`w-7 h-7 rounded-lg border flex items-center justify-center font-black cursor-pointer disabled:opacity-50 active:scale-95 transition-all text-xs ${
              theme === "light"
                ? "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                : "bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-850"
            }`}
          >
            -
          </button>

          <input
            id="bet-stake-input"
            type="number"
            disabled={gameState !== "BETTING" || placedBetAmount !== null}
            value={betAmount}
            onChange={(e) => setBetAmount(Math.max(500, parseInt(e.target.value) || 500))}
            className={`flex-1 text-center font-mono font-black text-xs border rounded-lg py-1 focus:outline-none transition-all ${
              theme === "light"
                ? "bg-white border-slate-200 text-slate-800 focus:border-amber-500"
                : "bg-slate-950 border border-slate-800 text-slate-100 focus:border-amber-500"
            }`}
          />

          <button
            disabled={gameState !== "BETTING" || placedBetAmount !== null}
            onClick={() => setBetAmount(betAmount + 500)}
            className={`w-7 h-7 rounded-lg border flex items-center justify-center font-black cursor-pointer disabled:opacity-50 active:scale-95 transition-all text-xs ${
              theme === "light"
                ? "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                : "bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-850"
            }`}
          >
            +
          </button>
        </div>

        {/* Main interactive big CTA button */}
        {gameState === "BETTING" ? (
          placedBetAmount ? (
            /* Bet already placed, waiting for takeoff */
            <button
              id="bet-placed-waiting-btn"
              disabled
              className="w-full h-8 rounded-lg bg-slate-900/80 border border-amber-500/30 text-amber-500/80 font-display font-black text-[10px] uppercase tracking-wider flex items-center justify-center space-x-1.5 animate-pulse"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>
                {lang === "sw"
                  ? "Dau Limepokewa! Kusubiri Kupaa..."
                  : lang === "fr"
                    ? "Mise Enregistrée ! Attente..."
                    : "Bet Accepted! Waiting..."}
              </span>
            </button>
          ) : (
            /* Betting is open, player can place bet */
            <button
              id="launch-round-btn"
              onClick={handlePlaceBet}
              className="w-full h-8 rounded-lg bg-gradient-to-r from-red-600 to-amber-500 text-slate-950 font-display font-black text-[10.5px] uppercase tracking-widest shadow-md shadow-amber-500/10 hover:scale-[1.01] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center space-x-1.5"
            >
              <Play className="w-3 h-3 fill-slate-950" />
              <span>
                {lang === "sw"
                  ? `Weka Dau (FBU ${betAmount.toLocaleString()})`
                  : lang === "fr"
                    ? `Placer Mise (FBU ${betAmount.toLocaleString()})`
                    : `Place Bet (FBU ${betAmount.toLocaleString()})`}
              </span>
            </button>
          )
        ) : gameState === "LAUNCHED" ? (
          placedBetAmount && !isCashedOut ? (
            /* Playing round: Active bet, CASH OUT button */
            <button
              id="cashout-now-btn"
              onClick={handleCashout}
              className="w-full h-10 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-display font-black text-[11px] uppercase tracking-wider shadow-md shadow-amber-500/15 cursor-pointer hover:scale-[1.01] active:scale-[0.95] transition-all flex flex-col items-center justify-center leading-tight"
            >
              <span className="text-[8px] font-black tracking-widest text-slate-900 opacity-90">
                {lang === "sw"
                  ? "TOA PESA SASA"
                  : lang === "fr"
                    ? "RETIRER MAINTENANT"
                    : "CASH OUT NOW"}
              </span>
              <span className="text-[12px] font-mono font-black">
                FBU {Math.floor(placedBetAmount * multiplier).toLocaleString()}
              </span>
            </button>
          ) : placedBetAmount && isCashedOut ? (
            /* Bet already cashed out successfully */
            <button
              id="bet-cashed-out-btn"
              disabled
              className="w-full h-8 rounded-lg bg-slate-900/60 border border-emerald-500/20 text-emerald-500/80 font-display font-black text-[10px] uppercase tracking-wider flex items-center justify-center space-x-1.5"
            >
              <Award className="w-3.5 h-3.5" />
              <span>
                {lang === "sw"
                  ? `Umetoa FBU ${cashoutGain.toLocaleString()}`
                  : lang === "fr"
                    ? `Retiré FBU ${cashoutGain.toLocaleString()}`
                    : `Cashed Out FBU ${cashoutGain.toLocaleString()}`}
              </span>
            </button>
          ) : (
            /* Flight in progress, but player did not place bet */
            <button
              id="flight-in-progress-btn"
              disabled
              className="w-full h-8 rounded-lg bg-slate-950 text-slate-600 border border-slate-900 font-display font-black text-[10px] uppercase tracking-wider flex items-center justify-center space-x-1.5"
            >
              <span>
                {lang === "sw"
                  ? "Mchezo Unaendelea..."
                  : lang === "fr"
                    ? "Vol en Cours..."
                    : "Flight in Progress..."}
              </span>
            </button>
          )
        ) : (
          /* BUSTED/CRASHED state */
          <button
            id="round-over-btn"
            disabled
            className="w-full h-8 rounded-lg bg-slate-950 text-red-500/85 border border-red-500/10 font-display font-black text-[10px] uppercase tracking-wider flex items-center justify-center space-x-1.5"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>
              {lang === "sw" ? "Mzunguko Umekwisha" : lang === "fr" ? "Vol Terminé" : "Round Over"}
            </span>
          </button>
        )}
      </div>

      {/* Tableau showing Bets and Winnings statistics + dynamic network players */}
      <div
        className={`h-[280px] flex flex-col rounded-xl border overflow-hidden shadow-md ${
          theme === "light"
            ? "bg-slate-50 border-slate-200"
            : "bg-slate-900/90 border border-slate-800"
        }`}
      >
        {/* Statistics Header Card - COMPACT */}
        <div className="bg-gradient-to-r from-orange-600 via-red-600 to-amber-600 py-1.5 px-2 text-white grid grid-cols-3 gap-0.5 text-center divide-x divide-white/15 shrink-0">
          <div className="space-y-0.5">
            <p className="text-[8.5px] font-bold tracking-wider text-white/80 uppercase">
              {lang === "sw"
                ? "Idadi ya Madau"
                : lang === "fr"
                  ? "Nombre de mises"
                  : "Number of bets"}
            </p>
            <div className="flex items-center justify-center space-x-1">
              <Users className="w-2.5 h-2.5 text-white/90 shrink-0" />
              <span className="text-[10.5px] font-black tracking-wide">{stats.numBets}</span>
            </div>
          </div>
          <div className="space-y-0.5 px-0.5">
            <p className="text-[8.5px] font-bold tracking-wider text-white/80 uppercase">
              {lang === "sw" ? "Jumla ya Madau" : lang === "fr" ? "Total des mises" : "Total bets"}
            </p>
            <div className="flex items-center justify-center space-x-1">
              <Coins className="w-2.5 h-2.5 text-white/90 shrink-0" />
              <span className="text-[10.5px] font-black tracking-wide leading-none">
                {stats.totalBets.toLocaleString(undefined, { maximumFractionDigits: 0 })} FBU
              </span>
            </div>
          </div>
          <div className="space-y-0.5">
            <p className="text-[8.5px] font-bold tracking-wider text-white/80 uppercase">
              {lang === "sw"
                ? "Jumla ya Ushindi"
                : lang === "fr"
                  ? "Gains totaux"
                  : "Total winnings"}
            </p>
            <div className="flex items-center justify-center space-x-1">
              <Trophy className="w-2.5 h-2.5 text-amber-300 shrink-0 animate-pulse" />
              <span className="text-[10.5px] font-black text-amber-200 tracking-wide leading-none">
                {stats.totalWinnings.toLocaleString(undefined, { maximumFractionDigits: 0 })} FBU
              </span>
            </div>
          </div>
        </div>

        {/* Network Players Live Table */}
        <div className="p-2 flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="grid grid-cols-12 text-[8.5px] font-bold text-slate-500 uppercase tracking-wider pb-1 border-b border-slate-800/20 shrink-0 select-none">
            <div className="col-span-4 text-left">
              {lang === "sw" ? "Mtumiaji" : lang === "fr" ? "Pseudo" : "Username"}
            </div>
            <div className="col-span-2 text-center">
              {lang === "sw" ? "Odds" : lang === "fr" ? "Coeff" : "Odds"}
            </div>
            <div className="col-span-3 text-right">
              {lang === "sw" ? "Dau" : lang === "fr" ? "Mise" : "Bet"}
            </div>
            <div className="col-span-3 text-right">
              {lang === "sw" ? "Ushindi" : lang === "fr" ? "Gain" : "Win"}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar font-mono text-[10px] select-none divide-y divide-slate-800/10 py-0.5">
            {fakePlayers.map((player, idx) => {
              // Calculate real-time display elements
              let displayedOdds = "x0";
              let displayedWin = "0 FBU";
              let winStyle = "text-slate-450"; // default grey

              if (gameState === "BETTING") {
                displayedOdds = "x0";
                displayedWin = "0 FBU";
                winStyle = "text-slate-500";
              } else if (gameState === "LAUNCHED") {
                if (player.cashedOut && player.cashoutMult) {
                  displayedOdds = `x${player.cashoutMult.toFixed(2)}`;
                  displayedWin = `${Math.floor(player.betAmount * player.cashoutMult).toLocaleString()} FBU`;
                  winStyle = "text-emerald-500 font-extrabold";
                } else {
                  // Active: growing win values in real-time
                  displayedOdds = `x${multiplier.toFixed(2)}`;
                  displayedWin = `${Math.floor(player.betAmount * multiplier).toLocaleString()} FBU`;
                  winStyle = "text-amber-400 font-medium";
                }
              } else if (gameState === "BUSTED") {
                if (player.cashedOut && player.cashoutMult) {
                  displayedOdds = `x${player.cashoutMult.toFixed(2)}`;
                  displayedWin = `${Math.floor(player.betAmount * player.cashoutMult).toLocaleString()} FBU`;
                  winStyle = "text-emerald-500 font-extrabold";
                } else {
                  displayedOdds = "x0";
                  displayedWin = "0 FBU";
                  winStyle = "text-red-500 font-bold";
                }
              }

              return (
                <div
                  key={idx}
                  className={`grid grid-cols-12 items-center py-0.5 transition-all ${
                    player.isUser
                      ? "bg-amber-500/10 font-bold rounded px-1 border-y border-amber-500/15 shadow-sm"
                      : ""
                  }`}
                >
                  <div
                    className={`col-span-4 text-left font-sans truncate ${player.isUser ? "text-amber-400 font-bold font-display" : "text-slate-300"}`}
                  >
                    {player.username}
                  </div>
                  <div
                    className={`col-span-2 text-center text-[9.5px] font-bold ${player.cashedOut ? "text-emerald-500" : "text-slate-500"}`}
                  >
                    {displayedOdds}
                  </div>
                  <div className="col-span-3 text-right text-slate-400">
                    {Math.floor(player.betAmount).toLocaleString()}
                  </div>
                  <div className={`col-span-3 text-right text-[9.5px] font-bold ${winStyle}`}>
                    {displayedWin}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Informative description - Minimalized */}
      <div
        className={`p-2 border rounded-lg text-[9.5px] flex items-start space-x-1.5 shrink-0 ${
          theme === "light"
            ? "bg-blue-50 border-blue-150 text-slate-600"
            : "bg-blue-500/5 border border-blue-500/10 text-slate-400"
        }`}
      >
        <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
        <p className="leading-tight">
          {lang === "sw"
            ? "Mchezo wa bahati nasibu: kutoa pesa kabla ya ndege kupaa mbali na kutoweka ili kuzidisha dau lako!"
            : lang === "fr"
              ? "Jeu de crash: retirez avant que l'avion ne s'envole pour multiplier votre mise !"
              : "Crash game: cash out before the plane flies away to multiply your bet!"}
        </p>
      </div>
    </div>
  );
}
