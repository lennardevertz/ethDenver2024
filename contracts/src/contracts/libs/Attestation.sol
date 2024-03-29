// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {IEAS, AttestationRequest, AttestationRequestData} from "../interfaces/IEAS.sol";
import {NO_EXPIRATION_TIME, EMPTY_UID} from "./Common.sol";

/**
 * @title PublicGoodAttester
 */
contract PublicGoodAttester {
    error InvalidEAS();

    // The address of the global EAS contract.
    IEAS private EAS;
    bytes32 public EAS_SCHEMA;

    constructor(address eas, bytes32 easSchema) {
        if (eas != address(0)) {
            _initializeEAS(eas, easSchema);
        }
    }

    function _initializeEAS(address eas, bytes32 easSchema) internal {
        if (eas == address(0)) {
            revert InvalidEAS();
        }
        EAS = IEAS(eas);
        EAS_SCHEMA = easSchema;
    }

    function _attestDonor(
        address _donor,
        address _grantee,
        address _recipientId,
        uint256 _round,
        address _tokenSent,
        uint256 _amount,
        address _relayer
    ) internal {
        EAS.attest(
            AttestationRequest({
                schema: EAS_SCHEMA,
                data: AttestationRequestData({
                    recipient: _donor,
                    expirationTime: NO_EXPIRATION_TIME,
                    revocable: false,
                    refUID: EMPTY_UID,
                    data: abi.encode(
                        _donor,
                        _grantee,
                        _recipientId,
                        _round,
                        _tokenSent,
                        _amount,
                        _relayer
                    ),
                    value: 0 
                })
            })
        );
    }
}
