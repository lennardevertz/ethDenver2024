import {ethers} from "hardhat";

async function main() {
    // const donations = await ethers.deployContract("Donations", [], {});

    // await donations.waitForDeployment();

    // console.log(
    //   `Deployed at ${await donations.getAddress()}`
    // );

    const wrapperBase = await ethers.deployContract(
        "DonationWrapper",
        [
            "0x4200000000000000000000000000000000000021", // EAS
            "0x420dff44c420eb8b3ff3f172fb1a7d2978d333a43e3bf5337fadddd45134b860", // SCHEMA
            "0x82B564983aE7274c86695917BBf8C99ECb6F0F8F", // ACROSS_SPOKE_POOL
            "0x0000000000000000000000000000000000000000", // ALLO
            "0x4200000000000000000000000000000000000006"
        ],
        {}
    );

    await wrapperBase.waitForDeployment();

    console.log(`Deployed at ${await wrapperBase.getAddress()}`);


    // const wrapperSepolia = await ethers.deployContract(
    //     "DonationWrapper",
    //     [
    //         "0xC2679fBD37d54388Ce493F1DB75320D236e1815e", // EAS
    //         "0x420dff44c420eb8b3ff3f172fb1a7d2978d333a43e3bf5337fadddd45134b860", // SCHEMA
    //         "0x5ef6C01E11889d86803e0B23e3cB3F9E9d97B662", // ACROSS_SPOKE_POOL
    //         "0x1133eA7Af70876e64665ecD07C0A0476d09465a1", // ALLO
    //         "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14" // WETH
    //     ],
    //     {}
    // );

    // await wrapperSepolia.waitForDeployment();

    // console.log(`Deployed at ${await wrapperSepolia.getAddress()}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
