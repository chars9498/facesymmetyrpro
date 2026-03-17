import React from 'react';
import { motion } from 'motion/react';
import { Shield, Lock, Eye, ServerOff, UserCheck, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function PrivacyPolicy() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[#3BFF9C]/30 py-20 px-6">
      <div className="max-w-3xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-12"
        >
          <header className="space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
              <Shield className="text-emerald-400" size={32} />
            </div>
            <h1 className="text-4xl font-black italic tracking-tighter uppercase">{t('pages.privacy.title')}</h1>
            <p className="text-white/40 font-bold uppercase tracking-[0.2em]">{t('pages.privacy.lastUpdated')}</p>
          </header>

          <section className="prose prose-invert prose-emerald max-w-none space-y-8">
            <div className="bg-white/5 rounded-[2rem] border border-white/10 p-8 space-y-6">
              <div className="flex items-center gap-4">
                <ServerOff className="text-emerald-400" size={24} />
                <h2 className="text-xl font-black uppercase tracking-tight m-0">{t('pages.privacy.zeroStorageTitle')}</h2>
              </div>
              <p className="text-white/70 leading-relaxed">
                {t('pages.privacy.zeroStorageDesc')}
              </p>
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl font-black uppercase tracking-tight">{t('pages.privacy.noCollectTitle')}</h2>
              <p className="text-white/70 leading-relaxed">
                {t('pages.privacy.noCollectDesc')}
              </p>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 list-none p-0">
                {[
                  { icon: <Eye size={18} />, text: t('pages.privacy.noImages') },
                  { icon: <Lock size={18} />, text: t('pages.privacy.noBiometrics') },
                  { icon: <UserCheck size={18} />, text: t('pages.privacy.noIdentity') },
                  { icon: <FileText size={18} />, text: t('pages.privacy.noAccount') }
                ].map((item, i) => (
                  <li key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-3 text-sm font-bold text-white/80">
                    <span className="text-emerald-400">{item.icon}</span>
                    {item.text}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl font-black uppercase tracking-tight">{t('pages.privacy.localProcessingTitle')}</h2>
              <p className="text-white/70 leading-relaxed">
                {t('pages.privacy.localProcessingDesc')}
              </p>
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl font-black uppercase tracking-tight">{t('pages.privacy.analyticsTitle')}</h2>
              <p className="text-white/70 leading-relaxed">
                {t('pages.privacy.analyticsDesc')}
              </p>
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl font-black uppercase tracking-tight">{t('pages.privacy.thirdPartyTitle')}</h2>
              <p className="text-white/70 leading-relaxed">
                {t('pages.privacy.thirdPartyDesc')}
              </p>
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl font-black uppercase tracking-tight">{t('pages.privacy.userControlTitle')}</h2>
              <p className="text-white/70 leading-relaxed">
                {t('pages.privacy.userControlDesc')}
              </p>
            </div>

            <div className="pt-12 border-t border-white/10">
              <p className="text-white/40 text-sm">
                {t('pages.privacy.footerNote')}
              </p>
            </div>
          </section>
        </motion.div>
      </div>
    </div>
  );
}
