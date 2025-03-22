import { useState, useCallback, useEffect } from 'react';
import { openDB } from 'idb';
import { createPublicClient, http, parseUnits, formatUnits } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { createBundlerClient } from 'viem/account-abstraction';
import { toCoinbaseSmartAccount } from 'viem/account-abstraction';

// Initialize IndexedDB
const initDB = async () => {
  return openDB('nzdd-wallet', 2, {
    upgrade(db, oldVersion) {
      // Create wallet store if it doesn't exist
      if (!db.objectStoreNames.contains('wallet')) {
        db.createObjectStore('wallet');
      }
      
      // Create transactions store if it doesn't exist (new in v2)
      if (!db.objectStoreNames.contains('transactions')) {
        const txStore = db.createObjectStore('transactions', { 
          keyPath: 'hash' 
        });
        txStore.createIndex('timestamp', 'timestamp');
      }
    },
  });
};

// NZDD Token contract address
const NZDD_ADDRESS = import.meta.env.VITE_NZDD_CONTRACT_ADDRESS || '0x5853D7933c8bf29Deb2b16aDb1d100c7ca0060CA';

// ERC20 ABI for transfer function and balance checking
const ERC20_ABI = [{
  name: 'transfer',
  type: 'function',
  stateMutability: 'nonpayable',
  inputs: [
    { name: 'recipient', type: 'address' },
    { name: 'amount', type: 'uint256' }
  ],
  outputs: [{ type: 'bool' }]
}, {
  name: 'balanceOf',
  type: 'function',
  stateMutability: 'view',
  inputs: [{ name: 'account', type: 'address' }],
  outputs: [{ type: 'uint256' }]
}];

// RPC URL - fallback to standard Base URL if not provided
const RPC_URL = import.meta.env.VITE_BASE_RPC_URL || 'https://mainnet.base.org';
const PAYMASTER_ENDPOINT = import.meta.env.VITE_PAYMASTER_ENDPOINT || '';
const CHAIN_ID = parseInt(import.meta.env.VITE_BASE_CHAIN_ID || '8453');

// Determine which chain to use based on chain ID
const CHAIN = CHAIN_ID === 84532 ? baseSepolia : base;

// Generate a random encryption key
async function generateEncryptionKey() {
  return await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256
    },
    true,
    ['encrypt', 'decrypt']
  );
}

// Export encryption key to string format
async function exportKey(key) {
  const exportedKey = await crypto.subtle.exportKey('raw', key);
  return btoa(String.fromCharCode(...new Uint8Array(exportedKey)));
}

// Import encryption key from string format
async function importKey(keyStr) {
  const keyData = new Uint8Array(
    atob(keyStr).split('').map(c => c.charCodeAt(0))
  );
  
  return await crypto.subtle.importKey(
    'raw',
    keyData,
    {
      name: 'AES-GCM',
      length: 256
    },
    true,
    ['encrypt', 'decrypt']
  );
}

// Encrypt private key
async function encryptPrivateKey(privateKey, encryptionKey) {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const encryptedData = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    encryptionKey,
    encoder.encode(privateKey)
  );

  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encryptedData.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encryptedData), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

// Decrypt private key
async function decryptPrivateKey(encryptedData, encryptionKey) {
  const decoder = new TextDecoder();
  
  // Convert base64 back to Uint8Array
  const combined = new Uint8Array(
    atob(encryptedData).split('').map(c => c.charCodeAt(0))
  );
  
  // Extract IV and encrypted data
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  
  const decryptedData = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    encryptionKey,
    data
  );
  
  return decoder.decode(decryptedData);
}

