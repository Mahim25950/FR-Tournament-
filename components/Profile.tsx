import React from 'react';
import { User, Page } from '../types';

interface ProfileProps {
  userData: User;
  isAdmin: boolean;
  onLogout: () => void;
  onChangePage: (page: Page) => void;
}

export const Profile: React.FC<ProfileProps> = ({ userData, isAdmin, onLogout, onChangePage }) => {
  return (
    <div className="flex flex-col md:flex-row gap-6 animate-fade-in">
      {/* Sidebar / Info Card */}
      <div className="w-full md:w-1/3">
        <div className="bg-gradient-to-br from-card to-slate-900 rounded-xl p-6 shadow-xl text-center border border-white/5">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary mx-auto flex items-center justify-center text-4xl font-bold text-white mb-4 shadow-lg shadow-primary/30">
            {userData.name.charAt(0).toUpperCase()}
          </div>
          <h2 className="text-xl font-bold mb-1">{userData.name}</h2>
          <p className="text-sm text-gray-400 mb-6">{userData.email}</p>

          <div className="space-y-3 mb-6">
            <StatRow label="Wallet Balance" value={`৳${userData.walletBalance}`} highlight />
            <StatRow label="Winnings" value={`৳${userData.winningsBalance}`} highlight />
            <StatRow label="Matches Played" value={userData.totalMatches} />
            <StatRow label="Ads Today" value={userData.adsWatchedToday} />
          </div>

          <div className="space-y-2">
             <MenuButton icon="fa-wallet" label="Add Money" onClick={() => onChangePage('add-money')} />
             <MenuButton icon="fa-money-check-dollar" label="Withdraw Money" onClick={() => onChangePage('withdraw-money')} />
             
             {/* Admin Panel Button - Visible if isAdmin is true */}
             {isAdmin && (
                <MenuButton icon="fa-user-shield" label="Admin Panel" onClick={() => onChangePage('admin')} />
             )}

             <MenuButton icon="fa-shield-halved" label="Privacy Policy" onClick={() => onChangePage('privacy')} />
             <MenuButton icon="fa-file-contract" label="Terms & Conditions" onClick={() => onChangePage('terms')} />
             <button 
               onClick={onLogout}
               className="w-full flex items-center p-3 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all font-bold"
             >
               <i className="fas fa-sign-out-alt w-8"></i> Logout
             </button>
          </div>
        </div>
      </div>

      {/* Main Content Area placeholder - In a real app this might show match history */}
      <div className="w-full md:w-2/3">
        <div className="bg-card rounded-xl p-6 shadow-xl border border-white/5 h-full flex items-center justify-center text-gray-500">
           <div className="text-center">
             <i className="fas fa-chart-line text-4xl mb-3 opacity-30"></i>
             <p>Match history coming soon...</p>
           </div>
        </div>
      </div>
    </div>
  );
};

const StatRow: React.FC<{ label: string, value: string | number, highlight?: boolean }> = ({ label, value, highlight }) => (
  <div className={`flex justify-between items-center p-3 rounded-lg ${highlight ? 'bg-primary/10 border border-primary/20' : 'bg-black/20'}`}>
    <span className="text-sm text-gray-400">{label}</span>
    <span className={`font-bold ${highlight ? 'text-accent text-lg' : 'text-white'}`}>{value}</span>
  </div>
);

const MenuButton: React.FC<{ icon: string, label: string, onClick: () => void }> = ({ icon, label, onClick }) => (
  <button onClick={onClick} className="w-full flex items-center p-3 rounded-lg bg-white/5 hover:bg-primary/20 hover:text-primary transition-all text-left">
    <i className={`fas ${icon} w-8`}></i> {label}
  </button>
);