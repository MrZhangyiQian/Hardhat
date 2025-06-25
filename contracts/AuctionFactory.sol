// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Auction.sol";

contract AuctionFactory {
    address[] public allAuctions;
    address public owner;
    
    event AuctionCreated(address indexed auction, address indexed nft, uint256 tokenId);
    
    constructor() {
        owner = msg.sender;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call");
        _;
    }
    
    function createAuction(
        address nftAddress,
        uint256 tokenId,
        address paymentToken,
        address ethUsdPriceFeed,
        address erc20UsdPriceFeed,
        uint256 startingPriceUSD,
        uint256 duration
    ) external onlyOwner returns (address) {
        Auction newAuction = new Auction(
            nftAddress,
            tokenId,
            paymentToken,
            ethUsdPriceFeed,
            erc20UsdPriceFeed,
            startingPriceUSD,
            duration,
            msg.sender
        );
        
        allAuctions.push(address(newAuction));
        emit AuctionCreated(address(newAuction), nftAddress, tokenId);
        
        return address(newAuction);
    }
    
    function getAllAuctions() external view returns (address[] memory) {
        return allAuctions;
    }
    
    function getAuctionsCount() external view returns (uint256) {
        return allAuctions.length;
    }
}