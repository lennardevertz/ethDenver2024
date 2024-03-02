import {ethers} from "hardhat";

async function main() {
    // const donations = await ethers.deployContract("Donations", [], {});

    // await donations.waitForDeployment();

    // console.log(
    //   `Deployed at ${await donations.getAddress()}`
    // );

    // const wrapperBase = await ethers.deployContract(
    //     "DonationWrapper",
    //     [
    //         "0x4200000000000000000000000000000000000021",
    //         "0xae11a756694e3cf5292b4cb1e3f575acf35c1c0ecda04d188f857c2ac940dd2c",
    //         "0x82B564983aE7274c86695917BBf8C99ECb6F0F8F",
    //         "0xfA081C31c2a77c399bdE26b725478191e8e055Ca",
    //         "0x4200000000000000000000000000000000000006"
    //     ],
    //     {}
    // );

    // await wrapperBase.waitForDeployment();

    // console.log(`Deployed at ${await wrapperBase.getAddress()}`);
    const wrapperSepolia = await ethers.deployContract(
        "DonationWrapper",
        [
            "0xC2679fBD37d54388Ce493F1DB75320D236e1815e",
            "0xddb57ed77bc6860ea21047da3e8609c24a43718376587e4bb61d916011d2a6ca",
            "0x5ef6C01E11889d86803e0B23e3cB3F9E9d97B662",
            "0x43189a22A2629ff405BDD7688732b20101661848",
            "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14"
        ],
        {}
    );

    await wrapperSepolia.waitForDeployment();

    console.log(`Deployed at ${await wrapperSepolia.getAddress()}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
