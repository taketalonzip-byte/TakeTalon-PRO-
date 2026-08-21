/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Entity representing a Seed Pair used for cryptographic outcome generation.
 */
export interface SeedPair {
  readonly id: string;
  readonly serverSeed: string; // Secret key (CSPRNG)
  readonly serverSeedHash: string; // SHA-256 Hash Commitment of serverSeed
  readonly clientSeed: string; // User-provided or secure random seed
  readonly nonce: number; // Incrementing round sequence number
  readonly isActive: boolean;
  readonly createdAt: Date;
}

/**
 * Value Object representing a Provably Fair Round Outcome.
 */
export interface ProvablyFairOutcome {
  readonly multiplier: number; // Verifiable crash multiplier (e.g., 1.00 to x)
  readonly hmacSignature: string; // HMAC-SHA256 signature of (clientSeed + nonce) using serverSeed
  readonly commitmentHash: string; // Hash of the server seed used for validation
  readonly nonce: number;
}

/**
 * Entity representing an Audit Log for tracking cryptographic operations.
 */
export interface CryptographicAuditLog {
  readonly id: string;
  readonly timestamp: Date;
  readonly action:
    | "SEED_ROTATION"
    | "ROUND_GENERATION"
    | "VERIFICATION"
    | "TAMPER_DETECTION_TRIGGERED"
    | "ERROR_LOGGED";
  readonly details: string;
  readonly status: "SUCCESS" | "FAILED" | "SECURITY_ALERT";
}
