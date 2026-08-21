export type GameId = "slot777" | "crystal-mine" | "provably-dice" | "plinko-pyramid";

export interface ProvablyFairSeed {
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
}

export interface BetHistoryItem {
  id: string;
  gameId: string;
  gameName: string;
  timestamp: number;
  betAmountFBU: number;
  payoutFBU: number;
  multiplier: number;
  won: boolean;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  hashResult: string;
  details: string;
}

export interface SlotSymbol {
  id: string;
  name: string;
  symbol: string;
  color: string;
  weight: number;
  multiplier: number;
}

export interface CrystalTile {
  id: number;
  revealed: boolean;
  type: "amethyst" | "emerald" | "ruby" | "diamond" | "bomb";
  multiplier: number;
  name: string;
}

export interface WheelSegment {
  id: number;
  label: string;
  multiplier: number;
  color: string;
  textColor: string;
}
