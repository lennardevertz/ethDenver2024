console.log("Hello Cross-chain Gitcoin donations!");
// Ethers V5
import {BigNumberish, ethers} from "ethers";

import spoolABI from "../../contracts/abi/spokePool.json";
import ACROSS_MOCK_FEE_RESPONSE from "./static/ACCROSS_MOCK_FEE_RESPONSE.json";
import ACROSS_MOCK_LIMIT_RESPONSE from "./static/ACCROSS_MOCK_LIMIT_RESPONSE.json";
import SUPPORTED_TOKEN from "./static/token.json";
import CONTRACTS from "./static/ACROSS_CONTRACTS.json";
import {ISpokePool} from "./static/spool";

declare global {
    interface Window {
        ethereum: any;
    }
}

type SpoolContract = ethers.Contract & ISpokePool;

let provider: ethers.providers.Web3Provider;
let signer: ethers.Signer;
let contractOrigin: SpoolContract;
let availableRoutes;

function generateMessage(userAddress: string) {
    const abiCoder = ethers.utils.defaultAbiCoder;
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

async function callAcrossAPI(
    endpoint: string,
    params?: QueryParams
): Promise<any> {
    if (endpoint == endpoints.fee) return ACROSS_MOCK_FEE_RESPONSE;
    if (endpoint == endpoints.limits) return ACROSS_MOCK_LIMIT_RESPONSE;
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

document
    .getElementById("connectWalletButton")
    ?.addEventListener("click", async () => {
        if (typeof window.ethereum !== "undefined") {
            try {
                // Request account access if needed
                await window.ethereum.request({method: "eth_requestAccounts"});

                // Create a Web3 provider from the window.ethereum object
                provider = new ethers.providers.Web3Provider(window.ethereum);

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
                    CONTRACTS["11155111"].SpokePool.address,
                    spoolABI,
                    signer
                ) as SpoolContract;
                console.log(
                    "Contract set up on Sepolia: ",
                    await contractOrigin.address
                );
                const chainId = await contractOrigin.chainId();
                console.log("chainId is ", chainId);
            } catch (error) {
                console.error("Error creating contract:", error);
            }
        } else {
            console.log(
                "No provider detected. Please connect your wallet first."
            );
        }
    });

document.getElementById("callBridge")?.addEventListener("click", async () => {
    if (typeof provider !== "undefined") {
        try {
            const originChainId = 11155111  as number;
            const destinationChainId = 84532 as number;
            const token = SUPPORTED_TOKEN["11155111_eth"];
            const amount = ethers.BigNumber.from("4000000000000000");

            //Check if route is available
            availableRoutes = await callAcrossAPI(endpoints.routes, {});

            const suggested_fees = await callAcrossAPI(endpoints.fee, {
                originChainId: originChainId,
                destinationChainId: destinationChainId,
                token: token,
                amount: amount.toString(),
            });
            console.log(suggested_fees);
            const totalFee = suggested_fees.totalRelayFee.total;
            console.log("Total fee ", totalFee);
            console.log("When sending ", amount.toString(), " from base to op");
            console.log(
                "Sending a total of ",
                ethers.BigNumber.from(totalFee).add(amount).toString(),
                " from base to op"
            );
            const timestamp = suggested_fees.timestamp as number;
            console.log("Timestamp", timestamp);
            const limits = await callAcrossAPI(endpoints.limits, {
                originChainId: originChainId,
                destinationChainId: destinationChainId,
                token: token,
            });
            console.log("limits: ", limits);
            const maxDepositInstant = limits.maxDepositInstant;
            const maxDepositShortDelay = limits.maxDepositShortDelay;
            const maxDeposit = limits.maxDeposit;
            console.log(
                "maxDepositInstant",
                maxDepositInstant,
                amount < ethers.BigNumber.from(maxDepositInstant)
            );
            console.log(
                "maxDepositShortDelay",
                maxDepositShortDelay,
                amount < ethers.BigNumber.from(maxDepositShortDelay)
            );
            console.log(
                "maxDeposit",
                maxDeposit,
                amount < ethers.BigNumber.from(maxDeposit)
            );
            await depositToSpokePool(
                await signer.getAddress(),
                token,
                amount,
                {total: totalFee},
                destinationChainId,
                timestamp
            );
        } catch (error) {
            console.error("Error creating contract:", error);
        }
    } else {
        console.log("No provider detected. Please connect your wallet first.");
    }
});

async function depositToSpokePool(
    userAddress: string,
    assetAddress: string,
    amount: ethers.BigNumber,
    totalRelayFee: {total: string},
    destinationChainId: number,
    timestamp: number
) {
    try {
        const outputToken = "0x0000000000000000000000000000000000000000";
        const exclusiveRelayer = "0x0000000000000000000000000000000000000000";
        const fillDeadline = Math.round(Date.now() / 1000) + 21600; // 6 hours from now
        const exclusivityDeadline = 0;
        const message = "0x"; // for normal bridge

        const outputAmount = ethers.BigNumber.from(amount).sub(
            ethers.BigNumber.from(totalRelayFee.total)
        );
        console.log(outputAmount);

        let params = [
            userAddress,
            userAddress,
            assetAddress,
            outputToken,
            amount,
            outputAmount,
            destinationChainId,
            exclusiveRelayer,
            timestamp,
            fillDeadline,
            exclusivityDeadline,
            message,
        ];
        console.log(params);

        const args = [
            userAddress,
            userAddress,
            assetAddress,
            outputToken,
            amount,
            outputAmount,
            destinationChainId,
            exclusiveRelayer,
            timestamp,
            fillDeadline,
            exclusivityDeadline,
            message,
        ];

        const preparedTx = await contractOrigin.populateTransaction[
            "depositV3"
        ](...args);

        console.log("transaction data", {...preparedTx});

        const sendOptions = {
            from: await signer.getAddress(),
            value: amount.toString(),
        };

        const result = await signer.sendTransaction({
            ...preparedTx,
            ...sendOptions,
            to: contractOrigin.address,
        });
        const minedResult = await result.wait();

        console.log(minedResult);

        console.log("Deposit successful", minedResult.transactionHash);
    } catch (error) {
        console.error("Error in deposit:", error);
        throw error;
    }
}
