/**
 * TakeTalon — UnlockButton (v2)
 *
 * States kutoka kwa X (unlocker/anayetaka kufungua):
 *   none/cancelled/rejected → "Unlock"
 *   pending                 → "Waiting..." + Cancel
 *   active                  → "Unlocking" + Cancel
 *
 * States kutoka kwa Y (unlocked/anayeombwa):
 *   pending → "Accept" + "Reject"
 *   active  → "Accepted ✓"
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Unlock, Loader2, X, Check, LockOpen, Clock } from "lucide-react";
import { UnlockRecord } from "../lib/unlockService";

interface UnlockButtonProps {
  theme: "blue" | "dark" | "light";
  record: UnlockRecord | null;
  iAmUnlocker: boolean;
  iAmUnlocked: boolean;
  onUnlock: () => Promise<void | boolean>;
  onCancel: (id: string) => Promise<void | boolean>;
  onAccept: (id: string) => Promise<void | boolean>;
  onReject: (id: string) => Promise<void | boolean>;
  isPro: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}

export default function UnlockButton({
  theme,
  record,
  iAmUnlocker,
  iAmUnlocked,
  onUnlock,
  onCancel,
  onAccept,
  onReject,
  isPro,
  disabled = false,
  fullWidth = false,
}: UnlockButtonProps) {
  const [busy, setBusy] = useState(false);

  const wrap = async (fn: () => Promise<void | boolean>) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  const dim = theme === "light";
  const base = fullWidth
    ? "w-full py-1.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer focus:outline-none active:scale-[0.98] flex items-center justify-center gap-1.5"
    : "flex items-center gap-1 px-3 py-1 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer focus:outline-none active:scale-95 shrink-0";

  // ── Y anaona: X amemfungulia mlango (status: active) ────────────────────────
  if (record && iAmUnlocked && record.status === "active") {
    return (
      <div className={fullWidth ? "w-full flex items-center gap-2" : "flex items-center gap-1.5"}>
        <div
          className={`${fullWidth ? "flex-1 justify-center" : ""} flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9.5px] font-black uppercase tracking-wider ${
            dim
              ? "text-emerald-600 bg-emerald-50 border border-emerald-200"
              : "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
          }`}
        >
          <LockOpen className="w-3 h-3 text-emerald-500" />
          <span>Unlocked</span>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          disabled={busy}
          onClick={() => wrap(() => onCancel(record.id))}
          title="Supprimer / Futa Unlock"
          className={`${base} ${
            dim
              ? "bg-red-100 text-red-600 border border-red-200 hover:bg-red-200"
              : "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
          }`}
        >
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
          <span>Supprimer</span>
        </motion.button>
      </div>
    );
  }

  // ── X anaona: Unlocking active (X amefungulia Y) ───────────────────────────
  if (record && iAmUnlocker && record.status === "active") {
    return (
      <div className={fullWidth ? "w-full flex items-center gap-2" : "flex items-center gap-1.5"}>
        <div
          className={`${fullWidth ? "flex-1 justify-center" : ""} flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9.5px] font-black uppercase tracking-wider ${
            dim
              ? "text-blue-600 bg-blue-50 border border-blue-200"
              : "text-[#38bdf8] bg-blue-500/10 border border-blue-500/20"
          }`}
        >
          <LockOpen className="w-3 h-3 text-blue-400" />
          <span>Unlocking</span>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          disabled={busy}
          onClick={() => wrap(() => onCancel(record.id))}
          title="Supprimer / Futa Unlock"
          className={`${base} ${
            dim
              ? "bg-red-100 text-red-600 border border-red-200 hover:bg-red-200"
              : "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
          }`}
        >
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
          <span>Supprimer</span>
        </motion.button>
      </div>
    );
  }

  // ── Default: hakuna relationship / cancelled / rejected → Unlock ─────────────
  return (
    <AnimatePresence mode="wait">
      <motion.button
        key="unlock-btn"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          wrap(onUnlock);
        }}
        className={`${base} bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white border border-blue-400/40 shadow-md shadow-blue-600/20 ${
          disabled || busy ? "opacity-60 cursor-not-allowed" : ""
        }`}
      >
        {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Unlock className="w-3 h-3" />}
        <span>Unlock</span>
      </motion.button>
    </AnimatePresence>
  );
}
