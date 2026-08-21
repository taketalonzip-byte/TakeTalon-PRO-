/**
 * Provably Fair Crypto Utilities (SHA-256 via Web Crypto API)
 * Separate file so it doesn't collide with any existing crypto utils.
 */

export async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function generateRandomSeed(length = 32): string {
  const array = new Uint8Array(length / 2);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function calculateSpinResultIndex(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  numSegments: number,
): Promise<{ winningIndex: number; fullHash: string; hexSub: string; intVal: number }> {
  if (numSegments <= 0) throw new Error("numSegments must be > 0");
  const combined = `${serverSeed}:${clientSeed}:${nonce}`;
  const fullHash = await sha256(combined);
  const hexSub = fullHash.substring(0, 8);
  const intVal = parseInt(hexSub, 16);
  const winningIndex = intVal % numSegments;
  return { winningIndex, fullHash, hexSub, intVal };
}

export async function verifyProvablyFair(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  commitHash: string,
  numSegments: number,
  expectedSegmentIndex: number,
): Promise<{
  isValidCommit: boolean;
  isResultMatched: boolean;
  calculatedIndex: number;
  calculatedCommit: string;
  fullHash: string;
  hexSub: string;
  intVal: number;
}> {
  const calculatedCommit = await sha256(serverSeed);
  const isValidCommit = calculatedCommit.toLowerCase() === commitHash.toLowerCase();
  const { winningIndex, fullHash, hexSub, intVal } = await calculateSpinResultIndex(
    serverSeed,
    clientSeed,
    nonce,
    numSegments,
  );
  return {
    isValidCommit,
    isResultMatched: winningIndex === expectedSegmentIndex,
    calculatedIndex: winningIndex,
    calculatedCommit,
    fullHash,
    hexSub,
    intVal,
  };
}
