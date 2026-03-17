import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, Share2, Link2, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ShareModalProps {
  showExportModal: boolean;
  setShowExportModal: (show: boolean) => void;
  exportType: 'result' | 'symmetry';
  isGeneratingShareImage: boolean;
  isGeneratingSymmetryCard: boolean;
  exportResultCard: (mode: 'save' | 'share') => void;
  exportSymmetryCard: (mode: 'save' | 'share') => void;
  copyLink: () => void;
}

export function ShareModal({
  showExportModal,
  setShowExportModal,
  exportType,
  isGeneratingShareImage,
  isGeneratingSymmetryCard,
  exportResultCard,
  exportSymmetryCard,
  copyLink
}: ShareModalProps) {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {showExportModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowExportModal(false)}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative w-full max-w-md bg-[#121212] rounded-t-[32px] sm:rounded-[32px] overflow-hidden border-t sm:border border-white/10 shadow-2xl"
          >
            <div className="p-6 space-y-4">
              <div className="flex flex-col items-center gap-1 mb-2">
                <div className="w-12 h-1 bg-white/10 rounded-full mb-4 sm:hidden" />
                <h3 className="text-lg font-black text-white uppercase tracking-widest">{t('shareModal.title')}</h3>
                <p className="text-[10px] text-white/40 font-medium">{t('shareModal.subtitle')}</p>
              </div>

              <div className="grid gap-2">
                <button 
                  type="button"
                  onClick={() => {
                    if (exportType === 'symmetry') exportSymmetryCard('save');
                    else exportResultCard('save');
                  }}
                  disabled={isGeneratingShareImage || isGeneratingSymmetryCard}
                  className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                      <Download size={20} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-white">{t('shareModal.saveImage')}</p>
                      <p className="text-[10px] text-white/40">{t('shareModal.saveImageDesc')}</p>
                    </div>
                  </div>
                  {(isGeneratingShareImage || isGeneratingSymmetryCard) && <RefreshCw size={16} className="animate-spin text-white/20" />}
                </button>

                <button 
                  type="button"
                  onClick={() => {
                    if (exportType === 'symmetry') exportSymmetryCard('share');
                    else exportResultCard('share');
                  }}
                  disabled={isGeneratingShareImage || isGeneratingSymmetryCard}
                  className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-500">
                      <Share2 size={20} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-white">{t('shareModal.shareApp')}</p>
                      <p className="text-[10px] text-white/40">{t('shareModal.shareAppDesc')}</p>
                    </div>
                  </div>
                  {(isGeneratingShareImage || isGeneratingSymmetryCard) && <RefreshCw size={16} className="animate-spin text-white/20" />}
                </button>

                <button 
                  type="button"
                  onClick={copyLink}
                  className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-500">
                      <Link2 size={20} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-white">{t('shareModal.copyLink')}</p>
                      <p className="text-[10px] text-white/40">{t('shareModal.copyLinkDesc')}</p>
                    </div>
                  </div>
                </button>
              </div>

              <button 
                type="button"
                onClick={() => setShowExportModal(false)}
                className="w-full py-4 text-sm font-bold text-white/40 hover:text-white transition-colors"
              >
                {t('shareModal.cancel')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
