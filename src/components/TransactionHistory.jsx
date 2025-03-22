import React, { useState } from 'react';
import { ArrowUp, ArrowDown, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

function TransactionHistory({ transactions, address }) {
  const [expanded, setExpanded] = useState(false);
  
  // If no transactions, show a message
  if (!transactions || transactions.length === 0) {
    return (
      <div className="transaction-history-container">
        <div className="transaction-history-header" onClick={() => setExpanded(!expanded)}>
          <h3>Transaction History</h3>
          {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
        {expanded && (
          <div className="no-transactions">
            <p>No transactions found</p>
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div className="transaction-history-container">
      <div className="transaction-history-header" onClick={() => setExpanded(!expanded)}>
        <h3>Transaction History</h3>
        {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </div>
      
      {expanded && (
        <div className="transaction-list">
          {transactions.map((tx) => (
            <div key={tx.hash} className="transaction-item">
              <div className="transaction-icon">
                {tx.from.toLowerCase() === address.toLowerCase() ? (
                  <ArrowUp className="sent-icon" />
                ) : (
                  <ArrowDown className="received-icon" />
                )}
              </div>
              
              <div className="transaction-details">
                <p className="transaction-type">
                  {tx.from.toLowerCase() === address.toLowerCase() ? 'Sent' : 'Received'}
                </p>
                <p className="transaction-date">
                  {formatDistanceToNow(new Date(tx.timestamp), { addSuffix: true })}
                </p>
              </div>
              
              <div className="transaction-amount">
                <p className={tx.from.toLowerCase() === address.toLowerCase() ? 'amount-sent' : 'amount-received'}>
                  {tx.from.toLowerCase() === address.toLowerCase() ? '-' : '+'}{tx.amount} NZDD
                </p>
                <a 
                  href={`https://${import.meta.env.VITE_BASE_CHAIN_ID === '84532' ? 'sepolia.' : ''}basescan.org/tx/${tx.hash}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="tx-explorer-link"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TransactionHistory; 