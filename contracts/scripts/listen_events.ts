import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const registryAddress = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";

    // Load ABI from artifacts
    const artifactPath = path.resolve(__dirname, "../artifacts/contracts/LTORegistry.sol/LTORegistry.json");
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    const abi = artifact.abi;

    const registry = new ethers.Contract(registryAddress, abi, provider);

    console.log(`🔌 Connected to LTORegistry at: ${registryAddress}`);
    console.log(`🎧 Radar is online. Listening for live events...`);
    console.log(`(Waiting for someone to click a button on the frontend...)`);

    // Listen for the LicenseIssued Event
    registry.on("LicenseIssued", (executor, leafCommitment, timestamp) => {
        console.log(`\n[EVENT CAUGHT] NEW LICENSE ISSUED!`);
        console.log(`Executed By:  ${executor}`);
        console.log(`Driver Hash:  ${leafCommitment}`);
        console.log(`Time:         ${new Date(Number(timestamp) * 1000).toLocaleString()}`);
    });

    // Listen for the LicenseRevoked Event
    registry.on("LicenseRevoked", (executor, index, timestamp) => {
        console.log(`\n [EVENT CAUGHT] LICENSE REVOKED!`);
        console.log(`Executed By:  ${executor}`);
        console.log(`Tree Index:   ${index}`);
        console.log(`Time:         ${new Date(Number(timestamp) * 1000).toLocaleString()}`);
    });

    // Keep the process alive
    process.stdin.resume();
}

main().catch((error) => {
    console.error("Fatal error in listener:", error);
});
