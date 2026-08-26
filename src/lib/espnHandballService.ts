/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * espnHandballService.ts — Handball support.
 *
 * IMPORTANT: ESPN does NOT publish a handball feed. The ESPN sports catalogue
 * (https://sports.core.api.espn.com/v2/sports) has no `handball` entry and
 * `/sports/handball/scoreboard` returns HTTP 400/404.
 *
 * Since the app is ESPN-only, this service keeps the same interface as the
 * other team-sport services, probes ESPN, caches the negative result and
 * reports `available: false`. If ESPN adds handball, the existing probe will
 * start returning normally mapped matches with no further changes.
 */

import { espnFetch, mapEspnEvent, type EspnGenericMatch, type EspnLeagueConfig } from "./espnEventCore";

const ESPN_HANDBALL_PROBE = "https://site.api.espn.com/apis/site/v2/sports/handball/scoreboard";
const ESPN_TIMEOUT_MS = 6000;
const PROBE_TTL_MS = 600_000; // 10 minutes

export const ESPN_HANDBALL_LEAGUE: EspnLeagueConfig = {
  code: "HANDBALL",
  slug: "handball",
  name: "Handball",
  country: "International",
  emblemUrl: "https://a.espncdn.com/i/teamlogos/countries/500/int.png",
};

export type HandballMatch = EspnGenericMatch;

export interface HandballFeed {
  available: boolean;
  provider: "espn";
  reason?: string;
  matches: HandballMatch[];
}

let probeCache: { feed: HandballFeed; expiresAt: number } | null = null;

export async function getHandballMatchesFromEspn(): Promise<HandballFeed> {
  if (probeCache && Date.now() < probeCache.expiresAt) return probeCache.feed;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ESPN_TIMEOUT_MS);

  let feed: HandballFeed = {
    available: false,
    provider: "espn",
    reason: "ESPN does not expose a handball feed.",
    matches: [],
  };

  try {
    const res = await espnFetch(ESPN_HANDBALL_PROBE, controller.signal);

    if (res && res.ok) {
      const data = await res.json();
      const events = Array.isArray(data.events) ? data.events : [];
      const matches = events
        .map((evt: any) => mapEspnEvent(evt, ESPN_HANDBALL_LEAGUE, { sport: "handball", drawEnabled: true }))
        .filter(Boolean) as HandballMatch[];
      feed = {
        available: true,
        provider: "espn",
        reason: matches.length === 0 ? "No handball matches scheduled." : undefined,
        matches,
      };
    }
  } catch (err: any) {
    feed.reason = `ESPN handball probe failed: ${err?.message || err}`;
  } finally {
    clearTimeout(timeout);
  }

  probeCache = { feed, expiresAt: Date.now() + PROBE_TTL_MS };
  return feed;
}
