import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, Share2, Link2, RefreshCw } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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
                <h3 className="text-lg font-black text-white uppercase tracking-widest">결과 내보내기</h3>
                <p className="text-[10px] text-white/40 font-medium">원하시는 방식을 선택해주세요</p>
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
                      <p className="text-sm font-bold text-white">이미지 저장</p>
                      <p className="text-[10px] text-white/40">갤러리에 결과 카드를 저장합니다</p>
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
                      <p className="text-sm font-bold text-white">다른 앱으로 공유</p>
                      <p className="text-[10px] text-white/40">인스타그램, 카카오톡 등으로 공유</p>
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
                      <p className="text-sm font-bold text-white">링크 복사</p>
                      <p className="text-[10px] text-white/40">앱 주소를 클립보드에 복사합니다</p>
                    </div>
                  </div>
                </button>
              </div>

              <button 
                type="button"
                onClick={() => setShowExportModal(false)}
                className="w-full py-4 text-sm font-bold text-white/40 hover:text-white transition-colors"
              >
                취소
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
