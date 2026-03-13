import React, { useState, useRef, useCallback, useEffect } from 'react';
import { analyzeLocally, type AnalysisResult } from "./services/analysisEngine";
import { Camera, Upload, RefreshCw, RotateCcw, Scan, AlertCircle, CheckCircle2, Info, ChevronRight, Maximize2, ShieldCheck, BarChart3, FlipHorizontal, Zap, Trophy, MessageCircle, Link2, Download, User, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import * as faceMesh from '@mediapipe/face_mesh';
import { toPng } from 'html-to-image';

const { FACEMESH_TESSELATION } = faceMesh;

const FaceMeshCanvas = ({ landmarks, width, height }: { landmarks: any[], width: number, height: number }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !landmarks) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    
    // Draw Tessellation
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 0.5;
    
    if (FACEMESH_TESSELATION) {
      for (const edge of FACEMESH_TESSELATION) {
        const p1 = landmarks[edge[0]];
        const p2 = landmarks[edge[1]];
        if (p1 && p2) {
          ctx.moveTo(p1.x * width, p1.y * height);
          ctx.lineTo(p2.x * width, p2.y * height);
        }
      }
    }
    ctx.stroke();

    // Draw Points
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    for (const pt of landmarks) {
      ctx.beginPath();
      ctx.arc(pt.x * width, pt.y * height, 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [landmarks, width, height]);

  return (
    <canvas 
      ref={canvasRef} 
      width={width} 
      height={height} 
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
};


// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFakeScanning, setIsFakeScanning] = useState(false);
  const [scanningLandmarks, setScanningLandmarks] = useState<any[] | null>(null);
  const [autoCorrectEnabled, setAutoCorrectEnabled] = useState(true);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [centerOffset, setCenterOffset] = useState(0); // percentage offset from center
  const [rotationAngle, setRotationAngle] = useState(0); // degrees
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [personality, setPersonality] = useState<'fact' | 'angel'>('fact');
  const [analysisStep, setAnalysisStep] = useState<string>('');
  const [faceMeshLoaded, setFaceMeshLoaded] = useState(false);
  const [isGeneratingShareImage, setIsGeneratingShareImage] = useState(false);
  const [imageAspectRatio, setImageAspectRatio] = useState<number>(1);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [reportStep, setReportStep] = useState(0);

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
          minDetectionConfidence: 0.35,
          minTrackingConfidence: 0.35
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
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Ensure video has dimensions
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        console.warn("Video dimensions not ready yet");
        return;
      }

      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setImage(dataUrl);
        stopCamera();
        analyzeImage(dataUrl, personality);
      }
    } else {
      console.error("Refs not ready:", { video: !!videoRef.current, canvas: !!canvasRef.current });
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

  const enhanceImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(base64Str);
          return;
        }
        // Apply brightness and contrast boost for better detection
        ctx.filter = 'brightness(1.2) contrast(1.1) saturate(1.1)';
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      img.onerror = () => resolve(base64Str);
      img.src = base64Str;
    });
  };

  const generateSoftSymmetry = async (
    imgSrc: string,
    landmarks: any[],
    width: number,
    height: number
  ): Promise<string> => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return imgSrc;

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = imgSrc;
      await img.decode();

      // 1. Face Alignment
      const leftEye = landmarks[33];
      const rightEye = landmarks[263];
      const angle = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);

      // 2. Robust Midline Detection
      // glabella: 168, nose tip: 1, philtrum: 164, chin: 152
      const midlinePoints = [landmarks[168], landmarks[1], landmarks[164], landmarks[152]];
      const midlineX = (midlinePoints.reduce((sum, p) => sum + p.x, 0) / midlinePoints.length) * width;

      // Draw original aligned
      ctx.save();
      ctx.translate(midlineX, height / 2);
      ctx.rotate(-angle);
      ctx.translate(-midlineX, -height / 2);
      ctx.drawImage(img, 0, 0, width, height);
      ctx.restore();
      
      const alignedData = ctx.getImageData(0, 0, width, height);
      
      // Create mirrored version in memory
      const mirroredCanvas = document.createElement('canvas');
      mirroredCanvas.width = width;
      mirroredCanvas.height = height;
      const mCtx = mirroredCanvas.getContext('2d');
      if (!mCtx) return imgSrc;

      mCtx.save();
      mCtx.translate(midlineX, 0);
      mCtx.scale(-1, 1);
      mCtx.translate(-midlineX, 0);
      mCtx.drawImage(canvas, 0, 0);
      mCtx.restore();

      const mirroredData = mCtx.getImageData(0, 0, width, height);
      const resultData = ctx.createImageData(width, height);

      // 3, 4, 5. Soft Symmetry Blending with Feathering
      const blendWidth = width * 0.1; // 10% width for feathering
      const symmetryInfluence = 0.3; // 30% influence as requested

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          const distToMidline = Math.abs(x - midlineX);
          
          // blendFactor: 0 at midline, 1 at blendWidth
          const featherFactor = Math.min(1, distToMidline / blendWidth);
          
          // Soft blend: 70% original, 30% mirrored
          const influence = symmetryInfluence; 
          
          for (let i = 0; i < 3; i++) { // RGB
            const original = alignedData.data[idx + i];
            const mirrored = mirroredData.data[idx + i];
            resultData.data[idx + i] = original * (1 - influence) + mirrored * influence;
          }
          resultData.data[idx + 3] = 255;
        }
      }

      ctx.putImageData(resultData, 0, 0);
      return canvas.toDataURL('image/jpeg', 0.85);
    } catch (e) {
      console.error("Soft symmetry generation failed", e);
      return imgSrc;
    }
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

      const resizedImage = await resizeImage(base64Image, 1024);
      
      // Get image aspect ratio for correct overlay alignment
      const imgInfo = new Image();
      imgInfo.src = resizedImage;
      await imgInfo.decode();
      setImageAspectRatio(imgInfo.width / imgInfo.height);
      setImageDimensions({ width: imgInfo.width, height: imgInfo.height });

      const runFaceMesh = async (imgSrc: string): Promise<faceMesh.Results> => {
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = imgSrc;
        });

        return new Promise((resolve, reject) => {
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
      };

      // 1. First Attempt
      let faceResults = await runFaceMesh(resizedImage);

      // 2. If failed, try with enhanced image
      if (!faceResults || !faceResults.multiFaceLandmarks || faceResults.multiFaceLandmarks.length === 0) {
        setAnalysisStep('이미지 보정 후 재분석 중...');
        const enhancedImage = await enhanceImage(resizedImage);
        faceResults = await runFaceMesh(enhancedImage);
      }

      if (!faceResults || !faceResults.multiFaceLandmarks || faceResults.multiFaceLandmarks.length === 0) {
        throw new Error("사진에서 얼굴을 찾을 수 없습니다. 얼굴이 잘 보이도록 정면에서 밝은 곳에서 찍은 사진을 사용해주세요.");
      }

      setAnalysisStep('대칭성 수치 계산 중...');
      const rawLandmarks = faceResults.multiFaceLandmarks[0];
      setScanningLandmarks(rawLandmarks);
      
      // 1. Face Alignment (Roll Correction)
      const dist2D = (p1: any, p2: any) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
      
      const leftEyeCenter = {
        x: (rawLandmarks[33].x + rawLandmarks[133].x) / 2,
        y: (rawLandmarks[33].y + rawLandmarks[133].y) / 2
      };
      const rightEyeCenter = {
        x: (rawLandmarks[263].x + rawLandmarks[362].x) / 2,
        y: (rawLandmarks[263].y + rawLandmarks[362].y) / 2
      };
      const eyeCenterMid = {
        x: (leftEyeCenter.x + rightEyeCenter.x) / 2,
        y: (leftEyeCenter.y + rightEyeCenter.y) / 2
      };
      const rollAngle = Math.atan2(rightEyeCenter.y - leftEyeCenter.y, rightEyeCenter.x - leftEyeCenter.x);

      // Rotate all landmarks to align eyes horizontally
      const alignedLandmarks = rawLandmarks.map((p: any) => {
        const tx = p.x - eyeCenterMid.x;
        const ty = p.y - eyeCenterMid.y;
        const rx = tx * Math.cos(-rollAngle) - ty * Math.sin(-rollAngle);
        const ry = tx * Math.sin(-rollAngle) + ty * Math.cos(-rollAngle);
        return { x: rx, y: ry, z: p.z };
      });

      // 2. Midline Regression (Best fit vertical line through central points)
      const centralIndices = [8, 1, 2, 152];
      const midlineX = centralIndices.reduce((sum, idx) => sum + alignedLandmarks[idx].x, 0) / centralIndices.length;

      // 3. Normalization Factor (Face Width)
      const faceWidth = dist2D(alignedLandmarks[234], alignedLandmarks[454]);
      const faceHeight = dist2D(alignedLandmarks[10], alignedLandmarks[152]);

      // 4. Symmetry Error Calculation by Region
      // Formula: score = 100 * exp(-k * normalizedError)
      const calculateRegionScore = (pairs: number[][], k: number) => {
        let errorSum = 0;
        pairs.forEach(([l, r]) => {
          const distL = Math.abs(alignedLandmarks[l].x - midlineX);
          const distR = Math.abs(alignedLandmarks[r].x - midlineX);
          const heightDiff = Math.abs(alignedLandmarks[l].y - alignedLandmarks[r].y);
          errorSum += (Math.abs(distL - distR) / faceWidth) + (heightDiff / faceWidth);
        });
        const avgError = errorSum / (pairs.length * 2);
        return Math.max(30, Math.min(100, Math.round(100 * Math.exp(-k * avgError))));
      };

      const eyePairs = [[33, 263], [133, 362], [159, 386], [145, 374]];
      const browPairs = [[70, 300], [105, 334], [63, 293], [107, 336]];
      const mouthPairs = [[61, 291], [78, 308], [95, 324], [82, 312]];
      const jawPairs = [[234, 454], [172, 397], [150, 379], [132, 361]];

      const eyeScore = calculateRegionScore(eyePairs, 15);
      const browsScore = calculateRegionScore(browPairs, 12);
      const mouthScore = calculateRegionScore(mouthPairs, 18);
      const jawScore = calculateRegionScore(jawPairs, 10);

      // 5. Overall Symmetry Score (Weighted)
      const overallScore = Math.round((eyeScore * 0.35) + (browsScore * 0.15) + (mouthScore * 0.20) + (jawScore * 0.30));
      const symmetryScore = overallScore;

      // 6. Other Metrics for Engine
      const noseLength = dist2D(alignedLandmarks[1], alignedLandmarks[168]);
      const mouthWidth = dist2D(alignedLandmarks[61], alignedLandmarks[291]);
      const eyeDistance = dist2D(leftEyeCenter, rightEyeCenter);
      
      const foreheadHeight = dist2D(alignedLandmarks[10], alignedLandmarks[168]);
      const foreheadWidth = dist2D(alignedLandmarks[103], alignedLandmarks[332]);
      const philtrumLength = dist2D(alignedLandmarks[2], alignedLandmarks[0]);
      const eyeWidth = (dist2D(alignedLandmarks[33], alignedLandmarks[133]) + dist2D(alignedLandmarks[263], alignedLandmarks[362])) / 2;
      const noseWidth = dist2D(alignedLandmarks[102], alignedLandmarks[331]);
      const lowerFaceHeight = dist2D(alignedLandmarks[164], alignedLandmarks[152]);

      const metrics = {
        overallScore,
        percentile: 50,
        symmetryScore,
        eyeScore,
        browsScore,
        mouthScore,
        jawScore,
        eyeDiff: Math.abs(dist2D(alignedLandmarks[33], alignedLandmarks[133]) - dist2D(alignedLandmarks[263], alignedLandmarks[362])) / faceWidth,
        browsDiff: Math.abs(alignedLandmarks[70].y - alignedLandmarks[300].y) / faceWidth,
        mouthDiff: Math.abs(alignedLandmarks[61].x - midlineX - (midlineX - alignedLandmarks[291].x)) / faceWidth,
        jawDiff: Math.abs(dist2D(alignedLandmarks[152], alignedLandmarks[234]) - dist2D(alignedLandmarks[152], alignedLandmarks[454])) / faceWidth,
        eyeSlant: Math.abs(alignedLandmarks[33].y - alignedLandmarks[263].y) / faceWidth,
        mouthSlant: Math.abs(alignedLandmarks[61].y - alignedLandmarks[291].y) / faceWidth,
        personality: personality,
        midline: midlineX,
        faceRatio: faceHeight / faceWidth,
        eyeDistanceRatio: eyeDistance / faceWidth,
        noseLengthRatio: noseLength / faceHeight,
        mouthWidthRatio: mouthWidth / faceWidth,
        jawWidthRatio: dist2D(alignedLandmarks[132], alignedLandmarks[361]) / faceWidth,
        cheekboneWidthRatio: dist2D(alignedLandmarks[127], alignedLandmarks[356]) / faceWidth,
        foreheadRatio: foreheadHeight / faceHeight,
        foreheadWidthRatio: foreheadWidth / faceWidth,
        philtrumLengthRatio: philtrumLength / faceHeight,
        eyeWidthRatio: eyeWidth / faceWidth,
        noseWidthRatio: noseWidth / faceWidth,
        lowerFaceRatio: lowerFaceHeight / faceHeight
      };

      // Recalculate percentile
      let percentile = 50;
      if (overallScore >= 90) percentile = 95 + (overallScore - 90) * 0.5;
      else if (overallScore >= 80) percentile = 75 + (overallScore - 80) * 2;
      else if (overallScore >= 60) percentile = 20 + (overallScore - 60) * 2.75;
      else percentile = (overallScore - 30) * 0.6;
      metrics.percentile = Math.min(99, Math.max(1, Math.round(percentile)));
      // 로컬 분석 엔진 사용
      const parsedResult = analyzeLocally(metrics);
      
      // 10. Start Fake Scanning Presentation (1.5s)
      setIsFakeScanning(true);
      const scanningSteps = [
        "Analyzing facial symmetry...",
        "Detecting landmarks...",
        "Calculating proportions..."
      ];
      
      for (let i = 0; i < scanningSteps.length; i++) {
        setAnalysisStep(scanningSteps[i]);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      setIsFakeScanning(false);
      setScanningLandmarks(null);

      // Generate Soft Symmetry Image
      const balancedImage = await generateSoftSymmetry(resizedImage, rawLandmarks, imgInfo.width, imgInfo.height);

      // Merge browser-calculated metrics into the result with defensive checks
      const safeLandmarks: any = parsedResult.landmarks || {};
      
      const overallBalance = Math.round((overallScore + (parsedResult.proportionScore || 80)) / 2);

      setResult({
        ...parsedResult,
        summary: parsedResult.summary,
        overallScore: overallBalance,
        symmetryScore: overallScore,
        percentile,
        balancedImage,
        landmarks: {
          eyes: { score: Math.round(eyeScore), status: safeLandmarks.eyes?.status || "분석 완료", feedback: safeLandmarks.eyes?.feedback || "분석 완료" },
          brows: { score: Math.round(browsScore), status: safeLandmarks.brows?.status || "분석 완료", feedback: safeLandmarks.brows?.feedback || "분석 완료" },
          mouth: { score: Math.round(mouthScore), status: safeLandmarks.mouth?.status || "분석 완료", feedback: safeLandmarks.mouth?.feedback || "분석 완료" },
          jawline: { score: Math.round(jawScore), status: safeLandmarks.jawline?.status || "분석 완료", feedback: safeLandmarks.jawline?.feedback || "분석 완료" },
        },
        asymmetryZones: [
          { x: rawLandmarks[33].x * 100, y: rawLandmarks[33].y * 100, radius: 6, intensity: Math.min(1, Math.max(0.7, (96 - eyeScore) / 20)), label: "EYE ASYMMETRY" },
          { x: rawLandmarks[70].x * 100, y: rawLandmarks[70].y * 100, radius: 5, intensity: Math.min(1, Math.max(0.7, (96 - browsScore) / 20)), label: "BROW ASYMMETRY" },
          { x: rawLandmarks[61].x * 100, y: rawLandmarks[61].y * 100, radius: 6, intensity: Math.min(1, Math.max(0.7, (96 - mouthScore) / 20)), label: "ORAL ASYMMETRY" },
          { x: rawLandmarks[234].x * 100, y: rawLandmarks[234].y * 100, radius: 8, intensity: Math.min(1, Math.max(0.6, (96 - jawScore) / 30)), label: "JAW ASYMMETRY" }
        ],
        rawLandmarks,
        metrics: {
          ...metrics,
          midline: (metrics.midline - eyeCenterMid.x) / faceWidth // Approximate for visualizer
        }
      });

      setCenterOffset((alignedLandmarks[1].x - midlineX) * 100);
      setRotationAngle((alignedLandmarks[263].y - alignedLandmarks[33].y) * 100);

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
    setReportStep(0);
  };

  const laymanMarkdownComponents = {
    ol: ({ children }: any) => <ol className="list-decimal list-inside space-y-3 m-0 w-full block min-w-0">{children}</ol>,
    li: ({ children }: any) => (
      <li className="text-white/80 leading-relaxed whitespace-normal break-words w-full block min-w-0">
        {children}
      </li>
    ),
    p: ({ children }: any) => <div className="whitespace-normal break-words w-full block min-w-0 mb-1">{children}</div>,
    strong: ({ children }: any) => <strong className="font-bold text-emerald-400 inline break-words min-w-0">{children}</strong>,
    pre: ({ children }: any) => <pre className="whitespace-pre-wrap break-words w-full block min-w-0 bg-transparent p-0 m-0">{children}</pre>,
    code: ({ children }: any) => <code className="whitespace-pre-wrap break-words inline-block min-w-0 bg-transparent p-0 m-0">{children}</code>
  };

  const professionalMarkdownComponents = {
    ol: ({ children }: any) => <ol className="list-decimal list-inside space-y-3 m-0 w-full block min-w-0">{children}</ol>,
    li: ({ children }: any) => (
      <li className="text-blue-100/80 leading-relaxed font-mono whitespace-normal break-words w-full block min-w-0">
        {children}
      </li>
    ),
    p: ({ children }: any) => <div className="font-mono whitespace-normal break-words w-full block min-w-0 mb-1">{children}</div>,
    strong: ({ children }: any) => <strong className="font-bold text-blue-300 inline break-words min-w-0">{children}</strong>,
    pre: ({ children }: any) => <pre className="whitespace-pre-wrap break-words w-full block min-w-0 bg-transparent p-0 m-0">{children}</pre>,
    code: ({ children }: any) => <code className="whitespace-pre-wrap break-words inline-block min-w-0 bg-transparent p-0 m-0">{children}</code>
  };

  return (
    <div className={cn(
      "bg-[#0A0A0B] text-white font-sans selection:bg-emerald-500/30 relative overflow-hidden",
      result ? "h-screen" : "min-h-screen"
    )}>
      {/* Technical Texture Overlay */}
      <div className="fixed inset-0 bg-grid-technical pointer-events-none" />
      <div className="fixed inset-0 bg-dot-technical opacity-30 pointer-events-none" />
      
      {/* Header */}
      <header className={cn(
        "sticky top-0 z-50 bg-[#0A0A0B]/80 backdrop-blur-xl border-b border-white/5 px-6 transition-all duration-500",
        result ? "py-3" : "py-4"
      )}>
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
          
          {!result && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 animate-in fade-in slide-in-from-top-2 duration-500">
              <div className="flex flex-col gap-2">
                <span className="text-[10px] tracking-[0.2em] font-bold text-white/40 px-1 uppercase">
                  Select Analyst
                </span>
                <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 w-full sm:w-auto">
                  <button
                    onClick={() => setPersonality('fact')}
                    className={cn(
                      "flex-1 sm:flex-none px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all",
                      personality === 'fact' 
                        ? "bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)]" 
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
          )}
        </div>
      </header>

      <main className={cn(
        "max-w-3xl mx-auto px-6 transition-all duration-500 flex flex-col",
        result ? "h-[calc(100dvh-60px)] py-1 overflow-hidden" : "py-12"
      )}>
        <div className={cn("space-y-8", result && "flex-1 flex flex-col min-h-0 space-y-4")}>
          
          {/* Input/Preview Section - Hidden when results are shown to save space */}
          {!result && (
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
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                  <canvas ref={canvasRef} className="hidden" />
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

                  {/* Mesh during Scanning */}
                  {scanningLandmarks && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div 
                        className="relative"
                        style={{ 
                          width: imageAspectRatio > 1 ? '100%' : `${imageAspectRatio * 100}%`,
                          aspectRatio: imageAspectRatio,
                          transform: `rotate(${rotationAngle}deg) scale(1.1)`
                        }}
                      >
                        <FaceMeshCanvas 
                          landmarks={scanningLandmarks} 
                          width={imageDimensions.width} 
                          height={imageDimensions.height} 
                        />
                      </div>
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
                    <div className={cn(
                      "absolute inset-0 flex flex-col items-center justify-center text-white space-y-6 z-50 overflow-hidden transition-all duration-500",
                      isFakeScanning ? "bg-black/20 backdrop-blur-[2px]" : "bg-black/60 backdrop-blur-md"
                    )}>
                      {/* Scan Line Animation */}
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute w-full h-[2px] bg-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.8)] animate-scan" />
                      </div>

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
        )}

        {/* Results Section */}
          {result && (
            <div className="flex-1 flex flex-col min-h-0">
              <AnimatePresence mode="wait">
                <motion.div 
                  key={`report-step-${reportStep}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="flex-1 flex flex-col min-h-0 gap-2"
                >
                  {/* Progress Indicator */}
                  <div className="flex items-center gap-1.5 px-2 shrink-0">
                    {[0, 1, 2, 3].map((step) => (
                      <div 
                        key={step} 
                        className={cn(
                          "h-1 flex-1 rounded-full transition-all duration-500",
                          step <= reportStep ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-white/10"
                        )}
                      />
                    ))}
                  </div>

                  <div className="flex-1 min-h-0 overflow-hidden">
                    {reportStep === 0 && (
                      <div className="flex flex-col gap-2 h-full min-h-0">
                        <div className="grid grid-cols-2 gap-2 shrink-0">
                          {/* Score Card */}
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5, delay: 0 }}
                            className="bg-white/5 rounded-2xl border border-white/10 p-3 shadow-xl backdrop-blur-sm flex flex-col justify-center items-center"
                          >
                            <div className="relative mb-1 shrink-0">
                              <div className="absolute -inset-2 bg-emerald-500/10 blur-xl rounded-full animate-pulse" />
                              <div className="relative">
                                <svg className="w-16 h-16 transform -rotate-90">
                                  <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/5" />
                                  <circle
                                    cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent"
                                    strokeDasharray={176}
                                    strokeDashoffset={176 - (176 * (result.overallScore || 0)) / 100}
                                    strokeLinecap="round"
                                    className="text-emerald-500 transition-all duration-1000 ease-out drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                                  />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                  <span className="text-xl font-bold tracking-tighter font-mono leading-none">{result.overallScore || 0}</span>
                                  <span className="text-[5px] font-bold text-white/30 uppercase tracking-widest mt-0.5">Balance Index</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="text-center space-y-1 shrink-0">
                              <h3 className="text-[7px] font-bold uppercase text-white/40 font-mono tracking-widest">Analysis Summary</h3>
                              <p className="text-[9px] font-bold text-white tracking-tight leading-tight px-1">{result.summary}</p>
                              
                              <div className="flex items-center justify-center gap-3 mt-1.5">
                                <div className="flex flex-col items-center">
                                  <span className="text-[5px] text-white/30 uppercase font-mono">Symmetry</span>
                                  <span className="text-[9px] font-bold text-emerald-400">{result.symmetryScore || 0}</span>
                                </div>
                                <div className="w-px h-4 bg-white/10" />
                                <div className="flex flex-col items-center">
                                  <span className="text-[5px] text-white/30 uppercase font-mono">Proportion</span>
                                  <span className="text-[9px] font-bold text-emerald-400">{result.proportionScore || 0}</span>
                                </div>
                              </div>

                              <div className="flex items-center justify-center gap-1 mt-1.5">
                                <div className="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-md">
                                  <span className="text-[7px] text-emerald-400/60 font-bold uppercase mr-1">상위</span>
                                  <span className="text-[10px] font-bold text-emerald-400">{100 - (result.percentile || 0)}%</span>
                                </div>
                              </div>
                            </div>
                          </motion.div>

                          {/* Face Shape & Strongest Features Card */}
                          <div className="bg-white/5 rounded-2xl border border-white/10 p-3 shadow-xl backdrop-blur-sm flex flex-col justify-center gap-2">
                            <motion.div 
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.5, delay: 0.4 }}
                              className="space-y-1"
                            >
                              <div className="flex items-center gap-1.5">
                                <Maximize2 size={12} className="text-emerald-400" />
                                <h3 className="text-[9px] font-bold uppercase tracking-widest text-white/40">Face Shape</h3>
                              </div>
                              <p className="text-[11px] font-bold text-white tracking-tight leading-tight">{result.faceShape || "분석 중..."}</p>
                            </motion.div>
                            
                            <div className="h-px bg-white/5 w-full" />

                            <motion.div 
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.5, delay: 0.8 }}
                              className="space-y-1.5"
                            >
                              <div className="flex items-center gap-1.5">
                                <Trophy size={12} className="text-emerald-400" />
                                <h3 className="text-[9px] font-bold uppercase tracking-widest text-white/40">Strongest Features</h3>
                              </div>
                              <div className="flex flex-col gap-1">
                                {result.strongestFeatures?.map((feature, i) => (
                                  <div key={i} className="flex items-center gap-1.5">
                                    <CheckCircle2 size={8} className="text-emerald-500 shrink-0" />
                                    <span className="text-[9px] text-white/80 font-medium leading-tight">
                                      {feature}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          </div>
                        </div>

                        {/* Symmetry Visualizer (Moved from Step 1 to Step 0 for better flow) */}
                        <div className="flex-1 min-h-0 bg-white/5 rounded-2xl border border-white/10 p-2 shadow-xl backdrop-blur-sm flex flex-col">
                          <div className="flex items-center justify-between mb-1 shrink-0 px-1">
                            <h3 className="text-[7px] font-bold uppercase tracking-[0.2em] text-white/40 font-mono">Visual Analysis</h3>
                            <div className="flex gap-1">
                              <button onClick={() => setAutoCorrectEnabled(!autoCorrectEnabled)} className={cn("p-0.5 rounded transition-all border", autoCorrectEnabled ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-400" : "bg-white/5 border-white/10 text-white/40")}>
                                <RotateCcw size={8} />
                              </button>
                              <button onClick={() => setShowOverlay(!showOverlay)} className={cn("p-0.5 rounded transition-all border", showOverlay ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" : "bg-white/5 border-white/10 text-white/40")}>
                                <Scan size={8} />
                              </button>
                            </div>
                          </div>

                          <div className="flex-1 relative rounded-xl overflow-hidden border border-white/10 bg-black flex items-center justify-center min-h-0">
                            <div 
                              className="relative transition-transform duration-500 ease-out"
                              style={{ 
                                width: imageAspectRatio > 1 ? '100%' : `${imageAspectRatio * 100}%`,
                                aspectRatio: imageAspectRatio,
                                transform: autoCorrectEnabled ? `translateX(${-centerOffset}%) rotate(${rotationAngle}deg) scale(1.1)` : `scale(1.0)`
                              }}
                            >
                              <img src={image || ''} alt="Analysis" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                              
                              {/* Mesh Overlay with Fade-in Transition */}
                              <div className={cn(
                                "absolute inset-0 pointer-events-none transition-opacity duration-300 ease-in-out",
                                showOverlay ? "opacity-100" : "opacity-0"
                              )}>
                                {result.rawLandmarks && (
                                  <FaceMeshCanvas 
                                    landmarks={result.rawLandmarks} 
                                    width={imageDimensions.width} 
                                    height={imageDimensions.height} 
                                  />
                                )}

                                {result.asymmetryZones?.map((zone, i) => (
                                  <div key={`zone-${i}`} className="absolute" style={{ left: `${zone.x}%`, top: `${zone.y}%`, width: `${zone.radius * 2}%`, height: `${zone.radius * 2}%`, marginLeft: `-${zone.radius}%`, marginTop: `-${zone.radius}%` }}>
                                    <motion.div 
                                      className="w-full h-full rounded-full" 
                                      style={{ background: `radial-gradient(circle, rgba(239, 68, 68, ${zone.intensity}) 0%, rgba(239, 68, 68, 0) 80%)` }} 
                                      animate={{ scale: [1, 1.1, 1], opacity: [zone.intensity, zone.intensity * 0.6, zone.intensity] }} 
                                      transition={{ duration: 2, repeat: Infinity }} 
                                    />
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                                      <span className="text-[5px] font-bold text-red-500 whitespace-nowrap tracking-tighter bg-black/20 px-0.5 rounded">
                                        {zone.label}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                            {result.metrics?.midline !== undefined && (
                              <div className="absolute inset-y-0 w-px bg-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.5)] z-10" style={{ left: `${result.metrics.midline * 100}%` }} />
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {reportStep === 1 && (
                      <div className="flex flex-col gap-2 h-full min-h-0">
                        {/* Radar Chart & Metrics */}
                        <div className="flex-1 flex flex-col gap-2 min-h-0">
                          <div className="bg-white/5 rounded-2xl border border-white/10 p-2 shadow-xl backdrop-blur-sm flex-1 flex flex-col min-h-0">
                            <h3 className="text-[7px] font-bold uppercase tracking-[0.2em] text-white/40 font-mono mb-0.5 shrink-0 px-1">Balance Chart</h3>
                            <div className="flex-1 min-h-0">
                              <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="65%" data={[
                                  { subject: '눈', A: result.landmarks.eyes.score },
                                  { subject: '눈썹', A: result.landmarks.brows.score },
                                  { subject: '입', A: result.landmarks.mouth.score },
                                  { subject: '턱', A: result.landmarks.jawline.score },
                                ]}>
                                  <PolarGrid stroke="rgba(255,255,255,0.1)" />
                                  <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 8 }} />
                                  <Radar name="Symmetry" dataKey="A" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                                </RadarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 shrink-0">
                            {[
                              { label: 'Eyes', score: result.landmarks.eyes.score, status: result.landmarks.eyes.status, feedback: result.landmarks.eyes.feedback },
                              { label: 'Brows', score: result.landmarks.brows.score, status: result.landmarks.brows.status, feedback: result.landmarks.brows.feedback },
                              { label: 'Mouth', score: result.landmarks.mouth.score, status: result.landmarks.mouth.status, feedback: result.landmarks.mouth.feedback },
                              { label: 'Jaw', score: result.landmarks.jawline.score, status: result.landmarks.jawline.status, feedback: result.landmarks.jawline.feedback }
                            ].map((m, idx) => (
                              <div key={idx} className="bg-white/5 p-2 rounded-xl border border-white/10 flex flex-col gap-1">
                                <div className="flex justify-between items-center">
                                  <div className="flex flex-col">
                                    <span className="text-[7px] text-white/40 uppercase font-mono">{m.label}</span>
                                    <span className="text-[8px] font-bold text-emerald-400/80">{m.status}</span>
                                  </div>
                                  <span className="text-[10px] font-bold text-emerald-400">{m.score}</span>
                                </div>
                                <p className="text-[8px] text-white/60 leading-tight break-words whitespace-normal">
                                  {m.feedback}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {reportStep === 2 && (
                      <div className="flex flex-col gap-2 h-full min-h-0">
                        <div className="bg-white/5 rounded-2xl border border-white/10 p-3 shadow-xl backdrop-blur-sm flex-1 flex flex-col gap-3 min-h-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Zap size={12} className="text-amber-400" />
                            <h3 className="text-[8px] font-bold uppercase tracking-[0.2em] text-white/40 font-mono">Advanced Facial Metrics</h3>
                          </div>

                          <div className="space-y-3 overflow-y-auto pr-1 custom-scrollbar">
                            {/* Eye Spacing */}
                            <div className="space-y-1">
                              <div className="flex justify-between items-end">
                                <span className="text-[9px] font-bold text-white/80">Eye Spacing Ratio</span>
                                <span className="text-[11px] font-mono font-bold text-emerald-400">{result.advancedMetrics?.eyeSpacing.value.toFixed(2)}</span>
                              </div>
                              <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                                <p className="text-[8px] font-bold text-emerald-400/80 mb-0.5">{result.advancedMetrics?.eyeSpacing.status}</p>
                                <p className="text-[8px] text-white/60 leading-tight">{result.advancedMetrics?.eyeSpacing.feedback}</p>
                              </div>
                            </div>

                            {/* Facial Proportion */}
                            <div className="space-y-1">
                              <div className="flex justify-between items-end">
                                <span className="text-[9px] font-bold text-white/80">Facial Proportion (V)</span>
                                <span className="text-[11px] font-mono font-bold text-emerald-400">
                                  {result.advancedMetrics?.facialProportion.value.upper}:{result.advancedMetrics?.facialProportion.value.mid}:{result.advancedMetrics?.facialProportion.value.lower}
                                </span>
                              </div>
                              <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                                <p className="text-[8px] font-bold text-emerald-400/80 mb-0.5">{result.advancedMetrics?.facialProportion.status}</p>
                                <p className="text-[8px] text-white/60 leading-tight">{result.advancedMetrics?.facialProportion.feedback}</p>
                              </div>
                            </div>

                            {/* Face Ratio */}
                            <div className="space-y-1">
                              <div className="flex justify-between items-end">
                                <span className="text-[9px] font-bold text-white/80">Face Shape Ratio</span>
                                <span className="text-[11px] font-mono font-bold text-emerald-400">{result.advancedMetrics?.faceRatio.value.toFixed(2)}</span>
                              </div>
                              <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                                <p className="text-[8px] font-bold text-emerald-400/80 mb-0.5">{result.advancedMetrics?.faceRatio.status}</p>
                                <p className="text-[8px] text-white/60 leading-tight">{result.advancedMetrics?.faceRatio.feedback}</p>
                              </div>
                            </div>

                            {/* Balanced Face Visualization */}
                            <div className="mt-2 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <Sparkles size={10} className="text-emerald-400" />
                                  <h4 className="text-[8px] font-bold text-white/40 uppercase tracking-widest font-mono">Balanced Face (AI-Adjusted)</h4>
                                </div>
                                <span className="text-[7px] text-emerald-400/60 font-mono">30% Symmetry Influence</span>
                              </div>
                              <div className="relative aspect-[4/5] w-full rounded-2xl overflow-hidden border border-white/10 bg-black/20 group">
                                {result.balancedImage ? (
                                  <img 
                                    src={result.balancedImage} 
                                    alt="Balanced Face" 
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-white/20 text-[8px]">
                                    Generating balanced view...
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                                  <p className="text-[7px] text-white/60 leading-tight">
                                    AI가 분석한 이상적인 균형 상태를 시뮬레이션한 결과입니다. 자연스러운 개성을 유지하면서 대칭성을 미세하게 조정하였습니다.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {reportStep === 3 && (
                      <div className="flex flex-col gap-3 h-full min-h-0 w-full overflow-x-hidden min-w-0">
                        {/* Primary Imbalance */}
                        <div className="bg-emerald-500/10 rounded-3xl border border-emerald-500/20 p-3 shadow-2xl backdrop-blur-sm shrink-0 w-full min-w-0">
                          <div className="flex items-center gap-2 mb-1 w-full min-w-0">
                            <Zap size={12} className="text-emerald-400 shrink-0" />
                            <h4 className="text-[8px] font-bold text-emerald-400/60 uppercase tracking-[0.2em] font-mono truncate">주요 균형 포인트</h4>
                          </div>
                          <div className="grid grid-cols-1 min-w-0">
                            <p className="text-[11px] font-bold text-white leading-relaxed break-words whitespace-normal block box-border">
                              {result.primaryImbalance}
                            </p>
                          </div>
                        </div>

                        {/* Analysis Summary */}
                        <div className="bg-white/5 rounded-3xl border border-white/10 p-3 shadow-2xl backdrop-blur-sm shrink-0 w-full min-w-0">
                          <div className="flex items-center gap-2 mb-1 w-full min-w-0">
                            <BarChart3 size={12} className="text-emerald-500 shrink-0" />
                            <h4 className="text-[8px] font-bold text-white/40 uppercase tracking-[0.2em] font-mono truncate">Analysis Summary</h4>
                          </div>
                          <div className="grid grid-cols-1 min-w-0">
                            <p className="text-[10px] text-white/70 leading-relaxed break-words whitespace-normal block box-border">
                              {result.analysisSummary}
                            </p>
                          </div>
                        </div>

                        {/* Care Guides */}
                        <div className="bg-white/5 rounded-3xl border border-white/10 overflow-hidden shadow-2xl backdrop-blur-sm flex-1 flex flex-col min-h-0 w-full min-w-0">
                          <div className="flex border-b border-white/10 shrink-0 w-full min-w-0">
                            <div className="flex-1 py-1.5 text-center text-[8px] font-bold uppercase tracking-widest bg-white/5 text-emerald-400 truncate">
                              Solution Protocol
                            </div>
                          </div>
                          <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 custom-scrollbar space-y-4 w-full min-w-0">
                            <div className="space-y-2 min-w-0 w-full box-border">
                              <div className="flex items-center gap-1.5 px-1">
                                <ShieldCheck size={10} className="text-emerald-500" />
                                <h4 className="text-[8px] font-bold text-emerald-500 uppercase tracking-wider">Home Care Guide</h4>
                              </div>
                              <div className="block w-full min-w-0 box-border">
                                <div className="text-[10px] text-white/60 leading-relaxed prose-compact px-1 w-full break-words box-border">
                                  <Markdown components={laymanMarkdownComponents}>{result.homeCareGuide}</Markdown>
                                </div>
                              </div>
                            </div>
                            <div className="h-px bg-white/5 w-full" />
                            <div className="space-y-2 min-w-0 w-full box-border">
                              <div className="flex items-center gap-1.5 px-1">
                                <Info size={10} className="text-blue-400" />
                                <h4 className="text-[8px] font-bold text-blue-400 uppercase tracking-wider">Professional Care Options</h4>
                              </div>
                              <div className="block w-full min-w-0 box-border">
                                <div className="text-[10px] text-white/60 leading-relaxed prose-compact px-1 w-full break-words box-border">
                                  <Markdown components={professionalMarkdownComponents}>{result.professionalCareOptions}</Markdown>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Share Section (Compact) */}
                        <div className="grid grid-cols-3 gap-2 shrink-0">
                          <button onClick={downloadShareImage} className="bg-white/10 border border-white/10 text-white py-2 rounded-xl font-bold text-[8px] uppercase tracking-widest flex items-center justify-center gap-1.5">
                            <Download size={12} /> Save
                          </button>
                          <button onClick={shareToKakao} className="bg-[#FEE500] text-[#191919] py-2 rounded-xl font-bold text-[8px] uppercase tracking-widest flex items-center justify-center gap-1.5">
                            <MessageCircle size={12} /> Kakao
                          </button>
                          <button onClick={copyLink} className="bg-white/10 border border-white/10 text-white py-2 rounded-xl font-bold text-[8px] uppercase tracking-widest flex items-center justify-center gap-1.5">
                            <Link2 size={12} /> Link
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Navigation Buttons */}
                  <div className="flex gap-2 shrink-0">
                    {reportStep > 0 && (
                      <button 
                        onClick={() => setReportStep(prev => prev - 1)}
                        className="flex-1 bg-white/5 border border-white/10 text-white/60 py-2.5 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all"
                      >
                        이전 단계
                      </button>
                    )}
                    {reportStep < 3 ? (
                      <button 
                        onClick={() => setReportStep(prev => prev + 1)}
                        className="flex-[2] bg-emerald-500 text-white py-2.5 rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-all"
                      >
                        {reportStep === 0 ? "정밀 분석 리포트 보기" : 
                         reportStep === 1 ? "심화 비율 분석 보기" : "맞춤형 솔루션 확인"}
                      </button>
                    ) : (
                      <button 
                        onClick={reset}
                        className="flex-[2] bg-white text-black py-2.5 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all"
                      >
                        새로운 분석 시작하기
                      </button>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>

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

              {/* Summary */}
              <div className="w-full bg-white/5 border border-white/10 p-12 rounded-[50px] backdrop-blur-sm space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-500">
                    <CheckCircle2 size={24} />
                  </div>
                  <h2 className="text-4xl font-bold italic uppercase tracking-tight">{result.summary}</h2>
                </div>
                <p className="text-2xl text-white/60 leading-relaxed break-words whitespace-normal">
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
      <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/5 group-hover:border-white/10 transition-all group-hover:bg-white/[0.04] overflow-hidden">
        <p className="text-sm text-white/70 leading-relaxed break-words whitespace-normal">{content}</p>
      </div>
    </div>
  );
}
