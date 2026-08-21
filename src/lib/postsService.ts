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

  const authorName =
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
    profile.username ||
    "Anonymous Tipster";
  const authorAvatar = profile.avatar_url || null;

  const homeName = snapshot?.home_team_name || "Home Team";
  const awayName = snapshot?.away_team_name || "Away Team";
  const predictionTip = snapshot?.match_name || parsedContent.predictionTip || "Ushindi (FT)";
  const odds = parsedContent.odds || {
    home: Number(snapshot?.odds_home) || 1.8,
    draw: Number(snapshot?.odds_draw) || 3.2,
    away: Number(snapshot?.odds_away) || 2.5,
  };

  return {
    id: post.id,
    sport: snapshot?.sport || "football",
    category: "Football",
    league: snapshot?.competition_name || "VIP Pro League",
    time: "Hivi sasa (LIVE)",
    status: (snapshot?.match_status_at_posting as any) || "LIVE",
    liveMinutes: "1'",
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
    tipster: {
      name: authorName,
      avatarLetter: authorName.charAt(0).toUpperCase(),
      avatarUrl: authorAvatar,
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
    creatorDeposit?: number;
    creatorMinBetterBalance?: number;
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
          odds_home: params.match.oddsHome || 1.8,
          odds_draw: params.match.oddsDraw || 3.2,
          odds_away: params.match.oddsAway || 2.5,
        },
      }),
    });
    const data = await res.json();
    if (data.success && data.post) {
      const fullPost = {
        ...data.post,
        match_snapshots: data.snapshot ? [data.snapshot] : [],
      };
      return dbPostToMatchTip(fullPost);
    }
    return null;
  } catch (err) {
    console.error("Error creating database post:", err);
    return null;
  }
}
