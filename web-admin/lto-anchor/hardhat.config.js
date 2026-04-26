import "@nomicfoundation/hardhat-ethers";
import * as dotenv from "dotenv";

dotenv.config();

module.exports = {
  solidity: "0.8.19",
  networks: {
    sepolia: {
      type: "http",
      url: "https://eth-mainnet.g.alchemy.com/v2/RxDZxsSfNAVYAVqfIjrSa",
      accounts: ["3a7f8653d16dce3c38c4225859d554f592e314900e01937418890bc4fbfbfcaa"] 
    }
  }
};