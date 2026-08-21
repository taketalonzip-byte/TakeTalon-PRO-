/**
 * JackpotWheelGame — wrapper inalounganisha JackpotWheel na TakeTalon wallet/context.
 * Inatumika ndani ya CasinoGamePlay kama slug === "jackpot-wheel".
 */
import React, { useCallback } from "react";
import { ArrowLeft, Coins } from "lucide-react";
import { JackpotWheel } from "@/components/jackpot/JackpotWheel";
import { WheelSegment, SpinResponse } from "@/types/jackpot";
import { generateRandomSeed, sha256 } from "@/lib/jackpotCrypto";

type Theme = "blue" | "dark" | "light";
type Lang = "en" | "fr" | "sw";

interface JackpotWheelGameProps {
  userBalance: number;
  setUserBalance: (n: number) => void;
  onAddTransaction: (
    type: "DEPOSIT" | "WITHDRAW" | "BET_PLACE" | "BET_WIN" | "UPGRADE_PRO",
    amount: number,
    description: string,
  ) => void;
  onAddNotification: (msg: string, type?: "success" | "error" | "info") => void;
  onBack: () => void;
  theme: Theme;
  lang?: Lang;
}

// Wheel segments: 12 coloured slices — namba 1-300 zimegawanywa sawa sawa
const SEGMENTS: WheelSegment[] = [
  {
    id: "s1",
    label: "1–25",
    multiplier: 1,
    points: 100,
    color: "#f59e0b",
    numbersRange: Array.from({ length: 25 }, (_, i) => i + 1),
  },
  {
    id: "s2",
    label: "26–50",
    multiplier: 2,
    points: 250,
    color: "#3b82f6",
    numbersRange: Array.from({ length: 25 }, (_, i) => i + 26),
  },
  {
    id: "s3",
    label: "51–75",
    multiplier: 1,
    points: 100,
    color: "#10b981",
    numbersRange: Array.from({ length: 25 }, (_, i) => i + 51),
  },
  {
    id: "s4",
    label: "76–100",
    multiplier: 3,
    points: 500,
    color: "#ec4899",
    numbersRange: Array.from({ length: 25 }, (_, i) => i + 76),
  },
  {
    id: "s5",
    label: "101–125",
    multiplier: 1,
    points: 100,
    color: "#8b5cf6",
    numbersRange: Array.from({ length: 25 }, (_, i) => i + 101),
  },
  {
    id: "s6",
    label: "126–150",
    multiplier: 5,
    points: 1000,
    color: "#ef4444",
    numbersRange: Array.from({ length: 25 }, (_, i) => i + 126),
  },
  {
    id: "s7",
    label: "151–175",
    multiplier: 1,
    points: 100,
    color: "#06b6d4",
    numbersRange: Array.from({ length: 25 }, (_, i) => i + 151),
  },
  {
    id: "s8",
    label: "176–200",
    multiplier: 2,
    points: 250,
    color: "#f97316",
    numbersRange: Array.from({ length: 25 }, (_, i) => i + 176),
  },
  {
    id: "s9",
    label: "201–225",
    multiplier: 1,
    points: 100,
    color: "#84cc16",
    numbersRange: Array.from({ length: 25 }, (_, i) => i + 201),
  },
  {
    id: "s10",
    label: "226–250",
    multiplier: 3,
    points: 500,
    color: "#a855f7",
    numbersRange: Array.from({ length: 25 }, (_, i) => i + 226),
  },
  {
    id: "s11",
    label: "251–275",
    multiplier: 1,
    points: 100,
    color: "#14b8a6",
    numbersRange: Array.from({ length: 25 }, (_, i) => i + 251),
  },
  {
    id: "s12",
    label: "276–300",
    multiplier: 10,
    points: 2500,
    color: "#fbbf24",
    numbersRange: Array.from({ length: 25 }, (_, i) => i + 276),
  },
];

const BET_PER_SPIN = 200; // FBU per spin — fixed

