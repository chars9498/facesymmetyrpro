import React, { useState } from 'react';
import { Lock, Play, Crown, Loader2 } from 'lucide-react';
import { watchAdToUnlock } from '../services/adUnlock';

interface UnlockAnalysisProps {
  onUnlock: () => void;
}

export const UnlockAnalysis: React.FC<UnlockAnalysisProps> = ({ onUnlock }) => {
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(5);

  const handleWatchAd = async () => {
    setIsWatchingAd(true);
    await watchAdToUnlock((timeLeft) => {
      setSecondsLeft(timeLeft);
    });
    setIsWatchingAd(false);
    onUnlock();
  };

  return (
    <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center space-y-6 max-w-md mx-auto">
      <div className="flex flex-col items-center gap-3">
        <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center">
          <Lock className="text-emerald-500" size={32} />
        </div>
        <p className="text-[10px] text-emerald-500/60 font-bold uppercase tracking-widest">
          Watching a short ad helps support the app.
        </p>
      </div>
      
      <div className="space-y-2">
        <h2 className="text-2xl font-black italic tracking-tighter text-white uppercase">
          Detailed Analysis Locked 🔒
        </h2>
        <p className="text-white/60 text-sm leading-relaxed">
          You've used your free daily analysis. Unlock another one instantly by watching a short ad or upgrading to Pro.
        </p>
      </div>

      <div className="grid gap-3">
        <button
          type="button"
          onClick={handleWatchAd}
          disabled={isWatchingAd}
          className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-black font-black uppercase tracking-widest py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95"
        >
          {isWatchingAd ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Watching Ad ({secondsLeft}s)...
            </>
          ) : (
            <>
              <Play size={20} fill="currentColor" />
              Watch Ad to Unlock
            </>
          )}
        </button>

        <button
          type="button"
          className="w-full bg-white/5 border border-white/10 hover:bg-white/10 text-white font-black uppercase tracking-widest py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95"
        >
          <Crown className="text-yellow-400" size={20} fill="currentColor" />
          Upgrade to Pro
        </button>
      </div>

      <p className="text-[10px] text-white/30 uppercase tracking-widest">
        Pro users get unlimited analysis & no ads
      </p>
    </div>
  );
};
