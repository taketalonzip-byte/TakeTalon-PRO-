/**
 * Team Sports Service
 * Unified management for Ice Hockey, Rugby, Baseball, Cricket, Volleyball, Handball, etc.
 * Operates strictly on the 4 unified tables:
 *  - team_sports_competitions
 *  - team_sports_teams (and view team_sports_teams_display)
 *  - team_sports_fixtures
 *  - team_sports_standings
 * Plus unified sync tables:
 *  - sports_sync_config
 *  - sports_sync_logs
 */

import { supabase } from "./supabase";

export interface TeamSportsCompetition {
  id?: string;
  sport: string; // 'icehockey' | 'rugby' | 'baseball' | 'cricket' | 'volleyball' | 'handball' | ...
  external_id?: string;
  provider?: string;
  name: string;
  category_name?: string;
  country_code?: string;
  season?: string;
  logo_url?: string;
}

export interface TeamSportsTeam {
  id?: string;
  sport: string;
  external_id?: string;
  provider?: string;
  name: string;
  short_name?: string;
  logo_url?: string;
  country?: string;
}

export interface CricketExtraStats {
  match_format?: "T20" | "ODI" | "Test" | string;
  home_wickets?: number;
  home_overs?: number;
  away_wickets?: number;
  away_overs?: number;
  result_summary?: string;
  toss_winner?: string;
}

export interface VolleyballExtraStats {
  home_sets_won?: number;
  away_sets_won?: number;
  set_scores?: Array<{ set: number; home: number; away: number }>;
}

export interface BaseballExtraStats {
  home_hits?: number;
  away_hits?: number;
  home_errors?: number;
  away_errors?: number;
  innings?: Array<{ inning: number; home: number; away: number }>;
}

export interface IceHockeyExtraStats {
  went_to_overtime?: boolean;
  went_to_shootout?: boolean;
  home_periods?: number[];
  away_periods?: number[];
}

export interface RugbyExtraStats {
  home_tries?: number;
  away_tries?: number;
  home_conversions?: number;
  away_conversions?: number;
  home_penalties?: number;
  away_penalties?: number;
}

export type ExtraStatsType =
  | CricketExtraStats
  | VolleyballExtraStats
  | BaseballExtraStats
  | IceHockeyExtraStats
  | RugbyExtraStats
  | Record<string, any>;

export interface TeamSportsFixture {
  id?: string;
  sport: string;
  competition_id?: string;
  external_id?: string;
  provider?: string;
  home_team_id?: string;
  away_team_id?: string;
  home_team_name: string;
  away_team_name: string;
  match_date: string;
  status: "NS" | "LIVE" | "FT" | "CANCELLED" | string;
  home_score: number;
  away_score: number;
  winner?: "HOME" | "AWAY" | "DRAW" | string;
  extra_stats?: ExtraStatsType;
}

export interface TeamSportsStanding {
  id?: string;
  sport: string;
  competition_id: string;
  team_id: string;
  season?: string;
  rank?: number;
  played: number;
  won: number;
  lost: number;
  drawn?: number;
  points: number;
  for_score?: number;
  against_score?: number;
  extra_stats?: Record<string, any>;
}

