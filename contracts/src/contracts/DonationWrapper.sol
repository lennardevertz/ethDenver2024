// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";


import {PublicGoodAttester} from "./libs/Attestation.sol";

import {Native} from "./libs/Native.sol";

import {IDonations} from "./interfaces/IDonations.sol";
import {IAllo} from "./interfaces/IAllo.sol";
import {ISignatureTransfer} from "./interfaces/ISignatureTransfer.sol";
import {V3SpokePoolInterface} from "./interfaces/ISpokePool.sol";
import {WETH9Interface} from "./interfaces/IWETH.sol";

contract DonationWrapper is Ownable, ReentrancyGuard, Native, PublicGoodAttester {
    error Unauthorized();
    error InsufficientFunds();

    event Logger(bytes);

    address public SPOKE_POOL;
    address public ALLO_ADDRESS;
    address public WETH_ADDRESS;
    V3SpokePoolInterface spokePool;
    IAllo alloContract;
    WETH9Interface wethContract;

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
    }

    function handleV3AcrossMessage(
        address tokenSent,
        uint256 amount,
        address relayer,
        bytes memory message
    ) external payable nonReentrant {
        if (msg.sender != SPOKE_POOL) revert Unauthorized();

        (bytes memory donationData, bytes memory signature) = abi.decode(message, (bytes, bytes));

        if (!verifyDonation(donationData, signature)) revert Unauthorized();

        handleDonation(donationData, amount, tokenSent, relayer);
    }
    
    function handleV3AcrossMessageV2(
        address tokenSent,
        uint256 amount,
        address relayer,
        bytes memory message
    ) external payable nonReentrant {
        if (msg.sender != SPOKE_POOL) revert Unauthorized();

        (bytes memory donationData, bytes memory signature) = abi.decode(message, (bytes, bytes));

        if (!verifyDonation(donationData, signature)) revert Unauthorized();

        handleDonationV2(donationData, amount, tokenSent, relayer);
    }

    function callDepositV3(
        DepositParams memory params,
        bytes memory message
    ) external payable nonReentrant {

        (bytes memory donationData, bytes memory signature) = abi.decode(message, (bytes, bytes));

        (,,address donor,) = abi.decode(
            donationData,
            (uint256, address, address, bytes) // roundId, grantee, donor, voteParams(encoded)
        );

        // Verifying donationData
        if (!verifyDonation(donationData, signature) || msg.sender != donor) revert Unauthorized();

        makeDeposit(params, message);
    }

    function handleDonation(bytes memory donationData, uint256 amount, address tokenSent, address relayer) internal {

        // Permit2Data memory permit2Data =
        // Permit2Data({
        //     permit: ISignatureTransfer.PermitTransferFrom({
        //         permitted: ISignatureTransfer.TokenPermissions({token: NATIVE, amount: amount}),
        //         nonce: 0,
        //         deadline: testOffset + 10000
        //     }),
        //     signature: ""
        // });

        // _vote(roundId, recipientId, permit2Data);


        (uint256 roundId, address grantee, address donor, bytes memory voteData) = abi.decode(
            donationData,
            (uint256, address, address, bytes) // roundId, grantee, donor, voteParams(encoded)
        );

        (address recipientId,, Permit2Data memory permit2Data) = abi.decode(voteData, (address, PermitType, Permit2Data));

        if (amount < permit2Data.permit.permitted.amount) revert InsufficientFunds();

        // Only support WETH transfers for now. This can be switched to a swap() call in the future to allow for wider token support.
        unwrapWETH(amount);

        // setup new schema
        _attestDonor(donor, grantee, recipientId, roundId, tokenSent, amount, relayer);        
        
        _vote(roundId, voteData, amount);
    }

    function handleDonationV2(bytes memory donationData, uint256 amount, address tokenSent, address relayer) internal {

        (uint256 roundId, address grantee, address donor, bytes memory voteData) = abi.decode(
            donationData,
            (uint256, address, address, bytes) // roundId, grantee, donor, voteParams(encoded)
        );

        (address recipientId,, Permit2Data memory permit2Data) = abi.decode(voteData, (address, PermitType, Permit2Data));

        if (amount < permit2Data.permit.permitted.amount) revert InsufficientFunds();

        // Only support WETH transfers for now. This can be switched to a swap() call in the future to allow for wider token support.
        unwrapWETH(amount);

        // setup new schema
        _attestDonor(donor, grantee, recipientId, roundId, tokenSent, amount, relayer);        
        
    }

    function _vote(uint256 _roundId, bytes memory _voteData, uint256 _amount) internal {
        alloContract.allocate{value: _amount}(
            _roundId, _voteData
        );
        // alloContract.allocate{value: permit2Data.permit.permitted.amount}(
        //     roundId, abi.encode(recipientId, PermitType.None, permit2Data)
        // );
    }

     function makeDeposit(DepositParams memory params, bytes memory message) internal {
        // make sure that params.outputAmount >= amount in voteParams
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

    // Verifying Signatures
    function verifyDonation(bytes memory donationData, bytes memory signature) public pure returns (bool) {
        (,,address donor,) = abi.decode(
            donationData,
            (uint256, address, address, bytes) // roundId, grantee, donor, voteParams(encoded)
        );

        return verify(donor, donationData, signature);
    }

        // Verifying Signatures
    function verifyDonation2(bytes memory message) public pure returns (bool) {
        (bytes memory donationData, bytes memory signature) = abi.decode(message, (bytes, bytes));

        (,,address donor,) = abi.decode(
            donationData,
            (uint256, address, address, bytes) // roundId, grantee, donor, voteParams(encoded)
        );

        return verify(donor, donationData, signature);
    }    
    
    
    function verifyDonation3(bytes memory message) public pure returns (bool) {
        (bytes memory donationData, bytes memory signature) = abi.decode(message, (bytes, bytes));

        return verifyDonation(donationData, signature);
    }

    function getMessageHash(
        bytes memory _message
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(_message));
    }

    function getEthSignedMessageHash(bytes32 _messageHash)
        public
        pure
        returns (bytes32)
    {
        return keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", _messageHash)
        );
    }

    function verify(
        address _signer,
        bytes memory _message,
        bytes memory _signature
    ) public pure returns (bool) {
        bytes32 messageHash = getMessageHash(_message);
        bytes32 ethSignedMessageHash = getEthSignedMessageHash(messageHash);

        return recoverSigner(ethSignedMessageHash, _signature) == _signer;
    }

    function recoverSigner(
        bytes32 _ethSignedMessageHash,
        bytes memory _signature
    ) public pure returns (address) {
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(_signature);

        return ecrecover(_ethSignedMessageHash, v, r, s);
    }

     function splitSignature(bytes memory sig)
        public
        pure
        returns (bytes32 r, bytes32 s, uint8 v)
    {
        require(sig.length == 65, "invalid signature length");

        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
    }

    receive() external payable {}

}
