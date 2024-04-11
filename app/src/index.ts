console.log("Hello Cross-chain Gitcoin donations!");
// Ethers V5
import {BigNumber, Bytes, ethers} from "ethers";
import dotenv from "dotenv";

import wrapperABI from "../../contracts/abi/wrapper.json";
import SUPPORTED_TOKEN from "./static/token.json";

declare global {
    interface Window {
        ethereum: any;
    }
}
dotenv.config();
console.log(process.env);

type SupportedTokenKeys = "10" | "42161";
type TokenMap = {[key: string]: string};

const tokenMap: TokenMap = SUPPORTED_TOKEN as TokenMap;

const GITCOIN_GRAPHQL_API_URL =
    "https://grants-stack-indexer-v2.gitcoin.co/graphql";
const sample_query = `query Applications {
    applications(
      filter: {roundId: {equalTo: "34"}, chainId: {equalTo: 42161}, status: {equalTo: APPROVED}}
    ) {
      id
      project {
        anchorAddress
        id
        metadata
        name
        registryAddress
      }
    }
  }`;

async function fetch_gitcoin() {
    const response = await fetch(GITCOIN_GRAPHQL_API_URL, {
        method: "POST",
        body: JSON.stringify({
            query: sample_query,
            operationName: "Applications",
            // TODO: make sure undefined is fine
            variables: undefined,
        }),
        headers: {
            "Content-Type": "application/json",
        },
    });

    const json = await response.json();
    return json;
}

console.log(await fetch_gitcoin());
console.log(
    (await fetch_gitcoin()).data.applications[0].project.metadata.projectTwitter
);
console.log((await fetch_gitcoin()).data.applications[0].project.anchorAddress);


let provider: ethers.providers.Web3Provider;
let signer: ethers.Signer;
let contractOrigin: ethers.Contract;
let availableRoutes;

const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";
const donationContractAddressSepolia =
    "0xDfF3E34DaD6CBD56A906A0946fc32BD36fcbe105";
const donationContractAddressBase =
    "0x269730D5ee3E9b95b0DAeb9048149014A71a7668";
const donationContractAddressArbitrum =
    "0xaA098E5c9B002F815d7c9756BCfce0fC18B3F362";
const donationContractAddressOptimism =
    "0x1Ce21455F1D6776ccD515BCD7D892Bd4cFAdCee4";

const ROUND_ID = 34;
const RECIPIENT_ID = "0xf8590ccb6c0d7069f61e397beeb7c0f931b6fc0d";

let selectedNetwork: string = "Ethereum";
let selectedAmount = 2;

const networkId = {Ethereum: 10, Base: 42161}; // Ethereum -> Optimism, Base -> Arbitrum
const contracts = {
    // "11155111": donationContractAddressSepolia,
    // "84532": donationContractAddressBase,
    "42161": donationContractAddressArbitrum,
    "10": donationContractAddressOptimism,
};

async function generateDataAndSignature(_amount: BigNumber) {
    const recipientId = RECIPIENT_ID;

    const voteParam = generateVote(recipientId, _amount);
    console.log("Amount for voteParams:", _amount.toString());
    console.log("voteParam: ", voteParam);

    const encodedMessage = generateDonationData(
        ROUND_ID,
        await signer.getAddress(),
        voteParam
    );
    console.log("encodedMessage: ", encodedMessage);
    console.log(await contractOrigin.address);

    const hashedEncoding = await contractOrigin.getMessageHash(encodedMessage);
    console.log("Hashed message: ", hashedEncoding);

    const signature = await signer.signMessage(
        ethers.utils.arrayify(hashedEncoding)
    );
    console.log("Signed message: ", signature);

    return {encodedMessage, signature};
}

function generatedummy() {
    const abiCoder = ethers.utils.defaultAbiCoder;
    return abiCoder.encode(
        ["address", "address", "tuple(uint256, string)"],
        [
            "0xf8590ccb6c0d7069f61e397beeb7c0f931b6fc0d",
            "0x974fDBc4Ff3Ae73Ceeba5B4c85521F2638ee54e5",
            [1, "bafkreign355zf6ufl3gaxgf33wfm7cytfgrappctsb6iq5agtaaisuqh5m"],
        ]
    );
}

