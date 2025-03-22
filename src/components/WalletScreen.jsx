import React, { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, Copy, Shield, ScanLine, Menu, X, Settings, RefreshCw, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import QRScanner from './QRScanner';
import TransactionHistory from './TransactionHistory';

function WalletScreen({ address, balance, onSend, onReceive, onRefreshBalance, loading, transactions, onPay }) {
  const [showScanner, setShowScanner] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(Date.now());
  const navigate = useNavigate();
  
  // Format address for display (show only first and last few characters)
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Get wallet balance every 10 seconds
  useEffect(() => {
    // Set up the auto-refresh interval
    const refreshInterval = setInterval(() => {
      refreshBalance();
    }, 10000); // 10 seconds

    // Clean up the interval when component unmounts
    return () => {
      clearInterval(refreshInterval);
    };
  }, []);

  // Function to refresh balance
  const refreshBalance = async () => {
    // Don't refresh if already refreshing
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    
    try {
      // Use the onRefreshBalance prop if available
      if (typeof onRefreshBalance === 'function') {
        await onRefreshBalance();
      } 
      // Fall back to the global function if available
      else if (typeof window.refreshWalletBalance === 'function') {
        await window.refreshWalletBalance();
      }
      
      // Update last updated timestamp
      setLastUpdated(Date.now());
    } catch (error) {
      console.error('Error refreshing balance:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleScan = (scannedAddress) => {
    setShowScanner(false);
    // Navigate to the send screen with the scanned address
    navigate(`/send?address=${scannedAddress}`);
  };

  const handleMenu = () => {
    setShowMenu(!showMenu);
  };

  const handleSettings = () => {
    console.log('Settings clicked');
    setShowMenu(false);
    // Navigate to settings page or open settings modal
    // For now, just log and close menu
  };

  // Format the last updated timestamp
  const formatLastUpdated = () => {
    const date = new Date(lastUpdated);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
  };

  return (
    <div className="screen">
      {showScanner && (
        <QRScanner 
          onScan={handleScan} 
          onClose={() => setShowScanner(false)} 
        />
      )}
      
      {/* Side Menu */}
      {showMenu && (
        <div className="side-menu-overlay" onClick={() => setShowMenu(false)}>
          <div className="side-menu" onClick={(e) => e.stopPropagation()}>
            <div className="side-menu-header">
              <h3>Menu</h3>
              <button 
                className="close-btn"
                onClick={() => setShowMenu(false)}
                aria-label="Close menu"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="menu-items">
              <button 
                className="menu-item"
                onClick={handleSettings}
              >
                <Settings size={20} />
                <span>Settings</span>
              </button>
              
              {/* Additional menu items can be added here */}
            </div>
          </div>
        </div>
      )}
      
      <div className="wallet-header">
        <div className="header-left">
          <button 
            className="icon-button menu-button"
            onClick={handleMenu}
            aria-label="Menu"
          >
            <Menu size={24} />
          </button>
        </div>
        
        <h2>TahiWallet</h2>
        
        <div className="header-right">
          <button 
            className="icon-button scan-button"
            onClick={() => setShowScanner(true)}
            aria-label="Scan QR code"
          >
            <ScanLine size={24} />
          </button>
        </div>
      </div>
      
      <div className="balance-container">
        <div className="balance">
          <span>{balance}</span>
          <span className="currency">NZDD</span>
        </div>
        <div className="balance-refresh">
          <button 
            className="refresh-btn"
            onClick={refreshBalance}
            disabled={isRefreshing || loading}
            aria-label="Refresh balance"
          >
            <RefreshCw size={16} className={isRefreshing || loading ? 'spin' : ''} />
          </button>
          <span className="last-updated">Updated: {formatLastUpdated()}</span>
        </div>
      </div>
      
      <div className="actions">
        <button onClick={onSend} className="action-btn">
          <ArrowUp className="action-icon" />
          <span>Send</span>
        </button>
        <button onClick={onReceive} className="action-btn">
          <ArrowDown className="action-icon" />
          <span>Receive</span>
        </button>
        <button onClick={onPay} className="action-btn">
          <CreditCard className="action-icon" />
          <span>Pay</span>
        </button>
      </div>

      {/* Transaction History */}
      <TransactionHistory transactions={transactions} address={address} />

      <div className="address-section">
        <p>Your Wallet Address</p>
        <p className="address" title={address}>{address}</p>
        <button 
          className="text-btn"
          onClick={() => {
            navigator.clipboard.writeText(address);
            alert('Address copied to clipboard!');
          }}
        >
          <Copy size={16} />
          Copy Address
        </button>
      </div>
      
      <p className="info-text">
        <Shield size={16} />
        This wallet is secured with encryption and only stores NZDD tokens on Base chain.
      </p>
    </div>
  );
}

export default WalletScreen; 