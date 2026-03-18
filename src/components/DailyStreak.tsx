import React from 'react';
import { Flame, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface DailyStreakProps {
  streak: number;
  lastScanDate: string;
}

export const DailyStreak: React.FC<DailyStreakProps> = ({ streak, lastScanDate }) => {
  const { t } = useTranslation();
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const isAlreadyScannedToday = lastScanDate === today;

  if (streak === 0) return null;

  return (
    <div className="bg-white/5 rounded-3xl border border-white/10 p-5 shadow-xl backdrop-blur-sm relative overflow-hidden group">
      <div className="flex items-center gap-2 mb-3">
        <Flame size={14} className="text-orange-500" />
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 font-mono">{t('streak.title')}</h3>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black italic tracking-tighter text-white">{streak}</span>
          <span className="text-[11px] font-bold text-white/60 uppercase tracking-widest">
            {t('streak.days', { count: streak })}
          </span>
          <span className="text-xl">🔥</span>
        </div>
        
        {isAlreadyScannedToday && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
            <CheckCircle2 size={10} className="text-emerald-400" />
            <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">{t('streak.completed')}</span>
          </div>
        )}
      </div>

      {isAlreadyScannedToday && (
        <p className="mt-3 text-[9px] font-medium text-white/30 italic leading-tight">
          {t('streak.comeBack')}
        </p>
      )}
    </div>
  );
};
