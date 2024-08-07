<br/>
<div align="center">
  <a>
    <img src="app/src/static/images/Cross-chain_Gitcoin_Donations.png" width="350">
  </a>
  <h3 align="center">Cross-chain Gitcoin donations</h3>
  <p align="center">
Donate to Gitcoin public goods from any major EVM chain and Bitcoin.
  </p>
<a href="https://lennardevertz.github.io/ethDenver2024/">Live Version</a>
</div>

## Problem
There is a conflict of interest between L2s sponsoring Gitcoin rounds, and donors. L2s want to have rounds run exclusively on their chains, while donors want to be able to donate from any network where their money is. We're solving this problem by building an independent frontend interacting with Gitcoin smart contracts and enabling cross-chain donations from all major EVM chains and Bitcoin*.

**Bitcoin integration has not been completed, please see the second bullet point in the challenges section.*

## Challenges
- The core feature of Gitcoin is to match donations from individual donors with funds from a matching pool provided by sponsors. The distribution of the matching pool is determined based on the number of donations, the amount donated, and the reputation of the donors. Our solution introduces a bridging interaction between the donor and the Gitcoin contract, which makes it challenging to determine the original donor. We solved this problem by issuing onchain attestations on the Base network via the Ethereum Attestation Service. This provides a relatively easy way for Gitcoin to account for these donations in their matching calculations.
- The tBTC SDK nmp package has a nested dependency on a package that was hacked on npm in 2021. After our team member’s IDE printed critical vulnerability & malware alerts, he stopped working on the integration until the Threshold team confirmed that it’s safe to use. Unfortunately, this happened on the night before the submission deadline and there was no time to finish the integration.

## Tech Stack

- [AcrossV3 Protocol](https://across.to/)
- [Base](https://www.base.org/)
- [0x Price API](https://0x.org/docs/category/price-api)
- [IDriss Donation Widget UI](https://www.idriss.xyz/)
- Hardhat
- Smart Contracts
  - Donation (Base-Sepolia): [0xfA081C31c2a77c399bdE26b725478191e8e055Ca](https://sepolia.basescan.org/address/0xfA081C31c2a77c399bdE26b725478191e8e055Ca)
  - Donation (Sepolia): [0x43189a22A2629ff405BDD7688732b20101661848](https://sepolia.etherscan.io/address/0x43189a22A2629ff405BDD7688732b20101661848)
  - Wrapper (Base-Sepolia): [0xA3230Af30124545E002D260E7Bd4B8e0097948C6](https://sepolia.basescan.org/address/0xA3230Af30124545E002D260E7Bd4B8e0097948C6)
  - Wrapper (Sepolia): [0xfA081C31c2a77c399bdE26b725478191e8e055Ca](https://sepolia.etherscan.io/address/0xfA081C31c2a77c399bdE26b725478191e8e055Ca)
- EAS
  - [Sepolia](https://sepolia.easscan.org/schema/view/0xddb57ed77bc6860ea21047da3e8609c24a43718376587e4bb61d916011d2a6ca)
  - [Base-Sepolia](https://base-sepolia.easscan.org/schema/view/0xae11a756694e3cf5292b4cb1e3f575acf35c1c0ecda04d188f857c2ac940dd2c)


V2
Wrapper (Base-Sepolia): [0x653fcbb87997B1b85059a464De7D63Ff58b89a59](https://sepolia.basescan.org/address/0x653fcbb87997B1b85059a464De7D63Ff58b89a59)
Wrapper (Sepolia): [0xF473b415aB4604b52Fbdaefc75fD2154A017C6dF](https://sepolia.etherscan.io/address/0xF473b415aB4604b52Fbdaefc75fD2154A017C6dF)
Wrapper (Optimism): [0x1Ce21455F1D6776ccD515BCD7D892Bd4cFAdCee4](https://optimistic.etherscan.io/address/0x1Ce21455F1D6776ccD515BCD7D892Bd4cFAdCee4)
Wrapper (Arbitrum): [0x0c51AE117e8e4028e653FA3Bd5ccBaB97861c045](https://arbiscan.io/address/0x0c51AE117e8e4028e653FA3Bd5ccBaB97861c045)


The background image used in the logo was generated with the [Midjourney](https://www.midjourney.com/) text-to-image AI model. Prompt: pastel illustratios of a tent in the mountains --v 5.1</p>
