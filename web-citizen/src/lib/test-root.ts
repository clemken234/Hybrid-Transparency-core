import { Barretenberg, Fr } from '@aztec/bb.js';



async function verifyGoldenRoot() {
    console.log("🚀 Booting up Aztec Barretenberg...");
    const bb = await Barretenberg.new();

    // 1. The exact leaves extracted from your Next.js console logs
    const lorenaLeafHex = "0x1d6d7bb347ca85eae52c2ef28497e115c2b39448ad781adb834930599e82febd";
    const enriqueLeafHex = "0x2956ea086dcf42378686ed0d03f8ffbaf49c3fb4e66faf49426917e00679c6fc";

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
    const expectedGoldenRoot = "0x06e8dcb488d9c059cf09e302334cca9444bfafa777376527d2b1de086819a626";

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

