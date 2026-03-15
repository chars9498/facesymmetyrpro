import React from 'react';
import { Lock, CreditCard, Check } from 'lucide-react';

interface UnlockAnalysisProps {
  onUnlock: () => void;
}

export const UnlockAnalysis: React.FC<UnlockAnalysisProps> = ({ onUnlock }) => {
  return (
    <div className="flex flex-col items-center text-center space-y-6 py-8">
      <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center border border-indigo-500/20 shadow-[0_0_30px_rgba(99,102,241,0.1)]">
        <Lock size={40} className="text-indigo-400" />
      </div>
      
      <div className="space-y-2">
        <h2 className="text-2xl font-black italic tracking-tighter uppercase">Daily Limit Reached</h2>
        <p className="text-white/60 text-sm font-medium max-w-xs mx-auto leading-relaxed">
          You've used your 2 free daily analyses. Unlock unlimited access to continue.
        </p>
      </div>

      <div className="w-full max-w-xs space-y-3">
        <div className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-2">
          {['Unlimited daily analyses', 'Full symmetry breakdown', 'Symmetry twin simulation'].map((benefit, i) => (
            <div key={i} className="flex items-center gap-2">
              <Check size={14} className="text-emerald-400" />
              <span className="text-[11px] text-white/70 font-medium">{benefit}</span>
            </div>
          ))}
        </div>

        <button 
          onClick={onUnlock}
          className="w-full bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 transition-all active:scale-95 shadow-[0_0_30px_rgba(99,102,241,0.3)]"
        >
          <CreditCard size={18} />
          Unlock Pro – $2.99
        </button>
      </div>
    </div>
  );
};
