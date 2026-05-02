import * as bip39 from "bip39";

/**
 * Converts a 0x-prefixed 32-byte hex secret (from generateSecret()) into a
 * 24-word BIP-39 mnemonic. The user writes this down for cross-device recovery.
 */
export function secretToMnemonic(hexSecret: string): string {
  const hex = hexSecret.replace("0x", "").toLowerCase().padStart(64, "0");
  return bip39.entropyToMnemonic(hex);
}

/**
 * Recovers the 32-byte hex secret from a 24-word BIP-39 mnemonic.
 * Throws if the mnemonic is invalid or has wrong checksum.
 */
export function mnemonicToSecret(mnemonic: string): string {
  const cleaned = mnemonic.trim().toLowerCase().replace(/\s+/g, " ");
  if (!bip39.validateMnemonic(cleaned)) {
    throw new Error("Invalid recovery phrase. Check each word and try again.");
  }
  return "0x" + bip39.mnemonicToEntropy(cleaned);
}

export function validateMnemonic(mnemonic: string): boolean {
  return bip39.validateMnemonic(mnemonic.trim().toLowerCase().replace(/\s+/g, " "));
}
