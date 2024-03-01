// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {PublicGoodAttester} from "./libs/Attestation.sol";
import {IDonations} from "./interfaces/IDonations.sol";
import {V3SpokePoolInterface} from "./interfaces/ISpokePool.sol";

contract DonationWrapper is Ownable, PublicGoodAttester {
    error Unauthorized();

    address public SPOKE_POOL_RECEIVER;
    address public SPOKE_POOL_SENDER;
    V3SpokePoolInterface spokePool;
    IDonations donationsContract;

    struct DepositParams {
        address recipient;
        address inputToken;
        address outputToken;
        uint256 inputAmount;
        uint256 outputAmount;
        uint256 destinationChainId;
        address exclusiveRelayer;
        uint32 quoteTimestamp;
        uint32 fillDeadline;
        uint32 exclusivityDeadline;
        bytes message;
    }

    constructor(
        address _eas,
        bytes32 _easSchema,
        address _acrossSpokePoolReceiver,
        address _acrossSpokePoolSender,
        address _donationsContractAddress
    ) PublicGoodAttester(_eas, _easSchema) {
        SPOKE_POOL_RECEIVER = _acrossSpokePoolReceiver;
        SPOKE_POOL_SENDER = _acrossSpokePoolSender;
        spokePool = V3SpokePoolInterface(SPOKE_POOL_SENDER);
        donationsContract = IDonations(_donationsContractAddress);
    }

    function handleV3AcrossMessage(
        address tokenSent,
        uint256 amount,
        address relayer,
        bytes memory message
    ) external payable {
        if (msg.sender != SPOKE_POOL_RECEIVER) revert Unauthorized();

        (
            address donor,
            address grantee,
            uint256 granteeId,
            address round,
            uint256 applicationIndex
        ) = abi.decode(message, (address, address, uint256, address, uint256));

        _attestDonor(donor, grantee, granteeId, round, tokenSent, amount);

        bytes memory encodedVote = abi.encode(
            tokenSent,
            amount,
            grantee,
            granteeId,
            applicationIndex
        );

        donationsContract.vote(encodedVote, round, tokenSent);
    }

    function callDepositV3(DepositParams calldata params) external payable {
        spokePool.depositV3{value: msg.value}(
            msg.sender, // donor
            params.recipient,
            params.inputToken,
            params.outputToken,
            params.inputAmount,
            params.outputAmount,
            params.destinationChainId,
            params.exclusiveRelayer,
            params.quoteTimestamp,
            params.fillDeadline,
            params.exclusivityDeadline,
            params.message
        );
    }
}
