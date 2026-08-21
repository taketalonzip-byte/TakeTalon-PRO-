/**
 * TakeTalon Skeleton System
 * Centralized skeleton components that match the exact shape of each section.
 * Used in: Suspense fallbacks, tab transitions, async data loading.
 */

import React from "react";

type Theme = "blue" | "dark" | "light";

// ─────────────────────────────────────────────────────────────────────────────
// Primitive helpers
// ─────────────────────────────────────────────────────────────────────────────

function pulse(theme: Theme, className: string) {
  const base =
    theme === "light"
      ? "bg-slate-200/90"
      : theme === "blue"
        ? "bg-blue-950/40"
        : "bg-neutral-800/60";
  return `${base} animate-pulse rounded ${className}`;
}

function divider(theme: Theme) {
  return theme === "light"
    ? "border-slate-200"
    : theme === "blue"
      ? "border-blue-950/30"
      : "border-neutral-800/60";
}

function cardBg(theme: Theme) {
  return theme === "light"
    ? "bg-white border border-slate-200 shadow-sm"
    : theme === "blue"
      ? "bg-[#1a3352] border border-blue-950/50"
      : "bg-[#141414] border border-neutral-800/60";
}

// ─────────────────────────────────────────────────────────────────────────────
// MatchCardSkeleton — single post-card shape
// ─────────────────────────────────────────────────────────────────────────────

function MatchCardSkeleton({ theme }: { theme: Theme; key?: React.Key }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl flex flex-col min-h-[145px] w-full ${cardBg(theme)}`}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-3.5 py-2.5 border-b ${divider(theme)}`}>
        <div className="flex items-center gap-2">
          <div className={pulse(theme, "w-6 h-6 rounded-full")} />
          <div className="space-y-1">
            <div className={pulse(theme, "w-24 h-3")} />
            <div className={pulse(theme, "w-12 h-2")} />
          </div>
        </div>
        <div className={pulse(theme, "w-16 h-4 rounded-full")} />
      </div>

      {/* Teams */}
      <div className="px-3.5 py-3 flex-1 flex flex-col justify-center gap-2">
        <div className="flex items-center justify-between">
          <div className="flex-1 space-y-1.5">
            <div className={pulse(theme, "w-4/5 h-4")} />
            <div className={pulse(theme, "w-3/5 h-3")} />
          </div>
          <div className={pulse(theme, "w-12 h-6 rounded-lg ml-3")} />
        </div>
      </div>

      {/* Odds */}
      <div className={`px-3.5 py-2.5 border-t flex gap-2 ${divider(theme)}`}>
        <div className={pulse(theme, "flex-1 h-8 rounded-xl")} />
        <div className={pulse(theme, "flex-1 h-8 rounded-xl")} />
        <div className={pulse(theme, "flex-1 h-8 rounded-xl")} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HomeFeedSkeleton — full home feed: categories + cards
// ─────────────────────────────────────────────────────────────────────────────

