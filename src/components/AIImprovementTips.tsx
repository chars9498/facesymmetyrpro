import React from 'react';
import { Lightbulb, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { type AnalysisResult } from '../services/analysisEngine';

interface AIImprovementTipsProps {
  result: AnalysisResult;
}

export const AIImprovementTips: React.FC<AIImprovementTipsProps> = ({ result }) => {
  const { t } = useTranslation();

  // Find the lowest scoring component among the specified ones
  const targetKeys = ['eyes', 'brows', 'mouth', 'jawline'];
  
  let lowestKey = 'eyes';
  let lowestScore = 101;

  targetKeys.forEach(key => {
    const score = result.landmarks?.[key]?.score;
    if (score !== undefined && score < lowestScore) {
      lowestScore = score;
      lowestKey = key;
    }
  });

  const label = t(`tips.mapping.${lowestKey}.label`);
  const tip = t(`tips.mapping.${lowestKey}.tip`);

  return (
    <div className="bg-white/5 rounded-3xl border border-white/10 p-5 shadow-xl backdrop-blur-sm relative overflow-hidden group">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb size={14} className="text-emerald-400" />
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 font-mono">{t('tips.title')}</h3>
      </div>

      <div className="space-y-4">
        <div>
          <div className="text-[8px] font-black text-white/40 uppercase tracking-tighter mb-1">{t('tips.focusArea')}</div>
          <div className="text-sm font-black text-white italic uppercase tracking-tight">{label}</div>
        </div>

        <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
          <p className="text-[11px] text-white/80 leading-relaxed font-medium">
            {tip}
          </p>
        </div>

        <div className="flex items-center gap-2 text-[9px] font-bold text-emerald-400/60 uppercase tracking-widest">
          <span>{t('tips.rescan')}</span>
          <ArrowRight size={10} />
        </div>
      </div>
    </div>
  );
};
