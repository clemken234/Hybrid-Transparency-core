import { LTOMerkleTree } from './merkleTree.js';
async function runManualTest() {
    console.log("Starting Manual Merkle Tree Math Test...\n");

    // These are the exact Hexadecimal leaf hashes from your MongoDB screenshots
    // Index 0
    const lorenaHash = "0x2fb26680753a84a125f82c3583725d1db44d98ea21aa2a8b7e8a11eb36436bba";
    // Index 1
    const enriqueHash = "0x1eaee6ef107cecccd76424b92959d0db18f06711edc88fb2e73249c8616eafd5";

    const tree = new LTOMerkleTree();

    // Initialize the tree with only these two users
    console.log("Feeding leaves to Poseidon2 engine...");
    await tree.initialize([lorenaHash, enriqueHash]);

    // Calculate the Root
    const calculatedRoot = await tree.getRoot();

    console.log("\n==================================================");
    console.log(" 🧪 MANUAL TEST CALCULATED ROOT:");
    console.log(" " + calculatedRoot);
    console.log("==================================================\n");
}

runManualTest().catch(console.error);