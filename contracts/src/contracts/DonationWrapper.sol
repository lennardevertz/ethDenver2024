// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {PublicGoodAttester} from "./libs/Attestation.sol";
import {IDonations} from "./interfaces/IDonations.sol";

contract DonationWrapper is Ownable, PublicGoodAttester {
    error Unauthorized();

    address public SPOKE_POOL;
    IDonations donationsContract;

    constructor(
        address _eas,
        bytes32 _easSchema,
        address _acrossSpokePool,
        address _donationsContractAddress
    ) PublicGoodAttester(_eas, _easSchema) {
        SPOKE_POOL = _acrossSpokePool;
        donationsContract = IDonations(_donationsContractAddress);
    }

    function handleV3AcrossMessage(
        address tokenSent,
        uint256 amount,
        address relayer,
        bytes memory message
    ) external payable {

        if (msg.sender != SPOKE_POOL) revert Unauthorized();

        (address donor, address grantee, uint256 granteeId, address round, uint256 applicationIndex) = abi
            .decode(message, (address, address, uint256, address, uint256));

        _attestDonor(donor, grantee, granteeId, round, tokenSent, amount);

        bytes memory encodedVote = abi.encode(tokenSent, amount, grantee, granteeId, applicationIndex);

        donationsContract.vote(encodedVote, round, tokenSent);

    }
}
