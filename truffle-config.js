var HDWalletProvider = require("truffle-hdwallet-provider");
var mnemonic = "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";

module.exports = {
  networks: {
    development: {
      provider: function () {
        return new HDWalletProvider(mnemonic, "http://127.0.0.1:8545/", 0, 50);
      },
      network_id: '*',
      gas: 9999999
    },
    ganache_cli: {
      // provider: () => new HDWalletProvider(mnemonic, `https://127.0.0.1:8545/`),
      host: "localhost",
      port: 8545,
      network_id: '*',
      gas: 9999999,
      networkCheckTimeout: 999999,
      websockets: true, // Enable EventEmitter interface for web3 (default: false)
      networkCheckTimeoutnetworkCheckTimeout: 10000,
      timeoutBlocks: 200
    },
  },
  compilers: {
    solc: {
      version: "^0.4.24"
    }
  }
};