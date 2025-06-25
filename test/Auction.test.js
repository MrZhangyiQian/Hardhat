const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("NFT Auction Market", function () {
  let nft, factory, auction, owner, bidder;
  let ethUsdPriceFeed = "0x694AA1769357215DE4FAC081bf1f309aDC325306";
  let erc20UsdPriceFeed = "0x14866185B1962B63C3Ea9E03Bc1da838bab34C19";
  
  before(async function () {
    [owner, bidder] = await ethers.getSigners();
    
    // 部署 NFT 合约
    const NFT = await ethers.getContractFactory("NFTMarketplace");
    nft = await upgrades.deployProxy(NFT, ["NFT Marketplace", "NFTM"]);
    await nft.waitForDeployment();
    
    // 铸造 NFT
    await nft.mint(owner.address, 1);
    
    // 部署工厂合约
    const Factory = await ethers.getContractFactory("AuctionFactory");
    factory = await Factory.deploy();
    await factory.waitForDeployment();
  });
  
  it("应该创建拍卖", async function () {
    const tx = await factory.createAuction(
      await nft.getAddress(),
      1,
      ethers.ZeroAddress, // 使用 ETH
      ethUsdPriceFeed,
      erc20UsdPriceFeed,
      ethers.parseUnits("100", 18),
      86400
    );
    
    const receipt = await tx.wait();
    auctionAddress = receipt.logs[0].args.auction;
    auction = await ethers.getContractAt("Auction", auctionAddress);
    
    expect(await nft.ownerOf(1)).to.equal(auctionAddress);
  });
  
  it("应该允许出价", async function () {
    const bidAmountUSD = ethers.parseUnits("150", 18);
    const ethPrice = await auction.getEthUsdPrice();
    const ethAmount = (bidAmountUSD * ethers.toBigInt(10**18)) / ethPrice;
    
    await auction.connect(bidder).bid(bidAmountUSD, {
      value: ethAmount
    });
    
    const auctionInfo = await auction.getAuctionInfo();
    expect(auctionInfo.highestBidder).to.equal(bidder.address);
    expect(auctionInfo.highestBidUSD).to.equal(bidAmountUSD);
  });
  
  it("应该结束拍卖并转移资产", async function () {
    // 加速时间
    await time.increase(86400 + 1);
    
    await auction.endAuction();
    
    const auctionInfo = await auction.getAuctionInfo();
    expect(auctionInfo.state).to.equal(1); // AuctionState.ENDED
    
    expect(await nft.ownerOf(1)).to.equal(bidder.address);
  });
  
  it("应该支持 ERC20 支付", async function () {
    // 创建使用 ERC20 的拍卖
    const paymentToken = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"; // 测试 USDC
    const tx = await factory.createAuction(
      await nft.getAddress(),
      1,
      paymentToken,
      ethUsdPriceFeed,
      erc20UsdPriceFeed,
      ethers.parseUnits("100", 18),
      86400
    );
    
    const receipt = await tx.wait();
    const erc20AuctionAddress = receipt.logs[0].args.auction;
    const erc20Auction = await ethers.getContractAt("Auction", erc20AuctionAddress);
    
    // 出价
    const bidAmountUSD = ethers.parseUnits("150", 18);
    const erc20Price = await erc20Auction.getErc20UsdPrice();
    const tokenAmount = (bidAmountUSD * ethers.toBigInt(10**18)) / erc20Price;
    
    // 模拟 ERC20 代币
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const erc20 = MockERC20.attach(paymentToken);
    
    // 批准代币
    await erc20.connect(bidder).approve(erc20AuctionAddress, tokenAmount);
    
    // 出价
    await erc20Auction.connect(bidder).bid(bidAmountUSD);
    
    // 结束拍卖
    await time.increase(86400 + 1);
    await erc20Auction.endAuction();
    
    expect(await nft.ownerOf(1)).to.equal(bidder.address);
  });
});