import React from 'react';
import { ShieldCheck, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PrivacyNoteProps {
  onOpenPolicy: () => void;
}

export const PrivacyNote: React.FC<PrivacyNoteProps> = ({ onOpenPolicy }) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center gap-4 mt-8">
      <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/5 border border-emerald-500/10 rounded-full backdrop-blur-sm">
        <ShieldCheck size={14} className="text-emerald-500" />
        <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">
          🔒 {t('privacy.onDevice')}
        </p>
      </div>
      <button 
        type="button"
        onClick={onOpenPolicy}
        className="flex items-center gap-1.5 text-[10px] text-white/30 hover:text-white/50 transition-colors font-bold uppercase tracking-widest"
      >
        <Info size={12} />
        {t('privacy.viewPolicy')}
      </button>
    </div>
  );
};
