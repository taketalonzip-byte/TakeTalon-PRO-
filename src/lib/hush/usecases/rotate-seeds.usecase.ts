/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SeedPair } from "../domain/entities";
import { ICryptoService, ISeedRepository, IAuditLogger } from "../domain/interfaces";
import { LocalSeedRepository } from "../infrastructure/seed.repository";

/**
 * Use case to rotate server and client seeds.
 * Generates a brand-new cryptographically secure active SeedPair, while archiving the old one
 * to historical records to allow retro-active player verification.
 */
export class RotateSeedsUseCase {
  constructor(
    private readonly cryptoService: ICryptoService,
    private readonly seedRepository: ISeedRepository,
    private readonly auditLogger: IAuditLogger,
  ) {}

  /**
   * Performs the rotation of seeds.
   * If an old seed pair was active, it is archived.
   * @param customClientSeed Optional client seed supplied by the player. If omitted, a CSPRNG seed is generated.
   */
  public async execute(customClientSeed?: string): Promise<SeedPair> {
    const previousActive = this.seedRepository.getActiveSeedPair();

    // 1. Generate a new cryptographically secure server seed (32 bytes = 64 hex characters)
    const newServerSeed = this.cryptoService.generateSecureRandomHex(32);

    // 2. Compute SHA-256 hash commitment of the server seed
    const newServerSeedHash = await this.cryptoService.sha256(newServerSeed);

    // 3. Resolve client seed (use custom or generate high-entropy CSPRNG fallback)
    const finalizedClientSeed =
      customClientSeed?.trim() || this.cryptoService.generateSecureRandomHex(16);

    // 4. Construct new active SeedPair
    const newSeedPair: SeedPair = {
      id: `seed-${this.cryptoService.generateSecureRandomHex(16)}`,
      serverSeed: newServerSeed,
      serverSeedHash: newServerSeedHash,
      clientSeed: finalizedClientSeed,
      nonce: 0, // starts at 0, incremented dynamically when rounds are generated
      isActive: true,
      createdAt: new Date(),
    };

    // 5. If a prior active seed pair existed, archive it in history
    if (previousActive) {
      const inactiveSeedPair: SeedPair = {
        ...previousActive,
        isActive: false,
      };

      if (this.seedRepository instanceof LocalSeedRepository) {
        this.seedRepository.addRotatedSeedPair(inactiveSeedPair);
      }

      this.auditLogger.log(
        "SEED_ROTATION",
        `Rotated seed pair. Previous server seed revealed: "${previousActive.serverSeed}". Nonces used: ${previousActive.nonce}`,
        "SUCCESS",
      );
    } else {
      this.auditLogger.log(
        "SEED_ROTATION",
        `Initialized initial cryptographic seed pair. Hash Commitment: ${newServerSeedHash.substring(0, 12)}...`,
        "SUCCESS",
      );
    }

    // 6. Save the new active seed pair
    this.seedRepository.saveSeedPair(newSeedPair);

    return newSeedPair;
  }
}
