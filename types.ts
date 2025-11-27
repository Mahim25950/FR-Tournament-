export interface User {
  uid: string;
  name: string;
  email: string;
  walletBalance: number;
  winningsBalance: number;
  totalMatches: number;
  adsWatchedToday: number;
  earnAdsWatchedToday: number;
  joinedTournaments: string[];
  joinedFreeMatches: string[];
}

export interface Tournament {
  id: string;
  name: string;
  imageUrl?: string;
  entryFee: number;
  prizePool?: number; // For paid tournaments
  prize?: number; // For free matches
  maxPlayers: number;
  joinedPlayers: number;
  matchStartTime: any; // Firestore Timestamp
  status: 'upcoming' | 'live' | 'completed' | 'archived';
  adsRequired?: number; // For free matches
  adSdkCode?: string; // HTML/JS code for specific ad
  roomId?: string;
  roomPassword?: string;
}

export interface PaymentMethod {
  name: string;
  number: string;
  iconUrl: string;
  type?: string;
}

export interface AppSettings {
  appName: string;
  announcementText: string;
  minDeposit: number;
  minWithdrawal: number;
  sliderImages: string[];
  maxFreeMatchesPerDay: number;
  maxEarnAdsPerDay: number;
  earnPerAd: number;
  depositMethods: PaymentMethod[];
  withdrawalMethods: PaymentMethod[];
  privacyPolicy: string;
  termsConditions: string;
}

export type Page = 'home' | 'earn-ads' | 'tournaments' | 'leaderboard' | 'profile' | 'add-money' | 'withdraw-money' | 'privacy' | 'terms' | 'admin';

export type AdType = 'join-match' | 'earn-video' | 'earn-interactive' | 'earn-survey';

declare global {
  interface Window {
    show_9299851?: () => Promise<void>;
  }
}