export function HomeFeedSkeleton({ theme }: { theme: Theme }) {
  return (
    <div className="px-3 pt-2 space-y-4 pb-24">
      {/* Category chips row */}
      <div className="flex gap-2 overflow-x-hidden">
        {[72, 90, 64, 80, 68, 76].map((w, i) => (
          <div key={i} className={pulse(theme, `h-8 rounded-full shrink-0`)} style={{ width: w }} />
        ))}
      </div>

      {/* Esports row */}
      <div className="flex gap-2 overflow-x-hidden py-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1 shrink-0">
            <div className={pulse(theme, "w-[84px] h-[84px] rounded-[28px]")} />
            <div className={pulse(theme, "w-14 h-2")} />
          </div>
        ))}
      </div>

      {/* Casino row */}
      <div className={`rounded-[14px] border p-2.5 ${cardBg(theme)}`}>
        <div className="flex gap-4 overflow-x-hidden">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1 shrink-0">
              <div className={pulse(theme, "w-11 h-11 rounded-full")} />
              <div className={pulse(theme, "w-10 h-2")} />
            </div>
          ))}
        </div>
      </div>

      {/* Section title */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <div className={pulse(theme, "w-1.5 h-3.5 rounded-full")} />
          <div className={pulse(theme, "w-32 h-4")} />
        </div>
        <div className={pulse(theme, "w-14 h-3")} />
      </div>

      {/* Match cards */}
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <MatchCardSkeleton key={i} theme={theme} />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FootballCountrySkeleton — nchi list in FootballPage
// ─────────────────────────────────────────────────────────────────────────────

export function FootballCountrySkeleton({ theme }: { theme: Theme }) {
  return (
    <div className="px-3 pt-3 space-y-2">
      {/* Search bar skeleton */}
      <div className={pulse(theme, "w-full h-9 rounded-xl mb-3")} />
      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
        <div key={i} className={`rounded-xl border overflow-hidden ${cardBg(theme)}`}>
          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className={pulse(theme, "w-8 h-8 rounded-md shrink-0")} />
              <div className={pulse(theme, "w-28 h-4")} />
            </div>
            <div className="flex items-center gap-2">
              <div className={pulse(theme, "w-5 h-3")} />
              <div className={pulse(theme, "w-4 h-4 rounded")} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FootballMatchSkeleton — match rows in league detail view
// ─────────────────────────────────────────────────────────────────────────────

export function FootballMatchSkeleton({ theme }: { theme: Theme }) {
  return (
    <div className="flex flex-col py-2.5 space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className={`rounded-2xl mx-2 p-4 ${cardBg(theme)}`}>
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className={pulse(theme, "w-12 h-8 rounded-lg")} />
            <div className={pulse(theme, "flex-1 h-4 ml-4")} />
            <div className={pulse(theme, "w-8 h-5 rounded-md")} />
            <div className={pulse(theme, "flex-1 h-4 mr-4")} />
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1.5">
              <div className={pulse(theme, "w-14 h-7 rounded-lg")} />
              <div className={pulse(theme, "w-14 h-7 rounded-lg")} />
              <div className={pulse(theme, "w-14 h-7 rounded-lg")} />
            </div>
            <div className="flex gap-1.5">
              <div className={pulse(theme, "w-16 h-7 rounded-lg bg-emerald-600/20")} />
              <div className={pulse(theme, "w-12 h-7 rounded-lg bg-amber-500/20")} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WalletSkeleton — Suspense fallback for WalletView
// ─────────────────────────────────────────────────────────────────────────────

export function WalletSkeleton({ theme }: { theme: Theme }) {
  return (
    <div className="px-4 pt-4 pb-24 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className={pulse(theme, "w-8 h-8 rounded-xl")} />
        <div className={pulse(theme, "w-28 h-5 rounded")} />
        <div className={pulse(theme, "w-8 h-8 rounded-xl")} />
      </div>

      {/* Balance card */}
      <div className={`rounded-2xl p-5 space-y-3 ${cardBg(theme)}`}>
        <div className={pulse(theme, "w-20 h-3")} />
        <div className={pulse(theme, "w-36 h-8 rounded-lg")} />
        <div className="flex gap-3 pt-1">
          <div className={pulse(theme, "flex-1 h-10 rounded-xl")} />
          <div className={pulse(theme, "flex-1 h-10 rounded-xl")} />
        </div>
      </div>

      {/* Pro upgrade card */}
      <div className={`rounded-2xl p-4 space-y-2.5 ${cardBg(theme)}`}>
        <div className="flex items-center gap-2">
          <div className={pulse(theme, "w-6 h-6 rounded-full")} />
          <div className={pulse(theme, "w-32 h-4")} />
        </div>
        <div className={pulse(theme, "w-full h-3")} />
        <div className={pulse(theme, "w-5/6 h-3")} />
        <div className={pulse(theme, "w-full h-10 rounded-xl mt-1")} />
      </div>

      {/* Transactions */}
      <div className="space-y-2 pt-1">
        <div className={pulse(theme, "w-28 h-4 mb-1")} />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`rounded-xl p-3 flex items-center gap-3 ${cardBg(theme)}`}>
            <div className={pulse(theme, "w-8 h-8 rounded-full shrink-0")} />
            <div className="flex-1 space-y-1.5">
              <div className={pulse(theme, "w-3/4 h-3")} />
              <div className={pulse(theme, "w-1/2 h-2.5")} />
            </div>
            <div className={pulse(theme, "w-16 h-4 rounded")} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ProfileSkeleton — Suspense fallback for ProfileView
// ─────────────────────────────────────────────────────────────────────────────

export function ProfileSkeleton({ theme }: { theme: Theme }) {
  return (
    <div className="px-4 pt-4 pb-24 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className={pulse(theme, "w-8 h-8 rounded-xl")} />
        <div className={pulse(theme, "w-24 h-5 rounded")} />
      </div>

      {/* Avatar + name */}
      <div className={`rounded-2xl p-5 flex flex-col items-center gap-3 ${cardBg(theme)}`}>
        <div className={pulse(theme, "w-20 h-20 rounded-full")} />
        <div className={pulse(theme, "w-32 h-5 rounded")} />
        <div className={pulse(theme, "w-24 h-3 rounded")} />
        <div className={pulse(theme, "w-full h-10 rounded-xl mt-1")} />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`rounded-xl p-3 flex flex-col items-center gap-1.5 ${cardBg(theme)}`}
          >
            <div className={pulse(theme, "w-8 h-6 rounded")} />
            <div className={pulse(theme, "w-12 h-2.5 rounded")} />
          </div>
        ))}
      </div>

      {/* Info rows */}
      <div className={`rounded-2xl overflow-hidden ${cardBg(theme)}`}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`flex items-center gap-3 px-4 py-3.5 border-b ${divider(theme)}`}>
            <div className={pulse(theme, "w-5 h-5 rounded shrink-0")} />
            <div className="flex-1 space-y-1">
              <div className={pulse(theme, "w-16 h-2.5")} />
              <div className={pulse(theme, "w-32 h-3.5")} />
            </div>
            <div className={pulse(theme, "w-4 h-4 rounded")} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TipstersSkeleton — Suspense fallback for TipstersList
// ─────────────────────────────────────────────────────────────────────────────

export function TipstersSkeleton({ theme }: { theme: Theme }) {
  return (
    <div className="px-3.5 py-3 space-y-3 pb-24">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className={pulse(theme, "w-8 h-8 rounded-xl")} />
        <div className="space-y-1">
          <div className={pulse(theme, "w-28 h-4")} />
          <div className={pulse(theme, "w-40 h-2.5")} />
        </div>
      </div>

      {/* Tipster cards */}
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className={`rounded-2xl p-4 space-y-3 ${cardBg(theme)}`}>
          <div className="flex items-center gap-3">
            <div className={pulse(theme, "w-12 h-12 rounded-full shrink-0")} />
            <div className="flex-1 space-y-1.5">
              <div className={pulse(theme, "w-28 h-4")} />
              <div className={pulse(theme, "w-20 h-3")} />
            </div>
            <div className={pulse(theme, "w-20 h-8 rounded-xl")} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className={pulse(theme, "h-10 rounded-xl")} />
            <div className={pulse(theme, "h-10 rounded-xl")} />
            <div className={pulse(theme, "h-10 rounded-xl")} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CasinoGameSkeleton — Suspense fallback for casino games (Slot777, Plinko, Dice, etc.)
// Inachukua rangi ya dark/blue ya mchezo, inaonyesha mwonekano wa mchezo kabla haujapakia.
// ─────────────────────────────────────────────────────────────────────────────

export function CasinoGameSkeleton({ theme }: { theme: Theme }) {
  // Rangi zinafanana KABISA na container ya app (bg ya CasinoProGame, JackpotWheelGame, nk.)
  const bg = theme === "light" ? "bg-white" : theme === "blue" ? "bg-[#1f3d5c]" : "bg-[#141414]";

  const panelBg =
    theme === "light"
      ? "bg-slate-100 border border-slate-200"
      : theme === "blue"
        ? "bg-[#17304a] border border-blue-400/20"
        : "bg-[#1c1c1c] border border-neutral-800/60";

  const shimmer =
    theme === "light"
      ? "bg-slate-200/80 animate-pulse rounded"
      : theme === "blue"
        ? "bg-blue-400/10 animate-pulse rounded"
        : "bg-neutral-700/50 animate-pulse rounded";

  return (
    <div className={`min-h-screen w-full flex flex-col ${bg}`}>
      {/* Header bar — back button + title + balance */}
      <div
        className={`flex items-center justify-between px-4 pt-4 pb-3 border-b ${theme === "light" ? "border-slate-200" : theme === "blue" ? "border-blue-900/30" : "border-neutral-800/60"}`}
      >
        <div className={`${shimmer} w-8 h-8 rounded-xl`} />
        <div className={`${shimmer} w-36 h-5`} />
        <div className={`${shimmer} w-20 h-8 rounded-xl`} />
      </div>

      {/* Main game display area */}
      <div className="flex-1 flex flex-col items-center px-4 pt-6 pb-4 gap-5">
        {/* Game canvas / display panel */}
        <div
          className={`w-full rounded-2xl ${panelBg} flex flex-col items-center justify-center gap-4 p-6`}
          style={{ minHeight: 220 }}
        >
          {/* Seed / result display */}
          <div className={`${shimmer} w-3/4 h-5`} />
          <div className={`${shimmer} w-1/2 h-16 rounded-xl`} />
          {/* Sub-labels */}
          <div className="flex gap-3">
            <div className={`${shimmer} w-20 h-3`} />
            <div className={`${shimmer} w-20 h-3`} />
          </div>
        </div>

        {/* Multiplier / payout grid */}
        <div className="w-full grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={`${shimmer} h-9 rounded-xl`} />
          ))}
        </div>

        {/* Bet controls card */}
        <div className={`w-full rounded-2xl ${panelBg} p-4 space-y-4`}>
          {/* Label row */}
          <div className="flex justify-between items-center">
            <div className={`${shimmer} w-24 h-3.5`} />
            <div className={`${shimmer} w-16 h-3.5`} />
          </div>
          {/* Bet amount selector */}
          <div className={`${shimmer} w-full h-12 rounded-xl`} />
          {/* Chip row */}
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={`${shimmer} flex-1 h-8 rounded-full`} />
            ))}
          </div>
          {/* Play button */}
          <div className={`${shimmer} w-full h-12 rounded-2xl`} />
        </div>

        {/* Recent results row */}
        <div className="w-full flex gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className={`${shimmer} flex-1 h-8 rounded-lg`} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SportPageSkeleton — skeleton for Basketball, Tennis, etc.
// ─────────────────────────────────────────────────────────────────────────────

export function SportPageSkeleton({ theme }: { theme: Theme }) {
  return (
    <div className="px-3 pt-3 space-y-2.5 pb-24">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className={pulse(theme, "w-8 h-8 rounded-xl")} />
        <div className={pulse(theme, "w-28 h-5 rounded")} />
      </div>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className={`rounded-xl border overflow-hidden ${cardBg(theme)}`}>
          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className={pulse(theme, "w-8 h-8 rounded-md")} />
              <div className={pulse(theme, "w-32 h-4")} />
            </div>
            <div className={pulse(theme, "w-4 h-4 rounded")} />
          </div>
        </div>
      ))}
    </div>
  );
}
