/**
 * TakeTalon — Casino mini-games (simple/lightweight)
 * Michezo myepesi ya casino: Dice / Wheel / Slots kulingana na slug.
 * Haitumii dependencies nyingi — animation ya CSS/motion tu.
 */

import React, { useState, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, Coins, Sparkles } from "lucide-react";
import { Loader2 } from "lucide-react";
import { CasinoGameSkeleton } from "@/components/skeletons";

// Lazy-load mchezo wa jackpot (una dependencies kubwa — canvas, confetti, n.k.)
const JackpotWheelGame = lazy(() => import("@/components/jackpot/JackpotWheelGame"));

// Lazy-load michezo 4 mipya ya Provably Fair
const CasinoProGame = lazy(() => import("@/components/CasinoProGame"));

const PRO_SLUGS = new Set([
  "slot777",
  "crystal",
  "crystal-mine",
  "provably-dice",
  "plinko-pyramid",
]);

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

type GameKind = "dice" | "wheel" | "slots" | "coin" | "over-under";

function kindOf(slug: string): GameKind {
  if (slug === "over-under-7") return "over-under";
  if (slug === "jackpot-wheel") return "wheel";
  if (slug === "burning-hot") return "slots";
  if (slug === "tennis-game" || slug === "war-combat") return "coin";
  return "dice";
}

const SLOT_SYMBOLS = ["🍒", "🍋", "🔔", "⭐", "💎", "7️⃣"];

