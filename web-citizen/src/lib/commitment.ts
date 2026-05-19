import { Barretenberg } from '@aztec/bb.js';

// Convert a 0x-prefixed 32-byte field hex string to a Uint8Array.
// bb.js 4.x poseidon2Hash({ inputs: Uint8Array[] }) requires raw bytes — Fr is not exported.
export function fieldHexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const padded = clean.padStart(64, '0');
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(padded.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

async function hashPair(bb: Barretenberg, left: string, right: string): Promise<string> {
  // bb.js 4.x: poseidon2Hash takes { inputs: Uint8Array[] } and returns { hash: Uint8Array }
  const { hash } = await bb.poseidon2Hash({
    inputs: [fieldHexToBytes(left), fieldHexToBytes(right)],
  });
  return '0x' + Array.from(hash).map(b => b.toString(16).padStart(2, '0')).join('');
}


export function getOrGenerateSecret(): string {
  const existingSecret = localStorage.getItem('lto_secret');
  if (existingSecret) return existingSecret;

  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const newSecret = "0x" + Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
  localStorage.setItem('lto_secret', newSecret);
  return newSecret;
}

// 2. Sequential Folding for the 11-Item Array
export async function computePrivateLicenseData(
  bb: Barretenberg, licenseID: string, firstName: string, lastName: string, dateOfBirth: string,
  licenseType: string, expirationDate: string, restrictions: string, conditions: string,
  bloodType: string, address: string, ltoSignature: string
): Promise<string> {
  const elements = [
    stringToFieldHex(licenseID), stringToFieldHex(licenseType), stringToFieldHex(firstName),
    stringToFieldHex(lastName), stringToFieldHex(dateOfBirth), stringToFieldHex(expirationDate),
    stringToFieldHex(restrictions), stringToFieldHex(conditions), stringToFieldHex(bloodType),
    stringToFieldHex(address), stringToFieldHex(ltoSignature)
  ];
  
  // Start with the first element, and sequentially hash the next one into it
  let currentHash = elements[0];
  for (let i = 1; i < elements.length; i++) {
    currentHash = await hashPair(bb, currentHash, elements[i]);
  }
  return currentHash;
}

// 3. Match the Noir Circuit Exactly!
export async function createFinalMerkleLeaf(
  bb: Barretenberg, secret: string, privateLicenseData: string, publicName: string
): Promise<string> {
  // Hash the first two, then hash the result with the third
  const tempHash = await hashPair(bb, secret, privateLicenseData);
  return await hashPair(bb, tempHash, stringToFieldHex(publicName));
}

export function toFieldHex(value: string | number | bigint): string {
  if (typeof value === 'string' && value.startsWith('0x')) return '0x' + value.slice(2).padStart(64, '0');
  if (typeof value === 'string') return '0x' + BigInt(value).toString(16).padStart(64, '0');
  return '0x' + BigInt(value).toString(16).padStart(64, '0');
}

export function stringToFieldHex(text: string): string {
  const bytes = new TextEncoder().encode(text).slice(0, 31);
  let hex = '';
  for (const b of bytes) hex += b.toString(16).padStart(2, '0');
  return '0x' + hex.padStart(64, '0');
}