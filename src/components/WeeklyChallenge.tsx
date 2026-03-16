import React from 'react';
import { Trophy, Calendar, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

interface WeeklyChallengeProps {
  scans: number;
}

export const WeeklyChallenge: React.FC<WeeklyChallengeProps> = ({ scans }) => {
  const isComplete = scans >= 3;

  return (
    <div className="bg-white/5 rounded-3xl border border-white/10 p-5 shadow-xl backdrop-blur-sm relative overflow-hidden group">
      <div className="flex items-center gap-2 mb-4">
        <Trophy size={14} className={isComplete ? "text-yellow-400" : "text-emerald-400"} />
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 font-mono">Weekly Face Balance Challenge</h3>
      </div>

      {isComplete ? (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 flex items-center gap-3">
            <CheckCircle2 className="text-emerald-400 shrink-0" size={20} />
            <div>
              <p className="text-[13px] font-bold text-white leading-tight">Challenge Complete 🎉</p>
              <p className="text-[11px] text-emerald-400/80 font-medium">Challenge complete. Great job tracking your facial balance this week.</p>
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="space-y-4">
          <p className="text-[11px] text-white/60 leading-relaxed font-medium">
            Complete 3 scans this week to track how your facial balance changes.
          </p>

          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Progress</span>
              <span className="text-xs font-black text-white italic">{scans} / 3 scans completed</span>
            </div>
            
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(scans / 3) * 100}%` }}
                className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400"
              />
            </div>
            
            <p className="text-[9px] font-bold text-emerald-400/60 uppercase tracking-wider">
              {scans === 1 ? "2 more scans to complete this week's challenge." : 
               scans === 2 ? "1 more scan to complete this week's challenge." : ""}
            </p>
          </div>

          <div className="flex items-center gap-2 px-1">
            <Calendar size={12} className="text-white/20" />
            <p className="text-[10px] text-white/30 font-medium italic">
              Next scan recommended in a few days.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
