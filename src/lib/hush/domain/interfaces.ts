/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SeedPair, ProvablyFairOutcome, CryptographicAuditLog } from "./entities";

/**
 * Service contract for low-level cryptographic functions.
 * Abstracted to separate domain rules from Web Crypto/Node.js-specific implementations.
 */
export interface ICryptoService {
  /**
   * Generates a cryptographically secure random hexadecimal string (CSPRNG).
   */
  generateSecureRandomHex(bytes: number): string;

  /**
   * Computes SHA-256 hash of a string. Used for server seed hash commitment.
   */
  sha256(text: string): Promise<string>;

  /**
   * Computes HMAC-SHA256 signature. Used for outcome generation.
   */
  hmacSha256(key: string, message: string): Promise<string>;
}

/**
 * Repository contract for maintaining seed pair state and history.
 */
export interface ISeedRepository {
  /**
   * Retrieves the currently active seed pair.
   */
  getActiveSeedPair(): SeedPair | null;

  /**
   * Persists or updates a seed pair.
   */
  saveSeedPair(seedPair: SeedPair): void;

  /**
   * Atomically increments and returns the new nonce for the active seed pair.
   */
  incrementNonce(): number;

  /**
   * Retrieves all rotated (historical/inactive) seed pairs.
   */
  getPastSeedPairs(): SeedPair[];
}

/**
 * Service contract for auditing cryptographic and security events.
 */
export interface IAuditLogger {
  /**
   * Records a security, outcome generation, or seed rotation event.
   */
  log(
    action: CryptographicAuditLog["action"],
    details: string,
    status: CryptographicAuditLog["status"],
  ): void;

  /**
   * Retrieves all logged security events.
   */
  getLogs(): CryptographicAuditLog[];
}
