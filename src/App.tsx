import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Info, AlertCircle, RotateCcw } from 'lucide-react';
import { toPng } from 'html-to-image';

// Components
import { LandingView } from './components/LandingView';
import { ReportView } from './components/ReportView';
import { ResultShareCard, SymmetryShareCard } from './components/ShareCard';
import { FaceMeshCanvas } from './components/FaceMeshCanvas';

// Hooks
import { useAnalysisFlow } from './hooks/useAnalysisFlow';
import { useAnalysisLimit } from './hooks/useAnalysisLimit';

// Utils
import { cn } from './lib/utils';

export default function App() {
  // State for UI navigation and modals
  const [reportStep, setReportStep] = useState(0);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [exportType, setExportType] = useState<'result' | 'symmetry' | 'full'>('result');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [showPrivacyNote, setShowPrivacyNote] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [autoCorrectEnabled, setAutoCorrectEnabled] = useState(true);

  // Refs
  const shareCardRef = useRef<HTMLDivElement>(null);

  // Custom Hooks
  const { isLocked, incrementCount, unlock } = useAnalysisLimit();
  const analysis = useAnalysisFlow({
    onAnalysisComplete: () => {
      incrementCount();
    }
  });
  
  const resetApp = useCallback(() => {
    analysis.resetAnalysis();
    setReportStep(0);
    setIsUnlocked(false);
  }, [analysis]);

  // Export Logic
  const handleAction = useCallback(async (action: 'save' | 'share' | 'copy') => {
    if (action === 'copy') {
      navigator.clipboard.writeText(window.location.href);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 2000);
      return;
    }

    if (!shareCardRef.current) return;
    
    setIsExporting(true);
    setExportSuccess(false);
    
    try {
      // Small delay to ensure rendering is complete
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const dataUrl = await toPng(shareCardRef.current, {
        quality: 0.95,
        pixelRatio: 2,
        cacheBust: true,
      });
      
      if (action === 'save') {
        const link = document.createElement('a');
        link.download = `face-symmetry-${exportType}-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
        setExportSuccess(true);
        setTimeout(() => setExportSuccess(false), 3000);
      } else if (action === 'share') {
        if (navigator.share) {
          const blob = await (await fetch(dataUrl)).blob();
          const file = new File([blob], 'face-analysis.png', { type: 'image/png' });
          try {
            await navigator.share({
              files: [file],
              title: 'My Face Symmetry Analysis',
              text: 'Check out my facial balance score! Analyze yours at facesymmetrypro.app',
            });
          } catch (e) {
            console.log('Share failed or cancelled');
          }
        } else {
          // Fallback to save if share not available
          const link = document.createElement('a');
          link.download = `face-symmetry-${exportType}-${Date.now()}.png`;
          link.href = dataUrl;
          link.click();
        }
      }
    } catch (err) {
      console.error('Action failed:', err);
    } finally {
      setIsExporting(false);
    }
  }, [exportType]);

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[#3BFF9C]/30 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 p-4 sm:p-6 flex items-center justify-between z-50">
        <div className="flex items-center gap-3 group cursor-pointer" onClick={() => {
          console.log('[DEBUG] NAVIGATE_HOME_CALLED');
          resetApp();
        }}>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#3BFF9C] to-[#2ee68a] flex items-center justify-center shadow-[0_0_20px_rgba(59,255,156,0.3)] group-hover:scale-110 transition-transform duration-300">
            <Shield className="text-black" size={20} strokeWidth={2.5} />
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-black italic tracking-tighter leading-none uppercase">Face Symmetry Pro</h1>
            <span className="text-[8px] font-bold text-[#3BFF9C] uppercase tracking-[0.3em] mt-1">AI Facial Analysis</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {analysis.result && (
            <button 
              type="button"
              onClick={resetApp}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-white/60 hover:text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
            >
              <RotateCcw size={14} />
              Reset
            </button>
          )}
          <button 
            type="button"
            onClick={() => setShowPrivacyNote(true)}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-white/40 hover:text-white"
          >
            <Info size={18} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative flex flex-col min-h-0 w-full max-w-2xl mx-auto px-4 sm:px-6 pb-6">
        <AnimatePresence mode="wait">
          {!analysis.result ? (
            <LandingView 
              key="landing"
              isAnalyzing={analysis.isAnalyzing}
              analysisProgress={analysis.analysisProgress}
              analysisStatus={analysis.analysisStatus}
              scanQuality={analysis.scanQuality}
              isCameraReady={analysis.isCameraReady}
              videoRef={analysis.videoRef}
              canvasRef={analysis.canvasRef}
              onAnalyze={analysis.analyzeImage}
              onFileUpload={analysis.handleFileUpload}
              isLocked={isLocked}
              image={analysis.capturedImage}
              capturePhoto={analysis.capturePhoto}
              startCamera={analysis.startCamera}
              stopCamera={analysis.stopCamera}
              centerOffset={analysis.centerOffset}
              rotationAngle={analysis.rotationAngle}
              imageAspectRatio={analysis.imageAspectRatio}
              imageDimensions={analysis.imageDimensions}
              scanningLandmarks={analysis.scanningLandmarks}
              error={analysis.error}
              engineStatus={analysis.engineStatus}
              onUnlock={unlock}
            />
          ) : (
            <ReportView 
              key="report"
              result={analysis.result}
              reportStep={reportStep}
              setReportStep={setReportStep}
              isUnlocked={isUnlocked}
              setIsUnlocked={setIsUnlocked}
              image={analysis.capturedImage}
              symmetryStrength={analysis.symmetryStrength}
              setSymmetryStrength={analysis.setSymmetryStrength}
              updateSymmetryTwins={analysis.updateSymmetryTwins}
              setExportType={setExportType}
              autoCorrectEnabled={autoCorrectEnabled}
              setAutoCorrectEnabled={setAutoCorrectEnabled}
              showOverlay={showOverlay}
              setShowOverlay={setShowOverlay}
              centerOffset={analysis.centerOffset}
              rotationAngle={analysis.rotationAngle}
              imageAspectRatio={analysis.imageAspectRatio}
              imageDimensions={analysis.imageDimensions}
              FaceMeshCanvas={FaceMeshCanvas}
              onReset={resetApp}
              onAction={handleAction}
              isExporting={isExporting}
              exportSuccess={exportSuccess}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Hidden container for image capture */}
      <div className="fixed -left-[9999px] top-0 pointer-events-none" aria-hidden="true">
        <div ref={shareCardRef}>
          {analysis.result && (
            exportType === 'result' ? (
              <ResultShareCard result={analysis.result} image={analysis.capturedImage} />
            ) : (
              <SymmetryShareCard result={analysis.result} image={analysis.capturedImage} />
            )
          )}
        </div>
      </div>

      {/* Modals */}
      {/* ExportModal is removed as per request for direct actions */}

      {/* Privacy Note Modal */}
      <AnimatePresence>
        {showPrivacyNote && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPrivacyNote(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-[#111] rounded-[2rem] border border-white/10 p-8 shadow-2xl"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                  <Shield className="text-emerald-400" size={24} />
                </div>
                <h3 className="text-xl font-black italic tracking-tighter uppercase">Privacy First</h3>
              </div>
              <div className="space-y-4 text-white/60 text-sm leading-relaxed">
                <p>
                  <strong className="text-white">Your privacy is our top priority.</strong> 모든 얼굴 분석은 사용자의 브라우저 내에서 로컬로 처리됩니다.
                </p>
                <p>
                  분석에 사용된 이미지는 서버로 전송되거나 저장되지 않으며, 페이지를 새로고침하면 즉시 삭제됩니다.
                </p>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-start gap-3">
                  <AlertCircle size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] font-medium leading-normal">
                    AI 분석 결과는 참고용이며 의학적 진단을 대체할 수 없습니다.
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowPrivacyNote(false)}
                className="w-full mt-8 py-4 bg-white/10 hover:bg-white/20 rounded-2xl font-black uppercase tracking-widest transition-all"
              >
                Got it
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scan-slow {
          0% { transform: translateY(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(192px); opacity: 0; }
        }
        .animate-scan-slow {
          animation: scan-slow 3s ease-in-out infinite;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}} />
    </div>
  );
}
