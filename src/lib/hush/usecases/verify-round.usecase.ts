/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ICryptoService, IAuditLogger } from "../domain/interfaces";

export interface VerificationResult {
  readonly isValid: boolean;
  readonly calculatedMultiplier: number;
  readonly calculatedHmac: string;
  readonly commitmentMatch: boolean;
  readonly actualCommitmentHash: string;
}

/**
 * Use case to verify past rounds retrospectively.
 * Enables auditability and mathematical proof of correctness.
 */
export class VerifyRoundUseCase {
  constructor(
    private readonly cryptoService: ICryptoService,
    private readonly auditLogger: IAuditLogger,
  ) {}

  /**
   * Mathematically re-evaluates a historical round and validates it against the known commitment.
   */
  public async execute(
    serverSeed: string,
    clientSeed: string,
    nonce: number,
    claimedCommitmentHash: string,
    claimedMultiplier?: number,
  ): Promise<VerificationResult> {
    try {
      // 1. Verify Commitment Integrity (SHA-256(serverSeed) must equal claimed commitment)
      const actualCommitmentHash = await this.cryptoService.sha256(serverSeed);
      const commitmentMatch = actualCommitmentHash === claimedCommitmentHash;

      // 2. Re-calculate the outcome using HMAC-SHA256
      const verificationString = `${clientSeed}-${nonce}`;
      const calculatedHmac = await this.cryptoService.hmacSha256(serverSeed, verificationString);

      // Extract 13 characters of entropy (52 bits)
      const hexEntropy = calculatedHmac.substring(0, 13);
      const decimalEntropy = parseInt(hexEntropy, 16);
      const r = decimalEntropy / Math.pow(2, 52);

      const houseEdge = 0.03;
      let calculatedMultiplier = 1.0;

      if (r >= houseEdge) {
        const rawMultiplier = (1 - houseEdge) / (1 - r);
        calculatedMultiplier = Math.floor(rawMultiplier * 100) / 100;
      }
      calculatedMultiplier = Math.max(1.0, calculatedMultiplier);

      // Check if outcome aligns with the visual or database record
      const multiplierMatch =
        claimedMultiplier === undefined ||
        Math.abs(calculatedMultiplier - claimedMultiplier) < 0.01;
      const isValid = commitmentMatch && multiplierMatch;

      this.auditLogger.log(
        "VERIFICATION",
        `Verification requested. Client seed: "${clientSeed}", Nonce: ${nonce}. Match: ${isValid ? "SUCCESS" : "FAIL"}. Calculated: x${calculatedMultiplier.toFixed(2)}`,
        isValid ? "SUCCESS" : "SECURITY_ALERT",
      );

      return {
        isValid,
        calculatedMultiplier,
        calculatedHmac,
        commitmentMatch,
        actualCommitmentHash,
      };
    } catch (e: any) {
      this.auditLogger.log(
        "ERROR_LOGGED",
        `Verification failed unexpectedly: ${e?.message || e}`,
        "FAILED",
      );
      throw e;
    }
  }
}
