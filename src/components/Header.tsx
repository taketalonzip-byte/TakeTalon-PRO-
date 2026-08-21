/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { X, Search, Gamepad2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
interface HeaderProps {
  activeSubTab: "Kwako" | "Unlockers";
  setActiveSubTab: (tab: "Kwako" | "Unlockers") => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  userBalance: number;
  isPro: boolean;
  onUpgradeClick: () => void;
  onProfileClick: () => void;
  eyeComfort: boolean;
  setEyeComfort: (val: boolean) => void;
  t: any;
  lang: string;
  theme: "blue" | "dark" | "light";
  isLoggedIn?: boolean;
  onLoginClick?: () => void;
  onRegisterClick?: () => void;
  shakeTrigger?: number;
  onShakeTrigger?: () => void;
  onNotificationsClick?: () => void;
  unreadCount?: number;
  username?: string;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  selectedSport: string;
  setSelectedSport: (sport: string) => void;
  setSelectedLeague?: (league: string) => void;
  setSelectedSubLeague?: (subLeague: string) => void;
  selectedTopTab?: "All" | "Sports" | "eSports" | "Casino" | "TT Games";
  setSelectedTopTab?: (tab: "All" | "Sports" | "eSports" | "Casino" | "TT Games") => void;
}

export default function Header({
  activeSubTab,
  setActiveSubTab,
  searchQuery,
  setSearchQuery,
  userBalance,
  isPro,
  onUpgradeClick,
  onProfileClick,
  eyeComfort,
  setEyeComfort,
  t,
  lang,
  theme,
  isLoggedIn = false,
  onLoginClick,
  onRegisterClick,
  shakeTrigger = 0,
  onShakeTrigger,
  onNotificationsClick,
  unreadCount = 0,
  username = "",
  activeTab,
  setActiveTab,
  selectedSport,
  setSelectedSport,
  setSelectedLeague,
  setSelectedSubLeague,
  selectedTopTab = "All",
  setSelectedTopTab,
}: HeaderProps) {
  const [showSearch, setShowSearch] = useState(false);
  const [showName, setShowName] = useState(false);
  const nameTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showBalance, setShowBalance] = useState(false);
  const balanceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Guard: kila kitufe/icon kinahitaji login — otherwise tetemesha login/register
  const guardedClick = (action: () => void) => {
    if (!isLoggedIn) {
      if (onShakeTrigger) onShakeTrigger();
      return;
    }
    action();
  };

  const handleAddIconClick = () => {
    if (!isLoggedIn) {
      if (onShakeTrigger) {
        onShakeTrigger();
      }
      return;
    }

    if (balanceTimeoutRef.current) {
      clearTimeout(balanceTimeoutRef.current);
    }

    const nextShowBalance = !showBalance;
    setShowBalance(nextShowBalance);

    if (nextShowBalance) {
      balanceTimeoutRef.current = setTimeout(() => {
        setShowBalance(false);
      }, 4000); // hides after 4 seconds
    }
  };

  const handleProfileIconClick = () => {
    if (nameTimeoutRef.current) {
      clearTimeout(nameTimeoutRef.current);
    }

    const nextShowName = !showName;
    setShowName(nextShowName);

    if (nextShowName) {
      nameTimeoutRef.current = setTimeout(() => {
        setShowName(false);
      }, 4000); // hides after 4 seconds
    }
  };

  useEffect(() => {
    return () => {
      if (nameTimeoutRef.current) {
        clearTimeout(nameTimeoutRef.current);
      }
      if (balanceTimeoutRef.current) {
        clearTimeout(balanceTimeoutRef.current);
      }
    };
  }, []);

  // Styling maps based on theme - upgraded to award-winning luxury glassmorphism and OLED darks
  const headerBg =
    theme === "light"
      ? "bg-gradient-to-r from-[#f8fbfe]/95 via-[#f0f5fc]/95 to-[#e6effa]/95 backdrop-blur-lg border-b border-slate-200/90 shadow-sm"
      : theme === "dark"
        ? "bg-[#0d0d0d]/95 backdrop-blur-lg border-b border-neutral-800/60"
        : "bg-[#3B6D99]/95 backdrop-blur-lg border-b border-blue-400/30";

  const balanceBtnClass =
    theme === "light"
      ? "bg-slate-50 border border-slate-300 text-slate-800 hover:bg-slate-100"
      : theme === "dark"
        ? "bg-neutral-900/85 border border-neutral-850 text-slate-100 hover:bg-neutral-800"
        : "bg-white/10 border border-white/25 hover:bg-white/15 text-slate-100";

  const iconBtnClass =
    theme === "light"
      ? "bg-slate-50 border border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-100/90 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
      : theme === "dark"
        ? "bg-neutral-900/80 border border-neutral-850 text-slate-400 hover:text-white hover:bg-neutral-800"
        : "bg-white/10 border border-white/20 text-blue-50 hover:text-white hover:bg-white/15";

  const searchInputClass =
    theme === "light"
      ? "w-full bg-slate-50/50 text-[11px] font-medium border border-slate-300 rounded-lg pl-8 pr-8 py-1.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 shadow-sm transition-all duration-200"
      : theme === "dark"
        ? "w-full bg-[#0a0a0a] text-[11px] font-medium border border-neutral-850 rounded-lg pl-8 pr-8 py-1.5 text-slate-200 placeholder-slate-550 focus:outline-none focus:bg-black focus:border-neutral-700 focus:ring-2 focus:ring-neutral-700/10 transition-all duration-200"
        : "w-full bg-white/10 text-[11px] font-medium border border-white/20 rounded-lg pl-8 pr-8 py-1.5 text-white placeholder-blue-100 focus:outline-none focus:bg-white/15 focus:border-white/30 focus:ring-2 focus:ring-white/15 transition-all duration-200";

  const tabContainerClass =
    theme === "light"
      ? "bg-slate-100/85 p-0.75 rounded-full flex space-x-1.5 border border-slate-300"
      : theme === "dark"
        ? "bg-neutral-950/95 p-0.75 rounded-full flex space-x-1.5 border border-neutral-900/55"
        : "bg-black/15 p-0.75 rounded-full flex space-x-1.5 border border-white/10";

  const getCategoryIconColor = (isActive: boolean) => {
    if (isActive) {
      if (theme === "light") return "text-blue-600";
      if (theme === "blue") return "text-white";
      return "text-sky-400";
    }
    if (theme === "light") return "text-slate-400 hover:text-slate-800";
    if (theme === "blue") return "text-blue-100/70 hover:text-white";
    return "text-slate-500 hover:text-slate-300";
  };

  return (
    <header
      className={`sticky top-0 z-40 px-3 pt-1.5 pb-0.5 transition-colors duration-300 ${headerBg}`}
    >
      <div className="relative flex items-center justify-between h-8">
        {/* Left Side: Elegant Balance Toggle Add Button */}
        <div className="flex items-center">
          <motion.button
            layout
            id="balance-toggle-btn"
            onClick={handleAddIconClick}
            className={`flex items-center h-7 rounded-full border p-1 px-2.5 shadow-sm cursor-pointer backdrop-blur-md transition-all duration-300 active:scale-95 ${
              theme === "light"
                ? "bg-slate-50 border-slate-300 text-slate-600 hover:text-slate-950 hover:bg-slate-100"
                : theme === "dark"
                  ? "bg-neutral-900/85 border border-neutral-850 text-slate-500 hover:text-slate-300 hover:bg-neutral-800"
                  : "bg-white/10 border border-white/20 text-blue-50 hover:text-white hover:bg-white/15"
            }`}
            style={{ outline: "none" }}
          >
            {/* The custom Add Icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 256 256"
              className={`w-4 h-4 fill-currentColor shrink-0 transition-colors duration-200 ${getCategoryIconColor(showBalance)}`}
            >
              <path d="M128,24A104,104,0,1,0,232,128,104.13,104.13,0,0,0,128,24Zm40,112H136v32a8,8,0,0,1-16,0V136H88a8,8,0,0,1,0-16h32V88a8,8,0,0,1,16,0v32h32a8,8,0,0,1,0,16Z" />
            </svg>

            {/* Sliding balance display */}
            <AnimatePresence initial={false}>
              {showBalance && (
                <motion.div
                  initial={{ width: 0, opacity: 0, marginLeft: 0 }}
                  animate={{ width: "auto", opacity: 1, marginLeft: 5 }}
                  exit={{ width: 0, opacity: 0, marginLeft: 0 }}
                  transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden whitespace-nowrap flex items-center"
                >
                  <span
                    className={`text-[9.5px] font-mono font-black tracking-tight text-emerald-400 dark:text-emerald-400`}
                  >
                    FBU {userBalance.toLocaleString()}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>

        {/* Absolute Centered "TT" Logo (Slightly larger) */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center cursor-pointer">
          <picture className="flex items-center justify-center">
            {import.meta.env.VITE_SUPABASE_URL && (
              <source
                srcSet={`${import.meta.env.VITE_SUPABASE_URL.replace(/\/+$/, "")}/storage/v1/object/public/esports-images/tt-logo.png`}
              />
            )}
            <img
              src={
                import.meta.env.VITE_SUPABASE_URL
                  ? `${import.meta.env.VITE_SUPABASE_URL.replace(/\/+$/, "")}/storage/v1/object/public/esports-images/tt-logo.png`
                  : "/tt-logo.png"
              }
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/tt-logo.png";
              }}
              alt="TakeTalon Logo"
              className={`w-12 h-12 object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] transition-all duration-300 ${
                theme === "dark" ? "invert brightness-110 contrast-125" : ""
              }`}
            />
          </picture>
        </div>

        {/* Header Right elements */}
        <div className="flex items-center space-x-2">
          {/* Search trigger */}
          <button
            id="search-trigger-btn"
            onClick={() => {
              if (!isLoggedIn) {
                if (onProfileClick) {
                  onProfileClick();
                }
              } else {
                setShowSearch(!showSearch);
              }
            }}
            className="p-1 transition-colors cursor-pointer flex items-center justify-center bg-transparent border-none outline-none shadow-none"
            style={{ width: "28px", height: "28px" }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={showSearch ? "close" : "search"}
                initial={{ rotate: -60, opacity: 0, scale: 0.7 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                exit={{ rotate: 60, opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="flex items-center justify-center"
              >
                {showSearch ? (
                  <X
                    className={`w-4.5 h-4.5 transition-colors ${getCategoryIconColor(showSearch)}`}
                  />
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className={`w-5.5 h-5.5 transition-colors ${getCategoryIconColor(showSearch)}`}
                  >
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M14 3.072a8 8 0 0 1 2.32 11.834l5.387 5.387a1 1 0 0 1 -1.414 1.414l-5.388 -5.387a8 8 0 1 1 -.905 -13.249" />
                  </svg>
                )}
              </motion.div>
            </AnimatePresence>
          </button>
        </div>
      </div>

      {/* Expandable team/league search bar */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ scaleY: 0, opacity: 0 }}
            animate={{ scaleY: 1, opacity: 1 }}
            exit={{ scaleY: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="overflow-hidden mt-2 origin-top will-change-transform"
            style={{ transformOrigin: "top" }}
          >
            <div className="relative">
              <input
                id="search-input-field"
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={searchInputClass}
              />
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
              {searchQuery && (
                <button
                  id="clear-search-btn"
                  onClick={() => setSearchQuery("")}
                  className={`absolute right-2.5 top-2.5 hover:text-slate-950 transition-colors ${theme === "light" ? "text-slate-400" : "text-slate-400 hover:text-white"}`}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Conditional Subtabs OR Login/Register Button Bar (Exactly like user request and attachment) */}
      {!isLoggedIn && (
        <div className="flex justify-center mt-2 pt-2 px-1">
          <motion.div
            key={shakeTrigger}
            animate={shakeTrigger > 0 ? { x: [0, -10, 10, -10, 10, -5, 5, 0] } : {}}
            transition={{ duration: 0.4 }}
            className="flex items-center justify-between w-full max-w-md space-x-3"
          >
            {/* Se connecter / Login button (Comfortable Blue) */}
            <button
              onClick={onLoginClick}
              className={`flex-1 py-1 px-4 rounded-full text-[9.5px] font-display font-black uppercase tracking-wider text-center transition-all hover:scale-[1.01] active:scale-[0.98] cursor-pointer shadow-sm text-white bg-blue-600 hover:bg-blue-500 shadow-blue-500/5 border border-blue-500/10`}
            >
              {lang === "fr" ? "Se connecter" : lang === "sw" ? "Ingia" : "Log In"}
            </button>

            {/* Inscription / Register button (Beautiful Bright Green) */}
            <button
              onClick={onRegisterClick}
              className={`flex-1 py-1 px-4 rounded-full text-[9.5px] font-display font-black uppercase tracking-wider text-center transition-all hover:scale-[1.01] active:scale-[0.98] cursor-pointer shadow-sm text-white bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/5 border border-emerald-500/10`}
            >
              {lang === "fr" ? "Inscription" : lang === "sw" ? "Jisajili" : "Register"}
            </button>
          </motion.div>
        </div>
      )}

      {/* 5-item Top Navigation Category Bar */}
      {selectedSport !== "Football" ? (
        <div
          className={`mt-1 pt-0.5 pb-0.5 px-0.5 flex items-center justify-between w-full border-t border-transparent`}
        >
          <div className="grid grid-cols-5 gap-1.5 w-full">
            {/* 1. All */}
            <button
              onClick={() =>
                guardedClick(() => {
                  setActiveTab("Home");
                  if (setSelectedTopTab) setSelectedTopTab("All");
                  setSelectedSport("All");
                  if (setSelectedLeague) setSelectedLeague("All");
                  if (setSelectedSubLeague) setSelectedSubLeague("All");
                })
              }
              className="w-8.5 h-8.5 flex items-center justify-center mx-auto transition-all duration-300 cursor-pointer border-none bg-transparent hover:bg-transparent shadow-none outline-none"
              title="All"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 256 256"
                className={`w-7 h-7 transition-colors ${getCategoryIconColor(activeTab === "Home" && selectedTopTab === "All")}`}
              >
                <path
                  d="M225.86,102.82c-3.77-3.94-7.67-8-9.14-11.57-1.36-3.27-1.44-8.69-1.52-13.94-.15-9.76-.31-20.82-8-28.51s-18.75-7.85-28.51-8c-5.25-.08-10.67-.16-13.94-1.52-3.56-1.47-7.63-5.37-11.57-9.14C146.28,23.51,138.44,16,128,16s-18.27,7.51-25.18,14.14c-3.94,3.77-8,7.67-11.57,9.14C88,40.64,82.56,40.72,77.31,40.8c-9.76.15-20.82.31-28.51,8S41,67.55,40.8,77.31c-.08,5.25-.16,10.67-1.52,13.94-1.47,3.56-5.37,7.63-9.14,11.57C23.51,109.72,16,117.56,16,128s7.51,18.27,14.14,25.18c3.77,3.94,7.67,8,9.14,11.57,1.36,3.27,1.44,8.69,1.52,13.94.15,9.76.31,20.82,8,28.51s18.75,7.85,28.51,8c5.25.08,10.67.16,13.94,1.52,3.56,1.47,7.63,5.37,11.57,9.14C109.72,232.49,117.56,240,128,240s18.27-7.51,25.18-14.14c3.94-3.77,8-7.67,11.57-9.14,3.27-1.36,8.69-1.44,13.94-1.52,9.76-.15,20.82-.31,28.51-8s7.85-18.75,8-28.51c.08-5.25.16-10.67,1.52-13.94,1.47-3.56,5.37-7.63,9.14-11.57C232.49,146.28,240,138.44,240,128S232.49,109.73,225.86,102.82Zm-52.2,6.84-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35a8,8,0,0,1,11.32,11.32Z"
                  fill="currentColor"
                />
              </svg>
            </button>

            {/* 2. Sport */}
            <button
              onClick={() =>
                guardedClick(() => {
                  setActiveTab("Home");
                  if (setSelectedTopTab) setSelectedTopTab("Sports");
                  setSelectedSport("All");
                  if (setSelectedLeague) setSelectedLeague("All");
                  if (setSelectedSubLeague) setSelectedSubLeague("All");
                })
              }
              className="w-8.5 h-8.5 flex items-center justify-center mx-auto transition-all duration-300 cursor-pointer border-none bg-transparent hover:bg-transparent shadow-none outline-none"
              title="Sports"
            >
              <svg
                role="img"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                className={`w-7 h-7 transition-colors ${getCategoryIconColor(activeTab === "Home" && selectedTopTab === "Sports")}`}
              >
                <title>Premier League</title>
                <path
                  d="M11.176 0s-0.681 1.938 -0.867 2.527C9.844 2.202 8.386 1.194 7.78 0.775c0.14 0.806 0.356 2.124 0.403 2.403 -0.124 -0.093 -0.821 -0.698 -1.875 -1.194 0.589 0.682 1.008 1.736 1.271 2.588a10.566 10.566 0 0 1 5.238 -1.379c0.977 0 1.94 0.14 2.854 0.403 0.093 -0.884 0.279 -1.968 0.682 -2.758 -0.915 0.728 -1.474 1.503 -1.551 1.596 -0.031 -0.186 -0.093 -1.52 -0.17 -2.434 -0.372 0.403 -1.8 2.016 -2.063 2.264C12.384 1.938 11.176 0 11.176 0zm1.674 3.86c-1.674 0 -3.3 0.386 -4.696 1.115 0.713 0.046 1.224 0.668 1.395 1.164 -0.558 -0.45 -1.442 -0.667 -1.985 -0.078 -0.511 0.589 -0.464 1.688 0.047 2.572 -1.193 -0.605 -1.194 -2.185 -0.775 -2.867A10.392 10.392 0 0 0 3.61 9.594l1.07 0.172c-1.24 1.426 -2.107 3.953 -2.107 5.146l1.75 -0.543c-0.31 1.054 -0.401 4.602 0.653 6.385 0 0 1.38 -0.96 2.945 -3.363 0.65 2.17 0.356 3.985 0 5.767 2.82 1.581 6.09 0.696 8.012 -0.683l0.357 1.35c2.248 -1.489 3.488 -3.628 3.72 -6.124l0.837 0.93c1.286 -3.829 0.28 -6.883 -1.565 -9.502l-0.078 0.637 -0.79 -0.87s0.17 -0.077 0.31 -0.263c0.03 -0.078 -0.046 -0.495 -0.371 -0.774 -0.31 0.078 -0.56 0.264 -0.684 0.45a3.222 3.222 0 0 0 -0.93 -0.543c0.062 0.077 0.604 0.79 0.65 1.007 0.466 0.388 1.102 0.837 1.52 1.395 -0.34 -0.403 -1.984 -0.497 -2.728 -0.078 0 0 -0.744 -0.868 -1.426 -1.473 -0.14 -0.511 0.326 -0.96 0.326 -0.96s-0.48 -0.03 -0.93 0.42c-0.682 -0.512 -1.55 -0.745 -1.55 -0.745 -0.961 0.14 -1.612 0.82 -1.612 0.82 0.217 0.14 0.512 0.327 0.776 0.42 0.511 0.217 1.006 0.139 1.332 0.139 0.263 0 0.636 0.078 0.636 0.078s0.635 0.495 1.565 1.565c-1.426 -0.574 -2.915 0.062 -3.969 -0.45 -1.24 -0.62 -1.146 -1.595 -1.146 -1.595s-0.836 -0.11 -0.836 -0.141c0 0 0.618 -0.82 1.548 -1.1l-0.464 -0.402c0.558 -0.465 1.534 -1.085 3.115 -1.24 0 0 0.683 0.262 2.11 1.285 0.232 -0.326 0.308 -1.008 0.308 -1.008 0.728 0.248 2.217 1.333 2.806 1.984 -0.325 -0.759 -0.559 -1.223 -0.636 -2.013 -0.357 -0.357 -1.24 -1.101 -3.069 -1.551 0.295 0.605 0.264 1.115 0.264 1.115 -0.34 -0.45 -1.055 -1.146 -1.55 -1.332 -0.295 -0.015 -0.605 -0.047 -0.93 -0.047zm3.271 7.068a4.323 4.323 0 0 0 1.256 0.697v1.348c-0.465 0.403 -1.985 1.675 -3.008 1.566 -0.573 -1.1 -1.115 -2.107 -1.115 -2.107s1.565 -1.318 2.867 -1.504zm2.975 0.031c0.465 1.131 0.59 2.48 0.078 3.379 -0.28 -0.605 -0.636 -0.947 -1.008 -1.35v-1.347s0.418 -0.264 0.93 -0.682zm-0.977 3.395c0.465 0.511 0.559 1.068 0.559 1.068 -0.202 1.131 -0.836 1.846 -1.301 2.14 0.046 -0.821 -0.172 -1.519 -0.172 -1.519 -0.34 0.372 -1.13 0.743 -1.596 0.836l-0.697 -1.3c0.822 -0.032 2.201 -1.194 2.201 -1.194l1.006 -0.031z"
                  fill="currentColor"
                  strokeWidth="0.5"
                />
              </svg>
            </button>

            {/* 3. eSports */}
            <button
              onClick={() =>
                guardedClick(() => {
                  setActiveTab("Home");
                  if (setSelectedTopTab) setSelectedTopTab("eSports");
                  setSelectedSport("All");
                  if (setSelectedLeague) setSelectedLeague("All");
                  if (setSelectedSubLeague) setSelectedSubLeague("All");
                })
              }
              className="w-8.5 h-8.5 flex items-center justify-center mx-auto transition-all duration-300 cursor-pointer border-none bg-transparent hover:bg-transparent shadow-none outline-none"
              title="eSports"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                viewBox="0 0 256 256"
                className={`w-7 h-7 transition-colors ${getCategoryIconColor(activeTab === "Home" && selectedTopTab === "eSports")}`}
              >
                <path d="M247.44,173.75a.68.68,0,0,0,0-.14L231.05,89.44c0-.06,0-.12,0-.18A60.08,60.08,0,0,0,172,40H83.89a59.88,59.88,0,0,0-59,49.52L8.58,173.61a.68.68,0,0,0,0,.14,36,36,0,0,0,60.9,31.71l.35-.37L109.52,160h37l39.71,45.09c.11.13.23.25.35.37A36.08,36.08,0,0,0,212,216a36,36,0,0,0,35.43-42.25ZM104,112H96v8a8,8,0,0,1-16,0v-8H72a8,8,0,0,1,0-16h8V88a8,8,0,0,1,16,0v8h8a8,8,0,0,1,0,16Zm40-8a8,8,0,0,1,8-8h24a8,8,0,0,1,0,16H152A8,8,0,0,1,144,104Zm84.37,87.47a19.84,19.84,0,0,1-12.9,8.23A20.09,20.09,0,0,1,198,194.31L167.8,160H172a60,60,0,0,0,51-28.38l8.74,45A19.82,19.82,0,0,1,228.37,191.47Z" />
              </svg>
            </button>

            {/* 4. Casino */}
            <button
              onClick={() =>
                guardedClick(() => {
                  setActiveTab("Home");
                  if (setSelectedTopTab) setSelectedTopTab("Casino");
                  setSelectedSport("All");
                  if (setSelectedLeague) setSelectedLeague("All");
                  if (setSelectedSubLeague) setSelectedSubLeague("All");
                })
              }
              className="w-8.5 h-8.5 flex items-center justify-center mx-auto transition-all duration-300 cursor-pointer border-none bg-transparent hover:bg-transparent shadow-none outline-none"
              title="Casino"
            >
              <svg
                viewBox="0 0 14 14"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                id="Gambling--Streamline-Flex"
                className={`w-7 h-7 transition-colors ${getCategoryIconColor(activeTab === "Home" && selectedTopTab === "Casino")}`}
              >
                <desc>Gambling Streamline Icon: https://streamlinehq.com</desc>
                <g id="gambling--gambling-casino-card-poker-dice-bet">
                  <path
                    id="Union"
                    fillRule="evenodd"
                    clipRule="evenodd"
                    fill="currentColor"
                    d="M9.12233 0.576014C9.05365 0.38978 8.96273 0.217325 8.85352 0.060791c0.0575 0.0144081 0.11497 0.0292904 0.17239 0.044677 0.92199 0.247045 1.78879 0.612461 2.62589 0.965332l0.0001 0.00007 0.0003 0.00011c0.1137 0.04795 0.2269 0.09568 0.3397 0.14284 0.4446 0.18604 0.7061 0.6561 0.6244 1.13111 -0.0288 0.16786 -0.0574 0.33686 -0.0862 0.50684l0 0.00007 0 0.00003c-0.1829 1.07982 -0.3725 2.19921 -0.6723 3.31818 -0.0395 0.14745 -0.0807 0.29395 -0.1233 0.43953 -0.2731 -0.02051 -0.554 -0.03474 -0.8401 -0.03768 -0.1311 -0.71477 -0.2836 -1.45533 -0.4818 -2.19493 -0.3163 -1.1805 -0.73449 -2.30506 -1.11504 -3.32847l-0.00001 0 -0.00008 -0.00023C9.238 0.888322 9.17944 0.730846 9.12233 0.576014ZM2.14428 10.6209c0.16678 0.4522 0.62829 0.7285 1.10637 0.6673 0.12127 -0.0155 0.24324 -0.0308 0.3658 -0.0462l0.00014 0 0.00004 0 0.00007 0c0.90135 -0.1129 1.83474 -0.2299 2.75672 -0.4769 0.06616 -0.0178 0.13204 -0.0361 0.19764 -0.055 0.0041 -0.5998 0.0562 -1.17764 0.11335 -1.71179 0.12941 -1.20959 1.09474 -2.17259 2.2993 -2.30686 0.20982 -0.02338 0.42683 -0.04615 0.64957 -0.06546 -0.11929 -0.63689 -0.25537 -1.28126 -0.42799 -1.9255 -0.29983 -1.11898 -0.69535 -2.18319 -1.07688 -3.20979 -0.06007 -0.16163 -0.1198 -0.32232 -0.17874 -0.48215C7.78289 0.556343 7.32138 0.280015 6.8433 0.341219c-0.12135 0.015535 -0.2434 0.030827 -0.36604 0.046193l-0.00001 0.000001C5.5759 0.500345 4.64251 0.61729 3.72053 0.864335c-0.92199 0.247045 -1.7888 0.612465 -2.62586 0.965335 -0.113897 0.04802 -0.227243 0.0958 -0.340102 0.14302 -0.444628 0.18603 -0.7061423 0.6561 -0.624477 1.1311 0.028863 0.16789 0.057488 0.33691 0.08628 0.50691l0.000001 0c0.182881 1.07984 0.372463 2.19924 0.672292 3.31822 0.299826 1.11898 0.695356 2.18321 1.076886 3.20978l0.00004 0.0001 0.00013 0.0004c0.06001 0.1615 0.11967 0.322 0.17856 0.4817Zm2.53141 -6.99224c-0.061 -0.04423 -0.13869 -0.0586 -0.21146 -0.0391 -0.07278 0.01951 -0.13288 0.07079 -0.16359 0.13959L3.23141 6.1247c-0.04784 0.10717 -0.01469 0.23318 0.07969 0.30294l2.1337 1.57712c0.06124 0.04526 0.13976 0.06015 0.21331 0.04044 0.07355 -0.01971 0.13411 -0.07186 0.16451 -0.14167L6.8819 5.47085c0.04685 -0.1076 0.01255 -0.23331 -0.08245 -0.3022L4.67569 3.62866Zm4.4188 10.25744c-0.74057 -0.0826 -1.33649 -0.6785 -1.41576 -1.4194 -0.05851 -0.547 -0.10793 -1.1085 -0.10793 -1.681s0.04942 -1.13405 0.10793 -1.68101c0.07927 -0.74092 0.67519 -1.33684 1.41576 -1.41939 0.55006 -0.06131 1.11481 -0.11397 1.69071 -0.11397 0.5758 0 1.1406 0.05266 1.6906 0.11397 0.7406 0.08255 1.3365 0.67847 1.4158 1.41939 0.0585 0.54696 0.1079 1.10851 0.1079 1.68101 0 0.5725 -0.0494 1.134 -0.1079 1.681 -0.0793 0.7409 -0.6752 1.3368 -1.4158 1.4194 -0.55 0.0613 -1.1148 0.1139 -1.6906 0.1139 -0.5759 0 -1.14065 -0.0526 -1.69071 -0.1139Zm1.03391 -2.4334c0 -0.2762 -0.22384 -0.5 -0.49998 -0.5 -0.27614 0 -0.5 0.2238 -0.5 0.5v0.5c0 0.2761 0.22386 0.5 0.5 0.5s0.49998 -0.2239 0.49998 -0.5v-0.5Zm1.7647 -2.56057c0.2761 0 0.5 0.22386 0.5 0.5v0.5c0 0.27617 -0.2239 0.49997 -0.5 0.49997 -0.2762 0 -0.5 -0.2238 -0.5 -0.49997v-0.5c0 -0.27614 0.2238 -0.5 0.5 -0.5Z"
                    strokeWidth="1"
                  />
                </g>
              </svg>
            </button>

            {/* 5. TT Games */}
            <button
              onClick={() =>
                guardedClick(() => {
                  setActiveTab("Home");
                  if (setSelectedTopTab) setSelectedTopTab("TT Games");
                  setSelectedSport("All");
                  if (setSelectedLeague) setSelectedLeague("All");
                  if (setSelectedSubLeague) setSelectedSubLeague("All");
                })
              }
              className="w-8.5 h-8.5 flex items-center justify-center mx-auto transition-all duration-300 cursor-pointer border-none bg-transparent hover:bg-transparent shadow-none outline-none"
              title="TT Games"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                id="Player-Me-Logo--Streamline-Logos"
                className={`w-7 h-7 transition-colors ${getCategoryIconColor(activeTab === "Home" && selectedTopTab === "TT Games")}`}
              >
                <desc>Player Me Logo Streamline Icon: https://streamlinehq.com</desc>
                <path
                  fill="currentColor"
                  d="M13.5 17v-4c1 -0.5 2.5 -1.5 2.5 -4s-2 -4 -4 -4 -4 1.5 -4 4 1.5 3.5 2.5 4v10C8.333 20.5 4 14.2 4 9c0 -6.5 6 -8 8 -8s8 1.5 8 8c0 5.6 -4.333 7.667 -6.5 8Z"
                  strokeWidth="1"
                />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2 pt-1 pb-1 px-3 flex items-center justify-between w-full border-t border-dashed border-slate-200 dark:border-neutral-850 animate-fadeIn">
          <button
            onClick={() => {
              setSelectedSport("All");
              if (setSelectedLeague) setSelectedLeague("All");
              if (setSelectedSubLeague) setSelectedSubLeague("All");
            }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer ${
              theme === "light"
                ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                : theme === "blue"
                  ? "bg-white/10 text-white hover:bg-white/15"
                  : "bg-neutral-900 text-slate-200 hover:bg-neutral-850"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-3.5 h-3.5"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span>
              {lang === "sw"
                ? "Rudi Nyumbani"
                : lang === "fr"
                  ? "Retour à l'accueil"
                  : "Back to Home"}
            </span>
          </button>

          <div className="flex items-center space-x-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span
              className={`text-[10px] font-black uppercase tracking-wider ${theme === "light" ? "text-slate-700" : "text-slate-300"}`}
            >
              {lang === "sw"
                ? "Soka / Football pekee"
                : lang === "fr"
                  ? "Football Uniquement"
                  : "Football Only"}
            </span>
          </div>
        </div>
      )}
    </header>
  );
}
