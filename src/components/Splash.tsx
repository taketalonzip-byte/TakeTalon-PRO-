/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from "react";
import { motion } from "motion/react";
import { RefreshCw, WifiOff } from "lucide-react";
import TalonLogo from "./TalonLogo";

interface SplashProps {
  onComplete: () => void;
  onRetry: () => void;
  isOffline: boolean;
  isCheckingConnection: boolean;
  theme?: "blue" | "dark" | "light";
}

export default function Splash({
  onComplete,
  onRetry,
  isOffline,
  isCheckingConnection,
  theme = "blue",
}: SplashProps) {
  useEffect(() => {
    if (isOffline) return;

    const timer = setTimeout(() => {
      onComplete();
    }, 1400);

    return () => clearTimeout(timer);
  }, [isOffline, onComplete]);

  const bgClass =
    theme === "light"
      ? "bg-[#f8fafc] text-slate-900"
      : theme === "blue"
        ? "bg-[#1f3d5c] text-white"
        : "bg-[#0d0d0d] text-white";

  const textGradient =
    theme === "light"
      ? "bg-gradient-to-r from-slate-900 via-blue-900 to-slate-800 bg-clip-text text-transparent"
      : "bg-gradient-to-r from-blue-300 via-sky-200 to-amber-200 bg-clip-text text-transparent drop-shadow-sm";

  const offlinePanelClass =
    theme === "light"
      ? "border-slate-200 bg-white/80 text-slate-700"
      : "border-white/10 bg-slate-950/20 text-slate-200";

  const buttonClass =
    theme === "light"
      ? "bg-slate-900 text-white hover:bg-slate-800"
      : "bg-white text-slate-900 hover:bg-slate-100";

  return (
    <div
      className={`fixed inset-0 z-[9999] ${bgClass} flex flex-col items-center justify-center overflow-hidden px-6 transition-colors duration-300`}
      role={isOffline ? "alert" : undefined}
      aria-live={isOffline ? "assertive" : undefined}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex w-full max-w-sm flex-col items-center justify-center space-y-4"
      >
        {/* Bundled local asset: this must render before any network request. */}
        <TalonLogo
          className="h-36 w-36"
          glow={theme !== "light"}
          theme={theme}
          localFirst
        />

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-center font-['Montserrat',sans-serif]"
        >
          <h1
            className={`text-xl font-extralight uppercase tracking-[0.65em] pl-[0.65em] ${textGradient}`}
          >
            TAKETALON
          </h1>
        </motion.div>

        {isOffline && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.35 }}
            className={`mt-5 w-full rounded-2xl border px-5 py-5 text-center shadow-xl backdrop-blur-sm ${offlinePanelClass}`}
          >
            <div className="mb-2 flex items-center justify-center gap-2">
              <WifiOff className="h-4 w-4 text-amber-300" aria-hidden="true" />
              <h2 className="text-sm font-extrabold tracking-wide">You're offline</h2>
            </div>
            <p className="text-xs leading-relaxed opacity-80">
              Connect to the internet to continue using TakeTalon.
            </p>
            <button
              type="button"
              onClick={onRetry}
              disabled={isCheckingConnection}
              className={`mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-xs font-extrabold transition-colors disabled:cursor-wait disabled:opacity-60 ${buttonClass}`}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isCheckingConnection ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              {isCheckingConnection ? "Checking connection…" : "Try again"}
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
