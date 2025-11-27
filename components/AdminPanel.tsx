import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, increment, runTransaction, getCountFromServer, addDoc, deleteDoc, Timestamp, orderBy, limit, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Tournament, AppSettings, User, PaymentMethod } from '../types';

interface Request {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  method: string;
  transactionId?: string; // Deposit only
  accountNumber?: string; // Withdraw only
  status: 'pending' | 'approved' | 'rejected';
  timestamp: any;
}

interface DashboardStats {
  totalUsers: number;
  totalTournaments: number;
  totalFreeMatches: number;
  pendingRequests: number;
}

type AdminSection = 'dashboard' | 'tournaments' | 'freeMatches' | 'deposits' | 'withdrawals' | 'users' | 'settings';

export const AdminPanel: React.FC = () => {
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const [requests, setRequests] = useState<Request[]>([]);
  const [requestFilter, setRequestFilter] = useState<'pending' | 'all'>('pending');
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [freeMatches, setFreeMatches] = useState<Tournament[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Dashboard Stats
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalTournaments: 0,
    totalFreeMatches: 0,
    pendingRequests: 0
  });

  // Match Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'tournament' | 'freeMatch'>('tournament');
  const [editingItem, setEditingItem] = useState<Tournament | null>(null);
  const [formData, setFormData] = useState<Partial<Tournament>>({});

  // User Edit Modal State
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({ walletBalance: 0, winningsBalance: 0 });

  // Fetch Stats
  const fetchStats = async () => {
    try {
      const usersSnap = await getCountFromServer(collection(db, 'users'));
      const tournamentsSnap = await getCountFromServer(collection(db, 'tournaments'));
      const freeMatchesSnap = await getCountFromServer(collection(db, 'freeMatches'));
      
      const depositPendingSnap = await getCountFromServer(query(collection(db, 'depositRequests'), where('status', '==', 'pending')));
      const withdrawPendingSnap = await getCountFromServer(query(collection(db, 'withdrawRequests'), where('status', '==', 'pending')));

      setStats({
        totalUsers: usersSnap.data().count,
        totalTournaments: tournamentsSnap.data().count,
        totalFreeMatches: freeMatchesSnap.data().count,
        pendingRequests: depositPendingSnap.data().count + withdrawPendingSnap.data().count
      });
    } catch (e: any) {
      console.error("Error fetching stats:", e);
    }
  };

  // Fetch Requests
  const fetchRequests = async () => {
    setLoading(true);
    try {
      const collectionName = activeSection === 'deposits' ? 'depositRequests' : 'withdrawRequests';
      let q;
      
      if (requestFilter === 'pending') {
        // Fetch only pending
        q = query(collection(db, collectionName), where('status', '==', 'pending'));
      } else {
        // Fetch history (limit 50)
        q = query(collection(db, collectionName), orderBy('timestamp', 'desc'), limit(50));
      }

      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Request));
      
      // Sort pending requests by date (newest first) client-side if needed, though 'All' uses orderBy
      if (requestFilter === 'pending') {
        list.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      }
      
      setRequests(list);
    } catch (e: any) {
      console.error(e);
      if (e.code === 'permission-denied') {
        alert("Error: Missing permissions. Please update Firestore Security Rules.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch Matches (Tournaments or Free Matches)
  const fetchMatches = async (collectionName: 'tournaments' | 'freeMatches') => {
    setLoading(true);
    try {
      const q = query(collection(db, collectionName), where('status', '!=', 'archived'));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Tournament));
      // Sort by start time descending
      list.sort((a, b) => b.matchStartTime?.seconds - a.matchStartTime?.seconds);
      
      if (collectionName === 'tournaments') setTournaments(list);
      else setFreeMatches(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Users
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), limit(100)); // Limit to 100 for now
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(d => ({ uid: d.id, ...d.data() } as User));
      setUsersList(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Settings
  const fetchSettings = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, 'settings', 'appConfig');
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        setAppSettings(snapshot.data() as AppSettings);
      } else {
        // Fallback to default structure if doc doesn't exist
        setAppSettings({
          appName: "Gaming Portal",
          announcementText: "Welcome!",
          minDeposit: 50,
          minWithdrawal: 100,
          sliderImages: [],
          maxFreeMatchesPerDay: 5,
          maxEarnAdsPerDay: 10,
          earnPerAd: 5,
          depositMethods: [],
          withdrawalMethods: [],
          privacyPolicy: "",
          termsConditions: ""
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Main Effect
  useEffect(() => {
    fetchStats();
    if (activeSection === 'deposits' || activeSection === 'withdrawals') {
      fetchRequests();
    } else if (activeSection === 'tournaments') {
      fetchMatches('tournaments');
    } else if (activeSection === 'freeMatches') {
      fetchMatches('freeMatches');
    } else if (activeSection === 'users') {
      fetchUsers();
    } else if (activeSection === 'settings') {
      fetchSettings();
    } else {
      setLoading(false);
    }
  }, [activeSection, requestFilter]);

  const refreshAll = () => {
    fetchStats();
    if (activeSection === 'deposits' || activeSection === 'withdrawals') fetchRequests();
    if (activeSection === 'tournaments') fetchMatches('tournaments');
    if (activeSection === 'freeMatches') fetchMatches('freeMatches');
    if (activeSection === 'users') fetchUsers();
    if (activeSection === 'settings') fetchSettings();
  };

  // --- Request Handling (Secure Logic) ---
  const handleAcceptPayment = async (req: Request, action: 'approve' | 'reject') => {
    if (!window.confirm(`Are you sure you want to ${action.toUpperCase()} this request?`)) return;

    try {
      const collectionName = activeSection === 'deposits' ? 'depositRequests' : 'withdrawRequests';
      const reqRef = doc(db, collectionName, req.id);
      const userRef = doc(db, 'users', req.userId);

      await runTransaction(db, async (transaction) => {
        // 1. Get Request Doc
        const reqDoc = await transaction.get(reqRef);
        if (!reqDoc.exists()) throw new Error("Request does not exist");
        
        const reqData = reqDoc.data();
        if (reqData.status !== 'pending') throw new Error("Request already processed");

        // 2. Logic based on action
        if (action === 'approve') {
          const userDoc = await transaction.get(userRef);
          if (!userDoc.exists()) throw new Error("User associated with this request does not exist");

          if (activeSection === 'deposits') {
            // Deposit Approved: Add to wallet balance
            transaction.update(userRef, { walletBalance: increment(req.amount) });
          } else {
            // Withdrawal Approved: 
            // Money was ALREADY deducted from winningsBalance when the user requested it (in App.tsx).
            // We do NOT deduct again. We just mark it approved.
          }
        } else if (action === 'reject') {
           // If rejecting a withdrawal, we must REFUND the money back to the user
           if (activeSection === 'withdrawals') {
             const userDoc = await transaction.get(userRef);
             if (userDoc.exists()) {
                transaction.update(userRef, { winningsBalance: increment(req.amount) });
             }
           }
        }

        // 3. Update Request Status
        transaction.update(reqRef, { 
          status: action === 'approve' ? 'approved' : 'rejected' 
        });
      });

      alert(`Request ${action}d successfully`);
      refreshAll();
    } catch (e: any) {
      console.error(e);
      alert(`Error: ${e.message}`);
    }
  };

  // --- User Handling ---
  const openUserModal = (user: User) => {
    setEditingUser(user);
    setUserForm({
      walletBalance: user.walletBalance,
      winningsBalance: user.winningsBalance
    });
    setShowUserModal(true);
  };

  const handleSaveUserBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', editingUser.uid), {
        walletBalance: Number(userForm.walletBalance),
        winningsBalance: Number(userForm.winningsBalance)
      });
      setShowUserModal(false);
      setEditingUser(null);
      refreshAll();
      alert("User balance updated successfully");
    } catch (e: any) {
      alert("Error updating user: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (!window.confirm("Are you sure you want to delete this user? This cannot be undone.")) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'users', uid));
      refreshAll();
      alert("User deleted successfully");
    } catch (e: any) {
      alert("Error deleting user: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Match Handling (Tournaments/Free Matches) ---
  const openModal = (type: 'tournament' | 'freeMatch', item: Tournament | null = null) => {
    setModalType(type);
    setEditingItem(item);
    
    if (item) {
      // Convert Timestamp to datetime-local string format
      let startTimeStr = '';
      if (item.matchStartTime) {
        const date = item.matchStartTime.toDate();
        const offset = date.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(date.getTime() - offset)).toISOString().slice(0, 16);
        startTimeStr = localISOTime;
      }

      setFormData({
        ...item,
        // @ts-ignore
        startTimeStr: startTimeStr
      });
    } else {
      setFormData({
        name: '',
        imageUrl: '',
        entryFee: type === 'tournament' ? 50 : 0,
        prizePool: 0,
        prize: 0,
        maxPlayers: 100,
        joinedPlayers: 0,
        status: 'upcoming',
        adsRequired: 1,
        adSdkCode: '',
        roomId: '',
        roomPassword: '',
        // @ts-ignore
        startTimeStr: ''
      });
    }
    setShowModal(true);
  };

  const handleSaveMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const collectionName = modalType === 'tournament' ? 'tournaments' : 'freeMatches';
      // @ts-ignore
      const date = new Date(formData.startTimeStr);
      const timestamp = Timestamp.fromDate(date);

      const dataToSave = {
        name: formData.name,
        imageUrl: formData.imageUrl,
        entryFee: Number(formData.entryFee),
        prizePool: Number(formData.prizePool || formData.prize),
        prize: Number(formData.prize || formData.prizePool),
        maxPlayers: Number(formData.maxPlayers),
        matchStartTime: timestamp,
        status: formData.status,
        roomId: formData.roomId,
        roomPassword: formData.roomPassword,
        adsRequired: modalType === 'freeMatch' ? Number(formData.adsRequired) : 0,
        adSdkCode: modalType === 'freeMatch' ? (formData.adSdkCode || '') : '',
        joinedPlayers: formData.joinedPlayers || 0
      };

      if (editingItem) {
        await updateDoc(doc(db, collectionName, editingItem.id), dataToSave);
      } else {
        await addDoc(collection(db, collectionName), dataToSave);
      }

      setShowModal(false);
      refreshAll();
    } catch (e: any) {
      alert(`Error saving: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMatch = async (id: string, collectionName: 'tournaments' | 'freeMatches') => {
    if (!window.confirm("Are you sure? This will archive the match.")) return;
    try {
      await updateDoc(doc(db, collectionName, id), { status: 'archived' });
      refreshAll();
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
  };

  // --- Settings Handling ---
  const handleSaveSettings = async () => {
    if (!appSettings) return;
    setLoading(true);
    try {
      await setDoc(doc(db, 'settings', 'appConfig'), appSettings);
      alert("Settings saved successfully!");
    } catch (e: any) {
      console.error(e);
      alert("Error saving settings: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPaymentMethod = (type: 'deposit' | 'withdrawal') => {
    if (!appSettings) return;
    const newMethod: PaymentMethod = { name: "New Method", number: "", iconUrl: "", type: "Personal" };
    if (type === 'deposit') {
      setAppSettings({ ...appSettings, depositMethods: [...appSettings.depositMethods, newMethod] });
    } else {
      setAppSettings({ ...appSettings, withdrawalMethods: [...appSettings.withdrawalMethods, newMethod] });
    }
  };

  const handleRemovePaymentMethod = (type: 'deposit' | 'withdrawal', index: number) => {
    if (!appSettings) return;
    if (type === 'deposit') {
      const methods = [...appSettings.depositMethods];
      methods.splice(index, 1);
      setAppSettings({ ...appSettings, depositMethods: methods });
    } else {
      const methods = [...appSettings.withdrawalMethods];
      methods.splice(index, 1);
      setAppSettings({ ...appSettings, withdrawalMethods: methods });
    }
  };

  const handleUpdatePaymentMethod = (type: 'deposit' | 'withdrawal', index: number, field: keyof PaymentMethod, value: string) => {
    if (!appSettings) return;
    if (type === 'deposit') {
      const methods = [...appSettings.depositMethods];
      methods[index] = { ...methods[index], [field]: value };
      setAppSettings({ ...appSettings, depositMethods: methods });
    } else {
      const methods = [...appSettings.withdrawalMethods];
      methods[index] = { ...methods[index], [field]: value };
      setAppSettings({ ...appSettings, withdrawalMethods: methods });
    }
  };

  const handleAddSliderImage = () => {
    if (!appSettings) return;
    setAppSettings({ ...appSettings, sliderImages: [...appSettings.sliderImages, ''] });
  };

  const handleUpdateSliderImage = (index: number, value: string) => {
    if (!appSettings) return;
    const images = [...appSettings.sliderImages];
    images[index] = value;
    setAppSettings({ ...appSettings, sliderImages: images });
  };

  const handleRemoveSliderImage = (index: number) => {
    if (!appSettings) return;
    const images = [...appSettings.sliderImages];
    images.splice(index, 1);
    setAppSettings({ ...appSettings, sliderImages: images });
  };

  return (
    <div className="max-w-6xl mx-auto animate-fade-in pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-3xl font-bold font-orbitron text-primary">Admin Panel</h2>
        <div className="flex gap-2">
           <button onClick={refreshAll} className="bg-primary/20 hover:bg-primary text-primary hover:text-white px-4 py-2 rounded-lg transition-colors">
            <i className="fas fa-sync-alt mr-2"></i> Refresh
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex flex-wrap gap-2 mb-8 bg-black/20 p-2 rounded-xl border border-white/5 overflow-x-auto">
        {(['dashboard', 'tournaments', 'freeMatches', 'deposits', 'withdrawals', 'users', 'settings'] as const).map(section => (
          <button
            key={section}
            onClick={() => setActiveSection(section)}
            className={`flex-1 px-4 py-2 rounded-lg font-bold capitalize transition-all whitespace-nowrap ${activeSection === section ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            {section.replace(/([A-Z])/g, ' $1').trim()}
          </button>
        ))}
      </div>

      {/* DASHBOARD VIEW */}
      {activeSection === 'dashboard' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in">
          <StatCard label="Total Users" value={stats.totalUsers} icon="fa-users" color="bg-blue-500/20 text-blue-400" />
          <StatCard label="Tournaments" value={stats.totalTournaments} icon="fa-trophy" color="bg-purple-500/20 text-purple-400" />
          <StatCard label="Free Matches" value={stats.totalFreeMatches} icon="fa-gamepad" color="bg-emerald-500/20 text-emerald-400" />
          <StatCard label="Pending Requests" value={stats.pendingRequests} icon="fa-clock" color="bg-amber-500/20 text-amber-400" />
        </div>
      )}

      {/* TOURNAMENTS & FREE MATCHES VIEW */}
      {(activeSection === 'tournaments' || activeSection === 'freeMatches') && (
        <div className="animate-fade-in">
           <div className="flex justify-between items-center mb-4">
             <h3 className="text-xl font-bold text-white capitalize">{activeSection.replace(/([A-Z])/g, ' $1')} List</h3>
             <button 
               onClick={() => openModal(activeSection === 'tournaments' ? 'tournament' : 'freeMatch')}
               className="bg-success hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg transition-transform hover:scale-105"
             >
               <i className="fas fa-plus mr-2"></i> Add New
             </button>
           </div>

           <div className="bg-card rounded-xl border border-white/5 overflow-hidden shadow-xl">
             <div className="overflow-x-auto">
               <table className="w-full text-left text-sm text-gray-400">
                 <thead className="bg-black/30 text-xs uppercase font-bold text-gray-300">
                   <tr>
                     <th className="px-6 py-4">Name</th>
                     <th className="px-6 py-4">{activeSection === 'tournaments' ? 'Fee' : 'Ads'}</th>
                     <th className="px-6 py-4">Prize</th>
                     <th className="px-6 py-4">Players</th>
                     <th className="px-6 py-4">Start Time</th>
                     <th className="px-6 py-4">Status</th>
                     <th className="px-6 py-4 text-right">Actions</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-white/5">
                   {(activeSection === 'tournaments' ? tournaments : freeMatches).map((match) => (
                     <tr key={match.id} className="hover:bg-white/5 transition-colors">
                       <td className="px-6 py-4 font-bold text-white">
                         <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-gray-800 bg-cover bg-center" style={{backgroundImage: `url(${match.imageUrl})`}}></div>
                            {match.name}
                         </div>
                       </td>
                       <td className="px-6 py-4">
                         {activeSection === 'tournaments' ? `৳${match.entryFee}` : `${match.adsRequired} Ads`}
                       </td>
                       <td className="px-6 py-4 text-accent font-bold">৳{match.prizePool || match.prize}</td>
                       <td className="px-6 py-4">{match.joinedPlayers}/{match.maxPlayers}</td>
                       <td className="px-6 py-4">{match.matchStartTime?.toDate().toLocaleString()}</td>
                       <td className="px-6 py-4">
                         <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                           match.status === 'live' ? 'bg-red-500/20 text-red-400' :
                           match.status === 'completed' ? 'bg-gray-500/20 text-gray-400' :
                           'bg-blue-500/20 text-blue-400'
                         }`}>
                           {match.status}
                         </span>
                       </td>
                       <td className="px-6 py-4 text-right">
                         <div className="flex justify-end gap-2">
                           <button onClick={() => openModal(activeSection === 'tournaments' ? 'tournament' : 'freeMatch', match)} className="text-blue-400 hover:text-blue-300 p-2"><i className="fas fa-edit"></i></button>
                           <button onClick={() => handleDeleteMatch(match.id, activeSection)} className="text-red-400 hover:text-red-300 p-2"><i className="fas fa-trash"></i></button>
                         </div>
                       </td>
                     </tr>
                   ))}
                   {(activeSection === 'tournaments' ? tournaments : freeMatches).length === 0 && (
                     <tr><td colSpan={7} className="px-6 py-8 text-center italic">No matches found.</td></tr>
                   )}
                 </tbody>
               </table>
             </div>
           </div>
        </div>
      )}

      {/* REQUESTS VIEW (Deposits / Withdrawals) */}
      {(activeSection === 'deposits' || activeSection === 'withdrawals') && (
        <div className="animate-fade-in">
          <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
            <h3 className="text-xl font-bold text-white capitalize">{activeSection} Requests</h3>
            <div className="flex bg-black/30 rounded-lg p-1">
              <button 
                onClick={() => setRequestFilter('pending')} 
                className={`px-4 py-1 rounded text-sm font-bold ${requestFilter === 'pending' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'}`}
              >
                Pending
              </button>
              <button 
                onClick={() => setRequestFilter('all')} 
                className={`px-4 py-1 rounded text-sm font-bold ${requestFilter === 'all' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'}`}
              >
                All History
              </button>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-white/5 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-400">
                <thead className="bg-black/30 text-xs uppercase font-bold text-gray-300">
                  <tr>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Method</th>
                    <th className="px-6 py-4">Details</th>
                    <th className="px-6 py-4">Status</th>
                    {requestFilter === 'pending' && <th className="px-6 py-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {requests.map((req) => (
                    <tr key={req.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {req.timestamp?.toDate().toLocaleDateString()}
                        <div className="text-xs text-gray-500">{req.timestamp?.toDate().toLocaleTimeString()}</div>
                      </td>
                      <td className="px-6 py-4 font-bold text-white">
                        {req.userName}
                        <div className="text-xs text-gray-500 font-normal">{req.userEmail}</div>
                      </td>
                      <td className="px-6 py-4 text-accent font-bold">৳{req.amount}</td>
                      <td className="px-6 py-4">{req.method}</td>
                      <td className="px-6 py-4">
                        <span className="font-mono bg-black/20 px-2 py-1 rounded text-xs select-all">
                          {req.transactionId || req.accountNumber}
                        </span>
                        <div className="text-xs text-gray-500 mt-1">
                          {req.transactionId ? 'TxID' : 'Account'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                          req.status === 'approved' ? 'bg-success/20 text-success' :
                          req.status === 'rejected' ? 'bg-danger/20 text-danger' :
                          'bg-warning/20 text-warning'
                        }`}>
                          {req.status}
                        </span>
                      </td>
                      {requestFilter === 'pending' && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => handleAcceptPayment(req, 'approve')} 
                              className="w-8 h-8 rounded flex items-center justify-center bg-success/20 text-success hover:bg-success hover:text-white transition-colors"
                              title="Accept"
                            >
                              <i className="fas fa-check"></i>
                            </button>
                            <button 
                              onClick={() => handleAcceptPayment(req, 'reject')} 
                              className="w-8 h-8 rounded flex items-center justify-center bg-danger/20 text-danger hover:bg-danger hover:text-white transition-colors"
                              title="Reject"
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                  {requests.length === 0 && (
                    <tr><td colSpan={7} className="px-6 py-8 text-center italic">No {requestFilter} requests found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* USERS VIEW */}
      {activeSection === 'users' && (
        <div className="animate-fade-in">
          <h3 className="text-xl font-bold text-white mb-4">Registered Users</h3>
          <div className="bg-card rounded-xl border border-white/5 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-400">
                <thead className="bg-black/30 text-xs uppercase font-bold text-gray-300">
                  <tr>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Wallet</th>
                    <th className="px-6 py-4">Winnings</th>
                    <th className="px-6 py-4">Matches</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {usersList.map((user) => (
                    <tr key={user.uid} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 font-bold text-white">{user.name}</td>
                      <td className="px-6 py-4">{user.email}</td>
                      <td className="px-6 py-4 text-accent">৳{user.walletBalance}</td>
                      <td className="px-6 py-4 text-success">৳{user.winningsBalance}</td>
                      <td className="px-6 py-4">{user.totalMatches}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                           <button onClick={() => openUserModal(user)} className="text-blue-400 hover:text-blue-300 p-2" title="Edit Balance"><i className="fas fa-edit"></i></button>
                           <button onClick={() => handleDeleteUser(user.uid)} className="text-red-400 hover:text-red-300 p-2" title="Delete User"><i className="fas fa-trash"></i></button>
                         </div>
                      </td>
                    </tr>
                  ))}
                  {usersList.length === 0 && (
                    <tr><td colSpan={6} className="px-6 py-8 text-center italic">No users found or loading...</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS VIEW */}
      {activeSection === 'settings' && appSettings && (
         <div className="animate-fade-in space-y-6">
            <div className="flex justify-between items-center">
               <h3 className="text-xl font-bold text-white">App Configuration</h3>
               <button onClick={handleSaveSettings} disabled={loading} className="bg-gradient-to-r from-primary to-secondary px-6 py-2 rounded-lg font-bold text-white shadow-lg hover:scale-105 transition-transform">
                 {loading ? 'Saving...' : 'Save All Settings'}
               </button>
            </div>

            {/* General Settings */}
            <div className="bg-card rounded-xl p-6 border border-white/5 shadow-lg">
               <h4 className="text-lg font-bold text-primary mb-4 border-b border-white/5 pb-2">General</h4>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormInput label="App Name" value={appSettings.appName} onChange={v => setAppSettings({...appSettings, appName: v})} />
                 <div className="md:col-span-2">
                   <label className="block text-sm font-medium text-gray-400 mb-1">Announcement Text</label>
                   <textarea className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-primary focus:outline-none" value={appSettings.announcementText} onChange={e => setAppSettings({...appSettings, announcementText: e.target.value})} rows={2} />
                 </div>
               </div>
            </div>

            {/* Financial Settings */}
            <div className="bg-card rounded-xl p-6 border border-white/5 shadow-lg">
               <h4 className="text-lg font-bold text-primary mb-4 border-b border-white/5 pb-2">Financials & Limits</h4>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <FormInput label="Min Deposit (৳)" type="number" value={appSettings.minDeposit} onChange={v => setAppSettings({...appSettings, minDeposit: Number(v)})} />
                 <FormInput label="Min Withdrawal (৳)" type="number" value={appSettings.minWithdrawal} onChange={v => setAppSettings({...appSettings, minWithdrawal: Number(v)})} />
                 <FormInput label="Earn Per Ad (৳)" type="number" value={appSettings.earnPerAd} onChange={v => setAppSettings({...appSettings, earnPerAd: Number(v)})} />
                 <FormInput label="Max Free Matches/Day" type="number" value={appSettings.maxFreeMatchesPerDay} onChange={v => setAppSettings({...appSettings, maxFreeMatchesPerDay: Number(v)})} />
                 <FormInput label="Max Earn Ads/Day" type="number" value={appSettings.maxEarnAdsPerDay} onChange={v => setAppSettings({...appSettings, maxEarnAdsPerDay: Number(v)})} />
               </div>
            </div>

            {/* Payment Methods */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-card rounded-xl p-6 border border-white/5 shadow-lg">
                 <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
                   <h4 className="text-lg font-bold text-primary">Deposit Methods</h4>
                   <button onClick={() => handleAddPaymentMethod('deposit')} className="text-xs bg-success/20 text-success px-2 py-1 rounded hover:bg-success hover:text-white">+ Add</button>
                 </div>
                 <div className="space-y-4">
                   {appSettings.depositMethods.map((method, idx) => (
                     <div key={idx} className="bg-black/20 p-3 rounded-lg border border-white/5 space-y-2 relative">
                        <button onClick={() => handleRemovePaymentMethod('deposit', idx)} className="absolute top-2 right-2 text-gray-600 hover:text-red-500"><i className="fas fa-times"></i></button>
                        <div className="grid grid-cols-2 gap-2">
                          <FormInput label="Name" value={method.name} onChange={v => handleUpdatePaymentMethod('deposit', idx, 'name', v)} />
                          <FormInput label="Number" value={method.number} onChange={v => handleUpdatePaymentMethod('deposit', idx, 'number', v)} />
                        </div>
                        <FormInput label="Icon URL" value={method.iconUrl} onChange={v => handleUpdatePaymentMethod('deposit', idx, 'iconUrl', v)} />
                     </div>
                   ))}
                 </div>
              </div>

              <div className="bg-card rounded-xl p-6 border border-white/5 shadow-lg">
                 <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
                   <h4 className="text-lg font-bold text-primary">Withdrawal Methods</h4>
                   <button onClick={() => handleAddPaymentMethod('withdrawal')} className="text-xs bg-success/20 text-success px-2 py-1 rounded hover:bg-success hover:text-white">+ Add</button>
                 </div>
                 <div className="space-y-4">
                   {appSettings.withdrawalMethods.map((method, idx) => (
                     <div key={idx} className="bg-black/20 p-3 rounded-lg border border-white/5 space-y-2 relative">
                        <button onClick={() => handleRemovePaymentMethod('withdrawal', idx)} className="absolute top-2 right-2 text-gray-600 hover:text-red-500"><i className="fas fa-times"></i></button>
                        <div className="grid grid-cols-2 gap-2">
                          <FormInput label="Name" value={method.name} onChange={v => handleUpdatePaymentMethod('withdrawal', idx, 'name', v)} />
                          <FormInput label="Icon URL" value={method.iconUrl} onChange={v => handleUpdatePaymentMethod('withdrawal', idx, 'iconUrl', v)} />
                        </div>
                     </div>
                   ))}
                 </div>
              </div>
            </div>

            {/* Slider Images */}
            <div className="bg-card rounded-xl p-6 border border-white/5 shadow-lg">
               <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
                   <h4 className="text-lg font-bold text-primary">Home Slider Images</h4>
                   <button onClick={handleAddSliderImage} className="text-xs bg-success/20 text-success px-2 py-1 rounded hover:bg-success hover:text-white">+ Add Image</button>
               </div>
               <div className="space-y-3">
                 {appSettings.sliderImages.map((img, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                       <div className="w-10 h-8 bg-gray-700 rounded bg-cover bg-center flex-shrink-0" style={{backgroundImage: `url(${img})`}}></div>
                       <input 
                          type="text" 
                          className="flex-grow bg-black/20 border border-white/10 rounded-lg p-2 text-white text-sm"
                          value={img}
                          onChange={e => handleUpdateSliderImage(idx, e.target.value)}
                          placeholder="Image URL"
                       />
                       <button onClick={() => handleRemoveSliderImage(idx)} className="text-red-500 hover:text-red-400 p-2"><i className="fas fa-trash"></i></button>
                    </div>
                 ))}
               </div>
            </div>

             {/* Legal */}
            <div className="bg-card rounded-xl p-6 border border-white/5 shadow-lg">
               <h4 className="text-lg font-bold text-primary mb-4 border-b border-white/5 pb-2">Legal Pages</h4>
               <div className="space-y-4">
                 <div>
                   <label className="block text-sm font-medium text-gray-400 mb-1">Privacy Policy</label>
                   <textarea className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-primary focus:outline-none h-32" value={appSettings.privacyPolicy} onChange={e => setAppSettings({...appSettings, privacyPolicy: e.target.value})} />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-400 mb-1">Terms & Conditions</label>
                   <textarea className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-primary focus:outline-none h-32" value={appSettings.termsConditions} onChange={e => setAppSettings({...appSettings, termsConditions: e.target.value})} />
                 </div>
               </div>
            </div>
         </div>
      )}

      {/* MATCH MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card w-full max-w-2xl rounded-xl border border-white/10 shadow-2xl my-8">
            <div className="flex justify-between items-center p-6 border-b border-white/10">
              <h3 className="text-xl font-bold text-primary font-orbitron">
                {editingItem ? 'Edit' : 'Add New'} {modalType === 'tournament' ? 'Tournament' : 'Free Match'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white"><i className="fas fa-times text-xl"></i></button>
            </div>
            
            <form onSubmit={handleSaveMatch} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput label="Match Name" value={formData.name} onChange={v => setFormData({...formData, name: v})} required />
                <FormInput label="Image URL" value={formData.imageUrl} onChange={v => setFormData({...formData, imageUrl: v})} />
                
                {modalType === 'tournament' ? (
                  <FormInput label="Entry Fee (৳)" type="number" value={formData.entryFee} onChange={v => setFormData({...formData, entryFee: Number(v)})} required />
                ) : (
                  <FormInput label="Ads Required" type="number" value={formData.adsRequired} onChange={v => setFormData({...formData, adsRequired: Number(v)})} required />
                )}
                
                <FormInput label="Prize Pool (৳)" type="number" value={formData.prizePool || formData.prize} onChange={v => setFormData({...formData, prizePool: Number(v), prize: Number(v)})} required />
                
                <FormInput label="Max Players" type="number" value={formData.maxPlayers} onChange={v => setFormData({...formData, maxPlayers: Number(v)})} required />
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Start Time</label>
                  {/* @ts-ignore */}
                  <input type="datetime-local" className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-primary focus:outline-none" value={formData.startTimeStr} onChange={e => setFormData({...formData, startTimeStr: e.target.value})} required />
                </div>

                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                   <FormInput label="Room ID" value={formData.roomId} onChange={v => setFormData({...formData, roomId: v})} placeholder="Optional until match starts" />
                   <FormInput label="Room Password" value={formData.roomPassword} onChange={v => setFormData({...formData, roomPassword: v})} placeholder="Optional until match starts" />
                </div>
                
                {modalType === 'freeMatch' && (
                  <div className="md:col-span-2">
                     <label className="block text-sm font-medium text-gray-400 mb-1">Ad SDK Code (Optional)</label>
                     <textarea 
                        className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white h-20 focus:border-primary focus:outline-none font-mono text-xs"
                        value={formData.adSdkCode || ''}
                        onChange={e => setFormData({...formData, adSdkCode: e.target.value})}
                        placeholder="Paste specific ad code here..."
                     ></textarea>
                  </div>
                )}
                
                <div className="md:col-span-2">
                   <label className="block text-sm font-medium text-gray-400 mb-1">Status</label>
                   <div className="flex gap-4">
                     {['upcoming', 'live', 'completed', 'archived'].map(s => (
                       <label key={s} className="flex items-center gap-2 cursor-pointer">
                         <input 
                           type="radio" 
                           name="status" 
                           checked={formData.status === s} 
                           onChange={() => setFormData({...formData, status: s as any})} 
                           className="text-primary focus:ring-primary"
                         />
                         <span className="capitalize text-sm">{s}</span>
                       </label>
                     ))}
                   </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 rounded-lg font-bold text-gray-400 hover:bg-white/5">Cancel</button>
                <button type="submit" disabled={loading} className="px-6 py-2 rounded-lg font-bold bg-primary text-white hover:bg-secondary shadow-lg">
                  {loading ? 'Saving...' : 'Save Match'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* USER EDIT MODAL */}
      {showUserModal && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md rounded-xl border border-white/10 shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-white/10">
              <h3 className="text-xl font-bold text-primary font-orbitron">Edit User Balance</h3>
              <button onClick={() => setShowUserModal(false)} className="text-gray-400 hover:text-white"><i className="fas fa-times text-xl"></i></button>
            </div>
            
            <form onSubmit={handleSaveUserBalance} className="p-6 space-y-4">
              <div>
                <p className="text-gray-400 text-sm mb-2">User: <span className="text-white font-bold">{editingUser.name}</span></p>
                <p className="text-gray-400 text-sm mb-4">Email: <span className="text-white">{editingUser.email}</span></p>
              </div>

              <FormInput 
                label="Wallet Balance (৳)" 
                type="number" 
                value={userForm.walletBalance} 
                onChange={v => setUserForm({...userForm, walletBalance: Number(v)})} 
                required 
              />
              
              <FormInput 
                label="Winnings Balance (৳)" 
                type="number" 
                value={userForm.winningsBalance} 
                onChange={v => setUserForm({...userForm, winningsBalance: Number(v)})} 
                required 
              />
              
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowUserModal(false)} className="px-6 py-2 rounded-lg font-bold text-gray-400 hover:bg-white/5">Cancel</button>
                <button type="submit" disabled={loading} className="px-6 py-2 rounded-lg font-bold bg-primary text-white hover:bg-secondary shadow-lg">
                  Update Balance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper Components
const StatCard: React.FC<{ label: string, value: number, icon: string, color: string }> = ({ label, value, icon, color }) => (
  <div className={`bg-card p-4 rounded-xl border border-white/5 shadow-lg flex flex-col items-center text-center hover:-translate-y-1 transition-transform`}>
    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 text-xl ${color}`}>
      <i className={`fas ${icon}`}></i>
    </div>
    <div className="text-2xl font-bold text-white mb-1 font-orbitron">{value}</div>
    <div className="text-xs text-gray-400 uppercase tracking-wider">{label}</div>
  </div>
);

const FormInput: React.FC<{ label: string, value: any, onChange: (val: string) => void, type?: string, required?: boolean, placeholder?: string }> = ({ 
  label, value, onChange, type = "text", required, placeholder 
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-400 mb-1">{label}</label>
    <input 
      type={type} 
      className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:border-primary focus:outline-none transition-colors"
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      required={required}
      placeholder={placeholder}
    />
  </div>
);