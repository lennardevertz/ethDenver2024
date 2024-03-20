// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {PublicGoodAttester} from "./libs/Attestation.sol";
import {IDonations} from "./interfaces/IDonations.sol";
import {IAllo} from "./interfaces/IAllo.sol";
import {V3SpokePoolInterface} from "./interfaces/ISpokePool.sol";
import {WETH9Interface} from "./interfaces/IWETH.sol";

contract DonationWrapper is Ownable, PublicGoodAttester {
    error Unauthorized();

    address public SPOKE_POOL;
    address public DONATION_ADDRESS;
    address public ALLO;
    address public WETH_ADDRESS;
    V3SpokePoolInterface spokePool;
    IDonations donationsContract;
    IAllo alloContract;
    WETH9Interface wethContract;

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
    }

    struct TokenPermissions {
        address token;
        uint256 amount;
    }

    struct PermitTransferFrom{
        TokenPermissions permitted;
        uint256 nonce;
        uint256 deadline;
    }

    struct Permit2Data {
        PermitTransferFrom permit;
        bytes signature;
    }

    constructor(
        address _eas,
        bytes32 _easSchema,
        address _acrossSpokePool,
        address _donationsContractAddress,
        address _allo,
        address _wethAddress
    ) PublicGoodAttester(_eas, _easSchema) {
        SPOKE_POOL = _acrossSpokePool;
        DONATION_ADDRESS = _donationsContractAddress;
        WETH_ADDRESS = _wethAddress;
        ALLO_ADDRESS = _allo;
        spokePool = V3SpokePoolInterface(SPOKE_POOL);
        donationsContract = IDonations(DONATION_ADDRESS);
        alloContract = IALLO(ALLO_ADDRESS);
        wethContract = WETH9Interface(WETH_ADDRESS);
    }

    function handleV3AcrossMessage(
        address tokenSent,
        uint256 amount,
        address relayer,
        bytes memory message
    ) external payable {

        if (msg.sender != SPOKE_POOL) revert Unauthorized();

        // Only support WETH transfers for now. This can be switched to a swap() call in the future to allow for wider token support.
        unwrapWETH(amount);

        (
            address donor,
            address grantee,
            uint256 granteeId,
            address round,
            uint256 applicationIndex,
            uint256 poolId
        ) = abi.decode(message, (address, address, uint256, address, uint256, uint256));

        _attestDonor(donor, grantee, granteeId, round, tokenSent, amount);

        bytes memory encodedVote = abi.encode(
            tokenSent,
            amount,
            grantee,
            granteeId,
            applicationIndex
        );

// figure out ISignatureTransfer and deadline -> not needed as `token: NATIVE`? Same with `nonce`?
        Permit2Data memory permit2Data =
        Permit2Data({
            permit: PermitTransferFrom({
                permitted: TokenPermissions({token: NATIVE, amount: amount}),
                nonce: 0,
                deadline: 0
            }),
            signature: ""
        });

        _vote(poolId, recipientId, permit2Data);
    }

// DonationVotingMerkleDistributionBaseStrategy.PermitType.None == 0 ?
// granteeId == recipientId address?
    function _vote(uint256 poolId, address recipientId, Permit2Data permit2Data) internal {
        alloContract.allocate{value: permit2Data.permit.permitted.amount}(
            poolId, abi.encode(granteeId, 0, permit2Data)
        );
    }


    function callDepositV3(
        DepositParams memory params,
        bytes memory message
    ) external payable {
        (address donor, , , , ) = abi.decode(
            message,
            (address, address, uint256, address, uint256)
        );

        if (msg.sender != donor) revert Unauthorized();

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
            message
        );
    }

    function unwrapWETH(uint256 _amount) public {
        wethContract.withdraw(_amount);
    }

    receive() external payable {}

}
