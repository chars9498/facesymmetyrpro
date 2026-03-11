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
  landmarks: {
    eyes: string;
    nose: string;
    mouth: string;
    jawline: string;
  };
}

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("이 브라우저는 카메라 기능을 지원하지 않거나 보안 연결(HTTPS)이 필요합니다.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
        setError(null);
      }
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

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      setIsCameraActive(false);
    }
  };

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
        analyzeImage(dataUrl);
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
        analyzeImage(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async (base64Image: string) => {
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
        body: JSON.stringify({ image: base64Data }),
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
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans selection:bg-emerald-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-black/5 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white">
              <Scan size={20} />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">Face Symmetry Pro</h1>
          </div>
          <button 
            onClick={reset}
            className="p-2 hover:bg-black/5 rounded-full transition-colors"
            title="초기화"
          >
            <RefreshCw size={20} className={cn(isAnalyzing && "animate-spin")} />
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Left Column: Input/Preview */}
          <div className="lg:col-span-7 space-y-6">
            <section className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden relative group">
              {!image && !isCameraActive ? (
                <div className="aspect-[4/5] flex flex-col items-center justify-center p-12 text-center space-y-6">
                  <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mb-2">
                    <Camera size={40} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-medium mb-2">얼굴 분석 시작하기</h2>
                    <p className="text-[#666] max-w-xs mx-auto">
                      정면 사진을 업로드하거나 카메라로 직접 촬영하여 비대칭을 분석해보세요.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
                    <button 
                      onClick={startCamera}
                      className="flex-1 bg-[#1A1A1A] text-white px-6 py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-black transition-all active:scale-95"
                    >
                      <Camera size={18} />
                      카메라 촬영
                    </button>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 bg-white border border-black/10 px-6 py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-black/5 transition-all active:scale-95"
                    >
                      <Upload size={18} />
                      사진 업로드
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
                    className="w-full h-full object-cover"
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
              <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-start gap-3 text-red-600">
                <AlertCircle className="shrink-0 mt-0.5" size={18} />
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            <div className="bg-emerald-50/50 border border-emerald-100/50 p-6 rounded-3xl space-y-3">
              <h3 className="text-sm font-semibold text-emerald-800 flex items-center gap-2 uppercase tracking-wider">
                <Info size={14} />
                정확한 분석을 위한 팁
              </h3>
              <ul className="text-sm text-emerald-700/80 space-y-2 list-disc list-inside">
                <li>정면을 똑바로 바라보고 촬영하세요.</li>
                <li>밝고 균일한 조명 아래에서 촬영하는 것이 좋습니다.</li>
                <li>안경이나 머리카락이 얼굴을 가리지 않게 해주세요.</li>
                <li>무표정 상태로 촬영하는 것이 가장 정확합니다.</li>
              </ul>
            </div>
          </div>

          {/* Right Column: Results */}
          <div className="lg:col-span-5 space-y-6">
            <AnimatePresence mode="wait">
              {result ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  {/* Score Card */}
                  <div className="bg-white rounded-3xl border border-black/5 p-8 shadow-sm text-center space-y-4">
                    <div className="inline-flex items-center justify-center p-1 bg-[#F8F9FA] rounded-full mb-2">
                      <div className="px-4 py-1 text-xs font-bold uppercase tracking-widest text-[#666]">Symmetry Score</div>
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
                          className="text-black/5"
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
                          className="text-emerald-500 transition-all duration-1000 ease-out"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-4xl font-bold tracking-tighter">{result.overallScore}</span>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">
                        {result.overallScore >= 90 ? "매우 훌륭한 대칭" : 
                         result.overallScore >= 80 ? "양호한 대칭" : 
                         result.overallScore >= 70 ? "보통 수준의 대칭" : "비대칭 주의"}
                      </h3>
                      <p className="text-[#666] text-sm mt-1">AI가 분석한 당신의 얼굴 대칭 점수입니다.</p>
                    </div>
                  </div>

                  {/* Detailed Analysis */}
                  <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-black/5 flex items-center justify-between bg-[#F8F9FA]/50">
                      <h3 className="font-semibold flex items-center gap-2">
                        <CheckCircle2 size={18} className="text-emerald-500" />
                        상세 분석 결과
                      </h3>
                    </div>
                    <div className="p-6 space-y-6">
                      <div className="grid grid-cols-1 gap-4">
                        <ResultItem label="눈 (Eyes)" content={result.landmarks.eyes} />
                        <ResultItem label="코 (Nose)" content={result.landmarks.nose} />
                        <ResultItem label="입매 (Mouth)" content={result.landmarks.mouth} />
                        <ResultItem label="턱선 (Jawline)" content={result.landmarks.jawline} />
                      </div>
                      
                      <div className="pt-6 border-t border-black/5">
                        <h4 className="text-sm font-bold text-[#666] uppercase tracking-wider mb-3">전문가 조언</h4>
                        <div className="prose prose-sm max-w-none text-[#444] leading-relaxed">
                          <Markdown>{result.detailedFeedback}</Markdown>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : !isAnalyzing ? (
                <div className="h-full min-h-[400px] bg-white rounded-3xl border border-dashed border-black/10 flex flex-col items-center justify-center p-12 text-center text-[#999]">
                  <div className="w-16 h-16 bg-[#F8F9FA] rounded-full flex items-center justify-center mb-4">
                    <ChevronRight size={24} />
                  </div>
                  <p className="max-w-[200px]">사진을 분석하면 이곳에 결과가 표시됩니다.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-white rounded-3xl border border-black/5 p-8 shadow-sm animate-pulse space-y-4">
                    <div className="w-32 h-32 rounded-full bg-[#F8F9FA] mx-auto" />
                    <div className="h-6 bg-[#F8F9FA] rounded w-1/2 mx-auto" />
                    <div className="h-4 bg-[#F8F9FA] rounded w-3/4 mx-auto" />
                  </div>
                  <div className="bg-white rounded-3xl border border-black/5 p-6 shadow-sm animate-pulse space-y-4">
                    <div className="h-20 bg-[#F8F9FA] rounded" />
                    <div className="h-20 bg-[#F8F9FA] rounded" />
                    <div className="h-20 bg-[#F8F9FA] rounded" />
                  </div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Hidden Canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />
      
      <footer className="max-w-5xl mx-auto px-6 py-12 border-t border-black/5 text-center">
        <p className="text-sm text-[#999]">
          &copy; 2026 Face Symmetry Pro. 본 분석 결과는 참고용이며 의학적 진단을 대신할 수 없습니다.
        </p>
      </footer>
    </div>
  );
}

function ResultItem({ label, content }: { label: string; content: string }) {
  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold text-[#666] uppercase tracking-wider">{label}</span>
      </div>
      <div className="bg-[#F8F9FA] p-4 rounded-2xl border border-black/[0.03] group-hover:border-emerald-200 transition-colors">
        <p className="text-sm leading-relaxed text-[#333]">{content}</p>
      </div>
    </div>
  );
}
