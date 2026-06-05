import { ethers } from "ethers";
import fs from "fs";

async function main() {
  console.log("1. Reading your compiled contract...");
  const artifactJson = fs.readFileSync("./artifacts/contracts/LTORegistry.sol/LTORegistry.json", "utf8");
  const artifact = JSON.parse(artifactJson);

  console.log("2. Connecting to Alchemy...");
  const provider = new ethers.JsonRpcProvider("https://eth-sepolia.g.alchemy.com/v2/RxDZxsSfNAVYAVqfIjrSa");

  // 👇 PASTE YOUR PRIVATE KEY HERE (Keep the 0x in front!)
  const privateKey = "0x3a7f8653d16dce3c38c4225859d554f592e314900e01937418890bc4fbfbfcaa"; 
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log("3. Sending to Sepolia Blockchain (Please wait 15-30 seconds)...");
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const contract = await factory.deploy();

  await contract.waitForDeployment();
  console.log(`\n✅ DEPLOYMENT SUCCESSFUL!`);
  console.log(`Contract Address: ${contract.target}`);
}

main().catch((error) => {
  console.error("\n❌ Error:", error.message);
});