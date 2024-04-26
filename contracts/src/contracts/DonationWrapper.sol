// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

import {PublicGoodAttester} from "./libs/Attestation.sol";

import {Native} from "./libs/Native.sol";

import {IAllo} from "./interfaces/IAllo.sol";
import {ISignatureTransfer} from "./interfaces/ISignatureTransfer.sol";
import {V3SpokePoolInterface} from "./interfaces/ISpokePool.sol";
import {WETH9Interface} from "./interfaces/IWETH.sol";

contract DonationWrapper is
    Ownable,
    ReentrancyGuard,
    Native,
    PublicGoodAttester
{

    event InitializeEAS(address indexed eas);
    event Withdraw();
    event Donate(uint256 roundId, bytes voteData, uint256 amount);
    event Deposit(address indexed donor, bytes message);

    error Unauthorized();
    error InvalidAmount();
    error NoRoundOnDestination();
    error EasAlreadySet();
    error OutputAmountZero();

    address public SPOKE_POOL;
    address public ALLO_ADDRESS;
    address public WETH_ADDRESS;
    V3SpokePoolInterface spokePool;
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

    /**
     * @param _eas Address of the EAS contract for attestation.
     * @param _easSchema Schema identifier for EAS.
     * @param _acrossSpokePool Address of the Across spoke pool.
     * @param _allo Address of the AlloV2 contract.
     * @param _wethAddress WETH address.
     */
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

    /**
     * @notice Initiates a cross chain donation by depositing to Across+.
     * @param params Across deposit params.
     * @param message Encoded donation data and signature for destination chain verification.
     */
    function callDepositV3(
        DepositParams memory params,
        bytes memory message
    ) external payable nonReentrant {
        (bytes memory donationData, bytes memory signature) = abi.decode(
            message,
            (bytes, bytes)
        );

        (, address donor, ) = abi.decode(
            donationData,
            (uint256, address, bytes) // roundId, donor, voteParams(encoded)
        );

        if (!verifyDonation(donationData, signature) || msg.sender != donor)
            revert Unauthorized();

        makeDeposit(params, message);
    }

    /**
     * @notice Handles the deposit of funds into the Across protocol.
     * @dev This function makes a deposit call to the Spoke Pool contract.
     * @param params Structured Across deposit parameters.
     * @param message Message passed along with the deposit.
     *                This will be the input message for `handleV3AcrossMessage` on the destination chain.
     */
    function makeDeposit(
        DepositParams memory params,
        bytes memory message
    ) internal {
        if (params.outputAmount == 0) revert OutputAmountZero();
        spokePool.depositV3{value: msg.value}(
            msg.sender, // donor
            params.recipient,
            WETH_ADDRESS, // inputToken
            address(0), // outputToken
            params.inputAmount,
            params.outputAmount,
            params.destinationChainId,
            params.exclusiveRelayer,
            params.quoteTimestamp,
            params.fillDeadline,
            params.exclusivityDeadline,
            message
        );

        emit Deposit(msg.sender, message);
    }

    /**
     * @notice Handles incoming messages from the V3 Across bridge and processes donations.
     * @param tokenSent The token used for donation.
     * @param amount The amount of the token sent.
     * @param relayer The address of the relayer.
     * @param message Encoded donation data and signature.
     */
    function handleV3AcrossMessage(
        address tokenSent,
        uint256 amount,
        address relayer,
        bytes memory message
    ) external payable nonReentrant {
        if (msg.sender != SPOKE_POOL) revert Unauthorized();

        (bytes memory donationData, bytes memory signature) = abi.decode(
            message,
            (bytes, bytes)
        );

        if (!verifyDonation(donationData, signature)) revert Unauthorized();

        handleDonation(donationData, amount, tokenSent, relayer);
    }

    /**
     * @notice Processes a donation by unwrapping WETH, attesting, and voting.
     * @param donationData The donation data including the roundID, donor address and vote parameters.
     * @param amount The amount of WETH to unwrap and donate.
     * @param tokenSent The token sent (currently only WETH supported).
     * @param relayer The address of the relayer.
     */
    function handleDonation(
        bytes memory donationData,
        uint256 amount,
        address tokenSent,
        address relayer
    ) internal {
        (uint256 roundId, address donor, bytes memory voteData) = abi.decode(
            donationData,
            (uint256, address, bytes) // roundId, donor, voteParams(encoded)
        );

        (address recipientId, , Permit2Data memory permit2Data) = abi.decode(
            voteData,
            (address, PermitType, Permit2Data)
        );

        if (amount != permit2Data.permit.permitted.amount)
            revert InvalidAmount();

        // Only support WETH transfers for now. This can be switched to a swap() call in the future to allow for wider token support.
        unwrapWETH(amount);

        _attestDonor(
            donor,
            recipientId,
            roundId,
            tokenSent,
            permit2Data.permit.permitted.amount,
            relayer
        );

        _vote(roundId, voteData, permit2Data.permit.permitted.amount);
        
        emit Donate(roundId, voteData, permit2Data.permit.permitted.amount);
    }

    /**
     * @notice Internal function to execute voting.
     * @dev This function makes a call to the Allo contract to allocate funds based on the encoded vote data.
     * @dev Reverts if no Allo contract was set up.
     * @param _roundId The unique identifier of the donation round.
     * @param _voteData Encoded data containing the vote information.
     * @param _amount The amount of funds to allocate.
     */
    function _vote(
        uint256 _roundId,
        bytes memory _voteData,
        uint256 _amount
    ) internal {
        if (address(alloContract) == address(0)) revert NoRoundOnDestination();
        alloContract.allocate{value: _amount}(_roundId, _voteData);
    }

    /**
     * @notice Converts WETH into ETH.
     * @notice This contract in general only forwards native ETH, 
     *         which is why this function can be publicly called by anyone.
     * @param _amount The amount of WETH to convert.
     */
    function unwrapWETH(uint256 _amount) public {
        wethContract.withdraw(_amount);
    }

    /**
     * @notice Verifies the authenticity of a donation using user's signature.
     * @dev This function checks if the donation data signed by the donor matches the provided signature.
     * @param donationData Encoded donation details.
     * @param signature Signature proving the donation was authorized by the donor.
     * @return bool True if the signature is valid, false otherwise.
    */
    function verifyDonation(
        bytes memory donationData,
        bytes memory signature
    ) public pure returns (bool) {
        (, address donor, ) = abi.decode(
            donationData,
            (uint256, address, bytes) // roundId, donor, voteParams(encoded)
        );

        return verify(donor, donationData, signature);
    }

    function getMessageHash(
        bytes memory _message
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(_message));
    }

    function getEthSignedMessageHash(
        bytes32 _messageHash
    ) public pure returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(
                    "\x19Ethereum Signed Message:\n32",
                    _messageHash
                )
            );
    }

    /**
     * @notice Verifies a signed message using ECDSA.recover.
     * @param _signer The expected signer's address.
     * @param _message The original message that was signed.
     * @param _signature The signature to verify.
     * @return bool True if the signature was made by the signer on the given message.
     */
    function verify(
        address _signer,
        bytes memory _message,
        bytes memory _signature
    ) public pure returns (bool) {
        bytes32 messageHash = getMessageHash(_message);
        bytes32 ethSignedMessageHash = getEthSignedMessageHash(messageHash);

        return ECDSA.recover(ethSignedMessageHash, _signature) == _signer;
    }


    /**
     * @notice Withdraw accidentally sent native currency
     * @notice Amount sent through AcrossV3 will be forwarded 100% as
     *         amountOut == permit2Data.permit.permitted.amount
     */
    function withdraw() external onlyOwner {
        (bool success, ) = msg.sender.call{value: address(this).balance}("");
        require(success, "Failed to withdraw.");
        emit Withdraw();
    }

    /**
     * @notice Set up EAS contract
     * @param eas The new address of the EAS contract.
     * @param easSchema The schema that will host the attestation.
     */
    function initializeEAS(address eas, bytes32 easSchema) external onlyOwner {
        if (address(easContract) != address(0)) revert EasAlreadySet();
        _initializeEAS(eas, easSchema);
        emit InitializeEAS(eas);
    }

    /**
     * @notice Receives ETH when unwrapping WETH.
     */
    receive() external payable {}
}
