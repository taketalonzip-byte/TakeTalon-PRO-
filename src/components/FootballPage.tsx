/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * FootballPage — Nchi → Ligi (click = full page) → Mechi na Odds
 * Design: inaiga PostCard / MatchList wa Home kikamilifu.
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ShoppingBag,
  Trophy,
  CalendarDays,
  Zap,
} from "lucide-react";
import { MatchTip, CartItem } from "../types";
import { FootballMatchSkeleton } from "./skeletons";
import { getCompetitionFixtures, invalidateCompetitions } from "../lib/footballCache";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { ESPN_LEAGUE_LOGOS } from "../lib/leagueLogos";
import { getUnifiedMatchStatus } from "../lib/sportMatchStatus";
import { ScrollingScoreBadge } from "./ScrollingScoreBadge";
import { FOOTBALL_BY_COUNTRY } from "../lib/footballCatalog";
import { Flag } from "./Flag";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface League {
  id: string;
  name: string;
  apiCode?: string;
  logo?: string; // emblem URL
}

interface Country {
  id: string;
  name: string;
  flag: React.ReactNode;
  leagues: League[];
}

interface ApiTeam {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
}

interface ApiMatch {
  id: number;
  utcDate: string;
  status: string;
  minute?: number | null;
  displayClock?: string | null;
  matchday: number;
  competition: { id: number; name: string; code: string; emblem: string };
  area: { id: number; name: string; code: string; flag: string };
  homeTeam: ApiTeam;
  awayTeam: ApiTeam;
  score: {
    winner: string | null;
    fullTime: { home: number | null; away: number | null };
    halfTime: { home: number | null; away: number | null };
  };
  odds?: { home: number; draw: number; away: number };
  odds_model?: string | null;
  odds_updated_at?: string | null;
  bettingSuspendedUntil?: string | null;
}

interface FootballPageProps {
  theme: "blue" | "dark" | "light";
  lang?: "en" | "fr" | "sw";
  onBack?: () => void;
  onPlaceBet?: (match: MatchTip, oddType: "home" | "draw" | "away", value: number) => void;
  onBetNow?: (match: MatchTip, oddType: "home" | "draw" | "away", value: number) => void;
  onBuyNow?: (match: MatchTip) => void;
  selectedBets?: Record<string, "home" | "draw" | "away">;
}

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

