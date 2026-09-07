import assert from "node:assert/strict";
import { isCardBetExpired, isMatchTipCardBetExpired } from "../src/lib/cardBetEligibility";

const NOW = Date.parse("2026-09-07T17:00:00.000Z");

assert.equal(
  isCardBetExpired({ isEnded: true, isLive: false, isBreak: false }, "2026-09-07T19:00:00.000Z", NOW),
  true,
  "terminal provider states must close a Card Bet",
);

assert.equal(
  isCardBetExpired({ isEnded: false, isLive: false, isBreak: false }, "2026-09-07T16:59:59.000Z", NOW),
  true,
  "a stale scheduled fixture after kickoff must close a Card Bet",
);

assert.equal(
  isCardBetExpired({ isEnded: false, isLive: true, isBreak: false }, "2026-09-07T16:00:00.000Z", NOW),
  false,
  "an explicitly live match must preserve the in-play flow",
);

assert.equal(
  isCardBetExpired({ isEnded: false, isLive: false, isBreak: true }, "2026-09-07T16:00:00.000Z", NOW),
  false,
  "a declared match interval must preserve the in-play flow",
);

assert.equal(
  isCardBetExpired({ isEnded: false, isLive: false, isBreak: false }, "2026-09-07T17:00:01.000Z", NOW),
  false,
  "a future fixture must remain actionable",
);

assert.equal(
  isCardBetExpired({ isEnded: false, isLive: false, isBreak: false }, "not-a-date", NOW),
  false,
  "an invalid kickoff must not accidentally close a Card Bet",
);

assert.equal(
  isMatchTipCardBetExpired({ status: "ENDED", kickoffUtc: "2026-09-07T19:00:00.000Z" }, NOW),
  true,
  "an ended Card Bet already in the cart must not be submitted",
);

assert.equal(
  isMatchTipCardBetExpired({ status: "UPCOMING", kickoffUtc: "2026-09-07T16:59:59.000Z" }, NOW),
  true,
  "a stale pre-match Card Bet already in the cart must not be submitted",
);

assert.equal(
  isMatchTipCardBetExpired({ status: "LIVE", kickoffUtc: "2026-09-07T16:00:00.000Z" }, NOW),
  false,
  "a live Card Bet must retain its in-play behavior",
);

console.log("cardBetEligibility tests passed");
