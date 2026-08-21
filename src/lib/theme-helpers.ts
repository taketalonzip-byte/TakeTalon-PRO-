/**
 * TakeTalon PRO — Theme helper functions
 *
 * These mirror the inline theme maps used across all components.
 * Import and use instead of duplicating inline ternaries.
 */

export type Theme = "blue" | "dark" | "light";

// ── Page / container ──────────────────────────────────────────────────────────

export const pageBg = (t: Theme) =>
  t === "light"
    ? "bg-white text-slate-900"
    : t === "dark"
      ? "bg-[#141414] text-slate-100"
      : "bg-[#1a3651] text-white";

export const headerBg = (t: Theme) =>
  t === "light"
    ? "bg-white/95 backdrop-blur-lg border-b border-slate-200/80"
    : t === "dark"
      ? "bg-[#0d0d0d]/95 backdrop-blur-lg border-b border-neutral-800/60"
      : "bg-[#3B6D99]/95 backdrop-blur-lg border-b border-blue-400/30";

export const navBg = (t: Theme) =>
  t === "light"
    ? "glass-nav-light border border-slate-200/80"
    : t === "dark"
      ? "bg-[#141414]/95 backdrop-blur-md border border-neutral-800/80"
      : "bg-[#1f3d5c]/95 backdrop-blur-md border border-white/10";

// ── Surfaces / cards ──────────────────────────────────────────────────────────

export const cardBg = (t: Theme) =>
  t === "light"
    ? "bg-gradient-to-br from-[#f8fbfe] via-[#f0f5fc] to-[#e6effa] border border-slate-200/90 shadow-sm text-slate-900"
    : t === "dark"
      ? "bg-[#0d0d0d] border border-neutral-800/60 text-slate-100"
      : "bg-[#3B6D99] border border-blue-400/30 text-white";

export const containerBg = (t: Theme) =>
  t === "light"
    ? "bg-gradient-to-br from-[#f8fbfe] via-[#f0f5fc] to-[#e6effa] border border-slate-200/90 shadow-sm text-slate-900"
    : t === "dark"
      ? "bg-[#0d0d0d] border border-neutral-800/60 text-slate-100"
      : "bg-[#3B6D99] border border-blue-400/40 text-white font-semibold";

export const surfaceHighlight = (t: Theme) =>
  t === "light" ? "bg-slate-100/80" : t === "dark" ? "bg-neutral-900" : "bg-white/10";

// ── Text ──────────────────────────────────────────────────────────────────────

export const txtPrimary = (t: Theme) =>
  t === "light" ? "text-slate-900" : t === "dark" ? "text-slate-100" : "text-white";

export const txtSecondary = (t: Theme) =>
  t === "light" ? "text-slate-600" : t === "dark" ? "text-slate-400" : "text-blue-100/70";

export const txtMuted = (t: Theme) =>
  t === "light" ? "text-slate-400" : t === "dark" ? "text-slate-500" : "text-slate-400";

// ── Borders ───────────────────────────────────────────────────────────────────

export const borderSubtle = (t: Theme) =>
  t === "light" ? "border-slate-200" : t === "dark" ? "border-neutral-800" : "border-white/[0.08]";

export const borderStrong = (t: Theme) =>
  t === "light" ? "border-slate-300" : t === "dark" ? "border-neutral-700" : "border-white/20";

// ── Buttons / interactives ────────────────────────────────────────────────────

export const iconBtn = (t: Theme) =>
  t === "light"
    ? "bg-slate-50 border border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
    : t === "dark"
      ? "bg-neutral-900/80 border border-neutral-800 text-slate-400 hover:text-white hover:bg-neutral-800"
      : "bg-white/10 border border-white/20 text-blue-50 hover:text-white hover:bg-white/15";

export const tabActive = (t: Theme) =>
  t === "light" ? "text-blue-600 font-bold" : "text-white font-bold";

export const tabInactive = (t: Theme) =>
  t === "light"
    ? "text-slate-400 hover:text-slate-800"
    : t === "dark"
      ? "text-slate-500 hover:text-slate-300"
      : "text-blue-100/70 hover:text-white";

// ── Odds chips ────────────────────────────────────────────────────────────────

export const oddsChipBase = (t: Theme) =>
  t === "light"
    ? "bg-slate-100 text-slate-700 border border-slate-200"
    : t === "dark"
      ? "bg-neutral-900 text-slate-300 border border-neutral-800"
      : "bg-[#0f1e3a] text-slate-200 border border-white/10";

export const oddsChipSelected = (_t: Theme) =>
  "bg-[#121c33] text-[#38bdf8] ring-1 ring-[#38bdf8]/40 border-transparent";
