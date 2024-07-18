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
    "0x42067d6EA804eDA2775acDA72c5539f5385BF911";
const donationContractAddressBase =
    "0xca08f771284f86554478ECF752764f2188a64805";

const ROUND_ID = 27;
const RECIPIENT_ID = "0x82fb7eb06dcaea1b5d4b21d791cf9d88fe47ccda";

let selectedNetwork: string = "Ethereum";
let selectedAmount = 1;
const feeAmount = ethers.BigNumber.from(38994483177857);
const timestamp = 1721305494;
const amountOut = ethers.BigNumber.from(1000000000000000);
const dummy_address = "0x5a4F194C2be22Ee493Bf11D11507F02b3BD4C525"
const DUMMY_PRIVATE_KEY="3088fe014e639b92b2da0ee96c679f873b2a2780e710444e17c612ee49a5dd13"

const wallet = new ethers.Wallet(DUMMY_PRIVATE_KEY);

const networkId = {Ethereum: 10, Base: 42161};
const contracts = {
    "11155111": donationContractAddressSepolia,
};

const createContract = (options: {
    address: string;
    abi: any;
    signerOrProvider?: any;
  }) => {
    return new ethers.Contract(
      options.address,
      options.abi,
      typeof options.signerOrProvider === 'string'
        ? new ethers.providers.JsonRpcProvider(options.signerOrProvider)
        : options.signerOrProvider,
    );
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
        verifyingContract: string;
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
            "address",
            "bytes",
        ],
        [
            data.chainId,
            data.roundId,
            data.donor,
            data.voteParams,
            data.nonce,
            data.validUntil,
            data.verifyingContract,
            signature,
        ]
    );
    return encoded;
}

