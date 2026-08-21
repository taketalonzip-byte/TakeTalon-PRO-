/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import TalonLogo from "./TalonLogo";

interface SplashProps {
  onComplete: () => void;
  theme?: "blue" | "dark" | "light";
}

export default function Splash({ onComplete, theme = "blue" }: SplashProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 1400);

    return () => clearTimeout(timer);
  }, [onComplete]);

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

  return (
    <div
      className={`fixed inset-0 z-[9999] ${bgClass} flex flex-col items-center justify-center overflow-hidden transition-colors duration-300`}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.05 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex flex-col items-center justify-center space-y-4"
      >
        {/* Fail-safe TalonLogo */}
        <TalonLogo
          className="w-36 h-36"
          glow={theme !== "light"}
          theme={theme}
        />

        {/* Brand Text */}
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
      </motion.div>
    </div>
  );
}

