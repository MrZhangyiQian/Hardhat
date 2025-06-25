// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract NFTMarketplace is 
    Initializable, 
    ERC721Upgradeable, 
    OwnableUpgradeable, 
    UUPSUpgradeable 
{
    // 初始化函数
    function initialize(
        string memory name, 
        string memory symbol
    ) public initializer {
        __ERC721_init(name, symbol);
        __Ownable_init(msg.sender);
    }
    
    // UUPS 升级授权
    function _authorizeUpgrade(address) internal override onlyOwner {}
    
    // 铸造 NFT
    function mint(address to, uint256 tokenId) external onlyOwner {
        _mint(to, tokenId);
    }
    
    // 批量铸造
    function batchMint(address to, uint256[] memory tokenIds) external onlyOwner {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            _mint(to, tokenIds[i]);
        }
    }
    
    // 安全转移
    function safeTransfer(
        address from,
        address to,
        uint256 tokenId
    ) external {
        safeTransferFrom(from, to, tokenId);
    }
    
    // 获取合约版本
    function version() public pure returns (string memory) {
        return "v1.0";
    }
}