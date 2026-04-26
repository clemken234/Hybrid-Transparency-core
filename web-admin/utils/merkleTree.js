// utils/merkleTree.js
import { LeanIMT } from "@zk-kit/lean-imt";
import { ethers } from 'ethers';

export class LTOMerkleTree {
    constructor() {
        this.tree = null;
    }

    async initialize(existingLeaves = []) {
        // 🛡️ THE FIX: We change "bytes32" to "string" so it never crashes on short values.
        // We also use a flexible function signature to catch whatever LeanIMT throws at it.
        const hashFunction = (...args) => {
            const nodes = Array.isArray(args[0]) ? args[0] : args;
            return ethers.solidityPackedKeccak256(
                ["string", "string"], 
                [String(nodes[0]), String(nodes[1])]
            );
        };

        this.tree = new LeanIMT(hashFunction);

        for (let leaf of existingLeaves) {
            this.tree.insert(leaf);
        }
    }

    insert(leaf) {
        this.tree.insert(leaf);
        return this.tree.root.toString();
    }

    getRoot() {
        if (this.tree.leaves.length === 0) return "0";
        return this.tree.root.toString();
    }
}