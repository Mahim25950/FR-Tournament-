import React, { useState } from 'react';
import { AppSettings, PaymentMethod } from '../types';

interface WalletProps {
  type: 'deposit' | 'withdraw';
  settings: AppSettings;
  onSubmit: (amount: number, method: string, detail: string) => void;
}

export const Wallet: React.FC<WalletProps> = ({ type, settings, onSubmit }) => {
  const [selectedMethodIdx, setSelectedMethodIdx] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [detail, setDetail] = useState(''); // TxID for deposit, Account Number for withdraw

  const methods = type === 'deposit' ? settings.depositMethods : settings.withdrawalMethods;
  const selectedMethod = selectedMethodIdx !== null ? methods[selectedMethodIdx] : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMethod) {
      alert("Select a payment method");
      return;
    }
    onSubmit(Number(amount), selectedMethod.name, detail);
  };

  return (
    <div className="max-w-xl mx-auto animate-fade-in">
      <div className="bg-gradient-to-br from-card to-slate-900 rounded-xl p-8 shadow-xl border border-white/5">
        <h2 className="text-2xl font-bold font-orbitron text-primary mb-2 text-center">
          {type === 'deposit' ? 'Add Money' : 'Withdraw Money'}
        </h2>
        <p className="text-gray-400 text-center mb-8">Select a method below</p>

        {/* Methods Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {methods.map((method, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedMethodIdx(idx)}
              className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${selectedMethodIdx === idx ? 'border-primary bg-primary/10' : 'border-transparent bg-black/20 hover:bg-white/5'}`}
            >
              <img src={method.iconUrl} alt={method.name} className="w-12 h-12 object-contain rounded-lg" />
              <span className="font-bold text-sm">{method.name}</span>
            </button>
          ))}
        </div>

        {/* Details Box */}
        {selectedMethod && (
          <div className="bg-black/30 p-4 rounded-lg mb-6 text-center border border-white/10 animate-fade-in">
            {type === 'deposit' ? (
              <>
                <p className="text-sm text-gray-400">Send money to:</p>
                <p className="font-bold text-lg text-white">{selectedMethod.name} {selectedMethod.type}</p>
                <p className="font-mono text-xl text-accent select-all">{selectedMethod.number}</p>
              </>
            ) : (
              <p className="text-sm text-gray-400">Selected Method: <span className="text-white font-bold">{selectedMethod.name}</span></p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-400">Amount (৳)</label>
            <input
              type="number"
              required
              min={type === 'deposit' ? settings.minDeposit : settings.minWithdrawal}
              placeholder={`Min ${type === 'deposit' ? settings.minDeposit : settings.minWithdrawal}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-white/5 border border-primary/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-400">
              {type === 'deposit' ? 'Transaction ID' : 'Your Account Number'}
            </label>
            <input
              type="text"
              required
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              className="w-full bg-white/5 border border-primary/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          
          {type === 'withdraw' && (
             <div className="bg-warning/10 border-l-4 border-warning p-3 text-sm text-warning rounded-r">
               Note: Only winnings balance can be withdrawn.
             </div>
          )}

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-primary to-secondary py-3.5 rounded-lg font-bold text-lg text-white shadow-lg hover:scale-[1.02] transition-transform"
          >
            Submit Request
          </button>
        </form>
      </div>
    </div>
  );
};