import React, { useMemo, useState } from 'react';
import QRCode from 'react-qr-code';
import { ArrowLeft, Copy, Download, Info, RefreshCw } from 'lucide-react';

function ReceiveScreen({ address, onBack }) {
  const [qrMode, setQrMode] = useState('app'); // 'app' or 'ethereum'
  
  // Generate different QR code formats
  const qrValue = useMemo(() => {
    if (qrMode === 'ethereum') {
      // Standard ethereum: protocol for wallet apps
      return `ethereum:${address}`;
    } else {
      // Create a URL that will direct to the send screen with the address pre-filled
      const baseUrl = window.location.origin;
      return `${baseUrl}/send?address=${address}`;
    }
  }, [address, qrMode]);

  const toggleQrMode = () => {
    setQrMode(qrMode === 'app' ? 'ethereum' : 'app');
  };

  return (
    <div className="screen">
      <div className="screen-header">
        <button onClick={onBack} className="back-btn">
          <ArrowLeft size={24} />
        </button>
        <h2>Receive NZDD</h2>
      </div>
      
      <div className="qr-container">
        <QRCode value={qrValue || ''} size={200} />
        <button className="mode-switch-btn" onClick={toggleQrMode}>
          <RefreshCw size={16} />
          {qrMode === 'app' ? 'Switch to standard ethereum: format' : 'Switch to app URL format'}
        </button>
      </div>
      
      <div className="address-container">
        <p>
          <Download size={16} style={{ marginRight: '6px' }} />
          Your wallet address:
        </p>
        <p className="address">{address}</p>
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
        <Info size={16} />
        Share this address to receive NZDD tokens. Make sure the sender is transferring tokens on Base chain.
      </p>
    </div>
  );
}

export default ReceiveScreen; 