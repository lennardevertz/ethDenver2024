// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract Donations is Ownable {
    error WithdrawFailed();

    mapping(address => uint256) public donationFunds;

    function vote(
        bytes memory encodedVote,
        address roundContractAddress,
        address asset
    ) external payable {
        (address assetContractAddress, uint256 amount, address recipient, uint256 projectId, uint256 applicationIndex) = 
            abi.decode(encodedVote, (address, uint256, address, uint256, uint256));
 
        donationFunds[recipient] += amount;
    }

    function withdraw() public {
        uint256 amount = donationFunds[msg.sender];
        require(amount > 0, "No funds allocated");

        donationFunds[msg.sender] = 0;
        (bool success, ) = msg.sender.call{value: amount}("");
        if (!success) {
            revert WithdrawFailed();
        }
    }
}
