import { Barretenberg, Fr } from '@aztec/bb.js';

async function main() {
    console.log("🚀 Booting up Aztec Barretenberg...");
    const bb = await Barretenberg.new();

    const name = Fr.fromString("0x00000000000000000000000000000000000000456e726971756520536f6c6973");
    const license = Fr.fromString("0x0dcbcae3bbe16203a1f4315133e825effd3e1e220e3fc9ae179f7b5849f626aa");
    const jsInnerHash = await bb.pedersenHash([license, name], 0);
    console.log("JS hash_2 result:", "0x" + BigInt(jsInnerHash.toString()).toString(16).padStart(64, '0'));
}

main().catch(console.error);