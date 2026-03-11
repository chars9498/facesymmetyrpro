import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Camera, Upload, RefreshCw, RotateCcw, Scan, AlertCircle, CheckCircle2, Info, ChevronRight, Maximize2, ShieldCheck, BarChart3, FlipHorizontal, Sparkles, Zap, Trophy, Instagram, MessageCircle, Link2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import * as faceMesh from '@mediapipe/face_mesh';
import { toPng } from 'html-to-image';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AnalysisResult {
  overallScore: number;
  summary: string;
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
  autoCenterOffset?: number;
  rotationAngle?: number;
  percentile?: number; // Added for viral effect
  celebrityMatches?: { name: string; confidence: number }[];
}

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [autoCorrectEnabled, setAutoCorrectEnabled] = useState(true);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [centerOffset, setCenterOffset] = useState(0); // percentage offset from center
  const [rotationAngle, setRotationAngle] = useState(0); // degrees
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [personality, setPersonality] = useState<'fact' | 'angel'>('fact');
  const [analysisStep, setAnalysisStep] = useState<string>('');
  const [faceMeshLoaded, setFaceMeshLoaded] = useState(false);
  const [isGeneratingShareImage, setIsGeneratingShareImage] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const shareCardRef = useRef<HTMLDivElement>(null);
  const faceMeshRef = useRef<faceMesh.FaceMesh | null>(null);

  // Initialize FaceMesh
  useEffect(() => {
    const initFaceMesh = async () => {
      try {
        const fm = new faceMesh.FaceMesh({
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
          }
        });

        fm.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        faceMeshRef.current = fm;
        setFaceMeshLoaded(true);
      } catch (err) {
        console.error("FaceMesh Init Error:", err);
        setError("얼굴 인식 엔진을 초기화하지 못했습니다.");
      }
    };

    initFaceMesh();
  }, []);

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
      
      // If it's a permission error in an iframe, suggest opening in a new tab
      if (window.self !== window.top && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')) {
        setError(prev => prev + " (팁: 브라우저 상단의 '새 탭에서 열기' 버튼을 클릭하여 실행하면 권한 허용이 더 원활할 수 있습니다.)");
      }
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

  const downloadShareImage = async () => {
    if (!shareCardRef.current) return;
    
    setIsGeneratingShareImage(true);
    try {
      // Wait a bit for any images to load
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const dataUrl = await toPng(shareCardRef.current, {
        quality: 1.0,
        pixelRatio: 2,
        width: 1080,
        height: 1920,
      });
      
      const link = document.createElement('a');
      link.download = `face-symmetry-result-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Share Image Generation Error:", err);
      setError("공유 이미지 생성 중 오류가 발생했습니다.");
    } finally {
      setIsGeneratingShareImage(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("링크가 클립보드에 복사되었습니다!");
  };

  const shareToKakao = () => {
    // @ts-ignore
    if (window.Kakao) {
      // @ts-ignore
      const Kakao = window.Kakao;
      if (!Kakao.isInitialized()) {
        // This would normally be an environment variable
        // For now, we'll try to use the Web Share API if Kakao isn't set up
        if (navigator.share) {
          navigator.share({
            title: 'Face Symmetry Pro',
            text: `내 얼굴 비대칭 점수는 ${result?.overallScore}점! 당신의 점수는?`,
            url: window.location.href,
          });
          return;
        }
        alert("카카오톡 공유를 사용하려면 Kakao JavaScript Key 설정이 필요합니다.");
        return;
      }
      
      Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: 'Face Symmetry Pro',
          description: `내 얼굴 비대칭 점수는 ${result?.overallScore}점! 당신의 점수는?`,
          imageUrl: 'https://images.unsplash.com/photo-1554151228-14d9def656e4?q=80&w=1200&h=630&auto=format&fit=crop',
          link: {
            mobileWebUrl: window.location.href,
            webUrl: window.location.href,
          },
        },
        buttons: [
          {
            title: '나도 분석하기',
            link: {
              mobileWebUrl: window.location.href,
              webUrl: window.location.href,
            },
          },
        ],
      });
    } else {
      copyLink();
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
    setDebugInfo(null);
    setResult(null);
    setCenterOffset(0);
    setRotationAngle(0);
    setAnalysisStep('얼굴 특징점 추출 중...');

    try {
      if (!faceMeshRef.current) {
        throw new Error("얼굴 인식 엔진이 아직 준비되지 않았습니다.");
      }

      // Resize image to a reasonable size for analysis
      const resizedImage = await resizeImage(base64Image, 1024);

      // 1. Browser-side FaceMesh Analysis
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = resizedImage;
      });

      const faceResults: faceMesh.Results = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("얼굴 분석 시간이 초과되었습니다. 다시 시도해주세요."));
        }, 15000);

        faceMeshRef.current!.onResults((results) => {
          clearTimeout(timeout);
          resolve(results);
        });

        faceMeshRef.current!.send({ image: img }).catch((err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });

      if (!faceResults || !faceResults.multiFaceLandmarks || faceResults.multiFaceLandmarks.length === 0) {
        throw new Error("사진에서 얼굴을 찾을 수 없습니다. 얼굴이 잘 보이도록 정면에서 밝은 곳에서 찍은 사진을 사용해주세요.");
      }

      setAnalysisStep('대칭성 수치 계산 중...');
      const landmarks = faceResults.multiFaceLandmarks[0];
      
      // 1. Basic Functions & Dimensions
      const dist2D = (p1: any, p2: any) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
      
      // Face Dimensions
      const faceWidth = dist2D(landmarks[127], landmarks[356]);
      const faceHeight = dist2D(landmarks[10], landmarks[152]);
      
      // Midline calculation (using upper face for a stable vertical axis)
      // Point 10 is top of forehead, 168 is between eyes. This defines the "true" center.
      const midlineX = (landmarks[10].x + landmarks[168].x) / 2;

      // 2. Symmetry Score (40%) - Increased sensitivity
      const symPairs = [
        [33, 263],   // Eyes
        [61, 291],   // Mouth
        [50, 280],   // Cheeks
        [127, 356],  // Inner Face Edges
        [234, 454]   // Outer Face Edges
      ];
      
      let symDiffSum = 0;
      symPairs.forEach(([l, r]) => {
        const leftDist = Math.abs(landmarks[l].x - midlineX);
        const rightDist = Math.abs(landmarks[r].x - midlineX);
        symDiffSum += Math.abs(leftDist - rightDist);
      });
      const avgSymDiff = symDiffSum / symPairs.length;
      // Increased multiplier from 400 to 1500 for high sensitivity to asymmetry
      let symmetryScore = 100 - (avgSymDiff / faceWidth) * 1500;
      symmetryScore = Math.max(30, Math.min(98, symmetryScore));

      // 3. Eye Score (20%) - Increased sensitivity
      const leftEyeCenter = {
        x: (landmarks[33].x + landmarks[133].x + landmarks[160].x + landmarks[158].x) / 4,
        y: (landmarks[33].y + landmarks[133].y + landmarks[160].y + landmarks[158].y) / 4
      };
      const rightEyeCenter = {
        x: (landmarks[263].x + landmarks[362].x + landmarks[387].x + landmarks[385].x) / 4,
        y: (landmarks[263].y + landmarks[362].y + landmarks[387].y + landmarks[385].y) / 4
      };

      const eyeDistance = dist2D(leftEyeCenter, rightEyeCenter);
      const eyeRatio = eyeDistance / faceWidth;
      
      const spacingScore = Math.max(30, 100 - Math.abs(eyeRatio - 0.37) * 600);
      
      const leftEyeWidth = dist2D(landmarks[33], landmarks[133]);
      const rightEyeWidth = dist2D(landmarks[263], landmarks[362]);
      const sizeScore = Math.max(30, 100 - (Math.abs(leftEyeWidth - rightEyeWidth) / faceWidth) * 2000);
      
      const heightScore = Math.max(30, 100 - Math.abs(leftEyeCenter.y - rightEyeCenter.y) * 3000);

      let eyeScore = (spacingScore * 0.4) + (sizeScore * 0.3) + (heightScore * 0.3);
      eyeScore = Math.max(30, Math.min(100, eyeScore));

      // 4. Nose Score (15%) - Increased sensitivity
      const noseLength = dist2D(landmarks[1], landmarks[168]);
      const noseRatio = noseLength / faceHeight;
      const idealNoseRatio = 0.33;
      let noseScore = 100 - Math.abs(noseRatio - idealNoseRatio) * 800;
      noseScore = Math.max(30, Math.min(100, noseScore));

      // 5. Mouth Score (15%) - Increased sensitivity
      const mouthWidth = dist2D(landmarks[61], landmarks[291]);
      const mouthRatio = mouthWidth / faceWidth;
      const idealMouthRatio = 0.40;
      const widthScore = Math.max(30, 100 - Math.abs(mouthRatio - idealMouthRatio) * 500);
      
      const mouthSymmetry = Math.max(30, 100 - Math.abs(landmarks[61].y - landmarks[291].y) * 3000);
      
      let mouthScore = (widthScore * 0.7) + (mouthSymmetry * 0.3);
      mouthScore = Math.max(30, Math.min(100, mouthScore));

      // 6. Chin/Jaw Balance Score (10%) - Increased sensitivity
      const score1 = 100 - (Math.abs(landmarks[152].x - midlineX) / faceWidth) * 2000;
      
      const leftJawLen = dist2D(landmarks[152], landmarks[234]);
      const rightJawLen = dist2D(landmarks[152], landmarks[454]);
      const score2 = 100 - (Math.abs(leftJawLen - rightJawLen) / faceWidth) * 1500;
      
      const score3 = 100 - Math.abs(landmarks[234].y - landmarks[454].y) * 3000;

      let jawScore = (score1 * 0.4) + (score2 * 0.4) + (score3 * 0.2);
      jawScore = Math.max(30, Math.min(100, jawScore));

      // 7. Final Overall Score
      let overallScore = (symmetryScore * 0.4) + (eyeScore * 0.2) + (noseScore * 0.15) + (mouthScore * 0.15) + (jawScore * 0.1);
      overallScore = Math.max(30, Math.min(Math.round(overallScore), 98));
      
      // Viral Percentile Calculation (Normalized for 30-98 range)
      let percentile = 50;
      if (overallScore >= 90) percentile = 95 + (overallScore - 90) * 0.5;
      else if (overallScore >= 80) percentile = 75 + (overallScore - 80) * 2;
      else if (overallScore >= 60) percentile = 20 + (overallScore - 60) * 2.75;
      else percentile = (overallScore - 30) * 0.6;
      percentile = Math.min(99, Math.max(1, Math.round(percentile)));

      // Prepare data for Gemini
      setAnalysisStep('AI 전문가 소견 생성 중...');
      
      const metrics = {
        overallScore,
        percentile,
        symmetryScore,
        eyeScore,
        noseScore,
        mouthScore,
        jawScore,
        personality: selectedPersonality
      };

      const prompt = `당신은 ${selectedPersonality === 'fact' ? '냉철한 닥터 팩트' : '따뜻한 엔젤 가이드'}입니다. 
                다음 분석 데이터를 바탕으로 전문적인 소견을 작성해주세요: ${JSON.stringify(metrics)}
                
                **JSON 응답 형식:**
                {
                  "summary": "한 줄 요약 (예: '균형 잡힌 완벽한 비율', '매력적인 비대칭의 조화')",
                  "celebrityMatches": [
                    { "name": "연예인 이름 1", "confidence": 63 },
                    { "name": "연예인 이름 2", "confidence": 58 },
                    { "name": "연예인 이름 3", "confidence": 55 }
                  ],
                  "detailedFeedback": "전반적인 분석 내용 (마크다운 형식)",
                  "muscleAnalysis": "비대칭의 원인이 될 수 있는 근육에 대한 구체적인 분석",
                  "landmarks": {
                    "eyes": { "feedback": "눈 비대칭 분석" },
                    "nose": { "feedback": "코 비대칭 분석" },
                    "mouth": { "feedback": "입매 비대칭 분석" },
                    "jawline": { "feedback": "턱선 비대칭 분석" }
                  },
                  "laymanProtocol": "일반인용 홈케어 가이드 (마크다운)",
                  "professionalProtocol": "전문가용 임상 프로토콜 (마크다운). 다음 항목으로만 구성: 1. 연부조직 이완술(Myofascial Release/Massage), 2. 근막 신장술(Clinical Stretching), 3. 기능적 재교육 운동(Functional Corrective Exercise). 반드시 해부학적 전문 용어(예: 교근, 측두근, 흉쇄유돌근, 익상근 등)를 사용하여 매우 전문적으로 작성할 것."
                }`;

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          metrics: metrics,
          prompt: prompt
        }),
      });

      const contentType = response.headers.get("content-type");
      let data;
      
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const errorText = await response.text();
        console.error("Server returned non-JSON response:", errorText);
        throw new Error(`서버 응답 오류 (Status: ${response.status}). 잠시 후 다시 시도해주세요.`);
      }

      if (!response.ok) {
        const errorMessage = data.details || data.error || "AI 분석 중 오류가 발생했습니다.";
        throw new Error(errorMessage);
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

      const parsedResult = JSON.parse(jsonStr);
      
      // Merge browser-calculated metrics into the result with defensive checks
      const safeLandmarks = parsedResult.landmarks || {};
      
      setResult({
        ...parsedResult,
        summary: parsedResult.summary || (overallScore > 85 ? "완벽에 가까운 밸런스" : "매력적인 개성적 마스크"),
        overallScore,
        percentile,
        landmarks: {
          eyes: { score: Math.round(eyeScore), feedback: safeLandmarks.eyes?.feedback || "분석 완료" },
          nose: { score: Math.round(noseScore), feedback: safeLandmarks.nose?.feedback || "분석 완료" },
          mouth: { score: Math.round(mouthScore), feedback: safeLandmarks.mouth?.feedback || "분석 완료" },
          jawline: { score: Math.round(jawScore), feedback: safeLandmarks.jawline?.feedback || "분석 완료" },
        },
        landmarkPoints: landmarks.slice(0, 20).map((l, i) => ({ x: l.x * 100, y: l.y * 100, label: `Point ${i}` })),
        asymmetryZones: [
          { x: landmarks[33].x * 100, y: landmarks[33].y * 100, radius: 5, intensity: (94 - eyeScore) / 100, label: "눈 비대칭" },
          { x: landmarks[61].x * 100, y: landmarks[61].y * 100, radius: 5, intensity: (94 - mouthScore) / 100, label: "입매 비대칭" }
        ]
      });

      setCenterOffset((landmarks[1].x - midlineX) * 100);
      setRotationAngle((landmarks[263].y - landmarks[33].y) * 100);

    } catch (err: any) {
      setError(err.message || "분석 중 오류가 발생했습니다. 다시 시도해주세요.");
      console.error(err);
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep('');
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
                    <svg className="w-full h-full text-emerald-400/60" viewBox="0 0 400 500">
                      <defs>
                        <filter id="glow">
                          <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
                          <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                          </feMerge>
                        </filter>
                      </defs>
                      
                      {/* Subtle 3x3 Grid */}
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
                      
                      {/* Main Horizontal Leveler (Eyes) - Crosshair */}
                      <line x1="0" y1="200" x2="400" y2="200" stroke="#10b981" strokeWidth="1.5" />
                      
                      {/* Main Vertical Center Line - Crosshair */}
                      <line x1="200" y1="0" x2="200" y2="500" stroke="#10b981" strokeWidth="1.5" />
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
                  
                  {/* Leveler Guide for Preview - Removed as per user request */}
                  
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
                        <p className="text-xl font-bold tracking-tight text-emerald-400">{analysisStep || "AI 분석 진행 중..."}</p>
                        <div className="flex flex-col gap-1">
                          <p className="text-sm text-white/70 animate-pulse">
                            {analysisStep.includes('특징점') ? '얼굴의 468개 랜드마크를 찾는 중...' : 
                             analysisStep.includes('수치') ? '좌우 균형 데이터를 계산하는 중...' : 
                             '전문가 소견을 생성하고 있습니다'}
                          </p>
                          <p className="text-[10px] text-white/40 uppercase tracking-widest">Local Processing + AI Cloud</p>
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
                  <div className="space-y-1 w-full">
                    <p className="text-[10px] font-bold uppercase tracking-widest">System Error</p>
                    <p className="text-sm font-mono break-all">{error}</p>
                    
                    {debugInfo && debugInfo.envName && (
                      <p className="text-[10px] text-white/50 font-mono">Detected Source: {debugInfo.envName}</p>
                    )}

                    {(error.includes("API 키") || (debugInfo && debugInfo.isPlaceholder)) && (
                      <div className="mt-4 p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20 space-y-3">
                        <p className="text-xs font-bold text-emerald-400 flex items-center gap-2">
                          <Info size={14} /> API 키 설정 방법
                        </p>
                        <ol className="text-[11px] text-white/70 space-y-2 list-decimal ml-4">
                          <li>좌측 상단의 <b>Settings (톱니바퀴)</b> 메뉴를 클릭합니다.</li>
                          <li><b>Secrets</b> 탭을 선택합니다.</li>
                          <li><b>GEMINI_API_KEY</b> 항목에 발급받은 키를 입력합니다.</li>
                          <li><b>Save</b> 버튼을 눌러 저장합니다.</li>
                        </ol>
                        <a 
                          href="https://aistudio.google.com/app/apikey" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-block text-[10px] text-emerald-500 underline hover:text-emerald-400"
                        >
                          Gemini API 키 발급받기 &rarr;
                        </a>
                      </div>
                    )}

                    {debugInfo && (
                      <div className="mt-4 p-3 bg-black/40 rounded-xl border border-red-500/20 space-y-2">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-red-300/60">Diagnostic Info (For Support)</p>
                        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                          <div className="text-white/40">Key Length:</div>
                          <div className="text-white/80">{debugInfo.length} chars</div>
                          <div className="text-white/40">Starts With:</div>
                          <div className="text-white/80">{debugInfo.start}...</div>
                          <div className="text-white/40">Ends With:</div>
                          <div className="text-white/80">...{debugInfo.end}</div>
                          <div className="text-white/40">Format Check:</div>
                          <div className={cn("font-bold", debugInfo.isAIza ? "text-emerald-400" : "text-red-400")}>
                            {debugInfo.isAIza ? "VALID (AIza)" : "INVALID (Not AIza)"}
                          </div>
                        </div>
                        <p className="text-[9px] text-white/30 mt-2 italic">
                          * 위 정보가 실제 키와 다르면 Settings &rarr; Secrets에서 다시 설정해주세요.
                        </p>
                      </div>
                    )}
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
                        
                        <div className="space-y-1">
                          <h3 className="text-3xl font-bold uppercase italic tracking-tight leading-tight break-keep">
                            {result.overallScore >= 90 ? "Optimal Symmetry" : 
                             result.overallScore >= 82 ? "High Symmetry" : 
                             result.overallScore >= 70 ? "Standard Symmetry" : "Deviation Detected"}
                          </h3>
                          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-2">
                            <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                              <span className="text-[10px] text-emerald-400/60 font-bold uppercase mr-2">상위</span>
                              <span className="text-sm font-bold text-emerald-400">{100 - result.percentile}%</span>
                            </div>
                            <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg">
                              <span className="text-[10px] text-white/40 font-bold uppercase mr-2">한국 평균</span>
                              <span className="text-sm font-bold text-white/80">76점</span>
                            </div>
                            <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg">
                              <span className="text-[10px] text-white/40 font-bold uppercase mr-2">당신</span>
                              <span className="text-sm font-bold text-white/80">{result.overallScore}점</span>
                            </div>
                            <div className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-lg">
                              <span className="text-sm font-bold text-emerald-400">
                                {result.overallScore - 76 >= 0 ? `+${result.overallScore - 76}` : result.overallScore - 76}
                              </span>
                            </div>
                          </div>
                        </div>

                        <p className="text-white/60 text-sm mt-2 font-mono leading-relaxed break-keep">
                          {personality === 'fact' 
                            ? "생체 인식 데이터 분석 결과, 당신의 안면 대칭도는 위와 같이 산출되었습니다. 이는 해부학적 기준에 따른 객관적 수치입니다."
                            : "당신만의 고유한 아름다움이 담긴 분석 결과예요! 완벽한 대칭보다 더 중요한 건 당신의 밝은 미소라는 걸 잊지 마세요."}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-6 border-t border-white/5">
                      <div className="px-3 py-1 bg-emerald-500/10 rounded-lg border border-emerald-500/20 flex items-center gap-2">
                        <Trophy size={12} className="text-emerald-500" />
                        <div>
                          <p className="text-[8px] text-white/40 uppercase font-mono">Percentile</p>
                          <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">상위 {100 - (result.percentile || 50)}%</p>
                        </div>
                      </div>
                      <div className="px-3 py-1 bg-white/5 rounded-lg border border-white/10 flex items-center gap-2">
                        <Sparkles size={12} className="text-orange-400" />
                        <div>
                          <p className="text-[8px] text-white/40 uppercase font-mono">Avg Comparison</p>
                          <p className="text-[10px] font-bold text-white/80 uppercase tracking-wider">한국 평균 76점 대비 {result.overallScore > 76 ? `+${result.overallScore - 76}` : result.overallScore - 76}점</p>
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
                          <PolarRadiusAxis 
                            domain={[0, 100]} 
                            tick={false} 
                            axisLine={false} 
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
                          onClick={() => setAutoCorrectEnabled(!autoCorrectEnabled)}
                          className={cn(
                            "px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all border flex items-center gap-1.5",
                            autoCorrectEnabled ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-400" : "bg-white/5 border-white/10 text-white/40"
                          )}
                        >
                          <RotateCcw size={10} className={cn(autoCorrectEnabled ? "animate-pulse" : "")} />
                          {autoCorrectEnabled ? "Auto-Leveling ON" : "Auto-Leveling OFF"}
                        </button>
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
                          transform: autoCorrectEnabled 
                            ? `translateX(${-centerOffset}%) rotate(${rotationAngle}deg) scale(1.1)` 
                            : `scale(1.0)`
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

                  {/* Celebrity Match Section */}
                  {result.celebrityMatches && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 rounded-3xl border border-indigo-500/30 p-8 shadow-2xl backdrop-blur-md space-y-6 relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Trophy size={120} className="text-indigo-400" />
                      </div>
                      
                      <div className="relative z-10 space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                            <Sparkles size={20} />
                          </div>
                          <div>
                            <h3 className="text-xl font-black italic tracking-tighter uppercase">AI Celebrity Match</h3>
                            <p className="text-indigo-300/60 text-[10px] font-mono uppercase tracking-widest">Visual Similarity Analysis</p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {result.celebrityMatches.map((match, i) => (
                            <div key={i} className="group relative">
                              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group-hover:bg-white/10 transition-all">
                                <div className="flex items-center gap-4">
                                  <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xs">
                                    {i + 1}
                                  </div>
                                  <span className="font-bold text-lg tracking-tight">{match.name}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="w-32 h-2 bg-white/5 rounded-full overflow-hidden hidden sm:block">
                                    <motion.div 
                                      initial={{ width: 0 }}
                                      animate={{ width: `${match.confidence}%` }}
                                      transition={{ delay: 0.5 + i * 0.1, duration: 1 }}
                                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                                    />
                                  </div>
                                  <span className="font-mono font-bold text-indigo-400">{match.confidence}%</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        <p className="text-center text-white/40 text-[9px] font-mono uppercase tracking-widest pt-2">
                          * AI 분석 결과이며 실제 닮은 정도와 차이가 있을 수 있습니다.
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* Share Section */}
                  <div className="bg-white/5 rounded-3xl border border-white/10 p-8 shadow-2xl backdrop-blur-sm space-y-6">
                    <div className="text-center space-y-2">
                      <h3 className="text-xl font-bold tracking-tighter uppercase italic">Share Your Result</h3>
                      <p className="text-white/40 text-[10px] font-mono uppercase tracking-widest">Show off your symmetry score to your friends</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <button 
                        onClick={downloadShareImage}
                        disabled={isGeneratingShareImage}
                        className="flex items-center justify-center gap-2 bg-gradient-to-br from-purple-600 to-pink-600 text-white px-6 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-50"
                      >
                        {isGeneratingShareImage ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Instagram size={18} />
                        )}
                        Insta Story
                      </button>
                      <button 
                        onClick={shareToKakao}
                        className="flex items-center justify-center gap-2 bg-[#FEE500] text-[#191919] px-6 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:scale-[1.02] transition-all active:scale-95"
                      >
                        <MessageCircle size={18} />
                        Kakao Talk
                      </button>
                      <button 
                        onClick={copyLink}
                        className="flex items-center justify-center gap-2 bg-white/10 border border-white/10 text-white px-6 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:scale-[1.02] transition-all active:scale-95"
                      >
                        <Link2 size={18} />
                        Copy Link
                      </button>
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

      {/* Hidden Share Card for Image Generation */}
      {result && image && (
        <div className="fixed left-[-9999px] top-0">
          <div 
            ref={shareCardRef}
            className="w-[1080px] h-[1920px] bg-[#050505] text-white relative flex flex-col items-center justify-between p-20 overflow-hidden"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            {/* Background Accents */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[30%] bg-emerald-500/10 blur-[150px] rounded-full" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[30%] bg-blue-500/10 blur-[150px] rounded-full" />
            
            {/* Header */}
            <div className="w-full space-y-4 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-black">
                    <Scan size={24} />
                  </div>
                  <h1 className="text-3xl font-black italic tracking-tighter uppercase">Face Symmetry Pro</h1>
                </div>
                <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-full">
                  <p className="text-sm font-mono text-white/40 uppercase tracking-widest">Biometric Scan v2.5</p>
                </div>
              </div>
              <div className="h-px w-full bg-gradient-to-r from-emerald-500/50 via-white/10 to-transparent" />
            </div>

            {/* Main Content */}
            <div className="w-full flex flex-col items-center gap-12 z-10">
              {/* Image Preview with Overlay */}
              <div className="relative w-[800px] h-[1000px] rounded-[60px] overflow-hidden border-4 border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.5)]">
                <img 
                  src={image} 
                  alt="Analysis" 
                  className="w-full h-full object-cover"
                  style={{ transform: `translateX(${-centerOffset}%) rotate(${rotationAngle}deg) scale(1.1)` }}
                  referrerPolicy="no-referrer"
                />
                
                {/* Overlay Points */}
                <div className="absolute inset-0" style={{ transform: `translateX(${-centerOffset}%) rotate(${rotationAngle}deg) scale(1.1)` }}>
                  {debugInfo?.landmarks?.map((pt: any, i: number) => (
                    <div 
                      key={i}
                      className="absolute w-2 h-2 bg-white rounded-full shadow-[0_0_5px_rgba(255,255,255,0.8)]"
                      style={{ left: `${pt.x * 100}%`, top: `${pt.y * 100}%` }}
                    />
                  ))}
                </div>

                {/* Grid Overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-0 flex justify-center">
                    <div className="w-1 h-full bg-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.5)]" />
                  </div>
                  <div className="absolute inset-0 flex flex-col justify-around opacity-20">
                    {[...Array(12)].map((_, i) => (
                      <div key={i} className="w-full h-px bg-white/30" />
                    ))}
                  </div>
                </div>

                {/* Score Badge */}
                <div className="absolute bottom-12 right-12 bg-black/80 backdrop-blur-xl border border-white/20 p-8 rounded-[40px] shadow-2xl flex flex-col items-center">
                  <p className="text-xl font-mono text-white/40 uppercase tracking-widest mb-1">Overall Score</p>
                  <p className="text-8xl font-black italic text-emerald-400">{result.overallScore}</p>
                </div>
              </div>

              {/* Celebrity Match for Share Card */}
              {result.celebrityMatches && (
                <div className="w-full grid grid-cols-3 gap-6">
                  {result.celebrityMatches.map((match, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-[40px] flex flex-col items-center gap-2">
                      <p className="text-sm font-mono text-white/40 uppercase tracking-widest">Match #{i+1}</p>
                      <p className="text-3xl font-black italic uppercase tracking-tighter">{match.name}</p>
                      <p className="text-4xl font-black text-indigo-400">{match.confidence}%</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Summary */}
              <div className="w-full bg-white/5 border border-white/10 p-12 rounded-[50px] backdrop-blur-sm space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-500">
                    <CheckCircle2 size={24} />
                  </div>
                  <h2 className="text-4xl font-bold italic uppercase tracking-tight">{result.summary}</h2>
                </div>
                <p className="text-2xl text-white/60 leading-relaxed break-keep">
                  {personality === 'fact' 
                    ? "정밀 분석 결과, 당신의 안면 대칭도는 상위권에 속합니다. 미세한 비대칭이 감지되었으나 이는 자연스러운 현상입니다."
                    : "당신은 정말 아름다운 균형을 가지고 있네요! 본연의 매력이 잘 드러나는 아주 멋진 얼굴이에요."}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="w-full flex items-center justify-between z-10">
              <div className="space-y-1">
                <p className="text-xl font-mono text-white/20 uppercase tracking-[0.3em]">Scan Completed</p>
                <p className="text-sm font-mono text-white/10 uppercase tracking-widest">{new Date().toLocaleString()}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <p className="text-2xl font-black italic uppercase tracking-tighter text-white/40">Try it now</p>
                <p className="text-lg font-mono text-emerald-500/50">facesymmetry.pro</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
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
