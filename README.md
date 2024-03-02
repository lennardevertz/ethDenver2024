<br/>
<div align="center">
  <a>
    <img src="app/src/static/images/Cross-chain_Gitcoin_Donations.png" width="350">
  </a>
  <h3 align="center">Cross-chain Gitcoin donations</h3>
  <p align="center">
Donate to Gitcoin public goods from any major EVM chain and Bitcoin.
  </p>
</div>

## Problem
There is a conflict of interest between L2s sponsoring Gitcoin rounds, and donors. L2s want to have rounds run exclusively on their chains, while donors want to be able to donate from any network where their money is. We're solving this problem by building an indepepndent frontend interacting with Gitcoin smart contracts and enabling cross-chain donations from all major EVM chains and Bitcoin.

## Challenges
The core feature of Gitcoin is to match donations from individual donors with funds from a matching pool provided by sponsors. The distribution of the matching pool is determined based on the number of donations, the amount donated, and the reputation of the donors. Our solution introduces a bridging interaction between the donor and the Gitcoin contract, which makes it challenging to determine the original donor. We solved this problem by issuing onchain attestations on the Base network via the Ethereum Attestation Service. This provides a relatively easy way for Gitcoin to account for these donations in their matching calculations.

## Tech Stack

- [Across Protocol](https://across.to/)
- [Base](https://www.base.org/)
- [IDriss](https://www.idriss.xyz/)
- Hardhat
- Truffle Dashboard
- Smart Contracts
  - Donation (Base-Sepolia): 0x9D4440A1c8865c6eD4dD93f3F8646155424154FE
  - Donation (Sepolia): 0xcbf32F0a9BF93256BAD8cD31cF37a3e914245908
  - Wrapper (Base-Sepolia): 0x63c461A407FaE2E7F743B9be79A8DdF815D0F487
  - Wrapper (Sepolia): 0x1Ce21455F1D6776ccD515BCD7D892Bd4cFAdCee4