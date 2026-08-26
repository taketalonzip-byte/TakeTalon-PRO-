import React, { useState, useEffect } from "react";

export interface ScrollingScoreBadgeProps {
  scoreDisplay: string;
  setScoresList?: string[];
  isEnded?: boolean;
  isBreak?: boolean;
  isLive?: boolean;
  timeMovementDisplay?: string;
  className?: string;
}

/**
 * Parses score into individual sets/segments if multiple sets exist (e.g. Tennis "4-6 5-7 4-7").
 */
export function extractSetScores(scoreDisplay: string, setScoresList?: string[]): string[] {
  if (setScoresList && setScoresList.length > 0) {
    return setScoresList.map((s) => s.trim()).filter(Boolean);
  }
  if (!scoreDisplay) return ["0 - 0"];

  // If scoreDisplay has spaces like "4-6 5-7 4-7" or "6-4, 3-6, 7-6"
  const tokens = scoreDisplay.split(/[\s,]+/).filter((t) => /^\d+[-:]\d+$/.test(t.trim()));
  if (tokens.length > 1) {
    return tokens;
  }
  return [scoreDisplay.trim()];
}

export const ScrollingScoreBadge: React.FC<ScrollingScoreBadgeProps> = ({
  scoreDisplay,
  setScoresList,
  isEnded = false,
  isBreak = false,
  isLive = false,
  timeMovementDisplay,
  className = "",
}) => {
  const sets = extractSetScores(scoreDisplay, setScoresList);
  const [activeSetIndex, setActiveSetIndex] = useState(0);

  // Auto-scroll cycle through sets if multiple sets exist
  useEffect(() => {
    if (sets.length <= 1) return;
    const interval = setInterval(() => {
      setActiveSetIndex((prev) => (prev + 1) % sets.length);
    }, 2400);
    return () => clearInterval(interval);
  }, [sets.length]);

  const handleNextSet = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (sets.length > 1) {
      setActiveSetIndex((prev) => (prev + 1) % sets.length);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    if (sets.length > 1) {
      if (e.deltaY > 0) {
        setActiveSetIndex((prev) => (prev + 1) % sets.length);
      } else if (e.deltaY < 0) {
        setActiveSetIndex((prev) => (prev - 1 + sets.length) % sets.length);
      }
    }
  };

  const currentScore = sets[activeSetIndex] || scoreDisplay;

  // Visual styling
  const badgeColors = isEnded
    ? "text-slate-200 bg-neutral-800 border-neutral-700 hover:bg-neutral-750"
    : isBreak
      ? "text-amber-400 bg-amber-500/15 border-amber-500/30 hover:bg-amber-500/25"
      : "text-emerald-400 bg-emerald-500/15 border-emerald-500/30 hover:bg-emerald-500/25";

  const timeColor = isEnded
    ? "text-neutral-400"
    : isBreak
      ? "text-amber-400"
      : "text-emerald-300 animate-pulse";

  return (
    <div
      className={`flex flex-col items-center justify-center shrink-0 w-[54px] min-w-[54px] max-w-[54px] select-none ${className}`}
      onWheel={handleWheel}
      title={sets.length > 1 ? `Set ${activeSetIndex + 1}/${sets.length}: ${currentScore} (Click/Scroll to switch)` : currentScore}
    >
      {/* Score Box with fixed width */}
      <button
        type="button"
        onClick={handleNextSet}
        className={`w-full relative flex items-center justify-center py-0.5 px-1 rounded-lg border text-center font-mono font-black text-[11px] leading-tight transition-all duration-200 cursor-pointer shadow-sm overflow-hidden ${badgeColors}`}
      >
        <span
          key={`${activeSetIndex}-${currentScore}`}
          className="inline-block truncate animate-fadeIn tracking-tight"
        >
          {currentScore}
        </span>

        {/* Multi-set indicator dot / label */}
        {sets.length > 1 && (
          <span className="absolute right-0.5 top-0.5 flex space-x-0.5">
            <span className="w-1 h-1 rounded-full bg-current opacity-70" />
          </span>
        )}
      </button>

      {/* Set indicator & Time Movement */}
      <div className="flex items-center justify-center gap-1 mt-0.5 w-full">
        {sets.length > 1 && (
          <span className="text-[7.5px] font-mono font-bold text-neutral-400 uppercase">
            S{activeSetIndex + 1}
          </span>
        )}
        {timeMovementDisplay && (
          <span className={`text-[8.5px] font-mono font-bold truncate max-w-[48px] text-center ${timeColor}`}>
            {timeMovementDisplay}
          </span>
        )}
      </div>
    </div>
  );
};
