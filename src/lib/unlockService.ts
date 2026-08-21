/**
 * TakeTalon — Unlock Service (v2)
 * Tumia unlock_contracts table na RPC functions pekee — hakuna direct UPDATE za balance.
 */

import { supabase, isSupabaseConfigured } from "./supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export type UnlockStatus = "pending" | "active" | "cancelled" | "rejected" | "expired";

export interface UnlockRecord {
  id: string;
  unlocker_id: string; // profiles.id ya X (analipa)
  unlocked_id: string; // profiles.id ya Y (anapokea)
  status: UnlockStatus;
  created_at: string;
  accepted_at: string | null;
  cancelled_at: string | null;
}

export interface PublicProfile {
  profile_id: string; // profiles.id (primary key) — tumia kwa RPC na unlock matching
  id: string; // auth_user_id — tumia kwa auth context
  username: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  is_pro: boolean;
  is_verified: boolean;
  role: string;
}

export interface BusinessRules {
  monthly_cost_fbu: number; // 500
  tipster_share_fbu: number; // 450
  commission_fbu: number; // 50
}

// ─── Shared row → PublicProfile mapper ───────────────────────────────────────

function rowToProfile(row: any): PublicProfile {
  return {
    profile_id: row.id,
    id: row.auth_user_id,
    username: row.username || "",
    first_name: row.first_name || "",
    last_name: row.last_name || "",
    avatar_url: row.avatar_url || null,
    is_pro: row.is_pro || false,
    is_verified: row.is_verified || false,
    role: row.role || "USER",
  };
}

// ─── Fetch tipsters — Algorithm: PRO → Verified → wengine ────────────────────
//
// Sorting logic (server-side + client-side final pass):
//   1. is_pro = true  → juu kabisa
//   2. is_verified = true (na si pro) → katikati
//   3. wengine → chini, sorted by created_at DESC (mapya zaidi juu)
// Analeta hadi profiles 200 (isipokuwa yeye mwenyewe).
//
// NOTE: Inatumia server endpoint (/api/supabase/tipsters) ili ipite RLS.
// Supabase JS client (anon key) haiwezi kusoma profiles za wengine kwa sababu
// ya RLS policy — server endpoint inatumia service_role key ambayo inapita RLS.

