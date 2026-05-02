import { ethers } from "@nomicfoundation/hardhat-ethers/internal/ethers-provider-wrapper.js";
import hre from "hardhat";

// Hardhat v3: ethers is injected via hre at runtime
const ethersPlugin = (await import("@nomicfoundation/hardhat-ethers")).default;
await ethersPlugin.extendEnvironment?.(hre);
const ethers = hre.ethers ?? (await import("ethers"));

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  console.log("1. Deploying PoseidonT3...");
  const PoseidonT3 = await ethers.getContractFactory("poseidon-solidity/PoseidonT3.sol:PoseidonT3");
  const poseidonT3 = await PoseidonT3.deploy();
  await poseidonT3.waitForDeployment();
  console.log("   PoseidonT3:", poseidonT3.target);

  console.log("2. Deploying LeanIMT...");
  const LeanIMT = await ethers.getContractFactory("LeanIMT", {
    libraries: { "poseidon-solidity/PoseidonT3.sol:PoseidonT3": poseidonT3.target },
  });
  const leanIMT = await LeanIMT.deploy();
  await leanIMT.waitForDeployment();
  console.log("   LeanIMT:", leanIMT.target);

  console.log("3. Deploying LTORegistry...");
  const LTORegistry = await ethers.getContractFactory("LTORegistry", {
    libraries: { LeanIMT: leanIMT.target },
  });
  const registry = await LTORegistry.deploy("0x0000000000000000000000000000000000000000");
  await registry.waitForDeployment();
  console.log("   LTORegistry:", registry.target);

  console.log("\n✅ Done. Update web-citizen/.env.local:");
  console.log(`NEXT_PUBLIC_REGISTRY_ADDRESS=${registry.target}`);
  console.log(`NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545`);
}

main().catch((err) => { console.error(err); process.exit(1); });
