import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, Upload, RefreshCw, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { FaceMeshCanvas } from './FaceMeshCanvas';

interface LandingViewProps {
  isAnalyzing: boolean;
  analysisProgress: number;
  analysisStatus: string;
  isCameraReady: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  // These are needed for the preview state if we want to keep it in LandingView
  image?: string | null;
  capturePhoto?: () => void;
  startCamera?: () => void;
  stopCamera?: () => void;
  centerOffset?: number;
  rotationAngle?: number;
  imageAspectRatio?: number;
  imageDimensions?: { width: number; height: number };
  scanningLandmarks?: any[] | null;
  error?: string | null;
  engineStatus?: 'idle' | 'loading' | 'ready' | 'failed' | 'failed-temporary';
  onRetry?: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  isAnalyzing,
  analysisProgress,
  analysisStatus,
  isCameraReady,
  videoRef,
  canvasRef,
  onFileUpload,
  image,
  capturePhoto,
  startCamera,
  stopCamera,
  centerOffset = 0,
  rotationAngle = 0,
  imageAspectRatio = 1,
  imageDimensions = { width: 0, height: 0 },
  scanningLandmarks = null,
  error = null,
  engineStatus = 'idle',
  onRetry
}) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleStartCamera = () => {
    if (startCamera) {
      startCamera();
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <motion.div 
      key="landing"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileUpload}
        accept="image/*"
        className="hidden"
      />

      <section className="bg-white/5 rounded-3xl border border-white/10 shadow-2xl overflow-hidden relative group backdrop-blur-sm">
        {!image && !isCameraReady ? (
          <div className="aspect-[4/5] flex flex-col items-center justify-center p-12 text-center space-y-8">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 mb-2 border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
              <Camera size={40} />
            </div>
            <div className="space-y-3">
              <h2 className="text-3xl font-black tracking-tighter uppercase italic">{t('landing.title')}</h2>
              <p className="text-white/60 max-w-xs mx-auto text-sm font-medium">
                {t('landing.subtitle')}
              </p>
              {engineStatus === 'loading' && (
                <div className="flex items-center justify-center gap-2 mt-2">
                  <RefreshCw size={12} className="animate-spin text-emerald-500" />
                  <span className="text-[10px] text-emerald-500/80 font-bold uppercase tracking-widest">{t('common.preparing')}</span>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-3 w-full max-w-xs">
              <button 
                type="button"
                onClick={handleStartCamera}
                className="w-full bg-emerald-500 text-black px-6 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 hover:bg-emerald-400 transition-all active:scale-95 shadow-[0_0_30px_rgba(16,185,129,0.3)]"
              >
                <Camera size={18} />
                {t('landing.cameraStart')}
              </button>
              <button 
                type="button"
                onClick={handleUploadClick}
                className="w-full bg-white/5 border border-white/10 text-white px-6 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 hover:bg-white/10 transition-all active:scale-95"
              >
                <Upload size={18} />
                {t('landing.uploadPhoto')}
              </button>
            </div>
          </div>
        ) : isCameraReady ? (
          <div className="relative aspect-[4/5] bg-black">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Face Guide Overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <svg className="w-full h-full text-emerald-400/60" viewBox="0 0 400 500">
                <line x1="133" y1="0" x2="133" y2="500" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
                <line x1="266" y1="0" x2="266" y2="500" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
                <line x1="0" y1="166" x2="400" y2="166" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
                <line x1="0" y1="333" x2="400" y2="333" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
                <path 
                  d="M200,80 C140,80 100,130 100,200 C100,300 140,400 200,400 C260,400 300,300 300,200 C300,130 260,80 200,80 Z" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="1.5" 
                />
                <line x1="0" y1="200" x2="400" y2="200" stroke="#10b981" strokeWidth="1.5" />
                <line x1="200" y1="0" x2="200" y2="500" stroke="#10b981" strokeWidth="1.5" />
              </svg>
              
              <div className="absolute top-1/4 text-center">
                <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
                  {t('landing.guideText')}
                </p>
              </div>
            </div>

            <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-4 px-6">
              <button 
                type="button"
                onClick={stopCamera}
                className="bg-white/20 backdrop-blur-md text-white px-6 py-3 rounded-xl font-medium hover:bg-white/30 transition-all"
              >
                {t('common.cancel')}
              </button>
              <button 
                type="button"
                onClick={capturePhoto}
                className="bg-emerald-500 text-white px-8 py-3 rounded-xl font-medium shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all active:scale-95 flex items-center gap-2"
              >
                <Camera size={20} />
                {t('landing.capture')}
              </button>
            </div>
          </div>
        ) : (
          <div className="relative aspect-auto bg-black flex items-center justify-center overflow-hidden">
            <img 
              src={image!} 
              alt="Preview" 
              className="max-h-[70vh] w-full object-contain transition-transform duration-200" 
              style={{ transform: `rotate(${rotationAngle}deg) scale(1.1)` }}
            />
            
            {/* Landmarks Overlay during analysis */}
            {scanningLandmarks && (
              <div className="absolute inset-0 pointer-events-none z-10">
                <FaceMeshCanvas 
                  landmarks={scanningLandmarks} 
                  imageRef={{ current: document.querySelector('img[alt="Preview"]') as HTMLImageElement }}
                  rawWidth={imageDimensions.width}
                  rawHeight={imageDimensions.height}
                />
              </div>
            )}
            
            {isAnalyzing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white space-y-6 z-50 bg-black/60 backdrop-blur-md">
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute w-full h-[2px] bg-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.8)] animate-scan" />
                </div>

                <div className="relative">
                  <RefreshCw size={48} className="animate-spin text-emerald-400" />
                  <div className="absolute inset-0 animate-ping bg-emerald-500/20 rounded-full" />
                </div>
                
                <div className="text-center space-y-2">
                  <p className="text-xl font-bold tracking-tight text-emerald-400">{analysisStatus || t('landing.analyzing')}</p>
                  <div className="flex flex-col gap-1">
                    <p className="text-[10px] text-white/40 uppercase tracking-widest">{t('landing.onDeviceAi')}</p>
                  </div>
                </div>
                
                <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-300" 
                    style={{ width: `${analysisProgress}%` }} 
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex flex-col gap-3 text-red-400 backdrop-blur-sm shadow-[0_0_20px_rgba(239,68,68,0.1)]">
          <div className="flex items-start gap-3">
            <AlertCircle className="shrink-0 mt-0.5" size={18} />
            <div className="space-y-1 w-full">
              <p className="text-[10px] font-bold uppercase tracking-widest">{t('landing.systemError')}</p>
              <p className="text-sm font-mono break-all">{error}</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                if (isCameraReady && capturePhoto) {
                  capturePhoto();
                  return;
                }
                onRetry?.();
              }}
              className="flex-1 rounded-xl bg-white/10 px-4 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-white hover:bg-white/15 transition-all"
            >
              {t('landing.retryCapture')}
            </button>
            <button
              type="button"
              onClick={handleUploadClick}
              className="flex-1 rounded-xl border border-white/10 bg-transparent px-4 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-white/80 hover:bg-white/5 transition-all"
            >
              {t('landing.chooseDifferentPhoto')}
            </button>
          </div>
          <p className="text-[11px] leading-relaxed text-white/50">
            {t('landing.retryGuide')}
          </p>
        </div>
      )}
    </motion.div>
  );
};