export class TeamSportsService {
  /**
   * Fetch fixtures for a given sport from team_sports_fixtures
   */
  static async getFixtures(sport: string, limit = 50): Promise<TeamSportsFixture[]> {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from("team_sports_fixtures")
        .select(`
          id,
          sport,
          competition_id,
          external_id,
          provider,
          home_team_id,
          away_team_id,
          home_team_name,
          away_team_name,
          match_date,
          status,
          home_score,
          away_score,
          winner,
          extra_stats,
          team_sports_competitions ( name, logo_url )
        `)
        .eq("sport", sport.toLowerCase())
        .order("match_date", { ascending: true })
        .limit(limit);

      if (error) {
        console.warn(`[TeamSportsService] Error fetching ${sport} fixtures:`, error.message);
        return [];
      }

      return (data || []) as TeamSportsFixture[];
    } catch (err: any) {
      console.error(`[TeamSportsService] Exception fetching ${sport} fixtures:`, err);
      return [];
    }
  }

  /**
   * Upsert a competition record into team_sports_competitions
   */
  static async upsertCompetition(comp: TeamSportsCompetition): Promise<string | null> {
    if (!supabase) return null;
    try {
      const payload = {
        sport: comp.sport.toLowerCase(),
        external_id: comp.external_id || null,
        provider: comp.provider || "api-sports",
        name: comp.name,
        category_name: comp.category_name || null,
        country_code: comp.country_code || null,
        season: comp.season || new Date().getFullYear().toString(),
        logo_url: comp.logo_url || null,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("team_sports_competitions")
        .upsert(payload, { onConflict: "sport,external_id,provider" })
        .select("id")
        .single();

      if (error) {
        console.warn("[TeamSportsService] Competition upsert error:", error.message);
        return null;
      }

      return data?.id || null;
    } catch (e: any) {
      console.error("[TeamSportsService] Competition upsert exception:", e);
      return null;
    }
  }

  /**
   * Upsert a team record into team_sports_teams
   */
  static async upsertTeam(team: TeamSportsTeam): Promise<string | null> {
    if (!supabase) return null;
    try {
      const payload = {
        sport: team.sport.toLowerCase(),
        external_id: team.external_id || null,
        provider: team.provider || "api-sports",
        name: team.name,
        short_name: team.short_name || null,
        logo_url: team.logo_url || null,
        country: team.country || null,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("team_sports_teams")
        .upsert(payload, { onConflict: "sport,external_id,provider" })
        .select("id")
        .single();

      if (error) {
        console.warn("[TeamSportsService] Team upsert error:", error.message);
        return null;
      }

      return data?.id || null;
    } catch (e: any) {
      console.error("[TeamSportsService] Team upsert exception:", e);
      return null;
    }
  }

  /**
   * Upsert a fixture record into team_sports_fixtures
   */
  static async upsertFixture(fixture: TeamSportsFixture): Promise<string | null> {
    if (!supabase) return null;
    try {
      const payload = {
        sport: fixture.sport.toLowerCase(),
        competition_id: fixture.competition_id || null,
        external_id: fixture.external_id || null,
        provider: fixture.provider || "api-sports",
        home_team_id: fixture.home_team_id || null,
        away_team_id: fixture.away_team_id || null,
        home_team_name: fixture.home_team_name,
        away_team_name: fixture.away_team_name,
        match_date: fixture.match_date,
        status: fixture.status || "NS",
        home_score: fixture.home_score || 0,
        away_score: fixture.away_score || 0,
        winner: fixture.winner || null,
        extra_stats: fixture.extra_stats || {},
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("team_sports_fixtures")
        .upsert(payload, { onConflict: "sport,external_id,provider" })
        .select("id")
        .single();

      if (error) {
        console.warn("[TeamSportsService] Fixture upsert error:", error.message);
        return null;
      }

      return data?.id || null;
    } catch (e: any) {
      console.error("[TeamSportsService] Fixture upsert exception:", e);
      return null;
    }
  }

  /**
   * Upsert standings into team_sports_standings
   */
  static async upsertStanding(standing: TeamSportsStanding): Promise<boolean> {
    if (!supabase) return false;
    try {
      const payload = {
        sport: standing.sport.toLowerCase(),
        competition_id: standing.competition_id,
        team_id: standing.team_id,
        season: standing.season || new Date().getFullYear().toString(),
        rank: standing.rank || null,
        played: standing.played || 0,
        won: standing.won || 0,
        lost: standing.lost || 0,
        drawn: standing.drawn || 0,
        points: standing.points || 0,
        for_score: standing.for_score || 0,
        against_score: standing.against_score || 0,
        extra_stats: standing.extra_stats || {},
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("team_sports_standings")
        .upsert(payload, { onConflict: "sport,competition_id,team_id,season" });

      if (error) {
        console.warn("[TeamSportsService] Standing upsert error:", error.message);
        return false;
      }

      return true;
    } catch (e: any) {
      console.error("[TeamSportsService] Standing upsert exception:", e);
      return false;
    }
  }

  /**
   * Log sync action in sports_sync_logs
   */
  static async logSync(
    sport: string,
    action: string,
    status: "SUCCESS" | "FAILED",
    recordsProcessed = 0,
    errorMessage?: string
  ) {
    if (!supabase) return;
    try {
      await supabase.from("sports_sync_logs").insert({
        sport: sport.toLowerCase(),
        action,
        status,
        records_processed: recordsProcessed,
        error_message: errorMessage || null,
      });

      // Update sports_sync_config last_synced_at
      await supabase
        .from("sports_sync_config")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("sport", sport.toLowerCase());
    } catch (err: any) {
      console.warn("[TeamSportsService] Log sync failed:", err?.message || err);
    }
  }
}