export default function JackpotWheelGame({
  userBalance,
  setUserBalance,
  onAddTransaction,
  onAddNotification,
  onBack,
  theme,
  lang = "en",
}: JackpotWheelGameProps) {
  const bg = theme === "dark" ? "bg-[#141414]" : theme === "light" ? "bg-white" : "bg-[#1f3d5c]";
  const chipCls = theme === "light" ? "bg-neutral-200 text-neutral-900" : "bg-white/10 text-white";

  /**
   * Spin handler: simulate provably-fair server logic client-side
   * (kwa production ya kweli server itafanya hii kwa usalama zaidi)
   */
  const handleSpinRequest = useCallback(
    async (selectedNumbers: number[]): Promise<SpinResponse> => {
      if (userBalance < BET_PER_SPIN) {
        onAddNotification(
          lang === "sw" ? "Salio halitoshi kwa mzunguko" : "Insufficient balance for spin",
          "error",
        );
        throw new Error("Insufficient balance");
      }

      // Deduct bet
      setUserBalance(userBalance - BET_PER_SPIN);
      onAddTransaction("BET_PLACE", BET_PER_SPIN, "Jackpot Wheel — spin");

      // Provably fair: generate server seed + commit hash
      const serverSeed = generateRandomSeed(32);
      const clientSeed = generateRandomSeed(16);
      const nonce = Math.floor(Math.random() * 9999) + 1;
      const commitHash = await sha256(serverSeed);

      // Calculate winning segment via SHA-256
      const combined = `${serverSeed}:${clientSeed}:${nonce}`;
      const fullHash = await sha256(combined);
      const hexSub = fullHash.substring(0, 8);
      const intVal = parseInt(hexSub, 16);
      const segmentIndex = intVal % SEGMENTS.length;
      const winningSegment = SEGMENTS[segmentIndex];

      // Pick a winning number from that segment's range
      const rangeNums = winningSegment.numbersRange;
      const winningNumber = rangeNums[intVal % rangeNums.length];

      // Check if user picked the winning number
      const isWinner = selectedNumbers.includes(winningNumber);
      if (isWinner) {
        const prize = BET_PER_SPIN * winningSegment.multiplier;
        setUserBalance(userBalance - BET_PER_SPIN + prize);
        onAddTransaction("BET_WIN", prize, `Jackpot Wheel — ${winningSegment.label} win`);
        onAddNotification(
          lang === "sw"
            ? `🏆 Umeshinda FBU ${prize.toLocaleString()}!`
            : `🏆 You won FBU ${prize.toLocaleString()}!`,
          "success",
        );
      }

      return {
        resultSegmentId: winningSegment.id,
        winningNumber,
        commitHash,
        serverSeed,
        clientSeed,
        nonce,
      };
    },
    [userBalance, setUserBalance, onAddTransaction, onAddNotification, lang],
  );

  return (
    <div className={`min-h-screen ${bg} pb-28`}>
      {/* Top bar */}
      <div className="sticky top-0 z-20 backdrop-blur bg-black/50 border-b border-white/10 px-4 py-3 flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-white font-bold text-base flex-1 truncate">🎰 Jackpot Wheel</h2>
        <div
          className={`px-3 py-1.5 rounded-full text-sm font-semibold flex items-center gap-1 ${chipCls}`}
        >
          <Coins size={14} className="text-amber-400" />
          FBU {userBalance.toLocaleString()}
        </div>
      </div>

      {/* Bet notice */}
      <div className="px-4 pt-3">
        <div className="max-w-lg mx-auto px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[11px] font-semibold text-center">
          {lang === "sw"
            ? `Kila mzunguko = FBU ${BET_PER_SPIN} · Shinda kwa kuchagua namba sahihi`
            : `Each spin = FBU ${BET_PER_SPIN} · Win by picking the right number`}
        </div>
      </div>

      {/* Wheel */}
      <div className="px-4 py-4 max-w-lg mx-auto">
        <JackpotWheel
          segments={SEGMENTS}
          onSpinRequest={handleSpinRequest}
          disabled={userBalance < BET_PER_SPIN}
        />
      </div>
    </div>
  );
}