async function createEIP712Signature(
    signer: ethers.providers.JsonRpcSigner,
    data: {
        chainId: number;
        roundId: number;
        donor: string;
        voteParams: string; // Already encoded bytes from `generateVote`
        nonce: number;
        validUntil: number;
        verifyingContract: string;
    }
) {
    const domain = {
        name: "IDrissCrossChainDonations",
        version: "1",
    };
    const types = {
        Donation: [
            {name: "chainId", type: "uint256"},
            {name: "roundId", type: "uint256"},
            {name: "donor", type: "address"},
            {name: "voteParams", type: "bytes"},
            {name: "nonce", type: "uint256"},
            {name: "validUntil", type: "uint256"},
            {name: "verifyingContract", type: "address"},
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
        verifyingContract: string;
    }
) {
    const domain = {
        name: "IDrissCrossChainDonations",
        version: "1",
    };
    const types = {
        Donation: [
            {name: "chainId", type: "uint256"},
            {name: "roundId", type: "uint256"},
            {name: "donor", type: "address"},
            {name: "voteParams", type: "bytes"},
            {name: "nonce", type: "uint256"},
            {name: "validUntil", type: "uint256"},
            {name: "verifyingContract", type: "address"},
        ],
    };

    const walletSignature = await wallet._signTypedData(domain, types, data);
    console.log("Wallet signature", walletSignature)
    const encodedWallet = await encodeDataAndSignature(data, walletSignature);
    console.log("Wallet message:", encodedWallet)
}

(async () => {
    await window.ethereum.request({method: "eth_requestAccounts"});
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const contractAddress = donationContractAddressSepolia; // The deployed contract address here
    const destinationChainId = 8453;
    const voteParam = generateVote(RECIPIENT_ID, amountOut);
    console.log("VoteParams:", voteParam)
    const data = {
        chainId: destinationChainId,
        roundId: ROUND_ID,
        donor: await signer.getAddress(),
        voteParams: voteParam,
        nonce: 0,
        validUntil: Math.round(Date.now() / 1000) + 3600, // 1 hour
        verifyingContract: contractAddress
    };

    const encodedBytes = await createEIP712Signature(
        signer,
        data
    );
    console.log("data for verification: ", data)
    console.log("encodedBytes:", encodedBytes);
    console.log("Wallet address:", await signer.getAddress())

    // const data2 = {
    //     chainId: destinationChainId,
    //     roundId: ROUND_ID,
    //     donor: wallet.address,
    //     voteParams: voteParam,
    //     nonce: 0,
    //     validUntil: Math.round(Date.now() / 1000) + 3600, // 1 hour
    //     verifyingContract: contractAddress
    // };

    // await createEIP712SignatureWallet(
    //     signer,
    //     contractAddress,
    //     data2
    // );

    const depositParams = {
        recipient:
        contractAddress,
        inputToken: '0x4200000000000000000000000000000000000006',
        outputToken: '0x0000000000000000000000000000000000000000',
        inputAmount: amountOut
            .add(feeAmount)
            .mul(101)
            .div(100),
        outputAmount: amountOut,
        destinationChainId: destinationChainId,
        exclusiveRelayer: '0x0000000000000000000000000000000000000000',
        quoteTimestamp: timestamp,
        fillDeadline: Math.round(Date.now() / 1000) + 21_600,
        exclusivityDeadline: 0,
    };
    

    const contractOrigin = createContract({
        address: donationContractAddressBase,
        abi: wrapperABI,
        signerOrProvider: signer,
      });

    const preparedTx =
        await contractOrigin.populateTransaction.callDepositV3?.(
            depositParams,
            encodedBytes,
        );

      const sendOptions = {
        from: await signer.getAddress(),
        value: amountOut
        .add(feeAmount)
        .mul(101)
        .div(100),
      };

      const result = await signer.sendTransaction({
        ...preparedTx,
        ...sendOptions,
        to: contractOrigin.address,
      });

})();

// deployed on base mainnet
// amount < 
// https://across.to/api/suggested-fees?originChainId=10&destinationChainId=8453&token=0x4200000000000000000000000000000000000006&amount=1000000000000000&message=0x0000000000000000000000000000000000000000000000000000000000002105000000000000000000000000000000000000000000000000000000000000001b000000000000000000000000974fdbc4ff3ae73ceeba5b4c85521f2638ee54e5000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000066994fc3000000000000000000000000d82bdb8391109f8bad393ff2cda9e7cd56f8239c0000000000000000000000000000000000000000000000000000000000000260000000000000000000000000000000000000000000000000000000000000014000000000000000000000000082fb7eb06dcaea1b5d4b21d791cf9d88fe47ccda00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000060000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee00000000000000000000000000000000000000000000000000038d7ea4c680000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000041090cf029f8c83a60e2d684733728569233bfedf5c277e6a5af3f0cc836fc89d375d59645dac4c9f3a3e31b65d7e0c7e5125390f616ce631926bfea63039980141c00000000000000000000000000000000000000000000000000000000000000&recipient=0xd82BDb8391109f8BaD393Ff2CDa9E7Cd56F8239C
//  amount !=
// https://across.to/api/suggested-fees?originChainId=10&destinationChainId=8453&token=0x4200000000000000000000000000000000000006&amount=1000000000000000&message=0x0000000000000000000000000000000000000000000000000000000000002105000000000000000000000000000000000000000000000000000000000000001b000000000000000000000000974fdbc4ff3ae73ceeba5b4c85521f2638ee54e500000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006699503600000000000000000000000042067d6ea804eda2775acda72c5539f5385bf9110000000000000000000000000000000000000000000000000000000000000260000000000000000000000000000000000000000000000000000000000000014000000000000000000000000082fb7eb06dcaea1b5d4b21d791cf9d88fe47ccda00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000060000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee00000000000000000000000000000000000000000000000000038d7ea4c680000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000417b4e895310008b23c48390e78c2bb5b135b0571dced48101774023b8120119342f93fb7d4dcf83a425446a0159d2e491441f3fa936a5e35c9b0efdf07c39fa911b00000000000000000000000000000000000000000000000000000000000000&recipient=0x42067d6EA804eDA2775acDA72c5539f5385BF911