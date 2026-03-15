import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Share2, Check } from 'lucide-react';
import { cn } from '../lib/utils';

interface ExportModalProps {
  show: boolean;
  onClose: () => void;
  exportType: 'result' | 'symmetry';
  isExporting: boolean;
  exportSuccess: boolean;
  onExport: () => void;
  previewRef: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  show,
  onClose,
  exportType,
  isExporting,
  exportSuccess,
  onExport,
  previewRef,
  children
}) => {
  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/90 backdrop-blur-xl"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-[#0A0A0A] rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-xl font-black italic tracking-tighter text-white uppercase">
                  {exportType === 'result' ? 'Share Analysis Result' : 'Share Symmetry Twins'}
                </h3>
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">
                  {exportType === 'result' ? 'Show off your balance score' : 'Compare your left and right face'}
                </p>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <X size={20} className="text-white/60" />
              </button>
            </div>

            {/* Preview Area */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center custom-scrollbar bg-black/40">
              <div 
                ref={previewRef}
                className="w-full max-w-[360px] shadow-2xl rounded-3xl overflow-hidden"
              >
                {children}
              </div>
              
              <div className="mt-6 w-full max-w-[360px] space-y-4">
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                  <p className="text-[11px] text-white/60 leading-relaxed text-center italic">
                    "이미지를 저장하거나 친구들에게 공유하여 분석 결과를 자랑해보세요!"
                  </p>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-6 bg-white/5 border-t border-white/5 flex flex-col gap-3 shrink-0">
              <button
                onClick={onExport}
                disabled={isExporting}
                className={cn(
                  "w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all active:scale-[0.98]",
                  exportSuccess 
                    ? "bg-emerald-500 text-black shadow-[0_0_30px_rgba(16,185,129,0.3)]" 
                    : "bg-[#3BFF9C] hover:bg-[#2ee68a] text-black shadow-[0_0_30px_rgba(59,255,156,0.3)]",
                  isExporting && "opacity-50 cursor-not-allowed"
                )}
              >
                {isExporting ? (
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : exportSuccess ? (
                  <>
                    <Check size={20} />
                    Saved Successfully!
                  </>
                ) : (
                  <>
                    <Share2 size={20} />
                    Save & Share Result
                  </>
                )}
              </button>
              
              <p className="text-[9px] text-center text-white/30 font-bold uppercase tracking-widest">
                The image will be saved to your device and ready to share
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
