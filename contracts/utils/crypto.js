// utils/crypto.js
import { ethers } from 'ethers';
import { Barretenberg, Fr } from '@aztec/bb.js'; // Notice: We import Barretenberg and Fr!
import 'dotenv/config';

// --- ECDSA ADMIN WALLET ---
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;
if (!ADMIN_PRIVATE_KEY) throw new Error("CRITICAL: ADMIN_PRIVATE_KEY missing from .env");
const adminWallet = new ethers.Wallet(ADMIN_PRIVATE_KEY);

// --- 🛑 POSEIDON ZKP LEAF GENERATOR 🛑 ---
export async function createFinalMerkleLeaf(secret, private_license_data, public_name) {
    // 1. Turn on the WebAssembly Poseidon Engine first!
    const bb = await Barretenberg.new();

    // 2. Format your fields using Fr exactly like yesterday
    const secretField = Fr.fromString(secret || "0");
    const privateDataField = Fr.fromString(private_license_data || "0");
    const publicNameField = Fr.fromString(public_name || "0");

    // 3. Run the pure poseidon2Hash math! (Matches your Leader exactly)
    const leafHashField = await bb.poseidon2Hash([secretField, privateDataField, publicNameField]);
    
    return leafHashField.toString(); 
}

// --- 🛡️ ECDSA RUBBER STAMP ---
export async function signCredential(finalLeafHash, licenseID) {
    const messageString = JSON.stringify({ leaf: finalLeafHash, id: licenseID });
    const signature = await adminWallet.signMessage(messageString); 
    
    return {
        signature: signature,
        signedBy: adminWallet.address
    };
}