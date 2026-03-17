import React from 'react';
import { TrendingUp, Calendar, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { HistoryItem } from '../hooks/useAnalysisHistory';

interface ProgressTrackingProps {
  currentScore: number;
  previousScan: HistoryItem | null;
}

export const ProgressTracking: React.FC<ProgressTrackingProps> = ({ currentScore, previousScan }) => {
  const { t } = useTranslation();

  if (!previousScan) {
    return (
      <div className="bg-white/5 rounded-3xl border border-white/10 p-5 shadow-xl backdrop-blur-sm relative overflow-hidden group">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={14} className="text-emerald-400" />
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 font-mono">{t('progress.title')}</h3>
        </div>
        
        <div className="space-y-4">
          <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
            <p className="text-[13px] font-bold text-emerald-400 leading-normal mb-1">
              {t('progress.baselineRecorded')}
            </p>
            <p className="text-[11px] text-white/60 leading-relaxed font-medium">
              {t('progress.baselineDesc')}
            </p>
          </div>
          
          <div className="flex items-start gap-3 px-1">
            <div className="mt-0.5 shrink-0">
              <Info size={14} className="text-white/20" />
            </div>
            <p className="text-[10px] text-white/30 leading-normal font-medium italic">
              {t('progress.info')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const diff = currentScore - previousScan.overallScore;
  
  let feedback = "";
  if (diff >= 5) {
    feedback = t('progress.feedback.noticeable');
  } else if (diff >= 2) {
    feedback = t('progress.feedback.slight');
  } else if (diff <= -2) {
    feedback = t('progress.feedback.slight');
  } else {
    feedback = t('progress.feedback.similar');
  }

  return (
    <div className="bg-white/5 rounded-3xl border border-white/10 p-5 shadow-xl backdrop-blur-sm relative overflow-hidden group">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={14} className="text-emerald-400" />
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 font-mono">{t('progress.title')}</h3>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white/5 rounded-2xl p-3 border border-white/5 text-center">
          <div className="text-[8px] font-black text-white/40 uppercase tracking-tighter mb-1">{t('progress.previousScan')}</div>
          <div className="text-xl font-black text-white italic">{previousScan.overallScore}</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-3 border border-white/5 text-center">
          <div className="text-[8px] font-black text-white/40 uppercase tracking-tighter mb-1">{t('progress.currentScan')}</div>
          <div className="text-xl font-black text-white italic">{currentScore}</div>
        </div>
        <div className={
          `rounded-2xl p-3 border text-center flex flex-col justify-center
          ${diff > 0 ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-white/5 border-white/10'}`
        }>
          <div className="text-[8px] font-black text-white/40 uppercase tracking-tighter mb-1">{t('progress.scoreChange')}</div>
          <div className={`text-sm font-black italic ${diff > 0 ? 'text-emerald-400' : 'text-white/60'}`}>
            {diff > 0 ? `+${diff}` : diff} {diff > 0 ? t('progress.improvement') : ''}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
          <p className="text-[12px] font-bold text-emerald-400 leading-normal">
            {feedback}
          </p>
        </div>
        <p className="text-[10px] text-white/40 text-center font-medium">
          {t('progress.tryAgain')}
        </p>
      </div>
    </div>
  );
};
