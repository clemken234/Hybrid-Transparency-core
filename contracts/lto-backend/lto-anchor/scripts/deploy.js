const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying LTO Registry (Poseidon2 Hybrid Architecture)...");

  const LTORegistry = await hre.ethers.getContractFactory("LTORegistry");
  const contract = await LTORegistry.deploy({ gasLimit: 5000000 });

  await contract.waitForDeployment();

  console.log(`🎉 SUCCESS! LTO Registry is FINALLY deployed to: ${contract.target}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});