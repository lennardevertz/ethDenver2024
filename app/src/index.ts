// Ethers V6
import {ethers} from "ethers";

import spoolABI from "../../contracts/abi/spokePool.json";

declare global {
    interface Window {
        ethereum: any;
    }
}

let provider;
let signer;

console.log(spoolABI);

console.log("Hello Cross-chain Gitcoin donations!");

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
};

async function callAcrossAPI(
    endpointKey: keyof ApiEndpoints,
    params?: QueryParams
): Promise<any> {
    try {
        // Build the URL with query parameters
        let url = new URL(endpoints[endpointKey]);
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
                console.log("Connected account:", signer.address);
            } catch (error) {
                console.error("Error connecting to wallet:", error);
            }
        } else {
            console.log(
                "No Ethereum wallet detected. Please install MetaMask."
            );
        }
    });
