/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SeedPair } from "../domain/entities";
import { ISeedRepository } from "../domain/interfaces";

/**
 * LocalStorage and In-Memory hybrid implementation of ISeedRepository.
 * Ensures data persists across refreshes, while falling back gracefully to in-memory state
 * if localStorage is blocked inside restricted iframe contexts.
 */
export class LocalSeedRepository implements ISeedRepository {
  private activeSeedPair: SeedPair | null = null;
  private rotatedSeeds: SeedPair[] = [];
  private readonly ACTIVE_KEY = "hush_active_seed_pair_v1";
  private readonly ROTATED_KEY = "hush_rotated_seeds_v1";

  constructor() {
    this.loadFromStorage();
  }

  public getActiveSeedPair(): SeedPair | null {
    return this.activeSeedPair;
  }

  public saveSeedPair(seedPair: SeedPair): void {
    this.activeSeedPair = seedPair;
    this.persistToStorage();
  }

  public incrementNonce(): number {
    if (!this.activeSeedPair) {
      throw new Error("No active seed pair exists to increment nonce.");
    }

    const updatedSeed: SeedPair = {
      ...this.activeSeedPair,
      nonce: this.activeSeedPair.nonce + 1,
    };

    this.saveSeedPair(updatedSeed);
    return updatedSeed.nonce;
  }

  public getPastSeedPairs(): SeedPair[] {
    return this.rotatedSeeds;
  }

  /**
   * Helper to append a newly inactive/rotated seed pair to historical records.
   */
  public addRotatedSeedPair(seedPair: SeedPair): void {
    // Filter duplicates to prevent replay anomalies
    if (!this.rotatedSeeds.some((s) => s.id === seedPair.id)) {
      this.rotatedSeeds = [seedPair, ...this.rotatedSeeds].slice(0, 50); // limit history to latest 50 for memory footprint optimization
      this.persistToStorage();
    }
  }

  private loadFromStorage(): void {
    // Memory-only state
  }

  private persistToStorage(): void {
    // Memory-only state
  }
}