function generatereversedummy() {
    const abiCoder = ethers.utils.defaultAbiCoder;
    return abiCoder.decode(
        ["address", "address", "tuple(uint256, string)"],
        "0x000000000000000000000000f285db482fe8f1d779477c8da2674b77925e56e30000000000000000000000003f15b8c6f9939879cb030d6dd935348e57109637000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000003b6261666b726569656d786c646f6a76706a32617163786137676e32797a356a6b6f6d7777677979737a6f646c6473706a666e6c6b736f6165626b790000000000"
    );
}

// console.log("dummy ", generatedummy());
// console.log("dummy ", generatereversedummy());

function generateDonationData(
    roundId: number,
    senderAddress: string,
    voteParams: string
) {
    const abiCoder = ethers.utils.defaultAbiCoder;
    return abiCoder.encode(
        ["uint256", "address", "bytes"],
        [roundId, senderAddress, voteParams]
    );
}

function generateCombinedMessage(message: string, signature: string) {
    const abiCoder = ethers.utils.defaultAbiCoder;
    return abiCoder.encode(["bytes", "bytes"], [message, signature]);
}

function generateVote(recipientId: string, amount: BigNumber) {
    const PermitTypeNone = 0; // Assuming None is the first in the enum and so is 0
    const NATIVE = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"; // replace with the actual address for NATIVE
    const nonce = 0;
    const deadline = 0;
    const signature =
        "0x0000000000000000000000000000000000000000000000000000000000000000";
    const types = [
        "address",
        "uint8",
        "tuple(tuple(tuple(address, uint256), uint256, uint256), bytes)",
    ];
    let data = [
        recipientId, // Replace with actual recipientId value
        PermitTypeNone, // PermitType.None as 0 (if it's the first enum value)
        [
            // Permit2Data
            [
                // ISignatureTransfer.PermitTransferFrom
                [
                    // ISignatureTransfer.TokenPermissions
                    NATIVE, // Replace with actual token address for NATIVE
                    amount, // Amount
                ],
                nonce, // Nonce
                deadline, // Deadline
            ],
            signature, // Signature as an empty byte string
        ],
    ];
    const abiCoder = ethers.utils.defaultAbiCoder;
    return abiCoder.encode(types, data);
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
    try {
        let url = new URL(endpoint);
        if (params) {
            Object.keys(params).forEach((key) =>
                url.searchParams.append(key, params[key].toString())
            );
        }
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

async function getSwapPrice(
    sellToken: string,
    buyToken: string,
    sellAmount: number
): Promise<any> {
    const apiKey = "428e703e-d41b-4ef1-b663-323cb386dab2";
    if (!apiKey) {
        throw new Error("API key is not defined in .env file");
    }

    const url = `https://api.0x.org/swap/v1/price?sellToken=${sellToken}&buyToken=${buyToken}&sellAmount=${sellAmount}`;
    const headers = {
        "0x-api-key": apiKey,
    };

    try {
        const response = await fetch(url, {headers});
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching swap price:", error);
        return null;
    }
}

document.getElementById("callBridge")?.addEventListener("click", async () => {
    const originChainId = networkId[selectedNetwork as keyof typeof networkId];
    const destinationChainId = Object.entries(networkId)
        .filter(([networkName, _]) => networkName !== selectedNetwork)
        .map(([_, chainId]) => chainId)[0] as number;
    const token = tokenMap[originChainId.toString()];
    const amountRequest = await getSwapPrice(
        "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        selectedAmount * 10 ** 6
    );
    const amount = ethers.BigNumber.from(amountRequest.buyAmount);
    console.log("origin: ", originChainId, selectedNetwork);
    console.log("destination: ", destinationChainId);
    console.log("token: ", token);
    console.log("amount: ", amount);
    console.log(
        "requesting switch to ",
        originChainId,
        ethers.utils.hexValue(originChainId)
    );
    if (!signer) {
        await window.ethereum.request({method: "eth_requestAccounts"});

        provider = new ethers.providers.Web3Provider(window.ethereum, "any");

        signer = await provider.getSigner();
        console.log("Connected account:", await signer.getAddress());

        await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{chainId: ethers.utils.hexValue(originChainId)}],
        });
    }
    try {
        contractOrigin = new ethers.Contract(
            contracts[originChainId.toString() as SupportedTokenKeys],
            wrapperABI,
            signer
        ) as ethers.Contract;
        console.log(
            `Contract set up on ${selectedNetwork}: `,
            await contractOrigin.address
        );

        //Check if route is available
        availableRoutes = await callAcrossAPI(endpoints.routes, {});

        const suggested_fees = await callAcrossAPI(endpoints.fee, {
            originChainId: originChainId,
            destinationChainId: destinationChainId,
            token: tokenMap[originChainId.toString()],
            amount: amount.toString(),
        });
        console.log(suggested_fees);
        const totalFee = suggested_fees.totalRelayFee.total;
        console.log("Total fee ", totalFee);
        console.log("When sending ", amount.toString(), " from op to arb");
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
            token: tokenMap[originChainId.toString()],
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
            token,
            amount,
            {total: totalFee},
            destinationChainId,
            timestamp
        );
    } catch (error) {
        console.error("Error creating contract:", error);
    }
});

