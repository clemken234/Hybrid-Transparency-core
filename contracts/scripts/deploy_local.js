import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { network } from "hardhat";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONTRACTS_DIR = path.resolve(__dirname, "..");
const ARTIFACTS_DIR = path.join(CONTRACTS_DIR, "artifacts");

function normalizeBytecode(bytecode) {
  return bytecode.startsWith("0x") ? bytecode : `0x${bytecode}`;
}

function normalizeLibraryAddress(address) {
  return address.toLowerCase().replace(/^0x/, "");
}

function linkBytecode(bytecode, linkReferences = {}, libraries = {}) {
  let linked = normalizeBytecode(bytecode).slice(2);

  for (const [sourceName, contracts] of Object.entries(linkReferences)) {
    for (const [contractName, refs] of Object.entries(contracts)) {
      const libraryKey = `${sourceName}:${contractName}`;
      const libraryAddress = libraries[libraryKey] ?? libraries[contractName];

      if (!libraryAddress) {
        throw new Error(`Missing library address for ${libraryKey}`);
      }

      const replacement = normalizeLibraryAddress(libraryAddress);

      for (const { start, length } of refs) {
        const startIndex = start * 2;
        const endIndex = startIndex + length * 2;
        linked = `${linked.slice(0, startIndex)}${replacement}${linked.slice(endIndex)}`;
      }
    }
  }

  return `0x${linked}`;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function loadArtifact(relativePath) {
  return readJson(path.join(ARTIFACTS_DIR, ...relativePath));
}

async function loadBuildInfoOutput(buildInfoId) {
  return readJson(path.join(ARTIFACTS_DIR, "build-info", `${buildInfoId}.output.json`));
}

function getBuildInfoContract(buildInfoOutput, sourceName, contractName) {
  const contractOutput = buildInfoOutput.output?.contracts?.[sourceName]?.[contractName];

  if (!contractOutput) {
    throw new Error(`Compiled contract not found in build-info: ${sourceName}:${contractName}`);
  }

  return contractOutput;
}

async function main() {
  const { ethers } = await network.connect();
  const [deployer] = await ethers.getSigners();

  console.log("Deploying with:", deployer.address);

  const registryArtifact = await loadArtifact(["contracts", "LTORegistry.sol", "LTORegistry.json"]);
  const verifierArtifact = await loadArtifact(["contracts", "HonkVerifier.sol", "HonkVerifier.json"]);
  const buildInfoOutput = await loadBuildInfoOutput(registryArtifact.buildInfoId);

  const poseidonContract = getBuildInfoContract(
    buildInfoOutput,
    "npm/poseidon-solidity@0.0.5/PoseidonT3.sol",
    "PoseidonT3",
  );

  const leanIMTContract = getBuildInfoContract(
    buildInfoOutput,
    "npm/@zk-kit/imt.sol@2.0.0-beta.12/LeanIMT.sol",
    "LeanIMT",
  );

  console.log("1. Deploying PoseidonT3...");
  const PoseidonT3Factory = new ethers.ContractFactory(
    poseidonContract.abi,
    normalizeBytecode(poseidonContract.evm.bytecode.object),
    deployer,
  );
  const poseidonT3 = await PoseidonT3Factory.deploy();
  await poseidonT3.waitForDeployment();
  console.log("   PoseidonT3:", poseidonT3.target);

  console.log("2. Deploying LeanIMT...");
  const leanIMTBytecode = linkBytecode(leanIMTContract.evm.bytecode.object, leanIMTContract.evm.bytecode.linkReferences, {
    "npm/poseidon-solidity@0.0.5/PoseidonT3.sol:PoseidonT3": poseidonT3.target,
  });
  const LeanIMTFactory = new ethers.ContractFactory(leanIMTContract.abi, leanIMTBytecode, deployer);
  const leanIMT = await LeanIMTFactory.deploy();
  await leanIMT.waitForDeployment();
  console.log("   LeanIMT:", leanIMT.target);

  console.log("3. Deploying HonkVerifier...");
  const HonkVerifierFactory = new ethers.ContractFactory(verifierArtifact.abi, verifierArtifact.bytecode, deployer);
  const verifier = await HonkVerifierFactory.deploy();
  await verifier.waitForDeployment();
  console.log("   HonkVerifier:", verifier.target);

  console.log("4. Deploying LTORegistry...");
  const registryBytecode = linkBytecode(registryArtifact.bytecode, registryArtifact.linkReferences, {
    "npm/@zk-kit/imt.sol@2.0.0-beta.12/LeanIMT.sol:LeanIMT": leanIMT.target,
  });
  const RegistryFactory = new ethers.ContractFactory(registryArtifact.abi, registryBytecode, deployer);
  const registry = await RegistryFactory.deploy(verifier.target);
  await registry.waitForDeployment();
  console.log("   LTORegistry:", registry.target);

  console.log("\nDone. Update web-citizen/.env.local:");
  console.log(`NEXT_PUBLIC_REGISTRY_ADDRESS=${registry.target}`);
  console.log("NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545");
  console.log(`HonkVerifier=${verifier.target}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
