const { ethers } = require("hardhat");

async function main() {
    // 1. The address you JUST deployed!
    const CONTRACT_ADDRESS = "0x44f476BB30ffC93a5cB9Ba3bDB6563D53D18663e";

    // 2. Connect to the contract
    const LTORegistry = await ethers.getContractFactory("LTORegistry");
    const contract = LTORegistry.attach(CONTRACT_ADDRESS);

    console.log("🔗 Connected to LTO Registry at:", CONTRACT_ADDRESS);

    // ==========================================
    // TEST 1: ISSUE A LICENSE
    // ==========================================
    console.log("\n📝 Testing Issue License...");

    // Fake dummy data from your Poseidon2 math
    const dummyLeafHash = "123456789";
    const dummyNewRoot = "987654321";

    // Send transaction to the blockchain
    const issueTx = await contract.issueLicense(dummyLeafHash, dummyNewRoot);
    console.log("⏳ Waiting for blockchain to mine transaction...");
    await issueTx.wait(); // wait for the block to be confirmed
    console.log("✅ Success! License Issued.");

    // Check the storage to see if it saved!
    const currentLeaves = await contract.getAllLeaves();
    console.log("📦 Current Drivers in Database:", currentLeaves);


    // ==========================================
    // TEST 2: REVOKE A LICENSE
    // ==========================================
    console.log("\n🚨 Testing Revoke License...");

    const driverIndexToRevoke = 0; // We will revoke the first driver we just added
    const rootAfterRevoke = "555555555"; // Fake root after math

    const revokeTx = await contract.revokeLicense(driverIndexToRevoke, rootAfterRevoke);
    console.log("⏳ Waiting for blockchain to mine transaction...");
    await revokeTx.wait();
    console.log("✅ Success! License Revoked.");

    // Check the storage again (The first driver should now be '0')
    const updatedLeaves = await contract.getAllLeaves();
    console.log("📦 Updated Drivers in Database:", updatedLeaves);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});