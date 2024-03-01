import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from 'dotenv';

dotenv.config();


const config: HardhatUserConfig = {
  solidity: {
      version: "0.8.19",
      settings: {
          optimizer: {
              enabled: true,
              runs: 200,
          },
      },
  },
  paths: {
      artifacts: "src/artifacts",
      sources: "src/contracts",
  },
  defaultNetwork: "hardhat",
    networks: {
        hardhat: {
            chainId: 1337,
            allowUnlimitedContractSize: true,
        },
        sepolia: {
            chainId: 11155111,
            url: "https://rpc2.sepolia.org",
            accounts: [process.env.PRIVATE_KEY!],
        },
        base: {
          chainId: 8453,
          url: 'https://mainnet.base.org',
          accounts: [process.env.PRIVATE_KEY!],
        },
        "base-sepolia": {
          chainId: 84532,
          url: 'https://sepolia.base.org',
          accounts: [process.env.PRIVATE_KEY!],
        },
        hardhat_node: {
            chainId: 1337,
            url: "http://127.0.0.1:8545",
            allowUnlimitedContractSize: true,
        }
      },
      etherscan: {
        apiKey: {
          sepolia: process.env.ETHERSCAN_KEY!,
          'base-sepolia': process.env.BASESCAN_KEY!,
          base: process.env.BASESCAN_KEY!,
        },
        customChains: [
          {
            network: "base-sepolia",
            chainId: 84532,
            urls: {
              apiURL: "https://api-sepolia.basescan.org/api",
              browserURL: "https://sepolia.basescan.org"
            }
          },
          {
            network: "base",
            chainId: 8453,
            urls: {
             apiURL: "https://api.basescan.org/api",
             browserURL: "https://basescan.org"
            }
          }
        ]
      }
};

export default config;
