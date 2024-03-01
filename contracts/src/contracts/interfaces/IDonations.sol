// SPDX-License-Identifier: MIT
interface IDonations {
    function vote(bytes memory encodedVote, address roundContractAddress, address asset) external;
}