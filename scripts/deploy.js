const { ethers, upgrades } = require("hardhat");
require("dotenv").config();

async function main() {
  // 部署 NFT 合约
  const NFT = await ethers.getContractFactory("NFTMarketplace");
  const nft = await upgrades.deployProxy(NFT, ["NFT Marketplace", "NFTM"]);
  await nft.waitForDeployment();
  console.log("NFT deployed to:", await nft.getAddress());
  
  // 铸造测试 NFT
  const [owner] = await ethers.getSigners();
  await nft.mint(owner.address, 1);
  console.log("Minted NFT #1 to owner");
  
  // 部署拍卖工厂
  const AuctionFactory = await ethers.getContractFactory("AuctionFactory");
  const factory = await AuctionFactory.deploy();
  await factory.waitForDeployment();
  console.log("AuctionFactory deployed to:", await factory.getAddress());
  
  // Chainlink 价格源地址 (Sepolia 测试网)
  const ethUsdPriceFeed = "0x694AA1769357215DE4FAC081bf1f309aDC325306";
  const erc20UsdPriceFeed = "0x14866185B1962B63C3Ea9E03Bc1da838bab34C19"; // 示例 USDC/USD
  
  // 创建拍卖
  const tx = await factory.createAuction(
    await nft.getAddress(), // NFT 地址
    1, // Token ID
    "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // USDC 测试代币地址
    ethUsdPriceFeed,
    erc20UsdPriceFeed,
    ethers.parseUnits("100", 18), // 起拍价 $100
    86400 // 持续时间 1 天
  );
  
  const receipt = await tx.wait();
  const auctionAddress = receipt.logs[0].args.auction;
  console.log("Auction created at:", auctionAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});