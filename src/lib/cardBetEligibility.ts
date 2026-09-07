import type { UnifiedMatchStatus } from "./sportMatchStatus";

/**
 * Determines whether a Card Bet has expired for new betting or purchase actions.
 *
 * A provider terminal status always closes the card. As a conservative fallback,
 * a non-live match whose scheduled kickoff has already passed is also closed. This
 * prevents a stale provider response from exposing actionable controls for an old
 * fixture, while explicitly live and interval states remain available for the
 * platform's in-play flow.
 */
export function isCardBetExpired(
  status: Pick<UnifiedMatchStatus, "isEnded" | "isLive" | "isBreak">,
  kickoffUtc?: string | null,
  nowMs = Date.now(),
): boolean {
  if (status.isEnded) return true;
  if (status.isLive || status.isBreak || !kickoffUtc) return false;

  const kickoffMs = Date.parse(kickoffUtc);
  return Number.isFinite(kickoffMs) && kickoffMs <= nowMs;
}

/**
 * Applies the same expiry policy when a Card Bet reaches the shared cart.
 * This protects against a fixture changing state after a selection was made.
 */
export function isMatchTipCardBetExpired(
  match: { status?: string | null; kickoffUtc?: string | null },
  nowMs = Date.now(),
): boolean {
  const status = (match.status || "").toUpperCase();

  return isCardBetExpired(
    {
      isEnded: ["ENDED", "FINISHED", "FINAL", "FT", "AWARDED", "POSTPONED", "CANCELLED"].includes(status),
      isLive: ["LIVE", "IN_PLAY"].includes(status),
      isBreak: ["PAUSED", "HALFTIME", "HALF TIME", "HT"].includes(status),
    },
    match.kickoffUtc,
    nowMs,
  );
}
