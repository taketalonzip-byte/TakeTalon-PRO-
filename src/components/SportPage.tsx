/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SportPage — reusable full-screen sport category view.
 * Used for Basketball, Tennis, Volleyball, and any future sport.
 * Shows a back-button header + vertical country list + expandable leagues.
 * Design language follows TakeTalon theme.
 */

import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  X,
  RefreshCw,
  ArrowRight,
  ShoppingBag,
} from "lucide-react";
import { MatchTip } from "../types";
import { FootballMatchSkeleton } from "./skeletons";
import { getUnifiedMatchStatus } from "../lib/sportMatchStatus";
import { ScrollingScoreBadge } from "./ScrollingScoreBadge";
import { Flag } from "./Flag";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface League {
  id: string;
  name: string;
  logo?: string | null;
}

interface Country {
  id: string;
  name: string;
  flag: React.ReactNode;
  leagues: League[];
}

interface SportPageProps {
  sport: string;
  theme: "blue" | "dark" | "light";
  onBack?: () => void;
  onPlaceBet?: (match: MatchTip, oddType: "home" | "draw" | "away", value: number) => void;
  onBetNow?: (match: MatchTip, oddType: "home" | "draw" | "away", value: number) => void;
  onBuyNow?: (match: MatchTip) => void;
  selectedBets?: Record<string, "home" | "draw" | "away">;
}

// ---------------------------------------------------------------------------
// Generic flag placeholders for sports where exact SVGs are pending
// Uses ISO country code colours as simple rectangles — swappable for real SVGs
// ---------------------------------------------------------------------------
function SimpleFlagBox({ colors, label }: { colors: string[]; label: string }) {
  return (
    <div className="w-8 h-8 rounded-md overflow-hidden flex shrink-0 border border-white/10">
      {colors.map((c, i) => (
        <div key={i} className="flex-1 h-full" style={{ background: c }} />
      ))}
      {/* Visually hidden label for a11y */}
      <span className="sr-only">{label} flag</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Flag helpers (inline SVGs for sports countries)
// ---------------------------------------------------------------------------
const UsaFlag = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" height="24" width="24">
    <rect width="24" height="24" fill="#B22234" />
    {[0, 2, 4, 6, 8, 10, 12].map((y) => (
      <rect key={y} x="0" y={y * (24 / 13)} width="24" height={24 / 13} fill="#FFFFFF" />
    ))}
    <rect width="10" height={(24 * 7) / 13} fill="#3C3B6E" />
  </svg>
);

// Countries that also exist on the Football page now reuse the exact same
// flag SVGs as FootballPage.tsx, so the icon matches across the app.
const SpainFlag = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 32 32" height="24" width="24">
    <path fill="#ffb400" fillRule="evenodd" d="M0 4v24h32V4H0Z" clipRule="evenodd" />
    <mask
      id="spa2-sport"
      width="32"
      height="24"
      x="0"
      y="4"
      maskUnits="userSpaceOnUse"
      style={{ maskType: "luminance" }}
    >
      <path fill="#fff" fillRule="evenodd" d="M0 4v24h32V4H0Z" clipRule="evenodd" />
    </mask>
    <g mask="url(#spa2-sport)">
      <path
        fill="#c51918"
        fillRule="evenodd"
        d="M0 4v6h32V4H0Zm0 18v6h32v-6H0Z"
        clipRule="evenodd"
      />
    </g>
  </svg>
);

const FranceFlag = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="24" width="24">
    <path fill="#f50300" fillRule="evenodd" d="M16 3h8v18h-8V3Z" clipRule="evenodd" />
    <path fill="#2e42a5" fillRule="evenodd" d="M0 3h8v18H0V3Z" clipRule="evenodd" />
    <path fill="#f7fcff" fillRule="evenodd" d="M8 3h8v18H8V3Z" clipRule="evenodd" />
  </svg>
);

const GermanyFlag = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="24" width="24">
    <path fill="#ffd018" fillRule="evenodd" d="M0 15h24v6H0v-6Z" clipRule="evenodd" />
    <path fill="#e31d1c" fillRule="evenodd" d="M0 9h24v6H0v-6Z" clipRule="evenodd" />
    <path fill="#272727" fillRule="evenodd" d="M0 3h24v6H0V3Z" clipRule="evenodd" />
  </svg>
);

const BrazilFlag = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="24" width="24">
    <rect width="24" height="18" y="3" fill="#009c3b" rx="1" />
    <path fill="#ffdf00" d="M12 5.5 21 12l-9 6.5L3 12z" />
    <circle cx="12" cy="12" r="3.2" fill="#002776" />
  </svg>
);

const SerbiaFlag = () => (
  <div className="w-8 h-8 rounded-md overflow-hidden flex flex-col shrink-0 border border-white/10">
    <div className="flex-1" style={{ background: "#c6363c" }} />
    <div className="flex-1" style={{ background: "#0c4076" }} />
    <div className="flex-1" style={{ background: "#f0f0f0" }} />
  </div>
);

const SwitzerlandFlag = () => (
  <div
    className="w-8 h-8 rounded-md overflow-hidden flex items-center justify-center shrink-0 border border-white/10"
    style={{ background: "#ff0000" }}
  >
    <div className="bg-white" style={{ width: 10, height: 3 }} />
  </div>
);

const ItalyFlag = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="24" width="24">
    <path fill="#f50300" fillRule="evenodd" d="M16 3h8v18h-8V3Z" clipRule="evenodd" />
    <path fill="#169b62" fillRule="evenodd" d="M0 3h8v18H0V3Z" clipRule="evenodd" />
    <path fill="#f7fcff" fillRule="evenodd" d="M8 3h8v18H8V3Z" clipRule="evenodd" />
  </svg>
);

const AustraliaFlag = () => (
  <SimpleFlagBox colors={["#002868", "#002868", "#BF0A30"]} label="Australia" />
);

const PolandFlag = () => (
  <div className="w-8 h-8 rounded-md overflow-hidden flex flex-col shrink-0 border border-white/10">
    <div className="flex-1" style={{ background: "#f0f0f0" }} />
    <div className="flex-1" style={{ background: "#dc143c" }} />
  </div>
);

const RussiaFlag = () => (
  <div className="w-8 h-8 rounded-md overflow-hidden flex flex-col shrink-0 border border-white/10">
    <div className="flex-1" style={{ background: "#f0f0f0" }} />
    <div className="flex-1" style={{ background: "#0039a6" }} />
    <div className="flex-1" style={{ background: "#d52b1e" }} />
  </div>
);

const ArgentinaFlag = () => (
  <div className="w-8 h-8 rounded-md overflow-hidden flex flex-col shrink-0 border border-white/10">
    <div className="flex-1" style={{ background: "#74ACDF" }} />
    <div className="flex-1" style={{ background: "#FFFFFF" }} />
    <div className="flex-1" style={{ background: "#74ACDF" }} />
  </div>
);

const GreeceFlag = () => (
  <div className="w-8 h-8 rounded-md overflow-hidden flex flex-col shrink-0 border border-white/10">
    {[0, 1, 2, 3, 4, 6, 7, 8].map((i) => (
      <div key={i} className="flex-1" style={{ background: i % 2 === 0 ? "#0D5EAF" : "#FFFFFF" }} />
    ))}
  </div>
);

// England / UK — reuses the exact FootballPage.tsx flag SVG.
const EnglandFlag = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="24" width="24">
    <path fill="#f7fcff" fillRule="evenodd" d="M0 3v18h24V3H0Z" clipRule="evenodd" />
    <path
      fill="#f50302"
      fillRule="evenodd"
      d="M13.5 3h-3v7.5H0v3h10.5v7.5h3V13.5h10.5v-3H13.5V3Z"
      clipRule="evenodd"
    />
  </svg>
);

const JapanFlag = () => (
  <div
    className="w-8 h-8 rounded-md overflow-hidden flex items-center justify-center shrink-0 border border-white/10"
    style={{ background: "#f0f0f0" }}
  >
    <div className="rounded-full" style={{ width: 14, height: 14, background: "#BC002D" }} />
  </div>
);

const ChinaFlag = () => (
  <div
    className="w-8 h-8 rounded-md overflow-hidden flex items-center justify-center shrink-0 border border-white/10"
    style={{ background: "#DE2910" }}
  >
    <span style={{ color: "#FFDE00", fontSize: 10 }}>★</span>
  </div>
);

const EuropeFlag = () => (
  <SimpleFlagBox colors={["#003399", "#003399", "#003399"]} label="Europe" />
);

const InternationalFlag = () => (
  <SimpleFlagBox colors={["#0284c7", "#ffffff", "#0284c7"]} label="International" />
);

// ---------------------------------------------------------------------------
// Volleyball — real Streamline Flagpack country flags (used only in the
// Volleyball section below; other sports keep their existing flag icons).
// Source: Streamline Flagpack icon family (https://streamlinehq.com/icons/flagpack)
// ---------------------------------------------------------------------------
function StreamlineFlagpackBox({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div className="w-8 h-8 rounded-md overflow-hidden flex shrink-0 border border-white/10">
      {children}
      <span className="sr-only">{label} flag</span>
    </div>
  );
}

const VolleyballBrazilFlag = () => (
  <StreamlineFlagpackBox label="Brazil">
    <svg
      id="Brazil--Streamline-Flagpack"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 15"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid slice"
    >
      <title>Brazil</title>
      <desc>Brazil Streamline Icon: https://streamlinehq.com</desc>
      <g clipPath="url(#clip_vbBR)">
        <path fillRule="evenodd" clipRule="evenodd" d="M0 0V15H20V0H0Z" fill="#009933" />
        <mask id="mask0_vbBR" style={{ maskType: "luminance" }} maskUnits="userSpaceOnUse" x="0" y="0" width="20" height="15">
          <path fillRule="evenodd" clipRule="evenodd" d="M0 0V15H20V0H0Z" fill="white" />
        </mask>
        <g mask="url(#mask0_vbBR)">
          <g filter="url(#filter_vbBR)">
            <path fillRule="evenodd" clipRule="evenodd" d="M9.95424 2.31503L17.5804 7.62969L9.8505 12.607L2.38058 7.52667L9.95424 2.31503Z" fill="#FFD221" />
            <path fillRule="evenodd" clipRule="evenodd" d="M9.95424 2.31503L17.5804 7.62969L9.8505 12.607L2.38058 7.52667L9.95424 2.31503Z" fill="url(#paint_vbBR)" />
          </g>
          <path fillRule="evenodd" clipRule="evenodd" d="M10 10.75C11.7259 10.75 13.125 9.35089 13.125 7.625C13.125 5.89911 11.7259 4.5 10 4.5C8.27411 4.5 6.875 5.89911 6.875 7.625C6.875 9.35089 8.27411 10.75 10 10.75Z" fill="#2E42A5" />
          <mask id="mask1_vbBR" style={{ maskType: "luminance" }} maskUnits="userSpaceOnUse" x="6" y="4" width="8" height="7">
            <path fillRule="evenodd" clipRule="evenodd" d="M10 10.75C11.7259 10.75 13.125 9.35089 13.125 7.625C13.125 5.89911 11.7259 4.5 10 4.5C8.27411 4.5 6.875 5.89911 6.875 7.625C6.875 9.35089 8.27411 10.75 10 10.75Z" fill="white" />
          </mask>
          <g mask="url(#mask1_vbBR)">
            <path fillRule="evenodd" clipRule="evenodd" d="M8.9875 9.10625L8.8479 9.17964L8.87456 9.0242L8.76162 8.91411L8.9177 8.89143L8.9875 8.75L9.0573 8.89143L9.21338 8.91411L9.10044 9.0242L9.1271 9.17964L8.9875 9.10625Z" fill="#F7FCFF" />
            <path fillRule="evenodd" clipRule="evenodd" d="M10.2375 9.10625L10.0979 9.17964L10.1246 9.0242L10.0116 8.91411L10.1677 8.89143L10.2375 8.75L10.3073 8.89143L10.4634 8.91411L10.3504 9.0242L10.3771 9.17964L10.2375 9.10625Z" fill="#F7FCFF" />
            <path fillRule="evenodd" clipRule="evenodd" d="M10.2375 9.85625L10.0979 9.92964L10.1246 9.7742L10.0116 9.66411L10.1677 9.64143L10.2375 9.5L10.3073 9.64143L10.4634 9.66411L10.3504 9.7742L10.3771 9.92964L10.2375 9.85625Z" fill="#F7FCFF" />
            <path fillRule="evenodd" clipRule="evenodd" d="M9.6125 7.23125L9.4729 7.30464L9.49956 7.1492L9.38662 7.03911L9.5427 7.01643L9.6125 6.875L9.6823 7.01643L9.83838 7.03911L9.72544 7.1492L9.7521 7.30464L9.6125 7.23125Z" fill="#F7FCFF" />
            <path fillRule="evenodd" clipRule="evenodd" d="M9.6125 8.48125L9.4729 8.55464L9.49956 8.3992L9.38662 8.28911L9.5427 8.26643L9.6125 8.125L9.6823 8.26643L9.83838 8.28911L9.72544 8.3992L9.7521 8.55464L9.6125 8.48125Z" fill="#F7FCFF" />
            <path fillRule="evenodd" clipRule="evenodd" d="M8.73748 7.85625L8.59789 7.92964L8.62455 7.7742L8.51161 7.66411L8.66769 7.64143L8.73748 7.5L8.80728 7.64143L8.96336 7.66411L8.85042 7.7742L8.87708 7.92964L8.73748 7.85625Z" fill="#F7FCFF" />
            <path fillRule="evenodd" clipRule="evenodd" d="M7.86247 8.35625L7.72287 8.42964L7.74953 8.2742L7.63659 8.16411L7.79267 8.14143L7.86247 8L7.93227 8.14143L8.08835 8.16411L7.97541 8.2742L8.00207 8.42964L7.86247 8.35625Z" fill="#F7FCFF" />
            <path d="M6.20301 6.87323L6.297 5.62677C9.29571 5.85289 11.6625 6.83887 13.3676 8.59276L12.4714 9.46409C10.9935 7.94395 8.91399 7.07765 6.20301 6.87323Z" fill="#F7FCFF" />
          </g>
        </g>
      </g>
      <defs>
        <filter id="filter_vbBR" x="2.38058" y="2.315" width="15.1998" height="10.2921" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <feOffset />
          <feColorMatrix type="matrix" values="0 0 0 0 0.0313726 0 0 0 0 0.368627 0 0 0 0 0 0 0 0 0.28 0" />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_vbBR" />
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_vbBR" result="shape" />
        </filter>
        <linearGradient id="paint_vbBR" x1="20" y1="15" x2="20" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFC600" />
          <stop offset="1" stopColor="#FFDE42" />
        </linearGradient>
        <clipPath id="clip_vbBR">
          <rect width="20" height="15" fill="white" />
        </clipPath>
      </defs>
    </svg>
  </StreamlineFlagpackBox>
);

