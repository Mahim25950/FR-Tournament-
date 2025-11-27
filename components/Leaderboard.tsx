import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { User } from '../types';

type FilterType = 'matches' | 'winnings' | 'tournaments';

export const Leaderboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filter, setFilter] = useState<FilterType>('matches');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        let q;
        if (filter === 'winnings') {
          q = query(collection(db, 'users'), orderBy('winningsBalance', 'desc'), limit(50));
        } else if (filter === 'tournaments') {
           // Firestore doesn't easily sort by array length. We'll fetch by totalMatches as proxy then sort client side for better accuracy if needed, 
           // or just stick to totalMatches which is robust
           q = query(collection(db, 'users'), orderBy('totalMatches', 'desc'), limit(50));
        } else {
          q = query(collection(db, 'users'), orderBy('totalMatches', 'desc'), limit(50));
        }

        const snapshot = await getDocs(q);
        const list = snapshot.docs.map(d => ({ uid: d.id, ...d.data() } as User));
        
        // Client side sort refinement for tournaments count
        if (filter === 'tournaments') {
            list.sort((a,b) => (b.joinedTournaments?.length || 0) - (a.joinedTournaments?.length || 0));
        }

        setUsers(list);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [filter]);

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="bg-card rounded-xl p-6 shadow-xl border border-white/5">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h2 className="text-2xl font-bold font-orbitron text-primary">Top Players</h2>
          <div className="flex bg-dark rounded-lg p-1">
            {(['matches', 'winnings', 'tournaments'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded text-sm font-bold capitalize transition-colors ${filter === f ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-10 text-gray-500">Loading leaderboard...</div>
        ) : (
          <div className="space-y-3">
            {users.map((user, index) => {
              let rankColor = 'bg-gray-700 text-gray-300';
              if (index === 0) rankColor = 'bg-yellow-400 text-black';
              if (index === 1) rankColor = 'bg-gray-300 text-black';
              if (index === 2) rankColor = 'bg-amber-600 text-black';

              const displayValue = filter === 'winnings' ? `৳${user.winningsBalance}` : (filter === 'tournaments' ? (user.joinedTournaments?.length || 0) : user.totalMatches);

              return (
                <div key={user.uid} className="flex items-center bg-white/5 p-3 rounded-lg hover:bg-white/10 transition-colors">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mr-4 ${rankColor}`}>
                    {index + 1}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-bold text-white mr-4">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-grow">
                    <div className="font-bold">{user.name}</div>
                    <div className="text-xs text-gray-400">Rank #{index + 1}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-accent text-lg">{displayValue}</div>
                    <div className="text-xs text-gray-500 capitalize">{filter}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};