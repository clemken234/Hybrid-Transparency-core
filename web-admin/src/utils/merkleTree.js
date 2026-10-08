import { Barretenberg } from '@aztec/bb.js';

// 1. The Ultimate Bypass: Convert hex strings directly to raw C++ readable bytes
function hexToBytes(hex) {
    const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
    const padded = clean.padStart(64, '0');
    const bytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
        bytes[i] = parseInt(padded.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
}

export class LTOMerkleTree {
    constructor() {
        this.leaves = [];
        this.bb = null;
        this.zeroHashes = [];
        this.DEPTH = 20;
    }

    _toPaddedHex(val) {
        if (val === "0" || !val) return "0x" + "00".repeat(32);
        let hex = typeof val === "string" && val.startsWith("0x") ? val : "0x" + BigInt(val).toString(16);
        return "0x" + hex.replace("0x", "").padStart(64, "0");
    }

    // 2. Pure Byte Array Hashing (NO Fr REQUIRED)
    async _hashPair(leftStr, rightStr) {
        const lHex = this._toPaddedHex(leftStr);
        const rHex = this._toPaddedHex(rightStr);

        // Pass the raw byte arrays exactly like the Citizen side
        const { hash } = await this.bb.poseidon2Hash({
            inputs: [hexToBytes(lHex), hexToBytes(rHex)]
        });

        return '0x' + Array.from(hash).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async initialize(existingLeaves = []) {
        if (!this.bb) {
            this.bb = await Barretenberg.new();
        }

        const ZERO_HASH = "0x" + "00".repeat(32);
        this.zeroHashes = [ZERO_HASH];

        for (let i = 0; i < this.DEPTH; i++) {
            const nextZero = await this._hashPair(this.zeroHashes[i], this.zeroHashes[i]);
            this.zeroHashes.push(nextZero);
        }

        this.leaves = existingLeaves.map(l => this._toPaddedHex(l));
    }

    async insert(leaf) {
        this.leaves.push(this._toPaddedHex(leaf));
        return await this.getRoot();
    }

    async getRoot() {
        if (this.leaves.length === 0) {
            return this.zeroHashes[this.DEPTH];
        }

        let currentLevel = [...this.leaves];

        for (let level = 0; level < this.DEPTH; level++) {
            const nextLevel = [];
            for (let i = 0; i < currentLevel.length; i += 2) {
                const leftStr = currentLevel[i];
                const rightStr = (i + 1 < currentLevel.length) ? currentLevel[i + 1] : this.zeroHashes[level];

                const hash = await this._hashPair(leftStr, rightStr);
                nextLevel.push(hash);
            }
            currentLevel = nextLevel;
        }
        return currentLevel[0];
    }

    async getProof(index) {
        let proof = [];
        let currentLevel = [...this.leaves];
        let idx = index;

        for (let level = 0; level < this.DEPTH; level++) {
            const nextLevel = [];
            const isRight = idx % 2 === 1;
            const siblingIdx = isRight ? idx - 1 : idx + 1;

            let sibling = (siblingIdx < currentLevel.length) ? currentLevel[siblingIdx] : this.zeroHashes[level];
            proof.push(this._toPaddedHex(sibling));

            for (let i = 0; i < currentLevel.length; i += 2) {
                const leftStr = currentLevel[i];
                const rightStr = (i + 1 < currentLevel.length) ? currentLevel[i + 1] : this.zeroHashes[level];

                const hash = await this._hashPair(leftStr, rightStr);
                nextLevel.push(hash);
            }

            currentLevel = nextLevel;
            idx = Math.floor(idx / 2);
        }

        return proof;
    }
}