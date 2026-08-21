/**
 * CasinoProGame — Wrapper wa michezo 4 ya Provably Fair
 * Inasimamia provably fair seed state na kuonyesha mchezo unaofaa kulingana na slug.
 */

import React, { useState, useCallback } from "react";
import { ArrowLeft } from "lucide-react";
import { createInitialSeed, generateRandomSeed, sha256 } from "@/lib/casino/provablyFair";
import { ProvablyFairSeed } from "@/types/casino";
import { Slot777 } from "@/components/games/Slot777";
import { CrystalGame } from "@/components/games/CrystalGame";
import { DiceGame } from "@/components/games/DiceGame";
import { PlinkoGame } from "@/components/games/PlinkoGame";

type Theme = "blue" | "dark" | "light";
type Lang = "en" | "fr" | "sw";

interface Props {
  slug: string;
  title: string;
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

export default function CasinoProGame({
  slug,
  title,
  userBalance,
  setUserBalance,
  onAddTransaction,
  onAddNotification,
  onBack,
  theme,
  lang = "en",
}: Props) {
  const [seed, setSeed] = useState<ProvablyFairSeed>(createInitialSeed);

  const incrementNonce = useCallback(() => {
    setSeed((prev) => {
      const next = { ...prev, nonce: prev.nonce + 1 };
      // Rotate server seed every 100 bets
      if (next.nonce % 100 === 0) {
        const newServer = generateRandomSeed(64);
        return { ...next, serverSeed: newServer, serverSeedHash: sha256(newServer), nonce: 1 };
      }
      return next;
    });
  }, []);

  const handlePlaceBet = useCallback(
    (
      amountFBU: number,
      payoutFBU: number,
      details: string,
      _gameId: string,
      isWin: boolean,
      _hash: string,
      _multiplier: number,
    ) => {
      const netChange = payoutFBU - amountFBU;
      if (isWin) {
        setUserBalance(userBalance + netChange);
        onAddTransaction("BET_WIN", payoutFBU, `${title}: ${details}`);
        onAddNotification(`🎉 Umeshinda FBU ${payoutFBU.toLocaleString()}!`, "success");
      } else {
        setUserBalance(Math.max(0, userBalance - amountFBU));
        onAddTransaction("BET_PLACE", amountFBU, `${title}: ${details}`);
      }
    },
    [userBalance, setUserBalance, onAddTransaction, onAddNotification, title],
  );

  const bg =
    theme === "light"
      ? "bg-white text-slate-900"
      : theme === "blue"
        ? "bg-[#1f3d5c] text-white"
        : "bg-[#141414] text-white";

  const headerBg =
    theme === "light"
      ? "bg-white border-b border-slate-200"
      : "bg-black/40 border-b border-white/[0.06]";

  const sharedProps = {
    balanceFBU: userBalance,
    serverSeed: seed.serverSeed,
    serverSeedHash: seed.serverSeedHash,
    clientSeed: seed.clientSeed,
    nonce: seed.nonce,
    incrementNonce,
    onOpenVerifier: () => {},
  };

  const onPlaceBetSlot = (
    a: number,
    p: number,
    d: string,
    g: "slot777",
    w: boolean,
    h: string,
    m: number,
  ) => handlePlaceBet(a, p, d, g, w, h, m);
  const onPlaceBetCrystal = (
    a: number,
    p: number,
    d: string,
    g: "crystal",
    w: boolean,
    h: string,
    m: number,
  ) => handlePlaceBet(a, p, d, g, w, h, m);
  const onPlaceBetDice = (
    a: number,
    p: number,
    d: string,
    g: "dice",
    w: boolean,
    h: string,
    m: number,
  ) => handlePlaceBet(a, p, d, g, w, h, m);
  const onPlaceBetPlinko = (
    a: number,
    p: number,
    d: string,
    g: "plinko",
    w: boolean,
    h: string,
    m: number,
  ) => handlePlaceBet(a, p, d, g, w, h, m);

  return (
    <div className={`min-h-screen flex flex-col ${bg}`}>
      {/* Header */}
      <div className={`flex items-center gap-3 px-4 py-3 shrink-0 ${headerBg}`}>
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors"
          aria-label="Rudi"
        >
          <ArrowLeft size={16} />
        </button>
        <span className="font-bold text-sm tracking-wide">{title}</span>
        <span className="ml-auto text-xs font-mono text-amber-400">
          FBU {userBalance.toLocaleString()}
        </span>
      </div>

      {/* Game */}
      <div className="flex-1 overflow-y-auto p-3">
        {slug === "slot777" && <Slot777 {...sharedProps} onPlaceBet={onPlaceBetSlot} />}
        {(slug === "crystal-mine" || slug === "crystal") && (
          <CrystalGame {...sharedProps} onPlaceBet={onPlaceBetCrystal} />
        )}
        {slug === "provably-dice" && <DiceGame {...sharedProps} onPlaceBet={onPlaceBetDice} />}
        {slug === "plinko-pyramid" && <PlinkoGame {...sharedProps} onPlaceBet={onPlaceBetPlinko} />}
      </div>
    </div>
  );
}
