import React, { useState, useEffect } from 'react';
import { Tournament } from '../types';

interface TournamentsProps {
  tournaments: Tournament[];
  joinedIds: string[];
  onJoinPaid: (id: string, fee: number) => void;
  onJoinFree: (id: string, ads: number) => void;
}

export const Tournaments: React.FC<TournamentsProps> = ({ tournaments, joinedIds, onJoinPaid, onJoinFree }) => {
  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-bold font-orbitron text-primary mb-6">All Tournaments & Free Matches</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tournaments.map(match => (
          <TournamentCard 
            key={match.id} 
            match={match} 
            isJoined={joinedIds.includes(match.id)}
            onJoinPaid={onJoinPaid}
            onJoinFree={onJoinFree}
          />
        ))}
        {tournaments.length === 0 && <div className="text-gray-500 italic">No tournaments found.</div>}
      </div>
    </div>
  );
};

export const TournamentCard: React.FC<{ 
  match: Tournament; 
  isJoined: boolean;
  onJoinPaid: (id: string, fee: number) => void;
  onJoinFree: (id: string, ads: number) => void;
}> = ({ match, isJoined, onJoinPaid, onJoinFree }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [showRoom, setShowRoom] = useState(false);

  useEffect(() => {
    if (!match.matchStartTime) return;
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const start = match.matchStartTime.seconds * 1000;
      const diff = start - now;

      if (diff < 0) {
        setTimeLeft('Started');
        return;
      }
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimeLeft(`${d}d ${h}h ${m}m`);
    }, 1000);
    return () => clearInterval(interval);
  }, [match.matchStartTime]);

  const isFull = match.joinedPlayers >= match.maxPlayers;
  const isFree = match.entryFee === 0;

  return (
    <>
      <div className="bg-gradient-to-br from-card to-slate-900 rounded-xl overflow-hidden shadow-xl border border-white/5 hover:-translate-y-1 transition-transform duration-300 flex flex-col">
        <div 
          className="h-40 bg-cover bg-center relative flex items-center justify-center bg-gray-800"
          style={{ backgroundImage: `url(${match.imageUrl || ''})` }}
        >
          {!match.imageUrl && <i className="fas fa-gamepad text-6xl text-white/20"></i>}
          {isFree && (
            <div className="absolute top-2 left-2 flex gap-1">
              <span className="bg-success/90 text-white text-xs font-bold px-2 py-1 rounded">FREE</span>
              {match.adsRequired && <span className="bg-warning/90 text-black text-xs font-bold px-2 py-1 rounded">{match.adsRequired} ADS</span>}
            </div>
          )}
        </div>
        
        <div className="p-4 flex-grow flex flex-col">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-bold text-lg leading-tight line-clamp-2">{match.name}</h3>
            {timeLeft && (
              <div className="text-right">
                <div className="text-xs text-gray-400">Starts in</div>
                <div className="text-warning font-bold text-sm whitespace-nowrap">{timeLeft}</div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 py-3 border-y border-white/5 mb-4">
             <div className="text-center">
               <div className="text-xs text-gray-500">Prize</div>
               <div className="font-bold text-accent">৳{match.prizePool || match.prize || 0}</div>
             </div>
             <div className="text-center border-x border-white/5">
               <div className="text-xs text-gray-500">Fee</div>
               <div className="font-bold text-accent">{isFree ? 'FREE' : `৳${match.entryFee}`}</div>
             </div>
             <div className="text-center">
               <div className="text-xs text-gray-500">Players</div>
               <div className="font-bold text-accent">{match.joinedPlayers}/{match.maxPlayers}</div>
             </div>
          </div>

          <div className="mt-auto">
            {isJoined ? (
               <button 
                  onClick={() => setShowRoom(true)}
                  className="w-full bg-success hover:bg-emerald-600 text-white font-bold py-2.5 rounded-lg transition-colors"
                >
                  Room Details
                </button>
            ) : isFull ? (
                <button disabled className="w-full bg-gray-600 text-gray-300 font-bold py-2.5 rounded-lg cursor-not-allowed">
                  Full
                </button>
            ) : (
                <button 
                  onClick={() => isFree ? onJoinFree(match.id, match.adsRequired || 1) : onJoinPaid(match.id, match.entryFee)}
                  className={`w-full font-bold py-2.5 rounded-lg transition-colors text-white shadow-lg ${isFree ? 'bg-warning hover:bg-amber-600 text-black' : 'bg-gradient-to-r from-primary to-secondary hover:opacity-90'}`}
                >
                  {isFree ? `Watch ${match.adsRequired || 1} Ads to Join` : `Join (৳${match.entryFee})`}
                </button>
            )}
          </div>
        </div>
      </div>

      {/* Room Details Modal */}
      {showRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-card rounded-xl p-6 w-full max-w-sm border border-primary/30 shadow-2xl relative">
            <button onClick={() => setShowRoom(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
              <i className="fas fa-times text-xl"></i>
            </button>
            <h3 className="text-xl font-bold text-primary mb-4 font-orbitron">Room Details</h3>
            <div className="space-y-3 bg-black/20 p-4 rounded-lg">
              <p><span className="text-gray-400">Match:</span> <span className="font-bold">{match.name}</span></p>
              <p><span className="text-gray-400">Room ID:</span> <span className="text-accent font-mono text-lg select-all">{match.roomId || 'Wait for update'}</span></p>
              <p><span className="text-gray-400">Password:</span> <span className="text-accent font-mono text-lg select-all">{match.roomPassword || 'Wait for update'}</span></p>
              <p className="text-xs text-gray-500 mt-2 border-t border-white/10 pt-2">
                Room details are usually updated 15 minutes before match start.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};