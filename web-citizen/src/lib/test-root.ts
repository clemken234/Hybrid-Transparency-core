import { Barretenberg, Fr } from '@aztec/bb.js';



async function verifyGoldenRoot() {
    console.log("🚀 Booting up Aztec Barretenberg...");
    const bb = await Barretenberg.new();

    // 1. The exact leaves extracted from your Next.js console logs
    const lorenaLeafHex = "0x21bc90e5b47f11f172e79bfb3c3b65d2a1ca6999793ab846352f283442532c8b";
    const enriqueLeafHex = "0x20843a0db3a6160d93e5d8f9f7ca5e4328ce82b90785251da4ed080a8eca616d";

    console.log("🍃 Leaf 0 (Lorena):", lorenaLeafHex);
    console.log("🍃 Leaf 1 (Enrique):", enriqueLeafHex);

    // 2. Precompute the Empty Subtree Hashes
    const DEPTH = 20;
    const ZERO_HASH = "0x0000000000000000000000000000000000000000000000000000000000000000";
    const zeroHashes: string[] = [Fr.fromString(ZERO_HASH).toString()];

    for (let i = 0; i < DEPTH; i++) {
        const prevZero = Fr.fromString(zeroHashes[i]);
        const nextZero = await bb.pedersenHash([prevZero, prevZero], 0);
        zeroHashes.push(nextZero.toString());
    }

    // 3. Hash Lorena and Enrique together to create the Level 1 Node
    const left = Fr.fromString(lorenaLeafHex);
    const right = Fr.fromString(enriqueLeafHex);
    let currentNode = await bb.pedersenHash([left, right], 0);
    
    console.log("🌿 Level 1 Node (Lorena + Enrique):", "0x" + BigInt(currentNode.toString()).toString(16).padStart(64, '0'));

    // 4. Climb the remaining 19 levels of the tree
    // Since there are no more real users, we hash our current node with the precomputed empty subtrees
    for (let level = 1; level < DEPTH; level++) {
        const currentFr = Fr.fromString(currentNode.toString());
        const emptySiblingFr = Fr.fromString(zeroHashes[level]);
        
        // The real users are on the left side of the tree, so the empty branches are always on the right
        currentNode = await bb.pedersenHash([currentFr, emptySiblingFr], 0);
    }

    // 5. Format and verify the Final Root
    const calculatedRoot = "0x" + BigInt(currentNode.toString()).toString(16).padStart(64, '0');
    const expectedGoldenRoot = "0x0bb86687610da898dd8c939cc18d9327d5c23b566faaaed615c2391e2e4c3eb2";

    console.log("\n==========================================");
    console.log("🎯 Calculated Root:", calculatedRoot);
    console.log("🏆 Expected Root:  ", expectedGoldenRoot);
    console.log("==========================================\n");

    if (calculatedRoot === expectedGoldenRoot) {
        console.log("✅ MATCH! Your Depth-20 Merkle math is mathematically perfect.");
        console.log("👉 Next Step: Faye must generate this exact root on her backend and send it to the smart contract.");
    } else {
        console.log("❌ MISMATCH. The universe is broken.");
    }
}

verifyGoldenRoot().catch(console.error);

