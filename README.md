<h2 align="center">
  <br>
  <img src="/asset/png/Logo512.png?raw=true" alt="EvoTrade" width="150" />
  <br>
  <br>
  EvoTradeWallet
  <br>
  <br>
</h2>
<h3 align="center">System-wide Web3 for macOS, Windows and Linux :tada:</h3>
<br>
<h5 align="center">
  <a href="#features">Features</a> ⁃
  <a href="#installation">Installation</a> ⁃
  <a href="#usage">Usage</a> ⁃
  <a href="#related">Related</a>
</h5>
<br>

EvoTradeWallet is a web3 platform that creates a secure system-wide interface to your chains and accounts. Now any browser, command-line, or native application has the ability to access web3.

### Features

- **First-class Hardware Signer Support**
  - Use your GridPlus, Ledger and Trezor accounts with any dapp!
- **Extensive Software Signer Support**
  - Use a mnemonic phrase, keystore.json or standalone private keys to create and backup accounts!
- **Permissions**
  - You'll always have full control of which dapps have permission to access EvoTradeWallet and can monitor with full transparency what requests are being made to the network.
- **Omnichain Routing**
  - With EvoTrade's Omnichain routing dapps can seamlessly use multiple chains at the same time, enabling truly multichain experiences.
- **Transaction Decoding**
  - By utilizing verified contract ABIs, transaction calldata can be decoded into concise and informative summaries, allowing you to sign transactions with confidence.
- **Set your own connections to Ethereum and IPFS**
  - Never be locked into using a centralized gateway
- **Menu Bar Support**
  - EvoTradeWallet stays out of the way and sits quietly in your menu bar until needed
- **Cross Platform**
  - MacOS, Windows and Linux!

### Installation

#### Run Source

**On Ubuntu:** Run `sudo apt-get install build-essential libudev-dev`.

```bash
# Clone
› git clone https://github.com/evotrade/evotradewallet

# Use node v18
› nvm install 18.12.1
› nvm use 18.12.1


# Install
› npm run setup

# Run
› npm run prod
```

#### Build

```bash
› npm run bundle # Create bundle
› npm run build # Build EvoTradeWallet for current platform
```

### Usage

#### Connect to EvoTradeWallet natively

EvoTradeWallet exposes system-wide JSON-RPC endpoints `ws://127.0.0.1:1248` and `http://127.0.0.1:1248` that you can connect to from any app. We recommend using [eth-provider](https://github.com/floating/eth-provider) to create a connection `const provider = ethProvider('frame')` as `eth-provider` will handle any connection edge cases across browsers and environments
