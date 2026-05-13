import { Noir } from '@noir-lang/noir_js';
import { UltraHonkBackend } from '@noir-lang/backend_barretenberg';
import circuit from './hybrid_transparency.json';
import { toFieldHex, stringToFieldHex } from '../lib/commitment';


/**
 * Generates a real ZK-SNARK proof using NoirJS and Barretenberg.
 */
export async function generateIdentityProof(
  secret: string, 
  privateLicenseData: string,  
  merklePath: string[], 
  leafIndex: number,
  publicName: string,
  publicMerkleRoot: string
) {
  try {
    console.log("🚀 Starting Real ZK Proof Generation...");
    
    // 1. Initialize Backend and Noir correctly
    // We pass 'circuit as any' to bypass strict TS constructor checks
    const backend = new UltraHonkBackend(circuit as any);
    const noir = new Noir(circuit as any);
    const paddedPath = [...merklePath];
    
    // We fill the remaining empty slots with 64-character hex zeros until it hits 20
    while (paddedPath.length < 20) {
      paddedPath.push("0x0000000000000000000000000000000000000000000000000000000000000000");
    }

    // 2. Prepare Inputs
    const inputs = {
      secret: toFieldHex(secret),
      private_license_data: toFieldHex(privateLicenseData),
      
      // Use the new paddedPath here instead of the raw merklePath!
      merkle_path: paddedPath.map(p => p.startsWith('0x') ? p : toFieldHex(p)),
      
      leaf_index: leafIndex.toString(), 
      public_name: toFieldHex(publicName),
      public_merkle_root: toFieldHex(publicMerkleRoot)
    };

    console.log("📥 Circuit Inputs Ready:", inputs);
    // 3. Generate Witness (Checking the Math)
    console.log("⚙️ Calculating witness...");
    const { witness } = await noir.execute(inputs);
    
    // 4. Generate Proof bytes
    console.log("⚙️ Generating proof payload (This takes a few seconds)...");
    const proof = await backend.generateProof(witness);

    console.log("✅ ZK Proof Generated successfully!");

    // 5. Safely convert Uint8Array to Hex string without using Node.js Buffers
    // We add '|| proof' as a bulletproof fallback for different bb.js versions
    // We use '(b: any)' so TypeScript stops crying about implicit any types
    const actualProofBytes = proof.proof || proof; 
    const proofHex = "0x" + Array.from(actualProofBytes)
      .map((b: any) => b.toString(16).padStart(2, "0"))
      .join("");

    return {
      proof: proofHex,
      publicInputs: proof.publicInputs || [],
    };
  } catch (error) {
    console.error("❌ ZK Proof Generation failed:", error);
    throw error;
  }
}