import React, { useState, useEffect, useRef } from 'react';
import { AdType } from '../types';

interface AdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  adType: AdType;
  requiredAds?: number; // Only for tournament joining
  currentAdIndex?: number; // Only for tournament joining
  rewardAmount?: number; // Only for Earn Ads
}

export const AdModal: React.FC<AdModalProps> = ({ isOpen, onClose, onComplete, adType, requiredAds = 1, currentAdIndex = 0, rewardAmount = 0 }) => {
  const [status, setStatus] = useState<'loading' | 'simulating' | 'complete'>('loading');
  const [countdown, setCountdown] = useState(5);
  const [progress, setProgress] = useState(0);
  const simulationIntervalRef = useRef<any>(null);
  const checkSdkTimeoutRef = useRef<any>(null);

  useEffect(() => {
    if (isOpen) {
      setStatus('loading');
      setCountdown(5);
      setProgress(0);
      startAdProcess();
    }
    return () => {
      clearSimulation();
      if (checkSdkTimeoutRef.current) clearTimeout(checkSdkTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currentAdIndex]); // Restart when index changes (next ad)

  const clearSimulation = () => {
    if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
  };

  const startAdProcess = () => {
    let attempts = 0;
    const maxAttempts = 10; // Try for 5 seconds (10 * 500ms)

    const checkAndShowAd = () => {
      // Check if SDK function exists on window
      if (typeof window.show_9299851 === 'function') {
        window.show_9299851()
          .then(() => {
            setStatus('complete');
          })
          .catch((err: any) => {
            console.warn("Ad SDK failed, falling back to simulation", err);
            startSimulation();
          });
      } else {
        attempts++;
        if (attempts < maxAttempts) {
          // Retry after 500ms
          checkSdkTimeoutRef.current = setTimeout(checkAndShowAd, 500);
        } else {
          // SDK not found or loaded after retries, simulate
          console.warn("Ad SDK not loaded, falling back to simulation");
          startSimulation();
        }
      }
    };

    checkAndShowAd();
  };

  const startSimulation = () => {
    setStatus('simulating');
    setCountdown(5);
    setProgress(0);
    
    let timeLeft = 5;
    simulationIntervalRef.current = setInterval(() => {
      timeLeft -= 1;
      setCountdown(timeLeft);
      setProgress(((5 - timeLeft) / 5) * 100);

      if (timeLeft <= 0) {
        clearSimulation();
        setStatus('complete');
      }
    }, 1000);
  };

  if (!isOpen) return null;

  const isMultiAd = requiredAds > 1;
  const isEarnAd = adType.startsWith('earn');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-11/12 max-w-md bg-gradient-to-br from-card to-slate-900 rounded-xl p-6 shadow-2xl border border-primary/30 relative">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-primary font-orbitron">
            {isEarnAd ? 'Watch to Earn' : 'Watch to Join'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <i className="fas fa-times text-2xl"></i>
          </button>
        </div>

        <div className="text-center">
          {isEarnAd ? (
            <p className="mb-4 text-gray-300">Watch this ad to earn <span className="text-accent font-bold">৳{rewardAmount}</span></p>
          ) : (
            <p className="mb-4 text-gray-300">
              {isMultiAd ? `Ad ${currentAdIndex + 1} of ${requiredAds}` : 'Watch ad to join match'}
            </p>
          )}

          <div className="bg-black/40 rounded-lg p-6 min-h-[200px] flex flex-col items-center justify-center border border-white/5">
            {status === 'loading' && (
              <>
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gray-400 animate-pulse">Loading Ad...</p>
              </>
            )}

            {status === 'simulating' && (
              <>
                <p className="text-lg font-bold mb-2">Ad Playing...</p>
                <div className="text-4xl font-bold text-accent mb-4">{countdown}</div>
                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-1000 ease-linear"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </>
            )}

            {status === 'complete' && (
              <div className="flex flex-col items-center animate-bounce-in">
                <i className="fas fa-check-circle text-5xl text-success mb-3"></i>
                <p className="text-xl font-bold text-success">Ad Complete!</p>
              </div>
            )}
          </div>

          {status === 'complete' && (
            <button
              onClick={onComplete}
              className="mt-6 w-full bg-gradient-to-r from-success to-emerald-600 py-3 rounded-lg font-bold text-white shadow-lg hover:scale-[1.02] transition-transform"
            >
              {isEarnAd ? 'Collect Reward' : (currentAdIndex + 1 < requiredAds ? 'Watch Next Ad' : 'Join Match Now')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};