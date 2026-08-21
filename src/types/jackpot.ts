// Jackpot Wheel — type definitions

export interface WheelSegment {
  id: string;
  label: string; // e.g. "1 - 37" or "x2"
  multiplier: number; // e.g. 2 for 2× points
  points: number; // e.g. 200
  color: string; // hex colour
  numbersRange: number[]; // numbers (1-300) mapped to this segment
  textSecondary?: string;
}

export interface SpinResponse {
  resultSegmentId: string;
  winningNumber: number; // 1-300
  commitHash: string;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
}

export interface JackpotWheelProps {
  segments: WheelSegment[];
  onSpinRequest: (selectedNumbers: number[]) => Promise<SpinResponse>;
  disabled?: boolean;
  className?: string;
  clientSeed?: string;
  onClientSeedChange?: (newSeed: string) => void;
  onSpinComplete?: (result: {
    segment: WheelSegment;
    winningNumber: number;
    userSelectedNumbers: number[];
    isUserWinner: boolean;
    earnedPoints: number;
    serverSeed: string;
    clientSeed: string;
    nonce: number;
    commitHash: string;
  }) => void;
}

export interface SpinHistoryRecord {
  id: string;
  timestamp: Date;
  segment: WheelSegment;
  winningNumber: number;
  userSelectedNumbers: number[];
  isUserWinner: boolean;
  earnedPoints: number;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  commitHash: string;
  isVerified?: boolean;
}
