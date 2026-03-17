import React from 'react';
import { ShieldCheck, X, Lock, EyeOff, ServerOff, Database } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

interface PrivacyPolicyProps {
  onClose: () => void;
}

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onClose }) => {
  const { t } = useTranslation();

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-[#0A0A0B] overflow-y-auto p-6 md:p-12"
    >
      <div className="max-w-3xl mx-auto space-y-12 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between sticky top-0 bg-[#0A0A0B] py-4 border-b border-white/5 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <ShieldCheck size={24} />
            </div>
            <h1 className="text-2xl font-black tracking-tighter uppercase italic">
              {t('privacyPage.title').split(' ')[0]} <span className="text-emerald-500">{t('privacyPage.title').split(' ')[1]}</span>
            </h1>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/60"
          >
            <X size={24} />
          </button>
        </div>

        {/* Hero Section */}
        <section className="space-y-6">
          <div className="p-8 bg-emerald-500/5 border border-emerald-500/20 rounded-3xl space-y-4">
            <h2 className="text-xl font-bold text-emerald-400">{t('privacyPage.heroTitle')}</h2>
            <p className="text-white/70 leading-relaxed">
              {t('privacyPage.heroDesc')}
            </p>
          </div>
        </section>

        {/* Key Points */}
        <section className="grid md:grid-cols-2 gap-6">
          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-3">
            <div className="text-emerald-500"><ServerOff size={24} /></div>
            <h3 className="font-bold uppercase tracking-wider text-sm">{t('privacyPage.noUploads')}</h3>
            <p className="text-xs text-white/50 leading-relaxed">
              {t('privacyPage.noUploadsDesc')}
            </p>
          </div>
          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-3">
            <div className="text-emerald-500"><Database size={24} /></div>
            <h3 className="font-bold uppercase tracking-wider text-sm">{t('privacyPage.noStorage')}</h3>
            <p className="text-xs text-white/50 leading-relaxed">
              {t('privacyPage.noStorageDesc')}
            </p>
          </div>
          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-3">
            <div className="text-emerald-500"><Lock size={24} /></div>
            <h3 className="font-bold uppercase tracking-wider text-sm">{t('privacyPage.noAccounts')}</h3>
            <p className="text-xs text-white/50 leading-relaxed">
              {t('privacyPage.noAccountsDesc')}
            </p>
          </div>
          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-3">
            <div className="text-emerald-500"><EyeOff size={24} /></div>
            <h3 className="font-bold uppercase tracking-wider text-sm">{t('privacyPage.onDeviceAi')}</h3>
            <p className="text-xs text-white/50 leading-relaxed">
              {t('privacyPage.onDeviceAiDesc')}
            </p>
          </div>
        </section>

        {/* Detailed Policy */}
        <section className="space-y-8 text-white/70">
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">{t('privacyPage.section1Title')}</h2>
            <p className="text-sm leading-relaxed">
              {t('privacyPage.section1Desc')}
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">{t('privacyPage.section2Title')}</h2>
            <p className="text-sm leading-relaxed">
              {t('privacyPage.section2Desc')}
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">{t('privacyPage.section3Title')}</h2>
            <p className="text-sm leading-relaxed">
              {t('privacyPage.section3Desc')}
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">{t('privacyPage.section4Title')}</h2>
            <p className="text-sm leading-relaxed">
              {t('privacyPage.section4Desc')}
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">{t('privacyPage.section5Title')}</h2>
            <p className="text-sm leading-relaxed">
              {t('privacyPage.section5Desc')}
            </p>
          </div>
        </section>

        <footer className="pt-12 border-t border-white/5 text-center">
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/30 font-bold">
            {t('privacyPage.lastUpdated')}
          </p>
        </footer>
      </div>
    </motion.div>
  );
};
