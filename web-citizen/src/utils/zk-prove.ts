import { Noir } from '@noir-lang/noir_js';
import { Barretenberg, UltraHonkBackend } from '@aztec/bb.js';
import circuit from './hybrid_transparency.json';
import { toFieldHex } from '../lib/commitment';

export async function generateIdentityProof(
  secret: string,
  privateLicenseData: string,
  merklePath: string[],
  leafIndex: number,
  publicName: string,
  publicMerkleRoot: string
) {
  // Declare outside to save your RAM in the finally block!
  let bb: any = null;

  try {
    console.log("🚀 Starting Real ZK Proof Generation...");

    // 1. Get the base64 bytecode string (UltraHonkBackend expects the string, not decoded bytes)
    const acirBytecode: string = (circuit as any).bytecode || "";

    // 2. Boot the Barretenberg WASM engine
    console.log("⚙️ Booting Barretenberg WASM Engine...");
    bb = await Barretenberg.new({ threads: 1 });

    // 3. Pass the base64 string + Barretenberg instance (matches the constructor signature)
    const backend = new UltraHonkBackend(acirBytecode, bb);
    const noir = new Noir(circuit as any);

    // Safely pad the Merkle path to 20 elements
    const paddedPath = [...merklePath];
    while (paddedPath.length < 20) {
      paddedPath.push("0x0000000000000000000000000000000000000000000000000000000000000000");
    }

    // Format inputs
    const inputs = {
      secret: toFieldHex(secret),
      private_license_data: toFieldHex(privateLicenseData),
      merkle_path: paddedPath.map(p => p.startsWith('0x') ? p : toFieldHex(p)),
      leaf_index: leafIndex.toString(),
      public_name: toFieldHex(publicName),
      public_merkle_root: toFieldHex(publicMerkleRoot)
    };

    console.log("⚙️ Calculating witness...");
    const { witness } = await noir.execute(inputs);

    console.log("⚙️ Generating proof payload...");
    const { proof, publicInputs } = await backend.generateProof(witness);

    // Typecast 'proof' to silence TypeScript
    const proofHex = "0x" + Array.from(proof as Uint8Array)
      .map((b: any) => b.toString(16).padStart(2, "0"))
      .join("");

    return {
      proof: proofHex,
      publicInputs,
    };
  } catch (error) {
    console.error("❌ ZK Proof Generation failed:", error);
    throw error;
  } finally {
    if (bb) {
      await bb.destroy();
    }
  }
}