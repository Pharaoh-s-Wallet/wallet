import React, { useState, useEffect } from 'react';
import { ArrowLeft, Send, Wallet, Zap, ScanLine } from 'lucide-react';
import { useLocation, useSearchParams, useParams } from 'react-router-dom';
import QRScanner from './QRScanner';

function SendScreen({ onBack, onSend }) {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const params = useParams();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [showScanner, setShowScanner] = useState(false);

  // Extract Ethereum address from different formats
  const extractEthereumAddress = (input) => {
    if (!input) return null;
    
    // Direct Ethereum address format (0x...)
    if (input.startsWith('0x') && input.length === 42) {
      return input;
    }
    
    // Check for ethereum: protocol
    if (input.toLowerCase().startsWith('ethereum:')) {
      const address = input.substring(9); // Remove 'ethereum:'
      if (address.startsWith('0x') && address.length === 42) {
        return address;
      }
    }
    
    return null;
  };

  // Check for address in URL params when component mounts
  useEffect(() => {
    // First check URL params
    if (params.address) {
      const extractedAddress = extractEthereumAddress(params.address);
      if (extractedAddress) {
        setRecipient(extractedAddress);
        return;
      }
    }
    
    // Then check query parameters
    const addressParam = searchParams.get('address');
    if (addressParam) {
      const extractedAddress = extractEthereumAddress(addressParam);
      if (extractedAddress) {
        setRecipient(extractedAddress);
        return;
      }
    }
    
    // Finally check for address in path (for ethereum: protocol URLs)
    const path = location.pathname;
    if (path.includes('/send/')) {
      const possibleAddress = path.split('/send/')[1];
      const extractedAddress = extractEthereumAddress(possibleAddress);
      if (extractedAddress) {
        setRecipient(extractedAddress);
      }
    }
  }, [searchParams, location, params]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!recipient || !amount) {
      setError('Please fill in all fields');
      return;
    }

    if (!recipient.startsWith('0x') || recipient.length !== 42) {
      setError('Please enter a valid Ethereum address');
      return;
    }

    if (parseFloat(amount) <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    try {
      setSending(true);
      setError('');
      await onSend(recipient, amount);
    } catch (error) {
      console.error('Error sending transaction:', error);
      setError(error.message || 'Failed to send transaction');
      setSending(false);
    }
  };

  const handleScan = (address) => {
    setRecipient(address);
    setShowScanner(false);
  };

  return (
    <div className="screen">
      {showScanner && (
        <QRScanner 
          onScan={handleScan} 
          onClose={() => setShowScanner(false)} 
        />
      )}
      
      <div className="screen-header">
        <button onClick={onBack} className="back-btn">
          <ArrowLeft size={24} />
        </button>
        <h2>Send NZDD</h2>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label htmlFor="recipient">
            <Wallet size={16} style={{ marginRight: '6px' }} />
            Recipient Address
          </label>
          <div className="input-with-icon">
            <input
              type="text"
              id="recipient"
              placeholder="0x..."
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              required
            />
            <button 
              type="button" 
              className="icon-button"
              onClick={() => setShowScanner(true)}
              aria-label="Scan QR code"
            >
              <ScanLine size={20} />
            </button>
          </div>
        </div>
        
        <div className="input-group">
          <label htmlFor="amount">
            <Send size={16} style={{ marginRight: '6px' }} />
            Amount (NZDD)
          </label>
          <input
            type="number"
            id="amount"
            placeholder="0.00"
            step="0.000001"
            min="0.000001"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
        
        <button
          type="submit"
          className="primary-btn"
          disabled={sending}
        >
          {sending ? (
            <>
              <span className="loading-spinner"></span>
              Sending...
            </>
          ) : (
            <>
              <Send size={20} style={{ marginRight: '8px' }} />
              Send NZDD
            </>
          )}
        </button>
      </form>
      
      <p className="info-text">
        <Zap size={16} />
        Transfers are gasless thanks to Coinbase Paymaster. Your transaction will be processed on Base chain.
      </p>
    </div>
  );
}

export default SendScreen; 