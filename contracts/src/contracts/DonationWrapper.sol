// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {PublicGoodAttester} from "./libs/Attestation.sol";

import {Native} from "./libs/Native.sol";

import {IDonations} from "./interfaces/IDonations.sol";
import {IAllo} from "./interfaces/IAllo.sol";
import {ISignatureTransfer} from "./interfaces/ISignatureTransfer.sol";
import {V3SpokePoolInterface} from "./interfaces/ISpokePool.sol";
import {WETH9Interface} from "./interfaces/IWETH.sol";

contract DonationWrapper is Ownable, Native, PublicGoodAttester {
    error Unauthorized();
    error MissingData();

    event Logger(bytes);

    address public SPOKE_POOL;
    address public ALLO_ADDRESS;
    address public WETH_ADDRESS;
    V3SpokePoolInterface spokePool;
    IAllo alloContract;
    WETH9Interface wethContract;

    uint256 testOffset;

    ISignatureTransfer public permit2;

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

    enum PermitType {
        None,
        Permit,
        PermitDAI,
        Permit2
    }

    struct Permit2Data {
        ISignatureTransfer.PermitTransferFrom permit;
        bytes signature;
    }

    constructor(
        address _eas,
        bytes32 _easSchema,
        address _acrossSpokePool,
        address _allo,
        address _wethAddress
    ) PublicGoodAttester(_eas, _easSchema) {
        SPOKE_POOL = _acrossSpokePool;
        WETH_ADDRESS = _wethAddress;
        ALLO_ADDRESS = _allo;
        spokePool = V3SpokePoolInterface(SPOKE_POOL);
        alloContract = IAllo(ALLO_ADDRESS);
        wethContract = WETH9Interface(WETH_ADDRESS);
        testOffset = 301;
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
            address recipientId,
            uint256 roundId
        ) = abi.decode(message, (address, address, address, uint256));

        // setup new schema
        _attestDonor(donor, grantee, recipientId, roundId, tokenSent, amount, relayer);
        
        Permit2Data memory permit2Data =
        Permit2Data({
            permit: ISignatureTransfer.PermitTransferFrom({
                permitted: ISignatureTransfer.TokenPermissions({token: NATIVE, amount: amount}),
                nonce: 0,
                deadline: testOffset + 10000
            }),
            signature: ""
        });

        _vote(roundId, recipientId, permit2Data);
    }

    function _vote(uint256 roundId, address recipientId, Permit2Data memory permit2Data) internal {
        alloContract.allocate{value: permit2Data.permit.permitted.amount}(
            roundId, abi.encode(recipientId, PermitType.None, permit2Data)
        );
    }


    function callDepositV3(
        DepositParams memory params,
        bytes memory message
    ) external payable {

        (address donor,,address recipientId,) = abi.decode(
            message,
            (address, address, address, uint256)
        );

        if (msg.sender != donor) revert Unauthorized();

        // spokePool.depositV3{value: msg.value}(
        //     msg.sender, // donor
        //     params.recipient,
        //     params.inputToken,
        //     params.outputToken,
        //     params.inputAmount,
        //     params.outputAmount,
        //     params.destinationChainId,
        //     params.exclusiveRelayer,
        //     params.quoteTimestamp,
        //     params.fillDeadline,
        //     params.exclusivityDeadline,
        //     message
        // );

        Permit2Data memory permit2Data =
        Permit2Data({
            permit: ISignatureTransfer.PermitTransferFrom({
                permitted: ISignatureTransfer.TokenPermissions({token: NATIVE, amount: 1000000000000000}),
                nonce: 0,
                deadline: testOffset + 10000
            }),
            signature: ""
        });
        emit Logger(abi.encode(recipientId, PermitType.None, permit2Data));
    }

    function unwrapWETH(uint256 _amount) public {
        wethContract.withdraw(_amount);
    }

    receive() external payable {}

}
