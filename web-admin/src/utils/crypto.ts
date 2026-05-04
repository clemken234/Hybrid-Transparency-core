// TODO (groupmate): This file is DEAD CODE — nothing imports it.
// The correct leaf hash implementation is in src/lib/commitment.ts (computeLeafHash).
// Also, the poseidon2Hash call below uses the OLD API signature:
//   bb.poseidon2Hash([secretField, ...])       ← WRONG (old array style)
// The current @aztec/bb.js API expects:
//   bb.poseidon2Hash({ inputs: [...] })         ← CORRECT (matches lib/commitment.ts)
// Either delete this file or fix+re-export from lib/commitment.ts.
import { ethers } from 'ethers';
import { Barretenberg, Fr } from '@aztec/bb.js';

/**
 * POSEIDON ZKP LEAF GENERATOR
 * Computes the final Merkle leaf hash using Poseidon2 hashing.
 */
export async function createFinalMerkleLeaf(
    secret: string, 
    private_license_data: string, 
    public_name: string
): Promise<string> {
    // 1. Turn on the WebAssembly Poseidon Engine
    const bb = await Barretenberg.new();

    try {
        // 2. Format your fields using Fr
        const secretField = Fr.fromString(secret || "0");
        const privateDataField = Fr.fromString(private_license_data || "0");
        const publicNameField = Fr.fromString(public_name || "0");

        // 3. Run the pure poseidon2Hash math! (Matches your Leader exactly)
        const leafHashField = await bb.poseidon2Hash([
            secretField, 
            privateDataField, 
            publicNameField
        ]);
        
        return leafHashField.toString(); 
    } finally {
        // Always destroy the bb instance to free memory
        await bb.destroy();
    }
}

/**
 * ECDSA RUBBER STAMP
 * Signs a credential with the Admin wallet to prove authenticity.
 */
export async function signCredential(finalLeafHash: string, licenseID: string) {
    const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;
    if (!ADMIN_PRIVATE_KEY) {
        throw new Error("CRITICAL: ADMIN_PRIVATE_KEY missing from environment variables");
    }

    const adminWallet = new ethers.Wallet(ADMIN_PRIVATE_KEY);
    const messageString = JSON.stringify({ leaf: finalLeafHash, id: licenseID });
    const signature = await adminWallet.signMessage(messageString); 
    
    return {
        signature: signature,
        signedBy: adminWallet.address
    };
}
