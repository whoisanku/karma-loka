import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config"; // Import dotenv

const BASE_SEPOLIA_RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const accounts = PRIVATE_KEY ? [PRIVATE_KEY] : [];

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  networks: {
    baseSepolia: {
      url: BASE_SEPOLIA_RPC_URL,
      accounts: accounts,
      gasPrice: 1000000000, // 1 Gwei (1_000_000_000 wei)
    },
    // Example for Base Mainnet (uncomment and configure if needed)
    // baseMainnet: {
    //   url: process.env.BASE_MAINNET_RPC_URL || "",
    //   accounts: process.env.MAINNET_PRIVATE_KEY ? [process.env.MAINNET_PRIVATE_KEY] : [],
    //   gasPrice: 100000000, // 0.1 Gwei (adjust as needed for Base Mainnet)
    // },
  },
};

export default config;
