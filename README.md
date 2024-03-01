<br/>
<div align="center">
  <a>
    <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAcCAMAAABF0y+mAAAAP1BMVEUAQzsAQzsAQzsAPTQAQDgANy2WpaM/Yl0ALiP///+otbMACAAAJxpSb2rd4uJogXzK0dCBlZIjUUq7xcTz9fUp8LglAAAAAnRSTlMm5BIqaH0AAADfSURBVHgBfNKBCsMgDEXRzSQ2z0a12v//1tUyoM61FxTgYCDg6/V2N71nG9Q9dEFiJ3yD5BfxC/9HRVgRjO4wIvmsMiMZvnnlH2RJSFFNY0ESHlETEPSckJF0QPHICHLkRBI2uqIiWa7ii7cNaHJ9SRGZSBN2AGUvOuCGyseV14ywNgwoHtQvI4O3ABtww8IU0ZaGJGUfXnKFF6ceQAMQ5Ip9TXVOaq7qyu+eFFGMHdNxrMEG7CMLK/U0jNi1L7/lo1gmdFIbvs3oWLTGs4Un7NFZtxHnnvH5U3+GLzsAAOyFDgN+WSNyAAAAAElFTkSuQmCC" width="350">
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