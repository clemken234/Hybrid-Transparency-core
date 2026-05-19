import { Barretenberg } from '@aztec/bb.js';
import { toFieldHex, fieldHexToBytes } from './commitment';

async function main() {
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

    const name = toFieldHex("0x00000000000000000000000000000000000000456e726971756520536f6c6973");
    const license = toFieldHex("0x0dcbcae3bbe16203a1f4315133e825effd3e1e220e3fc9ae179f7b5849f626aa");
    const jsInnerHash = await hashNode(license, name);
    console.log("JS hash_2 result:", jsInnerHash);
}

main().catch(console.error);