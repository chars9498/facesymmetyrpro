import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Trophy, Zap, Check, AlertCircle, Info, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function FaceSymmetryGuide() {
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
              <Trophy className="text-emerald-400" size={32} />
            </div>
            <h1 className="text-4xl font-black italic tracking-tighter uppercase">{t('guide.title')}</h1>
            <p className="text-white/40 font-bold uppercase tracking-[0.2em]">{t('guide.subtitle')}</p>
          </header>

          <section className="prose prose-invert prose-emerald max-w-none space-y-8">
            <div className="bg-white/5 rounded-[2rem] border border-white/10 p-8 space-y-6">
              <div className="flex items-center gap-4">
                <Sparkles className="text-emerald-400" size={24} />
                <h2 className="text-xl font-black uppercase tracking-tight m-0">{t('guide.whatIsTitle')}</h2>
              </div>
              <p className="text-white/70 leading-relaxed">
                {t('guide.whatIsDesc')}
              </p>
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl font-black uppercase tracking-tight">{t('guide.curiosityTitle')}</h2>
              <p className="text-white/70 leading-relaxed">
                {t('guide.curiosityDesc')}
              </p>
              <div className="p-6 bg-white/5 border border-white/10 rounded-2xl flex items-start gap-4">
                <User className="text-emerald-400 shrink-0 mt-1" size={20} />
                <p className="text-sm text-white/60 leading-relaxed">
                  {t('guide.curiosityNote')}
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl font-black uppercase tracking-tight">{t('guide.mythsTitle')}</h2>
              <p className="text-white/70 leading-relaxed">
                {t('guide.mythsDesc')}
              </p>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 list-none p-0">
                {[
                  { label: t('guide.myth1'), desc: t('guide.myth1Desc') },
                  { label: t('guide.myth2'), desc: t('guide.myth2Desc') },
                  { label: t('guide.myth3'), desc: t('guide.myth3Desc') },
                  { label: t('guide.myth4'), desc: t('guide.myth4Desc') }
                ].map((item, i) => (
                  <li key={i} className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-2">
                    <div className="text-xs font-black text-emerald-400 uppercase tracking-widest">{item.label}</div>
                    <p className="text-xs text-white/60 leading-relaxed">{item.desc}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl font-black uppercase tracking-tight">{t('guide.tipsTitle')}</h2>
              <p className="text-white/70 leading-relaxed">
                {t('guide.tipsDesc')}
              </p>
              <div className="space-y-4">
                {[
                  { title: t('guide.tip1Title'), desc: t('guide.tip1Desc') },
                  { title: t('guide.tip2Title'), desc: t('guide.tip2Desc') },
                  { title: t('guide.tip3Title'), desc: t('guide.tip3Desc') },
                  { title: t('guide.tip4Title'), desc: t('guide.tip4Desc') }
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-black text-xs shrink-0">{i + 1}</div>
                    <div className="space-y-1">
                      <div className="text-sm font-black text-white uppercase tracking-widest">{item.title}</div>
                      <p className="text-xs text-white/60 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl font-black uppercase tracking-tight">{t('guide.uniqueTitle')}</h2>
              <div className="p-8 bg-emerald-500/10 border border-emerald-500/20 rounded-[2rem] space-y-4">
                <div className="flex items-center gap-3">
                  <Zap className="text-emerald-400" size={24} />
                  <h3 className="text-lg font-black uppercase tracking-tight m-0">{t('guide.characterTitle')}</h3>
                </div>
                <p className="text-white/70 leading-relaxed m-0">
                  {t('guide.characterDesc')}
                </p>
              </div>
            </div>

            <div className="pt-12 border-t border-white/10 flex items-start gap-4">
              <Info className="text-white/20 shrink-0 mt-1" size={20} />
              <p className="text-white/40 text-sm leading-relaxed">
                {t('guide.footerNote')}
              </p>
            </div>
          </section>
        </motion.div>
      </div>
    </div>
  );
}