function toMatchTip(match: ApiMatch, leagueName: string): MatchTip {
  const isSuspended = Boolean(match.bettingSuspendedUntil && new Date(match.bettingSuspendedUntil).getTime() > Date.now());
  const oddsAvailable =
    !isSuspended &&
    match.odds != null &&
    Number.isFinite(match.odds.home) && match.odds.home > 1 &&
    Number.isFinite(match.odds.draw) && match.odds.draw > 1 &&
    Number.isFinite(match.odds.away) && match.odds.away > 1;
  const odds = oddsAvailable ? match.odds! : { home: 0, draw: 0, away: 0 };
  const s = (match.status || "").toUpperCase();
  const isLive = s === "IN_PLAY" || s === "PAUSED" || s === "LIVE" || s === "INPROGRESS";
  const isEnded = s === "FINISHED" || s === "AWARDED" || s === "ENDED" || s === "FINAL" || s === "FT";
  const scoreHome = match.score?.fullTime?.home ?? match.score?.halfTime?.home ?? null;
  const scoreAway = match.score?.fullTime?.away ?? match.score?.halfTime?.away ?? null;

  return {
    id: String(match.id),
    sport: "Football",
    category: "Football",
    league: leagueName || match.competition?.name || "Football League",
    time: fmtTime(match.utcDate),
    status: isLive ? "LIVE" : isEnded ? "ENDED" : "UPCOMING",
    homeScore: scoreHome,
    awayScore: scoreAway,
    score:
      scoreHome != null && scoreAway != null
        ? { home: scoreHome, away: scoreAway }
        : undefined,
    liveClock: match.displayClock ?? (match.minute != null ? `${match.minute}'` : undefined),
    confidence: 75,
    homeTeam: {
      name: match.homeTeam?.shortName || match.homeTeam?.name || "Home",
      logoUrl: match.homeTeam?.crest || "",
      bgGlow: "from-blue-600/30",
    },
    awayTeam: {
      name: match.awayTeam?.shortName || match.awayTeam?.name || "Away",
      logoUrl: match.awayTeam?.crest || "",
      bgGlow: "from-red-600/30",
    },
    odds,
    oddsAvailable,
    isPremium: false,
    isLocked: isSuspended,
    tipster: {
      name: "TakeTalon",
      avatarLetter: "T",
      isOfficial: true,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Countries & Leagues data — na logo za ligi
// ─────────────────────────────────────────────────────────────────────────────

// Nchi/kanda zote hujengwa moja kwa moja kutoka katalogi halisi ya ESPN
// (218 mashindano). Hakuna nchi tupu: kila nchi inayoonekana ina angalau
// ligi moja yenye slug halisi ya ESPN.
const COUNTRY_ORDER = [
  "International",
  "Europe",
  "England",
  "Spain",
  "Germany",
  "Italy",
  "France",
  "Netherlands",
  "Portugal",
  "Scotland",
  "Turkey",
  "Belgium",
  "Austria",
  "Greece",
  "Russia",
  "Sweden",
  "Denmark",
  "Norway",
  "Saudi Arabia",
  "USA",
  "Mexico",
  "Brazil",
  "Argentina",
  "South America",
  "North America",
  "Africa",
  "Asia",
];

const COUNTRY_FLAG_KEY: Record<string, string> = {
  International: "international",
  Europe: "europe",
  "South America": "southamerica",
  "North America": "northamerica",
  Africa: "africa",
  Asia: "asia",
  USA: "usa",
  "Saudi Arabia": "saudi-arabia",
  "Costa Rica": "costa-rica",
  "El Salvador": "el-salvador",
  "South Africa": "south-africa",
};

function countryId(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

const FOOTBALL_COUNTRIES: Country[] = (() => {
  const names = Object.keys(FOOTBALL_BY_COUNTRY).sort((a, b) => {
    const ia = COUNTRY_ORDER.indexOf(a);
    const ib = COUNTRY_ORDER.indexOf(b);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    return a.localeCompare(b);
  });

  return names.map((name) => ({
    id: countryId(name),
    name,
    flag: (
      <Flag country={COUNTRY_FLAG_KEY[name] ?? countryId(name)} label={name} size={18} />
    ),
    leagues: FOOTBALL_BY_COUNTRY[name].map((l) => ({
      id: l.slug,
      name: l.name,
      apiCode: l.code,
      logo: ESPN_LEAGUE_LOGOS[l.slug] ?? ESPN_LEAGUE_LOGOS[l.code],
    })),
  }));
})();


// ─────────────────────────────────────────────────────────────────────────────
// Theme helpers (kuiga PostCard wa MatchList kikamilifu)
// ─────────────────────────────────────────────────────────────────────────────

function pageBg(theme: string) {
  if (theme === "light") return "bg-slate-50";
  if (theme === "blue") return "bg-[#1a3651]";
  return "bg-[#111111]";
}
function headerBg(theme: string) {
  if (theme === "light") return "bg-white border-b border-slate-200";
  if (theme === "blue") return "bg-[#0f2236] border-b border-white/[0.08]";
  return "bg-[#141414] border-b border-neutral-900";
}
function countryRowBg(theme: string) {
  // Rounded card style — matches PostCard and Category container design
  if (theme === "light")
    return "border border-slate-200/90 bg-gradient-to-br from-[#f8fbfe] via-[#f0f5fc] to-[#e6effa] hover:from-[#ffffff] hover:via-[#f4f8fe] hover:to-[#edf4fc] hover:border-blue-300/70 shadow-sm";
  if (theme === "blue") return "bg-[#1a3650]/70 border-blue-400/15 active:bg-[#1a3650]";
  return "bg-[#1a1a1a] border-neutral-800 active:bg-[#222]";
}
function leagueItemBg(theme: string) {
  // Sub-card style inside expanded country card
  if (theme === "light") return "bg-slate-50 border-slate-200";
  if (theme === "blue") return "bg-[#152d47]/80 border-blue-400/10";
  return "bg-[#111] border-neutral-800/60";
}
function matchCardBg(theme: string) {
  if (theme === "light")
    return "border border-slate-200/90 bg-gradient-to-br from-[#f8fbfe] via-[#f0f5fc] to-[#e6effa] hover:from-[#ffffff] hover:via-[#f4f8fe] hover:to-[#edf4fc] hover:border-blue-300/70 shadow-sm";
  if (theme === "blue")
    return "bg-[#3B6D99] border-blue-400/40 text-white hover:bg-[#4379a8] hover:border-blue-300/40 font-semibold shadow-none";
  return "bg-[#0d0d0d] border-neutral-800 hover:bg-[#121212] hover:border-neutral-700 shadow-none";
}
function textPrimary(theme: string) {
  if (theme === "light") return "text-slate-900";
  return "text-white";
}
function textSecondary(theme: string) {
  if (theme === "light") return "text-slate-500";
  if (theme === "blue") return "text-blue-200/60";
  return "text-slate-400";
}
function dateSepBg(theme: string) {
  if (theme === "light") return "bg-slate-100 border-b border-slate-150";
  if (theme === "blue") return "bg-black/30 border-b border-white/[0.05]";
  return "bg-[#0a0a0a] border-b border-neutral-900";
}
function oddsBtnBase(theme: string) {
  if (theme === "light")
    return "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200";
  if (theme === "blue") return "bg-black/30 hover:bg-black/45 border border-white/10 text-white";
  return "bg-neutral-900 text-slate-300 hover:bg-neutral-800 border border-neutral-800/60";
}
const oddsBtnSel = "bg-blue-600 text-white border border-blue-600 font-extrabold shadow-sm";

// ─────────────────────────────────────────────────────────────────────────────
// Crest image (graceful fallback)
// ─────────────────────────────────────────────────────────────────────────────

const Crest: React.FC<{ src?: string; name?: string | null; size?: number }> = ({
  src,
  name,
  size = 22,
}) => {
  const [err, setErr] = useState(false);
  const safeInit = (name ?? "??").slice(0, 2).toUpperCase() || "??";
  if (err || !src) {
    return (
      <span
        className="rounded-full bg-slate-600/70 flex items-center justify-center text-[7px] font-bold text-white shrink-0 uppercase"
        style={{ width: size, height: size, minWidth: size }}
      >
        {safeInit}
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

// ─────────────────────────────────────────────────────────────────────────────
// OddsButton — iga MatchList kikamilifu
// ─────────────────────────────────────────────────────────────────────────────

const OddsButton: React.FC<{
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

// ─────────────────────────────────────────────────────────────────────────────
// MatchRow — mechi moja ndani ya LeagueDetailPage (iga PostCard style)
// ─────────────────────────────────────────────────────────────────────────────

const MatchRow: React.FC<{
  match: ApiMatch;
  leagueName: string;
  theme: "blue" | "dark" | "light";
  selectedOdd?: "home" | "draw" | "away";
  onPlaceBet?: FootballPageProps["onPlaceBet"];
  onBetNow?: FootballPageProps["onBetNow"];
  onBuyNow?: FootballPageProps["onBuyNow"];
}> = ({ match, leagueName, theme, selectedOdd, onPlaceBet, onBetNow, onBuyNow }) => {
  const [tickerSeconds, setTickerSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTickerSeconds((prev) => (prev >= 3599 ? 0 : prev + 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const tip = toMatchTip(match, leagueName);
  const odds = tip.odds;
  const oddsAvailable = tip.oddsAvailable === true;

  const scoreHome = match.score?.fullTime?.home ?? match.score?.halfTime?.home ?? null;
  const scoreAway = match.score?.fullTime?.away ?? match.score?.halfTime?.away ?? null;

  const statusInfo = getUnifiedMatchStatus({
    sport: "Football",
    status: match.status,
    score: scoreHome != null && scoreAway != null ? { home: scoreHome, away: scoreAway } : null,
    kickoffUtc: match.utcDate,
    minute: match.minute,
    displayClock: match.displayClock,
    matchId: match.id,
    tickerSeconds,
  });

  return (
    <div
      className={`border transition-all duration-200 py-3 px-4 flex flex-col gap-2.5 rounded-2xl mx-2 my-3.5 ${matchCardBg(theme)}`}
    >
      {/* Teams row */}
      <div className="flex items-center justify-between gap-2">
        {/* Time / Score - Parti ya Kwanza */}
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
            <span className={`block text-[11px] font-black ${textPrimary(theme)}`}>
              {fmtTime(match.utcDate)}
            </span>
          )}
          <span className={`block text-[9px] ${textSecondary(theme)}`}>
            {fmtDate(match.utcDate)}
          </span>
        </div>

        {/* Home Team */}
        <div className="flex-1 flex items-center justify-end gap-1.5 max-w-[36%]">
          <span className={`text-[11px] font-black truncate text-right ${textPrimary(theme)}`}>
            {match.homeTeam.shortName || match.homeTeam.name}
          </span>
          <Crest src={match.homeTeam.crest} name={match.homeTeam.shortName} size={20} />
        </div>

        {/* Center: Live / Ended Score Badge, OR Upcoming VS */}
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
          <Crest src={match.awayTeam.crest} name={match.awayTeam.shortName} size={20} />
          <span className={`text-[11px] font-black truncate ${textPrimary(theme)}`}>
            {match.awayTeam.shortName || match.awayTeam.name}
          </span>
        </div>
      </div>

      {/* Real database odds and betting controls. Never fabricate odds for card bets. */}
      <div className="flex items-center justify-between gap-2">
        {!oddsAvailable ? (
          <span className={`text-[9px] font-black uppercase tracking-wide ${textSecondary(theme)}`}>
            {match.bettingSuspendedUntil && new Date(match.bettingSuspendedUntil).getTime() > Date.now()
              ? "Updating — betting paused"
              : "Odds coming soon"}
          </span>
        ) : (
        <div className="flex items-center gap-1">
          <OddsButton
            label="1"
            value={odds.home}
            active={selectedOdd === "home"}
            theme={theme}
            onClick={() => onPlaceBet?.(tip, "home", odds.home)}
          />
          <OddsButton
            label="X"
            value={odds.draw}
            active={selectedOdd === "draw"}
            theme={theme}
            onClick={() => onPlaceBet?.(tip, "draw", odds.draw)}
          />
          <OddsButton
            label="2"
            value={odds.away}
            active={selectedOdd === "away"}
            theme={theme}
            onClick={() => onPlaceBet?.(tip, "away", odds.away)}
          />
        </div>
        )}

        {/* Action buttons */}
        {oddsAvailable && <div className="flex items-center gap-1 shrink-0">
          {/* BET NOW — rangi sawa na MatchList: bg-emerald-600 */}
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

          {/* BUY NOW — rangi sawa na MatchList: bg-amber-500 text-slate-950 */}
          <button
            onClick={() => onBuyNow?.(tip)}
            className="px-2 py-0.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[8.5px] font-black uppercase tracking-wider flex items-center gap-0.5 cursor-pointer transition-all active:scale-95 shadow-sm"
          >
            <ShoppingBag className="w-2.5 h-2.5" />
            <span>BUY</span>
          </button>
        </div>}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Custom hook — fetch mechi za ligi
// ─────────────────────────────────────────────────────────────────────────────

function useLeagueMatches(apiCode: string | undefined) {
  const [matches, setMatches] = useState<ApiMatch[]>([]);
  const [competitionDbId, setCompetitionDbId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const fetch_ = useCallback(async (isBackground = false) => {
    if (!apiCode) {
      setFetched(true);
      return;
    }
    if (!isBackground) setLoading(true);
    try {
      const res = await getCompetitionFixtures(apiCode);
      setCompetitionDbId(res?.competitionDbId ?? null);
      const all: ApiMatch[] = (res?.matches as unknown as ApiMatch[]) ?? [];
      
      // Intelligent sorting:
      // 1. Live matches first (IN_PLAY, PAUSED, LIVE)
      // 2. Scheduled matches next (chronological by kickoff)
      // 3. Finished matches next (by date)
      all.sort((a, b) => {
        const aLive = a.status === "IN_PLAY" || a.status === "PAUSED" || (a as any).status === "LIVE";
        const bLive = b.status === "IN_PLAY" || b.status === "PAUSED" || (b as any).status === "LIVE";
        if (aLive && !bLive) return -1;
        if (!aLive && bLive) return 1;

        const aEnded = a.status === "FINISHED" || a.status === "AWARDED" || a.status === "ENDED";
        const bEnded = b.status === "FINISHED" || b.status === "AWARDED" || b.status === "ENDED";
        if (!aEnded && bEnded) return -1;
        if (aEnded && !bEnded) return 1;

        return new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime();
      });

      setMatches(all);
    } catch {
      /* silent */
    } finally {
      if (!isBackground) setLoading(false);
      setFetched(true);
    }
  }, [apiCode]);

  useEffect(() => {
    fetch_();
    // Polling remains as a fallback if Realtime is disconnected.
    const interval = setInterval(() => {
      fetch_(true);
    }, 30000);

    if (!apiCode || !competitionDbId || !isSupabaseConfigured) {
      return () => clearInterval(interval);
    }

    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const channel = supabase
      .channel(`football-live:${competitionDbId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "football_fixtures",
          filter: `competition_id=eq.${competitionDbId}`,
        },
        () => {
          invalidateCompetitions([apiCode]);
          if (refreshTimer) return;
          refreshTimer = setTimeout(() => {
            refreshTimer = null;
            fetch_(true);
          }, 250);
        },
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      if (refreshTimer) clearTimeout(refreshTimer);
      supabase.removeChannel(channel);
    };
  }, [apiCode, competitionDbId, fetch_]);

  return { matches, loading, fetched };
}

// ─────────────────────────────────────────────────────────────────────────────
// LeagueDetailPage — ukurasa mzima wa ligi (full page push)
// ─────────────────────────────────────────────────────────────────────────────

const LeagueDetailPage: React.FC<{
  league: League;
  country: Country;
  theme: "blue" | "dark" | "light";
  selectedBets: Record<string, "home" | "draw" | "away">;
  onBack: () => void;
  onPlaceBet?: FootballPageProps["onPlaceBet"];
  onBetNow?: FootballPageProps["onBetNow"];
  onBuyNow?: FootballPageProps["onBuyNow"];
}> = ({ league, country, theme, selectedBets, onBack, onPlaceBet, onBetNow, onBuyNow }) => {
  const { matches, loading, fetched } = useLeagueMatches(league.apiCode);

  // Group by date
  const byDate: Record<string, ApiMatch[]> = {};
  for (const m of matches) {
    const dk = fmtDate(m.utcDate);
    if (!byDate[dk]) byDate[dk] = [];
    byDate[dk].push(m);
  }

  const hasApi = !!league.apiCode;

  return (
    <div className={`flex flex-col h-full w-full ${pageBg(theme)}`}>
      {/* Header */}
      <div className={`flex items-center gap-3 px-4 pt-4 pb-3 shrink-0 ${headerBg(theme)}`}>
        <button
          onClick={onBack}
          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-95 ${
            theme === "light"
              ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
              : "bg-white/10 hover:bg-white/20 text-white"
          }`}
          aria-label="Rudi"
        >
          <ChevronLeft size={18} />
        </button>

        {/* League logo */}
        <Crest src={league.logo} name={league.name} size={26} />

        {/* League name */}
        <div className="flex-1 min-w-0">
          <p className={`text-[13px] font-black truncate ${textPrimary(theme)}`}>{league.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="shrink-0">{country.flag}</span>
            <span className={`text-[10px] ${textSecondary(theme)}`}>{country.name}</span>
          </div>
        </div>

        {/* Live badge */}
        {matches.some((m) => m.status === "IN_PLAY" || m.status === "PAUSED") && (
          <span className="flex items-center gap-1 bg-green-500/15 border border-green-500/30 text-green-400 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            LIVE
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-6">
        {/* Loading — skeleton rows matching match layout */}
        {loading && <FootballMatchSkeleton theme={theme} />}

        {/* No API */}
        {!loading && !hasApi && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <CalendarDays size={36} className={textSecondary(theme)} />
            <p className={`text-[12px] font-semibold ${textPrimary(theme)}`}>{league.name}</p>
            <p className={`text-[11px] text-center px-8 ${textSecondary(theme)}`}>
              Hakuna data ya mechi kwa ligi hii kwa sasa.
            </p>
          </div>
        )}

        {/* Empty */}
        {!loading && hasApi && fetched && matches.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Trophy size={36} className={textSecondary(theme)} />
            <p className={`text-[12px] font-semibold ${textPrimary(theme)}`}>{league.name}</p>
            <p className={`text-[11px] text-center px-8 ${textSecondary(theme)}`}>
              Hakuna data ya mechi kwa ligi hii kwa sasa.
            </p>
          </div>
        )}

        {/* Matches grouped by date */}
        {!loading && matches.length > 0 && (
          <div className="pt-2">
            {Object.entries(byDate).map(([date, ms]) => (
              <div key={date}>
                {/* Date separator */}
                <div className={`px-4 py-2 flex items-center gap-2 ${dateSepBg(theme)}`}>
                  <CalendarDays size={11} className={textSecondary(theme)} />
                  <span
                    className={`text-[9px] font-bold uppercase tracking-widest ${textSecondary(theme)}`}
                  >
                    {date}
                  </span>
                  <span className={`ml-auto text-[9px] font-bold ${textSecondary(theme)}`}>
                    {ms.length} mechi
                  </span>
                </div>
                {ms.map((m) => (
                  <MatchRow
                    key={m.id}
                    match={m}
                    leagueName={league.name}
                    theme={theme}
                    selectedOdd={selectedBets[String(m.id)]}
                    onPlaceBet={onPlaceBet}
                    onBetNow={onBetNow}
                    onBuyNow={onBuyNow}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// LeagueItem — kitufe cha ligi kwenye orodha ya nchi (→ navigate full page)
// ─────────────────────────────────────────────────────────────────────────────

const LeagueItem: React.FC<{
  league: League;
  theme: string;
  onClick: () => void;
}> = ({ league, theme, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-2.5 transition-all active:scale-[0.99] hover:opacity-80 divide-y divide-white/5`}
  >
    {/* League logo */}
    <Crest src={league.logo} name={league.name} size={22} />

    {/* Name */}
    <span className={`flex-1 text-[12px] font-medium text-left ${textPrimary(theme)}`}>
      {league.name}
    </span>

    {/* No API indicator */}
    {!league.apiCode && (
      <span
        className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider ${
          theme === "light" ? "bg-slate-100 text-slate-400" : "bg-white/5 text-white/30"
        }`}
      >
        —
      </span>
    )}

    {/* Arrow */}
    <ArrowRight size={13} className={textSecondary(theme)} />
  </button>
);

// ─────────────────────────────────────────────────────────────────────────────
// CountryRow — nchi na ligi zake (accordion — click = expand, ligi click = navigate)
// ─────────────────────────────────────────────────────────────────────────────

const CountryRow: React.FC<{
  country: Country;
  theme: "blue" | "dark" | "light";
  defaultOpen?: boolean;
  onSelectLeague: (league: League, country: Country) => void;
}> = ({ country, theme, defaultOpen = false, onSelectLeague }) => {
  const [open, setOpen] = useState(defaultOpen);

  const leagueSectionBg =
    theme === "light"
      ? "bg-slate-50 border-slate-200"
      : theme === "blue"
        ? "bg-[#152d47]/80 border-blue-400/10"
        : "bg-[#111] border-neutral-800/60";

  const chevronColor = theme === "light" ? "text-slate-400" : "text-slate-500";

  return (
    // Rounded card wrapper — same style as Basketball (SportPage) original
    <div
      className={`rounded-xl border overflow-hidden mb-2.5 transition-colors duration-150 ${countryRowBg(theme)}`}
    >
      {/* Country header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md overflow-hidden flex items-center justify-center shrink-0">
            {country.flag}
          </div>
          <span className={`text-[13.5px] font-bold ${textPrimary(theme)}`}>{country.name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-semibold ${textSecondary(theme)}`}>
            {country.leagues.length}
          </span>
          <span className={`transition-transform duration-200 ${chevronColor}`}>
            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        </div>
      </button>

      {/* Leagues list — inside the card */}
      {open && (
        <div className={`border-t ${leagueSectionBg} divide-y divide-white/5`}>
          {country.leagues.map((lg) => (
            <LeagueItem
              key={lg.id}
              league={lg}
              theme={theme}
              onClick={() => onSelectLeague(lg, country)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// FootballIcon
// ─────────────────────────────────────────────────────────────────────────────

const FootballIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    id="Indiansuperleague--Streamline-Simple-Icons"
    height={20}
    width={20}
    className={className}
  >
    <title>Indian Super League</title>
    <path
      d="M10.59766 0.10938C8.95434 0.10104 7.5554 0.58357 6.94336 0.88086c-0.11273 0.0545 -0.22433 0.1126 -0.35156 0.18164C4.78218 3.766 4.33554 6.69795 4.0957 7.8789c0.26408 0.30678 0.52699 0.58814 0.80078 0.84962 -1.07275 0.03838 -2.03204 -0.00761 -2.80859 -0.1543 -0.33058 0.63514 -0.61723 1.20155 -0.86719 1.73047C0.99935 9.7809 0.8152 9.28492 0.75195 8.56445c-0.3342 0.39607 -0.49852 0.77729 -0.55664 1.11524v0.03125c-0.09448 0.49055 -0.14861 0.97195 -0.17773 1.48437 -0.03625 0.67942 -0.01414 1.35171 0.0586 2.00586 0 0.04657 0.03052 0.28815 0.03905 0.32227 0.06 0.41695 0.13848 0.8315 0.23829 1.23828 0.00803 0.03241 -0.0082 -0.01544 0.0371 0.1504 0.00014 0.00053 0.0699 0.25394 0.07227 0.2461 0.83843 2.8787 2.3119 4.76328 4.35742 6.38086 0.10029 0.01877 0.20602 0.03355 0.31446 0.04688 0.31308 0.28653 0.6532 0.56117 1.11328 0.88086 0.71513 0.30126 1.60352 0.67465 2.77539 0.99414 0.0836 -0.13436 0.19644 -0.2729 0.3418 -0.42188 -0.81711 -0.50461 -1.3046 -0.81155 -1.97462 -1.44726 0.9546 -0.06846 1.9968 -0.1977 3.0332 -0.32813v-0.0039c0.07814 -0.66713 0.18119 -1.26748 0.34766 -2.02343 0.5766 0.48578 1.14455 0.91864 1.84766 1.4336 -0.04942 0.273 -0.07803 0.51066 -0.11523 0.85546 0.39197 0.21598 0.68197 0.37125 0.93945 0.50195 -0.47944 0.09048 -0.95232 0.17008 -1.41211 0.23828 -0.0073 0.58867 0.00029 0.61018 0.13477 1.11524 0.85762 0.29796 1.03607 0.33892 1.77734 0.50976 0.3452 -0.0691 0.95215 -0.2225 1.35547 -0.3496h0.0039c0.07636 -0.30533 0.1012 -0.31144 0.2793 -0.76563a96.46696 96.46696 0 0 1 -0.33594 -0.18555c0.61706 -0.11713 1.24963 -0.26233 1.87695 -0.42969 0 0 0.32307 -0.53391 1.06445 -1.89648 -0.18245 -0.15612 -0.61101 -0.51041 -1.15234 -0.95508 0.3126 -0.82414 0.5334 -1.42238 0.70898 -1.92187a29.32447 29.32447 0 0 1 0.7793 -0.16797c0.47606 -1.37368 0.65186 -1.87142 1.50586 -4.03711 -0.24974 -0.4401 -0.46855 -0.81353 -0.68945 -1.16797 0.2034 0.17544 0.42375 0.36465 0.70117 0.60547 0.13448 -0.05449 0.26798 -0.1079 0.40234 -0.16602 1.02473 -0.4288 1.94057 -0.86248 2.73633 -1.29492v-0.002c0.31259 -1.56614 0.34283 -2.41444 0.38282 -3.59178 -0.923 -0.83938 -1.5409 -1.29324 -2.47852 -1.97265 -0.7449 0.40332 -1.59923 0.81124 -2.55859 1.21093 -0.12349 0.05087 -0.24777 0.1051 -0.375 0.15235 -0.16097 1.09869 -0.3181 1.83647 -0.52148 2.6875 -0.05766 -0.07247 -0.10876 -0.13865 -0.16993 -0.21485 -1.47166 0.30159 -2.98648 0.6827 -4.47265 1.14063 -0.20145 1.05256 -0.33834 1.84446 -0.43555 2.63477 -0.60046 0.12875 -1.1954 0.24428 -1.78125 0.3457 -0.76223 -0.87702 -1.36607 -1.63645 -1.86719 -2.33594 0.21567 0.09574 0.42651 0.18967 0.66211 0.28906 1.3355 -1.03594 2.35838 -1.86542 3.28907 -2.67968 0.33263 0.1617 0.68196 0.33024 1.0918 0.52539 0.9178 -0.7365 1.81918 -1.51219 2.67187 -2.30664 -0.58867 -1.72975 -0.92008 -2.41288 -1.46875 -3.54297a237.94319 237.94319 0 0 1 -0.97657 -0.27344C13.43207 1.4266 12.93946 0.52017 12.93946 0.48828c-0.79715 -0.27026 -1.59483 -0.37512 -2.3418 -0.3789Zm6.88086 0.7832c-0.87955 0.28476 -1.62698 0.67187 -1.64648 0.67187 0.25083 0.68316 0.41743 1.3906 0.5664 2.01563 0.9775 0.50143 1.67304 0.97418 2.23633 1.35937 0.58866 -0.28346 1.14003 -0.51649 1.65234 -0.6836 -0.14898 -0.9121 -0.35539 -1.51436 -0.53711 -2.04491 -0.84663 -0.61772 -1.63557 -1.00586 -2.27148 -1.31836ZM3.46094 3.38086l0.00195 0.00195 0.00195 -0.00195zm0.00195 0.00195c-0.42072 0.41375 -0.8214 0.85235 -1.1914 1.32031 0 0 -0.00225 0.012 -0.00587 0.01563 -0.22534 0.54867 -0.48457 1.3216 -0.66992 1.88477 0.14898 0.14535 0.33448 0.28349 0.54883 0.41796 0.33433 -0.46518 0.79364 -1.06087 1.14258 -1.5078 0.17073 -0.54143 0.43548 -1.2525 0.64258 -1.7793 -0.1844 -0.11215 -0.33993 -0.2322 -0.4668 -0.35157Zm11.31836 0.52734c0.4485 0.92496 0.77407 1.66902 1.23633 2.98633 -0.6919 0.635 -1.40973 1.25594 -2.14453 1.85352a115.7121 115.7121 0 0 1 -0.60938 -0.29297c0.70758 -0.63443 1.38006 -1.27556 2.11719 -2.01562 -0.35197 -1.01946 -0.67735 -1.88363 -0.97656 -2.63672 -0.0004 -0.0004 0.01565 0.0047 0.37695 0.10546zM2.41406 9.0625c0.86184 0.12732 1.86338 0.15634 2.9668 0.0996 0.72448 0.6061 1.55666 1.12022 2.66602 1.65821 0.58175 0.87448 1.2899 1.80434 2.23828 2.9082 -0.38338 1.3918 -0.64943 2.4489 -0.98243 4.17774 0.38721 0.37202 0.73084 0.68634 1.06055 0.97656 -0.1579 0.71876 -0.26302 1.30403 -0.3418 1.90235 -1.17492 0.1452 -2.34363 0.27701 -3.33789 0.3164 -0.632 -0.35033 -1.3539 -0.7714 -2.11328 -1.31054 -0.16764 0.16503 -0.30908 0.32691 -0.42383 0.48437 -1.52965 -1.4295 -2.63206 -3.1043 -3.29101 -5.55664 -0.02458 -0.09153 -0.04463 -0.18145 -0.0625 -0.27148 0.11145 -0.1633 0.245 -0.3306 0.39062 -0.50196 -0.03164 -0.76196 -0.06062 -1.45003 0.00977 -2.32226 0.29063 -0.7321 0.71661 -1.58413 1.2207 -2.56055Zm14.83203 0.93555c0.08038 0.10142 0.15203 0.19551 0.22657 0.29101 -0.01035 0.0423 -0.0187 0.07781 -0.0293 0.1211 0.1479 0.12316 0.22428 0.18808 0.34765 0.29101 0.68221 0.89958 1.13217 1.59025 1.67969 2.54688 -0.67878 1.72765 -0.93478 2.43437 -1.32226 3.55078 -0.07204 0.0152 -0.14459 0.03303 -0.2168 0.04883 0.09074 -0.26703 0.1829 -0.54496 0.29101 -0.8711 -1.6134 -1.5734 -1.87347 -1.8424 -3.33789 -3.33593 -0.59952 0.16079 -1.2005 0.30816 -1.79687 0.44336 0.0851 -0.64947 0.19884 -1.3142 0.3496 -2.11524 2.16083 -0.64889 3.79153 -0.95932 3.8086 -0.9707zM3.15625 13.0039c-0.30533 1.12658 -0.38373 1.92205 -0.44922 2.62695 0.64316 1.1447 1.34364 2.0049 1.91406 2.69531 0.66758 0.07264 1.4184 0.09774 2.23438 0.07617 0.06911 -0.91212 0.24807 -1.80775 0.4043 -2.60351 -0.85389 -1.07923 -1.41037 -1.98807 -1.85743 -2.71485 -0.81751 0.01812 -1.57393 -0.00371 -2.24609 -0.08007Zm19.29297 1.04297c-0.69777 0.4288 -1.42251 0.84293 -2.16016 1.25 -0.21446 0.79576 -0.24948 0.91586 -0.68554 2.34765 0.3998 0.24218 0.89073 0.55728 1.4746 0.94727 0.64317 -0.34883 1.19204 -0.72708 1.79883 -1.09766 0.06186 -0.03637 0.11571 -0.07273 0.17383 -0.10547 0.01206 0 0.01952 -0.0156 0.02343 -0.02734 -0.01315 -0.01315 0.03383 -0.02245 0.22852 -0.47655 0.26522 -0.55955 0.48625 -1.1407 0.66797 -1.74024 0.01088 -0.02912 0.01843 -0.05888 0.0293 -0.08789 -0.3852 -0.37794 -0.39231 -0.3737 -1.35156 -1.13672 -0.06626 0.0425 -0.13282 0.08463 -0.19922 0.12695zm-3.07813 6.28125c-0.32707 0.35607 -0.78398 0.80239 -1.1328 1.13671 0.10078 0.15118 0.17596 0.29508 0.23046 0.43555 0.47184 -0.16336 0.93866 -0.35904 1.38867 -0.58398 0 0 0.0039 -0.0042 0.0039 -0.0078 0.37432 -0.34158 0.85011 -0.83969 1.19532 -1.20313 -0.06175 -0.1671 -0.14772 -0.33793 -0.26758 -0.51953 -0.46474 0.26217 -0.94274 0.4998 -1.41797 0.74218zm-2.52343 -0.52344c0.29259 0.24078 0.5342 0.43964 0.69921 0.57812 -0.41402 0.74796 -0.70587 1.26414 -0.75 1.3379 -0.63406 0.16403 -1.26896 0.30608 -1.88476 0.416 -0.71425 -0.30196 -1.1466 -0.51623 -1.8457 -0.89452 0.01997 -0.16895 0.04622 -0.33773 0.07813 -0.51758 1.19164 -0.20783 2.4245 -0.47919 3.66015 -0.8086 0.0143 -0.03711 0.02864 -0.07421 0.04296 -0.11132z"
      fill="currentColor"
    />
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

const FootballPage: React.FC<FootballPageProps> = ({
  theme,
  onBack,
  onPlaceBet,
  onBetNow,
  onBuyNow,
  selectedBets: externalBets = {},
}) => {
  const [localBets, setLocalBets] = useState<Record<string, "home" | "draw" | "away">>({});
  const [selectedLeague, setSelectedLeague] = useState<{ league: League; country: Country } | null>(
    null,
  );

  const activeBets = Object.keys(externalBets).length > 0 ? externalBets : localBets;

  const handlePlaceBet: FootballPageProps["onPlaceBet"] = (match, oddType, value) => {
    setLocalBets((prev) => {
      const key = match.id;
      if (prev[key] === oddType) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: oddType };
    });
    onPlaceBet?.(match, oddType, value);
  };

  // ── League detail full page ──────────────────────────────────────────────
  if (selectedLeague) {
    return (
      <LeagueDetailPage
        league={selectedLeague.league}
        country={selectedLeague.country}
        theme={theme}
        selectedBets={activeBets}
        onBack={() => setSelectedLeague(null)}
        onPlaceBet={handlePlaceBet}
        onBetNow={onBetNow}
        onBuyNow={onBuyNow}
      />
    );
  }

  // ── Country list ─────────────────────────────────────────────────────────
  return (
    <div className={`flex flex-col h-full w-full ${pageBg(theme)}`}>
      {/* Header */}
      <div className={`flex items-center gap-3 px-4 pt-4 pb-3 shrink-0 ${headerBg(theme)}`}>
        <button
          onClick={onBack}
          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-95 ${
            theme === "light"
              ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
              : "bg-white/10 hover:bg-white/20 text-white"
          }`}
          aria-label="Rudi nyuma"
        >
          <ChevronLeft size={18} />
        </button>
        <FootballIcon className="text-[#38bdf8] shrink-0" />
        <div className="flex-1">
          <h1 className={`text-[15px] font-black tracking-tight ${textPrimary(theme)}`}>
            Football
          </h1>
          <p className={`text-[10px] ${textSecondary(theme)}`}>Chagua nchi → ligi → mechi</p>
        </div>
        {/* Decorative live indicator */}
        <span
          className={`flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full ${
            theme === "light"
              ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
              : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
          }`}
        >
          <Zap size={9} className="animate-pulse" />
          LIVE ODDS
        </span>
      </div>

      {/* Divider label */}
      <div className={`px-4 py-2 flex items-center gap-2 ${dateSepBg(theme)}`}>
        <span className={`text-[9px] font-bold uppercase tracking-widest ${textSecondary(theme)}`}>
          Nchi {FOOTBALL_COUNTRIES.length} • Ligi{" "}
          {FOOTBALL_COUNTRIES.reduce((s, c) => s + c.leagues.length, 0)}
        </span>
      </div>

      {/* Country list — px-4 padding like Basketball (SportPage) */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pt-3 pb-6">
        {FOOTBALL_COUNTRIES.map((country) => (
          <CountryRow
            key={country.id}
            country={country}
            theme={theme}
            defaultOpen={country.id === "world"}
            onSelectLeague={(lg, co) => setSelectedLeague({ league: lg, country: co })}
          />
        ))}
      </div>
    </div>
  );
};

export default FootballPage;
