import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import NFTABI from './abi/NFTMarketplace.json';
import FactoryABI from './abi/AuctionFactory.json';
import AuctionABI from './abi/Auction.json';

function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [nftContract, setNftContract] = useState(null);
  const [factoryContract, setFactoryContract] = useState(null);
  const [auctions, setAuctions] = useState([]);
  const [userNFTs, setUserNFTs] = useState([]);
  
  // 合约地址
  const NFT_ADDRESS = "0x...";
  const FACTORY_ADDRESS = "0x...";
  
  // 初始化
  useEffect(() => {
    const init = async () => {
      if (window.ethereum) {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        
        setProvider(provider);
        setSigner(signer);
        
        // 初始化合约
        const nft = new ethers.Contract(NFT_ADDRESS, NFTABI, signer);
        const factory = new ethers.Contract(FACTORY_ADDRESS, FactoryABI, signer);
        
        setNftContract(nft);
        setFactoryContract(factory);
        
        // 加载拍卖
        loadAuctions(factory);
        // 加载用户 NFT
        loadUserNFTs(nft, signer);
      }
    };
    
    init();
  }, []);
  
  const loadAuctions = async (factory) => {
    const count = await factory.getAuctionsCount();
    const auctionAddresses = await factory.getAllAuctions();
    
    const auctionsData = [];
    for (let i = 0; i < count; i++) {
      const auction = new ethers.Contract(auctionAddresses[i], AuctionABI, signer);
      const info = await auction.getAuctionInfo();
      
      auctionsData.push({
        address: auctionAddresses[i],
        nftAddress: info.nftAddress,
        tokenId: info.tokenId.toString(),
        startingPrice: ethers.formatUnits(info.startingPriceUSD, 18),
        highestBid: ethers.formatUnits(info.highestBidUSD, 18),
        endTime: new Date(info.endTime * 1000).toLocaleString(),
        state: info.state === 0 ? "Open" : info.state === 1 ? "Ended" : "Cancelled"
      });
    }
    
    setAuctions(auctionsData);
  };
  
  const loadUserNFTs = async (nft, signer) => {
    const address = await signer.getAddress();
    const balance = await nft.balanceOf(address);
    
    const nfts = [];
    for (let i = 0; i < balance; i++) {
      const tokenId = await nft.tokenOfOwnerByIndex(address, i);
      nfts.push(tokenId.toString());
    }
    
    setUserNFTs(nfts);
  };
  
  const createAuction = async (tokenId, startingPrice, duration) => {
    const tx = await factoryContract.createAuction(
      NFT_ADDRESS,
      tokenId,
      ethers.ZeroAddress, // 使用 ETH
      "0x694AA1769357215DE4FAC081bf1f309aDC325306", // ETH/USD
      "0x14866185B1962B63C3Ea9E03Bc1da838bab34C19", // ERC20/USD
      ethers.parseUnits(startingPrice, 18),
      duration * 86400
    );
    
    await tx.wait();
    loadAuctions(factoryContract);
  };
  
  const placeBid = async (auctionAddress, bidAmount) => {
    const auction = new ethers.Contract(auctionAddress, AuctionABI, signer);
    const bidAmountWei = ethers.parseUnits(bidAmount, 18);
    
    // 获取 ETH 价格
    const ethPrice = await auction.getEthUsdPrice();
    const ethAmount = (bidAmountWei * ethers.toBigInt(10**18)) / ethPrice;
    
    const tx = await auction.bid(bidAmountWei, { value: ethAmount });
    await tx.wait();
  };
  
  return (
    <div className="App">
      <h1>NFT Auction Market</h1>
      
      <div>
        <h2>My NFTs</h2>
        <ul>
          {userNFTs.map(tokenId => (
            <li key={tokenId}>
              NFT #{tokenId}
              <button onClick={() => createAuction(tokenId, "100", 7)}>
                Create Auction
              </button>
            </li>
          ))}
        </ul>
      </div>
      
      <div>
        <h2>Active Auctions</h2>
        <table>
          <thead>
            <tr>
              <th>NFT</th>
              <th>Starting Price</th>
              <th>Highest Bid</th>
              <th>End Time</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {auctions.filter(a => a.state === "Open").map(auction => (
              <tr key={auction.address}>
                <td>NFT #{auction.tokenId}</td>
                <td>${auction.startingPrice}</td>
                <td>${auction.highestBid}</td>
                <td>{auction.endTime}</td>
                <td>{auction.state}</td>
                <td>
                  <input type="number" id={`bid-${auction.address}`} placeholder="Bid amount ($)" />
                  <button onClick={() => 
                    placeBid(auction.address, document.getElementById(`bid-${auction.address}`).value)
                  }>
                    Place Bid
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;