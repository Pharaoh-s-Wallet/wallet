import React, { useEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Set the worker path
QrScanner.WORKER_PATH = '/qr-scanner-worker.min.js';

function QRScanner({ onScan, onClose }) {
  const videoRef = useRef(null);
  const [error, setError] = useState('');
  const scannerRef = useRef(null);
  const navigate = useNavigate();

  // Function to extract Ethereum address from different formats
  const extractEthereumAddress = (data) => {
    // Direct Ethereum address format (0x...)
    if (data && data.startsWith('0x') && data.length === 42) {
      return data;
    }
    
    // Check if it's a URL with an address parameter
    try {
      const url = new URL(data);
      const addressParam = url.searchParams.get('address');
      if (addressParam && addressParam.startsWith('0x') && addressParam.length === 42) {
        return addressParam;
      }
    } catch (e) {
      // Not a URL, continue with other checks
    }
    
    // Check for ethereum: protocol
    if (data && data.toLowerCase().startsWith('ethereum:')) {
      const address = data.substring(9); // Remove 'ethereum:'
      if (address.startsWith('0x') && address.length === 42) {
        return address;
      }
    }
    
    // No valid Ethereum address found
    return null;
  };

  useEffect(() => {
    if (videoRef.current) {
      // Create QR scanner instance
      scannerRef.current = new QrScanner(
        videoRef.current,
        result => {
          const address = extractEthereumAddress(result.data);
          if (address) {
            onScan(address);
          } else {
            // Instead of showing error, redirect to PaymentScreen
            onClose();
            navigate('/payment');
          }
        },
        {
          returnDetailedScanResult: true,
          highlightScanRegion: true,
          highlightCodeOutline: true,
        }
      );

      // Start scanner
      scannerRef.current.start().catch(err => {
        setError(`Camera error: ${err.message}`);
      });
    }

    // Cleanup on unmount
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop();
        scannerRef.current.destroy();
      }
    };
  }, [onScan, onClose, navigate]);

  return (
    <div className="qr-scanner-overlay">
      <div className="qr-scanner-container">
        <div className="qr-scanner-header">
          <h3>Scan QR Code</h3>
          <button onClick={onClose} className="close-btn">
            <X size={24} />
          </button>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <video ref={videoRef} className="qr-video"></video>
        
        <p className="scanner-instructions">
          Point your camera at an Ethereum address QR code
        </p>
        
        <div className="scanner-footer">
          <button onClick={onClose} className="secondary-btn">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default QRScanner; 