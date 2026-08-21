import { sha256, generateRandomSeed } from "./sha256";
export { sha256, generateRandomSeed };
import { ProvablyFairSeed, SlotSymbol, WheelSegment } from "@/types/casino";

export const SLOT_SYMBOLS: SlotSymbol[] = [
  { id: "777", name: "777 Jackpot", symbol: "7️⃣", color: "#EAB308", weight: 8, multiplier: 100 },
  { id: "diamond", name: "Diamond", symbol: "💎", color: "#38BDF8", weight: 12, multiplier: 25 },
  { id: "crown", name: "Royal Crown", symbol: "👑", color: "#F59E0B", weight: 15, multiplier: 15 },
  { id: "ruby", name: "Crimson Gem", symbol: "🔻", color: "#EF4444", weight: 20, multiplier: 10 },
  { id: "bell", name: "Golden Bell", symbol: "🔔", color: "#FACC15", weight: 22, multiplier: 5 },
  { id: "bar", name: "Triple Bar", symbol: "🎰", color: "#A855F7", weight: 25, multiplier: 3 },
  { id: "cherry", name: "Lucky Cherry", symbol: "🍒", color: "#F43F5E", weight: 30, multiplier: 2 },
];

export const WHEEL_SEGMENTS: WheelSegment[] = [
  { id: 0, label: "100X", multiplier: 100, color: "#DC2626", textColor: "#FFFFFF" }, // Ruby Red
  { id: 1, label: "1.2X", multiplier: 1.2, color: "#1E293B", textColor: "#94A3B8" }, // Slate Dark
  { id: 2, label: "2.0X", multiplier: 2.0, color: "#2563EB", textColor: "#FFFFFF" }, // Royal Blue
  { id: 3, label: "0.0X", multiplier: 0, color: "#0F172A", textColor: "#64748B" }, // Miss
  { id: 4, label: "5.0X", multiplier: 5.0, color: "#D97706", textColor: "#FFFFFF" }, // Gold Amber
  { id: 5, label: "1.5X", multiplier: 1.5, color: "#1E293B", textColor: "#94A3B8" },
  { id: 6, label: "10X", multiplier: 10, color: "#9333EA", textColor: "#FFFFFF" }, // Electric Purple
  { id: 7, label: "2.0X", multiplier: 2.0, color: "#2563EB", textColor: "#FFFFFF" },
  { id: 8, label: "50X", multiplier: 50, color: "#EAB308", textColor: "#000000" }, // Gold
  { id: 9, label: "1.2X", multiplier: 1.2, color: "#1E293B", textColor: "#94A3B8" },
  { id: 10, label: "3.0X", multiplier: 3.0, color: "#059669", textColor: "#FFFFFF" }, // Emerald
  { id: 11, label: "0.0X", multiplier: 0, color: "#0F172A", textColor: "#64748B" },
  { id: 12, label: "15X", multiplier: 15, color: "#0284C7", textColor: "#FFFFFF" }, // Sapphire
  { id: 13, label: "1.8X", multiplier: 1.8, color: "#1E293B", textColor: "#94A3B8" },
  { id: 14, label: "5.0X", multiplier: 5.0, color: "#D97706", textColor: "#FFFFFF" },
  { id: 15, label: "2.5X", multiplier: 2.5, color: "#059669", textColor: "#FFFFFF" },
];

export function createInitialSeed(): ProvablyFairSeed {
  const serverSeed = generateRandomSeed(64);
  const serverSeedHash = sha256(serverSeed);
  const clientSeed = "fbu_" + Math.random().toString(36).substring(2, 10);
  return {
    serverSeed,
    serverSeedHash,
    clientSeed,
    nonce: 1,
  };
}

export function computeCombinedHash(serverSeed: string, clientSeed: string, nonce: number): string {
  return sha256(`${serverSeed}:${clientSeed}:${nonce}`);
}

/**
 * 1. 777 Slot SHA-256 Outcome Calculator
 * Generates 4 reel symbols from hash hex chunks.
 */
