import React, { useState, useEffect } from 'react';
import { AppSettings, Tournament, Page } from '../types';
import { TournamentCard } from './Tournaments';

interface HomeProps {
  settings: AppSettings;
  tournaments: Tournament[];
  freeMatches: Tournament[];
  joinedTournaments: string[];
  joinedFreeMatches: string[];
  onJoinPaid: (id: string, fee: number) => void;
  onJoinFree: (id: string, ads: number) => void;
  onChangePage: (page: Page) => void;
}

export const Home: React.FC<HomeProps> = ({ 
  settings, tournaments, freeMatches, joinedTournaments, joinedFreeMatches, onJoinPaid, onJoinFree, onChangePage 
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      if (settings.sliderImages.length > 0) {
        setCurrentSlide(prev => (prev + 1) % settings.sliderImages.length);
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [settings.sliderImages]);

  // Combine and sort for featured
  const featured = [
    ...freeMatches.slice(0, 2),
    ...tournaments.slice(0, 1)
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Slider */}
      <div className="relative h-48 md:h-64 rounded-xl overflow-hidden shadow-2xl bg-card group">
        {settings.sliderImages.length > 0 ? (
           settings.sliderImages.map((img, idx) => (
            <img 
              key={idx}
              src={img} 
              alt="Slide" 
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${idx === currentSlide ? 'opacity-100' : 'opacity-0'}`}
            />
           ))
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-card text-gray-600">No Images</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-dark/80 to-transparent"></div>
      </div>

      {/* Announcement */}
      <div className="bg-card border-l-4 border-accent p-4 rounded-r-lg shadow-lg relative overflow-hidden">
        <div className="whitespace-nowrap animate-[marquee_20s_linear_infinite] text-accent font-bold text-lg">
          {settings.announcementText}
        </div>
      </div>

      {/* Featured Matches */}
      <section>
        <div className="flex justify-between items-end mb-4">
          <h2 className="text-2xl font-bold font-orbitron text-primary">Featured Matches</h2>
          <button onClick={() => onChangePage('tournaments')} className="text-sm text-gray-400 hover:text-white">View All</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featured.map(match => (
             <TournamentCard 
                key={match.id} 
                match={match} 
                isJoined={joinedTournaments.includes(match.id) || joinedFreeMatches.includes(match.id)}
                onJoinPaid={onJoinPaid}
                onJoinFree={onJoinFree}
             />
          ))}
          {featured.length === 0 && <div className="text-gray-500 italic">No matches available.</div>}
        </div>
      </section>
      
      {/* All Matches Preview */}
       <section>
        <h2 className="text-2xl font-bold font-orbitron text-primary mb-4">Latest Free Matches</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {freeMatches.slice(0, 6).map(match => (
             <TournamentCard 
                key={match.id} 
                match={match} 
                isJoined={joinedFreeMatches.includes(match.id)}
                onJoinPaid={onJoinPaid}
                onJoinFree={onJoinFree}
             />
          ))}
        </div>
      </section>
    </div>
  );
};