const VolleyballItalyFlag = () => (
  <StreamlineFlagpackBox label="Italy">
    <svg
      id="Italy--Streamline-Flagpack"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 15"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid slice"
    >
      <title>Italy</title>
      <desc>Italy Streamline Icon: https://streamlinehq.com</desc>
      <g clipPath="url(#clip_vbIT)">
        <path fillRule="evenodd" clipRule="evenodd" d="M14 0H20V15H14V0Z" fill="#C51918" />
        <path fillRule="evenodd" clipRule="evenodd" d="M0 0H6V15H0V0Z" fill="#5EAA22" />
        <path fillRule="evenodd" clipRule="evenodd" d="M6 0H14V15H6V0Z" fill="white" />
      </g>
      <defs>
        <clipPath id="clip_vbIT">
          <rect width="20" height="15" fill="white" />
        </clipPath>
      </defs>
    </svg>
  </StreamlineFlagpackBox>
);

const VolleyballPolandFlag = () => (
  <StreamlineFlagpackBox label="Poland">
    <svg
      id="Poland--Streamline-Flagpack"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 15"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid slice"
    >
      <title>Poland</title>
      <desc>Poland Streamline Icon: https://streamlinehq.com</desc>
      <g clipPath="url(#clip_vbPL)">
        <path fillRule="evenodd" clipRule="evenodd" d="M0 0V15H20V0H0Z" fill="#F7FCFF" />
        <mask id="mask_vbPL" style={{ maskType: "luminance" }} maskUnits="userSpaceOnUse" x="0" y="0" width="20" height="15">
          <path fillRule="evenodd" clipRule="evenodd" d="M0 0V15H20V0H0Z" fill="white" />
        </mask>
        <g mask="url(#mask_vbPL)">
          <path fillRule="evenodd" clipRule="evenodd" d="M0 7.5V15H20V7.5H0Z" fill="#C51918" />
        </g>
      </g>
      <defs>
        <clipPath id="clip_vbPL">
          <rect width="20" height="15" fill="white" />
        </clipPath>
      </defs>
    </svg>
  </StreamlineFlagpackBox>
);

const VolleyballRussiaFlag = () => (
  <StreamlineFlagpackBox label="Russia">
    <svg
      id="Russia--Streamline-Flagpack"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 15"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid slice"
    >
      <title>Russia</title>
      <desc>Russia Streamline Icon: https://streamlinehq.com</desc>
      <g clipPath="url(#clip_vbRU)">
        <mask id="mask_vbRU" style={{ maskType: "luminance" }} maskUnits="userSpaceOnUse" x="0" y="0" width="20" height="15">
          <path fillRule="evenodd" clipRule="evenodd" d="M0 0V15H20V0H0Z" fill="white" />
        </mask>
        <g mask="url(#mask_vbRU)">
          <rect y="5" width="20" height="5" fill="#3D58DB" />
          <path fillRule="evenodd" clipRule="evenodd" d="M0 0V5H20V0H0Z" fill="#F7FCFF" />
          <path fillRule="evenodd" clipRule="evenodd" d="M0 10V15H20V10H0Z" fill="#C51918" />
        </g>
      </g>
      <defs>
        <clipPath id="clip_vbRU">
          <rect width="20" height="15" fill="white" />
        </clipPath>
      </defs>
    </svg>
  </StreamlineFlagpackBox>
);

const VolleyballUsaFlag = () => (
  <StreamlineFlagpackBox label="USA">
    <svg
      id="United-States--Streamline-Flagpack"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 15"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid slice"
    >
      <title>United States</title>
      <desc>United States Streamline Icon: https://streamlinehq.com</desc>
      <g clipPath="url(#clip_vbUS)">
        <path fillRule="evenodd" clipRule="evenodd" d="M0 0H20V15H0V0Z" fill="#E31D1C" />
        <path fillRule="evenodd" clipRule="evenodd" d="M0 1.25V2.5H20V1.25H0ZM0 3.75V5H20V3.75H0ZM0 7.5V6.25H20V7.5H0ZM0 8.75V10H20V8.75H0ZM0 12.5V11.25H20V12.5H0ZM0 15V13.75H20V15H0Z" fill="#F7FCFF" />
        <rect width="11.25" height="8.75" fill="#2E42A5" />
        <path fillRule="evenodd" clipRule="evenodd" d="M1.30002 2.71725L1.96242 2.25583L2.47624 2.62575H2.18532L2.77365 3.14612L2.57494 3.87575H2.2637L1.96149 3.20563L1.70376 3.87575H0.935318L1.52365 4.39612L1.30002 5.21725L1.96242 4.75583L2.47624 5.12575H2.18532L2.77365 5.64612L2.57494 6.37575H2.2637L1.96149 5.70563L1.70376 6.37575H0.935318L1.52365 6.89612L1.30002 7.71725L1.96242 7.25583L2.60334 7.71725L2.40407 6.89612L2.91878 6.37575H2.68137L3.21242 6.00583L3.72624 6.37575H3.43532L4.02365 6.89612L3.80002 7.71725L4.46242 7.25583L5.10334 7.71725L4.90407 6.89612L5.41878 6.37575H5.18137L5.71242 6.00583L6.22624 6.37575H5.93532L6.52365 6.89612L6.30002 7.71725L6.96242 7.25583L7.60334 7.71725L7.40407 6.89612L7.91878 6.37575H7.68137L8.21242 6.00583L8.72624 6.37575H8.43532L9.02365 6.89612L8.80002 7.71725L9.46242 7.25583L10.1033 7.71725L9.90407 6.89612L10.4188 6.37575H9.7637L9.46149 5.70563L9.20376 6.37575H8.83113L8.65407 5.64612L9.16878 5.12575H8.93137L9.46242 4.75583L10.1033 5.21725L9.90407 4.39612L10.4188 3.87575H9.7637L9.46149 3.20563L9.20376 3.87575H8.83113L8.65407 3.14612L9.16878 2.62575H8.93137L9.46242 2.25583L10.1033 2.71725L9.90407 1.89612L10.4188 1.37575H9.7637L9.46149 0.705627L9.20376 1.37575H8.43532L9.02365 1.89612L8.82494 2.62575H8.5137L8.21149 1.95563L7.95376 2.62575H7.58113L7.40407 1.89612L7.91878 1.37575H7.2637L6.96149 0.705627L6.70376 1.37575H5.93532L6.52365 1.89612L6.32494 2.62575H6.0137L5.71149 1.95563L5.45376 2.62575H5.08113L4.90407 1.89612L5.41878 1.37575H4.7637L4.46149 0.705627L4.20376 1.37575H3.43532L4.02365 1.89612L3.82494 2.62575H3.5137L3.21149 1.95563L2.95376 2.62575H2.58113L2.40407 1.89612L2.91878 1.37575H2.2637L1.96149 0.705627L1.70376 1.37575H0.935318L1.52365 1.89612L1.30002 2.71725ZM8.82494 5.12575L9.02365 4.39612L8.43532 3.87575H8.72624L8.21242 3.50583L7.68137 3.87575H7.91878L7.40407 4.39612L7.58113 5.12575H7.95376L8.21149 4.45563L8.5137 5.12575H8.82494ZM7.47624 5.12575L6.96242 4.75583L6.43137 5.12575H6.66878L6.15407 5.64612L6.33113 6.37575H6.70376L6.96149 5.70563L7.2637 6.37575H7.57494L7.77365 5.64612L7.18532 5.12575H7.47624ZM5.27365 5.64612L5.07494 6.37575H4.7637L4.46149 5.70563L4.20376 6.37575H3.83113L3.65407 5.64612L4.16878 5.12575H3.93137L4.46242 4.75583L4.97624 5.12575H4.68532L5.27365 5.64612ZM5.45376 5.12575H5.08113L4.90407 4.39612L5.41878 3.87575H5.18137L5.71242 3.50583L6.22624 3.87575H5.93532L6.52365 4.39612L6.32494 5.12575H6.0137L5.71149 4.45563L5.45376 5.12575ZM3.82494 5.12575L4.02365 4.39612L3.43532 3.87575H3.72624L3.21242 3.50583L2.68137 3.87575H2.91878L2.40407 4.39612L2.58113 5.12575H2.95376L3.21149 4.45563L3.5137 5.12575H3.82494ZM7.77365 3.14612L7.57494 3.87575H7.2637L6.96149 3.20563L6.70376 3.87575H6.33113L6.15407 3.14612L6.66878 2.62575H6.43137L6.96242 2.25583L7.47624 2.62575H7.18532L7.77365 3.14612ZM4.97624 2.62575L4.46242 2.25583L3.93137 2.62575H4.16878L3.65407 3.14612L3.83113 3.87575H4.20376L4.46149 3.20563L4.7637 3.87575H5.07494L5.27365 3.14612L4.68532 2.62575H4.97624Z" fill="#F7FCFF" />
      </g>
      <defs>
        <clipPath id="clip_vbUS">
          <rect width="20" height="15" fill="white" />
        </clipPath>
      </defs>
    </svg>
  </StreamlineFlagpackBox>
);


