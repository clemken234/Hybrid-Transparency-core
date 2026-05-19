import { Barretenberg } from '@aztec/bb.js';
import { toFieldHex, fieldHexToBytes } from './commitment';

async function verifyGoldenRoot() {
    console.log("🚀 Booting up Aztec Barretenberg...");
    const bb = await Barretenberg.new();

    async function hashNode(leftStr: string, rightStr: string) {
        // @ts-ignore: Beta types desync bypass
        const response = await bb.poseidon2Hash({ inputs: [fieldHexToBytes(leftStr), fieldHexToBytes(rightStr)] });
        let hashResult: any = response;
        if (typeof response === 'object' && response !== null && !(response instanceof Uint8Array)) {
            hashResult = (response as any).output || (response as any).hash || Object.values(response)[0];
        }
        if (typeof hashResult === 'string') return hashResult.startsWith('0x') ? hashResult : `0x${hashResult}`;
        return "0x" + Array.from(hashResult as unknown as Uint8Array).map((b: any) => b.toString(16).padStart(2, "0")).join("");
    }

    // 1. The exact leaves extracted from your Next.js console logs
    const lorenaLeafHex = "0x2fb26680753a84a125f82c3583725d1db44d98ea21aa2a8b7e8a11eb36436bba";
    const enriqueLeafHex = "0x1eaee6ef107cecccd76424b92959d0db18f06711edc88fb2e73249c8616eafd5";

    console.log("🍃 Leaf 0 (Lorena):", lorenaLeafHex);
    console.log("🍃 Leaf 1 (Enrique):", enriqueLeafHex);

    // 2. Precompute the Empty Subtree Hashes
    const DEPTH = 20;
    const ZERO_HASH = "0x0000000000000000000000000000000000000000000000000000000000000000";
    const zeroHashes: string[] = [toFieldHex(ZERO_HASH)];

    for (let i = 0; i < DEPTH; i++) {
        const prevZero = toFieldHex(zeroHashes[i]);
        const nextZero = await hashNode(prevZero, prevZero);
        zeroHashes.push(nextZero);
    }

    // 3. Hash Lorena and Enrique together to create the Level 1 Node
    const left = toFieldHex(lorenaLeafHex);
    const right = toFieldHex(enriqueLeafHex);
    let currentNode = await hashNode(left, right);
    
    console.log("🌿 Level 1 Node (Lorena + Enrique):", currentNode);

    // 4. Climb the remaining 19 levels of the tree
    // Since there are no more real users, we hash our current node with the precomputed empty subtrees
    for (let level = 1; level < DEPTH; level++) {
        const currentHex = toFieldHex(currentNode);
        const emptySiblingHex = toFieldHex(zeroHashes[level]);
        
        // The real users are on the left side of the tree, so the empty branches are always on the right
        currentNode = await hashNode(currentHex, emptySiblingHex);
    }

    // 5. Format and verify the Final Root
    const calculatedRoot = toFieldHex(currentNode);
    const expectedGoldenRoot = "0x0a99ea28ab8d7f550dcf68074c62ebe3551ef84480d9bce92e2d5c5f5e3b03cc";

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
