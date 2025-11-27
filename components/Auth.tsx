import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

export const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'users', cred.user.uid), {
          name,
          email,
          walletBalance: 0,
          winningsBalance: 0,
          joinedTournaments: [],
          joinedFreeMatches: [],
          totalMatches: 0,
          adsWatchedToday: 0,
          earnAdsWatchedToday: 0
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-dark p-4">
      <div className="w-full max-w-md bg-gradient-to-br from-card to-slate-900 rounded-xl p-8 shadow-2xl border border-primary/20">
        <h1 className="text-3xl font-bold mb-6 text-center text-primary font-orbitron">Gaming Portal</h1>
        
        <div className="flex mb-6 bg-primary/10 rounded-lg overflow-hidden">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-3 text-sm font-bold transition-all ${isLogin ? 'bg-primary text-white' : 'text-gray-400 hover:bg-primary/20'}`}
          >
            LOGIN
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-3 text-sm font-bold transition-all ${!isLogin ? 'bg-primary text-white' : 'text-gray-400 hover:bg-primary/20'}`}
          >
            REGISTER
          </button>
        </div>

        {error && <div className="bg-red-500/10 border-l-4 border-red-500 text-red-500 p-3 mb-4 text-sm rounded">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-300">Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white/5 border border-primary/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary focus:bg-primary/10 transition-colors"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-primary/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary focus:bg-primary/10 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-primary/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary focus:bg-primary/10 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-primary to-secondary py-3.5 rounded-lg font-bold text-lg text-white shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : (isLogin ? 'Login' : 'Register')}
          </button>
        </form>
      </div>
    </div>
  );
};