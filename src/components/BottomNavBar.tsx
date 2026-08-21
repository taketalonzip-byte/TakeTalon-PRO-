/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

interface BottomNavBarProps {
  activeTab:
    | "Home"
    | "Tipsters"
    | "Aviator"
    | "Console"
    | "Wallet"
    | "Profile"
    | "Help"
    | "Settings"
    | "Agent"
    | "Notifications"
    | "Football"
    | "Basketball"
    | "Tennis"
    | "Volleyball"
    | "Ice Hockey"
    | "Rugby"
    | "Baseball"
    | "Cricket"
    | "Handball"
    | "Boxing"
    | "Golf";
  setActiveTab: (
    tab:
      | "Home"
      | "Tipsters"
      | "Aviator"
      | "Console"
      | "Wallet"
      | "Profile"
      | "Help"
      | "Settings"
      | "Agent"
      | "Notifications",
  ) => void;
  t: any;
  theme: "blue" | "dark" | "light";
  navRef?: React.RefObject<HTMLDivElement | null>;
  cartCount?: number;
  onCartClick?: () => void;
  lang?: "en" | "fr" | "sw";
  notificationsCount?: number;
}

const BottomNavBar = React.memo(function BottomNavBar({
  activeTab,
  setActiveTab,
  t,
  theme,
  navRef,
  cartCount = 0,
  onCartClick,
  lang = "sw",
  notificationsCount = 0,
}: BottomNavBarProps) {
  // Theme responsive styling for bottom navigation bar with container style as originally configured
  const navBgClass =
    theme === "light"
      ? "glass-nav-light border border-slate-200/80 shadow-[0_12px_40px_rgba(15,23,42,0.08)]"
      : theme === "dark"
        ? "bg-[#141414]/95 backdrop-blur-md border border-neutral-800/80 shadow-[0_12px_40px_rgba(0,0,0,0.7)]"
        : "bg-[#1f3d5c]/95 backdrop-blur-md border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.45)]";

  const getTabClass = (tab: typeof activeTab) => {
    const isActive = activeTab === tab;
    if (isActive) {
      return theme === "light" ? "text-blue-600 font-bold" : "text-white font-bold";
    } else {
      return theme === "light"
        ? "text-slate-400 hover:text-slate-800"
        : theme === "blue"
          ? "text-blue-100/70 hover:text-white"
          : "text-slate-500 hover:text-slate-300";
    }
  };

  return (
    <div
      ref={navRef}
      className="fixed bottom-0 inset-x-0 z-50 transition-transform duration-300 ease-out translate-y-0 opacity-100"
    >
      {/* Outer wrapper to position neatly */}
      <div className="max-w-xl mx-auto relative px-3 pb-3">
        <nav
          className={`rounded-2xl flex items-center justify-around py-2.5 px-2 relative ${navBgClass}`}
        >
          {/* 1. Soka Kuu */}
          <button
            id="nav-home-btn"
            onClick={() => setActiveTab("Home")}
            className={`flex flex-col items-center justify-center space-y-1 transition-all duration-200 cursor-pointer flex-1 ${getTabClass("Home")}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 48 48"
              id="Home-1--Streamline-Plump"
              className="w-5 h-5 animate-none"
            >
              <desc>Home 1 Streamline Icon: https://streamlinehq.com</desc>
              <g id="home-1--home-house-roof-shelter">
                <path
                  id="Subtract"
                  fill="currentColor"
                  fillRule="evenodd"
                  d="M20.5682 2.81246c2.1784 -0.99734 4.6852 -0.99734 6.8636 0 7.7657 3.5554 13.5513 8.64154 16.3373 11.38514 1.5022 1.4793 2.3049 3.4519 2.4175 5.4865 0.1388 2.5072 0.3134 6.5725 0.3134 11.1586 0 3.2363 -0.087 6.2126 -0.1868 8.5643 -0.1601 3.7688 -3.1695 6.7252 -6.9275 6.8541 -3.4773 0.1192 -8.6464 0.2389 -15.3857 0.2389s-11.9084 -0.1197 -15.38569 -0.2389c-3.75796 -0.1289 -6.76743 -3.0853 -6.92748 -6.8541C1.58696 37.0553 1.5 34.079 1.5 30.8427c0 -4.5861 0.17463 -8.6514 0.31339 -11.1586 0.1126 -2.0346 0.91528 -4.0072 2.41753 -5.4865C7.01693 11.454 12.8025 6.36786 20.5682 2.81246ZM16 36c-1.1046 0 -2 0.8954 -2 2s0.8954 2 2 2h16c1.1046 0 2 -0.8954 2 -2s-0.8954 -2 -2 -2H16Z"
                  clipRule="evenodd"
                  strokeWidth="1"
                />
              </g>
            </svg>
            <span className="text-[9px] font-bold tracking-tight">{t.home}</span>
          </button>

          {/* 2. Watabiri */}
          <button
            id="nav-tipsters-btn"
            onClick={() => setActiveTab("Tipsters")}
            className={`flex flex-col items-center justify-center space-y-1 transition-all duration-200 cursor-pointer flex-1 ${getTabClass("Tipsters")}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" className="w-5 h-5">
              <path
                fill="currentColor"
                d="M164.47,195.63a8,8,0,0,1-6.7,12.37H10.23a8,8,0,0,1-6.7-12.37,95.83,95.83,0,0,1,47.22-37.71,60,60,0,1,1,66.5,0A95.83,95.83,0,0,1,164.47,195.63Zm87.91-.15a95.87,95.87,0,0,0-47.13-37.56A60,60,0,0,0,144.7,54.59a4,4,0,0,0-1.33,6A75.83,75.83,0,0,1,147,150.53a4,4,0,0,0,1.07,5.53,112.32,112.32,0,0,1,29.85,30.83,23.92,23.92,0,0,1,3.65,16.47,4,4,0,0,0,3.95,4.64h60.3a8,8,0,0,0,7.73-5.93A8.22,8.22,0,0,0,252.38,195.48Z"
              />
            </svg>
            <span className="text-[9px] font-bold tracking-tight">{t.tipsters}</span>
          </button>

          {/* 3. Kikapu cha Bashiri (🛒) */}
          <button
            id="nav-cart-btn"
            onClick={onCartClick}
            className={`flex flex-col items-center justify-center space-y-1 transition-all duration-200 cursor-pointer flex-1 relative ${
              cartCount > 0
                ? "text-emerald-500 scale-105 font-bold"
                : theme === "light"
                  ? "text-slate-400 hover:text-emerald-600"
                  : theme === "blue"
                    ? "text-blue-100 hover:text-emerald-300"
                    : "text-slate-500 hover:text-emerald-400"
            }`}
          >
            <div className="relative flex items-center justify-center h-5 w-5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                viewBox="0 0 256 256"
                className={`w-5 h-5 transition-colors duration-300 ${
                  cartCount > 0 ? "text-emerald-500" : "text-slate-400 dark:text-slate-500"
                }`}
              >
                <path d="M239.71,74.14l-25.64,92.28A24.06,24.06,0,0,1,191,184H92.16A24.06,24.06,0,0,1,69,166.42L33.92,40H16a8,8,0,0,1,0-16H40a8,8,0,0,1,7.71,5.86L57.19,64H232a8,8,0,0,1,7.71,10.14ZM88,200a16,16,0,1,0,16,16A16,16,0,0,0,88,200Zm104,0a16,16,0,1,0,16,16A16,16,0,0,0,192,200Z" />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-emerald-500 text-white font-extrabold text-[8px] min-w-[14px] h-[14px] px-1 rounded-full flex items-center justify-center shadow-md border border-white dark:border-neutral-950">
                  {cartCount}
                </span>
              )}
            </div>
            <span className="text-[9px] font-bold tracking-tight">
              {lang === "fr" ? "Panier" : lang === "en" ? "Cart" : "Kikapu"}
            </span>
          </button>

          {/* 4. Notifications */}
          <button
            id="nav-notifications-btn"
            onClick={() => setActiveTab("Notifications")}
            className={`flex flex-col items-center justify-center space-y-1 transition-all duration-200 cursor-pointer flex-1 ${getTabClass("Notifications")}`}
          >
            <div className="relative flex items-center justify-center h-5 w-5">
              <svg
                viewBox="0 0 16 16"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
                id="Notification-Fill--Streamline-Remix-Fill"
                className="w-5 h-5"
              >
                <desc>Notification Fill Streamline Icon: https://streamlinehq.com</desc>
                <path
                  d="M8 1.3333333333333333c3.3137333333333334 0 6 2.695653333333333 6 6.020933333333333V13.333333333333332H2v-5.979066666666666C2 4.0289866666666665 4.686293333333333 1.3333333333333333 8 1.3333333333333333ZM6.333333333333333 14h3.333333333333333c0 0.9204666666666667 -0.7462 1.6666666666666665 -1.6666666666666665 1.6666666666666665S6.333333333333333 14.920466666666666 6.333333333333333 14Z"
                  strokeWidth="0.6667"
                />
              </svg>
              {notificationsCount > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white font-extrabold text-[8px] min-w-[14px] h-[14px] px-1 rounded-full flex items-center justify-center shadow-md border border-white dark:border-neutral-950">
                  {notificationsCount}
                </span>
              )}
            </div>
            <span className="text-[9px] font-bold tracking-tight">
              {lang === "fr" ? "Notif." : lang === "en" ? "Notifications" : "Arifa"}
            </span>
          </button>

          {/* 5. Menu */}
          <button
            id="nav-wallet-btn"
            onClick={() => setActiveTab("Wallet")}
            className={`flex flex-col items-center justify-center space-y-1 transition-all duration-200 cursor-pointer flex-1 ${getTabClass("Wallet")}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 256 256"
              className="w-5 h-5"
            >
              <path d="M216,56v60a4,4,0,0,1-4,4H136V44a4,4,0,0,1,4-4h60A16,16,0,0,1,216,56ZM116,40H56A16,16,0,0,0,40,56v60a4,4,0,0,0,4,4h76V44A4,4,0,0,0,116,40Zm96,96H136v76a4,4,0,0,0,4,4h60a16,16,0,0,0,16-16V140A4,4,0,0,0,212,136ZM40,140v60a16,16,0,0,0,16,16h60a4,4,0,0,0,4-4V136H44A4,4,0,0,0,40,140Z" />
            </svg>
            <span className="text-[9px] font-bold tracking-tight">Menu</span>
          </button>
        </nav>
      </div>
    </div>
  );
});
export default BottomNavBar;
