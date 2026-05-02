import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

// Private Key (Don't Reveal)
const PRIVATE_KEY = "YOUR_METAMASK_PRIVATE_KEY_HERE"; 
const ALCHEMY_SEPOLIA_URL = "YOUR_ALCHEMY_HTTPS_URL_HERE";

const config: HardhatUserConfig = {
  solidity: "0.8.20", // Make sure this matches your contract version
  networks: {
    sepolia: {
      url: ALCHEMY_SEPOLIA_URL,
      accounts: [PRIVATE_KEY]
    }
  }
};

export default config;