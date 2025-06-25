require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings:{
      optimizer: {
        enabled: true,
        runs: 200
      },
    },
  },

  networks: {
    hardhat :{
      chainId: 1337,
    },
    speolia: {
      url: process.env.SPEOLIA_URL,
      accounts: [process.env.PRIVATE_KEY],
    },
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    etherscan: {
      apiKey: process.env.ETHERSCAN_API_KEY,
    },
  }
};
