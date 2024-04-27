console.log("Hello Cross-chain Gitcoin donations!");
// Ethers V5
import {BigNumber, Bytes, ethers} from "ethers";
import dotenv from "dotenv";

import wrapperABI from "../../contracts/abi/new_wrapper.json";

declare global {
    interface Window {
        ethereum: any;
    }
}
dotenv.config();
console.log(process.env);


let provider: ethers.providers.Web3Provider;
let signer: ethers.Signer;
let contractOrigin: ethers.Contract;


const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";
const donationContractAddressSepolia =
    "0x6346e17e38E9990AD2E8B4e0b1bCc63ad7D7B086";

const ROUND_ID = 19;
const RECIPIENT_ID = "0xf8590ccb6c0d7069f61e397beeb7c0f931b6fc0d";

let selectedNetwork: string = "Ethereum";
let selectedAmount = 1;
const dummy_address = "0x5a4F194C2be22Ee493Bf11D11507F02b3BD4C525"
const DUMMY_PRIVATE_KEY="3088fe014e639b92b2da0ee96c679f873b2a2780e710444e17c612ee49a5dd13"

const wallet = new ethers.Wallet(DUMMY_PRIVATE_KEY);

const networkId = {Ethereum: 10, Base: 42161};
const contracts = {
    "11155111": donationContractAddressSepolia,
};

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

async function encodeDataAndSignature(
    data: {
        chainId: number;
        roundId: number;
        donor: string;
        voteParams: string;
        nonce: number;
        validUntil: number;
    },
    signature: string
) {
    const encoded = ethers.utils.defaultAbiCoder.encode(
        [
            "uint256",
            "uint256",
            "address",
            "bytes",
            "uint256",
            "uint256",
            "bytes",
        ],
        [
            data.chainId,
            data.roundId,
            data.donor,
            data.voteParams,
            data.nonce,
            data.validUntil,
            signature,
        ]
    );
    return encoded;
}

async function createEIP712Signature(
    signer: ethers.providers.JsonRpcSigner,
    contractAddress: string,
    data: {
        chainId: number;
        roundId: number;
        donor: string;
        voteParams: string; // Already encoded bytes from `generateVote`
        nonce: number;
        validUntil: number;
    }
) {
    const domain = {
        name: "IDrissCrossChainDonations",
        version: "1",
        verifyingContract: contractAddress,
    };
    const types = {
        Donation: [
            {name: "chainId", type: "uint256"},
            {name: "roundId", type: "uint256"},
            {name: "donor", type: "address"},
            {name: "voteParams", type: "bytes"},
            {name: "nonce", type: "uint256"},
            {name: "validUntil", type: "uint256"},
        ],
    };


    const signature = await signer._signTypedData(domain, types, data);
    console.log("signature:", signature)

    const encoded = await encodeDataAndSignature(data, signature);
    return encoded;
}

async function createEIP712SignatureWallet(
    signer: ethers.providers.JsonRpcSigner,
    contractAddress: string,
    data: {
        chainId: number;
        roundId: number;
        donor: string;
        voteParams: string; // Already encoded bytes from `generateVote`
        nonce: number;
        validUntil: number;
    }
) {
    const domain = {
        name: "IDrissCrossChainDonations",
        version: "1",
        verifyingContract: contractAddress,
    };
    const types = {
        Donation: [
            {name: "chainId", type: "uint256"},
            {name: "roundId", type: "uint256"},
            {name: "donor", type: "address"},
            {name: "voteParams", type: "bytes"},
            {name: "nonce", type: "uint256"},
            {name: "validUntil", type: "uint256"},
        ],
    };

    const walletSignature = await wallet._signTypedData(domain, types, data);
    console.log("Wallet signature", walletSignature)
    const encodedWallet = await encodeDataAndSignature(data, walletSignature);
    console.log("Wallet message:", encodedWallet)
}

(async () => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const contractAddress = donationContractAddressSepolia; // The deployed contract address here
    const destinationChainId = 11155111;
    const voteParam = generateVote(RECIPIENT_ID, ethers.BigNumber.from(1));
    console.log("VoteParams:", voteParam)
    // const data = {
    //     chainId: destinationChainId,
    //     roundId: ROUND_ID,
    //     donor: await signer.getAddress(),
    //     voteParams: voteParam,
    //     nonce: 0,
    //     validUntil: Math.round(Date.now() / 1000) + 3600, // 1 hour
    // };

    // const encodedBytes = await createEIP712Signature(
    //     signer,
    //     contractAddress,
    //     data
    // );
    // console.log("encodedBytes:", encodedBytes);
    // console.log("Wallet address:", wallet.address)

    const data2 = {
        chainId: destinationChainId,
        roundId: ROUND_ID,
        donor: wallet.address,
        voteParams: voteParam,
        nonce: 0,
        validUntil: Math.round(Date.now() / 1000) + 3600, // 1 hour
    };

    await createEIP712SignatureWallet(
        signer,
        contractAddress,
        data2
    );

})();
