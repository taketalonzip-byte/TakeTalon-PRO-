/**
 * TakeTalon — useUnlocks hook (v2)
 * Malipo yanafanywa server-side na pg_cron — hakuna payment timer hapa.
 */

import { useState, useEffect, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import {
  UnlockRecord,
  PublicProfile,
  BusinessRules,
  loadMyUnlocks,
  fetchPublicTipsters,
  fetchBusinessRules,
  requestUnlock,
  cancelUnlock,
  acceptUnlock,
  rejectUnlock,
  getCanSeePostsFromIds,
  getMutuallyUnlockedIds,
} from "../lib/unlockService";

export type { UnlockRecord, PublicProfile, BusinessRules };

interface UseUnlocksOptions {
  profileId: string | null; // profiles.id ya current user (primary key)
  authUserId: string | null; // auth.users.id — kwa filtering notifications
  isPro: boolean;
  onNotification?: (msg: string, type: "success" | "error" | "info") => void;
  onRequireAuth?: () => void;
  lang?: "en" | "fr" | "sw";
}

export function useUnlocks({
  profileId,
  authUserId,
  isPro,
  onNotification,
  onRequireAuth,
  lang = "en",
}: UseUnlocksOptions) {
  const tr = (sw: string, fr: string, en: string) => (lang === "sw" ? sw : lang === "fr" ? fr : en);
  const [records, setRecords] = useState<UnlockRecord[]>([]);
  const [tipsters, setTipsters] = useState<PublicProfile[]>([]);
  const [businessRules, setBusinessRules] = useState<BusinessRules>({
    monthly_cost_fbu: 500,
    tipster_share_fbu: 450,
    commission_fbu: 50,
  });
  const [loading, setLoading] = useState(false);

  // ── Load data ────────────────────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    if (!profileId) return;
    const data = await loadMyUnlocks(profileId);
    setRecords((prev) => {
      const serverKeys = new Set(data.map((r) => `${r.unlocker_id}:${r.unlocked_id}`));
      const missingLocal = prev.filter((r) => {
        if (r.status !== "pending" && r.status !== "active") return false;
        const key = `${r.unlocker_id}:${r.unlocked_id}`;
        return !serverKeys.has(key);
      });
      return [...data, ...missingLocal];
    });
  }, [profileId]);

  const refreshTipsters = useCallback(async () => {
    const data = await fetchPublicTipsters(authUserId);
    setTipsters(data);
  }, [authUserId]);

  useEffect(() => {
    if (!profileId) {
      setRecords([]);
      return;
    }

    refresh();
    refreshTipsters();
    fetchBusinessRules().then(setBusinessRules);
  }, [profileId, refresh, refreshTipsters]);

  // ── Real-time subscription on unlock_contracts ────────────────────────────────

  useEffect(() => {
    if (!profileId || !isSupabaseConfigured) return;

    const channel = supabase
      .channel(`unlock_contracts:${profileId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "unlock_contracts",
          filter: `unlocker_id=eq.${profileId}`,
        },
        () => refresh(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "unlock_contracts",
          filter: `unlocked_id=eq.${profileId}`,
        },
        (payload: any) => {
          refresh();
          // Arifa kwa Y anapopokea ombi jipya
          if (payload.eventType === "INSERT") {
            const msg =
              lang === "sw"
                ? "Mtu amefungua mlango wako! Bonyeza Accept ili upokee malipo."
                : lang === "fr"
                  ? "Quelqu'un vous a débloqué ! Appuyez sur Accepter pour recevoir des paiements."
                  : "Someone unlocked you! Tap Accept to start receiving payments.";
            onNotification?.(msg, "info");
          }
          // Arifa kwa Y anapofutwa unlock
          if (payload.eventType === "UPDATE" && payload.new?.status === "cancelled") {
            const msg =
              lang === "sw"
                ? "Mtu amefunga mlango — malipo yatasimama."
                : lang === "fr"
                  ? "Un déblockage a été annulé — les paiements s'arrêtent."
                  : "An unlock was cancelled — payments stopped.";
            onNotification?.(msg, "info");
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileId, lang, onNotification, refresh]);

  // ── Actions ──────────────────────────────────────────────────────────────────

  const unlock = useCallback(
    async (targetProfileId: string): Promise<boolean> => {
      // targetProfileId = profiles.id ya Y (unlocked profile)
      if (!profileId) {
        onNotification?.(
          lang === "sw"
            ? "Tafadhali ingia kwenye akaunti yako kwanza ili ku-unlock!"
            : "Please log in to your account first to unlock!",
          "error",
        );
        onRequireAuth?.();
        return false;
      }

      // Optimistically create temp record immediately so UI switches instantly to 'active' (Unlocking)
      const tempRecord: UnlockRecord = {
        id: `rec-temp-${Date.now()}`,
        unlocker_id: profileId,
        unlocked_id: targetProfileId,
        status: "active",
        created_at: new Date().toISOString(),
        accepted_at: new Date().toISOString(),
        cancelled_at: null,
      };

      setRecords((prev) => {
        const filtered = prev.filter(
          (r) =>
            !(
              (r.unlocker_id === profileId && r.unlocked_id === targetProfileId) ||
              (r.unlocker_id === targetProfileId && r.unlocked_id === profileId)
            ),
        );
        return [tempRecord, ...filtered];
      });

      setLoading(true);
      const result = await requestUnlock(targetProfileId, profileId);
      setLoading(false);

      if (result.ok) {
        const newRecord: UnlockRecord = result.record || tempRecord;
        setRecords((prev) =>
          prev.map((r) => (r.id === tempRecord.id ? newRecord : r)),
        );
        await refresh();
        const msg =
          lang === "sw"
            ? "Milango imefunguliwa! Miamala ya FBU 500 itafanyika kila baada ya dakika 30."
            : lang === "fr"
              ? "Débloqué avec succès ! 500 FBU seront déduits toutes les 30 minutes."
              : "Unlocked successfully! 500 FBU deducted every 30 minutes.";
        onNotification?.(msg, "success");
        return true;
      } else {
        setRecords((prev) => prev.filter((r) => r.id !== tempRecord.id));

        let msg = "";
        if (result.error === "insufficient_balance") {
          msg =
            lang === "sw"
              ? "Salio halitoshi! Unahitaji angalau FBU 500 kwenye wallet yako ili ku-unlock."
              : lang === "fr"
                ? "Solde insuffisant ! Vous avez besoin d'au moins 500 FBU."
                : "Insufficient balance! You need at least 500 FBU to unlock.";
        } else if (
          result.error === "already_requested" ||
          result.error === "already_exists" ||
          result.error === "23505"
        ) {
          await refresh();
          msg = tr(
            "Akaunti hii tayari imefunguliwa!",
            "Ce compte est déjà débloqué !",
            "Account is already unlocked!"
          );
          onNotification?.(msg, "info");
          return true;
        } else if (result.error === "not_professional") {
          msg = tr(
            "Unahitaji akaunti ya Professional ili ku-unlock wengine!",
            "Vous avez besoin d'un compte Professionnel pour débloquer les autres !",
            "You need a Professional account to unlock others!"
          );
        } else if (result.error === "cannot_unlock_self") {
          msg = tr(
            "Huwezi ku-unlock akaunti yako mwenyewe!",
            "Vous ne pouvez pas vous débloquer vous-même !",
            "You cannot unlock yourself!"
          );
        } else {
          msg = tr(
            `Hitilafu — ${result.error || "jaribu tena"}`,
            `Erreur — ${result.error || "réessayez"}`,
            `Error — ${result.error || "try again"}`
          );
        }
        onNotification?.(msg, "error");
        return false;
      }
    },
    [profileId, lang, onNotification, onRequireAuth, refresh],
  );

  const cancel = useCallback(
    async (contractId: string): Promise<boolean> => {
      setRecords((prev) => prev.filter((r) => r.id !== contractId));
      const result = await cancelUnlock(contractId);
      if (result.ok) {
        await refresh();
        onNotification?.(
          lang === "sw"
            ? "Unlock imefutwa."
            : lang === "fr"
              ? "Déblockage annulé."
              : "Unlock cancelled.",
          "info",
        );
        return true;
      }
      await refresh();
      onNotification?.(tr("Hitilafu ya kufuta.", "Erreur d'annulation.", "Error cancelling."), "error");
      return false;
    },
    [lang, onNotification, refresh],
  );

  const accept = useCallback(
    async (contractId: string): Promise<boolean> => {
      setRecords((prev) =>
        prev.map((r) => (r.id === contractId ? { ...r, status: "active" as const } : r)),
      );
      const result = await acceptUnlock(contractId);
      if (result.ok) {
        await refresh();
        const msg =
          lang === "sw"
            ? "Umekubali unlock! Utaanza kupokea malipo server-side kila dakika 30."
            : lang === "fr"
              ? "Déblockage accepté ! Vous recevrez des paiements toutes les 30 min."
              : "Unlock accepted! Payments will flow automatically every 30 minutes.";
        onNotification?.(msg, "success");
        return true;
      }
      await refresh();
      onNotification?.(tr("Hitilafu ya kukubali.", "Erreur d'acceptation.", "Error accepting."), "error");
      return false;
    },
    [lang, onNotification, refresh],
  );

  const reject = useCallback(
    async (contractId: string): Promise<boolean> => {
      setRecords((prev) => prev.filter((r) => r.id !== contractId));
      const result = await rejectUnlock(contractId);
      if (result.ok) {
        await refresh();
        onNotification?.(
          lang === "sw"
            ? "Unlock imekataliwa."
            : lang === "fr"
              ? "Déblockage rejeté."
              : "Unlock rejected.",
          "info",
        );
        return true;
      }
      await refresh();
      onNotification?.(tr("Hitilafu ya kukataa.", "Erreur de rejet.", "Error rejecting."), "error");
      return false;
    },
    [lang, onNotification, refresh],
  );

  // ── Derived state ─────────────────────────────────────────────────────────────

  /** profile IDs ambazo ninazifungua (mimi ni unlocker, active au pending) */
  const activelyUnlocking = records
    .filter(
      (r) =>
        r.unlocker_id === profileId &&
        (r.status === "active" || r.status === "pending"),
    )
    .map((r) => r.unlocked_id);

  /** profile IDs zinazounifungua mimi (mimi ni unlocked, active au pending) */
  const activeUnlockers = records
    .filter(
      (r) =>
        r.unlocked_id === profileId &&
        (r.status === "active" || r.status === "pending"),
    )
    .map((r) => r.unlocker_id);

  /** Maombi niliyotuma (bado pending) */
  const pendingOutgoing = records.filter(
    (r) => r.unlocker_id === profileId && r.status === "pending",
  );

  /** Maombi niliyopokea (bado pending — niamue accept/reject) */
  const pendingIncoming = records.filter(
    (r) => r.unlocked_id === profileId && r.status === "pending",
  );

  /** Profile IDs ambazo posts zao ninaona (mimi = unlocked_id, wao = unlocker_id, active) */
  const canSeeFromIds = profileId ? getCanSeePostsFromIds(records, profileId) : [];

  /** Backward compat: mutual unlock IDs */
  const mutualIds = profileId ? getMutuallyUnlockedIds(records, profileId) : [];

  return {
    records,
    tipsters,
    businessRules,
    loading,
    activelyUnlocking,
    activeUnlockers,
    pendingOutgoing,
    pendingIncoming,
    canSeeFromIds,
    mutualIds,
    unlock,
    cancel,
    accept,
    reject,
    refresh,
    refreshTipsters,
  };
}
