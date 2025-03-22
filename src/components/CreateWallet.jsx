import React, { useState } from 'react';
import { Wallet, Shield } from 'lucide-react';

function CreateWallet({ onCreateWallet }) {
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    try {
      setCreating(true);
      setError('');
      await onCreateWallet();
    } catch (error) {
      console.error('Error creating wallet:', error);
      setError('Failed to create wallet. Please try again.');
      setCreating(false);
    }
  };

  return (
    <div className="screen active">
      <div className="wallet-icon">
        <Wallet size={72} strokeWidth={1.5} />
      </div>
      <h1>TahiWallet</h1>
      <p className="description">
        Create a new wallet to store and transfer NZDD stablecoin on Base chain. 
        Your private key will be securely encrypted and stored on your device.
      </p>

      {error && <div className="error-message">{error}</div>}

      <button 
        onClick={handleCreate}
        className="primary-btn"
        disabled={creating}
      >
        {creating ? (
          <>
            <span className="loading-spinner"></span>
            Creating Wallet...
          </>
        ) : (
          <>
            <Shield size={20} className="icon-sm" style={{ marginRight: '8px' }} />
            Create New Wallet
          </>
        )}
      </button>
    </div>
  );
}

export default CreateWallet; 