export async function fetchPublicTipsters(currentAuthId: string | null): Promise<PublicProfile[]> {
  // ── Tumia server endpoint kwanza (service_role → inapita RLS) ──
  try {
    const params = currentAuthId ? `?exclude=${encodeURIComponent(currentAuthId)}` : "";
    const res = await fetch(`/api/supabase/tipsters${params}`);
    if (res.ok) {
      const rows = (await res.json()) as any[];
      if (!Array.isArray(rows)) return [];

      // Client-side final sort (kuwa sure)
      rows.sort((a, b) => {
        if (a.is_pro !== b.is_pro) return a.is_pro ? -1 : 1;
        if (a.is_verified !== b.is_verified) return a.is_verified ? -1 : 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      return rows.map(rowToProfile);
    }
  } catch (e: any) {
    console.warn("[unlockService] fetchPublicTipsters server failed, falling back:", e.message);
  }

  // ── Fallback: Supabase JS client (inaweza kufeli kwa RLS kama policy haijawekwa) ──
  if (!isSupabaseConfigured) return [];

  // Supabase REST haisupport ORDER BY expression — tunatumia multiple .order() calls
  // is_pro DESC, is_verified DESC ndio algorithm yetu.
  let q = supabase
    .from("profiles")
    .select(
      "id, auth_user_id, username, first_name, last_name, avatar_url, is_pro, is_verified, role, created_at",
    )
    .order("is_pro", { ascending: false })
    .order("is_verified", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);

  if (currentAuthId) {
    q = q.neq("auth_user_id", currentAuthId);
  }

  const { data, error } = await q;
  if (error) {
    console.warn("[unlockService] fetchPublicTipsters fallback error:", error.message);
    return [];
  }

  // Client-side final sort kuwa sure (Supabase boolean ordering inaweza kutofautiana kwa DB version)
  const rows = (data || []) as any[];
  rows.sort((a, b) => {
    // PRO kwanza
    if (a.is_pro !== b.is_pro) return a.is_pro ? -1 : 1;
    // Kisha verified
    if (a.is_verified !== b.is_verified) return a.is_verified ? -1 : 1;
    // Kisha mapya zaidi
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return rows.map(rowToProfile);
}

// ─── Search profiles kwa username / jina (server-side ilike) ─────────────────
//
// Inashughulikia:
//   • "john"      → username john123, first_name John, last_name Johnson
//   • "doe"       → last_name Doe, username johndoe
//   • "john doe"  → splits → inatafuta "john" NA "doe" kwenye fields zote
//   • Haifanyi case-sensitive (ilike)

export async function searchProfiles(
  rawQuery: string,
  currentAuthId: string | null,
): Promise<PublicProfile[]> {
  // Sanitize
  const q = rawQuery
    .trim()
    .replace(/^@+/, "")
    .replace(/[,()\\'"%]/g, "")
    .trim();
  if (!q || q.length < 2) return [];

  const words = q.split(/\s+/).filter(Boolean);

  // ── Tumia server-side API (service_role → inapita RLS) ──
  try {
    const res = await fetch(`/api/supabase/search-profiles?q=${encodeURIComponent(q)}`);
    if (res.ok) {
      const serverRows = (await res.json()) as any[];

      // Client-side filter kwa maneno zaidi ya moja
      let rows = serverRows;
      if (words.length > 1) {
        const lowerWords = words.map((w) => w.toLowerCase());
        rows = serverRows.filter((row: any) => {
          const haystack = [
            row.username || "",
            row.first_name || "",
            row.last_name || "",
            `${row.first_name || ""} ${row.last_name || ""}`,
          ]
            .join(" ")
            .toLowerCase();
          return lowerWords.every((w) => haystack.includes(w));
        });
      }

      if (currentAuthId) {
        rows = rows.filter((row: any) => row.auth_user_id !== currentAuthId);
      }

      rows.sort((a: any, b: any) => {
        if (a.is_pro !== b.is_pro) return a.is_pro ? -1 : 1;
        if (a.is_verified !== b.is_verified) return a.is_verified ? -1 : 1;
        return 0;
      });

      return rows.map(rowToProfile);
    }
  } catch (e: any) {
    console.warn(
      "[unlockService] server searchProfiles failed, falling back to Supabase:",
      e.message,
    );
  }

  // ── Fallback: Supabase JS client direk (requires authenticated session) ──
  if (!isSupabaseConfigured) return [];

  const primaryWord = words[0];
  const orFilter = `username.ilike.%${primaryWord}%,first_name.ilike.%${primaryWord}%,last_name.ilike.%${primaryWord}%`;

  let qb = supabase
    .from("profiles")
    .select(
      "id, auth_user_id, username, first_name, last_name, avatar_url, is_pro, is_verified, role, created_at",
    )
    .or(orFilter)
    .order("is_pro", { ascending: false })
    .order("is_verified", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(60);

  if (currentAuthId) {
    qb = qb.neq("auth_user_id", currentAuthId);
  }

  const { data, error } = await qb;
  if (error) {
    console.warn("[unlockService] searchProfiles error:", error.message);
    return [];
  }

  let rows = (data || []) as any[];

  // Client-side filter kwa maneno zaidi ya moja (e.g. "jean pierre")
  // Kila neno lazima lipatikane kwenye jina kamili au username
  if (words.length > 1) {
    const lowerWords = words.map((w) => w.toLowerCase());
    const filtered = rows.filter((row) => {
      const haystack = [
        row.username || "",
        row.first_name || "",
        row.last_name || "",
        `${row.first_name || ""} ${row.last_name || ""}`,
      ]
        .join(" ")
        .toLowerCase();
      return lowerWords.every((w) => haystack.includes(w));
    });
    // Kama hakuna exact matches, rudisha partial results (lenient)
    rows = filtered.length > 0 ? filtered : rows;
  }

  return rows.map(rowToProfile);
}

// ─── Load all contracts for current user ──────────────────────────────────────

export async function loadMyUnlocks(profileId: string): Promise<UnlockRecord[]> {
  if (!profileId) return [];

  // Try server endpoint first (bypasses RLS issues)
  try {
    const res = await fetch(`/api/supabase/user-contracts?profile_id=${encodeURIComponent(profileId)}`);
    if (res.ok) {
      const json = await res.json();
      if (json.ok && Array.isArray(json.contracts)) {
        return json.contracts;
      }
    }
  } catch (err) {
    console.warn("[unlockService] server user-contracts fetch warning:", err);
  }

  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from("unlock_contracts")
    .select("id, unlocker_id, unlocked_id, status, created_at, updated_at")
    .or(`unlocker_id.eq.${profileId},unlocked_id.eq.${profileId}`);

  if (error) {
    console.warn("[unlockService] loadMyUnlocks error:", error.message);
    return [];
  }
  return (data || []) as unknown as UnlockRecord[];
}

// ─── Request unlock (X → Y) via RPC ──────────────────────────────────────────

export async function requestUnlock(
  unlockedProfileId: string, // Y's profiles.id
  customUnlockerProfileId?: string | null // Optional X's profiles.id
): Promise<{ ok: boolean; error?: string; record?: UnlockRecord; new_balance?: number }> {
  if (!isSupabaseConfigured) return { ok: false, error: "offline" };

  if (!customUnlockerProfileId) {
    return { ok: false, error: "profile_id_required" };
  }

  if (customUnlockerProfileId === unlockedProfileId) {
    return { ok: false, error: "cannot_unlock_self" };
  }

  // ALL unlocks MUST go through server API route /api/supabase/request-unlock
  // which verifies DB wallet balance (min 500 FBU) and atomically deducts payment
  try {
    const res = await fetch("/api/supabase/request-unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        unlocker_id: customUnlockerProfileId,
        unlocked_id: unlockedProfileId,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      return { ok: true, record: data.record || data, new_balance: data.new_unlocker_balance };
    }
    return { ok: false, error: data?.error || "insufficient_balance" };
  } catch (e: any) {
    console.error("[unlockService] API request-unlock error:", e);
    return { ok: false, error: e?.message || "server_error" };
  }
}

// ─── Cancel unlock (X cancels) via RPC ───────────────────────────────────────

export async function cancelUnlock(contractId: string): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured) return { ok: false, error: "offline" };

  const { data, error } = await supabase.rpc("cancel_unlock", {
    p_contract_id: contractId,
  });

  if (error) return { ok: false, error: error.message };
  const result = data as any;
  if (result?.ok === false) return { ok: false, error: result.error };
  return { ok: true };
}

// ─── Accept unlock (Y accepts) via RPC ───────────────────────────────────────

export async function acceptUnlock(contractId: string): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured) return { ok: false, error: "offline" };

  const { data, error } = await supabase.rpc("accept_unlock", {
    p_contract_id: contractId,
  });

  if (error) return { ok: false, error: error.message };
  const result = data as any;
  if (result?.ok === false) return { ok: false, error: result.error };
  return { ok: true };
}

// ─── Reject unlock (Y rejects) via RPC ───────────────────────────────────────

export async function rejectUnlock(contractId: string): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured) return { ok: false, error: "offline" };

  const { data, error } = await supabase.rpc("reject_unlock", {
    p_contract_id: contractId,
  });

  if (error) return { ok: false, error: error.message };
  const result = data as any;
  if (result?.ok === false) return { ok: false, error: result.error };
  return { ok: true };
}

// ─── Fetch business rules from DB ────────────────────────────────────────────
// business_rules table ni key-value: { key: string, value: number }
// Keys: unlock_price_x_month, unlock_price_y_month, commission_month

const DEFAULT_RULES: BusinessRules = {
  monthly_cost_fbu: 500,
  tipster_share_fbu: 450,
  commission_fbu: 50,
};

export async function fetchBusinessRules(): Promise<BusinessRules> {
  if (!isSupabaseConfigured) return DEFAULT_RULES;

  const { data, error } = await supabase.from("business_rules").select("key, value");

  if (error || !data || data.length === 0) {
    console.warn("[unlockService] fetchBusinessRules error:", error?.message ?? "no rows");
    return DEFAULT_RULES;
  }

  // Jenga map: { key → value }
  const map: Record<string, number> = {};
  for (const row of data as any[]) {
    map[row.key] = Number(row.value);
  }

  return {
    monthly_cost_fbu: map["unlock_price_x_month"] ?? DEFAULT_RULES.monthly_cost_fbu,
    tipster_share_fbu: map["unlock_price_y_month"] ?? DEFAULT_RULES.tipster_share_fbu,
    commission_fbu: map["commission_month"] ?? DEFAULT_RULES.commission_fbu,
  };
}

// ─── Fetch unlock stats za profile fulani (kwa profile page) ─────────────────

export interface ProfileUnlockStats {
  unlockersCount: number; // watu waliomfungua (unlocked_id = profile_id, active)
  unlockingCount: number; // watu aliowapoena (unlocker_id = profile_id, active)
}

export async function fetchProfileUnlockStats(profileId: string): Promise<ProfileUnlockStats> {
  if (!isSupabaseConfigured) return { unlockersCount: 0, unlockingCount: 0 };

  const [incoming, outgoing] = await Promise.all([
    supabase
      .from("unlock_contracts")
      .select("id", { count: "exact", head: true })
      .eq("unlocked_id", profileId)
      .in("status", ["active", "pending"]),
    supabase
      .from("unlock_contracts")
      .select("id", { count: "exact", head: true })
      .eq("unlocker_id", profileId)
      .in("status", ["active", "pending"]),
  ]);

  return {
    unlockersCount: incoming.count ?? 0,
    unlockingCount: outgoing.count ?? 0,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * IDs (profiles.id) ambazo mimi (current user Y) ninaweza kuona posts zao.
 * Sheria: Y anaona posts za X wakati contract X→Y iko active
 * (X = unlocker_id, Y = unlocked_id, status = active).
 */
export function getCanSeePostsFromIds(records: UnlockRecord[], myProfileId: string): string[] {
  return records
    .filter((r) => r.unlocked_id === myProfileId && r.status === "active")
    .map((r) => r.unlocker_id);
}

/**
 * Backward-compat alias — pia inafanya kazi kwa mutual visibility check.
 * Inarudisha profile IDs ambazo sisi wote tumefungua milango (X→Y active AND Y→X active).
 */
export function getMutuallyUnlockedIds(records: UnlockRecord[], myProfileId: string): string[] {
  const iCanSeeFrom = new Set(getCanSeePostsFromIds(records, myProfileId));
  const theyCanSeeMe = new Set(
    records
      .filter((r) => r.unlocker_id === myProfileId && r.status === "active")
      .map((r) => r.unlocked_id),
  );
  return [...iCanSeeFrom].filter((id) => theyCanSeeMe.has(id));
}

/**
 * Pata contract kati ya users wawili (upande wowote).
 */
export function getUnlockBetween(
  records: UnlockRecord[],
  myProfileId: string,
  theirProfileId: string,
): UnlockRecord | null {
  if (!myProfileId || !theirProfileId || !records?.length) return null;

  const matches = records.filter(
    (r) =>
      (r.unlocker_id === myProfileId && r.unlocked_id === theirProfileId) ||
      (r.unlocker_id === theirProfileId && r.unlocked_id === myProfileId),
  );
  if (!matches.length) return null;

  // 1. Prioritize active contract
  const active = matches.find((r) => r.status === "active");
  if (active) return active;

  // 2. Prioritize pending contract
  const pending = matches.find((r) => r.status === "pending");
  if (pending) return pending;

  // If all contracts are cancelled or rejected, return null so a new unlock can be requested
  return null;
}
