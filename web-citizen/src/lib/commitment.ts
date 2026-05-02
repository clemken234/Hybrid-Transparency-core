import { poseidon3 } from "poseidon-lite";

/**
 * Generates a cryptographically secure 256-bit secret for the citizen.
 * Uses the browser's built-in CSPRNG (crypto.getRandomValues).
 * The secret is stored only in localStorage and never transmitted.
 */
export function generateSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return "0x" + Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Computes the Merkle leaf commitment: Poseidon([secret, private_license_data, public_name]).
 * Uses poseidon-lite (bn254 / Poseidon x5) — matches circuits/src/main.nr bn254::hash_3.
 */
export function createFinalMerkleLeaf(
  secret: string,
  privateLicenseData: string,
  publicName: string
): string {
  const hash = poseidon3([
    BigInt(secret),
    BigInt(privateLicenseData),
    BigInt(publicName),
  ]);
  return "0x" + hash.toString(16).padStart(64, "0");
}

/**
 * Converts any value to a 0x-prefixed 32-byte hex string suitable for Noir Field inputs.
 * Noir Fields are BN254 scalars; anything that fits in 32 bytes is valid.
 */
export function toFieldHex(value: string | number | bigint): string {
  if (typeof value === 'string' && value.startsWith('0x')) {
    return '0x' + value.slice(2).padStart(64, '0');
  }

  if (typeof value === 'string') {
    const asNum = BigInt(value);
    return '0x' + asNum.toString(16).padStart(64, '0');
  }

  return '0x' + BigInt(value).toString(16).padStart(64, '0');
}

/**
 * Converts a UTF-8 string (e.g. a name) to a Field by taking its bytes as a big-endian integer.
 * Truncates to 31 bytes to stay safely within the BN254 field modulus.
 */
export function stringToFieldHex(text: string): string {
  const bytes = new TextEncoder().encode(text).slice(0, 31);
  let hex = '';
  for (const b of bytes) hex += b.toString(16).padStart(2, '0');
  return '0x' + hex.padStart(64, '0');
}
