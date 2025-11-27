import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser, signOut } from 'firebase/auth';
import { doc, onSnapshot, collection, query, where, getDocs, updateDoc, increment, runTransaction, addDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from './services/firebase';
import { User, AppSettings, Page, Tournament, AdType } from './types';
import { Auth } from './components/Auth';
import { AdModal } from './components/AdModal';

// Components
import { Home } from './components/Home';
import { Tournaments } from './components/Tournaments';
import { EarnAds } from './components/EarnAds';
import { Leaderboard } from './components/Leaderboard';
import { Profile } from './components/Profile';
import { Wallet } from './components/Wallet';
import { AdminPanel } from './components/AdminPanel';

// Define the Admin Credentials
export const ADMIN_EMAIL = "saied8271@gmail.com"; 
export const ADMIN_UID = ""; // Set your specific Admin UID here if needed

const DEFAULT_SETTINGS: AppSettings = {
  appName: "Gaming Portal",
  announcementText: "Welcome to our gaming platform! Join tournaments and earn rewards.",
  minDeposit: 50,
  minWithdrawal: 100,
  sliderImages: [],
  maxFreeMatchesPerDay: 5,
  maxEarnAdsPerDay: 10,
  earnPerAd: 5,
  depositMethods: [
    { name: "Bkash", number: "01700000000", iconUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Bkash_Logo.svg/1200px-Bkash_Logo.svg.png", type: "Personal" },
    { name: "Nagad", number: "01700000000", iconUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Nagad_Logo.png/1200px-Nagad_Logo.png", type: "Personal" }
  ],
  withdrawalMethods: [
    { name: "Bkash", number: "", iconUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Bkash_Logo.svg/1200px-Bkash_Logo.svg.png" },
    { name: "Nagad", number: "", iconUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Nagad_Logo.png/1200px-Nagad_Logo.png" }
  ],
  privacyPolicy: "Privacy Policy content goes here.",
  termsConditions: "Terms & Conditions content goes here."
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [activePage, setActivePage] = useState<Page>('home');
  const [loading, setLoading] = useState(true);
  
  // Data State
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [freeMatches, setFreeMatches] = useState<Tournament[]>([]);
  
  // Ad Modal State
  const [isAdModalOpen, setIsAdModalOpen] = useState(false);
  const [adContext, setAdContext] = useState<{
    type: AdType;
    matchId?: string;
    adsRequired?: number;
    currentAdIndex?: number;
    reward?: number;
  }>({ type: 'earn-video' });

  // Init Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) {
        setLoading(false);
        setUserData(null);
      }
    });
    return () => unsub();
  }, []);

  // Init Data Listeners
  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);

    // User Data Listener
    const unsubUser = onSnapshot(doc(db, 'users', currentUser.uid), async (snapshot) => {
      if (snapshot.exists()) {
        setUserData({ uid: snapshot.id, ...snapshot.data() } as User);
        setLoading(false);
      } else {
        console.warn("User data not found in Firestore. Creating default profile...");
        // Auto-create user profile if missing (Self-healing)
        try {
          const newUserProfile = {
            name: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
            email: currentUser.email || '',
            walletBalance: 0,
            winningsBalance: 0,
            joinedTournaments: [],
            joinedFreeMatches: [],
            totalMatches: 0,
            adsWatchedToday: 0,
            earnAdsWatchedToday: 0
          };
          await setDoc(doc(db, 'users', currentUser.uid), newUserProfile);
          // Note: We don't need to manually set state or loading false here, 
          // because setDoc will trigger this snapshot listener again immediately.
        } catch (error) {
          console.error("Error creating user profile:", error);
          setLoading(false);
        }
      }
    });

    // Settings Listener
    const unsubSettings = onSnapshot(doc(db, 'settings', 'appConfig'), (doc) => {
      if (doc.exists()) {
        setSettings(doc.data() as AppSettings);
      } else {
        // Use default settings if not found in DB
        setSettings(DEFAULT_SETTINGS);
      }
    });

    // Tournaments Listener
    const unsubTournaments = onSnapshot(
      query(collection(db, 'tournaments'), where('status', '!=', 'archived')),
      (snapshot) => {
        const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Tournament));
        setTournaments(list);
      }
    );

    // Free Matches Listener
    const unsubFreeMatches = onSnapshot(
      query(collection(db, 'freeMatches'), where('status', '!=', 'archived')),
      (snapshot) => {
        const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Tournament));
        setFreeMatches(list);
      }
    );

    return () => {
      unsubUser();
      unsubSettings();
      unsubTournaments();
      unsubFreeMatches();
    };
  }, [currentUser]);

  // Actions
  const handleLogout = () => signOut(auth);

  const startJoinMatchProcess = (matchId: string, adsRequired: number) => {
    setAdContext({
      type: 'join-match',
      matchId,
      adsRequired,
      currentAdIndex: 0
    });
    setIsAdModalOpen(true);
  };

  const startEarnAdProcess = (type: AdType, reward: number) => {
    if (!settings || !userData) return;
    if (userData.earnAdsWatchedToday >= settings.maxEarnAdsPerDay) {
      alert("Daily limit reached!");
      return;
    }
    setAdContext({ type, reward });
    setIsAdModalOpen(true);
  };

  const onAdComplete = async () => {
    if (!userData || !currentUser) return;

    if (adContext.type === 'join-match') {
      const nextIndex = (adContext.currentAdIndex || 0) + 1;
      
      // Update ad watch count in background
      await updateDoc(doc(db, 'users', currentUser.uid), {
        adsWatchedToday: increment(1)
      });

      if (nextIndex < (adContext.adsRequired || 1)) {
        // Need to watch more
        setAdContext(prev => ({ ...prev, currentAdIndex: nextIndex }));
      } else {
        // All ads watched, join match
        setIsAdModalOpen(false);
        await joinMatch(adContext.matchId!, 'freeMatches', 0);
      }
    } else {
      // Earn Ad
      await updateDoc(doc(db, 'users', currentUser.uid), {
        earnAdsWatchedToday: increment(1),
        walletBalance: increment(adContext.reward || 0)
      });
      setIsAdModalOpen(false);
      alert(`You earned ৳${adContext.reward}!`);
    }
  };

  const joinMatch = async (matchId: string, collectionName: 'tournaments' | 'freeMatches', fee: number) => {
    if (!currentUser || !userData) return;

    if (fee > 0 && userData.walletBalance < fee) {
      alert("Insufficient balance!");
      return;
    }

    try {
      await runTransaction(db, async (transaction) => {
        const matchRef = doc(db, collectionName, matchId);
        const userRef = doc(db, 'users', currentUser.uid);
        
        const matchDoc = await transaction.get(matchRef);
        const userDoc = await transaction.get(userRef);

        if (!matchDoc.exists() || !userDoc.exists()) throw new Error("Document does not exist");
        
        const matchData = matchDoc.data() as Tournament;
        const userData = userDoc.data() as User;

        if (matchData.joinedPlayers >= matchData.maxPlayers) throw new Error("Match is full");
        
        const alreadyJoined = collectionName === 'tournaments' 
          ? userData.joinedTournaments?.includes(matchId)
          : userData.joinedFreeMatches?.includes(matchId);
          
        if (alreadyJoined) throw new Error("Already joined");

        if (fee > 0 && userData.walletBalance < fee) throw new Error("Insufficient funds");

        const updateData: any = {
          totalMatches: increment(1)
        };

        if (collectionName === 'tournaments') {
          updateData.joinedTournaments = [...(userData.joinedTournaments || []), matchId];
          if (fee > 0) updateData.walletBalance = increment(-fee);
        } else {
          updateData.joinedFreeMatches = [...(userData.joinedFreeMatches || []), matchId];
        }

        transaction.update(userRef, updateData);
        transaction.update(matchRef, { joinedPlayers: increment(1) });
      });
      alert("Joined successfully!");
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDeposit = async (amount: number, method: string, txId: string) => {
    if (!currentUser || !userData) return;
    try {
      await addDoc(collection(db, 'depositRequests'), {
        userId: currentUser.uid,
        userName: userData.name,
        userEmail: userData.email,
        amount,
        transactionId: txId,
        method,
        status: 'pending',
        timestamp: serverTimestamp()
      });
      alert('Deposit request submitted!');
      setActivePage('profile');
    } catch (e) {
      console.error(e);
      alert('Error submitting request');
    }
  };

  const handleWithdraw = async (amount: number, method: string, number: string) => {
    if (!currentUser || !userData) return;
    
    if (amount > userData.winningsBalance) {
      alert("Insufficient winnings balance");
      return;
    }

    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', currentUser.uid);
        const userDoc = await transaction.get(userRef);
        
        if (!userDoc.exists()) throw new Error("User data not found");
        
        const currentData = userDoc.data() as User;
        const currentWinnings = currentData.winningsBalance || 0;

        if (currentWinnings < amount) {
          throw new Error("Insufficient winnings balance");
        }

        // Deduct balance immediately upon request to lock funds
        transaction.update(userRef, {
          winningsBalance: increment(-amount)
        });

        // Create the request document
        const newRequestRef = doc(collection(db, 'withdrawRequests'));
        transaction.set(newRequestRef, {
          userId: currentUser.uid,
          userName: userData.name,
          userEmail: userData.email,
          amount,
          accountNumber: number,
          method,
          status: 'pending',
          timestamp: serverTimestamp()
        });
      });

      alert('Withdrawal request submitted! Amount has been deducted from your winnings.');
      setActivePage('profile');
    } catch (e: any) {
      console.error(e);
      alert(`Error submitting request: ${e.message}`);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-dark">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-4 text-primary font-orbitron">Loading...</p>
    </div>
  );

  if (!currentUser) return <Auth />;
  
  // Handling missing data state gracefully
  if (!settings || !userData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-dark text-center p-4">
        <div className="text-red-500 mb-4 text-xl"><i className="fas fa-exclamation-triangle"></i></div>
        <p className="mb-4">Unable to load user data. Please try logging out and back in.</p>
        <button 
          onClick={handleLogout}
          className="bg-red-500 text-white px-6 py-2 rounded-lg font-bold"
        >
          Logout
        </button>
      </div>
    );
  }

  // Check if user is admin via Email OR UID (using currentUser for reliability)
  const isAdmin = 
    (currentUser.email && currentUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) || 
    (currentUser.uid === ADMIN_UID);

  return (
    <div className="min-h-screen bg-dark pb-20 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/90 backdrop-blur-md border-b border-primary/20 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2 text-primary font-orbitron text-xl md:text-2xl font-black">
            <i className="fas fa-gamepad"></i>
            <span>{settings.appName}</span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex gap-6">
            {(['home', 'earn-ads', 'tournaments', 'leaderboard'] as const).map(page => (
              <button
                key={page}
                onClick={() => setActivePage(page)}
                className={`font-rajdhani font-bold uppercase transition-colors ${activePage === page ? 'text-primary' : 'text-gray-400 hover:text-white'}`}
              >
                {page.replace('-', ' ')}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-r from-primary to-secondary px-4 py-1.5 rounded-full font-bold shadow-md shadow-primary/20">
              ৳{userData.walletBalance}
            </div>
            <button onClick={() => setActivePage('profile')} className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center border-2 border-primary text-white font-bold">
              {userData.name.charAt(0).toUpperCase()}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {activePage === 'home' && (
          <Home 
            settings={settings} 
            tournaments={tournaments} 
            freeMatches={freeMatches}
            joinedTournaments={userData.joinedTournaments || []}
            joinedFreeMatches={userData.joinedFreeMatches || []}
            onJoinPaid={(id, fee) => joinMatch(id, 'tournaments', fee)}
            onJoinFree={(id, ads) => startJoinMatchProcess(id, ads)}
            onChangePage={setActivePage}
          />
        )}
        
        {activePage === 'earn-ads' && (
          <EarnAds 
            userData={userData}
            settings={settings}
            onWatchAd={startEarnAdProcess}
          />
        )}
        
        {activePage === 'tournaments' && (
          <Tournaments 
            tournaments={[...tournaments, ...freeMatches]} 
            joinedIds={[...(userData.joinedTournaments || []), ...(userData.joinedFreeMatches || [])]}
            onJoinPaid={(id, fee) => joinMatch(id, 'tournaments', fee)}
            onJoinFree={(id, ads) => startJoinMatchProcess(id, ads)}
          />
        )}
        
        {activePage === 'leaderboard' && <Leaderboard />}
        
        {activePage === 'profile' && (
          <Profile 
            userData={userData} 
            isAdmin={isAdmin}
            onLogout={handleLogout} 
            onChangePage={setActivePage} 
          />
        )}

        {activePage === 'add-money' && (
          <Wallet type="deposit" settings={settings} onSubmit={handleDeposit} />
        )}
        
        {activePage === 'withdraw-money' && (
          <Wallet type="withdraw" settings={settings} onSubmit={handleWithdraw} />
        )}

        {activePage === 'admin' && isAdmin && (
          <AdminPanel />
        )}
        
        {(activePage === 'privacy' || activePage === 'terms') && (
           <div className="bg-card rounded-xl p-6 shadow-lg border border-white/5 animate-fade-in">
             <h2 className="text-2xl font-bold text-primary font-orbitron mb-4">
                {activePage === 'privacy' ? 'Privacy Policy' : 'Terms & Conditions'}
             </h2>
             <div className="whitespace-pre-wrap text-gray-300">
               {activePage === 'privacy' ? settings.privacyPolicy : settings.termsConditions}
             </div>
             <button onClick={() => setActivePage('profile')} className="mt-6 text-primary hover:underline">Back to Profile</button>
           </div>
        )}
      </main>

      {/* Mobile Footer Nav */}
      <footer className="md:hidden fixed bottom-0 left-0 w-full bg-card border-t border-white/10 z-50">
        <div className="flex justify-around items-center py-3">
          {(['home', 'earn-ads', 'tournaments', 'leaderboard', 'profile'] as const).map(page => {
            let icon = 'fa-home';
            if (page === 'earn-ads') icon = 'fa-sack-dollar';
            if (page === 'tournaments') icon = 'fa-trophy';
            if (page === 'leaderboard') icon = 'fa-chart-simple';
            if (page === 'profile') icon = 'fa-user';
            
            return (
              <button
                key={page}
                onClick={() => setActivePage(page)}
                className={`flex flex-col items-center gap-1 ${activePage === page ? 'text-primary' : 'text-gray-500'}`}
              >
                <i className={`fas ${icon} text-xl`}></i>
                <span className="text-[10px] uppercase font-bold">{page.split('-')[0]}</span>
              </button>
            )
          })}
        </div>
      </footer>

      {/* Ad Modal */}
      <AdModal 
        isOpen={isAdModalOpen}
        onClose={() => setIsAdModalOpen(false)}
        onComplete={onAdComplete}
        adType={adContext.type}
        requiredAds={adContext.adsRequired}
        currentAdIndex={adContext.currentAdIndex}
        rewardAmount={adContext.reward}
      />
    </div>
  );
}