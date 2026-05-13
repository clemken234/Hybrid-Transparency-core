import { LTOMerkleTree } from './merkleTree.js';
async function runManualTest() {
    console.log("Starting Manual Merkle Tree Math Test...\n");

    // These are the exact Hexadecimal leaf hashes from your MongoDB screenshots
    // Index 0
    const lorenaHash = "0x21bc90e5b47f11f172e79bfb3c3b65d2a1ca6999793ab846352f283442532c8b";
    // Index 1
    const enriqueHash = "0x20843a0db3a6160d93e5d8f9f7ca5e4328ce82b90785251da4ed080a8eca616d";

    const tree = new LTOMerkleTree();

    // Initialize the tree with only these two users
    console.log("Feeding leaves to Pedersen engine...");
    await tree.initialize([lorenaHash, enriqueHash]);

    // Calculate the Root
    const calculatedRoot = await tree.getRoot();

    console.log("\n==================================================");
    console.log(" 🧪 MANUAL TEST CALCULATED ROOT:");
    console.log(" " + calculatedRoot);
    console.log("==================================================\n");
}

runManualTest().catch(console.error);