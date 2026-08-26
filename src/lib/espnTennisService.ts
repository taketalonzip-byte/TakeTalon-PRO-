/**
 * espnTennisService.ts
 *
 * Server-side service for ESPN Tennis API.
 * Provides live scoreboards, match mappings, odds calculations,
 * and Supabase synchronization mirroring espnService.ts and espnBasketballService.ts.
 *
 * Covers ATP Tour, WTA Tour, Grand Slams, Masters 1000, and International Tournaments.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

const ESPN_TENNIS_BASE = "https://site.api.espn.com/apis/site/v2/sports/tennis";
const ESPN_TIMEOUT_MS = 8000;

export interface TennisTournamentConfig {
  code: string;
  slug: string;
  name: string;
  tour: "ATP" | "WTA" | "GRAND_SLAM" | "MIXED";
  country: string;
  emblemUrl: string;
}

export const ESPN_TENNIS_TOURS: Record<string, TennisTournamentConfig> = {
  ATP: {
    code: "ATP",
    slug: "atp",
    name: "ATP Tour",
    tour: "ATP",
    country: "International",
    emblemUrl: "https://a.espncdn.com/i/teamlogos/leagues/500/atp.png",
  },
  WTA: {
    code: "WTA",
    slug: "wta",
    name: "WTA Tour",
    tour: "WTA",
    country: "International",
    emblemUrl: "https://a.espncdn.com/i/teamlogos/leagues/500/wta.png",
  },
};

export type TennisStatus = "SCHEDULED" | "IN_PLAY" | "PAUSED" | "FINISHED" | "POSTPONED";

export interface TennisPlayer {
  id: number;
  name: string;
  shortName: string;
  country?: string;
  flagUrl?: string;
  headshot?: string;
  seed?: number;
}

export interface TennisOdds {
  home: number; // Player 1
  away: number; // Player 2
}

export interface TennisMatch {
  id: number | string;
  sport: "tennis";
  tournament: {
    id: string;
    name: string;
    shortName: string;
    tour: string;
    country: string;
    emblem: string;
    category?: string;
  };
  round?: string;
  discipline: string; // "Men's Singles", "Women's Singles", "Men's Doubles", "Women's Doubles", "Mixed Doubles"
  player1: TennisPlayer; // home
  player2: TennisPlayer; // away
  utcDate: string;
  status: TennisStatus;
  statusDescription?: string; // ESPN status description: e.g. "In Progress", "Final", "Set Break"
  displayClock?: string | null; // ESPN clock
  shortDetail?: string; // ESPN shortDetail: e.g. "Set 2 - 4-3", "Final", "30-15"
  detail?: string; // ESPN detail
  period?: number; // Current Set number (1, 2, 3, etc.)
  isLive: boolean;
  curScore?: { player1?: string; player2?: string }; // Current game point: e.g. "40", "30", "Ad"
  score: {
    sets: { player1: number; player2: number };
    setScores: string[]; // e.g. ["6-4", "4-6", "6-2"]
    currentSet?: number;
  };
  odds: TennisOdds;
}

function detectCountry(venueName?: string, tournamentName?: string): string {
  const text = `${venueName || ""} ${tournamentName || ""}`.toLowerCase();
  if (text.includes("usa") || text.includes("united states") || text.includes("us open") || text.includes("miami") || text.includes("indian wells") || text.includes("winston-salem") || text.includes("cincinnati") || text.includes("philly")) return "USA";
  if (text.includes("uk") || text.includes("england") || text.includes("wimbledon") || text.includes("queen's") || text.includes("london") || text.includes("eastbourne")) return "England";
  if (text.includes("france") || text.includes("roland garros") || text.includes("french open") || text.includes("paris")) return "France";
  if (text.includes("australia") || text.includes("melbourne") || text.includes("sydney") || text.includes("brisbane") || text.includes("aus open")) return "Australia";
  if (text.includes("spain") || text.includes("madrid") || text.includes("barcelona")) return "Spain";
  if (text.includes("italy") || text.includes("rome") || text.includes("turin") || text.includes("milan")) return "Italy";
  if (text.includes("switzerland") || text.includes("basel") || text.includes("geneva")) return "Switzerland";
  if (text.includes("mexico") || text.includes("monterrey") || text.includes("acapulco")) return "Mexico";
  if (text.includes("germany") || text.includes("halle") || text.includes("berlin") || text.includes("stuttgart")) return "Germany";
  if (text.includes("monaco") || text.includes("monte carlo")) return "Monaco";
  if (text.includes("canada") || text.includes("toronto") || text.includes("montreal")) return "Canada";
  if (text.includes("japan") || text.includes("tokyo")) return "Japan";
  if (text.includes("china") || text.includes("beijing") || text.includes("shanghai")) return "China";
  return "International";
}

function mapTennisStatus(type: any): TennisStatus {
  const state = type?.state || "pre";
  const name = (type?.name || "").toUpperCase();

  if (state === "pre") return "SCHEDULED";
  if (state === "in") {
    if (name.includes("RAIN") || name.includes("DELAY") || name.includes("SUSPENDED")) return "PAUSED";
    return "IN_PLAY";
  }
  if (state === "post") {
    if (name.includes("POSTPONE") || name.includes("CANCEL")) return "POSTPONED";
    return "FINISHED";
  }
  return "SCHEDULED";
}

function computeTennisOdds(matchId: number, p1Id: number, p2Id: number): TennisOdds {
  let s = (matchId ^ (p1Id * 41) ^ (p2Id * 23)) >>> 0;
  const rng = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };

  // Tennis 2-way moneyline with 1.07 margin
  const p1Prob = 0.35 + rng() * 0.3; // 0.35 - 0.65
  const p2Prob = Math.max(0.15, 1 - p1Prob);
  const margin = 1.07;

  return {
    home: Number((margin / p1Prob).toFixed(2)),
    away: Number((margin / p2Prob).toFixed(2)),
  };
}

export function parseEspnTennisScoreboard(data: any, tourSlug: "atp" | "wta"): TennisMatch[] {
  const events = Array.isArray(data.events) ? data.events : [];
  const matches: TennisMatch[] = [];

  for (const evt of events) {
    const tournamentName = evt.name || evt.shortName || (tourSlug === "atp" ? "ATP Tournament" : "WTA Tournament");
    const tournamentCountry = detectCountry(evt.venue?.fullName || evt.venue?.displayName, tournamentName);
    const tournamentEmblem =
      tournamentName.toLowerCase().includes("us open")
        ? "https://a.espncdn.com/i/teamlogos/leagues/500/us-open.png"
        : tournamentName.toLowerCase().includes("wimbledon")
        ? "https://a.espncdn.com/i/teamlogos/leagues/500/wimbledon.png"
        : tournamentName.toLowerCase().includes("roland") || tournamentName.toLowerCase().includes("french")
        ? "https://a.espncdn.com/i/teamlogos/leagues/500/roland-garros.png"
        : tournamentName.toLowerCase().includes("australian")
        ? "https://a.espncdn.com/i/teamlogos/leagues/500/australian-open.png"
        : ESPN_TENNIS_TOURS[tourSlug.toUpperCase()]?.emblemUrl ||
          "https://a.espncdn.com/i/teamlogos/leagues/500/atp.png";

    const groupings = Array.isArray(evt.groupings) ? evt.groupings : [];

    for (const g of groupings) {
      const disciplineName = g.grouping?.displayName || "Singles";
      const comps = Array.isArray(g.competitions) ? g.competitions : [];

      for (const comp of comps) {
        const competitors = Array.isArray(comp.competitors) ? comp.competitors : [];
        const homeComp = competitors.find((c: any) => c.homeAway === "home") || competitors[0];
        const awayComp = competitors.find((c: any) => c.homeAway === "away") || competitors[1];

        if (!homeComp || !awayComp) continue;

        // Player / Team names
        const p1Name =
          homeComp.athlete?.displayName ||
          homeComp.athlete?.fullName ||
          homeComp.roster?.displayName ||
          "Player 1";
        const p2Name =
          awayComp.athlete?.displayName ||
          awayComp.athlete?.fullName ||
          awayComp.roster?.displayName ||
          "Player 2";

        // Skip non-meaningful matches where both players are TBD
        if (p1Name === "TBD" && p2Name === "TBD") continue;

        const p1Short =
          homeComp.athlete?.shortName ||
          homeComp.roster?.shortDisplayName ||
          p1Name.substring(0, 3).toUpperCase();
        const p2Short =
          awayComp.athlete?.shortName ||
          awayComp.roster?.shortDisplayName ||
          p2Name.substring(0, 3).toUpperCase();

        const p1Id = parseInt(homeComp.id || homeComp.athlete?.id || "101", 10) || 101;
        const p2Id = parseInt(awayComp.id || awayComp.athlete?.id || "102", 10) || 102;
        const matchId = comp.id ? parseInt(comp.id, 10) || comp.id : Math.abs((p1Id * 37) ^ p2Id);

        const p1Flag =
          homeComp.athlete?.flag?.href ||
          homeComp.roster?.athletes?.[0]?.flag?.href ||
          undefined;
        const p2Flag =
          awayComp.athlete?.flag?.href ||
          awayComp.roster?.athletes?.[0]?.flag?.href ||
          undefined;

        const status = mapTennisStatus(comp.status?.type || evt.status?.type);
        const isLive = status === "IN_PLAY" || status === "PAUSED";

        // Parse line scores (sets)
        const p1Lines: number[] = Array.isArray(homeComp.linescores)
          ? homeComp.linescores.map((s: any) => (s.value != null ? Number(s.value) : 0))
          : [];
        const p2Lines: number[] = Array.isArray(awayComp.linescores)
          ? awayComp.linescores.map((s: any) => (s.value != null ? Number(s.value) : 0))
          : [];

        const setScores: string[] = [];
        let p1SetsWon = 0;
        let p2SetsWon = 0;

        const maxSets = Math.max(p1Lines.length, p2Lines.length);
        for (let i = 0; i < maxSets; i++) {
          const s1 = p1Lines[i] ?? 0;
          const s2 = p2Lines[i] ?? 0;
          setScores.push(`${s1}-${s2}`);

          if (homeComp.linescores?.[i]?.winner === true || (s1 >= 6 && s1 - s2 >= 2)) {
            p1SetsWon++;
          } else if (awayComp.linescores?.[i]?.winner === true || (s2 >= 6 && s2 - s1 >= 2)) {
            p2SetsWon++;
          }
        }

        const odds = computeTennisOdds(Number(matchId) || 1, p1Id, p2Id);

        const statusType = comp.status?.type || evt.status?.type;
        const statusDescription = statusType?.description || statusType?.detail || undefined;
        const displayClock = comp.status?.displayClock || null;
        const shortDetail = statusType?.shortDetail || undefined;
        const detail = statusType?.detail || comp.round?.displayName || undefined;
        const period = comp.status?.period != null ? Number(comp.status.period) : maxSets > 0 ? maxSets : 1;

        const curScore = (homeComp.curScore || awayComp.curScore)
          ? {
              player1: homeComp.curScore != null ? String(homeComp.curScore) : undefined,
              player2: awayComp.curScore != null ? String(awayComp.curScore) : undefined,
            }
          : undefined;

        matches.push({
          id: matchId,
          sport: "tennis",
          tournament: {
            id: evt.id || String(evt.tournamentId || "tour"),
            name: tournamentName,
            shortName: evt.shortName || tournamentName,
            tour: tourSlug.toUpperCase(),
            country: tournamentCountry,
            emblem: tournamentEmblem,
            category: comp.type?.text || disciplineName,
          },
          round: comp.round?.displayName || comp.status?.type?.detail || undefined,
          discipline: disciplineName,
          player1: {
            id: p1Id,
            name: p1Name,
            shortName: p1Short,
            flagUrl: p1Flag,
            seed: homeComp.seed ? parseInt(homeComp.seed, 10) : undefined,
          },
          player2: {
            id: p2Id,
            name: p2Name,
            shortName: p2Short,
            flagUrl: p2Flag,
            seed: awayComp.seed ? parseInt(awayComp.seed, 10) : undefined,
          },
          utcDate: comp.date || comp.startDate || evt.date || new Date().toISOString(),
          status,
          statusDescription,
          displayClock,
          shortDetail,
          detail,
          period,
          isLive,
          curScore,
          score: {
            sets: { player1: p1SetsWon, player2: p2SetsWon },
            setScores,
            currentSet: period,
          },
          odds,
        });
      }
    }
  }

  return matches;
}

/**
 * Fetch live scoreboard for ATP or WTA from ESPN Tennis
 */
