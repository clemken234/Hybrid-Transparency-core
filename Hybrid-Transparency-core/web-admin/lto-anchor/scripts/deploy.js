import hre from "hardhat";

async function main() {
  console.log("Deploying LTO Registry to Sepolia...");

  const LTORegistry = await hre.ethers.getContractFactory("LTORegistry");
  const contract = await LTORegistry.deploy();

  await contract.waitForDeployment();
  console.log(`✅ Deployed successfully to: ${contract.target}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});