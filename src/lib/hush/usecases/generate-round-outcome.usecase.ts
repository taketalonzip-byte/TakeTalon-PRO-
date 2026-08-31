/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProvablyFairOutcome, SeedPair } from "../domain/entities";
import { ICryptoService, IAuditLogger } from "../domain/interfaces";
import { multiplierFromHmac } from "../domain/fairness";

/**
 * Use case to generate a verifiable round outcome (multiplier) using HMAC-SHA256.
 * Adheres to industry standard provably fair specifications.
 */
export class GenerateRoundOutcomeUseCase {
  constructor(
    private readonly cryptoService: ICryptoService,
    private readonly auditLogger: IAuditLogger,
  ) {}

  /**
   * Executes the provably fair outcome generation.
   * Compiles clientSeed and nonce, HMAC hashes them with serverSeed, and converts to a float multiplier.
   */
  public async execute(seedPair: SeedPair, nonce: number): Promise<ProvablyFairOutcome> {
    // 1. Input Validation
    if (!seedPair.serverSeed) {
      throw new Error("Cannot generate outcome: serverSeed is empty.");
    }
    if (!seedPair.clientSeed) {
      throw new Error("Cannot generate outcome: clientSeed is empty.");
    }
    if (nonce < 0) {
      throw new Error("Cannot generate outcome: nonce cannot be negative.");
    }

    try {
      // 2. Replay Protection & Tamper Detection: Combines seeds with nonce to produce unique verifiable input
      const verificationString = `${seedPair.clientSeed}-${nonce}`;

      // 3. HMAC-SHA256 Generation
      const hmacSignature = await this.cryptoService.hmacSha256(
        seedPair.serverSeed,
        verificationString,
      );

      // 4. Deterministic 52-bit mapping with the same bounded rule used by verification.
      // HMAC-SHA256 remains the entropy source; the ceiling prevents an extreme tail
      // from keeping the live round open for hours.
      const multiplier = multiplierFromHmac(hmacSignature);

      this.auditLogger.log(
        "ROUND_GENERATION",
        `Round generated with nonce ${nonce}. Commitment: ${seedPair.serverSeedHash.substring(0, 10)}... Multiplier: x${multiplier.toFixed(2)}`,
        "SUCCESS",
      );

      return {
        multiplier,
        hmacSignature,
        commitmentHash: seedPair.serverSeedHash,
        nonce,
      };
    } catch (e: any) {
      this.auditLogger.log(
        "ERROR_LOGGED",
        `Failed to generate round outcome: ${e?.message || e}`,
        "FAILED",
      );
      throw e;
    }
  }
}
