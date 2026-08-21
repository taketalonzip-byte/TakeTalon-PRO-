/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProvablyFairOutcome, SeedPair } from "../domain/entities";
import { ICryptoService, IAuditLogger } from "../domain/interfaces";

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

      // 4. Hex-to-Float mapping (standard 52-bit integer conversion)
      // We extract 13 hex characters (13 * 4 = 52 bits of entropy)
      const hexEntropy = hmacSignature.substring(0, 13);
      const decimalEntropy = parseInt(hexEntropy, 16);

      // Calculate fraction in [0, 1)
      const r = decimalEntropy / Math.pow(2, 52);

      // 5. Apply House Edge and standard crash formula
      // Typical house edge: 3% (0.03)
      // If r is less than house edge, multiplier is 1.00 (instant bust)
      // Otherwise, outcome = (1 - houseEdge) / (1 - r)
      const houseEdge = 0.03;
      let multiplier = 1.0;

      if (r >= houseEdge) {
        const rawMultiplier = (1 - houseEdge) / (1 - r);
        // Floor to 2 decimal places to match casino standard and avoid floating precision noise
        multiplier = Math.floor(rawMultiplier * 100) / 100;
      }

      // Ensure lower boundary is exactly 1.00
      multiplier = Math.max(1.0, multiplier);

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
