import React, { useState, useRef, useCallback } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Camera, Upload, RefreshCw, Scan, AlertCircle, CheckCircle2, Info, ChevronRight, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Initialize Gemini
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

interface AnalysisResult {
  overallScore: number;
  detailedFeedback: string;
  muscleAnalysis: string;
  landmarks: {
    eyes: { score: number; feedback: string };
    nose: { score: number; feedback: string };
    mouth: { score: number; feedback: string };
    jawline: { score: number; feedback: string };
  };
}

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [personality, setPersonality] = useState<'fact' | 'angel'>('fact');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("이 브라우저는 카메라 기능을 지원하지 않거나 보안 연결(HTTPS)이 필요합니다.");
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      setStream(mediaStream);
      setIsCameraActive(true);
      setError(null);
    } catch (err: any) {
      let message = "카메라를 시작할 수 없습니다.";
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = "카메라 권한이 거부되었습니다. 브라우저 설정에서 권한을 허용해주세요.";
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = "카메라를 찾을 수 없습니다.";
      } else if (err.message) {
        message = err.message;
      }
      setError(message);
      console.error("Camera Error:", err);
    }
  };

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  }, [stream]);

  // Attach stream to video element when it becomes available
  React.useEffect(() => {
    if (isCameraActive && videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [isCameraActive, stream]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg');
        setImage(dataUrl);
        stopCamera();
        analyzeImage(dataUrl, personality);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setImage(dataUrl);
        analyzeImage(dataUrl, personality);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async (base64Image: string, selectedPersonality: 'fact' | 'angel') => {
    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const base64Data = base64Image.split(',')[1];
      
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          image: base64Data,
          personality: selectedPersonality 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "분석 요청에 실패했습니다.");
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "분석 중 오류가 발생했습니다. 다시 시도해주세요.");
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    setImage(null);
    setResult(null);
    setError(null);
    setIsCameraActive(false);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white font-sans selection:bg-emerald-500/30 relative overflow-x-hidden">
      {/* Technical Texture Overlay */}
      <div className="fixed inset-0 bg-grid-technical pointer-events-none" />
      <div className="fixed inset-0 bg-dot-technical opacity-30 pointer-events-none" />
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0A0A0B]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4">
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-black shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                <Scan size={20} />
              </div>
              <h1 className="text-xl font-bold tracking-tighter uppercase italic whitespace-nowrap">Face Symmetry <span className="text-emerald-500">Pro</span></h1>
            </div>
            <button 
              onClick={reset}
              className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/60"
              title="Reset"
            >
              <RefreshCw size={20} className={cn(isAnalyzing && "animate-spin")} />
            </button>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <span className="text-[10px] tracking-[0.2em] font-bold text-white/40 px-1 uppercase">
              Select Analyst
            </span>
            <div className="hidden sm:block w-[1px] h-3 bg-white/10" />
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 w-full sm:w-auto">
              <button
                onClick={() => setPersonality('fact')}
                className={cn(
                  "flex-1 sm:flex-none px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all",
                  personality === 'fact' 
                    ? "bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]" 
                    : "text-white/40 hover:text-white/60"
                )}
              >
                Dr. Fact
              </button>
              <button
                onClick={() => setPersonality('angel')}
                className={cn(
                  "flex-1 sm:flex-none px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all",
                  personality === 'angel' 
                    ? "bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.3)]" 
                    : "text-white/40 hover:text-white/60"
                )}
              >
                Angel Guide
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="space-y-12">
          
          {/* Input/Preview Section */}
          <div className="space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={personality}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={cn(
                  "p-6 rounded-2xl border bg-white/5 backdrop-blur-sm transition-all",
                  personality === 'fact' 
                    ? "border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.1)]" 
                    : "border-orange-500/30 shadow-[0_0_20px_rgba(249,115,22,0.1)]"
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center shrink-0 shadow-sm transition-colors",
                    personality === 'fact' ? "bg-blue-500/20 text-blue-400" : "bg-orange-500/20 text-orange-400"
                  )}>
                    {personality === 'fact' ? <Scan size={24} /> : <CheckCircle2 size={24} />}
                  </div>
                  <div className="space-y-1">
                    <h4 className={cn(
                      "font-bold text-[10px] uppercase tracking-[0.2em]",
                      personality === 'fact' ? "text-blue-400" : "text-orange-400"
                    )}>
                      {personality === 'fact' ? "System: Dr. Fact" : "System: Angel Guide"}
                    </h4>
                    <p className="text-sm leading-relaxed text-white/80 italic break-keep">
                      {personality === 'fact' 
                        ? '"안녕하세요, 닥터 팩트입니다. 저는 당신의 얼굴 비대칭을 1mm 단위로 정밀하게 분석하여 냉철한 팩트만을 전달합니다. 객관적인 진단이 필요하시다면 저를 믿어주세요."'
                        : '"반가워요! 저는 엔젤 가이드예요. 당신이 가진 본연의 아름다움을 찾아내고, 더 밝은 미소를 가질 수 있도록 따뜻하게 도와드릴게요. 우리 함께 당신의 매력을 발견해볼까요?"'}
                    </p>
                    <div className="flex items-center gap-2 pt-2 border-t border-white/5 mt-2">
                      <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                      <p className="text-[10px] text-white/40 uppercase tracking-widest">
                        Status: Ready for analysis
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            <section className="bg-white/5 rounded-3xl border border-white/10 shadow-2xl overflow-hidden relative group backdrop-blur-sm">
              {!image && !isCameraActive ? (
                <div className="aspect-[4/5] flex flex-col items-center justify-center p-12 text-center space-y-6">
                  <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 mb-2 border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                    <Camera size={40} />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold tracking-tighter uppercase italic">Initialize Scan</h2>
                    <p className="text-white/40 max-w-xs mx-auto text-sm font-mono">
                      [SYSTEM] Please upload a front-facing image or activate camera for real-time biometric analysis.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
                    <button 
                      onClick={startCamera}
                      className="flex-1 bg-emerald-500 text-black px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-emerald-400 transition-all active:scale-95 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                    >
                      <Camera size={16} />
                      Camera Start
                    </button>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 bg-white/5 border border-white/10 text-white px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-white/10 transition-all active:scale-95"
                    >
                      <Upload size={16} />
                      Upload File
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileUpload} 
                      accept="image/*" 
                      className="hidden" 
                    />
                  </div>
                </div>
              ) : isCameraActive ? (
                <div className="relative aspect-[4/5] bg-black">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                  {/* Face Guide Overlay */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-64 h-80 border-2 border-white/30 rounded-[100px] border-dashed" />
                    <div className="absolute h-full w-[1px] bg-emerald-500/50 left-1/2" />
                  </div>
                  <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-4 px-6">
                    <button 
                      onClick={stopCamera}
                      className="bg-white/20 backdrop-blur-md text-white px-6 py-3 rounded-xl font-medium hover:bg-white/30 transition-all"
                    >
                      취소
                    </button>
                    <button 
                      onClick={capturePhoto}
                      className="bg-emerald-500 text-white px-8 py-3 rounded-xl font-medium shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all active:scale-95 flex items-center gap-2"
                    >
                      <Camera size={20} />
                      촬영하기
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative aspect-auto bg-black flex items-center justify-center">
                  <img src={image!} alt="Preview" className="max-h-[70vh] w-full object-contain" />
                  
                  {/* Symmetry Overlay */}
                  {showOverlay && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="h-full w-[2px] bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                      {/* Horizontal guides for eyes/mouth if we wanted to be fancy, but vertical is key */}
                    </div>
                  )}

                  <div className="absolute top-4 right-4 flex gap-2">
                    <button 
                      onClick={() => setShowOverlay(!showOverlay)}
                      className={cn(
                        "p-2 rounded-lg backdrop-blur-md transition-all",
                        showOverlay ? "bg-emerald-500 text-white" : "bg-white/20 text-white"
                      )}
                      title="가이드라인 토글"
                    >
                      <Maximize2 size={18} />
                    </button>
                  </div>

                  {isAnalyzing && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center text-white space-y-4">
                      <RefreshCw size={40} className="animate-spin text-emerald-400" />
                      <div className="text-center">
                        <p className="text-lg font-medium">AI 분석 진행 중...</p>
                        <p className="text-sm text-white/70">얼굴의 특징점을 찾는 중입니다</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-start gap-3 text-red-400 backdrop-blur-sm shadow-[0_0_20px_rgba(239,68,68,0.1)]">
                <AlertCircle className="shrink-0 mt-0.5" size={18} />
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest">System Error</p>
                  <p className="text-sm font-mono">{error}</p>
                </div>
              </div>
            )}

            <div className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4 backdrop-blur-sm">
              <h3 className="text-[10px] font-bold text-emerald-400 flex items-center gap-2 uppercase tracking-[0.2em]">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                Diagnostic Protocol: Tips
              </h3>
              <ul className="text-xs text-white/60 space-y-3 font-mono">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">01</span>
                  <span>정면을 똑바로 바라보고 촬영하세요. (Maintain eye level)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">02</span>
                  <span>밝고 균일한 조명 아래에서 촬영하세요. (Uniform lighting)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">03</span>
                  <span>안경이나 머리카락이 얼굴을 가리지 않게 해주세요. (Clear visibility)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">04</span>
                  <span>무표정 상태로 촬영하는 것이 가장 정확합니다. (Neutral expression)</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            <AnimatePresence mode="wait">
              {result ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  {/* Score Card */}
                  <div className="bg-white/5 rounded-3xl border border-white/10 p-8 shadow-2xl text-center space-y-4 backdrop-blur-sm">
                    <div className="inline-flex items-center justify-center p-1 bg-white/[0.02] rounded-full mb-2 border border-white/5">
                      <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Symmetry Index</div>
                    </div>
                    <div className="relative inline-block">
                      <svg className="w-32 h-32 transform -rotate-90">
                        <circle
                          cx="64"
                          cy="64"
                          r="58"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="transparent"
                          className="text-white/5"
                        />
                        <circle
                          cx="64"
                          cy="64"
                          r="58"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="transparent"
                          strokeDasharray={364.4}
                          strokeDashoffset={364.4 - (364.4 * result.overallScore) / 100}
                          className="text-emerald-500 transition-all duration-1000 ease-out drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-4xl font-bold tracking-tighter font-mono">{result.overallScore}</span>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold uppercase italic tracking-tight">
                        {result.overallScore >= 90 ? "Optimal Symmetry" : 
                         result.overallScore >= 80 ? "High Symmetry" : 
                         result.overallScore >= 70 ? "Standard Symmetry" : "Deviation Detected"}
                      </h3>
                      <p className="text-white/40 text-xs mt-1 font-mono uppercase tracking-wider">Biometric analysis complete.</p>
                    </div>
                  </div>

                  {/* Detailed Analysis */}
                  <div className="bg-white/5 rounded-3xl border border-white/10 shadow-2xl overflow-hidden backdrop-blur-sm">
                    <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                      <h3 className="text-xs font-bold uppercase tracking-[0.2em] flex items-center gap-2 text-white/60">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                        Diagnostic Report
                      </h3>
                    </div>
                    <div className="p-6 space-y-6">
                      <div className="grid grid-cols-1 gap-4">
                        <ResultItem label="눈 (Eyes)" score={result.landmarks.eyes.score} content={result.landmarks.eyes.feedback} />
                        <ResultItem label="코 (Nose)" score={result.landmarks.nose.score} content={result.landmarks.nose.feedback} />
                        <ResultItem label="입매 (Mouth)" score={result.landmarks.mouth.score} content={result.landmarks.mouth.feedback} />
                        <ResultItem label="턱선 (Jawline)" score={result.landmarks.jawline.score} content={result.landmarks.jawline.feedback} />
                      </div>
                      
                      <div className="pt-6 border-t border-white/5">
                        <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mb-3 font-mono">근육 및 원인 분석</h4>
                        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl text-amber-200/80 text-sm leading-relaxed break-keep">
                          {result.muscleAnalysis}
                        </div>
                      </div>
                      
                      <div className="pt-6 border-t border-white/5">
                        <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mb-3 font-mono">전문가 조언</h4>
                        <div className="prose prose-invert prose-sm max-w-none text-white/70 leading-relaxed break-keep">
                          <Markdown>{result.detailedFeedback}</Markdown>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : !isAnalyzing ? (
                <div className="h-full min-h-[400px] bg-white/5 rounded-3xl border border-dashed border-white/10 flex flex-col items-center justify-center p-12 text-center backdrop-blur-sm">
                  <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mb-4 text-white/20">
                    <ChevronRight size={24} />
                  </div>
                  <p className="max-w-[200px] text-white/40 font-mono text-xs uppercase tracking-wider">
                    [WAITING] Analysis results will be displayed here after scan.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-white/5 rounded-3xl border border-white/10 p-8 shadow-2xl animate-pulse space-y-4 backdrop-blur-sm">
                    <div className="w-32 h-32 rounded-full bg-white/5 mx-auto border border-white/5" />
                    <div className="h-6 bg-white/5 rounded w-1/2 mx-auto" />
                    <div className="h-4 bg-white/5 rounded w-3/4 mx-auto" />
                  </div>
                  <div className="bg-white/5 rounded-3xl border border-white/10 p-6 shadow-2xl animate-pulse space-y-4 backdrop-blur-sm">
                    <div className="h-20 bg-white/5 rounded" />
                    <div className="h-20 bg-white/5 rounded" />
                    <div className="h-20 bg-white/5 rounded" />
                  </div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Hidden Canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />
      
      <footer className="max-w-3xl mx-auto px-6 py-12 border-t border-white/5 text-center">
        <p className="text-[10px] text-white/20 uppercase tracking-[0.2em] font-mono">
          &copy; 2026 Face Symmetry Pro. [DISCLAIMER] BIOMETRIC DATA IS FOR REFERENCE ONLY.
        </p>
      </footer>
    </div>
  );
}

function ResultItem({ label, score, content }: { label: string; score: number; content: string }) {
  return (
    <div className="group">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] font-mono">{label}</span>
        <span className={cn(
          "text-[10px] font-bold px-2 py-0.5 rounded-full tracking-widest font-mono",
          score >= 80 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
          score >= 60 ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
        )}>
          {score}%
        </span>
      </div>
      <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/5 group-hover:border-white/10 transition-all group-hover:bg-white/[0.04]">
        <p className="text-sm text-white/70 leading-relaxed break-keep">{content}</p>
      </div>
    </div>
  );
}
