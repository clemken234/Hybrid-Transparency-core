const hre = require("hardhat");

async function main() {
    // Your current local contract address
    const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

    // Fetch the contract instance (Make sure "LTORegistry" matches your exact contract name)
    const registry = await hre.ethers.getContractAt("LTORegistry", contractAddress);

    console.log("\n[ SYSTEM ] Fetching Merkle Tree data from Local Blockchain...\n");

    // Fetch all leaves (User Hashes)
    const leaves = await registry.getAllLeaves();

    console.log("==================================================");
    console.log("          MERKLE LEAVES (DATABASE HASHES)         ");
    console.log("==================================================");

    if (leaves.length === 0) {
        console.log("Status: Empty. Please activate User 0 and User 1 via the dashboard first.");
    } else {
        leaves.forEach((leaf, index) => {
            console.log(`User ${index} Leaf Hash : ${leaf.toString()}`);
        });
    }

    // Fetch the Root (The public anchor)
    const root = await registry.getRoot();
    console.log("\n==================================================");
    console.log("           MERKLE ROOT (PUBLIC ANCHOR)            ");
    console.log("==================================================");
    console.log(`Root Hash         : ${root.toString()}\n`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});