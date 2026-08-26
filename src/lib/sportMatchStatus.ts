/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * sportMatchStatus.ts
 *
 * Authentic real-time match status, live score, and time movement parser
 * directly consuming ESPN data (Tennis, Basketball, Football/Soccer, etc.).
 *
 * Principles:
 * - NO synthetic mock generation.
 * - Extracts and respects genuine ESPN displayClock, shortDetail, detail, period, curScore, and linescores.
 * - Live/Ended matches replace static "VS" with genuine ESPN score and time movement.
 */

export interface UnifiedMatchStatus {
  isLive: boolean;
  isEnded: boolean;
  isBreak: boolean;
  breakLabel: string; // e.g. "Half Time", "Set Break", "Quarter Break", "Intermission"
  endLabel: string; // e.g. "Full Time", "Final", "FT"
  scoreDisplay: string; // Genuine score from ESPN (e.g. "2 - 1", "84 - 79", "6-4, 3-2", "Sets 1-1")
  setScoresList: string[]; // Individual sets e.g. ["4-6", "5-7", "4-7"]
  timeMovementDisplay: string; // Genuine time movement from ESPN (e.g. "34'", "Q3 08:42", "Set 2 • 4-3", "HT")
  badgeText: string; // e.g. "LIVE", "Half Time", "Set Break", "Full Time"
  badgeType: "live" | "break" | "ended" | "upcoming";
}

/**
 * Main parser for match live status, live scores, and clock movement across sports.
 */
