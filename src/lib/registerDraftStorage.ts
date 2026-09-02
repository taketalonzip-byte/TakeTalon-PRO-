export const REGISTER_DRAFT_KEY = "taketalon.register.draft.v1";
export const REGISTER_DRAFT_TTL_MS = 30 * 60 * 1000;

type DraftWithTimestamp = {
  updatedAt?: unknown;
};

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/**
 * Returns the registration draft only while it is still within the 30-minute
 * inactivity window. Malformed and expired entries are removed defensively.
 */
export function getFreshRegisterDraft<T extends DraftWithTimestamp>(): T | null {
  if (!canUseLocalStorage()) return null;

  try {
    const raw = window.localStorage.getItem(REGISTER_DRAFT_KEY);
    if (!raw) return null;

    const draft = JSON.parse(raw) as T;
    const updatedAt = Number(draft.updatedAt);
    const ageMs = Date.now() - updatedAt;

    if (!Number.isFinite(updatedAt) || ageMs < 0 || ageMs >= REGISTER_DRAFT_TTL_MS) {
      window.localStorage.removeItem(REGISTER_DRAFT_KEY);
      return null;
    }

    return draft;
  } catch {
    try {
      window.localStorage.removeItem(REGISTER_DRAFT_KEY);
    } catch {
      // Ignore storage errors; the authentication flow still remains usable.
    }
    return null;
  }
}

/** Removes only an expired or invalid registration draft, preserving auth/session keys. */
export function clearExpiredRegisterDraft(): void {
  getFreshRegisterDraft();
}

export function removeRegisterDraft(): void {
  if (!canUseLocalStorage()) return;

  try {
    window.localStorage.removeItem(REGISTER_DRAFT_KEY);
  } catch {
    // Ignore storage errors; the authentication flow still remains usable.
  }
}
