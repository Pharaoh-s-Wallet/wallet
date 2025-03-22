import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import CreateWallet from './components/CreateWallet';
import WalletScreen from './components/WalletScreen';
import SendScreen from './components/SendScreen';
import ReceiveScreen from './components/ReceiveScreen';
import PaymentScreen from './components/PaymentScreen';
import { useWallet } from './hooks/useWallet';
import './loading.css'; // Import loading styles
import { createPublicClient, http } from 'viem';
import { base, baseSepolia } from 'viem/chains';

// Loading UI component
const LoadingScreen = () => (
  <div className="loading-container">
    <div className="loading-spinner"></div>
    <p>Loading your wallet...</p>
  </div>
);

// Initialize public client
const RPC_URL = import.meta.env.VITE_BASE_RPC_URL || 'https://mainnet.base.org';
const CHAIN_ID = parseInt(import.meta.env.VITE_BASE_CHAIN_ID || '8453');
const CHAIN = CHAIN_ID === 84532 ? baseSepolia : base;

const publicClient = createPublicClient({
  chain: CHAIN,
  transport: http(RPC_URL),
});

function App() {
  const { 
    wallet, 
    balance, 
    createNewWallet, 
    loadWallet, 
    sendNZDD,
    initializing,
    loading,
    updateBalance,
    transactions,
    loadTransactions
  } = useWallet();
  
  const navigate = useNavigate();

  // Redirect to wallet screen when wallet is loaded, but only if on home page
  useEffect(() => {
    const hash = window.location.hash;
    if (!initializing && wallet && (hash === '' || hash === '#/' || hash === '#')) {
      navigate('/wallet');
    }
  }, [initializing, wallet, navigate]);

  // Expose the refresh function globally for components to access
  useEffect(() => {
    if (wallet && updateBalance) {
      window.refreshWalletBalance = async () => {
        await updateBalance(wallet.address);
        // Also refresh transactions when balance is refreshed
        if (loadTransactions) {
          await loadTransactions(wallet.address);
        }
      };
    }
    
    return () => {
      delete window.refreshWalletBalance;
    };
  }, [wallet, updateBalance, loadTransactions]);
  
  // Refresh transactions when viewing wallet screen
  useEffect(() => {
    if (wallet && loadTransactions && window.location.hash.includes('/wallet')) {
      loadTransactions(wallet.address);
    }
  }, [wallet, loadTransactions]);

  const handleCreateWallet = async () => {
    await createNewWallet();
    navigate('/wallet');
  };

  // Handle transaction submission
  const handleSendTransaction = async (to, amount) => {
    await sendNZDD(to, amount);
    navigate('/wallet');
  };

  // Handle payment confirmation
  const handleConfirmPayment = async (permitData) => {
    console.log('Payment confirmed with permit data:', permitData);
    // In a real app, this would trigger a backend call or another action
    
    // After a successful payment, navigate back to wallet
    setTimeout(() => {
      navigate('/wallet');
    }, 2000);
  };

  // Balance refresh handler
  const handleRefreshBalance = async () => {
    if (wallet && updateBalance) {
      await updateBalance(wallet.address);
      
      // Also refresh transactions
      if (loadTransactions) {
        await loadTransactions(wallet.address);
      }
    }
  };

  // Render loading state
  if (initializing) {
    return <LoadingScreen />;
  }

  return (
    <div className="container">
      <Routes>
        <Route 
          path="/" 
          element={
            wallet ? <Navigate to="/wallet" /> : <CreateWallet onCreateWallet={handleCreateWallet} />
          } 
        />
        
        <Route 
          path="/wallet" 
          element={
            wallet ? (
              <WalletScreen
                address={wallet?.address}
                balance={balance}
                onSend={() => navigate('/send')}
                onReceive={() => navigate('/receive')}
                onPay={() => navigate('/payment')}
                onRefreshBalance={handleRefreshBalance}
                loading={loading}
                transactions={transactions}
              />
            ) : (
              <Navigate to="/" />
            )
          }
        />
        
        <Route 
          path="/send" 
          element={
            <SendScreen
              onBack={() => navigate('/wallet')}
              onSend={handleSendTransaction}
              loading={loading}
            />
          }
        />
        
        <Route 
          path="/send/:address" 
          element={
            <SendScreen
              onBack={() => navigate('/wallet')}
              onSend={handleSendTransaction}
              loading={loading}
            />
          }
        />
        
        <Route 
          path="/receive" 
          element={
            <ReceiveScreen
              address={wallet?.address}
              onBack={() => navigate('/wallet')}
            />
          }
        />
        
        <Route 
          path="/payment" 
          element={
            <PaymentScreen
              wallet={wallet}
              publicClient={publicClient}
              onBack={() => navigate('/wallet')}
              onConfirm={handleConfirmPayment}
            />
          }
        />
        
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

export default App;