async function depositToSpokePool(
    assetAddress: string,
    amount: ethers.BigNumber,
    totalRelayFee: {total: string},
    destinationChainId: number,
    timestamp: number
) {
    try {
        const outputToken = NULL_ADDRESS;
        const exclusiveRelayer = NULL_ADDRESS;
        const fillDeadline = Math.round(Date.now() / 1000) + 21600; // 6 hours from now
        const exclusivityDeadline = 0;

        console.log("amount", amount);
        console.log("totalRelayFee.total", totalRelayFee.total);

        // const outputAmount = amount.sub(
        //     ethers.BigNumber.from(totalRelayFee.total)
        // );
        const outputAmount = amount
        console.log("OutputAmount: ", outputAmount.toString());

        // use dummy data from indexer, works only on path base -> sepolia
        const data = await generateDataAndSignature(outputAmount);
        const messageCombined = generateCombinedMessage(
            data.encodedMessage,
            data.signature
        );
        console.log("combined message", messageCombined);

        const optimalRes = await findOptimalAmountIn(outputAmount, messageCombined)

        console.log("Optimal result", optimalRes.optimalAmountIn.toString(), optimalRes.correspondingFee?.toString())

        const data2 = await generateDataAndSignature(outputAmount.div(2));
        const messageCombined2 = generateCombinedMessage(
            data2.encodedMessage,
            data2.signature
        );
        console.log("combined message", messageCombined2);

        const suggested_fees = await callAcrossAPI(endpoints.fee, {
            originChainId: 10,
            destinationChainId: 42161,
            token: tokenMap["10"],
            amount: amount.toString(),
            message: messageCombined,
            recipient: donationContractAddressArbitrum
        });
        console.log(suggested_fees);
        const totalFee = suggested_fees.totalRelayFee.total;
        console.log("Total fee ", totalFee);
        console.log("When sending ", amount.toString(), " from op to arb");
        console.log(
            "Sending a total of ",
            ethers.BigNumber.from(totalFee).add(amount).toString(),
            " from base to op"
        );
        const suggested_fees2 = await callAcrossAPI(endpoints.fee, {
            originChainId: 10,
            destinationChainId: 42161,
            token: tokenMap["10"],
            amount: amount.div(2).toString(),
            message: messageCombined2,
            recipient: donationContractAddressArbitrum
        });
        console.log(suggested_fees2);
        console.log("Compare")
        console.log(suggested_fees, suggested_fees2)


        console.log(
            await contractOrigin.verify(
                await signer.getAddress(),
                data.encodedMessage,
                data.signature
            )
        );
        console.log(
            await contractOrigin.verifyDonation(
                data.encodedMessage,
                data.signature
            )
        );

        const depositParams = {
            recipient:
                contracts[destinationChainId.toString() as SupportedTokenKeys],
            inputToken: assetAddress,
            outputToken: outputToken,
            inputAmount: amount,
            outputAmount: outputAmount,
            destinationChainId: destinationChainId,
            exclusiveRelayer: exclusiveRelayer,
            quoteTimestamp: timestamp,
            fillDeadline: fillDeadline,
            exclusivityDeadline: exclusivityDeadline,
        };

        console.log("depositparam", depositParams);

        const preparedTx = await contractOrigin.populateTransaction[
            "callDepositV3"
        ](depositParams, messageCombined);

        console.log("transaction data", {...preparedTx});

        const sendOptions = {
            from: await signer.getAddress(),
            value: amount.toString(),
        };

        console.log("Sending ", amount.toString());
        console.log("Receiving ", outputAmount.toString());
        console.log("From token ", outputToken);

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

// handling clicks

document
    .querySelectorAll<HTMLElement>("#valueSelection > *")
    .forEach((b: HTMLElement) => {
        b.onclick = (e: MouseEvent) => {
            document
                .querySelectorAll<HTMLElement>("#valueSelection  > *")
                .forEach((x: HTMLElement) => {
                    x.classList.remove("bg-[#11cc74]");
                    x.classList.add("bg-green-100");
                });
            b.classList.add("bg-[#11cc74]");
            b.classList.remove("bg-green-100");
            const amount = b.getAttribute("data-amount");
            if (amount) {
                selectedAmount = parseInt(amount, 10);
                console.log(selectedAmount);
            }
            b.querySelector<HTMLInputElement>("input")?.focus();
        };
    });

const dropdownButton = document.getElementById(
    "dropdownButtonNetwork"
) as HTMLButtonElement;
const dropdown = document.getElementById("dropdownNetwork") as HTMLUListElement;

// Toggle dropdown visibility
dropdownButton.onclick = () => {
    dropdown.classList.toggle("hidden");
};

// Function to update dropdown options
const updateDropdownOptions = (selectedNetwork: string) => {
    const allNetworks = ["Ethereum", "Base", "Bitcoin"]; // Add all possible networks here
    const availableNetworks = allNetworks.filter(
        (network) => network !== selectedNetwork
    );

    dropdown.innerHTML = availableNetworks
        .map(
            (network) => `
            <li
                class="dropdownOptionNetwork list-none text-gray-900 cursor-default select-none relative py-2 pl-3 pr-9"
                role="option"
                data-network="${network}"
                data-img-src="src/static/images/${network.toLowerCase()}_logo.png"
            >
                <div class="flex items-center">
                    <img src="src/static/images/${network.toLowerCase()}_logo.png" alt="" class="flex-shrink-0 h-6 w-6 rounded-full" />
                    <span class="ml-3 block truncate">${network}</span>
                </div>
            </li>
        `
        )
        .join("");
};

// Handle dropdown option selection
dropdown.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const selectedOption = target.closest(".dropdownOptionNetwork");
    if (!selectedOption) return;

    const networkName = selectedOption.getAttribute("data-network");
    const imgSrc = selectedOption.getAttribute("data-img-src");
    console.log(imgSrc);

    // Update button content
    dropdownButton.innerHTML = `
            <span class="flex items-center">
                <img src="${imgSrc}" alt="" class="flex-shrink-0 h-6 w-6 rounded-full" />
                <span class="ml-3 block truncate">${networkName}</span>
            </span>
            <span class="ml-3 absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
            </span>
        `;

    // Update dropdown options based on the selection
    updateDropdownOptions(networkName!);
    selectedNetwork = networkName!;
    console.log(networkName);

    // Close the dropdown
    dropdown.classList.add("hidden");
});

