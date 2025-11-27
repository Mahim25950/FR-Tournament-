import React from 'react';
import { User, AppSettings, AdType } from '../types';

interface EarnAdsProps {
  userData: User;
  settings: AppSettings;
  onWatchAd: (type: AdType, reward: number) => void;
}

export const EarnAds: React.FC<EarnAdsProps> = ({ userData, settings, onWatchAd }) => {
  const dailyLimit = settings.maxEarnAdsPerDay;
  const watched = userData.earnAdsWatchedToday;
  const progress = Math.min((watched / dailyLimit) * 100, 100);
  const isLimitReached = watched >= dailyLimit;

  const baseReward = settings.earnPerAd;

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <h2 className="text-2xl font-bold font-orbitron text-primary mb-6 text-center">Earn Money Watching Ads</h2>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-primary/10 rounded-lg p-4 text-center border border-primary/20">
          <div className="text-2xl font-bold text-accent">৳{baseReward}</div>
          <div className="text-xs text-gray-400">Per Ad</div>
        </div>
        <div className="bg-primary/10 rounded-lg p-4 text-center border border-primary/20">
          <div className="text-2xl font-bold text-accent">{watched}</div>
          <div className="text-xs text-gray-400">Watched Today</div>
        </div>
        <div className="bg-primary/10 rounded-lg p-4 text-center border border-primary/20">
          <div className="text-2xl font-bold text-accent">৳{watched * baseReward}</div>
          <div className="text-xs text-gray-400">Earned Today</div>
        </div>
        <div className="bg-primary/10 rounded-lg p-4 text-center border border-primary/20">
          <div className="text-2xl font-bold text-accent">{dailyLimit}</div>
          <div className="text-xs text-gray-400">Daily Limit</div>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-gray-400 mb-2">
          <span>Daily Progress</span>
          <span>{watched}/{dailyLimit}</span>
        </div>
        <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-success to-emerald-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      {/* Ad Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <AdCard 
          icon="fa-play-circle" 
          title="Video Ad" 
          desc="Watch a short video" 
          reward={baseReward} 
          disabled={isLimitReached}
          onClick={() => onWatchAd('earn-video', baseReward)} 
        />
        <AdCard 
          icon="fa-mobile-alt" 
          title="Interactive" 
          desc="Complete simple task" 
          reward={Math.floor(baseReward * 1.5)} 
          disabled={isLimitReached}
          onClick={() => onWatchAd('earn-interactive', Math.floor(baseReward * 1.5))} 
        />
        <AdCard 
          icon="fa-clipboard-list" 
          title="Survey" 
          desc="Take a quick survey" 
          reward={Math.floor(baseReward * 2)} 
          disabled={isLimitReached}
          onClick={() => onWatchAd('earn-survey', Math.floor(baseReward * 2))} 
        />
      </div>
    </div>
  );
};

const AdCard: React.FC<{ icon: string, title: string, desc: string, reward: number, disabled: boolean, onClick: () => void }> = ({ icon, title, desc, reward, disabled, onClick }) => (
  <div className="bg-gradient-to-br from-card to-slate-900 p-6 rounded-xl border border-white/5 shadow-lg flex flex-col items-center text-center hover:-translate-y-1 transition-transform">
    <i className={`fas ${icon} text-4xl text-primary mb-4`}></i>
    <h3 className="font-bold text-lg mb-1">{title}</h3>
    <p className="text-sm text-gray-400 mb-4">{desc}</p>
    <div className="text-2xl font-bold text-success mb-4">৳{reward}</div>
    <button 
      onClick={onClick} 
      disabled={disabled}
      className="w-full bg-gradient-to-r from-primary to-secondary py-2 rounded-lg font-bold text-white shadow-md hover:scale-[1.02] disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed"
    >
      {disabled ? 'Limit Reached' : 'Start & Earn'}
    </button>
  </div>
);