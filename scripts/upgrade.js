const { ethers, upgrades } = require("hardhat");

async function main() {
  const NFT_V2 = await ethers.getContractFactory("NFTMarketplaceV2");
  const upgraded = await upgrades.upgradeProxy("0x...", NFT_V2);
  console.log("NFT upgraded to:", await upgraded.getAddress());
}

main();