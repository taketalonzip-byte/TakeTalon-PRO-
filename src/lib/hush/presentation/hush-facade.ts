/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SeedPair, ProvablyFairOutcome, CryptographicAuditLog } from "../domain/entities";
import { WebCryptoService } from "../infrastructure/crypto.service";
import { LocalSeedRepository } from "../infrastructure/seed.repository";
import { LocalAuditLogger } from "../infrastructure/audit.logger";
import { GenerateRoundOutcomeUseCase } from "../usecases/generate-round-outcome.usecase";
import { VerifyRoundUseCase, VerificationResult } from "../usecases/verify-round.usecase";
import { RotateSeedsUseCase } from "../usecases/rotate-seeds.usecase";

/**
 * Enterprise-grade facade that acts as the single unified API for the HUSH cryptographic engine.
 * Implements the Facade Pattern to encapsulate complex subsystems (Clean Architecture & SOLID).
 */
export class HushFacade {
  private static instance: HushFacade | null = null;

  // Infrastructure instances
  private readonly cryptoService: WebCryptoService;
  private readonly seedRepository: LocalSeedRepository;
  private readonly auditLogger: LocalAuditLogger;

  // Use cases
  private readonly generateUseCase: GenerateRoundOutcomeUseCase;
  private readonly verifyUseCase: VerifyRoundUseCase;
  private readonly rotateUseCase: RotateSeedsUseCase;

  private constructor() {
    this.cryptoService = new WebCryptoService();
    this.seedRepository = new LocalSeedRepository();
    this.auditLogger = new LocalAuditLogger();

    this.generateUseCase = new GenerateRoundOutcomeUseCase(this.cryptoService, this.auditLogger);
    this.verifyUseCase = new VerifyRoundUseCase(this.cryptoService, this.auditLogger);
    this.rotateUseCase = new RotateSeedsUseCase(
      this.cryptoService,
      this.seedRepository,
      this.auditLogger,
    );
  }

  /**
   * Retrieves the Singleton instance of the HUSH Facade.
   */
  public static getInstance(): HushFacade {
    if (!this.instance) {
      this.instance = new HushFacade();
    }
    return this.instance;
  }

  /**
   * Initializes the engine, ensuring a valid cryptographic seed pair exists.
   */
  public async initialize(): Promise<void> {
    const active = this.seedRepository.getActiveSeedPair();
    if (!active) {
      await this.rotateUseCase.execute();
    }
  }

  /**
   * Returns the current active seed details.
   * To prevent prediction, frontend components should primarily read "serverSeedHash" instead of "serverSeed".
   */
  public getActiveSeed(): SeedPair | null {
    return this.seedRepository.getActiveSeedPair();
  }

  /**
   * Generates the next verifiable game outcome, atomically incrementing the seed's nonce.
   */
  public async generateNextOutcome(): Promise<ProvablyFairOutcome> {
    let active = this.seedRepository.getActiveSeedPair();
    if (!active) {
      await this.initialize();
      active = this.seedRepository.getActiveSeedPair();
      if (!active) {
        throw new Error("Failed to initialize active seeds for outcome generation.");
      }
    }

    // Atomically increment nonce
    const nextNonce = this.seedRepository.incrementNonce();

    // Fetch refreshed active seeds with updated nonce
    const updatedActive = this.seedRepository.getActiveSeedPair()!;

    // Generate outcome
    return this.generateUseCase.execute(updatedActive, nextNonce);
  }

  /**
   * Forces rotation of seeds, immediately revealing the current secret server seed to history
   * and generating a new active seed pair with an optional custom client seed.
   */
  public async rotateSeeds(customClientSeed?: string): Promise<SeedPair> {
    return this.rotateUseCase.execute(customClientSeed);
  }

  /**
   * Verifies any historical game round completely independent of active session state.
   */
  public async verifyRound(
    serverSeed: string,
    clientSeed: string,
    nonce: number,
    commitmentHash: string,
    claimedMultiplier?: number,
  ): Promise<VerificationResult> {
    return this.verifyUseCase.execute(
      serverSeed,
      clientSeed,
      nonce,
      commitmentHash,
      claimedMultiplier,
    );
  }

  /**
   * Retrieves past revealed seeds. These are fully transparent and auditable.
   */
  public getHistory(): SeedPair[] {
    return this.seedRepository.getPastSeedPairs();
  }

  /**
   * Retrieves all logged security and cryptographic events.
   */
  public getLogs(): CryptographicAuditLog[] {
    return this.auditLogger.getLogs();
  }
}
export const hush = HushFacade.getInstance();
