import React from 'react';
import { motion } from 'motion/react';
import { Zap, Sparkles, Scan, BarChart3, ShieldCheck, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function HowItWorks() {
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
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
              <Zap className="text-indigo-400" size={32} />
            </div>
            <h1 className="text-4xl font-black italic tracking-tighter uppercase">{t('howItWorks.title')}</h1>
            <p className="text-white/40 font-bold uppercase tracking-[0.2em]">{t('howItWorks.subtitle')}</p>
          </header>

          <section className="prose prose-invert prose-indigo max-w-none space-y-8">
            <div className="bg-white/5 rounded-[2rem] border border-white/10 p-8 space-y-6">
              <div className="flex items-center gap-4">
                <Sparkles className="text-indigo-400" size={24} />
                <h2 className="text-xl font-black uppercase tracking-tight m-0">{t('howItWorks.whatIsTitle')}</h2>
              </div>
              <p className="text-white/70 leading-relaxed">
                {t('howItWorks.whatIsDesc')}
              </p>
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl font-black uppercase tracking-tight">{t('howItWorks.step1Title')}</h2>
              <p className="text-white/70 leading-relaxed">
                {t('howItWorks.step1Desc')}
              </p>
              <div className="p-6 bg-white/5 border border-white/10 rounded-2xl flex items-start gap-4">
                <Scan className="text-indigo-400 shrink-0 mt-1" size={20} />
                <p className="text-sm text-white/60 leading-relaxed">
                  {t('howItWorks.step1Note')}
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl font-black uppercase tracking-tight">{t('howItWorks.step2Title')}</h2>
              <p className="text-white/70 leading-relaxed">
                {t('howItWorks.step2Desc')}
              </p>
              <p className="text-white/70 leading-relaxed">
                {t('howItWorks.step2Note')}
              </p>
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl font-black uppercase tracking-tight">{t('howItWorks.step3Title')}</h2>
              <p className="text-white/70 leading-relaxed">
                {t('howItWorks.step3Desc')}
              </p>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 list-none p-0">
                {[
                  { label: t('howItWorks.lighting'), desc: t('howItWorks.lightingDesc') },
                  { label: t('howItWorks.angle'), desc: t('howItWorks.angleDesc') },
                  { label: t('howItWorks.expression'), desc: t('howItWorks.expressionDesc') },
                  { label: t('howItWorks.distance'), desc: t('howItWorks.distanceDesc') }
                ].map((item, i) => (
                  <li key={i} className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-2">
                    <div className="text-xs font-black text-indigo-400 uppercase tracking-widest">{item.label}</div>
                    <p className="text-xs text-white/60 leading-relaxed">{item.desc}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl font-black uppercase tracking-tight">{t('howItWorks.step4Title')}</h2>
              <div className="p-8 bg-indigo-500/10 border border-indigo-500/20 rounded-[2rem] space-y-4">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="text-indigo-400" size={24} />
                  <h3 className="text-lg font-black uppercase tracking-tight m-0">{t('howItWorks.step4PrivacyTitle')}</h3>
                </div>
                <p className="text-white/70 leading-relaxed m-0">
                  {t('howItWorks.step4PrivacyDesc')}
                </p>
              </div>
            </div>

            <div className="pt-12 border-t border-white/10 flex items-start gap-4">
              <Info className="text-white/20 shrink-0 mt-1" size={20} />
              <p className="text-white/40 text-sm leading-relaxed">
                {t('howItWorks.footerNote')}
              </p>
            </div>
          </section>
        </motion.div>
      </div>
    </div>
  );
}