export function useWallet() {
  const [wallet, setWallet] = useState(null);
  const [ownerAccount, setOwnerAccount] = useState(null);
  const [balance, setBalance] = useState('0');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [encryptionKey, setEncryptionKey] = useState(null);
  const [transactions, setTransactions] = useState([]);

  console.log('useWallet hook initializing state:', initializing);

  // Create public client
  const publicClient = createPublicClient({
    chain: CHAIN,
    transport: http(RPC_URL),
  });

  // Load transactions from the database
  const loadTransactions = useCallback(async (walletAddress) => {
    try {
      if (!walletAddress) return [];
      
      const db = await initDB();
      const txStore = db.transaction('transactions', 'readonly').objectStore('transactions');
      const allTransactions = await txStore.getAll();
      
      // Filter transactions relevant to this wallet address and sort by timestamp (newest first)
      const relevantTransactions = allTransactions
        .filter(tx => 
          tx.from.toLowerCase() === walletAddress.toLowerCase() || 
          tx.to.toLowerCase() === walletAddress.toLowerCase()
        )
        .sort((a, b) => b.timestamp - a.timestamp);
      
      setTransactions(relevantTransactions);
      return relevantTransactions;
    } catch (error) {
      console.error('Error loading transactions:', error);
      return [];
    }
  }, []);
  
  // Add a transaction to the database
  const addTransaction = useCallback(async (txData) => {
    try {
      const db = await initDB();
      await db.put('transactions', txData);
      
      // Update transactions state
      if (wallet) {
        await loadTransactions(wallet.address);
      }
    } catch (error) {
      console.error('Error adding transaction:', error);
    }
  }, [wallet, loadTransactions]);

  // Load wallet from IndexedDB
  const loadWallet = useCallback(async () => {
    try {
      setInitializing(true);
      const db = await initDB();
      const encryptedPrivateKey = await db.get('wallet', 'privateKey');
      const savedKeyStr = await db.get('wallet', 'encryptionKey');
      
      if (encryptedPrivateKey && savedKeyStr) {
        const key = await importKey(savedKeyStr);
        setEncryptionKey(key);
        
        const privateKey = await decryptPrivateKey(encryptedPrivateKey, key);
        const eoaAccount = privateKeyToAccount(privateKey);
        setOwnerAccount(eoaAccount);
        
        // Create a Coinbase smart wallet
        const smartAccount = await toCoinbaseSmartAccount({
          client: publicClient,
          owners: [eoaAccount]
        });
        
        // Store the smart account in state - this is what the UI will display
        setWallet(smartAccount);
        
        console.log(`EOA wallet address: ${eoaAccount.address}`);
        console.log(`Smart wallet address: ${smartAccount.address}`);
        
        // Check the balance of the smart account
        await updateBalance(smartAccount.address);
        
        // Load transaction history
        await loadTransactions(smartAccount.address);
        
        setInitializing(false);
        return true;
      }
      setInitializing(false);
      return false;
    } catch (error) {
      console.error('Error loading wallet:', error);
      setInitializing(false);
      return false;
    }
  }, [loadTransactions]);

  // Automatically try to load the wallet on mount
  useEffect(() => {
    console.log('useEffect running in useWallet, initializing:', initializing);
    loadWallet();
  }, [loadWallet]);

  // Create new wallet
  const createNewWallet = useCallback(async () => {
    try {
      setLoading(true);
      
      // Generate random private key using viem's generatePrivateKey function
      const privateKey = generatePrivateKey();
      const eoaAccount = privateKeyToAccount(privateKey);
      setOwnerAccount(eoaAccount);
      
      // Generate random encryption key
      const key = await generateEncryptionKey();
      setEncryptionKey(key);
      
      // Export key to string for storage
      const keyStr = await exportKey(key);
      
      // Encrypt private key
      const encryptedPrivateKey = await encryptPrivateKey(privateKey, key);
      
      // Store both in IndexedDB
      const db = await initDB();
      await db.put('wallet', encryptedPrivateKey, 'privateKey');
      await db.put('wallet', keyStr, 'encryptionKey');
      
      // Create a Coinbase smart wallet
      const smartAccount = await toCoinbaseSmartAccount({
        client: publicClient,
        owners: [eoaAccount]
      });
      
      // Store the smart account in state - this is what the UI will display
      setWallet(smartAccount);
      
      console.log(`EOA wallet address: ${eoaAccount.address}`);
      console.log(`Smart wallet address: ${smartAccount.address}`);
      
      // Check the balance of the smart account
      await updateBalance(smartAccount.address);
      setLoading(false);
      return smartAccount;
    } catch (error) {
      console.error('Error creating wallet:', error);
      setLoading(false);
      throw error;
    }
  }, []);

  // Update NZDD balance
  const updateBalance = useCallback(async (address) => {
    try {
      const balance = await publicClient.readContract({
        address: NZDD_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address],
      });
      
      console.log(`Raw balance from contract for ${address}: ${balance.toString()}`);
      
      // NZDD has 6 decimals
      const formattedBalance = formatUnits(balance, 6);
      console.log(`Formatted balance: ${formattedBalance}`);
      setBalance(formattedBalance);
      return balance;
    } catch (error) {
      console.error('Error updating balance:', error);
      return 0n;
    }
  }, [publicClient]);

  // Send NZDD tokens
  const sendNZDD = useCallback(async (to, amount) => {
    try {
      setLoading(true);
      
      if (!wallet || !ownerAccount || !encryptionKey) {
        throw new Error('No wallet available');
      }
      
      // Decrypt private key
      const db = await initDB();
      const encryptedPrivateKey = await db.get('wallet', 'privateKey');
      const privateKey = await decryptPrivateKey(encryptedPrivateKey, encryptionKey);
      const owner = privateKeyToAccount(privateKey);
      
      console.log(`Sending from smart account: ${wallet.address}`);
      
      // Amount in smallest units (6 decimals for NZDD)
      const amountInSmallestUnits = parseUnits(amount, 6);
      console.log(`Amount to send (in smallest units): ${amountInSmallestUnits.toString()}`);
      
      // Check the balance of the smart account
      const smartAccountBalance = await publicClient.readContract({
        address: NZDD_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [wallet.address],
      });
      
      console.log(`Smart account balance (in smallest units): ${smartAccountBalance.toString()}`);
      console.log(`Smart account balance (formatted): ${formatUnits(smartAccountBalance, 6)}`);
      
      if (smartAccountBalance < amountInSmallestUnits) {
        throw new Error(`Insufficient balance in smart account. Have ${formatUnits(smartAccountBalance, 6)}, need ${amount}`);
      }
      
      // Create bundler client
      const bundlerClient = createBundlerClient({
        account: wallet,
        client: publicClient,
        transport: http(RPC_URL),
        chain: CHAIN,
      });
      
      // Following exactly the pattern in transferNZDD.ts
      // Prepare the transfer call - note that we call the token contract directly
      const transferCall = {
        abi: ERC20_ABI,
        functionName: 'transfer',
        to: NZDD_ADDRESS,
        args: [to, amountInSmallestUnits],
        value: 0n,
      };
      
      // Configure gas padding (exactly like in the sample)
      wallet.userOperation = {
        estimateGas: async (userOperation) => {
          const estimate = await bundlerClient.estimateUserOperationGas({
            ...userOperation,
            account: wallet
          });
          // Adjust preVerification upward
          estimate.preVerificationGas = estimate.preVerificationGas * 2n;
          return estimate;
        },
      };
      
      // Sign and send the UserOperation
      const userOpHash = await bundlerClient.sendUserOperation({
        account: wallet,
        calls: [transferCall],
        paymaster: true
      });
      
      console.log('UserOperation hash:', userOpHash);
      
      const receipt = await bundlerClient.waitForUserOperationReceipt({
        hash: userOpHash,
      });
      
      console.log('Transaction successful:', receipt);
      
      // Store transaction in history
      const timestamp = Date.now();
      const txData = {
        hash: receipt.receipt.transactionHash,
        from: wallet.address,
        to: to,
        amount: amount,
        timestamp: timestamp,
        userOpHash: userOpHash
      };
      
      await addTransaction(txData);
      
      // Update balance after successful transaction
      await updateBalance(wallet.address);
      setLoading(false);
      
      return receipt;
    } catch (error) {
      console.error('Error sending NZDD:', error);
      setLoading(false);
      throw error;
    }
  }, [wallet, ownerAccount, encryptionKey, publicClient, updateBalance, addTransaction]);

  return {
    wallet,
    balance,
    loading,
    initializing,
    transactions,
    createNewWallet,
    loadWallet,
    updateBalance,
    sendNZDD,
    loadTransactions
  };
} 