// Initialize with the default selection
updateDropdownOptions("Ethereum");


async function calculateFee(amountIn: BigNumber, encodedMessage: string): Promise<BigNumber> {

    const suggested_fees = await callAcrossAPI(endpoints.fee, {
        originChainId: 10,
        destinationChainId: 42161,
        token: tokenMap["10"],
        amount: amountIn.toString(),
        message: encodedMessage,
        recipient: donationContractAddressArbitrum
    });
    console.log("Amount: ", amountIn.toString(), "Suggested Fee: ", suggested_fees.totalRelayFee.total);

    return ethers.BigNumber.from(suggested_fees.totalRelayFee.total);
}

async function findOptimalAmountIn(amountOut: BigNumber, encodedMessage: string , maxIterations: number = 7): Promise<{ optimalAmountIn: BigNumber; correspondingFee: BigNumber | null; }> {
    let lowerBound = amountOut;
    let upperBound = amountOut.mul(110).div(100);
    let optimalAmountIn = upperBound; 
    let correspondingFee: BigNumber | null = null;
    let iteration = 0;

    while (iteration < maxIterations) {
        const midPoint = lowerBound.add(upperBound).div(2);
        try {
            const fee = await calculateFee(midPoint, encodedMessage);

            optimalAmountIn = midPoint;
            correspondingFee = fee;
            upperBound = midPoint;
        } catch (error) {
            console.log(error)
            lowerBound = midPoint;
        }

        iteration++;
    }

    return { optimalAmountIn, correspondingFee };
}