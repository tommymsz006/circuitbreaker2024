import { ethers, network } from "hardhat";

async function main() {
  const entryPointAddress = process.env.ENTRY_POINT_ADDRESS;
  console.log(`EntryPoint is located at ${entryPointAddress} on the network ${network.name}.`);

  const semaphoreAddress = process.env.SEMAPHORE_ADDRESS;
  console.log(`Semaphore is located at ${semaphoreAddress} on the network ${network.name}.`);

  if (entryPointAddress && semaphoreAddress) {
    const PrivacyAccountFactory = await ethers.getContractFactory("PrivacyAccountFactory");
    const factory = await PrivacyAccountFactory.deploy(entryPointAddress, semaphoreAddress);
    await factory.deployed();
    console.log(`PrivacyAccountFactory is deployed at ${factory.address} on the network ${network.name}.`);
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
