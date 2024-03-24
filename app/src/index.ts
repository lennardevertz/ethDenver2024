console.log("Hello Cross-chain Gitcoin donations!");
// Ethers V5
import {ethers} from "ethers";
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

type SupportedTokenKeys = "11155111" | "84532";

let provider: ethers.providers.Web3Provider;
let signer: ethers.Signer;
let contractOrigin: ethers.Contract;
let availableRoutes;

const dummyGranteeId = 1;
const dummyApplicationIndex = 1;
const dummyRound = "0x0000000000000000000000000000000000000000";
const donationContractAddressSepolia =
    "0xF473b415aB4604b52Fbdaefc75fD2154A017C6dF";
const donationContractAddressBase =
    "0xbDdDdd0d36dc39CC11C7f134C30F015D25F3C489";
const GRANTEE_CREATOR = "0x3f15B8c6F9939879Cb030D6dd935348E57109637"
const ROUND_ID = 92;
const RECIPIENT_ID = "0xF285db482fE8F1D779477C8DA2674B77925E56E3"


let selectedNetwork: string = "Ethereum";
let selectedAmount = 15;
let originContract = "Ethereum";
let destinationContract = "Base";

const networkId = {Ethereum: 11155111, Base: 84532};
const contracts = {
    "11155111": donationContractAddressSepolia,
    "84532": donationContractAddressBase,
};

function generateMessage(
    senderAddress: string,
    granteeAddress: string,
    recipientId: string,
    roundId: number
) {
    const abiCoder = ethers.utils.defaultAbiCoder;
    return abiCoder.encode(
        ["address", "address", "address", "uint256"],
        [senderAddress, granteeAddress, recipientId, roundId]
    );
}

function generateVote(){
    const recipientId = '0xf285db482fe8f1d779477c8da2674b77925e56e3'; // replace with the actual recipientId
    const PermitTypeNone = 0; // Assuming None is the first in the enum and so is 0
    const NATIVE = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'; // replace with the actual address for NATIVE
    const amount = '1000000000000000';
    const nonce = 0;
    const deadline = 0; // replace testOffset with its value
    const signature = '0x0000000000000000000000000000000000000000000000000000000000000000';
    const types = [
        "address",   
        "uint8",
        "tuple(tuple(tuple(address, uint256), uint256, uint256), bytes)"
    ];
    let data = [
        recipientId,            // Replace with actual recipientId value
        PermitTypeNone,                      // PermitType.None as 0 (if it's the first enum value)
        [  // Permit2Data
            [  // ISignatureTransfer.PermitTransferFrom
                [  // ISignatureTransfer.TokenPermissions
                    NATIVE,         // Replace with actual token address for NATIVE
                    amount // Amount
                ],
                nonce,               // Nonce
                deadline  // Deadline
            ],
            signature               // Signature as an empty byte string
        ]
    ];
    const abiCoder = ethers.utils.defaultAbiCoder;
    return abiCoder.encode(types, data)
}
console.log(generateVote())

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
    // if (endpoint == endpoints.fee) return ACROSS_MOCK_FEE_RESPONSE;
    // if (endpoint == endpoints.limits) return ACROSS_MOCK_LIMIT_RESPONSE;
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
    const originChainId =
            networkId[selectedNetwork as keyof typeof networkId];
        const destinationChainId = Object.entries(networkId)
            .filter(([networkName, _]) => networkName !== selectedNetwork)
            .map(([_, chainId]) => chainId)[0] as number;
        const token =
            SUPPORTED_TOKEN[originChainId.toString() as SupportedTokenKeys];
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
        console.log("requesting switch to ", originChainId, ethers.utils.hexValue(originChainId))
    if (!signer) {
        // Request account access if needed
        await window.ethereum.request({method: "eth_requestAccounts"});

        // Create a Web3 provider from the window.ethereum object
        provider = new ethers.providers.Web3Provider(window.ethereum, "any");

        // You now have access to the user's wallet
        signer = await provider.getSigner();
        console.log("Connected account:", await signer.getAddress());

        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: ethers.utils.hexValue(originChainId) }],
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
            originChainId: 1,
            destinationChainId: 8453,
            token: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
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
            originChainId: 1,
            destinationChainId: 8453,
            token: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
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
        const outputToken = "0x0000000000000000000000000000000000000000";
        const exclusiveRelayer = "0x0000000000000000000000000000000000000000";
        const fillDeadline = Math.round(Date.now() / 1000) + 21600; // 6 hours from now
        const exclusivityDeadline = 0;
        const sender = await signer.getAddress();
        const message = generateMessage(
            sender,
            GRANTEE_CREATOR,
            RECIPIENT_ID,
            ROUND_ID
        ); // use dummy data from indexer, works only on path base -> sepolia

        console.log("encoded message:", message);

        console.log("amount", amount);
        console.log("totalRelayFee.total", totalRelayFee.total);

        const outputAmount = amount.sub(
            ethers.BigNumber.from(totalRelayFee.total)
        );
        console.log("OutputAmount: ", outputAmount);

        const depositParams = {
            recipient: contracts[destinationChainId.toString() as SupportedTokenKeys],
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
        ](depositParams, message);

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

// handling clicks

document
    .querySelectorAll<HTMLElement>("#valueSelection > *")
    .forEach((b: HTMLElement) => {
        b.onclick = (e: MouseEvent) => {
            document
                .querySelectorAll<HTMLElement>("#valueSelection  > *")
                .forEach((x: HTMLElement) =>{
                    x.classList.remove("bg-[#11cc74]")
                    x.classList.add("bg-green-100")
        });
            b.classList.add("bg-[#11cc74]");
            b.classList.remove("bg-green-100")
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