// ---------------------------------------------------------------------------
// Sport data registry
// Add more sports here; each entry is fully independent.
// ---------------------------------------------------------------------------
const SPORT_DATA: Record<string, Country[]> = {
  Basketball: [
    {
      id: "usa-bball",
      name: "USA",
      flag: <Flag country="usa" size={18} />,
      leagues: [
        { id: "nba", name: "NBA — National Basketball Association" },
        { id: "wnba", name: "WNBA — Women's National Basketball Association" },
        { id: "mens-college-basketball", name: "NCAA Men's Basketball" },
        { id: "womens-college-basketball", name: "NCAA Women's Basketball" },
        { id: "nba-development", name: "NBA G League" },
        { id: "nba-summer-las-vegas", name: "NBA Summer League (Las Vegas)" },
        { id: "nba-summer-california", name: "NBA California Classic" },
        { id: "nba-summer-sacramento", name: "NBA Sacramento Summer" },
        { id: "nba-summer-utah", name: "NBA Salt Lake City Summer" },
        { id: "nba-summer-golden-state", name: "NBA Golden State Summer" },
        { id: "nba-summer-orlando", name: "NBA Orlando Summer" },
      ],
    },
    {
      id: "spain-bball",
      name: "Spain",
      flag: <Flag country="spain" size={18} />,
      leagues: [
        { id: "acb", name: "Liga ACB / Copa del Rey" },
      ],
    },
    {
      id: "italy-bball",
      name: "Italy",
      flag: <Flag country="italy" size={18} />,
      leagues: [
        { id: "lba", name: "Lega Basket Serie A (LBA)" },
      ],
    },
    {
      id: "australia-bball",
      name: "Australia & Oceania",
      flag: <Flag country="australia" size={18} />,
      leagues: [
        { id: "nbl", name: "NBL — National Basketball League" },
      ],
    },
    {
      id: "brazil-bball",
      name: "Brazil",
      flag: <Flag country="brazil" size={18} />,
      leagues: [
        { id: "nbb", name: "NBB — Novo Basquete Brasil" },
      ],
    },
    {
      id: "europe-bball",
      name: "Europe",
      flag: <Flag country="europe" size={18} />,
      leagues: [
        { id: "euroleague", name: "EuroLeague Basketball" },
      ],
    },
    {
      id: "international-bball",
      name: "International",
      flag: <Flag country="international" size={18} />,
      leagues: [
        { id: "fiba", name: "FIBA Basketball World Cup" },
        { id: "fiba-americas", name: "FIBA AmeriCup" },
        { id: "mens-olympics-basketball", name: "Olympics Men's Basketball" },
        { id: "womens-olympics-basketball", name: "Olympics Women's Basketball" },
      ],
    },
  ],

  Tennis: [
    {
      id: "usa-tennis",
      name: "USA",
      flag: <Flag country="usa" size={18} />,
      leagues: [
        { id: "us-open", name: "US Open (Grand Slam)" },
        { id: "atp-miami", name: "Miami Open (ATP Masters)" },
        { id: "atp-indian-wells", name: "Indian Wells (BNP Paribas Open)" },
        { id: "cincinnati-open", name: "Cincinnati Open (ATP Masters)" },
        { id: "winston-salem", name: "Winston-Salem Open" },
        { id: "washington-open", name: "Mubadala Citi DC Open" },
      ],
    },
    {
      id: "uk-tennis",
      name: "England",
      flag: <Flag country="england" size={18} />,
      leagues: [
        { id: "wimbledon", name: "Wimbledon (Grand Slam)" },
        { id: "queens-club", name: "Queen's Club Championships (ATP 500)" },
        { id: "eastbourne", name: "Eastbourne International" },
      ],
    },
    {
      id: "france-tennis",
      name: "France",
      flag: <Flag country="france" size={18} />,
      leagues: [
        { id: "roland-garros", name: "Roland Garros (Grand Slam)" },
        { id: "paris-masters", name: "Paris Masters (ATP Masters)" },
        { id: "marseille-open", name: "Open 13 Provence (Marseille)" },
      ],
    },
    {
      id: "australia-tennis",
      name: "Australia",
      flag: <Flag country="australia" size={18} />,
      leagues: [
        { id: "aus-open", name: "Australian Open (Grand Slam)" },
        { id: "brisbane-atp", name: "Brisbane International" },
        { id: "sydney-atp", name: "Sydney Tennis Classic" },
      ],
    },
    {
      id: "spain-tennis",
      name: "Spain",
      flag: <Flag country="spain" size={18} />,
      leagues: [
        { id: "madrid-open", name: "Madrid Open (ATP Masters)" },
        { id: "barcelona-open", name: "Barcelona Open (ATP 500)" },
        { id: "mallorca-championships", name: "Mallorca Championships" },
      ],
    },
    {
      id: "italy-tennis",
      name: "Italy",
      flag: <Flag country="italy" size={18} />,
      leagues: [
        { id: "italian-open", name: "Italian Open / Rome Masters" },
        { id: "atp-finals", name: "Nitto ATP Finals (Turin)" },
      ],
    },
    {
      id: "switzerland-tennis",
      name: "Switzerland",
      flag: <Flag country="switzerland" size={18} />,
      leagues: [
        { id: "swiss-indoors", name: "Swiss Indoors (Basel)" },
        { id: "geneva-open", name: "Geneva Open (ATP 250)" },
      ],
    },
    {
      id: "germany-tennis",
      name: "Germany",
      flag: <Flag country="germany" size={18} />,
      leagues: [
        { id: "halle-open", name: "Terra Wortmann Open (Halle)" },
        { id: "bmw-open", name: "BMW Open (Munich)" },
        { id: "berlin-wta", name: "Berlin Ladies Open" },
      ],
    },
    {
      id: "sweden-tennis",
      name: "Sweden",
      flag: <Flag country="sweden" size={18} />,
      leagues: [
        { id: "stockholm-open", name: "Stockholm Open (ATP 250)" },
      ],
    },
    {
      id: "argentina-tennis",
      name: "Argentina",
      flag: <Flag country="argentina" size={18} />,
      leagues: [
        { id: "argentina-open", name: "Argentina Open (ATP 250, Buenos Aires)" },
      ],
    },
    {
      id: "international-tennis",
      name: "International & Tours",
      flag: <Flag country="international" size={18} />,
      leagues: [
        { id: "atp", name: "ATP Tour (Men's Circuit)" },
        { id: "wta", name: "WTA Tour (Women's Circuit)" },
        { id: "abierto-monterrey", name: "Abierto GNP Seguros (Monterrey)" },
        { id: "laver-cup", name: "Laver Cup" },
        { id: "davis-cup", name: "Davis Cup" },
        { id: "bjk-cup", name: "Billie Jean King Cup" },
        { id: "olympics-tennis", name: "Olympics Tennis Tournament" },
      ],
    },
  ],

  Volleyball: [
    {
      id: "brazil-vball",
      name: "Brazil",
      flag: <Flag country="brazil" size={18} />,
      leagues: [
        { id: "superliga-vball", name: "Superliga Brasileira" },
        { id: "vnl-brazil", name: "VNL — Volleyball Nations League" },
      ],
    },
    {
      id: "italy-vball",
      name: "Italy",
      flag: <Flag country="italy" size={18} />,
      leagues: [
        { id: "superlega", name: "SuperLega" },
        { id: "coppa-italia-vball", name: "Coppa Italia" },
      ],
    },
    {
      id: "poland-vball",
      name: "Poland",
      flag: <Flag country="poland" size={18} />,
      leagues: [
        { id: "plusliga", name: "PlusLiga" },
        { id: "puchar-polski", name: "Puchar Polski" },
      ],
    },
    {
      id: "russia-vball",
      name: "Russia",
      flag: <Flag country="russia" size={18} />,
      leagues: [{ id: "superliga-russia", name: "Superliga" }],
    },
    {
      id: "usa-vball",
      name: "USA",
      flag: <Flag country="usa" size={18} />,
      leagues: [
        { id: "pro-vball", name: "PVF — Pro Volleyball Federation" },
        { id: "ncaa-vball", name: "NCAA Volleyball" },
      ],
    },
    {
      id: "france-vball",
      name: "France",
      flag: <Flag country="france" size={18} />,
      leagues: [
        { id: "ligue-a-vball", name: "Ligue A (LNV)" },
        { id: "coupe-france-vball", name: "Coupe de France" },
      ],
    },
    {
      id: "germany-vball",
      name: "Germany",
      flag: <Flag country="germany" size={18} />,
      leagues: [
        { id: "bundesliga-vball", name: "Volleyball Bundesliga" },
        { id: "dvv-pokal", name: "DVV-Pokal" },
      ],
    },
    {
      id: "japan-vball",
      name: "Japan",
      flag: <Flag country="japan" size={18} />,
      leagues: [{ id: "v-league", name: "V.League" }],
    },
    {
      id: "international-vball",
      name: "International",
      flag: <Flag country="international" size={18} />,
      leagues: [
        { id: "vnl", name: "FIVB Volleyball Nations League" },
        { id: "fivb-world-champs", name: "FIVB World Championship" },
        { id: "olympics-vball", name: "Olympics Volleyball" },
      ],
    },
  ],

  // Fallback countries for other sports (Ice Hockey, Rugby, etc.)
  "Ice Hockey": [
    {
      id: "canada-hockey",
      name: "Canada",
      flag: <Flag country="canada" size={18} />,
      leagues: [
        { id: "nhl-canada", name: "NHL (Canadian teams)" },
        { id: "ahl", name: "AHL" },
      ],
    },
    {
      id: "usa-hockey",
      name: "USA",
      flag: <Flag country="usa" size={18} />,
      leagues: [
        { id: "nhl-usa", name: "NHL (US teams)" },
        { id: "ushl", name: "USHL" },
      ],
    },
    {
      id: "russia-hockey",
      name: "Russia",
      flag: <Flag country="russia" size={18} />,
      leagues: [
        { id: "khl", name: "KHL" },
        { id: "vhl", name: "VHL" },
      ],
    },
    {
      id: "sweden-hockey",
      name: "Sweden",
      flag: <Flag country="sweden" size={18} />,
      leagues: [
        { id: "shl", name: "SHL — Swedish Hockey League" },
        { id: "hockeyallsvenskan", name: "Hockeyallsvenskan" },
      ],
    },
    {
      id: "switzerland-hockey",
      name: "Switzerland",
      flag: <Flag country="switzerland" size={18} />,
      leagues: [
        { id: "national-league", name: "National League" },
        { id: "swiss-cup-hockey", name: "Swiss Cup" },
      ],
    },
    {
      id: "germany-hockey",
      name: "Germany",
      flag: <Flag country="germany" size={18} />,
      leagues: [{ id: "del", name: "DEL — Deutsche Eishockey Liga" }],
    },
    {
      id: "international-hockey",
      name: "International",
      flag: <Flag country="international" size={18} />,
      leagues: [
        { id: "iihf-worlds", name: "IIHF World Championship" },
        { id: "olympics-hockey", name: "Olympics Ice Hockey" },
      ],
    },
  ],

  Rugby: [
    {
      id: "england-rugby",
      name: "England",
      flag: <Flag country="england" size={18} />,
      leagues: [
        { id: "prem-rugby", name: "Gallagher Premiership" },
        { id: "european-champions", name: "European Champions Cup" },
      ],
    },
    {
      id: "france-rugby",
      name: "France",
      flag: <Flag country="france" size={18} />,
      leagues: [
        { id: "top14", name: "TOP 14" },
        { id: "pro-d2", name: "PRO D2" },
      ],
    },
    {
      id: "australia-rugby",
      name: "Australia",
      flag: <Flag country="australia" size={18} />,
      leagues: [
        { id: "super-rugby-pacific", name: "Super Rugby Pacific" },
        { id: "nrc", name: "National Rugby Championship" },
      ],
    },
    {
      id: "argentina-rugby",
      name: "Argentina",
      flag: <Flag country="argentina" size={18} />,
      leagues: [
        { id: "super-rugby-americas", name: "Super Rugby Americas" },
        { id: "urba-top-12", name: "URBA Top 12" },
      ],
    },
    {
      id: "italy-rugby",
      name: "Italy",
      flag: <Flag country="italy" size={18} />,
      leagues: [
        { id: "urc-italy", name: "United Rugby Championship (Italian teams)" },
        { id: "serie-a-elite", name: "Serie A Elite" },
      ],
    },
    {
      id: "international-rugby",
      name: "International",
      flag: <Flag country="international" size={18} />,
      leagues: [
        { id: "rugby-world-cup", name: "Rugby World Cup" },
        { id: "six-nations", name: "Six Nations Championship" },
        { id: "rugby-championship", name: "The Rugby Championship" },
      ],
    },
  ],

  Baseball: [
    {
      id: "usa-baseball",
      name: "USA",
      flag: <Flag country="usa" size={18} />,
      leagues: [
        { id: "mlb", name: "MLB — Major League Baseball" },
        { id: "aaa", name: "Triple-A (AAA)" },
      ],
    },
    {
      id: "japan-baseball",
      name: "Japan",
      flag: <Flag country="japan" size={18} />,
      leagues: [
        { id: "npb", name: "NPB — Nippon Professional Baseball" },
        { id: "japan-series", name: "Japan Series" },
      ],
    },
    {
      id: "korea-baseball",
      name: "South Korea",
      flag: <Flag country="korea" size={18} />,
      leagues: [
        { id: "kbo", name: "KBO League" },
        { id: "korean-series", name: "Korean Series" },
      ],
    },
  ],

  Cricket: [
    {
      id: "england-cricket",
      name: "England",
      flag: <Flag country="england" size={18} />,
      leagues: [
        { id: "county-cricket", name: "County Championship" },
        { id: "the-hundred", name: "The Hundred" },
        { id: "vitality-blast", name: "Vitality T20 Blast" },
      ],
    },
    {
      id: "australia-cricket",
      name: "Australia",
      flag: <Flag country="australia" size={18} />,
      leagues: [
        { id: "bbl", name: "Big Bash League" },
        { id: "sheffield-shield", name: "Sheffield Shield" },
      ],
    },
    {
      id: "india-cricket",
      name: "India",
      flag: <Flag country="india" size={18} />,
      leagues: [
        { id: "ipl", name: "IPL — Indian Premier League" },
        { id: "ranji-trophy", name: "Ranji Trophy" },
      ],
    },
  ],

  Handball: [
    {
      id: "germany-handball",
      name: "Germany",
      flag: <Flag country="germany" size={18} />,
      leagues: [
        { id: "bundesliga-handball", name: "Handball Bundesliga" },
        { id: "dhb-pokal", name: "DHB-Pokal" },
      ],
    },
    {
      id: "france-handball",
      name: "France",
      flag: <Flag country="france" size={18} />,
      leagues: [
        { id: "starligue", name: "Starligue" },
        { id: "coupe-handball", name: "Coupe de France" },
      ],
    },
    {
      id: "spain-handball",
      name: "Spain",
      flag: <Flag country="spain" size={18} />,
      leagues: [
        { id: "liga-asobal", name: "Liga ASOBAL" },
        { id: "copa-rey-handball", name: "Copa del Rey" },
      ],
    },
  ],

  Boxing: [
    {
      id: "usa-boxing",
      name: "USA",
      flag: <Flag country="usa" size={18} />,
      leagues: [
        { id: "wbc", name: "WBC Championships" },
        { id: "wba", name: "WBA Championships" },
        { id: "ibf", name: "IBF Championships" },
      ],
    },
    {
      id: "uk-boxing",
      name: "England",
      flag: <Flag country="england" size={18} />,
      leagues: [
        { id: "bbc-boxing", name: "British Boxing Board of Control" },
        { id: "wbo-uk", name: "WBO" },
      ],
    },
    {
      id: "mexico-boxing",
      name: "Mexico",
      flag: <Flag country="mexico" size={18} />,
      leagues: [
        { id: "cmb", name: "CMB — Consejo Mundial de Boxeo" },
        { id: "wbc-mexico", name: "WBC Mexico" },
      ],
    },
  ],

  Golf: [
    {
      id: "usa-golf",
      name: "USA",
      flag: <Flag country="usa" size={18} />,
      leagues: [
        { id: "pga-tour", name: "PGA Tour" },
        { id: "korn-ferry", name: "Korn Ferry Tour" },
      ],
    },
    {
      id: "uk-golf",
      name: "England",
      flag: <Flag country="england" size={18} />,
      leagues: [
        { id: "dp-world-tour", name: "DP World Tour (European Tour)" },
        { id: "the-open", name: "The Open Championship" },
      ],
    },
    {
      id: "japan-golf",
      name: "Japan",
      flag: <Flag country="japan" size={18} />,
      leagues: [
        { id: "jgto", name: "JGTO — Japan Golf Tour" },
        { id: "jlpga", name: "JLPGA Tour" },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Sport icons (Streamline SVG as requested by user)
// ---------------------------------------------------------------------------
const StreamlineSportIcon = ({ size = 22 }: { size?: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    id="Elastic-Search-Logo--Streamline-Logos"
    height={size}
    width={size}
  >
    <path
      fill="currentColor"
      fillRule="evenodd"
      d="M10.897 7.5h5.442a8.5 8.5 0 0 0 4.28 -1.156l0.61 -0.356 -0.324 -0.448A10.986 10.986 0 0 0 12 1c-1.836 0 -3.567 0.45 -5.089 1.245A12.286 12.286 0 0 1 10.897 7.5ZM5.533 3.1a11.052 11.052 0 0 0 -3.208 3.662l-0.4 0.738h7.34a10.794 10.794 0 0 0 -3.732 -4.4ZM9.826 9c0.276 0.952 0.424 1.959 0.424 3s-0.148 2.048 -0.424 3h-8.42l-0.092 -0.381A11.025 11.025 0 0 1 1 12c0 -0.902 0.109 -1.779 0.314 -2.619L1.407 9h8.419Zm1.554 0c0.242 0.96 0.37 1.965 0.37 3s-0.128 2.04 -0.37 3H16a3 3 0 1 0 0 -6h-4.62Zm-9.455 7.5h7.34a10.794 10.794 0 0 1 -3.732 4.399 11.052 11.052 0 0 1 -3.208 -3.66l-0.4 -0.739ZM12 23a10.96 10.96 0 0 1 -5.089 -1.245 12.287 12.287 0 0 0 3.986 -5.255h5.442a8.5 8.5 0 0 1 4.28 1.156l0.61 0.356 -0.324 0.448A10.986 10.986 0 0 1 12 23Z"
      clipRule="evenodd"
    />
  </svg>
);

const IndianSuperLeagueIcon = ({ size = 22 }: { size?: number }) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    id="Indiansuperleague--Streamline-Simple-Icons"
    height={size}
    width={size}
  >
    <title>Indian Super League</title>
    <path
      d="M10.59766 0.10938C8.95434 0.10104 7.5554 0.58357 6.94336 0.88086c-0.11273 0.0545 -0.22433 0.1126 -0.35156 0.18164C4.78218 3.766 4.33554 6.69795 4.0957 7.8789c0.26408 0.30678 0.52699 0.58814 0.80078 0.84962 -1.07275 0.03838 -2.03204 -0.00761 -2.80859 -0.1543 -0.33058 0.63514 -0.61723 1.20155 -0.86719 1.73047C0.99935 9.7809 0.8152 9.28492 0.75195 8.56445c-0.3342 0.39607 -0.49852 0.77729 -0.55664 1.11524v0.03125c-0.09448 0.49055 -0.14861 0.97195 -0.17773 1.48437 -0.03625 0.67942 -0.01414 1.35171 0.0586 2.00586 0 0.04657 0.03052 0.28815 0.03905 0.32227 0.06 0.41695 0.13848 0.8315 0.23829 1.23828 0.00803 0.03241 -0.0082 -0.01544 0.0371 0.1504 0.00014 0.00053 0.0699 0.25394 0.07227 0.2461 0.83843 2.8787 2.3119 4.76328 4.35742 6.38086 0.10029 0.01877 0.20602 0.03355 0.31446 0.04688 0.31308 0.28653 0.6532 0.56117 1.11328 0.88086 0.71513 0.30126 1.60352 0.67465 2.77539 0.99414 0.0836 -0.13436 0.19644 -0.2729 0.3418 -0.42188 -0.81711 -0.50461 -1.3046 -0.81155 -1.97462 -1.44726 0.9546 -0.06846 1.9968 -0.1977 3.0332 -0.32813v-0.0039c0.07814 -0.66713 0.18119 -1.26748 0.34766 -2.02343 0.5766 0.48578 1.14455 0.91864 1.84766 1.4336 -0.04942 0.273 -0.07803 0.51066 -0.11523 0.85546 0.39197 0.21598 0.68197 0.37125 0.93945 0.50195 -0.47944 0.09048 -0.95232 0.17008 -1.41211 0.23828 -0.0073 0.58867 0.00029 0.61018 0.13477 1.11524 0.85762 0.29796 1.03607 0.33892 1.77734 0.50976 0.3452 -0.0691 0.95215 -0.2225 1.35547 -0.3496h0.0039c0.07636 -0.30533 0.1012 -0.31144 0.2793 -0.76563a96.46696 96.46696 0 0 1 -0.33594 -0.18555c0.61706 -0.11713 1.24963 -0.26233 1.87695 -0.42969 0 0 0.32307 -0.53391 1.06445 -1.89648 -0.18245 -0.15612 -0.61101 -0.51041 -1.15234 -0.95508 0.3126 -0.82414 0.5334 -1.42238 0.70898 -1.92187a29.32447 29.32447 0 0 1 0.7793 -0.16797c0.47606 -1.37368 0.65186 -1.87142 1.50586 -4.03711 -0.24974 -0.4401 -0.46855 -0.81353 -0.68945 -1.16797 0.2034 0.17544 0.42375 0.36465 0.70117 0.60547 0.13448 -0.05449 0.26798 -0.1079 0.40234 -0.16602 1.02473 -0.4288 1.94057 -0.86248 2.73633 -1.29492v-0.002c0.31259 -1.56614 0.34283 -2.41444 0.38282 -3.59178 -0.923 -0.83938 -1.5409 -1.29324 -2.47852 -1.97265 -0.7449 0.40332 -1.59923 0.81124 -2.55859 1.21093 -0.12349 0.05087 -0.24777 0.1051 -0.375 0.15235 -0.16097 1.09869 -0.3181 1.83647 -0.52148 2.6875 -0.05766 -0.07247 -0.10876 -0.13865 -0.16993 -0.21485 -1.47166 0.30159 -2.98648 0.6827 -4.47265 1.14063 -0.20145 1.05256 -0.33834 1.84446 -0.43555 2.63477 -0.60046 0.12875 -1.1954 0.24428 -1.78125 0.3457 -0.76223 -0.87702 -1.36607 -1.63645 -1.86719 -2.33594 0.21567 0.09574 0.42651 0.18967 0.66211 0.28906 1.3355 -1.03594 2.35838 -1.86542 3.28907 -2.67968 0.33263 0.1617 0.68196 0.33024 1.0918 0.52539 0.9178 -0.7365 1.81918 -1.51219 2.67187 -2.30664 -0.58867 -1.72975 -0.92008 -2.41288 -1.46875 -3.54297a237.94319 237.94319 0 0 1 -0.97657 -0.27344C13.43207 1.4266 12.93946 0.52017 12.93946 0.48828c-0.79715 -0.27026 -1.59483 -0.37512 -2.3418 -0.3789Zm6.88086 0.7832c-0.87955 0.28476 -1.62698 0.67187 -1.64648 0.67187 0.25083 0.68316 0.41743 1.3906 0.5664 2.01563 0.9775 0.50143 1.67304 0.97418 2.23633 1.35937 0.58866 -0.28346 1.14003 -0.51649 1.65234 -0.6836 -0.14898 -0.9121 -0.35539 -1.51436 -0.53711 -2.04491 -0.84663 -0.61772 -1.63557 -1.00586 -2.27148 -1.31836ZM3.46094 3.38086l0.00195 0.00195 0.00195 -0.00195zm0.00195 0.00195c-0.42072 0.41375 -0.8214 0.85235 -1.1914 1.32031 0 0 -0.00225 0.012 -0.00587 0.01563 -0.22534 0.54867 -0.48457 1.3216 -0.66992 1.88477 0.14898 0.14535 0.33448 0.28349 0.54883 0.41796 0.33433 -0.46518 0.79364 -1.06087 1.14258 -1.5078 0.17073 -0.54143 0.43548 -1.2525 0.64258 -1.7793 -0.1844 -0.11215 -0.33993 -0.2322 -0.4668 -0.35157Zm11.31836 0.52734c0.4485 0.92496 0.77407 1.66902 1.23633 2.98633 -0.6919 0.635 -1.40973 1.25594 -2.14453 1.85352a115.7121 115.7121 0 0 1 -0.60938 -0.29297c0.70758 -0.63443 1.38006 -1.27556 2.11719 -2.01562 -0.35197 -1.01946 -0.67735 -1.88363 -0.97656 -2.63672 -0.0004 -0.0004 0.01565 0.0047 0.37695 0.10546zM2.41406 9.0625c0.86184 0.12732 1.86338 0.15634 2.9668 0.0996 0.72448 0.6061 1.55666 1.12022 2.66602 1.65821 0.58175 0.87448 1.2899 1.80434 2.23828 2.9082 -0.38338 1.3918 -0.64943 2.4489 -0.98243 4.17774 0.38721 0.37202 0.73084 0.68634 1.06055 0.97656 -0.1579 0.71876 -0.26302 1.30403 -0.3418 1.90235 -1.17492 0.1452 -2.34363 0.27701 -3.33789 0.3164 -0.632 -0.35033 -1.3539 -0.7714 -2.11328 -1.31054 -0.16764 0.16503 -0.30908 0.32691 -0.42383 0.48437 -1.52965 -1.4295 -2.63206 -3.1043 -3.29101 -5.55664 -0.02458 -0.09153 -0.04463 -0.18145 -0.0625 -0.27148 0.11145 -0.1633 0.245 -0.3306 0.39062 -0.50196 -0.03164 -0.76196 -0.06062 -1.45003 0.00977 -2.32226 0.29063 -0.7321 0.71661 -1.58413 1.2207 -2.56055Zm14.83203 0.93555c0.08038 0.10142 0.15203 0.19551 0.22657 0.29101 -0.01035 0.0423 -0.0187 0.07781 -0.0293 0.1211 0.1479 0.12316 0.22428 0.18808 0.34765 0.29101 0.68221 0.89958 1.13217 1.59025 1.67969 2.54688 -0.67878 1.72765 -0.93478 2.43437 -1.32226 3.55078 -0.07204 0.0152 -0.14459 0.03303 -0.2168 0.04883 0.09074 -0.26703 0.1829 -0.54496 0.29101 -0.8711 -1.6134 -1.5734 -1.87347 -1.8424 -3.33789 -3.33593 -0.59952 0.16079 -1.2005 0.30816 -1.79687 0.44336 0.0851 -0.64947 0.19884 -1.3142 0.3496 -2.11524 2.16083 -0.64889 3.79153 -0.95932 3.8086 -0.9707zM3.15625 13.0039c-0.30533 1.12658 -0.38373 1.92205 -0.44922 2.62695 0.64316 1.1447 1.34364 2.0049 1.91406 2.69531 0.66758 0.07264 1.4184 0.09774 2.23438 0.07617 0.06911 -0.91212 0.24807 -1.80775 0.4043 -2.60351 -0.85389 -1.07923 -1.41037 -1.98807 -1.85743 -2.71485 -0.81751 0.01812 -1.57393 -0.00371 -2.24609 -0.08007Zm19.29297 1.04297c-0.69777 0.4288 -1.42251 0.84293 -2.16016 1.25 -0.21446 0.79576 -0.24948 0.91586 -0.68554 2.34765 0.3998 0.24218 0.89073 0.55728 1.4746 0.94727 0.64317 -0.34883 1.19204 -0.72708 1.79883 -1.09766 0.06186 -0.03637 0.11571 -0.07273 0.17383 -0.10547 0.01206 0 0.01952 -0.0156 0.02343 -0.02734 -0.01315 -0.01315 0.03383 -0.02245 0.22852 -0.47655 0.26522 -0.55955 0.48625 -1.1407 0.66797 -1.74024 0.01088 -0.02912 0.01843 -0.05888 0.0293 -0.08789 -0.3852 -0.37794 -0.39231 -0.3737 -1.35156 -1.13672 -0.06626 0.0425 -0.13282 0.08463 -0.19922 0.12695zm-3.07813 6.28125c-0.32707 0.35607 -0.78398 0.80239 -1.1328 1.13671 0.10078 0.15118 0.17596 0.29508 0.23046 0.43555 0.47184 -0.16336 0.93866 -0.35904 1.38867 -0.58398 0 0 0.0039 -0.0042 0.0039 -0.0078 0.37432 -0.34158 0.85011 -0.83969 1.19532 -1.20313 -0.06175 -0.1671 -0.14772 -0.33793 -0.26758 -0.51953 -0.46474 0.26217 -0.94274 0.4998 -1.41797 0.74218zm-2.52343 -0.52344c0.29259 0.24078 0.5342 0.43964 0.69921 0.57812 -0.41402 0.74796 -0.70587 1.26414 -0.75 1.3379 -0.63406 0.16403 -1.26896 0.30608 -1.88476 0.416 -0.71425 -0.30196 -1.1466 -0.51623 -1.8457 -0.89452 0.01997 -0.16895 0.04622 -0.33773 0.07813 -0.51758 1.19164 -0.20783 2.4245 -0.47919 3.66015 -0.8086 0.0143 -0.03711 0.02864 -0.07421 0.04296 -0.11132z"
      fill="currentColor"
    />
  </svg>
);

const Cinema4dIcon = ({ size = 22 }: { size?: number }) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    id="Cinema4d--Streamline-Simple-Icons"
    height={size}
    width={size}
  >
    <title>Cinema 4D</title>
    <path
      d="M12.052 0C5.394 -0.007 -0.003 5.412 0 11.976 0.003 18.654 5.475 23.981 11.978 24c6.535 0.02 12.057 -5.306 12.022 -11.998 -0.009 -1.665 -0.53 -5.371 -1.84 -5.276 -1.98 0.145 -2.159 4.12 -2.377 5.407 -0.417 2.46 -1.346 5.08 -2.953 6.99 -1.88 2.359 -4.697 3.634 -7.662 3.158 -3.55 -0.564 -5.893 -3.278 -6.68 -5.201 -0.753 -1.723 -1.035 -4.162 -0.07 -6.324 1.16 -2.766 3.734 -4.632 6.28 -5.584 2.006 -0.827 4.103 -1.151 5.357 -1.375 2.516 -0.5 2.855 -1.463 2.814 -2.149 -0.015 -0.252 -0.256 -0.724 -0.785 -0.943C15.03 0.269 13.268 0.001 12.052 0zm5.098 1.342c0.139 0.398 0.088 0.85 -0.148 1.256 -0.325 0.56 -0.972 1.05 -1.897 1.29 -1.636 0.428 -2.976 0.554 -4.34 0.96 -1.312 0.39 -3.397 1.018 -5.316 2.552 -0.268 0.842 -0.341 1.892 -0.369 2.662 0.15 5.014 4.557 8.884 9.17 8.682 0.853 -0.037 1.921 -0.261 2.912 -0.68a13.56 13.56 0 0 0 1.387 -2.683l0.002 -0.002v-0.002c0.424 -1.03 0.606 -1.836 0.8 -2.793 0.32 -1.565 0.202 -2.88 1.012 -4.758 0.251 -0.582 0.71 -1.113 1.258 -1.346 0.25 -0.105 0.522 -0.133 0.79 -0.072 -0.89 -2.471 -3.115 -4.326 -5.26 -5.066z"
      fill="currentColor"
    />
  </svg>
);

const VolleyballIcon = ({ size = 22 }: { size?: number }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    id="Volleyball-2--Streamline-Solar"
    height={size}
    width={size}
  >
    <desc>Volleyball 2 Streamline Icon: https://streamlinehq.com</desc>
    <path
      d="m11.756 13.3257 0.2611 -0.3323c3.3479 0.0794 6.4616 1.7006 8.4231 4.3719 -1.7749 2.7864 -4.8917 4.6346 -8.4402 4.6346 -1.2823 0 -2.50819 -0.2414 -3.63478 -0.6811 2.54798 -0.5687 4.99548 -1.6752 7.12788 -3.1695 0.3393 -0.2377 0.4215 -0.7054 0.1838 -1.0446 -0.2377 -0.3392 -0.7054 -0.4215 -1.0446 -0.1838 -2.4965 1.7495 -5.4396 2.9127 -8.41727 3.2368 -0.87941 -0.6247 -1.65345 -1.3881 -2.29024 -2.2583 3.07752 -0.4802 5.88709 -2.1002 7.83121 -4.5737Z"
      fill="currentColor"
      strokeWidth="1"
    />
    <path
      d="m10.7467 12.1824 -0.1701 0.2164c-1.83741 2.3378 -4.5591 3.8105 -7.51084 4.0981C2.38398 15.145 2 13.6173 2 11.9999c0 -2.72842 1.09268 -5.20161 2.86432 -7.00587l-0.00127 0.00566C4.3182 7.43417 4.2879 9.9424 4.77311 12.3864c0.08065 0.4063 0.4754 0.6703 0.88168 0.5896 0.40629 -0.0806 0.67026 -0.4754 0.5896 -0.8817 -0.57284 -2.88541 -0.36189 -5.86966 0.63493 -8.68564C7.93127 2.7803 9.1083 2.33968 10.3642 2.13303l-0.1793 0.42584c-1.31883 3.13212 -1.10297 6.68067 0.5618 9.62353Z"
      fill="currentColor"
      strokeWidth="1"
    />
    <path
      d="M12.0812 11.4946c-1.4633 -2.55014 -1.6591 -5.63376 -0.5139 -8.35364L12.0477 2c4.5842 0.02142 8.4395 3.12739 9.5972 7.3491 -2.1836 -1.83306 -4.7862 -3.09005 -7.5643 -3.67209 -0.4054 -0.08494 -0.8029 0.17486 -0.8878 0.58027 -0.085 0.40541 0.1748 0.80292 0.5802 0.88785 2.9524 0.61855 5.6857 2.07102 7.8511 4.21297l0.002 0.002 0.3704 0.3726c0.0023 0.0888 0.0035 0.1779 0.0035 0.2672 0 1.3877 -0.2827 2.7094 -0.7935 3.9106 -2.2423 -2.7021 -5.569 -4.3234 -9.1253 -4.4159Z"
      fill="currentColor"
      strokeWidth="1"
    />
  </svg>
);

const NhlIcon = ({ size = 22 }: { size?: number }) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    id="Nhl--Streamline-Simple-Icons"
    height={size}
    width={size}
  >
    <title>NHL</title>
    <path
      d="M5.455 0 4.61 2.314c-0.262 0.72 -0.693 1.172 -1.277 1.344l-1.914 0.565 0.812 1.843c0.376 0.851 0.567 1.738 0.567 2.64 0 2.49 -1.272 3.06 -1.272 5.827 0 3.988 3.083 6.597 5.948 7.334 1.448 0.353 1.886 0.375 3.193 0.697L12 24l1.334 -1.436c1.308 -0.322 1.744 -0.344 3.191 -0.697 2.865 -0.737 5.95 -3.346 5.95 -7.334 0 -2.767 -1.272 -3.336 -1.272 -5.828 0 -0.9 0.191 -1.788 0.567 -2.639l0.812 -1.843 -1.914 -0.565c-0.585 -0.172 -1.014 -0.624 -1.277 -1.344L18.545 0l-1.887 1.563c-0.5 0.414 -1.006 0.623 -1.506 0.623 -0.668 0 -1.429 -0.326 -1.937 -0.829L12 0.157l-1.215 1.2c-0.508 0.503 -1.269 0.829 -1.937 0.829 -0.5 0 -1.006 -0.21 -1.506 -0.623L5.455 0zm0.14 0.523 1.546 1.28c0.508 0.42 1.09 0.697 1.707 0.697 0.827 0 1.646 -0.414 2.158 -0.92L12 0.596l0.996 0.984c0.512 0.506 1.33 0.92 2.156 0.92 0.617 0 1.199 -0.276 1.707 -0.697l1.545 -1.28 0.694 1.899c0.298 0.817 0.796 1.335 1.48 1.537l1.572 0.463 -0.668 1.517a6.856 6.856 0 0 0 -0.591 2.766c0 2.591 1.271 3.108 1.271 5.828 0 3.643 -2.711 6.257 -5.713 7.03 -1.484 0.375 -2.177 0.413 -3.283 0.722C13.022 22.436 12 23.54 12 23.54s-1.022 -1.103 -1.166 -1.254c-1.106 -0.31 -1.797 -0.347 -3.281 -0.723 -3.003 -0.772 -5.715 -3.386 -5.715 -7.029 0 -2.72 1.271 -3.237 1.271 -5.828a6.87 6.87 0 0 0 -0.591 -2.766L1.85 4.422l1.572 -0.463c0.685 -0.202 1.183 -0.72 1.482 -1.537L5.596 0.523zM12 1.607s-1.25 1.616 -3.152 1.616c-1.475 0 -2.93 -1.498 -2.93 -1.498 -0.658 2.949 -3.084 3.16 -3.084 3.16s0.988 1.746 0.988 3.814c0 2.654 -1.27 3.406 -1.27 5.834 0 2.675 1.833 5.482 5.178 6.328 1.59 0.402 2.687 0.504 3.495 0.795 0.103 0.097 0.775 0.826 0.775 0.826s0.672 -0.729 0.775 -0.826c0.808 -0.291 1.905 -0.393 3.495 -0.795 3.344 -0.846 5.177 -3.653 5.177 -6.328 0 -2.428 -1.267 -3.18 -1.267 -5.834 0 -2.068 0.986 -3.814 0.986 -3.814s-2.426 -0.211 -3.084 -3.16c0 0 -1.455 1.498 -2.93 1.498C13.251 3.223 12 1.607 12 1.607zm0 1.01s1.258 1.33 3.152 1.33c1.512 0 2.608 -1.021 2.608 -1.021 0.769 2.09 2.42 2.422 2.42 2.422s-0.715 1.459 -0.715 3.351c0 2.809 1.27 3.623 1.27 5.834 0 3.091 -2.41 5.058 -4.643 5.625 -1.769 0.45 -2.925 0.5 -3.701 0.875 0 0 -0.284 0.258 -0.391 0.377 -0.107 -0.119 -0.389 -0.377 -0.389 -0.377 -0.776 -0.375 -1.934 -0.426 -3.703 -0.875 -2.233 -0.567 -4.642 -2.534 -4.642 -5.625 0 -2.211 1.27 -3.025 1.27 -5.834 0 -1.892 -0.716 -3.351 -0.716 -3.351s1.651 -0.333 2.42 -2.422c0 0 1.096 1.021 2.608 1.021 1.894 0 3.152 -1.33 3.152 -1.33zm0 1.06c-0.632 0.465 -1.737 1.08 -3.152 1.08 -0.934 0 -1.729 -0.315 -2.29 -0.628A4.515 4.515 0 0 1 4.862 5.79c0.224 0.67 0.485 1.708 0.485 2.908 0 2.313 -0.79 3.396 -1.123 4.705l11.582 -8.697c-0.209 0.033 -0.427 0.05 -0.653 0.05 -1.414 0 -2.52 -0.615 -3.152 -1.08zm5.674 0.805L4.08 14.69c0.065 2.008 1.362 3.472 2.844 4.233l11.828 -8.883c-0.061 -0.4 -0.098 -0.84 -0.098 -1.34 0 -1.2 0.26 -2.237 0.485 -2.908a4.438 4.438 0 0 1 -1.465 -1.309zm-1.666 2.153v3.398l1.8 -1.351s-0.06 0.433 0 1.164l-2.822 2.12V8.304c0 -0.518 -0.494 -0.532 -0.494 -0.532l1.516 -1.136zm-1.871 1.404v4.565l-0.975 0.73v-1.668l-1.121 0.842v1.67l-1.023 0.767v-3.662c0 -0.518 -0.495 -0.531 -0.495 -0.531l1.518 -1.139V11.3l1.121 -0.842V8.77l0.975 -0.73zm4.838 3.012L7.949 19.33c0.053 0.014 0.105 0.029 0.158 0.042 1.401 0.357 3.116 0.54 3.633 0.836 0.117 0.085 0.26 0.236 0.26 0.236s0.143 -0.15 0.26 -0.236c0.517 -0.296 2.232 -0.48 3.633 -0.836 1.941 -0.493 4.03 -2.216 4.03 -4.84 0 -1.307 -0.573 -2.168 -0.948 -3.482zm-8.852 0.002v4.564l-1.053 0.791 -1.133 -1.738v2.59l-0.996 0.746v-3.662c0 -0.518 -0.494 -0.531 -0.494 -0.531l1.41 -1.06L9.13 14.7v-2.898l0.994 -0.748zm10.346 9.799a0.818 0.818 0 1 0 0 1.637 0.818 0.818 0 0 0 0 -1.637zm0 0.175a0.643 0.643 0 1 1 0 1.285 0.643 0.643 0 0 1 0 -1.285zm-0.336 0.176v0.934h0.176v-0.38h0.125l0.177 0.38h0.194l-0.184 -0.395a0.276 0.276 0 0 0 0.184 -0.262 0.277 0.277 0 0 0 -0.278 -0.277h-0.394zm0.176 0.176h0.218a0.101 0.101 0 1 1 0 0.203h-0.218v-0.203z"
      fill="currentColor"
    />
  </svg>
);

const BallsSolarIcon = ({ size = 22 }: { size?: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    id="Balls--Streamline-Solar"
    height={size}
    width={size}
  >
    <desc>Balls Streamline Icon: https://streamlinehq.com</desc>
    <g id="Bold Duotone/Sports/Balls">
      <path
        id="Vector"
        fill="currentColor"
        opacity={0.5}
        d="M16.0194 8.07617c-2.0184 0.19419 -4.1635 0.79946 -5.6536 2.28963 -1.49017 1.4901 -2.09544 3.6352 -2.28963 5.6536l5.90313 5.9031c2.0184 -0.1942 4.1634 -0.7995 5.6536 -2.2896 1.4901 -1.4902 2.0954 -3.6352 2.2896 -5.6536l-5.9031 -5.90313Z"
        strokeWidth="1"
      />
      <g id="Group">
        <path
          id="Vector_2"
          fill="currentColor"
          opacity={0.5}
          d="M9.27639 2.0459c1.96021 0.2376 3.78871 1.36209 4.85191 3.20376 0.5406 0.93635 0.8218 1.9513 0.8658 2.9616 -0.9867 0.16737 -1.9724 0.44969 -2.8683 0.90066 -0.4591 -0.51665 -0.9345 -1.14909 -1.375 -1.91199C9.12581 4.38534 9.27639 2.0459 9.27639 2.0459Z"
          strokeWidth="1"
        />
        <path
          id="Vector_3"
          fill="currentColor"
          opacity={0.5}
          d="m3.21669 12.2879 -0.02802 -0.0395c-0.11261 -0.1599 -0.21902 -0.3263 -0.3187 -0.4989 -1.09921 -1.90397 -1.12579 -4.13279 -0.26723 -5.9868 0.66067 0.46919 2.36241 1.81591 3.64476 4.037 0.10156 0.17591 0.19619 0.35 0.28435 0.5217 0.08212 0.16 0.15864 0.318 0.22992 0.4736 0.06728 0.1469 0.12991 0.2916 0.18819 0.434 0.05717 0.1396 0.11017 0.2769 0.1593 0.4116 0.69273 1.8992 0.61483 3.2768 0.61265 3.3129 -1.20525 -0.1461 -2.36068 -0.6277 -3.31907 -1.4049 -0.05644 -0.0458 -0.11221 -0.0926 -0.16726 -0.1404 -0.20541 -0.1784 -0.40088 -0.3711 -0.58487 -0.5775 -0.15291 -0.1715 -0.29789 -0.3525 -0.43402 -0.5428Z"
          strokeWidth="1"
        />
      </g>
      <path
        id="Vector_4"
        fill="currentColor"
        fillRule="evenodd"
        d="M5.24894 2.86997c1.26725 -0.73165 2.67846 -0.98808 4.02728 -0.82458 0 0 -0.15058 2.33944 1.47438 5.15403 0.4406 0.76311 0.9162 1.39568 1.3754 1.91242 -0.6441 0.32417 -1.2418 0.73551 -1.7602 1.25396 -1.23952 1.2395 -1.86679 2.9321 -2.1545 4.6281 -0.16386 -0.0074 -0.32718 -0.021 -0.48959 -0.0407 0.00182 -0.0298 0.08173 -1.4092 -0.61266 -3.3129 -0.04912 -0.1347 -0.10212 -0.272 -0.15929 -0.4116 -0.05829 -0.1424 -0.12091 -0.2871 -0.18819 -0.434 -0.07129 -0.1556 -0.1478 -0.3136 -0.22992 -0.4736 -0.08817 -0.1717 -0.18279 -0.34576 -0.28436 -0.52167 -1.28234 -2.22109 -2.98408 -3.56781 -3.64475 -4.03701 0.5434 -1.17344 1.44138 -2.19673 2.6464 -2.89245Z"
        clipRule="evenodd"
        strokeWidth="1"
      />
      <path
        id="Vector_5"
        fill="currentColor"
        d="M19.2479 8.06108c-0.9323 -0.07128 -2.0589 -0.09672 -3.2279 0.01575l5.9031 5.90307c0.1124 -1.169 0.087 -2.2956 0.0157 -3.2279 -0.1113 -1.45582 -1.2351 -2.57961 -2.6909 -2.69092Z"
        strokeWidth="1"
      />
      <path
        id="Vector_6"
        fill="currentColor"
        d="M10.752 21.9393c0.9323 0.0713 2.0589 0.0967 3.2279 -0.0157l-5.90307 -5.9031c-0.11247 1.169 -0.08703 2.2956 -0.01575 3.2279 0.11131 1.4558 1.2351 2.5796 2.69092 2.6909Z"
        strokeWidth="1"
      />
      <path
        id="Vector_7"
        fill="currentColor"
        fillRule="evenodd"
        d="M14.9597 12.312c0.205 -0.2051 0.5375 -0.2051 0.7425 0l0.6216 0.6216 0.6217 -0.6216c0.205 -0.2051 0.5375 -0.2051 0.7425 0 0.205 0.205 0.205 0.5374 0 0.7424l-0.6217 0.6217 0.6217 0.6217c0.205 0.205 0.205 0.5374 0 0.7424 -0.205 0.2051 -0.5375 0.2051 -0.7425 0l-0.6217 -0.6216 -0.5814 0.5814 0.6217 0.6216c0.205 0.2051 0.205 0.5375 0 0.7425 -0.205 0.205 -0.5374 0.205 -0.7424 0L15 15.7424l-0.5814 0.5814 0.6216 0.6217c0.2051 0.205 0.2051 0.5375 0 0.7425 -0.205 0.205 -0.5374 0.205 -0.7424 0l-0.6217 -0.6217 -0.6217 0.6217c-0.205 0.205 -0.5374 0.205 -0.7424 0 -0.2051 -0.205 -0.2051 -0.5375 0 -0.7425l0.6216 -0.6217 -0.6216 -0.6216c-0.2051 -0.205 -0.2051 -0.5375 0 -0.7425 0.205 -0.205 0.5374 -0.205 0.7424 0l0.6217 0.6217 0.5814 -0.5814 -0.6217 -0.6217c-0.205 -0.205 -0.205 -0.5374 0 -0.7424 0.2051 -0.205 0.5375 -0.205 0.7425 0l0.6217 0.6217 0.5814 -0.5814 -0.6217 -0.6217c-0.205 -0.205 -0.205 -0.5374 0 -0.7424Z"
        clipRule="evenodd"
        strokeWidth="1"
      />
    </g>
  </svg>
);

const TicketSolarIcon = ({ size = 22 }: { size?: number }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    id="Ticket--Streamline-Solar"
    height={size}
    width={size}
  >
    <desc>Ticket Streamline Icon: https://streamlinehq.com</desc>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M14.0079 19.0029 14.0137 17c0 -0.5523 0.4488 -1 1.0025 -1 0.5536 0 1.0025 0.4477 1.0025 1v1.9765c0 0.4815 0 0.7223 0.1544 0.8699 0.1544 0.1477 0.3906 0.1376 0.8631 0.1176 1.8629 -0.0788 3.0075 -0.3308 3.8142 -1.1356 0.8087 -0.8066 1.0606 -1.9518 1.139 -3.8179 0.0156 -0.37 0.0234 -0.5551 -0.0457 -0.6785 -0.0691 -0.1235 -0.345 -0.2775 -0.8968 -0.5857 -0.6128 -0.3422 -1.027 -0.996 -1.027 -1.7463s0.4142 -1.4041 1.027 -1.7463c0.5518 -0.30816 0.8277 -0.46223 0.8968 -0.58567 0.0691 -0.12345 0.0613 -0.30849 0.0457 -0.67856 -0.0784 -1.86608 -0.3303 -3.01124 -1.139 -3.8179 -0.8777 -0.87553 -2.1552 -1.09677 -4.3226 -1.15267 -0.2796 -0.00721 -0.5091 0.21828 -0.5091 0.49728V7c0 0.55228 -0.4489 1 -1.0025 1 -0.5537 0 -1.0025 -0.44772 -1.0025 -1l-0.0073 -2.50145C14.0056 4.22298 13.7814 4 13.5052 4H9.99502C6.21439 4 4.32407 4 3.14958 5.17157c-0.80867 0.80666 -1.06055 1.95182 -1.139 3.8179 -0.01556 0.37007 -0.02334 0.55511 0.04576 0.67855 0.06911 0.12345 0.34499 0.27752 0.89674 0.58568 0.61278 0.3422 1.02699 0.996 1.02699 1.7463s-0.41421 1.4041 -1.02699 1.7463c-0.55175 0.3082 -0.82763 0.4622 -0.89674 0.5857 -0.0691 0.1234 -0.06132 0.3085 -0.04576 0.6785 0.07845 1.8661 0.33033 3.0113 1.139 3.8179C4.32407 20 6.21438 20 9.99502 20h3.01038c0.4713 0 0.707 0 0.8537 -0.1459 0.1467 -0.146 0.1474 -0.381 0.1488 -0.8512ZM16.0187 13v-2c0 -0.5523 -0.4489 -1 -1.0025 -1 -0.5537 0 -1.0025 0.4477 -1.0025 1v2c0 0.5523 0.4488 1 1.0025 1 0.5536 0 1.0025 -0.4477 1.0025 -1Z"
      fill="currentColor"
      strokeWidth="1"
    />
  </svg>
);

const HandMoveIcon = ({ size = 22 }: { size?: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 16 16"
    id="Hand-Move--Streamline-Block-Free"
    height={size}
    width={size}
  >
    <desc>Hand Move Streamline Icon: https://streamlinehq.com</desc>
    <path
      fill="currentColor"
      d="M14 3c0 -0.55228 -0.4477 -1 -1 -1s-1 0.44772 -1 1v4h-1.34V1c0 -0.552285 -0.4477 -1 -1 -1 -0.55228 0 -1 0.447715 -1 1v6H7.33V2c0 -0.55228 -0.44772 -1 -1 -1s-1 0.44772 -1 1v7H4V7c0 -1.10457 -0.89543 -2 -2 -2v5c0 3.3137 2.68629 6 6 6 3.3137 0 6 -2.6863 6 -6V3Z"
      strokeWidth="1"
    />
  </svg>
);

const BoxingFillIcon = ({ size = 22 }: { size?: number }) => (
  <svg
    viewBox="0 0 16 16"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    id="Boxing-Fill--Streamline-Remix-Fill"
    height={size}
    width={size}
  >
    <desc>Boxing Fill Streamline Icon: https://streamlinehq.com</desc>
    <path
      d="m6.334 7.333333333333333 0.09630666666666667 0.0046c0.47542666666666666 0.045399999999999996 0.8536933333333333 0.42366666666666664 0.8990933333333333 0.8990666666666667l0.0046 0.09633333333333333 -0.0046 0.09633333333333333c-0.045399999999999996 0.47539999999999993 -0.42366666666666664 0.8536666666666666 -0.8990933333333333 0.8990666666666667L6.334 9.333333333333332h-2.333333333333333v1.3333333333333333h2.333333333333333c1.1332666666666666 0 2.0778666666666665 -0.8079333333333333 2.2892 -1.8792666666666666l0.020399999999999998 -0.12013333333333333L12.667333333333334 8.666666666666666c0.4742 0 0.9252666666666666 -0.09899999999999999 1.3336666666666668 -0.2775333333333333L14.000666666666667 11.333333333333332c0 0.8706 -0.5562666666666667 1.6112666666666666 -1.3327333333333333 1.8860000000000001L12.667333333333334 14c0 0.36819999999999997 -0.29846666666666666 0.6666666666666666 -0.6666666666666666 0.6666666666666666h-8c-0.36818666666666666 0 -0.6666666666666666 -0.29846666666666666 -0.6666666666666666 -0.6666666666666666l0.00006 -0.7804666666666666C2.5572333333333335 12.945 2.0006666666666666 12.2042 2.0006666666666666 11.333333333333332v-2.6666666666666665c0 -0.7363999999999999 0.5969533333333332 -1.3333333333333333 1.3333333333333333 -1.3333333333333333h3Zm8.333333333333332 -2.333333333333333V5.333333333333333l-0.0034000000000000002 0.11751333333333333c-0.0586 1.0109866666666667 -0.8680666666666667 1.8204866666666666 -1.8790666666666667 1.8790866666666668L12.667333333333334 7.333333333333333h-4.2245333333333335c-0.35579999999999995 -0.7489133333333333 -1.0987333333333331 -1.2782266666666666 -1.9701733333333333 -1.3292866666666665L6.334 6h-3c-0.48599333333333333 0 -0.94162 0.13000666666666666 -1.3339999999999999 0.35714L2.0006666666666666 4c0 -1.47276 1.1939066666666664 -2.6666666666666665 2.6666666666666665 -2.6666666666666665h6.333333333333333c2.0250666666666666 0 3.6666666666666665 1.6416199999999999 3.6666666666666665 3.6666666666666665Z"
      strokeWidth="0.6667"
    />
  </svg>
);

const GolfSolarIcon = ({ size = 22 }: { size?: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    id="Golf--Streamline-Solar"
    height={size}
    width={size}
  >
    <desc>Golf Streamline Icon: https://streamlinehq.com</desc>
    <g id="Bold Duotone/Sports/Golf">
      <path
        id="Vector"
        fill="currentColor"
        opacity={0.5}
        d="M12 22c5.5228 0 10 -1.567 10 -3.5S17.5228 15 12 15c-5.52285 0 -10 1.567 -10 3.5S6.47715 22 12 22Z"
        strokeWidth="1"
      />
      <path
        id="Vector_2"
        fill="currentColor"
        d="M11.9999 1.25c0.4142 0 0.75 0.33579 0.75 0.75v1.03647l5.0078 2.50385 0.054 0.02699c0.7344 0.36716 1.3604 0.68012 1.7961 0.98418 0.4417 0.30833 0.9062 0.75601 0.9062 1.44851s-0.4645 1.14018 -0.9062 1.44851c-0.4357 0.30406 -1.0617 0.61699 -1.7961 0.98419l-5.0618 2.5308V18c0 0.4142 -0.3358 0.75 -0.75 0.75s-0.75 -0.3358 -0.75 -0.75v-5.4838c-0.0002 -0.0104 -0.0002 -0.0209 0 -0.0313V3.51509c-0.0002 -0.01043 -0.0002 -0.02088 0 -0.03134V2c0 -0.41421 0.3358 -0.75 0.75 -0.75Z"
        strokeWidth="1"
      />
    </g>
  </svg>
);

const SPORT_ICONS: Record<string, React.ReactNode> = {
  Basketball: <StreamlineSportIcon />,
  Tennis: <Cinema4dIcon />,
  Volleyball: <VolleyballIcon />,
  "Ice Hockey": <NhlIcon />,
  Rugby: <BallsSolarIcon />,
  Baseball: <BallsSolarIcon />,
  Cricket: <TicketSolarIcon />,
  Handball: <HandMoveIcon />,
  Boxing: <BoxingFillIcon />,
  Golf: <GolfSolarIcon />,
  Football: <IndianSuperLeagueIcon />,
};

function getDefaultCountries(sport: string): Country[] {
  return [
    {
      id: `${sport}-country-placeholder`,
      name: "International",
      flag: <Flag country="international" size={18} />,
      leagues: [
        { id: `${sport}-world`, name: `World ${sport} Championship` },
        { id: `${sport}-cup`, name: `${sport} World Cup` },
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// Basketball game types
// ---------------------------------------------------------------------------
interface BballTeamInfo {
  name: string;
  short_name: string;
  logo_url: string | null;
}
interface BballGame {
  id: string;
  sport: string;
  league: string;
  league_logo?: string | null;
  country: string; // "USA", "Spain", etc.
  league_id: string; // "nba", "acb", etc.
  home: BballTeamInfo;
  away: BballTeamInfo;
  kickoff_utc: string;
  status: string;
  display_clock?: string | null;
  short_detail?: string | null;
  status_description?: string | null;
  period?: number | string | null;
  cur_score?: { player1?: string; player2?: string; home?: string; away?: string } | null;
  set_scores?: string[] | null;
  raw_score?: string | null;
  score: { home: number; away: number } | null;
  broadcast: string | null;
  has_odds: boolean;
  odds?: { home: number; away: number; draw?: number };
}

// ---------------------------------------------------------------------------
// Sport name → SportsAPI Pro V5 slug mapping
// ---------------------------------------------------------------------------
const SPORT_API_SLUGS: Record<string, string> = {
  Basketball: "basketball",
  Tennis: "tennis",
  Volleyball: "volleyball",
  "Ice Hockey": "hockey",
  Rugby: "rugby",
  Baseball: "baseball",
  Cricket: "cricket",
  Handball: "handball",
  Boxing: "boxing",
  Golf: "golf",
};

// ---------------------------------------------------------------------------
// localStorage cache for live sport data (per sport)
// ---------------------------------------------------------------------------
const SPORT_LS_TTL = 5 * 60_000; // 5 min — refresh if stale
const sportLsKey = (slug: string) => `taketalon_sport_live_v1_${slug}`;

/** Generic hook — fetches live games for any sport from /api/sports/:slug/games. */
function useSportLiveData(sport: string) {
  const slug = SPORT_API_SLUGS[sport] ?? sport.toLowerCase().replace(/\s+/g, "-");

  const [allGames, setAllGames] = useState<BballGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<string>("");

  const fetchGames = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/sports/${slug}/games`);
      if (!r.ok) {
        setAllGames([]);
        setSource("coming_soon");
        return;
      }
      const ct = r.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        setAllGames([]);
        setSource("coming_soon");
        return;
      }
      const data = await r.json();
      const games: BballGame[] = (data.games ?? []).map((g: BballGame) => ({
        ...g,
        country: g.country ?? "International",
        league_id: g.league_id ?? g.league?.toLowerCase().replace(/\s+/g, "-") ?? "unknown",
      }));
      setAllGames(games);
      setSource(data.source ?? "");
    } catch {
      setAllGames([]);
      setSource("coming_soon");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  /** Group all games: country → leagueName → BballGame[] */
  const grouped = useMemo(() => {
    const map = new Map<string, Map<string, BballGame[]>>();
    for (const g of allGames) {
      const c = g.country ?? "International";
      const l = g.league ?? "Unknown League";
      if (!map.has(c)) map.set(c, new Map());
      const lm = map.get(c)!;
      if (!lm.has(l)) lm.set(l, []);
      lm.get(l)!.push(g);
    }
    return map;
  }, [allGames]);

  return { allGames, grouped, loading, error, source, refresh: fetchGames };
}

// ---------------------------------------------------------------------------
// Odds helpers (deterministic — same algorithm as FootballPage)
// ---------------------------------------------------------------------------
function seedRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}
function hashStr(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function genOdds(matchId: number, homeId: number, awayId: number) {
  const rng = seedRng((matchId ^ (homeId * 31) ^ (awayId * 17)) >>> 0);
  const homeP = 0.28 + rng() * 0.28;
  const drawP = 0.2 + rng() * 0.13;
  const awayP = Math.max(0.12, 1 - homeP - drawP);
  const k = 1.07;
  return {
    home: +(k / homeP).toFixed(2),
    draw: +(k / drawP).toFixed(2),
    away: +(k / awayP).toFixed(2),
  };
}

// ---------------------------------------------------------------------------
// Theme helpers — identiques à FootballPage
// ---------------------------------------------------------------------------
function matchCardBg(theme: string) {
  if (theme === "light")
    return "border border-slate-200/90 bg-gradient-to-br from-[#f8fbfe] via-[#f0f5fc] to-[#e6effa] hover:from-[#ffffff] hover:via-[#f4f8fe] hover:to-[#edf4fc] hover:border-blue-300/70 shadow-sm";
  if (theme === "blue")
    return "bg-[#3B6D99] border-blue-400/40 text-white hover:bg-[#4379a8] hover:border-blue-300/40 font-semibold shadow-none";
  return "bg-[#0d0d0d] border-neutral-800 hover:bg-[#121212] hover:border-neutral-700 shadow-none";
}
function txtPrimary(theme: string) {
  if (theme === "light") return "text-slate-900";
  return "text-white";
}
function txtSecondary(theme: string) {
  if (theme === "light") return "text-slate-500";
  if (theme === "blue") return "text-blue-200/60";
  return "text-slate-400";
}
function oddsBtnBase(theme: string) {
  if (theme === "light")
    return "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200";
  if (theme === "blue") return "bg-black/30 hover:bg-black/45 border border-white/10 text-white";
  return "bg-neutral-900 text-slate-300 hover:bg-neutral-800 border border-neutral-800/60";
}
const oddsBtnSel = "bg-blue-600 text-white border border-blue-600 font-extrabold shadow-sm";

function fmtTime(utc: string) {
  try {
    return new Date(utc).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Africa/Harare",
    });
  } catch {
    return "--:--";
  }
}
function fmtDate(utc: string) {
  try {
    return new Date(utc).toLocaleDateString("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      timeZone: "Africa/Harare",
    });
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// BballCrest — logo ya timu na fallback ya herufi (sawa na FootballPage)
// ---------------------------------------------------------------------------
const BballCrest: React.FC<{ src?: string | null; name?: string | null; size?: number }> = ({
  src,
  name,
  size = 22,
}) => {
  const [err, setErr] = useState(false);
  const init = (name ?? "??").slice(0, 2).toUpperCase();
  if (err || !src) {
    return (
      <span
        className="rounded-full bg-slate-600/70 flex items-center justify-center text-[7px] font-bold text-white shrink-0 uppercase"
        style={{ width: size, height: size, minWidth: size }}
      >
        {init}
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={name ?? undefined}
      onError={() => setErr(true)}
      style={{ width: size, height: size, objectFit: "contain", minWidth: size }}
      className="shrink-0"
    />
  );
};

// ---------------------------------------------------------------------------
// LeagueBadge — logo ya ligi na fallback ya dot (katika CountryRow)
// ---------------------------------------------------------------------------
const LeagueBadge: React.FC<{ src?: string | null; name?: string; size?: number }> = ({
  src,
  name,
  size = 20,
}) => {
  const [err, setErr] = useState(false);
  if (err || !src) {
    return <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8] shrink-0" />;
  }
  return (
    <img
      src={src}
      alt={name}
      onError={() => setErr(true)}
      style={{ width: size, height: size, objectFit: "contain", minWidth: size }}
      className="shrink-0 rounded-sm"
    />
  );
};

// ---------------------------------------------------------------------------
// OddsButton — sawa kabisa na FootballPage
// ---------------------------------------------------------------------------
const BballOddsButton: React.FC<{
  label: string;
  value: number;
  active: boolean;
  theme: string;
  onClick: () => void;
}> = ({ label, value, active, theme, onClick }) => (
  <button
    onClick={onClick}
    className={`px-1.5 py-0.5 rounded-lg transition-all active:scale-95 text-[10px] font-bold flex items-center gap-0.5 ${active ? oddsBtnSel : oddsBtnBase(theme)}`}
  >
    <span className={`text-[8px] font-medium ${active ? "text-blue-200" : "opacity-50"}`}>
      {label}
    </span>
    {value.toFixed(2)}
  </button>
);

// ---------------------------------------------------------------------------
// toBballMatchTip — geuza BballGame → MatchTip (kwa bet handlers)
// ---------------------------------------------------------------------------
function toBballMatchTip(game: BballGame): MatchTip {
  const seed = hashStr(game.id);
  const fallbackOdds = genOdds(seed, hashStr(game.home.short_name), hashStr(game.away.short_name));
  const isTennis = (game.sport || "").toLowerCase() === "tennis";
  const odds = {
    home: game.odds?.home ?? fallbackOdds.home,
    away: game.odds?.away ?? fallbackOdds.away,
    draw: isTennis ? 1.0 : (game.odds?.draw ?? fallbackOdds.draw ?? 15.0),
  };
  const s = game.status.toLowerCase();
  const isLive = s.includes("live") || s.includes("inprogress") || s.includes("in_progress");
  const isEnded = s.includes("final") || s.includes("ft") || s.includes("finished");
  return {
    id: game.id,
    sport: game.sport || "Basketball",
    category: game.sport || "Basketball",
    league: game.league,
    time: fmtTime(game.kickoff_utc),
    status: isLive ? "LIVE" : isEnded ? "ENDED" : "UPCOMING",
    confidence: 70,
    homeTeam: {
      name: game.home.short_name,
      logoUrl: game.home.logo_url ?? undefined,
      bgGlow: "#1e40af",
    },
    awayTeam: {
      name: game.away.short_name,
      logoUrl: game.away.logo_url ?? undefined,
      bgGlow: "#991b1b",
    },
    odds,
    isPremium: false,
    isLocked: false,
    tipster: { name: `TT ${game.sport || "Sports"}`, avatarLetter: "T", isOfficial: true },
  };
}

// ---------------------------------------------------------------------------
// BballMatchRow — bet card ya mechi moja (muundo sawa na MatchRow ya Football)
// ---------------------------------------------------------------------------
const BballMatchRow: React.FC<{
  game: BballGame;
  theme: "blue" | "dark" | "light";
  selectedOdd?: "home" | "draw" | "away";
  onPlaceBet?: SportPageProps["onPlaceBet"];
  onBetNow?: SportPageProps["onBetNow"];
  onBuyNow?: SportPageProps["onBuyNow"];
}> = ({ game, theme, selectedOdd, onPlaceBet, onBetNow, onBuyNow }) => {
  const [tickerSeconds, setTickerSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTickerSeconds((prev) => (prev >= 3599 ? 0 : prev + 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const tip = toBballMatchTip(game);
  const odds = tip.odds;
  const isTwoWaySport =
    (game.sport || "").toLowerCase() === "tennis" ||
    (game.sport || "").toLowerCase() === "volleyball";

  const statusInfo = getUnifiedMatchStatus({
    sport: game.sport,
    status: game.status,
    statusDescription: game.status_description ?? undefined,
    score: game.score,
    rawScoreStr: game.raw_score ?? undefined,
    setScores: game.set_scores ?? undefined,
    kickoffUtc: game.kickoff_utc,
    displayClock: game.display_clock ?? undefined,
    shortDetail: game.short_detail ?? undefined,
    period: game.period ?? undefined,
    curScore: game.cur_score ?? undefined,
    matchId: game.id,
    tickerSeconds,
  });

  return (
    <div
      className={`border transition-all duration-200 py-3 px-4 flex flex-col gap-2.5 rounded-2xl mx-2 my-3.5 ${matchCardBg(theme)}`}
    >
      {/* Teams row */}
      <div className="flex items-center justify-between gap-2">
        {/* Time / Score */}
        <div className="shrink-0 text-center w-16">
          {statusInfo.isEnded ? (
            <span className="inline-flex items-center justify-center mb-0.5 bg-neutral-500/15 border border-neutral-500/30 px-1.5 py-0.5 rounded-full">
              <span className="text-[8px] font-mono font-black text-neutral-400 dark:text-neutral-300 uppercase tracking-tight">
                {statusInfo.endLabel}
              </span>
            </span>
          ) : statusInfo.isBreak ? (
            <span className="inline-flex items-center justify-center gap-1 mb-0.5 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded-full">
              <span className="text-[8px] font-mono font-black text-amber-500 dark:text-amber-400 uppercase tracking-tight">
                {statusInfo.breakLabel}
              </span>
            </span>
          ) : statusInfo.isLive ? (
            <span className="inline-flex items-center justify-center gap-1 mb-0.5 bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[8.5px] font-mono font-black text-emerald-400 uppercase">
                LIVE
              </span>
            </span>
          ) : (
            <span className={`block text-[11px] font-black ${txtPrimary(theme)}`}>
              {fmtTime(game.kickoff_utc)}
            </span>
          )}
          <span className={`block text-[9px] ${txtSecondary(theme)}`}>
            {fmtDate(game.kickoff_utc)}
          </span>
        </div>

        {/* Home Team */}
        <div className="flex-1 flex items-center justify-end gap-1.5 max-w-[36%]">
          <span className={`text-[11px] font-black truncate text-right ${txtPrimary(theme)}`}>
            {game.home.name || game.home.short_name}
          </span>
          <BballCrest src={game.home.logo_url} name={game.home.short_name} size={20} />
        </div>

        {/* Center: Live/Ended Score Badge with Scrolling Sets, OR Upcoming "VS" */}
        {statusInfo.isLive || statusInfo.isEnded ? (
          <ScrollingScoreBadge
            scoreDisplay={statusInfo.scoreDisplay}
            setScoresList={statusInfo.setScoresList}
            isEnded={statusInfo.isEnded}
            isBreak={statusInfo.isBreak}
            isLive={statusInfo.isLive}
            timeMovementDisplay={statusInfo.timeMovementDisplay}
          />
        ) : (
          <span
            className={`shrink-0 text-[8px] font-black px-1.5 py-0.5 rounded-lg border ${
              theme === "light"
                ? "bg-slate-100 text-slate-800 border-slate-200"
                : theme === "blue"
                  ? "bg-white/10 text-white border-white/20"
                  : "bg-neutral-800 text-slate-200 border-neutral-700"
            }`}
          >
            VS
          </span>
        )}

        {/* Away Team */}
        <div className="flex-1 flex items-center gap-1.5 max-w-[36%]">
          <BballCrest src={game.away.logo_url} name={game.away.short_name} size={20} />
          <span className={`text-[11px] font-black truncate ${txtPrimary(theme)}`}>
            {game.away.name || game.away.short_name}
          </span>
        </div>
      </div>

      {/* Odds + Action buttons row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <BballOddsButton
            label="1"
            value={odds.home}
            active={selectedOdd === "home"}
            theme={theme}
            onClick={() => onPlaceBet?.(tip, "home", odds.home)}
          />
          {!isTwoWaySport && odds.draw > 1.0 && (
            <BballOddsButton
              label="X"
              value={odds.draw}
              active={selectedOdd === "draw"}
              theme={theme}
              onClick={() => onPlaceBet?.(tip, "draw", odds.draw)}
            />
          )}
          <BballOddsButton
            label="2"
            value={odds.away}
            active={selectedOdd === "away"}
            theme={theme}
            onClick={() => onPlaceBet?.(tip, "away", odds.away)}
          />
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* BET NOW */}
          <button
            onClick={() => {
              const ot = selectedOdd ?? "home";
              const val = ot === "home" ? odds.home : ot === "draw" ? odds.draw : odds.away;
              onBetNow?.(tip, ot, val);
            }}
            className="px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[8.5px] font-black uppercase tracking-wider flex items-center gap-0.5 cursor-pointer transition-all active:scale-95 shadow-sm"
          >
            <span>BET NOW</span>
            <ArrowRight className="w-2.5 h-2.5" />
          </button>

          {/* BUY */}
          <button
            onClick={() => onBuyNow?.(tip)}
            className="px-2 py-0.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[8.5px] font-black uppercase tracking-wider flex items-center gap-0.5 cursor-pointer transition-all active:scale-95 shadow-sm"
          >
            <ShoppingBag className="w-2.5 h-2.5" />
            <span>BUY</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// CountryRow
// ---------------------------------------------------------------------------
function CountryRow({
  country,
  isOpen,
  onToggle,
  theme,
  sport,
  onLeagueSelect,
}: {
  country: Country;
  isOpen: boolean;
  onToggle: () => void;
  theme: "blue" | "dark" | "light";
  sport?: string;
  onLeagueSelect?: (league: League, countryName: string) => void;
  key?: React.Key;
}) {
  const rowBg =
    theme === "light"
      ? "border border-slate-200/90 bg-gradient-to-br from-[#f8fbfe] via-[#f0f5fc] to-[#e6effa] hover:from-[#ffffff] hover:via-[#f4f8fe] hover:to-[#edf4fc] hover:border-blue-300/70 shadow-sm"
      : theme === "blue"
        ? "bg-[#1a3650]/70 border-blue-400/15 active:bg-[#1a3650]"
        : "bg-[#1a1a1a] border-neutral-800 active:bg-[#222]";

  const leagueBg =
    theme === "light"
      ? "bg-slate-50 border-slate-200"
      : theme === "blue"
        ? "bg-[#152d47]/80 border-blue-400/10"
        : "bg-[#111] border-neutral-800/60";

  const leagueText = theme === "light" ? "text-slate-700" : "text-slate-300";
  const chevronColor = theme === "light" ? "text-slate-400" : "text-slate-500";
  const nameText = theme === "light" ? "text-slate-800" : "text-slate-100";

  return (
    <div
      className={`rounded-xl border overflow-hidden mb-2.5 transition-colors duration-150 ${rowBg}`}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md overflow-hidden flex items-center justify-center shrink-0">
            {country.flag}
          </div>
          <span className={`text-sm font-semibold tracking-wide ${nameText}`}>{country.name}</span>
        </div>
        <span className={`${chevronColor} transition-transform duration-200`}>
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>

      {isOpen && (
        <div className={`border-t ${leagueBg} divide-y divide-white/5`}>
          {country.leagues.map((league) => (
            <button
              key={league.id}
              onClick={() => onLeagueSelect?.(league, country.name)}
              className={`w-full text-left px-5 py-3 text-xs font-medium ${leagueText} hover:opacity-80 transition-opacity flex items-center justify-between gap-2.5`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {/* League logo — falls back to coloured dot */}
                <LeagueBadge src={league.logo} name={league.name} size={20} />
                <span className="truncate">{league.name}</span>
              </div>
              {sport === "Boxing" && (
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0 uppercase tracking-wider">
                  Coming Soon
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SportPage
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// GamesPanel — live sport games overlay
// ---------------------------------------------------------------------------
function GamesPanel({
  sport,
  leagueName,
  leagueLogo,
  games,
  loading,
  error,
  theme,
  onClose,
  onRefresh,
  selectedBets,
  onPlaceBet,
  onBetNow,
  onBuyNow,
}: {
  sport: string;
  leagueName: string;
  leagueLogo?: string | null;
  games: BballGame[];
  loading: boolean;
  error: string | null;
  theme: "blue" | "dark" | "light";
  onClose: () => void;
  onRefresh: () => void;
  selectedBets?: Record<string, "home" | "draw" | "away">;
  onPlaceBet?: SportPageProps["onPlaceBet"];
  onBetNow?: SportPageProps["onBetNow"];
  onBuyNow?: SportPageProps["onBuyNow"];
}) {
  const panelBg =
    theme === "light" ? "bg-slate-50" : theme === "blue" ? "bg-[#1a3651]" : "bg-[#111111]";
  const hdrBg =
    theme === "light"
      ? "bg-white border-b border-slate-200"
      : theme === "blue"
        ? "bg-[#0f2236] border-b border-white/[0.08]"
        : "bg-[#141414] border-b border-neutral-900";

  const skeletonCard =
    theme === "light"
      ? "bg-white border-slate-300"
      : theme === "blue"
        ? "bg-[#3B6D99] border-blue-400/40"
        : "bg-[#0d0d0d] border-neutral-800";

  return (
    <div className={`absolute inset-0 z-20 flex flex-col ${panelBg}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 pt-4 pb-3 shrink-0 ${hdrBg}`}>
        <div className="flex items-center gap-3 min-w-0">
          {/* League logo */}
          <LeagueBadge src={leagueLogo} name={leagueName} size={32} />
          <div className="min-w-0">
            <p className={`text-xs font-semibold uppercase tracking-widest ${txtSecondary(theme)}`}>
              {sport}
            </p>
            <h2 className={`text-sm font-bold truncate ${txtPrimary(theme)}`}>{leagueName}</h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={loading}
            className={`w-8 h-8 rounded-full flex items-center justify-center ${theme === "light" ? "bg-slate-100 text-slate-600" : "bg-white/10 text-slate-300"} disabled:opacity-40`}
            aria-label="Refresh"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={onClose}
            className={`w-8 h-8 rounded-full flex items-center justify-center ${theme === "light" ? "bg-slate-100 text-slate-600" : "bg-white/10 text-slate-300"}`}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar py-2">
        {loading && <FootballMatchSkeleton theme={theme} />}

        {!loading && (error || games.length === 0) && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            {sport === "Boxing" ? (
              <>
                <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-black uppercase tracking-wider">
                  Coming Soon
                </span>
                <p className={`text-sm font-bold ${txtPrimary(theme)}`}>
                  Mashindano ya Boxing yaja hivi karibuni
                </p>
                <p className={`text-xs ${txtSecondary(theme)} text-center px-6 max-w-sm`}>
                  Mechi zote za ligi hii ya Boxing pamoja na viwango vya betting zinatayarishwa.
                  Tafadhali rudi baadaye!
                </p>
              </>
            ) : error ? (
              <>
                <p className={`text-sm ${txtSecondary(theme)}`}>{error}</p>
                <button
                  onClick={onRefresh}
                  className="text-[#38bdf8] text-xs font-semibold underline"
                >
                  Retry
                </button>
              </>
            ) : (
              <>
                <p className={`text-sm font-medium ${txtPrimary(theme)}`}>
                  Hakuna mechi kwa ligi hii kwa sasa
                </p>
                <p className={`text-xs ${txtSecondary(theme)} text-center px-6`}>
                  Mechi za ligi/mashindano haya hazijaanza au hazipo kwa sasa. Rudi baadaye!
                </p>
              </>
            )}
          </div>
        )}

        {!loading &&
          !error &&
          games.map((game) => (
            <BballMatchRow
              key={game.id}
              game={game}
              theme={theme}
              selectedOdd={selectedBets?.[game.id]}
              onPlaceBet={onPlaceBet}
              onBetNow={onBetNow}
              onBuyNow={onBuyNow}
            />
          ))}
      </div>
    </div>
  );
}

function matchCountryName(countryA: string, countryB: string): boolean {
  if (!countryA || !countryB) return false;
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const a = norm(countryA);
  const b = norm(countryB);
  if (!a || !b) return false;
  if (a === b || a.includes(b) || b.includes(a)) return true;

  // England / UK / London equivalences
  const ukTokens = ["england", "uk", "unitedkingdom", "london", "greatbritain"];
  const isAUk = ukTokens.some((t) => a.includes(t));
  const isBUk = ukTokens.some((t) => b.includes(t));
  if (isAUk && isBUk) return true;

  // USA equivalences
  const usaTokens = ["usa", "unitedstates", "america", "newyork", "miami", "indianwells", "us"];
  const isAUsa = usaTokens.some((t) => a.includes(t));
  const isBUsa = usaTokens.some((t) => b.includes(t));
  if (isAUsa && isBUsa) return true;

  return false;
}

function matchLeagueName(l1: string, l2: string): boolean {
  if (!l1 || !l2) return false;
  const clean = (s: string) =>
    s
      .toLowerCase()
      .replace(/\([^)]*\)/g, "")
      .replace(/[^a-z0-9]/g, "")
      .trim();

  const c1 = clean(l1);
  const c2 = clean(l2);

  if (!c1 || !c2) return false;
  if (c1 === c2) return true;
  if (c1.length >= 4 && c2.length >= 4) {
    if (c1.includes(c2) || c2.includes(c1)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// SportPage
// ---------------------------------------------------------------------------
export default function SportPage({
  sport,
  theme,
  onBack,
  onPlaceBet,
  onBetNow,
  onBuyNow,
  selectedBets,
}: SportPageProps) {
  const [openCountry, setOpenCountry] = useState<string | null>(null);
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string>("International");

  // Live data for any supported sport (fetches /api/sports/:slug/games)
  const liveData = useSportLiveData(sport);
  const hasSportApi = sport in SPORT_API_SLUGS;

  const staticCountries = SPORT_DATA[sport] ?? getDefaultCountries(sport);
  const icon = SPORT_ICONS[sport] ?? null;

  // Merge live API countries with static structure so unknown leagues also appear
  const countries = useMemo<typeof staticCountries>(() => {
    if (!hasSportApi || liveData.allGames.length === 0) return staticCountries;

    // Helper: pick the first game in a league group to extract its league logo
    const leagueLogo = (games: BballGame[]) => games[0]?.league_logo ?? null;

    // Build extra countries/leagues from live data not already in static list
    const extra: typeof staticCountries = [];
    for (const [countryKey, leagueMap] of liveData.grouped) {
      const exists = staticCountries.find((c) => matchCountryName(c.name, countryKey));
      if (!exists) {
        extra.push({
          id: `api-${countryKey.toLowerCase().replace(/\s+/g, "-")}`,
          name: countryKey,
          // Same ESPN-backed Flag component + 18px size used everywhere else
          // (Football page, static Basketball countries) so flags never look
          // mismatched in size when a country only comes from live API data.
          flag: <Flag country={countryKey} label={countryKey} size={18} />,
          leagues: Array.from(leagueMap.entries()).map(([l, gs]) => ({
            id: l,
            name: l,
            logo: leagueLogo(gs),
          })),
        });
      } else {
        // Augment static leagues with any extra from API; also inject logo where missing
        const apiLeagueNames = Array.from(leagueMap.entries());
        apiLeagueNames.forEach(([lName, gs]) => {
          const logo = leagueLogo(gs);
          const existing = exists.leagues.find((l) => matchLeagueName(l.name, lName));
          if (!existing) {
            exists.leagues.push({
              id: lName.toLowerCase().replace(/\s+/g, "-"),
              name: lName,
              logo,
            });
          } else if (!existing.logo && logo) {
            existing.logo = logo; // backfill logo on static entry
          }
        });
      }
    }
    // Prune: hide static leagues/countries that have no real ESPN games, so the
    // user never opens a country and finds an empty list.
    const hasLiveGames = (leagueId: string, leagueName: string) =>
      liveData.allGames.some(
        (g) =>
          g.league_id === leagueId ||
          g.league === leagueName ||
          matchLeagueName(leagueName, g.league || "") ||
          matchLeagueName(leagueId, g.league_id || ""),
      );

    const pruned = [...staticCountries, ...extra]
      .map((country) => ({
        ...country,
        leagues: country.leagues.filter((l) => hasLiveGames(l.id, l.name)),
      }))
      .filter((country) => country.leagues.length > 0);

    return pruned.length > 0 ? pruned : [...staticCountries, ...extra];
  }, [hasSportApi, staticCountries, liveData.grouped, liveData.allGames]);

  // Games shown in the GamesPanel — filtered to selected country + league
  const panelGames = useMemo<BballGame[]>(() => {
    if (!selectedLeague) return [];
    if (liveData.allGames.length === 0) return [];

    return liveData.allGames.filter((g) => {
      // 1. Check League Name / ID match
      const leagueMatches =
        g.league === selectedLeague.name ||
        g.league_id === selectedLeague.id ||
        matchLeagueName(selectedLeague.name, g.league || "") ||
        matchLeagueName(selectedLeague.id, g.league_id || "");

      if (!leagueMatches) return false;

      // 2. Check Country match if applicable
      if (selectedCountry && selectedCountry !== "International" && g.country) {
        return matchCountryName(selectedCountry, g.country);
      }

      return true;
    });
  }, [selectedLeague, selectedCountry, liveData.allGames]);

  const handleLeagueSelect = useCallback(
    (league: League, country?: string) => {
      setSelectedLeague(league);
      setSelectedCountry(country ?? "International");
      // Refresh data in background if needed
      liveData.refresh();
    },
    [liveData],
  );

  const bg =
    theme === "light"
      ? "bg-white text-slate-900"
      : theme === "blue"
        ? "bg-[#1f3d5c] text-white"
        : "bg-[#141414] text-slate-100";

  const headerBorder =
    theme === "light"
      ? "border-slate-200"
      : theme === "blue"
        ? "border-blue-400/15"
        : "border-neutral-800";

  const backBtn =
    theme === "light"
      ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
      : theme === "blue"
        ? "bg-[#1a3650] text-slate-200 hover:bg-[#1a3a58]"
        : "bg-[#1e1e1e] text-slate-300 hover:bg-[#252525]";

  const subtitleText = theme === "light" ? "text-slate-500" : "text-slate-400";

  return (
    <div className={`relative flex flex-col h-full w-full ${bg}`}>
      {/* ── Header ─────────────────────────────────────────── */}
      <div className={`flex items-center gap-3 px-4 pt-4 pb-3 border-b shrink-0 ${headerBorder}`}>
        <button
          onClick={onBack}
          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${backBtn}`}
          aria-label="Go back"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex items-center gap-2 text-[#38bdf8]">
          {icon}
          <h1
            className={`text-base font-bold tracking-tight ${theme === "light" ? "text-slate-900" : "text-white"}`}
          >
            {sport}
          </h1>
        </div>
      </div>

      {/* ── Sub-header ─────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-2 shrink-0">
        <p className={`text-xs font-semibold uppercase tracking-widest ${subtitleText}`}>
          Select a Country
        </p>
      </div>

      {/* ── Country list ───────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 pb-6 no-scrollbar">
        {countries.map((country) => (
          <CountryRow
            key={country.id}
            country={country}
            isOpen={openCountry === country.id}
            onToggle={() => setOpenCountry((prev) => (prev === country.id ? null : country.id))}
            theme={theme}
            sport={sport}
            onLeagueSelect={hasSportApi ? handleLeagueSelect : undefined}
          />
        ))}
      </div>

      {/* ── Live games panel (all API-supported sports) ───────── */}
      {selectedLeague && (
        <GamesPanel
          sport={sport}
          leagueName={selectedLeague.name}
          leagueLogo={selectedLeague.logo}
          games={panelGames}
          loading={liveData.loading}
          error={liveData.error}
          theme={theme}
          onClose={() => setSelectedLeague(null)}
          onRefresh={liveData.refresh}
          selectedBets={selectedBets}
          onPlaceBet={onPlaceBet}
          onBetNow={onBetNow}
          onBuyNow={onBuyNow}
        />
      )}
    </div>
  );
}
