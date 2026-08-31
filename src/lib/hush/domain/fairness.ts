/**
 * Shared provably-fair Aviator mapping.
 * Keep this module dependency-free so generation and retrospective verification
 * always apply exactly the same rules.
 */

export const HUSH_HOUSE_EDGE = 0.03;
/** Operational safety ceiling; prevents an extreme tail from keeping a round alive indefinitely. */
export const HUSH_MAX_MULTIPLIER = 100;

/**
 * Maps the first 52 bits of an HMAC-SHA256 digest to a two-decimal multiplier.
 * The mapping remains deterministic and verifiable from serverSeed, clientSeed,
 * and nonce; the ceiling is applied identically on both generation and replay.
 */
export function multiplierFromHmac(hmacSignature: string): number {
  const hexEntropy = hmacSignature.substring(0, 13);
  if (!/^[0-9a-f]{13}$/i.test(hexEntropy)) {
    throw new Error("Invalid HMAC entropy: expected 13 hexadecimal characters.");
  }

  const decimalEntropy = parseInt(hexEntropy, 16);
  const r = decimalEntropy / Math.pow(2, 52);
  let multiplier = 1.0;

  if (r >= HUSH_HOUSE_EDGE) {
    const rawMultiplier = (1 - HUSH_HOUSE_EDGE) / (1 - r);
    multiplier = Math.floor(rawMultiplier * 100) / 100;
  }

  return Math.min(HUSH_MAX_MULTIPLIER, Math.max(1.0, multiplier));
}
