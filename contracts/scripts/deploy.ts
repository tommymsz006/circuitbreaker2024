import { ethers, network } from "hardhat";

async function main() {
  const entryPointAddress = process.env.ENTRY_POINT_ADDRESS;
  console.log(`Contract EntryPoint is located at ${entryPointAddress} on network ${network.name}.`);

  if (entryPointAddress) {
    const PrivacyAccountFactory = await ethers.getContractFactory("PrivacyAccountFactory");
    const factory = await PrivacyAccountFactory.deploy(entryPointAddress);
    await factory.deployed();
    console.log(`PrivacyAccountFactory is deployed at ${factory.address} on network ${network.name}.`);
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
