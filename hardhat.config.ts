import { HardhatUserConfig } from "hardhat/config";
import "hardhat-gas-reporter"
import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv"
dotenv.config()

const PRIVATE_KEY = process.env.PRIVATE_KEY || ""
const CRONOS_TESTNET_API_KEY = process.env.CRONOS_TESTNET_API_KEY || ""
const CRONOS_API_KEY = process.env.CRONOS_API_KEY || ""

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.9",
    settings: {
      optimizer: {
        enabled: true,
        runs: 100000,
      },
    },
  },
  networks: {
    hardhat: {},
    cronosTestnet: {
      url: "https://evm-t3.cronos.org/",
      chainId: 338,
      accounts: [PRIVATE_KEY],
      gasPrice: 5000000000000,
    },
    cronos: {
      url: "https://evm.cronos.org/",
      chainId: 25,
      accounts: [PRIVATE_KEY],
      gasPrice: 5000000000000,
    },
  },
  etherscan: {
    apiKey: {
      cronosTestnet: <string>process.env.CRONOS_TESTNET_API_KEY,
      cronos: <string>process.env.CRONOS_API_KEY,
    },
  },
  gasReporter: {
    enabled: true,
    currency: 'ETH',
    gasPrice: 21
  }
};

export default config;