export function calculateSlotOutcome(hash: string): {
  symbols: SlotSymbol[];
  multiplier: number;
  isJackpot: boolean;
} {
  const symbols: SlotSymbol[] = [];
  const reelCount = 4;

  for (let i = 0; i < reelCount; i++) {
    const hexSlice = hash.substring(i * 8, (i + 1) * 8);
    const intVal = parseInt(hexSlice, 16);
    const index = intVal % SLOT_SYMBOLS.length;
    symbols.push(SLOT_SYMBOLS[index]);
  }

  // Calculate Payline Multiplier
  const firstId = symbols[0].id;
  const matchCount = symbols.filter((s) => s.id === firstId).length;

  let multiplier = 0;
  let isJackpot = false;

  if (matchCount === 4) {
    multiplier = symbols[0].multiplier * 5; // All 4 match!
    if (firstId === "777") isJackpot = true;
  } else if (matchCount === 3) {
    multiplier = symbols[0].multiplier * 2;
  } else {
    // Check for pairs or 777 counts
    const sevensCount = symbols.filter((s) => s.id === "777").length;
    if (sevensCount === 2) {
      multiplier = 3;
    } else if (sevensCount === 1) {
      multiplier = 1.2;
    } else {
      // Check standard pair
      const counts: { [key: string]: number } = {};
      symbols.forEach((s) => (counts[s.id] = (counts[s.id] || 0) + 1));
      const maxPairs = Math.max(...Object.values(counts));
      if (maxPairs === 2) multiplier = 1.1;
    }
  }

  return { symbols, multiplier: Number(multiplier.toFixed(2)), isJackpot };
}

/**
 * 2. Crystal Game SHA-256 Outcome Calculator
 * Generates a 5x5 grid with bomb traps and crystal multiplier rewards based on SHA-256 hash.
 */
export function calculateCrystalGrid(hash: string, bombCount: number = 3) {
  const totalTiles = 25;
  const grid: { index: number; isBomb: boolean; type: string; multiplier: number }[] = [];

  // Deterministically pick bomb indices using hash slices
  const bombIndices = new Set<number>();
  let offset = 0;

  while (bombIndices.size < bombCount && offset + 4 <= hash.length) {
    const chunk = hash.substring(offset, offset + 4);
    const val = parseInt(chunk, 16);
    const idx = val % totalTiles;
    bombIndices.add(idx);
    offset += 4;
  }

  // Fill grid
  const crystalTypes = [
    { type: "amethyst", multiplier: 1.2 },
    { type: "emerald", multiplier: 1.5 },
    { type: "ruby", multiplier: 2.5 },
    { type: "diamond", multiplier: 5.0 },
  ];

  for (let i = 0; i < totalTiles; i++) {
    const isBomb = bombIndices.has(i);
    const chunk = hash.substring((i % 16) * 4, (i % 16) * 4 + 4);
    const val = parseInt(chunk, 16);
    const crystal = crystalTypes[val % crystalTypes.length];

    grid.push({
      index: i,
      isBomb,
      type: isBomb ? "bomb" : crystal.type,
      multiplier: isBomb ? 0 : crystal.multiplier,
    });
  }

  return grid;
}

/**
 * 3. Hash Dice SHA-256 Outcome Calculator
 * Generates roll result 0.00 to 99.99 from SHA-256 hash.
 */
export function calculateDiceRoll(hash: string): number {
  const hexSlice = hash.substring(0, 8);
  const intVal = parseInt(hexSlice, 16);
  const roll = (intVal % 10000) / 100; // 0.00 to 99.99
  return Number(roll.toFixed(2));
}

export type PlinkoRisk = "low" | "medium" | "extreme";

export const PLINKO_RISK_MULTIPLIERS: Record<PlinkoRisk, number[]> = {
  low: [5.6, 2.1, 1.1, 1.0, 0.5, 1.0, 1.1, 2.1, 5.6],
  medium: [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29],
  extreme: [1000, 110, 25, 2, 0.1, 2, 25, 110, 1000],
};

export const FAST_BET_PRESETS = [1000, 2000, 5000, 50000, 100000];
export const MAX_BET_FBU = 100000;

export const PLINKO_MULTIPLIERS = PLINKO_RISK_MULTIPLIERS.medium;

/**
 * 4. Plinko Pyramid SHA-256 Outcome Calculator
 * Generates step-by-step peg directions (left=0, right=1) for 8 rows and final bucket index from hash.
 */
export function calculatePlinkoPath(
  hash: string,
  rows: number = 8,
  risk: PlinkoRisk = "medium",
): { directions: number[]; bucketIndex: number; multiplier: number } {
  const directions: number[] = [];
  let rightCount = 0;

  for (let i = 0; i < rows; i++) {
    const char = hash.charAt(i % hash.length);
    const val = parseInt(char, 16);
    const dir = val % 2; // 0 = left, 1 = right
    directions.push(dir);
    if (dir === 1) rightCount++;
  }

  const bucketIndex = rightCount; // 0 to 8 (9 buckets total)
  const multipliers = PLINKO_RISK_MULTIPLIERS[risk] || PLINKO_RISK_MULTIPLIERS.medium;
  const multiplier = multipliers[bucketIndex] || 0.2;

  return { directions, bucketIndex, multiplier };
}

export function formatFBU(amount: number): string {
  return (
    amount.toLocaleString("en-US", {
      maximumFractionDigits: 0,
    }) + " FBU"
  );
}
