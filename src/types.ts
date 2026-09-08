/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Team {
  name: string;
  logoUrl?: string;
  bgGlow: string;
}

export interface MatchTip {
  id: string;
  sport: string;
  category: string;
  league: string;
  gender?: string; // Optional field: "Man" | "Woman"
  time: string;
  /** Original fixture kickoff used to close a stale Card Bet after match expiry. */
  kickoffUtc?: string | null;
  status: "LIVE" | "UPCOMING" | "ENDED";
  liveMinutes?: string;
  liveScore?: string;
  homeScore?: number | null;
  awayScore?: number | null;
  liveClock?: string | null;
  espnEventId?: string | number;
  espnLeagueCode?: string | null;
  espnEvents?: {
    home: { yellowCards: number; redCards: number; scorers: { name: string; minute?: string; assist?: string | null }[] };
    away: { yellowCards: number; redCards: number; scorers: { name: string; minute?: string; assist?: string | null }[] };
  } | null;
  score?: {
    home: number;
    away: number;
  };
  confidence: number;
  homeTeam: Team;
  awayTeam: Team;
  odds: {
    home: number;
    draw: number;
    away: number;
  };
  /** True only when all displayed odds came from a trusted match-data response. */
  oddsAvailable?: boolean;
  payoutBadge?: string;
  isPremium: boolean;
  isLocked: boolean;
  isUserCreated?: boolean;
  tipster: {
    name: string;
    avatarLetter: string;
    badge?: string;
    isOfficial: boolean;
    avatarUrl?: string | null;
    /** Stable profiles.id used to associate a Post Card with its author. */
    userId?: string;
  };
  predictionTip?: string;
  analysisText?: string;
  commentsCount?: number;
}

export interface UserProfile {
  id?: string;
  profile_id?: string;
  authUserId?: string;
  username: string;
  email?: string;
  phone?: string;
  isLoggedIn?: boolean;
  avatarUrl?: string | null;
  avatar_url?: string | null;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  first_name?: string | null;
  last_name?: string | null;
  is_pro?: boolean;
  is_verified?: boolean;
  role?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Tipster {
  name: string;
  avatarLetter: string;
  winRate: number;
  totalTips: number;
  followers: string;
  isOfficial: boolean;
}

export interface Transaction {
  id: string;
  type: "DEPOSIT" | "WITHDRAW" | "BET_PLACE" | "BET_WIN" | "UPGRADE_PRO";
  amount: number;
  status: "SUCCESS" | "PENDING" | "FAILED";
  date: string;
  description: string;
}

export interface CartItem {
  match: MatchTip;
  oddType: "home" | "draw" | "away";
  oddValue: number;
}
