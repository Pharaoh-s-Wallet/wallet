import React, { useState } from 'react';
import { ArrowLeft, Receipt, CreditCard, ShoppingBag, Clock, CheckCircle, X } from 'lucide-react';
import { formatUnits, parseUnits } from 'viem';

// Permit types for signature
const PERMIT_TYPES = {
  Permit: [
    { name: 'owner', type: 'address' },
    { name: 'spender', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' }
  ]
};

// Helper function to decode a signature
const decodeSignature = (signature) => {
  // Remove 0x prefix
  const sig = signature.slice(2);
  
  // The signature is in the format: r (32 bytes) + s (32 bytes) + v (1 byte)
  // Each byte is represented by 2 hex characters
  const r = '0x' + sig.slice(0, 64);
  const s = '0x' + sig.slice(64, 128);
  
  // v is the recovery id and is the last byte
  // Convert from hex to number
  const v = parseInt(sig.slice(128, 130), 16);
  
  return { r, s, v };
};

function PaymentScreen({ onBack, wallet, publicClient, tokenData, onConfirm }) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Mock payment data (in real app, this would come from params or API)
  const mockPayment = {
    merchantName: 'Apple Store',
    merchantId: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e', // This would be the real merchant address
    amount: '100.00',
    currency: 'NZDD',
    orderId: `ORDER-${Math.floor(Math.random() * 10000)}`,
    expiresIn: 900, // 15 minutes in seconds
    tokenDecimals: 6, // NZDD has 6 decimals
    tokenAddress: '0x5853D7933c8bf29Deb2b16aDb1d100c7ca0060CA', 
    relayerAddress: '0x715D5476ecB89f1E97AC50cd35d0058424D4e7b6', // Relayer contract address
  };

  // Use the provided token data or mock data
  const payment = tokenData || mockPayment;

  const handleConfirmPayment = async () => {
    try {
      setProcessing(true);
      setError('');

      if (!wallet) {
        throw new Error('No wallet available');
      }

      // Calculate permit deadline (15 minutes from now)
      const deadline = BigInt(Math.floor(Date.now() / 1000) + payment.expiresIn);
      
      // Amount in smallest units
      const amountInUnits = parseUnits(payment.amount, payment.tokenDecimals);

      // Since we can't get nonce from contract, use a simple nonce
      // In a real app, this should be tracked properly or fetched from a backend
      const nonce = BigInt(Math.floor(Date.now())); // Using timestamp as nonce
      
      // Get chain ID from the connected client
      const chainId = await publicClient.getChainId();

      // Create the permit data
      const domain = {
        name: 'NZ Digital Dollar',
        version: '1',
        chainId: chainId,
        verifyingContract: payment.tokenAddress
      };

      const message = {
        owner: wallet.address,
        spender: payment.relayerAddress, // Use relayer as the spender
        value: amountInUnits,
        nonce: nonce,
        deadline: deadline
      };

      console.log('Signing permit with data:', {
        domain,
        types: PERMIT_TYPES,
        message
      });

      // Sign the typed data using the smart account
      const signature = await wallet.signTypedData({
        domain,
        types: PERMIT_TYPES,
        primaryType: 'Permit',
        message
      });

      console.log('Raw signature:', signature);

      // Split the signature manually
      const { r, s, v } = decodeSignature(signature);

      console.log('Decoded signature components:', { r, s, v });

      // Prepare data to send to backend
      const permitData = {
        tokenAddress: payment.tokenAddress,
        owner: wallet.address,
        spender: payment.relayerAddress,
        value: amountInUnits.toString(),
        deadline: deadline.toString(),
        v,
        r,
        s,
        orderId: payment.orderId,
        merchantId: payment.merchantId
      };

      console.log('Permit data to send to backend:', permitData);

      // Mock API call to remote URL - in a real app you would send to your backend
      // const response = await fetch('https://api.kiwipay.com/process-payment', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(permitData)
      // });
      // const data = await response.json();
      // if (!data.success) throw new Error(data.message);

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Payment successful!
      setSuccess(true);
      setProcessing(false);

      // If callback provided, pass the permit data
      if (onConfirm) {
        onConfirm(permitData);
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      setError(error.message || 'Failed to process payment');
      setProcessing(false);
    }
  };

  // Format time remaining from seconds
  const formatTimeRemaining = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="screen">
      <div className="screen-header">
        <button onClick={onBack} className="back-btn">
          <ArrowLeft size={24} />
        </button>
        <h2>Payment Details</h2>
      </div>

      {error && <div className="error-message">{error}</div>}

      {success ? (
        <div className="payment-success">
          <CheckCircle size={64} className="success-icon" />
          <h3>Payment Successful!</h3>
          <p>Your payment to {payment.merchantName} has been processed.</p>
          <p className="order-reference">Order ID: {payment.orderId}</p>
          <button onClick={onBack} className="primary-btn">
            Done
          </button>
        </div>
      ) : (
        <div className="payment-details">
          <div className="merchant-info">
            <ShoppingBag size={24} />
            <div>
              <h3>{payment.merchantName}</h3>
              <p className="merchant-id">{payment.merchantId.substring(0, 6)}...{payment.merchantId.substring(payment.merchantId.length - 4)}</p>
            </div>
          </div>

          <div className="payment-amount">
            <span className="amount">{payment.amount}</span>
            <span className="currency">{payment.currency}</span>
          </div>

          <div className="payment-details-row">
            <div className="detail-item">
              <Receipt size={16} />
              <span className="detail-label">Order ID</span>
              <span className="detail-value">{payment.orderId}</span>
            </div>
            
            <div className="detail-item">
              <Clock size={16} />
              <span className="detail-label">Expires in</span>
              <span className="detail-value">{formatTimeRemaining(payment.expiresIn)}</span>
            </div>
          </div>

          <div className="info-box">
            <p>
              This payment uses permit signatures to authorize the merchant to 
              transfer tokens from your wallet. Your signature will be sent to the merchant.
            </p>
          </div>

          <button
            onClick={handleConfirmPayment}
            className="primary-btn"
            disabled={processing}
          >
            {processing ? (
              <>
                <span className="loading-spinner"></span>
                Processing...
              </>
            ) : (
              <>
                <CreditCard size={20} style={{ marginRight: '8px' }} />
                Confirm Payment
              </>
            )}
          </button>
          
          <button onClick={onBack} className="secondary-btn">
            <X size={16} style={{ marginRight: '8px' }} />
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

export default PaymentScreen; 