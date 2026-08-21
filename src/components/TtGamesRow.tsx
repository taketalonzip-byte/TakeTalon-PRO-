/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion } from "motion/react";
import TalonLogo from "./TalonLogo";

interface TtGamesRowProps {
  theme: "blue" | "dark" | "light";
  lang?: "en" | "fr" | "sw";
  onSelectOption?: (option: string) => void;
}

// 3D Rotate 1 Streamline Icon for TT Games
const TtGamesIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 14 14"
    id="3d-Rotate-1--Streamline-Flex"
    className={className}
    width="100%"
    height="100%"
  >
    <desc>3d Rotate 1 Streamline Icon: https://streamlinehq.com</desc>
    <g id="3d-rotate-1">
      <path
        id="Subtract"
        fill="currentColor"
        fillRule="evenodd"
        d="M11.975 11.993c-1.021 1.02 -2.433 1.6 -4.148 1.739a0.619 0.619 0 0 0 -0.04 -0.05c-1.07 -1.166 -1.885 -2.799 -2.272 -4.694 0.303 0.019 0.613 0.027 0.93 0.026 2.904 -0.012 5.434 -0.885 7.296 -2.339 0.003 0.112 0.005 0.225 0.005 0.34 0 2.091 -0.59 3.796 -1.771 4.978Zm1.598 -6.821 -0.007 0.007c-1.64 1.557 -4.124 2.573 -7.126 2.585a12.61 12.61 0 0 1 -1.114 -0.043 12.74 12.74 0 0 1 -0.06 -1.225c0 -2.424 0.681 -4.611 1.772 -6.232C9.11 0.272 10.8 0.862 11.975 2.036c0.812 0.812 1.345 1.872 1.598 3.136ZM4.056 7.544c-0.026 -0.345 -0.04 -0.694 -0.04 -1.048 0 -2.28 0.55 -4.4 1.494 -6.122 -1.421 0.22 -2.605 0.774 -3.492 1.662C1.039 3.014 0.466 4.352 0.298 5.97a9.937 9.937 0 0 0 3.758 1.574Zm-3.802 -0.12c0.073 1.906 0.66 3.465 1.764 4.569 1.031 1.031 2.461 1.612 4.2 1.743 -0.978 -1.339 -1.68 -3.024 -2.002 -4.893A11.322 11.322 0 0 1 0.254 7.425Z"
        clipRule="evenodd"
        strokeWidth="1"
      />
    </g>
  </svg>
);

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL.replace(/\/+$/, "")}/storage/v1/object/public/games`
  : "";

const getLabels = (lang: "en" | "fr" | "sw" = "en") => {
  if (lang === "sw") {
    return {
      title: "TT GAMES",
      machine: "Kucheza na Machine",
      twoPlayers: "Kucheza Wawili",
      watchWinner: "Kuangalia Mshindi",
    };
  } else if (lang === "fr") {
    return {
      title: "JEUX TT",
      machine: "Jouer vs Machine",
      twoPlayers: "Mode 2 Joueurs",
      watchWinner: "Regarder Gagnant",
    };
  }
  return {
    title: "TT GAMES",
    machine: "Play vs Machine",
    twoPlayers: "Play 2 Players",
    watchWinner: "Watch Winner",
  };
};

const TtGamesRow = React.memo(function TtGamesRow({
  theme,
  lang = "en",
  onSelectOption,
}: TtGamesRowProps) {
  const labels = getLabels(lang);
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});

  const options = [
    {
      id: "machine",
      label: labels.machine,
      image: `${SUPABASE_URL}/tt-games/play-with-ai.jpg`,
    },
    {
      id: "two-players",
      label: labels.twoPlayers,
      image: `${SUPABASE_URL}/tt-games/multi-player.jpg`,
    },
    {
      id: "watch-winner",
      label: labels.watchWinner,
      image: `${SUPABASE_URL}/tt-games/winning-player.jpg`,
    },
  ];

  const handleSelect = (id: string) => {
    if (onSelectOption) onSelectOption(id);
  };

  return (
    <div className="px-0 pt-0.5 pb-1 animate-fadeIn select-none" id="tt-games-section">
      {/* "TOP-EVENTS" Header Label */}
      <div className="mb-1 pl-1 flex items-center">
        <span
          className={`text-[13px] font-black tracking-wider uppercase ${
            theme === "light"
              ? "text-slate-800"
              : theme === "blue"
                ? "text-white"
                : "text-slate-200"
          }`}
        >
          TOP-EVENTS
        </span>
      </div>

      {/* Single Premium Rounded Container */}
      <div
        className={`w-full rounded-[12px] border py-2 px-3 transition-all duration-300 ${
          theme === "light"
            ? "bg-gradient-to-br from-[#f8fbfe] via-[#f0f5fc] to-[#e6effa] border-slate-200/90 shadow-sm"
            : theme === "blue"
              ? "bg-[#3B6D99] border-blue-400/40"
              : "bg-[#0d0d0d] border-neutral-800/60"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          {/* TT GAMES Brand Block */}
          <div className="flex items-center space-x-2 shrink-0 pl-0.5">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all duration-300 ${
                theme === "light"
                  ? "bg-blue-50 border-blue-100 text-blue-600 shadow-sm"
                  : theme === "blue"
                    ? "bg-blue-900/30 border-[#38bdf8]/30 text-[#38bdf8]"
                    : "bg-blue-950/30 border-blue-900/40 text-sky-400"
              }`}
            >
              <TtGamesIcon className="w-4 h-4" />
            </div>
            <div className="flex items-center space-x-1.5">
              <TalonLogo className="w-7 h-7 shrink-0" glow={false} theme={theme} />
              <span
                className={`text-[9.5px] font-black tracking-widest uppercase leading-none ${
                  theme === "light"
                    ? "text-blue-600"
                    : theme === "blue"
                      ? "text-[#38bdf8]"
                      : "text-sky-400"
                }`}
              >
                GAMES
              </span>
            </div>
          </div>

          {/* Subtle separator */}
          <div
            className={`h-7 w-[1px] ${theme === "light" ? "bg-slate-200" : "bg-white/10"} shrink-0`}
          />

          {/* Three circular image buttons */}
          <div className="flex-1 grid grid-cols-3 gap-1.5 pl-1">
            {options.map((opt) => (
              <motion.button
                key={opt.id}
                id={`tt-opt-${opt.id}`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelect(opt.id)}
                className="flex flex-col items-center justify-center p-0.5 rounded-lg transition-all duration-300 focus:outline-none focus:ring-0 group"
              >
                {/* Circular image badge */}
                <div
                  className={`w-9 h-9 rounded-full overflow-hidden border transition-all duration-300 ${
                    theme === "light"
                      ? "border-slate-100 group-hover:border-blue-200 group-hover:shadow-sm"
                      : theme === "blue"
                        ? "border-white/5 group-hover:border-[#38bdf8]/30"
                        : "border-neutral-800/80 group-hover:border-[#38bdf8]/20"
                  }`}
                >
                  {!loadedImages[opt.id] && (
                    <div
                      className={`w-full h-full animate-pulse ${
                        theme === "light" ? "bg-slate-100" : "bg-neutral-800"
                      }`}
                    />
                  )}
                  <img
                    src={opt.image}
                    alt={opt.label}
                    loading="lazy"
                    onLoad={() => setLoadedImages((prev) => ({ ...prev, [opt.id]: true }))}
                    className={`w-full h-full object-cover transition-opacity duration-300 ${
                      loadedImages[opt.id] ? "opacity-100" : "opacity-0 absolute"
                    }`}
                  />
                </div>

                {/* Label below circle */}
                <span
                  className={`text-[7.5px] leading-tight mt-1 font-bold uppercase tracking-wider text-center max-w-full block select-none line-clamp-2 transition-colors duration-200 ${
                    theme === "light"
                      ? "text-slate-600 group-hover:text-slate-900"
                      : theme === "blue"
                        ? "text-blue-100/75 group-hover:text-white"
                        : "text-slate-400 group-hover:text-slate-100"
                  }`}
                >
                  {opt.label}
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

export default TtGamesRow;
