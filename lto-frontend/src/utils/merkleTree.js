import * as Aztec from '@aztec/bb.js';
const { Barretenberg, Fr } = Aztec;

/**
 * LTOMerkleTree
 * Hardcoded to Depth 20 to match Noir ZK Circuit constraints.
 */
export class LTOMerkleTree {
    constructor() {
        this.leaves = [];
        this.bb = null;
        this.zeroHashes = [];
        this.DEPTH = 20;
    }

    // 1. SAFETY HELPER: Ensures all inputs are Hex strings
    _toHex(val) {
        if (val === "0" || !val) return "0";
        if (typeof val === "string" && val.startsWith("0x")) return val;
        return "0x" + BigInt(val).toString(16); 
    }

    // 2. OUTPUT HELPER: Formats output exactly like your frontend dev's code
    _toPaddedHex(val) {
        return "0x" + BigInt(val).toString(16).padStart(64, "0");
    }

    async initialize(existingLeaves = []) {
        this.bb = await Barretenberg.new();

        const ZERO_VALUE = "0x0000000000000000000000000000000000000000000000000000000000000000";
        this.zeroHashes = [Fr.fromString(ZERO_VALUE).toString()];

        for (let i = 0; i < this.DEPTH; i++) {
            const prevZero = Fr.fromString(this.zeroHashes[i]);
            const nextZero = await this.bb.pedersenHash([prevZero, prevZero], 0);
            this.zeroHashes.push(nextZero.toString());
        }

        // Apply input safety
        this.leaves = existingLeaves.map(l => this._toHex(l));
    }

    async insert(leaf) {
        this.leaves.push(this._toHex(leaf));
        return await this.getRoot();
    }

    async getRoot() {
        if (this.leaves.length === 0) {
            return this._toPaddedHex(this.zeroHashes[this.DEPTH]);
        }

        let currentLevel = this.leaves.map(l => {
            if (l === "0" || !l) return this.zeroHashes[0];
            return Fr.fromString(l).toString();
        });

        for (let level = 0; level < this.DEPTH; level++) {
            const nextLevel = [];

            for (let i = 0; i < currentLevel.length; i += 2) {
                const leftStr = currentLevel[i];
                const rightStr = (i + 1 < currentLevel.length) ? currentLevel[i + 1] : this.zeroHashes[level];

                const left = Fr.fromString(leftStr);
                const right = Fr.fromString(rightStr);

                const hash = await this.bb.pedersenHash([left, right], 0);
                nextLevel.push(hash.toString());
            }
            currentLevel = nextLevel;
        }

        // THE FIX: Return the root formatted exactly like his!
        return this._toPaddedHex(currentLevel[0]);
    }

    async getProof(index) {
        let proof = [];
        let currentLevel = this.leaves.map(l => {
            if (l === "0" || !l) return this.zeroHashes[0];
            return Fr.fromString(l).toString();
        });

        let idx = index;

        for (let level = 0; level < this.DEPTH; level++) {
            const nextLevel = [];
            const isRight = idx % 2 === 1;
            const siblingIdx = isRight ? idx - 1 : idx + 1;

            let sibling;
            if (siblingIdx < currentLevel.length) {
                sibling = currentLevel[siblingIdx];
            } else {
                sibling = this.zeroHashes[level];
            }
            
            // THE FIX: Format the proof array elements exactly like his!
            proof.push(this._toPaddedHex(sibling));

            for (let i = 0; i < currentLevel.length; i += 2) {
                const leftStr = currentLevel[i];
                const rightStr = (i + 1 < currentLevel.length) ? currentLevel[i + 1] : this.zeroHashes[level];

                const hash = await this.bb.pedersenHash([Fr.fromString(leftStr), Fr.fromString(rightStr)], 0);
                nextLevel.push(hash.toString());
            }

            currentLevel = nextLevel;
            idx = Math.floor(idx / 2);
        }

        return proof;
    }
}