export async function fetchEspnTennisScoreboard(
  tour: "atp" | "wta" = "atp",
  dateRange?: string
): Promise<{ tour: TennisTournamentConfig; matches: TennisMatch[] }> {
  const tourConfig = ESPN_TENNIS_TOURS[tour.toUpperCase()] || ESPN_TENNIS_TOURS.ATP;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ESPN_TIMEOUT_MS);

  try {
    const url = dateRange
      ? `${ESPN_TENNIS_BASE}/${tour.toLowerCase()}/scoreboard?dates=${dateRange}`
      : `${ESPN_TENNIS_BASE}/${tour.toLowerCase()}/scoreboard`;

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      throw new Error(`ESPN Tennis returned HTTP ${res.status} for ${tour}`);
    }

    const data = await res.json();
    const matches = parseEspnTennisScoreboard(data, tour);

    return {
      tour: tourConfig,
      matches,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Memory cache for tennis matches
 */
const TENNIS_MEM_CACHE = new Map<string, { matches: TennisMatch[]; expiresAt: number }>();
const TENNIS_CACHE_TTL_MS = 60_000;

export async function getTennisMatchesFromEspn(
  tours: string[] = ["atp", "wta"]
): Promise<TennisMatch[]> {
  const allMatches: TennisMatch[] = [];

  await Promise.allSettled(
    tours.map(async (t) => {
      const tourSlug = t.toLowerCase() as "atp" | "wta";
      const cached = TENNIS_MEM_CACHE.get(tourSlug);
      if (cached && Date.now() < cached.expiresAt) {
        allMatches.push(...cached.matches);
        return;
      }

      try {
        const result = await fetchEspnTennisScoreboard(tourSlug);
        TENNIS_MEM_CACHE.set(tourSlug, {
          matches: result.matches,
          expiresAt: Date.now() + TENNIS_CACHE_TTL_MS,
        });
        allMatches.push(...result.matches);
      } catch (err: any) {
        console.warn(`[ESPN-Tennis] Scoreboard fetch error for ${tourSlug}:`, err?.message);
      }
    })
  );

  // De-duplicate matches if any tournament is listed across both ATP and WTA
  const seen = new Set<string | number>();
  const uniqueMatches = allMatches.filter((m) => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });

  return uniqueMatches.sort(
    (a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()
  );
}

/**
 * Sync ESPN Tennis players to Supabase `tennis_players` table
 */
export async function syncEspnTennisToSupabase(
  supabase: SupabaseClient,
  tour: "atp" | "wta" = "atp"
): Promise<{ success: boolean; synced: number }> {
  try {
    const { matches } = await fetchEspnTennisScoreboard(tour);
    if (matches.length === 0) return { success: true, synced: 0 };

    let count = 0;
    for (const m of matches) {
      if (m.player1 && m.player1.name !== "Player 1" && m.player1.name !== "TBD") {
        await supabase.from("tennis_players").upsert(
          {
            external_id: m.player1.id,
            provider: "espn",
            name: m.player1.name,
            tour: tour.toUpperCase(),
            photo_url: m.player1.flagUrl || null,
            last_synced_at: new Date().toISOString(),
          },
          { onConflict: "external_id" }
        );
        count++;
      }

      if (m.player2 && m.player2.name !== "Player 2" && m.player2.name !== "TBD") {
        await supabase.from("tennis_players").upsert(
          {
            external_id: m.player2.id,
            provider: "espn",
            name: m.player2.name,
            tour: tour.toUpperCase(),
            photo_url: m.player2.flagUrl || null,
            last_synced_at: new Date().toISOString(),
          },
          { onConflict: "external_id" }
        );
        count++;
      }
    }

    return { success: true, synced: count };
  } catch (err: any) {
    console.error(`[ESPN-Tennis-Sync] Error syncing ${tour}:`, err);
    return { success: false, synced: 0 };
  }
}
