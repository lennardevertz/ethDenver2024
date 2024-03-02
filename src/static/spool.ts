import { BigNumberish, ethers } from "ethers";

// Assuming your Solidity contract has a function `depositV3`
export interface ISpokePool {
    depositV3(userAddress: string, recipient: string, inputToken: string, outputToken: string, inputAmount: BigNumberish, outputAmount: BigNumberish, destinationChainId: number, exclusiveRelayer: string, quoteTimestamp: number, fillDeadline: number, exclusivityDeadline: number, message: string): Promise<ethers.ContractTransaction>;
    // Add other functions from your contract
}
