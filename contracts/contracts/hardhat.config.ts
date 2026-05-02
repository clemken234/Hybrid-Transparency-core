import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200, // This compresses the Verifier bytecode
      },
    },
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true, // This bypasses the 24KB limit
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      allowUnlimitedContractSize: true, // Crucial for your local node
    },
  },
};

export default config;