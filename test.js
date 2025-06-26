// test.js - 测试 .env 变量是否加载成功
require("dotenv").config(); // 显式加载 .env 文件

console.log("SPEOLIA_URL:", process.env.SPEOLIA_URL);
console.log("PRIVATE_KEY:", process.env.PRIVATE_KEY);
console.log("ETHERSCAN_API_KEY:", process.env.ETHERSCAN_API_KEY);

if (!process.env.SPEOLIA_URL) {
  console.error("❌ SPEOLIA_URL 未定义，请检查 .env 文件");
}
if (!process.env.PRIVATE_KEY) {
  console.error("❌ PRIVATE_KEY 未定义，请检查 .env 文件");
}
if (!process.env.ETHERSCAN_API_KEY) {
  console.error("❌ ETHERSCAN_API_KEY 未定义，请检查 .env 文件");
}