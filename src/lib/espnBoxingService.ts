/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * espnBoxingService.ts — Boxing support.
 *
 * IMPORTANT: ESPN does NOT publish a boxing scoreboard API. The ESPN sports
 * catalogue (https://sports.core.api.espn.com/v2/sports) only contains:
 * australian-football, baseball, basketball, cricket, field-hockey, football,
 * golf, hockey, lacrosse, mma, racing, rugby, rugby-league, soccer, tennis,
 * volleyball, water-polo — there is no `boxing` sport and
 * `/sports/boxing/scoreboard` returns HTTP 404.
 *
 * Because the app is ESPN-only, this service is a first-class but empty
 * provider: it probes the endpoint, caches the negative result, and reports
 * `available: false` so the UI can show "no ESPN feed" instead of breaking.
 * The moment ESPN ships a boxing scoreboard the probe starts returning cards
 * with no other change required.
 */

import { espnFetch } from "./espnEventCore";

const ESPN_BOXING_PROBE = "https://site.api.espn.com/apis/site/v2/sports/boxing/scoreboard";
const ESPN_TIMEOUT_MS = 6000;
const PROBE_TTL_MS = 600_000; // 10 minutes

export interface BoxingBout {
  id: string;
  sport: "boxing";
  event: string;
  weightClass?: string;
  rounds?: number;
  utcDate: string;
  status: "SCHEDULED" | "IN_PLAY" | "FINISHED" | "CANCELLED";
  isLive: boolean;
  round: number;
  shortDetail?: string;
  fighterA: { id: string; name: string; record?: string; flag?: string };
  fighterB: { id: string; name: string; record?: string; flag?: string };
  odds: { home: number; away: number; draw: number };
}

export interface BoxingFeed {
  available: boolean;
  provider: "espn";
  reason?: string;
  bouts: BoxingBout[];
}

let probeCache: { feed: BoxingFeed; expiresAt: number } | null = null;

export async function getBoxingBoutsFromEspn(): Promise<BoxingFeed> {
  if (probeCache && Date.now() < probeCache.expiresAt) return probeCache.feed;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ESPN_TIMEOUT_MS);

  let feed: BoxingFeed = {
    available: false,
    provider: "espn",
    reason: "ESPN does not expose a boxing scoreboard endpoint.",
    bouts: [],
  };

  try {
    const res = await espnFetch(ESPN_BOXING_PROBE, controller.signal);

    if (res && res.ok) {
      const data = await res.json();
      const events = Array.isArray(data.events) ? data.events : [];
      if (events.length > 0) {
        feed = { available: true, provider: "espn", bouts: events.map(mapBout).filter(Boolean) as BoxingBout[] };
      } else {
        feed = { available: true, provider: "espn", reason: "No boxing events scheduled.", bouts: [] };
      }
    }
  } catch (err: any) {
    feed.reason = `ESPN boxing probe failed: ${err?.message || err}`;
  } finally {
    clearTimeout(timeout);
  }

  probeCache = { feed, expiresAt: Date.now() + PROBE_TTL_MS };
  return feed;
}

function mapBout(event: any): BoxingBout | null {
  try {
    const comp = event?.competitions?.[0];
    if (!comp) return null;
    const [a, b] = comp.competitors || [];
    const statusBlock = comp.status || event.status || {};
    const statusType = statusBlock.type || {};
    const state = statusType.state || "pre";

    const side = (c: any, fallback: string) => ({
      id: String(c?.id || fallback),
      name: c?.athlete?.displayName || c?.athlete?.fullName || fallback,
      record: c?.records?.[0]?.summary,
      flag: c?.athlete?.flag?.href,
    });

    return {
      id: String(event.id),
      sport: "boxing",
      event: event.name || "Boxing",
      weightClass: comp.type?.text || event.season?.slug,
      rounds: comp.format?.regulation?.periods,
      utcDate: comp.date || event.date || new Date().toISOString(),
      status:
        state === "in" ? "IN_PLAY" : state === "post" ? "FINISHED" : statusType.name?.includes("CANCEL") ? "CANCELLED" : "SCHEDULED",
      isLive: state === "in",
      round: Number(statusBlock.period ?? 0),
      shortDetail: statusType.shortDetail,
      fighterA: side(a, "Fighter A"),
      fighterB: side(b, "Fighter B"),
      odds: { home: 1.9, away: 1.9, draw: 15.0 },
    };
  } catch {
    return null;
  }
}
