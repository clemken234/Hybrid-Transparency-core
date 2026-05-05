import "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { defineConfig } from "hardhat/config";
import * as dotenv from "dotenv";
dotenv.config();

export default defineConfig({
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  paths: {
    sources: "./contracts",
  },
  networks: {
    hardhat: {
      type: "edr-simulated" as any,
      allowUnlimitedContractSize: true,
    },
    localhost: {
      type: "http" as any,
      url: "http://127.0.0.1:8545",
      allowUnlimitedContractSize: true,
    },
    sepolia: {
      type: "http" as any,
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
    },
  },
});
