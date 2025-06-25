// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract Auction {
    // 拍卖状态
    enum AuctionState { OPEN, ENDED, CANCELLED }
    
    // 拍卖信息
    struct AuctionInfo {
        address nftAddress;
        uint256 tokenId;
        address paymentToken;
        address seller;
        uint256 startingPriceUSD;
        uint256 highestBidUSD;
        address highestBidder;
        uint256 startTime;
        uint256 endTime;
        AuctionState state;
    }
    
    AuctionInfo public auctionInfo;
    
    // Chainlink 预言机
    AggregatorV3Interface internal ethUsdPriceFeed;
    AggregatorV3Interface internal erc20UsdPriceFeed;
    
    event BidPlaced(address indexed bidder, uint256 bidAmountUSD);
    event AuctionEnded(address indexed winner, uint256 winningBid);
    event AuctionCancelled();
    
    constructor(
        address _nftAddress,
        uint256 _tokenId,
        address _paymentToken,
        address _ethUsdPriceFeed,
        address _erc20UsdPriceFeed,
        uint256 _startingPriceUSD,
        uint256 _duration,
        address _seller
    ) {
        auctionInfo = AuctionInfo({
            nftAddress: _nftAddress,
            tokenId: _tokenId,
            paymentToken: _paymentToken,
            seller: _seller,
            startingPriceUSD: _startingPriceUSD,
            highestBidUSD: 0,
            highestBidder: address(0),
            startTime: block.timestamp,
            endTime: block.timestamp + _duration,
            state: AuctionState.OPEN
        });
        
        ethUsdPriceFeed = AggregatorV3Interface(_ethUsdPriceFeed);
        if (_paymentToken != address(0)) {
            erc20UsdPriceFeed = AggregatorV3Interface(_erc20UsdPriceFeed);
        }
    }
    
    // 获取 ETH/USD 价格
    function getEthUsdPrice() public view returns (int) {
        (, int price, , , ) = ethUsdPriceFeed.latestRoundData();
        return price;
    }
    
    // 获取 ERC20/USD 价格
    function getErc20UsdPrice() public view returns (int) {
        require(auctionInfo.paymentToken != address(0), "Payment token is ETH");
        (, int price, , , ) = erc20UsdPriceFeed.latestRoundData();
        return price;
    }
    
    // 出价函数
    function bid(uint256 bidAmountUSD) external payable {
        require(auctionInfo.state == AuctionState.OPEN, "Auction not open");
        require(block.timestamp < auctionInfo.endTime, "Auction ended");
        require(bidAmountUSD > auctionInfo.highestBidUSD, "Bid too low");
        require(bidAmountUSD >= auctionInfo.startingPriceUSD, "Bid below starting price");
        
        // 计算需要支付的代币数量
        uint256 tokenAmount;
        if (auctionInfo.paymentToken == address(0)) {
            // ETH 支付
            int ethUsdPrice = getEthUsdPrice();
            require(ethUsdPrice > 0, "Invalid price feed");
            tokenAmount = (bidAmountUSD * 1e18) / uint256(ethUsdPrice);
            require(msg.value >= tokenAmount, "Insufficient ETH");
            
            // 退还前一个最高出价者的 ETH
            if (auctionInfo.highestBidder != address(0)) {
                payable(auctionInfo.highestBidder).transfer(
                    (auctionInfo.highestBidUSD * 1e18) / uint256(ethUsdPrice)
                );
            }
        } else {
            // ERC20 支付
            int erc20UsdPrice = getErc20UsdPrice();
            require(erc20UsdPrice > 0, "Invalid price feed");
            tokenAmount = (bidAmountUSD * 1e18) / uint256(erc20UsdPrice);
            
            // 转移代币
            IERC20(auctionInfo.paymentToken).transferFrom(
                msg.sender,
                address(this),
                tokenAmount
            );
            
            // 退还前一个最高出价者的代币
            if (auctionInfo.highestBidder != address(0)) {
                IERC20(auctionInfo.paymentToken).transfer(
                    auctionInfo.highestBidder,
                    (auctionInfo.highestBidUSD * 1e18) / uint256(erc20UsdPrice)
                );
            }
        }
        
        // 更新最高出价
        auctionInfo.highestBidUSD = bidAmountUSD;
        auctionInfo.highestBidder = msg.sender;
        
        emit BidPlaced(msg.sender, bidAmountUSD);
    }
    
    // 结束拍卖
    function endAuction() external {
        require(block.timestamp >= auctionInfo.endTime, "Auction not ended");
        require(auctionInfo.state == AuctionState.OPEN, "Auction already ended");
        
        auctionInfo.state = AuctionState.ENDED;
        
        // 转移 NFT 给最高出价者
        IERC721(auctionInfo.nftAddress).safeTransferFrom(
            address(this),
            auctionInfo.highestBidder,
            auctionInfo.tokenId
        );
        
        // 转移资金给卖家
        if (auctionInfo.paymentToken == address(0)) {
            payable(auctionInfo.seller).transfer(address(this).balance);
        } else {
            uint256 balance = IERC20(auctionInfo.paymentToken).balanceOf(address(this));
            IERC20(auctionInfo.paymentToken).transfer(auctionInfo.seller, balance);
        }
        
        emit AuctionEnded(auctionInfo.highestBidder, auctionInfo.highestBidUSD);
    }
    
    // 取消拍卖（仅卖家）
    function cancelAuction() external {
        require(msg.sender == auctionInfo.seller, "Only seller can cancel");
        require(auctionInfo.state == AuctionState.OPEN, "Auction not open");
        
        auctionInfo.state = AuctionState.CANCELLED;
        
        // 退还 NFT 给卖家
        IERC721(auctionInfo.nftAddress).safeTransferFrom(
            address(this),
            auctionInfo.seller,
            auctionInfo.tokenId
        );
        
        // 退还所有出价
        if (auctionInfo.highestBidder != address(0)) {
            if (auctionInfo.paymentToken == address(0)) {
                payable(auctionInfo.highestBidder).transfer(
                    (auctionInfo.highestBidUSD * 1e18) / uint256(getEthUsdPrice())
                );
            } else {
                IERC20(auctionInfo.paymentToken).transfer(
                    auctionInfo.highestBidder,
                    (auctionInfo.highestBidUSD * 1e18) / uint256(getErc20UsdPrice())
                );
            }
        }
        
        emit AuctionCancelled();
    }
    
    // 获取拍卖信息
    function getAuctionInfo() external view returns (
        address nftAddress,
        uint256 tokenId,
        address paymentToken,
        address seller,
        uint256 startingPriceUSD,
        uint256 highestBidUSD,
        address highestBidder,
        uint256 startTime,
        uint256 endTime,
        AuctionState state
    ) {
        return (
            auctionInfo.nftAddress,
            auctionInfo.tokenId,
            auctionInfo.paymentToken,
            auctionInfo.seller,
            auctionInfo.startingPriceUSD,
            auctionInfo.highestBidUSD,
            auctionInfo.highestBidder,
            auctionInfo.startTime,
            auctionInfo.endTime,
            auctionInfo.state
        );
    }
}