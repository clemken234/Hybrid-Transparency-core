require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-verify");
require("dotenv").config();

module.exports = {
  solidity: "0.8.20",
  networks: {
    // 👇 ADDED: Explicitly locks the local Hardhat node settings
    hardhat: {
      chainId: 31337, // Standard Hardhat chainId
      mining: {
        auto: true,
        interval: 0
      }
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL,
      accounts: process.env.SEPOLIA_PRIVATE_KEY ? [process.env.SEPOLIA_PRIVATE_KEY] : []
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  }
};