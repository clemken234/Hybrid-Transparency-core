const hre = require("hardhat");

async function main() {
    console.log("Deploying Public Anchor to Sepolia...");
    const LTOAnchor = await hre.ethers.getContractFactory("LTOAnchor");
    const anchor = await LTOAnchor.deploy();
    await anchor.waitForDeployment();
    console.log(`✅ Anchor deployed to: ${anchor.target}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});