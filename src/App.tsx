import React, { useState, useRef, useCallback } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Camera, Upload, RefreshCw, Scan, AlertCircle, CheckCircle2, Info, ChevronRight, Maximize2, ShieldCheck, BarChart3, FlipHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
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
  laymanProtocol: string;
  professionalProtocol: string;
  landmarkPoints: { x: number; y: number; label: string }[];
  asymmetryZones: { x: number; y: number; radius: number; intensity: number; label: string }[];
  autoCenterOffset?: number; // -15 to 15 percentage
  rotationAngle?: number; // -15 to 15 degrees
}

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [centerOffset, setCenterOffset] = useState(0); // percentage offset from center
  const [rotationAngle, setRotationAngle] = useState(0); // degrees
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

  const resizeImage = (base64Str: string, maxDimension: number = 1024): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height *= maxDimension / width;
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width *= maxDimension / height;
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(base64Str);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => resolve(base64Str);
      img.src = base64Str;
    });
  };

  const analyzeImage = async (base64Image: string, selectedPersonality: 'fact' | 'angel') => {
    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    setCenterOffset(0);
    setRotationAngle(0);

    try {
      // Optimize image size for faster analysis
      const optimizedImage = await resizeImage(base64Image);
      const base64Data = optimizedImage.split(',')[1];
      
      const isAngel = selectedPersonality === 'angel';
      const systemInstruction = isAngel 
        ? `당신은 따뜻하고 긍정적인 안면 비대칭 분석 전문가 '엔젤 가이드'입니다. 
           사용자가 자신의 얼굴에 대해 자신감을 가질 수 있도록 격려하면서도, 개선할 수 있는 부분을 부드럽게 조언해야 합니다.
           
           **분석 가이드라인 (엔젤 가이드):**
           1. 사진이 정면이 아니더라도 너무 엄격하게 꾸짖지 마세요. "정면 사진을 올려주시면 더 정확한 매력을 찾아드릴 수 있어요!"라고 다정하게 말하세요.
           2. 비대칭을 '문제'가 아닌 '개성'이나 '개선 가능한 포인트'로 표현하세요.
           3. 점수는 너무 짜지 않게, 긍정적인 면을 고려하여 산출하세요.
           4. 한국어로 매우 친절하고 따뜻하게 분석 결과를 전달하세요.
           5. 근육 분석 시에도 "이 근육을 조금 더 이완해주면 훨씬 더 밝은 미소가 될 거예요"와 같은 긍정적인 어조를 사용하세요.`
        : `당신은 세계 최고의 냉철한 안면 비대칭 분석 전문가 '닥터 팩트'입니다. 
           사용자가 업로드한 사진을 매우 엄격하고 객관적인 기준으로 분석해야 합니다.
           
           **분석 가이드라인 (닥터 팩트):**
           1. 사진이 정면(Frontal View)이 아닌 옆모습이거나 얼굴이 한쪽으로 치우쳐 있다면, 'overallScore'를 50점 이하로 대폭 낮추고 'detailedFeedback'의 첫 문장에 "정면 사진이 아니어서 정확한 분석이 어렵습니다. 정면을 바라보고 다시 촬영해주세요."라고 명시하세요.
           2. 얼굴이 기울어져 있다면 그 기울어짐 자체를 비대칭의 요소로 간주하여 점수를 깎으세요.
           3. 칭찬보다는 발견된 '차이점'에 집중하세요. 1mm의 차이라도 지적하세요.
           4. 한국어로 전문적이고 냉철하게 분석 결과를 전달하세요.`;

      const prompt = `${systemInstruction}
                
                **JSON 응답 형식:**
                {
                  "overallScore": 0-100 사이의 점수,
                  "detailedFeedback": "전반적인 분석 내용 (마크다운 형식)",
                  "muscleAnalysis": "비대칭의 원인이 될 수 있는 근육(교근, 측두근, 구륜근 등)에 대한 구체적인 추측성 분석",
                  "landmarks": {
                    "eyes": { "score": 0-100, "feedback": "눈 비대칭 분석" },
                    "nose": { "score": 0-100, "feedback": "코 비대칭 분석" },
                    "mouth": { "score": 0-100, "feedback": "입매 비대칭 분석" },
                    "jawline": { "score": 0-100, "feedback": "턱선 비대칭 분석" }
                  },
                  "laymanProtocol": "일반인이 집에서 따라 할 수 있는 쉬운 비대칭 교정 운동/습관 가이드 (마크다운 형식)",
                  "professionalProtocol": "전문가(의사, 물리치료사 등)를 위한 해부학적 용어를 사용한 전문 교정 프로토콜 (마크다운 형식)",
                  "landmarkPoints": [
                    { "x": 0-100 (이미지 가로 대비 %), "y": 0-100 (이미지 세로 대비 %), "label": "눈동자_좌", "side": "left/right/center" },
                    ...주요 랜드마크 10개 이상 (눈꼬리, 콧볼, 입꼬리, 턱선 등)
                  ],
                  "asymmetryZones": [
                    { "x": 0-100, "y": 0-100, "radius": 5-15, "intensity": 0-1 (비대칭 심각도), "label": "비대칭_구역_이름" }
                  ],
                  "autoCenterOffset": -15에서 15 사이의 숫자 (얼굴의 정중앙선이 이미지의 기하학적 중앙에서 얼마나 벗어났는지 퍼센트로 표시. 얼굴이 왼쪽으로 치우쳤으면 음수, 오른쪽이면 양수. 예: 얼굴이 왼쪽으로 2% 치우쳤다면 -2.0),
                  "rotationAngle": -15에서 15 사이의 숫자 (양쪽 눈의 수평을 맞추기 위한 회전 각도. 시계방향 회전이 필요하면 양수, 반시계방향이면 음수)
                }
                
                **중요 - 정밀 보정 가이드:**
                1. **중심선(autoCenterOffset) 기준:** 반드시 '미간(Glabella) - 콧대(Bridge) - 인중(Philtrum) - 턱끝 중앙'을 잇는 가상의 선을 기준으로 하세요. 절대 눈동자나 한쪽 눈에 치우치지 않도록 주의하세요. 얼굴의 정중앙 수직축을 찾아야 합니다.
                2. **수치 정밀도:** 사용자가 수동 조절을 하지 않아도 될 만큼 소수점 첫째 자리까지 정밀하게 계산하세요. (예: 1.2, -0.7 등)
                3. **방향 확인:** 얼굴이 이미지 중앙보다 왼쪽에 있다면 음수(-) 값을 주어 가이드라인이 왼쪽으로 이동하게 해야 합니다. (예: 얼굴이 왼쪽으로 5% 치우침 -> -5.0)`;

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: optimizedImage,
          prompt: prompt,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "분석 중 오류가 발생했습니다.");
      }

      const text = data.text;
      if (!text) {
        throw new Error("AI로부터 응답을 받지 못했습니다.");
      }

      // Robust JSON extraction
      let jsonStr = text.trim();
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }

      const parsedResult = JSON.parse(jsonStr) as AnalysisResult;
      setResult(parsedResult);

      // Apply AI Auto-Correction
      const autoOffset = parsedResult.autoCenterOffset || 0;
      const autoRotation = parsedResult.rotationAngle || 0;
      setCenterOffset(autoOffset);
      setRotationAngle(autoRotation);
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
                        ? '"안녕하세요, 닥터 팩트입니다. 저는 당신의 얼굴 비대칭을 1mm 단위로 정밀하게 분석하여 냉철한 팩트만을 전달합니다. 분석 데이터는 보안 프로토콜에 따라 즉시 삭제되니 안심하고 진단받으십시오."'
                        : '"반가워요! 저는 엔젤 가이드예요. 당신이 가진 본연의 아름다움을 찾아내고, 더 밝은 미소를 가질 수 있도록 따뜻하게 도와드릴게요. 당신의 소중한 사진은 저만 살짝 보고 바로 지울게요. 걱정 마세요!"'}
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

                  <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/5 border border-emerald-500/10 rounded-full">
                    <ShieldCheck size={14} className="text-emerald-500" />
                    <p className="text-[10px] text-emerald-500/70 font-medium uppercase tracking-wider">
                      Privacy Secured: No images are stored on our servers.
                    </p>
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
                    {/* Face Silhouette SVG */}
                    <svg className="w-full h-full text-emerald-500/30" viewBox="0 0 400 500">
                      <path 
                        d="M200,80 C140,80 100,130 100,200 C100,300 140,400 200,400 C260,400 300,300 300,200 C300,130 260,80 200,80 Z" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeDasharray="8 8"
                      />
                      {/* Eye Line */}
                      <line x1="120" y1="200" x2="280" y2="200" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
                      {/* Center Line */}
                      <line x1="200" y1="50" x2="200" y2="450" stroke="rgba(16,185,129,0.5)" strokeWidth="1" />
                    </svg>
                    <div className="absolute top-1/4 text-center">
                      <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
                        얼굴을 중앙선에 맞춰주세요
                      </p>
                    </div>
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
                <div className="relative aspect-auto bg-black flex items-center justify-center overflow-hidden">
                  <img 
                    src={image!} 
                    alt="Preview" 
                    className="max-h-[70vh] w-full object-contain transition-transform duration-200" 
                    style={{ transform: `rotate(${rotationAngle}deg) scale(1.1)` }}
                  />
                  
                  {/* Symmetry Overlay */}
                  {showOverlay && (
                    <div className="absolute inset-0 pointer-events-none">
                      <div 
                        className="absolute top-0 bottom-0 w-[2px] bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] transition-all duration-200" 
                        style={{ 
                          left: `calc(50% + ${centerOffset}%)`,
                          transform: `translateX(-50%)`,
                        }}
                      />
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
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center text-white space-y-6 z-50">
                      <div className="relative">
                        <RefreshCw size={48} className="animate-spin text-emerald-400" />
                        <div className="absolute inset-0 animate-ping bg-emerald-500/20 rounded-full" />
                      </div>
                      <div className="text-center space-y-2">
                        <p className="text-xl font-bold tracking-tight text-emerald-400">AI 분석 진행 중...</p>
                        <div className="flex flex-col gap-1">
                          <p className="text-sm text-white/70 animate-pulse">얼굴의 특징점을 정밀하게 찾는 중입니다</p>
                          <p className="text-[10px] text-white/40 uppercase tracking-widest">이미지 최적화 및 서버 통신 중</p>
                        </div>
                      </div>
                      <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 animate-[loading_2s_ease-in-out_infinite]" style={{ width: '30%' }} />
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
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest">System Error</p>
                    <p className="text-sm font-mono">{error}</p>
                  </div>
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
                  <div className="bg-white/5 rounded-3xl border border-white/10 p-8 shadow-2xl backdrop-blur-sm">
                    <div className="flex flex-col md:flex-row items-center gap-8">
                      <div className="flex-shrink-0 relative">
                        <div className="absolute -inset-4 bg-emerald-500/10 blur-2xl rounded-full animate-pulse" />
                        <div className="relative">
                          <svg className="w-40 h-40 transform -rotate-90">
                            <circle
                              cx="80"
                              cy="80"
                              r="74"
                              stroke="currentColor"
                              strokeWidth="10"
                              fill="transparent"
                              className="text-white/5"
                            />
                            <circle
                              cx="80"
                              cy="80"
                              r="74"
                              stroke="currentColor"
                              strokeWidth="10"
                              fill="transparent"
                              strokeDasharray={464.7}
                              strokeDashoffset={464.7 - (464.7 * result.overallScore) / 100}
                              strokeLinecap="round"
                              className="text-emerald-500 transition-all duration-1000 ease-out drop-shadow-[0_0_12px_rgba(16,185,129,0.6)]"
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-5xl font-bold tracking-tighter font-mono leading-none">{result.overallScore}</span>
                            <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-1">Index</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex-1 text-center md:text-left space-y-4">
                        <div className="inline-flex items-center justify-center p-1 bg-white/[0.02] rounded-full border border-white/5">
                          <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">Symmetry Analysis Result</div>
                        </div>
                        <div>
                          <h3 className="text-3xl font-bold uppercase italic tracking-tight leading-tight break-keep">
                            {result.overallScore >= 90 ? "Optimal Symmetry" : 
                             result.overallScore >= 80 ? "High Symmetry" : 
                             result.overallScore >= 70 ? "Standard Symmetry" : "Deviation Detected"}
                          </h3>
                          <p className="text-white/60 text-sm mt-2 font-mono leading-relaxed break-keep">
                            {personality === 'fact' 
                              ? "생체 인식 데이터 분석 결과, 당신의 안면 대칭도는 위와 같이 산출되었습니다. 이는 해부학적 기준에 따른 객관적 수치입니다."
                              : "당신만의 고유한 아름다움이 담긴 분석 결과예요! 완벽한 대칭보다 더 중요한 건 당신의 밝은 미소라는 걸 잊지 마세요."}
                          </p>
                        </div>
                        <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-2">
                          <div className="px-3 py-1 bg-white/5 rounded-lg border border-white/10">
                            <p className="text-[8px] text-white/40 uppercase font-mono">Status</p>
                            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Verified</p>
                          </div>
                          <div className="px-3 py-1 bg-white/5 rounded-lg border border-white/10">
                            <p className="text-[8px] text-white/40 uppercase font-mono">Protocol</p>
                            <p className="text-[10px] font-bold text-white/80 uppercase tracking-wider">v2.4.0</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Radar Chart Analysis */}
                  <div className="bg-white/5 rounded-3xl border border-white/10 p-6 shadow-2xl backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-6">
                      <BarChart3 size={16} className="text-emerald-500" />
                      <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60 font-mono">Symmetry Balance Chart</h3>
                    </div>
                    <div className="h-[320px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart 
                          cx="50%" 
                          cy="50%" 
                          outerRadius="65%" 
                          data={[
                            { subject: '눈 (Eyes)', A: result.landmarks.eyes.score, full: 100 },
                            { subject: '코 (Nose)', A: result.landmarks.nose.score, full: 100 },
                            { subject: '입 (Mouth)', A: result.landmarks.mouth.score, full: 100 },
                            { subject: '턱 (Jaw)', A: result.landmarks.jawline.score, full: 100 },
                            { subject: '전체 (Total)', A: result.overallScore, full: 100 },
                          ]}
                          margin={{ top: 10, right: 40, bottom: 10, left: 40 }}
                        >
                          <PolarGrid stroke="rgba(255,255,255,0.1)" />
                          <PolarAngleAxis 
                            dataKey="subject" 
                            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 'bold' }} 
                          />
                          <Radar
                            name="Symmetry"
                            dataKey="A"
                            stroke="#10b981"
                            fill="#10b981"
                            fillOpacity={0.3}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Symmetry Visualizer (Heatmap & Grid) */}
                  <div className="bg-white/5 rounded-3xl border border-white/10 p-6 shadow-2xl backdrop-blur-sm space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Scan size={16} className="text-emerald-500" />
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60 font-mono">Symmetry Heatmap & Grid</h3>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setShowOverlay(!showOverlay)}
                          className={cn(
                            "px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all border",
                            showOverlay ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" : "bg-white/5 border-white/10 text-white/40"
                          )}
                        >
                          {showOverlay ? "Hide Overlay" : "Show Overlay"}
                        </button>
                      </div>
                    </div>

                    <div className="relative aspect-[4/5] rounded-2xl overflow-hidden border border-white/10 bg-black group">
                      {/* Transformed Content Layer */}
                      <div 
                        className="absolute inset-0 transition-transform duration-500 ease-out"
                        style={{ 
                          transform: `translateX(${-centerOffset}%) rotate(${rotationAngle}deg) scale(1.1)` 
                        }}
                      >
                        {/* Base Image */}
                        <img src={image || ''} alt="Analysis" className="w-full h-full object-cover" referrerPolicy="no-referrer" />

                        {/* Overlay Layer (Moves with image) */}
                        <AnimatePresence>
                          {showOverlay && (
                            <motion.div 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="absolute inset-0 pointer-events-none"
                            >
                              {/* Heatmap Zones */}
                              {result.asymmetryZones?.map((zone, i) => (
                                <motion.div
                                  key={`zone-${i}`}
                                  initial={{ scale: 0, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 0.4 }}
                                  transition={{ delay: 0.5 + i * 0.1 }}
                                  className="absolute rounded-full blur-xl"
                                  style={{
                                    left: `${zone.x}%`,
                                    top: `${zone.y}%`,
                                    width: `${zone.radius * 2}%`,
                                    height: `${zone.radius * 2}%`,
                                    backgroundColor: zone.intensity > 0.7 ? '#ef4444' : zone.intensity > 0.4 ? '#f59e0b' : '#10b981',
                                    transform: 'translate(-50%, -50%)'
                                  }}
                                />
                              ))}

                              {/* Landmark Points */}
                              {result.landmarkPoints?.map((point, i) => (
                                <motion.div
                                  key={`point-${i}`}
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ delay: 1 + i * 0.05, type: 'spring' }}
                                  className="absolute group/point"
                                  style={{
                                    left: `${point.x}%`,
                                    top: `${point.y}%`,
                                    transform: 'translate(-50%, -50%)'
                                  }}
                                >
                                  <div className="w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_5px_rgba(255,255,255,0.8)]" />
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 whitespace-nowrap bg-black/80 text-[7px] px-1 rounded text-white/60 opacity-0 group-hover/point:opacity-100 transition-opacity">
                                    {point.label}
                                  </div>
                                </motion.div>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Fixed Reference Grid (Stays in center of container) */}
                      <div className="absolute inset-0 pointer-events-none">
                        {/* Central Axis */}
                        <div className="absolute inset-0 flex justify-center">
                          <div className="w-px h-full bg-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.5)] z-10" />
                        </div>
                        
                        {/* Horizontal Grid Lines */}
                        <div className="absolute inset-0 flex flex-col justify-around opacity-20">
                          {[...Array(8)].map((_, i) => (
                            <div key={i} className="w-full h-px bg-white/30" />
                          ))}
                        </div>
                      </div>

                      {/* Manual Controls Overlay (Bottom) */}
                      <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="space-y-3">
                          <div className="flex items-center gap-4">
                            <span className="text-[8px] font-mono text-white/40 uppercase w-12">Offset</span>
                            <input 
                              type="range" min="-15" max="15" step="0.1" value={centerOffset}
                              onChange={(e) => setCenterOffset(parseFloat(e.target.value))}
                              className="flex-1 h-1 bg-white/10 rounded-full appearance-none accent-emerald-500 pointer-events-auto"
                            />
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-[8px] font-mono text-white/40 uppercase w-12">Rotate</span>
                            <input 
                              type="range" min="-15" max="15" step="0.1" value={rotationAngle}
                              onChange={(e) => setRotationAngle(parseFloat(e.target.value))}
                              className="flex-1 h-1 bg-white/10 rounded-full appearance-none accent-emerald-500 pointer-events-auto"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex gap-3">
                      <Info size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">Analysis Guide</p>
                        <p className="text-[10px] text-emerald-500/70 leading-relaxed break-keep">
                          흰색 점은 주요 안면 랜드마크이며, 붉은색 영역은 비대칭 편차가 크게 감지된 구역입니다. 중앙의 수직선은 얼굴의 이상적인 중심축을 나타냅니다.
                        </p>
                      </div>
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

                  {/* Correction Protocols */}
                  <div className="bg-white/5 rounded-3xl border border-white/10 overflow-hidden shadow-2xl backdrop-blur-sm">
                    <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                      <div className="flex items-center gap-2">
                        <ShieldCheck size={16} className="text-emerald-500" />
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60 font-mono">Correction Protocols</h3>
                      </div>
                    </div>
                    
                    <div className="p-6 space-y-8">
                      {/* Layman Protocol */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                            <CheckCircle2 size={16} />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white">데일리 홈 케어 가이드</h4>
                            <p className="text-[10px] text-white/40 uppercase tracking-wider font-mono">Layman Protocol</p>
                          </div>
                        </div>
                        <div className="prose prose-invert prose-sm max-w-none bg-white/[0.03] rounded-2xl p-5 border border-white/5">
                          <div className="text-xs text-white/70 leading-relaxed markdown-body">
                            <Markdown>{result.laymanProtocol}</Markdown>
                          </div>
                        </div>
                      </div>

                      {/* Professional Protocol */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
                            <AlertCircle size={16} />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white">전문가용 임상 프로토콜</h4>
                            <p className="text-[10px] text-white/40 uppercase tracking-wider font-mono">Clinical/Professional Protocol</p>
                          </div>
                        </div>
                        <div className="prose prose-invert prose-sm max-w-none bg-blue-500/[0.03] rounded-2xl p-5 border border-blue-500/10">
                          <div className="text-xs text-blue-300/70 leading-relaxed font-mono markdown-body">
                            <Markdown>{result.professionalProtocol}</Markdown>
                          </div>
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
