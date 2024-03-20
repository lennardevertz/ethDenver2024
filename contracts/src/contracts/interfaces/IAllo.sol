// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

/**
 * @notice Base interface for the Allo contract.
 */
interface IAllo {
    function allocate(uint256 _poolId, bytes memory _data) external payable;
}