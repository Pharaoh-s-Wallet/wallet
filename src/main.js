import { createWalletClient, http, parseEther, formatEther } from 'viem';
import { base } from 'viem/chains';
import { openDB } from 'idb';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

// Initialize IndexedDB
const db = await openDB('nzdd-wallet', 1, {
    upgrade(db) {
        db.createObjectStore('wallet');
    },
});

// Environment variables
const NZDD_CONTRACT_ADDRESS = import.meta.env.VITE_NZDD_CONTRACT_ADDRESS;
const PAYMASTER_ENDPOINT = import.meta.env.VITE_PAYMASTER_ENDPOINT;

// UI Elements
const createWalletBtn = document.getElementById('create-wallet-btn');
const createWalletScreen = document.getElementById('create-wallet');
const walletScreen = document.getElementById('wallet-screen');
const sendScreen = document.getElementById('send-screen');
const receiveScreen = document.getElementById('receive-screen');
const walletAddress = document.getElementById('wallet-address');
const balance = document.getElementById('balance');
const sendBtn = document.getElementById('send-btn');
const receiveBtn = document.getElementById('receive-btn');
const sendForm = document.getElementById('send-form');
const receiveAddress = document.getElementById('receive-address');

// Initialize wallet client
const client = createWalletClient({
    chain: base,
    transport: http()
});

// Check for existing wallet
async function checkExistingWallet() {
    const storedWallet = await db.get('wallet', 'privateKey');
    if (storedWallet) {
        showWalletScreen(storedWallet);
    }
}

// Create new wallet
async function createNewWallet() {
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    
    // Store private key in IndexedDB
    await db.put('wallet', privateKey, 'privateKey');
    
    showWalletScreen(account);
}

// Show wallet screen
function showWalletScreen(account) {
    createWalletScreen.classList.remove('active');
    walletScreen.classList.add('active');
    
    const address = typeof account === 'string' ? privateKeyToAccount(account).address : account.address;
    walletAddress.textContent = address;
    
    // Update balance
    updateBalance(address);
}

// Update balance
async function updateBalance(address) {
    try {
        const balance = await client.getBalance({
            address: address
        });
        balance.textContent = formatEther(balance);
    } catch (error) {
        console.error('Error fetching balance:', error);
    }
}

// Show send screen
function showSendScreen() {
    walletScreen.classList.remove('active');
    sendScreen.classList.add('active');
}

// Show receive screen
function showReceiveScreen() {
    walletScreen.classList.remove('active');
    receiveScreen.classList.add('active');
    receiveAddress.textContent = walletAddress.textContent;
}

// Handle send transaction
async function handleSend(event) {
    event.preventDefault();
    
    const recipient = document.getElementById('recipient').value;
    const amount = document.getElementById('amount').value;
    
    try {
        const privateKey = await db.get('wallet', 'privateKey');
        const account = privateKeyToAccount(privateKey);
        
        // Prepare transaction
        const tx = {
            account: account.address,
            to: recipient,
            value: parseEther(amount)
        };
        
        // Send transaction using paymaster
        const hash = await client.sendTransaction({
            ...tx,
            account
        });
        
        console.log('Transaction sent:', hash);
        alert('Transaction sent successfully!');
        
        // Return to wallet screen
        sendScreen.classList.remove('active');
        walletScreen.classList.add('active');
        updateBalance(account.address);
    } catch (error) {
        console.error('Error sending transaction:', error);
        alert('Failed to send transaction');
    }
}

// Event Listeners
createWalletBtn.addEventListener('click', createNewWallet);
sendBtn.addEventListener('click', showSendScreen);
receiveBtn.addEventListener('click', showReceiveScreen);
sendForm.addEventListener('submit', handleSend);

// Initialize
checkExistingWallet(); 