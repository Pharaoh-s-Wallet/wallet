# NZDD Wallet

A simple React-based crypto wallet focused on NZDD stablecoin on Base chain, featuring gasless transfers using Coinbase Paymaster.

## Features

- Create new wallet
- Send NZDD tokens
- Receive NZDD tokens with QR code
- Gasless transfers using Coinbase Paymaster
- Mobile-first UI with React
- Secure private key storage using IndexedDB

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory with the following variables:
```
VITE_NZDD_CONTRACT_ADDRESS=0x2dd087589ce9c5b2d1b42e20d2519b3c8cf022b7
VITE_PAYMASTER_ENDPOINT=your_paymaster_endpoint
VITE_BASE_RPC_URL=your_base_rpc_url
VITE_BASE_CHAIN_ID=8453
```

3. Start the development server:
```bash
npm run dev
```

## Usage

1. Open the application in your browser
2. Click "Create New Wallet" to generate a new wallet
3. Your wallet address and NZDD balance will be displayed
4. Use the Send/Receive buttons to transfer NZDD tokens

## Implementation Details

The wallet uses:
- Viem for Web3 interactions
- Coinbase Smart Wallet for gasless transactions
- IndexedDB for secure storage of private keys
- React for the UI
- Mobile-first responsive design

## Security Notes

- Private keys are stored securely in IndexedDB
- Never share your private key
- The application runs entirely in your browser 