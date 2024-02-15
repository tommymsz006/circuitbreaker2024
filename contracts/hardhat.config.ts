import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

import 'dotenv/config'

const config: HardhatUserConfig = {
  defaultNetwork: 'ethereum-sepolia',
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    'ethereum-sepolia': {
      url: `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`,
      from: process.env.TESTNET_ACCOUNT || "",
      accounts: process.env.TESTNET_PRIVATE_KEY !== undefined ? [process.env.TESTNET_PRIVATE_KEY] : [],
    },
  }
};

export default config;
