import { createClient } from "npm:@supabase/supabase-js@2";

type FixtureStatus =
  | "SCHEDULED"
  | "TIMED"
  | "IN_PLAY"
  | "PAUSED"
  | "FINISHED"
  | "POSTPONED"
  | "SUSPENDED"
  | "CANCELLED"
  | "AWARDED";

type Team = {
  externalId: number;
  name: string;
  shortName: string;
  tla: string;
  crestUrl: string | null;
};

type Fixture = {
  externalId: number;
  utcKickoff: string;
  status: FixtureStatus;
  homeScore: number | null;
  awayScore: number | null;
  winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;
  home: Team;
  away: Team;
  minute: number | null;
  isLive: boolean;
};

type Scoreboard = {
  competition: { externalId: number; name: string; emblemUrl: string | null } | null;
  fixtures: Fixture[];
};

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer";
const ESPN_TIMEOUT_MS = 7_500;
const DEFAULT_CODES = ["PL", "PD", "BL1", "SA", "FL1", "CL", "KSA1"];
const ESPN_SLUGS: Record<string, string> = {
  PL: "eng.1",
  PD: "esp.1",
  BL1: "ger.1",
  SA: "ita.1",
  FL1: "fra.1",
  CL: "uefa.champions",
  KSA1: "ksa.1",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function safeNum(value: unknown): number | null {
  const parsed = typeof value === "string" ? Number.parseFloat(value) : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseMinute(displayClock: unknown): number | null {
  if (typeof displayClock !== "string") return null;
  const match = displayClock.match(/(\d+)/);
  return match ? Number.parseInt(match[1], 10) : null;
}

function mapStatus(type: any): { status: FixtureStatus; isLive: boolean } {
  const state = String(type?.state ?? "pre");
  const name = String(type?.name ?? "").toUpperCase();
  if (state === "in") {
    return { status: name.includes("HALFTIME") ? "PAUSED" : "IN_PLAY", isLive: true };
  }
  if (state === "post") {
    if (name.includes("POSTPONE")) return { status: "POSTPONED", isLive: false };
    if (name.includes("CANCEL")) return { status: "CANCELLED", isLive: false };
    if (name.includes("SUSPEND") || name.includes("ABANDON")) return { status: "SUSPENDED", isLive: false };
    return { status: "FINISHED", isLive: false };
  }
  return { status: "SCHEDULED", isLive: false };
}

async function fetchJson(url: string): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ESPN_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: "application/json",
        "user-agent": "curl/8.0",
      },
    });
    if (!response.ok) throw new Error(`ESPN HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchScoreboard(code: string): Promise<Scoreboard> {
  const slug = ESPN_SLUGS[code];
  if (!slug) throw new Error(`Unsupported active ESPN code: ${code}`);

  const payload = await fetchJson(`${ESPN_BASE}/${slug}/scoreboard`);
  const league = payload?.leagues?.[0];
  const competition = league
    ? {
        externalId: Number.parseInt(String(league.id), 10),
        name: league.name || league.abbreviation || code,
        emblemUrl: league.logos?.[0]?.href || null,
      }
    : null;

  const fixtures: Fixture[] = [];
  for (const event of Array.isArray(payload?.events) ? payload.events : []) {
    try {
      const competitionRow = event?.competitions?.[0];
      const competitors = Array.isArray(competitionRow?.competitors)
        ? competitionRow.competitors
        : [];
      const home = competitors.find((item: any) => item?.homeAway === "home");
      const away = competitors.find((item: any) => item?.homeAway === "away");
      if (!competitionRow || !home || !away) continue;

      const statusInfo = mapStatus(competitionRow.status?.type || event.status?.type);
      const toTeam = (competitor: any): Team => ({
        externalId: Number.parseInt(String(competitor.team?.id), 10),
        name: competitor.team?.displayName || competitor.team?.name || "Unknown",
        shortName: competitor.team?.shortDisplayName || competitor.team?.name || "Unknown",
        tla: String(competitor.team?.abbreviation || "UNK").slice(0, 4).toUpperCase(),
        crestUrl: competitor.team?.logo || null,
      });

      let winner: Fixture["winner"] = null;
      if (statusInfo.status === "FINISHED" || statusInfo.status === "AWARDED") {
        winner = home.winner === true ? "HOME_TEAM" : away.winner === true ? "AWAY_TEAM" : "DRAW";
      }

      fixtures.push({
        externalId: Number.parseInt(String(event.id), 10),
        utcKickoff: competitionRow.date || event.date,
        status: statusInfo.status,
        homeScore: safeNum(home.score),
        awayScore: safeNum(away.score),
        winner,
        home: toTeam(home),
        away: toTeam(away),
        minute: statusInfo.isLive ? parseMinute(competitionRow.status?.displayClock) : null,
        isLive: statusInfo.isLive,
      });
    } catch {
      // Ignore malformed provider events while preserving the rest of the batch.
    }
  }

  return { competition, fixtures };
}

function getSecretKey(): string {
  const secretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (secretKeys) {
    try {
      const parsed = JSON.parse(secretKeys);
      const first = Object.values(parsed).find((value) => typeof value === "string");
      if (typeof first === "string" && first.length > 0) return first;
    } catch {
      // Fall through to legacy secret variable.
    }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
}

function getCodes(configRows: any[] | null | undefined): string[] {
  const configured = configRows?.find((row) => row.key === "espn_active_codes")?.value;
  const codes = String(configured || DEFAULT_CODES)
    .split(",")
    .map((code) => code.trim().toUpperCase())
    .filter((code) => Boolean(ESPN_SLUGS[code]));
  return codes.length > 0 ? [...new Set(codes)] : DEFAULT_CODES;
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json({ ok: false, error: "POST required" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = getSecretKey();
  if (!supabaseUrl || !serviceKey) return json({ ok: false, error: "Supabase service configuration is unavailable" }, 500);

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const presentedToken = request.headers.get("x-football-sync-token") || "";
  const { data: validToken, error: tokenError } = await admin.rpc("verify_football_live_sync_token", {
    p_token: presentedToken,
  });
  if (tokenError || validToken !== true) return json({ ok: false, error: "Unauthorized" }, 401);

  const { data: claimed, error: claimError } = await admin.rpc("claim_football_live_sync", {
    p_lease_seconds: 40,
  });
  if (claimError) return json({ ok: false, error: `Unable to claim sync lease: ${claimError.message}` }, 500);
  if (claimed !== true) return json({ ok: true, skipped: true, reason: "another sync is still running" }, 202);

  const startedAt = Date.now();
  let processed = 0;
  try {
    const { data: configRows, error: configError } = await admin
      .from("football_sync_config")
      .select("key,value")
      .in("key", ["espn_active_codes"])
      .limit(10);
    if (configError) throw new Error(`sync config read failed: ${configError.message}`);

    const codes = getCodes(configRows);
    const results = await Promise.allSettled(codes.map((code) => fetchScoreboard(code)));
    const successful = results.flatMap((result, index) =>
      result.status === "fulfilled" ? [{ code: codes[index], scoreboard: result.value }] : [],
    );
    const failures = results
      .map((result, index) => (result.status === "rejected" ? `${codes[index]}: ${String(result.reason?.message || result.reason)}` : null))
      .filter((message): message is string => Boolean(message));

    for (const { code, scoreboard } of successful) {
      if (!scoreboard.competition) continue;

      const { data: competitionRow, error: competitionError } = await admin
        .from("football_competitions")
        .upsert(
          {
            external_id: scoreboard.competition.externalId,
            provider: "espn",
            code,
            name: scoreboard.competition.name,
            emblem_url: scoreboard.competition.emblemUrl,
            is_active: true,
            last_synced_at: new Date().toISOString(),
          },
          { onConflict: "provider,external_id" },
        )
        .select("id")
        .single();
      if (competitionError || !competitionRow) throw new Error(`competition upsert failed: ${competitionError?.message || "missing id"}`);

      const liveOrRecent = scoreboard.fixtures.filter((fixture) =>
        fixture.isLive || ["FINISHED", "POSTPONED", "SUSPENDED", "CANCELLED", "AWARDED"].includes(fixture.status),
      );
      if (liveOrRecent.length === 0) continue;

      const teams = [...liveOrRecent.flatMap((fixture) => [fixture.home, fixture.away])].filter(
        (team, index, all) => all.findIndex((other) => other.externalId === team.externalId) === index,
      );
      const { error: teamError } = await admin.from("football_teams").upsert(
        teams.map((team) => ({
          external_id: team.externalId,
          provider: "espn",
          name: team.name,
          short_name: team.shortName,
          tla: team.tla,
          crest_url: team.crestUrl,
          last_synced_at: new Date().toISOString(),
        })),
        { onConflict: "provider,external_id" },
      );
      if (teamError) throw new Error(`team upsert failed: ${teamError.message}`);

      const externalIds = teams.map((team) => team.externalId);
      const { data: teamRows, error: teamReadError } = await admin
        .from("football_teams")
        .select("id,external_id")
        .eq("provider", "espn")
        .in("external_id", externalIds)
        .limit(500);
      if (teamReadError) throw new Error(`team id lookup failed: ${teamReadError.message}`);
      const teamIds = new Map((teamRows || []).map((row: any) => [Number(row.external_id), row.id]));

      const fixtureRows = liveOrRecent
        .map((fixture) => ({
          external_id: fixture.externalId,
          provider: "espn",
          competition_id: competitionRow.id,
          home_team_id: teamIds.get(fixture.home.externalId),
          away_team_id: teamIds.get(fixture.away.externalId),
          utc_kickoff: fixture.utcKickoff,
          status: fixture.status,
          home_score: fixture.homeScore,
          away_score: fixture.awayScore,
          winner: fixture.winner,
          current_minute: fixture.minute,
          live_source: fixture.isLive ? "espn" : null,
          last_live_update_at: fixture.isLive ? new Date().toISOString() : null,
          last_synced_at: new Date().toISOString(),
        }))
        .filter((row) => row.home_team_id && row.away_team_id);

      if (fixtureRows.length === 0) continue;
      const { error: fixtureError } = await admin
        .from("football_fixtures")
        .upsert(fixtureRows, { onConflict: "provider,external_id" });
      if (fixtureError) throw new Error(`fixture upsert failed: ${fixtureError.message}`);
      processed += fixtureRows.length;
    }

    const status = successful.length === 0 && failures.length > 0 ? "failed" : "success";
    const errorText = failures.length > 0 ? failures.join("; ") : null;
    await admin.rpc("finish_football_live_sync", {
      p_status: status,
      p_records_processed: processed,
      p_error: errorText,
    });
    await admin.from("football_sync_logs").insert({
      sync_type: "live",
      status,
      records_processed: processed,
      error_message: errorText,
      started_at: new Date(startedAt).toISOString(),
      finished_at: new Date().toISOString(),
    });

    return json({
      ok: status === "success",
      status,
      competitions: successful.length,
      recordsProcessed: processed,
      providerFailures: failures,
      durationMs: Date.now() - startedAt,
    }, status === "success" ? 200 : 502);
  } catch (error) {
    const message = String(error instanceof Error ? error.message : error);
    await admin.rpc("finish_football_live_sync", {
      p_status: "failed",
      p_records_processed: processed,
      p_error: message,
    });
    await admin.from("football_sync_logs").insert({
      sync_type: "live",
      status: "failed",
      records_processed: processed,
      error_message: message,
      started_at: new Date(startedAt).toISOString(),
      finished_at: new Date().toISOString(),
    });
    return json({ ok: false, error: message, recordsProcessed: processed, durationMs: Date.now() - startedAt }, 500);
  }
});
