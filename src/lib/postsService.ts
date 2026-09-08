import { MatchTip } from "../types";
import { getTeamLogoUrl } from "./teamLogos";

export function dbPostToMatchTip(post: any): MatchTip {
  const snapshot =
    Array.isArray(post.match_snapshots) && post.match_snapshots.length > 0
      ? post.match_snapshots[0]
      : null;
  const profile = post.profiles || {};

  let parsedContent: any = {};
  if (post.content && typeof post.content === "string") {
    try {
      if (post.content.trim().startsWith("{")) {
        parsedContent = JSON.parse(post.content);
      } else {
        parsedContent = { text: post.content };
      }
    } catch {
      parsedContent = { text: post.content };
    }
  }

  const authorUsername =
    profile.username ||
    (post.profiles && post.profiles.username) ||
    "";
  const authorName =
    authorUsername ||
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
    "Anonymous Tipster";
  const authorAvatar = profile.avatar_url || null;

  const homeName = snapshot?.home_team_name || "Home Team";
  const awayName = snapshot?.away_team_name || "Away Team";
  const predictionTip = snapshot?.match_name || parsedContent.predictionTip || "Ushindi (FT)";
  const storedOdds = parsedContent.odds || snapshot || {};
  const readOdd = (value: unknown, fallback: number) => {
    const odd = Number(value);
    return Number.isFinite(odd) && odd > 0 ? odd : fallback;
  };
  // Post Card odds are read from the creator's saved content/snapshot, never
  // from the current Card Bet feed. They are immutable after publication.
  const odds = {
    home: readOdd(storedOdds.home ?? storedOdds.odds_home, 1.8),
    draw: readOdd(storedOdds.draw ?? storedOdds.odds_draw, 3.2),
    away: readOdd(storedOdds.away ?? storedOdds.odds_away, 2.5),
  };

  const kickoffUtc = snapshot?.scheduled_start_time_utc || snapshot?.kickoff_timestamp || null;
  const postingStatus = String(snapshot?.match_status_at_posting || "UPCOMING").toUpperCase();
  const finalStatus = String(snapshot?.final_status || "").toUpperCase();
  const kickoffMs = kickoffUtc ? Date.parse(kickoffUtc) : Number.NaN;
  const nowMs = Date.now();
  const hasEnded =
    ["FINISHED", "ENDED", "CANCELLED", "POSTPONED", "SUSPENDED", "AWARDED"].includes(finalStatus) ||
    (Number.isFinite(kickoffMs) && nowMs >= kickoffMs + 3 * 60 * 60 * 1000);
  const status: MatchTip["status"] = hasEnded
    ? "ENDED"
    : (Number.isFinite(kickoffMs) && nowMs >= kickoffMs) || ["LIVE", "IN_PLAY", "PAUSED"].includes(postingStatus)
      ? "LIVE"
      : "UPCOMING";
  const time = hasEnded
    ? "Iliisha"
    : status === "LIVE"
      ? "Hivi sasa (LIVE)"
      : kickoffUtc
        ? new Date(kickoffUtc).toLocaleString()
        : "Inakuja";

  return {
    id: post.id,
    cardBetId: post.card_bet_id || snapshot?.card_bet_id || snapshot?.external_match_id || undefined,
    sport: snapshot?.sport || "football",
    category: "Football",
    league: snapshot?.competition_name || "VIP Pro League",
    time,
    kickoffUtc,
    status,
    liveMinutes: status === "LIVE" ? "LIVE" : undefined,
    espnEventId: snapshot?.external_match_id || undefined,
    espnLeagueCode: snapshot?.match_group || null,
    confidence: 98,
    homeTeam: {
      name: homeName,
      logoUrl: snapshot?.home_team_logo || getTeamLogoUrl(homeName),
      bgGlow: "from-blue-600/30 to-indigo-600/20",
    },
    awayTeam: {
      name: awayName,
      logoUrl: snapshot?.away_team_logo || getTeamLogoUrl(awayName),
      bgGlow: "from-red-600/30 to-rose-600/20",
    },
    odds: odds,
    payoutBadge: parsedContent.creatorDeposit
      ? `FBU ${Number(parsedContent.creatorDeposit * 1.5).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
      : "FBU 50,000",
    isPremium: true,
    isLocked: false,
    isUserCreated: true,
    isPostCard: true,
    oddsFixed: true,
    oddsAvailable: true,
    tipster: {
      name: authorUsername || authorName,
      username: authorUsername || authorName,
      avatarLetter: (authorUsername || authorName).charAt(0).toUpperCase(),
      avatarUrl: authorAvatar,
      userId: post.author_id || profile.id,
      badge: profile.is_pro ? "VIP PRO" : "TIPSTER",
      isOfficial: profile.is_verified || false,
    },
    predictionTip: predictionTip,
    analysisText: typeof parsedContent.text === "string" ? parsedContent.text : post.content || "",
  };
}

export async function fetchAllDatabasePosts(): Promise<MatchTip[]> {
  try {
    const res = await fetch("/api/supabase/posts");
    if (!res.ok) return [];
    const rows = await res.json();
    if (!Array.isArray(rows)) return [];
    return rows.map(dbPostToMatchTip);
  } catch (err) {
    console.warn("Could not fetch database posts (offline or server starting):", err);
    return [];
  }
}

export async function fetchUserDatabasePosts(authorId: string): Promise<MatchTip[]> {
  if (!authorId) return [];
  try {
    const res = await fetch(`/api/supabase/posts?author_id=${encodeURIComponent(authorId)}`);
    if (!res.ok) return [];
    const rows = await res.json();
    if (!Array.isArray(rows)) return [];
    return rows.map(dbPostToMatchTip);
  } catch (err) {
    console.warn("Could not fetch user database posts (offline or server starting):", err);
    return [];
  }
}

export async function createDatabasePost(params: {
  profileId: string;
  content: string | object;
  postType?: string;
  match: {
    sport?: string;
    league?: string;
    homeTeamName?: string;
    awayTeamName?: string;
    predictionTip?: string;
    oddsHome?: number;
    oddsDraw?: number;
    oddsAway?: number;
    cardBetId?: string;
    creatorDeposit?: number;
    creatorMinBetterBalance?: number;
    externalMatchId?: string;
    provider?: string;
    competitionCode?: string | null;
    homeTeamLogo?: string | null;
    awayTeamLogo?: string | null;
    competitionLogo?: string | null;
    kickoffUtc?: string | null;
    matchStatus?: string;
  };
}): Promise<MatchTip | null> {
  try {
    const bodyContent =
      typeof params.content === "object" ? JSON.stringify(params.content) : params.content;
    const res = await fetch("/api/supabase/create-post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile_id: params.profileId,
        content: bodyContent,
        post_type: params.postType || "match_prediction",
        match: {
          sport: params.match.sport || "football",
          league: params.match.league || "VIP Pro League",
          home_team_name: params.match.homeTeamName || "Home Team",
          away_team_name: params.match.awayTeamName || "Away Team",
          prediction_tip: params.match.predictionTip || "Ushindi (FT)",
          odds_home: params.match.oddsHome ?? 1.8,
          odds_draw: params.match.oddsDraw ?? 3.2,
          odds_away: params.match.oddsAway ?? 2.5,
          card_bet_id: params.match.cardBetId || params.match.externalMatchId,
          external_match_id: params.match.externalMatchId,
          provider: params.match.provider || "ESPN",
          competition_code: params.match.competitionCode || null,
          home_team_logo: params.match.homeTeamLogo || null,
          away_team_logo: params.match.awayTeamLogo || null,
          competition_logo: params.match.competitionLogo || null,
          kickoff_utc: params.match.kickoffUtc || null,
          match_status: params.match.matchStatus || "UPCOMING",
        },
      }),
    });
    const data = await res.json();
    const expectedCardBetId = params.match.cardBetId || params.match.externalMatchId;
    const persistedCardBetId = data.snapshot?.card_bet_id || data.post?.card_bet_id;
    if (
      res.ok &&
      data.success === true &&
      data.persisted === true &&
      data.post?.id &&
      data.snapshot?.id &&
      expectedCardBetId &&
      persistedCardBetId === expectedCardBetId
    ) {
      const fullPost = {
        ...data.post,
        match_snapshots: data.snapshot ? [data.snapshot] : [],
      };
      return dbPostToMatchTip(fullPost);
    }
    console.error("[createDatabasePost] Persistence acknowledgement failed:", res.status, data);
    return null;
  } catch (err) {
    console.error("Error creating database post:", err);
    return null;
  }
}
