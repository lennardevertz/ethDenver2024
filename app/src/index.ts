console.log("Hello Cross-chain Gitcoin donations!");
// Ethers V6
import {ethers} from "ethers";

import spoolABI from "../../contracts/abi/spokePool.json";
import { ISpokePool } from "./spool";

declare global {
    interface Window {
        ethereum: any;
    }
}

type SpoolContract = ethers.Contract & ISpokePool;


let provider: ethers.BrowserProvider;
let signer: ethers.Signer;
let contractOrigin: SpoolContract;

function generateMessage(userAddress: string) {
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    return abiCoder.encode(["address"], [userAddress]);
}

type ApiEndpoints = {
    [key: string]: string;
};

type QueryParams = {
    [key: string]: string | number | boolean;
};

const endpoints: ApiEndpoints = {
    fee: "https://across.to/api/suggested-fees",
    limits: "https://across.to/api/limits",
    routes: "https://across.to/api/available-routes",
};

const SUPPORTED_TOKEN = {"11155111_eth": "0x", "84532_eth": "0x"};
const CONTRACTS = {
    "11155111": {
        AcrossConfigStore: {
            address: "0xB3De1e212B49e68f4a68b5993f31f63946FCA2a6",
            blockNumber: 4968255,
        },
        LPTokenFactory: {
            address: "0xFB87Ac52Bac7ccF497b6053610A9c59B87a0cE7D",
            blockNumber: 4911834,
        },
        HubPool: {
            address: "0x14224e63716aface30c9a417e0542281869f7d9e",
            blockNumber: 4911835,
        },
        SpokePool: {
            address: "0x5ef6C01E11889d86803e0B23e3cB3F9E9d97B662",
            blockNumber: 5288470,
        },
    },
    "84532": {
        SpokePool: {
            address: "0x82B564983aE7274c86695917BBf8C99ECb6F0F8F",
            blockNumber: 6082004,
        },
    },
    "8453": {
        SpokePool: {
            address: "0x09aea4b2242abC8bb4BB78D537A67a245A7bEC64",
            blockNumber: 2164878,
        },
        SpokePoolVerifier: {
            address: "0x269727F088F16E1Aea52Cf5a97B1CD41DAA3f02D",
            blockNumber: 4822423,
        },
    },
    "420": {
        SpokePool: {
            address: "0xeF684C38F94F48775959ECf2012D7E864ffb9dd4",
            blockNumber: 17025501,
        },
    },
};

async function callAcrossAPI(
    endpoint: string,
    params?: QueryParams
): Promise<any> {
    try {
        // Build the URL with query parameters
        let url = new URL(endpoint);
        if (params) {
            Object.keys(params).forEach((key) =>
                url.searchParams.append(key, params[key].toString())
            );
        }

        // Perform the fetch request
        const response = await fetch(url.toString());
        if (!response.ok) {
            throw new Error(`Error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching data:", error);
        return null;
    }
}

const originChainId = 11155111;
const destinationChainId = 84532;

document
    .getElementById("connectWalletButton")
    ?.addEventListener("click", async () => {
        if (typeof window.ethereum !== "undefined") {
            try {
                // Request account access if needed
                await window.ethereum.request({method: "eth_requestAccounts"});

                // Create a Web3 provider from the window.ethereum object
                provider = new ethers.BrowserProvider(window.ethereum);

                // You now have access to the user's wallet
                signer = await provider.getSigner();
                console.log("Connected account:", await signer.getAddress());
            } catch (error) {
                console.error("Error connecting to wallet:", error);
            }
        } else {
            console.log(
                "No Ethereum wallet detected. Please install MetaMask."
            );
        }
    });
document
    .getElementById("setupContract")
    ?.addEventListener("click", async () => {
        if (typeof provider !== "undefined") {
            try {
                contractOrigin = new ethers.Contract(
                    CONTRACTS["8453"].SpokePool.address,
                    spoolABI,
                    provider
                ) as SpoolContract;
                console.log("Contract set up on Base: ", await contractOrigin.getAddress())
                const chainId = await contractOrigin.chainId()
                console.log("chainId is ", chainId)
            } catch (error) {
                console.error("Error creating contract:", error);
            }
        } else {
            console.log(
                "No provider detected. Please connect your wallet first."
            );
        }
    });