export default function CasinoGamePlay({
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
  // ── Michezo 4 mipya ya Provably Fair ─────────────────────────────────────
  if (PRO_SLUGS.has(slug)) {
    return (
      <Suspense fallback={<CasinoGameSkeleton theme={theme} />}>
        <CasinoProGame
          slug={slug}
          title={title}
          userBalance={userBalance}
          setUserBalance={setUserBalance}
          onAddTransaction={onAddTransaction}
          onAddNotification={onAddNotification}
          onBack={onBack}
          theme={theme}
          lang={lang}
        />
      </Suspense>
    );
  }

  // ── Jackpot Wheel: toa JackpotWheelGame inayostahili ──────────────────────
  if (slug === "jackpot-wheel") {
    return (
      <Suspense fallback={<CasinoGameSkeleton theme={theme} />}>
        <JackpotWheelGame
          userBalance={userBalance}
          setUserBalance={setUserBalance}
          onAddTransaction={onAddTransaction}
          onAddNotification={onAddNotification}
          onBack={onBack}
          theme={theme}
          lang={lang}
        />
      </Suspense>
    );
  }

  const kind = kindOf(slug);
  const [bet, setBet] = useState(100);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string>("");
  const [lastWin, setLastWin] = useState<number>(0);
  const [choice, setChoice] = useState<
    "over" | "seven" | "under" | "heads" | "tails" | "even" | "odd"
  >("over");
  const [reels, setReels] = useState<string[]>(["🍒", "🍋", "⭐"]);
  const [wheelAngle, setWheelAngle] = useState(0);

  const bg = theme === "dark" ? "bg-neutral-950" : theme === "light" ? "bg-white" : "bg-[#0b1220]";
  const card = theme === "light" ? "bg-neutral-100 text-neutral-900" : "bg-white/5 text-white";
  const btnPrimary =
    "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold";
  const chip = theme === "light" ? "bg-neutral-200 text-neutral-900" : "bg-white/10 text-white";

  const label = {
    bet: lang === "sw" ? "Kiasi cha Dau" : lang === "fr" ? "Mise" : "Bet",
    play: lang === "sw" ? "Cheza" : lang === "fr" ? "Jouer" : "Play",
    balance: lang === "sw" ? "Salio" : lang === "fr" ? "Solde" : "Balance",
    win: lang === "sw" ? "Umeshinda" : lang === "fr" ? "Gagné" : "You won",
    lose: lang === "sw" ? "Umeshindwa" : lang === "fr" ? "Perdu" : "You lost",
    lowBal:
      lang === "sw"
        ? "Salio halitoshi"
        : lang === "fr"
          ? "Solde insuffisant"
          : "Insufficient balance",
    back: lang === "sw" ? "Rudi" : lang === "fr" ? "Retour" : "Back",
  };

  const rand = () => Math.random();

  async function play() {
    if (busy) return;
    if (bet <= 0) return;
    if (userBalance < bet) {
      onAddNotification(label.lowBal, "error");
      return;
    }
    setBusy(true);
    setResult("");
    setLastWin(0);
    setUserBalance(userBalance - bet);
    onAddTransaction("BET_PLACE", bet, `${title} — bet`);

    let win = 0;
    let outcomeText = "";

    if (kind === "dice") {
      const d1 = Math.floor(rand() * 6) + 1;
      const d2 = Math.floor(rand() * 6) + 1;
      await new Promise((r) => setTimeout(r, 700));
      setReels([`🎲${d1}`, `🎲${d2}`, ""]);
      const sum = d1 + d2;
      // Simple: sum >= 8 → 2x, sum == 7 → 3x, else lose
      if (sum === 7) win = bet * 3;
      else if (sum >= 8) win = bet * 2;
      outcomeText = `${d1} + ${d2} = ${sum}`;
    } else if (kind === "over-under") {
      const d1 = Math.floor(rand() * 6) + 1;
      const d2 = Math.floor(rand() * 6) + 1;
      await new Promise((r) => setTimeout(r, 700));
      setReels([`🎲${d1}`, `🎲${d2}`, ""]);
      const sum = d1 + d2;
      if (choice === "seven" && sum === 7) win = bet * 4;
      else if (choice === "over" && sum > 7) win = Math.floor(bet * 1.9);
      else if (choice === "under" && sum < 7) win = Math.floor(bet * 1.9);
      outcomeText = `${d1} + ${d2} = ${sum}`;
    } else if (kind === "slots") {
      // Animate spin
      for (let i = 0; i < 8; i++) {
        setReels([
          SLOT_SYMBOLS[Math.floor(rand() * SLOT_SYMBOLS.length)],
          SLOT_SYMBOLS[Math.floor(rand() * SLOT_SYMBOLS.length)],
          SLOT_SYMBOLS[Math.floor(rand() * SLOT_SYMBOLS.length)],
        ]);
        await new Promise((r) => setTimeout(r, 90));
      }
      const final = [
        SLOT_SYMBOLS[Math.floor(rand() * SLOT_SYMBOLS.length)],
        SLOT_SYMBOLS[Math.floor(rand() * SLOT_SYMBOLS.length)],
        SLOT_SYMBOLS[Math.floor(rand() * SLOT_SYMBOLS.length)],
      ];
      setReels(final);
      if (final[0] === final[1] && final[1] === final[2]) {
        win = final[0] === "7️⃣" ? bet * 10 : bet * 5;
      } else if (final[0] === final[1] || final[1] === final[2]) {
        win = Math.floor(bet * 1.5);
      }
      outcomeText = final.join(" ");
    } else if (kind === "wheel") {
      // Spin wheel: 8 sections with multipliers
      const mults = [0, 0, 1.5, 0, 2, 0, 3, 0];
      const idx = Math.floor(rand() * mults.length);
      const angle = 360 * 6 + idx * (360 / mults.length);
      setWheelAngle(angle);
      await new Promise((r) => setTimeout(r, 1500));
      win = Math.floor(bet * mults[idx]);
      outcomeText = mults[idx] > 0 ? `x${mults[idx]}` : "—";
    } else if (kind === "coin") {
      const flip: "heads" | "tails" = rand() < 0.5 ? "heads" : "tails";
      await new Promise((r) => setTimeout(r, 600));
      setReels([flip === "heads" ? "🪙H" : "🪙T", "", ""]);
      if (choice === "heads" || choice === "tails") {
        if (flip === choice) win = Math.floor(bet * 1.9);
      }
      outcomeText = flip.toUpperCase();
    }

    if (win > 0) {
      setUserBalance(userBalance - bet + win);
      onAddTransaction("BET_WIN", win, `${title} — win`);
      setLastWin(win);
      setResult(`${label.win} +FBU ${win.toLocaleString()} · ${outcomeText}`);
      onAddNotification(`${label.win} FBU ${win.toLocaleString()}`, "success");
    } else {
      setResult(`${label.lose} · ${outcomeText}`);
    }
    setBusy(false);
  }

  const quick = [50, 100, 500, 1000, 5000];

  return (
    <div className={`min-h-screen ${bg} pb-24`}>
      <div className="sticky top-0 z-10 backdrop-blur bg-black/40 border-b border-white/10 px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-full bg-white/10 text-white">
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-white font-bold text-lg flex-1 truncate">{title}</h2>
        <div
          className={`px-3 py-1.5 rounded-full text-sm font-semibold flex items-center gap-1 ${chip}`}
        >
          <Coins size={14} className="text-amber-400" />
          FBU {userBalance.toLocaleString()}
        </div>
      </div>

      <div className="px-4 py-6 max-w-lg mx-auto">
        {/* Stage */}
        <div
          className={`${card} rounded-3xl p-6 shadow-xl min-h-[240px] flex flex-col items-center justify-center`}
        >
          {kind === "wheel" ? (
            <div className="relative w-52 h-52">
              <motion.div
                animate={{ rotate: wheelAngle }}
                transition={{ duration: 1.4, ease: "easeOut" }}
                className="w-full h-full rounded-full border-4 border-amber-500"
                style={{
                  background:
                    "conic-gradient(#f59e0b 0 45deg,#111 45deg 90deg,#10b981 90deg 135deg,#111 135deg 180deg,#3b82f6 180deg 225deg,#111 225deg 270deg,#ef4444 270deg 315deg,#111 315deg 360deg)",
                }}
              />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-2 w-0 h-0 border-l-8 border-r-8 border-t-[16px] border-l-transparent border-r-transparent border-t-amber-500" />
            </div>
          ) : (
            <div className="flex gap-3 text-5xl">
              {reels.filter(Boolean).map((r, i) => (
                <motion.div
                  key={`${i}-${r}`}
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="min-w-[60px] h-[80px] rounded-xl bg-black/40 flex items-center justify-center border border-white/10"
                >
                  {r || "❔"}
                </motion.div>
              ))}
              {reels.every((r) => !r) && (
                <div className="text-white/40 text-lg flex items-center gap-2">
                  <Sparkles size={20} /> {title}
                </div>
              )}
            </div>
          )}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`mt-4 font-bold text-center ${lastWin > 0 ? "text-emerald-400" : "text-rose-400"}`}
              >
                {result}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Choice picker */}
        {kind === "over-under" && (
          <div className="mt-4 grid grid-cols-3 gap-2">
            {(["under", "seven", "over"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setChoice(c)}
                className={`py-2 rounded-xl font-semibold text-sm ${
                  choice === c ? "bg-amber-500 text-black" : chip
                }`}
              >
                {c === "under" ? "< 7 (1.9x)" : c === "seven" ? "= 7 (4x)" : "> 7 (1.9x)"}
              </button>
            ))}
          </div>
        )}
        {kind === "coin" && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {(["heads", "tails"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setChoice(c)}
                className={`py-2 rounded-xl font-semibold text-sm ${
                  choice === c ? "bg-amber-500 text-black" : chip
                }`}
              >
                {c === "heads" ? "Heads (1.9x)" : "Tails (1.9x)"}
              </button>
            ))}
          </div>
        )}

        {/* Bet controls */}
        <div className={`mt-4 ${card} rounded-2xl p-4`}>
          <div className="text-sm opacity-70 mb-2">{label.bet} (FBU)</div>
          <input
            type="number"
            min={10}
            value={bet}
            onChange={(e) => setBet(Math.max(10, Number(e.target.value) || 0))}
            className="w-full bg-black/30 text-white rounded-xl px-4 py-3 outline-none border border-white/10"
          />
          <div className="flex gap-2 mt-2 flex-wrap">
            {quick.map((q) => (
              <button
                key={q}
                onClick={() => setBet(q)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold ${chip}`}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={play}
          disabled={busy}
          className={`w-full mt-4 py-4 rounded-2xl text-lg ${btnPrimary} disabled:opacity-60`}
        >
          {busy ? "…" : `${label.play} · FBU ${bet.toLocaleString()}`}
        </button>
      </div>
    </div>
  );
}
