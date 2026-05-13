import { Barretenberg, Fr } from '@aztec/bb.js';

/**
 * Retrieves the citizen's existing secret
 */
export function getOrGenerateSecret(): string {
  // Check if they already have a secret saved
  const existingSecret = localStorage.getItem('lto_secret');
  if (existingSecret) {
    return existingSecret;
  }

  // If new, generate a cryptographically secure 256-bit secret
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const newSecret = "0x" + Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
  
  // SAVE IT so they don't lose their license!
  localStorage.setItem('lto_secret', newSecret);
  
  return newSecret;

}

/**
 * Hashes the citizen's sensitive license details (e.g., ID number, issue date)
 * into a single Field element using Pedersen Hash. 
 * This keeps the raw data off the public Merkle Tree.
 */
export async function computePrivateLicenseData(
  licenseID: string,
  firstName: string,
  lastName: string,
  dateOfBirth: string,
  licenseType: string,
  expirationDate: string,
  restrictions: string,
  conditions: string,
  bloodType: string,
  address: string,
  ltoSignature: string,
): Promise<string> {
  
  // 1. Boot up the Aztec math engine
  const bb = await Barretenberg.new();

  // 2. Convert the raw strings into Finite Fields safely
  const idFr = Fr.fromString(stringToFieldHex(licenseID));
  const typeFr = Fr.fromString(stringToFieldHex(licenseType));
  const firstNameFr = Fr.fromString(stringToFieldHex(firstName));
  const lastNameFr = Fr.fromString(stringToFieldHex(lastName));
  const dateOfBirthFr = Fr.fromString(stringToFieldHex(dateOfBirth));
  const expirationDateFr = Fr.fromString(stringToFieldHex(expirationDate));
  const restrictionsFr = Fr.fromString(stringToFieldHex(restrictions));
  const conditionsFr = Fr.fromString(stringToFieldHex(conditions));
  const bloodTypeFr = Fr.fromString(stringToFieldHex(bloodType));
  const addressFr = Fr.fromString(stringToFieldHex(address));
  const ltoSignatureFr = Fr.fromString(stringToFieldHex(ltoSignature));

  // 3. Hash them together using Pedersen
  const hashedData = await bb.pedersenHash([idFr, typeFr, firstNameFr, lastNameFr, dateOfBirthFr, expirationDateFr, restrictionsFr, conditionsFr, bloodTypeFr, addressFr, ltoSignatureFr], 0);

  // 4. Return the hex string to be used in the Final Merkle Leaf
  return "0x" + BigInt(hashedData.toString()).toString(16).padStart(64, "0");
}

/**
 * Computes the Merkle leaf commitment: Poseidon([secret, private_license_data, public_name]).
 * Uses Aztec's native Pedersen Hash to guarantee 100% Hash Parity with your Noir Circuit.
 * * NOTE: This is async now because Barretenberg WASM needs to load!
 */
export async function createFinalMerkleLeaf(
  secret: string,
  privateLicenseData: string,
  publicName: string
): Promise<string> {
  
  // 1. Initialize Aztec's exact math engine
  const bb = await Barretenberg.new();

  // 2. Wrap our raw inputs into Fr (Finite Field) elements
  const secretFr = Fr.fromString(secret);
  const privateDataFr = Fr.fromString(privateLicenseData);
  const publicNameFr = Fr.fromString(stringToFieldHex(publicName));

  // 3. Hash them together using the native C++ engine
  const hashField = await bb.pedersenHash([secretFr, privateDataFr, publicNameFr], 0);
  
  // 4. Return the hex string. THIS is what you send to the LTO Admin.
  return "0x" + BigInt(hashField.toString()).toString(16).padStart(64, "0");
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