export function getUnifiedMatchStatus(params: {
  sport?: string;
  status?: string;
  statusDescription?: string;
  score?: { home: number | null; away: number | null } | null;
  rawScoreStr?: string;
  setScores?: string[];
  currentSet?: number;
  kickoffUtc?: string;
  minute?: number | null;
  displayClock?: string | null;
  shortDetail?: string | null;
  detail?: string | null;
  period?: number | string | null;
  curScore?: { player1?: string; player2?: string; home?: string; away?: string } | null;
  matchId?: string | number;
  tickerSeconds?: number;
}): UnifiedMatchStatus {
  const {
    sport = "Football",
    status = "",
    statusDescription,
    score,
    rawScoreStr,
    setScores,
    currentSet,
    kickoffUtc,
    minute,
    displayClock,
    shortDetail,
    detail,
    period,
    curScore,
  } = params;

  const s = (status || "").toLowerCase();
  const sp = sport.toLowerCase();
  const desc = (statusDescription || "").toLowerCase();
  const shortDet = (shortDetail || "").toLowerCase();

  // 1. Identify Ended Status from ESPN state
  const isEnded =
    s.includes("final") ||
    s.includes("ft") ||
    s.includes("finished") ||
    s.includes("ended") ||
    s.includes("awarded") ||
    s.includes("aet") ||
    s.includes("postponed") ||
    s.includes("cancelled") ||
    desc.includes("final") ||
    shortDet.includes("final");

  // 2. Identify Break Status (Halftime, Set Break, Intermission, Quarter Break) from ESPN
  const isHalfTime =
    !isEnded &&
    (s.includes("ht") ||
      s.includes("halftime") ||
      s.includes("half time") ||
      s.includes("half-time") ||
      s.includes("paused") ||
      s.includes("interval") ||
      desc.includes("halftime") ||
      desc.includes("half time") ||
      shortDet.includes("halftime") ||
      (displayClock && displayClock.toLowerCase().includes("ht")) ||
      (displayClock && displayClock.toLowerCase().includes("half")));

  const isSetBreak =
    !isEnded &&
    (s.includes("set break") ||
      s.includes("changeover") ||
      s.includes("set interval") ||
      s.includes("between sets") ||
      desc.includes("set break") ||
      desc.includes("changeover") ||
      shortDet.includes("set break") ||
      shortDet.includes("changeover"));

  const isQuarterBreak =
    !isEnded &&
    (s.includes("quarter break") ||
      s.includes("end of q") ||
      s.includes("end of 1st") ||
      s.includes("end of 3rd") ||
      desc.includes("quarter break") ||
      desc.includes("end of") ||
      shortDet.includes("end of"));

  const isIntermission =
    !isEnded &&
    (s.includes("intermission") || s.includes("period break") || desc.includes("intermission"));

  const isBreak = isHalfTime || isSetBreak || isQuarterBreak || isIntermission;

  // 3. Identify Live Status from ESPN
  const isLive =
    !isEnded &&
    (s.includes("live") ||
      s.includes("in_play") ||
      s.includes("inplay") ||
      s.includes("inprogress") ||
      s.includes("in_progress") ||
      s.includes("1st half") ||
      s.includes("2nd half") ||
      s.includes("q1") ||
      s.includes("q2") ||
      s.includes("q3") ||
      s.includes("q4") ||
      s.includes("set ") ||
      desc.includes("in progress") ||
      isBreak ||
      minute != null ||
      (Boolean(displayClock) && displayClock !== "0'" && displayClock !== "0:00" && displayClock !== "0.0"));

  // 4. Sport-Specific Break and End Labels
  let breakLabel = "Half Time";
  let endLabel = "Full Time";

  if (sp.includes("tennis")) {
    breakLabel = isSetBreak ? "Set Break" : "Changeover";
    endLabel = "Final";
  } else if (sp.includes("basketball")) {
    breakLabel = isQuarterBreak ? "Quarter Break" : "Half Time";
    endLabel = "Full Time";
  } else if (sp.includes("volleyball")) {
    breakLabel = "Set Break";
    endLabel = "Final";
  } else if (sp.includes("hockey")) {
    breakLabel = "Intermission";
    endLabel = "Final";
  } else if (sp.includes("boxing")) {
    breakLabel = "Round Break";
    endLabel = "Final";
  } else if (sp.includes("cricket")) {
    breakLabel = "Innings Break";
    endLabel = "Match Ended";
  } else if (sp.includes("baseball")) {
    breakLabel = "Inning Break";
    endLabel = "Final";
  }

  // 5. Score Display from ESPN
  let scoreDisplay = "0 - 0";
  let setScoresList: string[] = [];

  if (setScores && setScores.length > 0) {
    setScoresList = setScores;
  } else if (rawScoreStr && rawScoreStr.trim().length > 0) {
    const tokens = rawScoreStr.split(/[\s,]+/).filter((t) => /^\d+[-:]\d+$/.test(t.trim()));
    if (tokens.length > 0) {
      setScoresList = tokens;
    }
  }

  if (rawScoreStr && rawScoreStr.trim().length > 0) {
    scoreDisplay = rawScoreStr;
  } else if (sp.includes("tennis") || sp.includes("volleyball")) {
    if (setScores && setScores.length > 0) {
      scoreDisplay = setScores.join(" ");
    } else if (score && score.home != null && score.away != null) {
      scoreDisplay = `${score.home} - ${score.away}`;
    }
  } else if (score && score.home != null && score.away != null) {
    scoreDisplay = `${score.home} - ${score.away}`;
  }

  // 6. Time Movement Display from ESPN (100% Authentic ESPN clocks & details)
  let timeMovementDisplay = "";

  if (isEnded) {
    timeMovementDisplay = endLabel === "Full Time" ? "FT" : "Final";
  } else if (isBreak) {
    timeMovementDisplay = breakLabel;
  } else if (isLive) {
    if (sp.includes("tennis")) {
      // Authentic Tennis ESPN detail: shortDetail (e.g. "Set 2 - 4-3"), or current game point
      if (shortDetail && !shortDetail.toLowerCase().includes("final") && !shortDetail.toLowerCase().includes("scheduled")) {
        timeMovementDisplay = shortDetail;
      } else if (displayClock && displayClock !== "0:00" && displayClock !== "undefined") {
        timeMovementDisplay = displayClock;
      } else {
        const curSetNum = period || currentSet || 1;
        const p1Pt = curScore?.player1 ?? curScore?.home;
        const p2Pt = curScore?.player2 ?? curScore?.away;
        if (p1Pt != null && p2Pt != null) {
          timeMovementDisplay = `Set ${curSetNum} (${p1Pt}-${p2Pt})`;
        } else {
          timeMovementDisplay = `Set ${curSetNum}`;
        }
      }
    } else if (sp.includes("volleyball")) {
      // Authentic Volleyball ESPN detail: Set number and current set point scores (e.g. "Set 3 (21-19)")
      if (shortDetail && !shortDetail.toLowerCase().includes("final") && !shortDetail.toLowerCase().includes("scheduled")) {
        timeMovementDisplay = shortDetail;
      } else {
        const curSetNum = period || currentSet || (setScores && setScores.length ? setScores.length : 1);
        const hPt = curScore?.home;
        const aPt = curScore?.away;
        if (hPt != null && aPt != null) {
          timeMovementDisplay = `Set ${curSetNum} (${hPt}-${aPt})`;
        } else {
          timeMovementDisplay = `Set ${curSetNum}`;
        }
      }
    } else if (sp.includes("basketball")) {
      // Authentic Basketball ESPN clock
      if (displayClock && displayClock !== "0.0" && displayClock !== "0:00") {
        const qPrefix = period ? `Q${period} ` : "";
        timeMovementDisplay = `${qPrefix}${displayClock}`.trim();
      } else if (shortDetail && !shortDetail.toLowerCase().includes("final") && !shortDetail.toLowerCase().includes("scheduled")) {
        timeMovementDisplay = shortDetail;
      } else if (period) {
        timeMovementDisplay = `Quarter ${period}`;
      } else {
        timeMovementDisplay = "LIVE";
      }
    } else if (sp.includes("football") || sp.includes("soccer")) {
      // Authentic Football ESPN display clock (e.g. "34'", "45+2'", "HT", "78'")
      if (displayClock && displayClock !== "0'") {
        timeMovementDisplay = displayClock.includes("'") ? displayClock : `${displayClock}'`;
      } else if (minute != null) {
        timeMovementDisplay = `${minute}'`;
      } else if (shortDetail && !shortDetail.toLowerCase().includes("scheduled") && !shortDetail.toLowerCase().includes("final")) {
        timeMovementDisplay = shortDetail;
      } else {
        timeMovementDisplay = "LIVE";
      }
    } else {
      // Other sports from ESPN
      if (displayClock && displayClock !== "0:00" && displayClock !== "0.0") {
        timeMovementDisplay = displayClock;
      } else if (shortDetail && !shortDetail.toLowerCase().includes("scheduled")) {
        timeMovementDisplay = shortDetail;
      } else {
        timeMovementDisplay = "LIVE";
      }
    }
  }

  // 7. Badge Text & Type
  let badgeText = "UPCOMING";
  let badgeType: "live" | "break" | "ended" | "upcoming" = "upcoming";

  if (isEnded) {
    badgeText = endLabel;
    badgeType = "ended";
  } else if (isBreak) {
    badgeText = breakLabel;
    badgeType = "break";
  } else if (isLive) {
    badgeText = "LIVE";
    badgeType = "live";
  }

  return {
    isLive,
    isEnded,
    isBreak,
    breakLabel,
    endLabel,
    scoreDisplay,
    setScoresList,
    timeMovementDisplay,
    badgeText,
    badgeType,
  };
}
