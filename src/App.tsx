import React, { useState, useRef, useCallback, useEffect } from 'react';
import { analyzeLocally, type AnalysisResult } from "./services/analysisEngine";
import { Camera, Upload, RefreshCw, RotateCcw, Scan, AlertCircle, CheckCircle2, Info, ChevronRight, Maximize2, ShieldCheck, BarChart3, FlipHorizontal, Zap, Trophy, MessageCircle, Link2, Download, User, Sparkles, TrendingUp, Share2 } from 'lucide-react';
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
  const [scanQuality, setScanQuality] = useState<{
    alignment: 'Good' | 'Fair' | 'Poor';
    lighting: 'Good' | 'Low Light' | 'Overexposed' | 'Uneven';
    stability: 'High' | 'Medium' | 'Low';
  }>({ alignment: 'Good', lighting: 'Good', stability: 'High' });
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
  const [analysisStep, setAnalysisStep] = useState<string>('');
  const [faceMeshLoaded, setFaceMeshLoaded] = useState(false);
  const [isGeneratingShareImage, setIsGeneratingShareImage] = useState(false);
  const [imageAspectRatio, setImageAspectRatio] = useState<number>(1);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [reportStep, setReportStep] = useState(0);
  const [showExportModal, setShowExportModal] = useState(false);

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

  useEffect(() => {
    let animationFrameId: number;
    let lastDetectionTime = 0;

    const detectFace = async () => {
      if (isCameraActive && videoRef.current && faceMeshRef.current) {
        const now = Date.now();
        if (now - lastDetectionTime > 200) { // Detect every 200ms
          try {
            await faceMeshRef.current.send({ image: videoRef.current });
            lastDetectionTime = now;
          } catch (e) {
            console.error("Real-time detection failed", e);
          }
        }
      }
      animationFrameId = requestAnimationFrame(detectFace);
    };

    if (isCameraActive) {
      const checkLighting = () => {
        if (!videoRef.current || !canvasRef.current) return 'Good';
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return 'Good';

        // Draw a small portion of the video to the canvas to check brightness
        ctx.drawImage(video, 0, 0, 100, 100);
        const imageData = ctx.getImageData(0, 0, 100, 100);
        const data = imageData.data;
        
        let brightnessValues = [];
        let totalBrightness = 0;
        
        for (let i = 0; i < data.length; i += 4) {
          const b = (data[i] + data[i + 1] + data[i + 2]) / 3;
          brightnessValues.push(b);
          totalBrightness += b;
        }
        
        const avgBrightness = totalBrightness / brightnessValues.length;
        
        // Calculate variance for contrast check
        let variance = 0;
        for (const b of brightnessValues) {
          variance += Math.pow(b - avgBrightness, 2);
        }
        const stdDev = Math.sqrt(variance / brightnessValues.length);

        if (avgBrightness < 60) return 'Low Light';
        if (avgBrightness > 180) return 'Overexposed';
        if (stdDev > 50) return 'Uneven';
        return 'Good';
      };

      faceMeshRef.current?.onResults((results) => {
        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
          const landmarks = results.multiFaceLandmarks[0];
          
          // Calculate Roll Angle
          const leftEye = landmarks[33];
          const rightEye = landmarks[263];
          const roll = Math.abs(Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x));
          
          // Calculate Face Size (Distance from camera)
          const faceWidth = Math.sqrt(Math.pow(landmarks[234].x - landmarks[454].x, 2) + Math.pow(landmarks[234].y - landmarks[454].y, 2));
          
          // Calculate Jitter (Landmark stability)
          // For simplicity, we'll just check if landmarks are detected
          
          const lightingStatus = checkLighting();

          setScanQuality({
            alignment: roll < 0.05 ? 'Good' : roll < 0.12 ? 'Fair' : 'Poor',
            lighting: lightingStatus,
            stability: faceWidth > 0.3 && faceWidth < 0.7 ? 'High' : 'Medium'
          });
        } else {
          setScanQuality({ alignment: 'Poor', lighting: 'Low Light', stability: 'Low' });
        }
      });

      detectFace();

      return () => {
        cancelAnimationFrame(animationFrameId);
      };
    }
  }, [isCameraActive]);

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
        analyzeImage(dataUrl);
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
        analyzeImage(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateAndShareImage = async (action: 'save' | 'share' = 'share') => {
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
      
      if (action === 'share') {
        // Check if Web Share API supports file sharing
        if (navigator.share && navigator.canShare) {
          const blob = await (await fetch(dataUrl)).blob();
          const file = new File([blob], `face-symmetry-result.png`, { type: 'image/png' });
          
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: 'Face Symmetry Pro Result',
              text: `내 얼굴 비대칭 점수는 ${result?.overallScore}점! 상위 ${100 - (result?.percentile || 0)}% 얼굴 균형을 확인해보세요.`,
            });
            return;
          }
        }
      }

      // Fallback or explicit save
      const link = document.createElement('a');
      link.download = `face-symmetry-result-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err: any) {
      // Ignore cancellation errors
      if (err.name === 'AbortError' || err.message === 'Share canceled') {
        console.log('Share canceled by user');
        return;
      }
      console.error("Share Image Generation Error:", err);
      setError("공유 이미지 생성 중 오류가 발생했습니다.");
    } finally {
      setIsGeneratingShareImage(false);
      setShowExportModal(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setShowExportModal(false);
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

  const analyzeImage = async (base64Image: string) => {
    setIsAnalyzing(true);
    setError(null);
    setDebugInfo(null);
    setResult(null);
    setCenterOffset(0);
    setRotationAngle(0);
    setAnalysisStep('얼굴 특징을 분석하고 있습니다');

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

      // Check lighting on the captured image
      const checkImageLighting = (img: HTMLImageElement) => {
        const canvas = document.createElement('canvas');
        canvas.width = 100;
        canvas.height = 100;
        const ctx = canvas.getContext('2d');
        if (!ctx) return 'Good' as const;
        ctx.drawImage(img, 0, 0, 100, 100);
        const imageData = ctx.getImageData(0, 0, 100, 100);
        const data = imageData.data;
        let brightnessValues = [];
        let totalBrightness = 0;
        for (let i = 0; i < data.length; i += 4) {
          const b = (data[i] + data[i + 1] + data[i + 2]) / 3;
          brightnessValues.push(b);
          totalBrightness += b;
        }
        const avgBrightness = totalBrightness / brightnessValues.length;
        let variance = 0;
        for (const b of brightnessValues) variance += Math.pow(b - avgBrightness, 2);
        const stdDev = Math.sqrt(variance / brightnessValues.length);

        if (avgBrightness < 60) return 'Low Light' as const;
        if (avgBrightness > 180) return 'Overexposed' as const;
        if (stdDev > 50) return 'Uneven' as const;
        return 'Good' as const;
      };

      const lightingStatus = checkImageLighting(imgInfo);

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

      setAnalysisStep('AI 균형 점수를 계산하고 있습니다');
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
        lowerFaceRatio: lowerFaceHeight / faceHeight,
        rotationAngle: rollAngle,
        landmarkConfidence: 0.98, // Assuming high confidence if detection succeeded
        faceSize: faceWidth,
        lightingStatus: lightingStatus
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
        { text: "얼굴 특징을 분석하고 있습니다...", timeout: 800 },
        { text: "AI 균형 점수를 계산하고 있습니다...", timeout: 1200 },
        { text: "개인화된 분석 리포트를 생성하고 있습니다...", timeout: 600 }
      ];
      
      for (let i = 0; i < scanningSteps.length; i++) {
        setAnalysisStep(scanningSteps[i].text);
        await new Promise(resolve => setTimeout(resolve, scanningSteps[i].timeout));
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
    h4: ({ children }: any) => <h4 className="text-[9px] font-bold text-white/90 uppercase tracking-wider mt-2 mb-1">{children}</h4>,
    ul: ({ children }: any) => <ul className="list-none space-y-2 m-0 w-full block min-w-0">{children}</ul>,
    li: ({ children }: any) => (
      <li className="text-white/80 leading-relaxed whitespace-normal break-words w-full block min-w-0 flex gap-2">
        <span className="text-emerald-500 shrink-0">•</span>
        <span>{children}</span>
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
        <div className="max-w-5xl mx-auto">
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
            <section className="bg-white/5 rounded-3xl border border-white/10 shadow-2xl overflow-hidden relative group backdrop-blur-sm">
              {!image && !isCameraActive ? (
                <div className="aspect-[4/5] flex flex-col items-center justify-center p-12 text-center space-y-8">
                  <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 mb-2 border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                    <Camera size={40} />
                  </div>
                  <div className="space-y-3">
                    <h2 className="text-3xl font-black tracking-tighter uppercase italic">Face Symmetry Pro</h2>
                    <p className="text-white/60 max-w-xs mx-auto text-sm font-medium">
                      AI Facial Balance Analysis
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 w-full max-w-xs">
                    <button 
                      onClick={startCamera}
                      className="w-full bg-emerald-500 text-black px-6 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 hover:bg-emerald-400 transition-all active:scale-95 shadow-[0_0_30px_rgba(16,185,129,0.3)]"
                    >
                      <Camera size={18} />
                      Camera Start
                    </button>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full bg-white/5 border border-white/10 text-white px-6 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 hover:bg-white/10 transition-all active:scale-95"
                    >
                      <Upload size={18} />
                      Upload Photo
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileUpload} 
                      accept="image/*" 
                      className="hidden" 
                    />
                  </div>

                  <div className="flex items-center gap-2 px-4 py-2 bg-black/40 border border-white/5 rounded-full">
                    <ShieldCheck size={14} className="text-emerald-500" />
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">
                      🔒 Images are processed locally and never stored.
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

                    {/* Scan Quality Indicator */}
                    <div className="absolute top-6 left-6 flex flex-col gap-2">
                      <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-3 space-y-2 min-w-[120px]">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Alignment</span>
                          <div className="flex items-center gap-1.5">
                            <span className={cn(
                              "text-[7px] font-bold uppercase",
                              scanQuality.alignment === 'Good' ? "text-emerald-400" : 
                              scanQuality.alignment === 'Fair' ? "text-yellow-400" : "text-red-400"
                            )}>{scanQuality.alignment}</span>
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              scanQuality.alignment === 'Good' ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" : 
                              scanQuality.alignment === 'Fair' ? "bg-yellow-500 shadow-[0_0_8px_#eab308]" : "bg-red-500 shadow-[0_0_8px_#ef4444]"
                            )} />
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Lighting</span>
                          <div className="flex items-center gap-1.5">
                            <span className={cn(
                              "text-[7px] font-bold uppercase",
                              scanQuality.lighting === 'Good' ? "text-emerald-400" : "text-red-400"
                            )}>{scanQuality.lighting}</span>
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              scanQuality.lighting === 'Good' ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" : "bg-red-500 shadow-[0_0_8px_#ef4444]"
                            )} />
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Stability</span>
                          <div className="flex items-center gap-1.5">
                            <span className={cn(
                              "text-[7px] font-bold uppercase",
                              scanQuality.stability === 'High' ? "text-emerald-400" : 
                              scanQuality.stability === 'Medium' ? "text-yellow-400" : "text-red-400"
                            )}>{scanQuality.stability}</span>
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              scanQuality.stability === 'High' ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" : 
                              scanQuality.stability === 'Medium' ? "bg-yellow-500 shadow-[0_0_8px_#eab308]" : "bg-red-500 shadow-[0_0_8px_#ef4444]"
                            )} />
                          </div>
                        </div>
                      </div>
                      
                      {scanQuality.alignment === 'Poor' && (
                        <motion.p 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-[9px] text-red-400 font-bold uppercase tracking-tighter bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-lg backdrop-blur-sm"
                        >
                          ⚠ 얼굴이 기울어져 있습니다
                        </motion.p>
                      )}
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
                            {analysisStep.includes('특징') ? '얼굴의 468개 랜드마크를 찾는 중...' : 
                             analysisStep.includes('점수') ? '좌우 균형 데이터를 계산하는 중...' : 
                             '보다 신뢰할 수 있는 AI 분석 리포트를 생성하고 있습니다'}
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
                        <p className="text-[9px] font-bold uppercase tracking-widest text-red-300/60">System Info (For Support)</p>
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

                  <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                    {reportStep === 0 && (
                      <div className="flex flex-col gap-4 min-h-0 py-2">
                        {/* Dr. Fact Analysis Header */}
                        <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-2xl border border-white/10 w-fit self-center mb-2">
                          <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                            <User size={14} className="text-emerald-400" />
                          </div>
                          <span className="text-[10px] font-black text-white/60 uppercase tracking-[0.3em] font-mono">AI Analysis Report</span>
                        </div>

                        {/* Score Card */}
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.5 }}
                          className="bg-white/5 rounded-3xl border border-white/10 p-6 shadow-2xl backdrop-blur-md flex flex-col items-center relative overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Trophy size={80} className="text-emerald-400" />
                          </div>
                          
                          <div className="relative mb-4">
                            <div className="absolute -inset-4 bg-emerald-500/20 blur-2xl rounded-full animate-pulse" />
                            <div className="relative">
                              <svg className="w-32 h-32 transform -rotate-90">
                                <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-white/5" />
                                <circle
                                  cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="6" fill="transparent"
                                  strokeDasharray={364}
                                  strokeDashoffset={364 - (364 * (result.overallScore || 0)) / 100}
                                  strokeLinecap="round"
                                  className="text-emerald-500 transition-all duration-1000 ease-out drop-shadow-[0_0_12px_rgba(16,185,129,0.6)]"
                                />
                              </svg>
                              <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-4xl font-black italic tracking-tighter font-mono leading-none">{result.overallScore || 0}</span>
                                <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest mt-1">Balance Score</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-center space-y-2 w-full">
                            <div className="flex flex-col items-center gap-1">
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-bold text-white tracking-tight">상위 {100 - (result.percentile || 0)}%</span>
                                <div className={cn(
                                  "px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border",
                                  result.tier?.color.replace('text-', 'bg-').replace('-400', '-500/10'),
                                  result.tier?.color.replace('text-', 'border-').replace('-400', '-500/20'),
                                  result.tier?.color
                                )}>
                                  {result.tier?.icon} {result.tier?.label}
                                </div>
                              </div>
                              <span className="text-[7px] font-bold text-white/30 uppercase tracking-[0.3em]">Global Percentile Ranking</span>
                            </div>

                            <div className="flex items-center justify-center gap-2 px-3 py-1.5 bg-black/40 border border-white/5 rounded-full backdrop-blur-sm self-center mx-auto w-fit">
                              <div className={cn(
                                "w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor]",
                                result.resultStability === 'High' ? "text-emerald-500 bg-emerald-500" : 
                                result.resultStability === 'Medium' ? "text-yellow-500 bg-yellow-500" : "text-red-500 bg-red-500"
                              )} />
                              <span className="text-[8px] font-bold text-white/60 uppercase tracking-widest">Confidence: {result.resultStability}</span>
                            </div>
                          </div>
                        </motion.div>

                        {/* Key Insight Summary */}
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5, delay: 0.3 }}
                          className="bg-emerald-500/10 rounded-3xl border border-emerald-500/20 p-5 shadow-xl backdrop-blur-sm relative group"
                        >
                          <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Zap size={40} className="text-emerald-400" />
                          </div>
                          <div className="flex items-center gap-2 mb-3">
                            <Zap size={14} className="text-emerald-400" />
                            <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] font-mono">Key Insight</h4>
                          </div>
                          <div className="space-y-2 relative z-10">
                            {result.primaryImbalance.split('\n').map((line, i) => (
                              <p key={i} className="text-[12px] font-bold text-white leading-tight flex gap-2">
                                <span className="text-emerald-400 shrink-0">•</span>
                                {line}
                              </p>
                            ))}
                          </div>
                        </motion.div>
                      </div>
                    )}

                    {reportStep === 1 && (
                      <div className="flex flex-col gap-3 min-h-0 py-2">
                        {/* Expert Insight Card - Moved from Step 0 */}
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="bg-emerald-500/10 rounded-2xl border border-emerald-500/20 p-4 shadow-lg backdrop-blur-sm"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <User size={12} className="text-emerald-400" />
                            <h4 className="text-[9px] font-black text-emerald-400 uppercase tracking-widest font-mono">Expert Analysis</h4>
                          </div>
                          <p className="text-[12px] font-bold text-white leading-relaxed italic">
                            "{result.factFeedback}"
                          </p>
                        </motion.div>

                        {/* Radar Chart */}
                        <div className="bg-white/5 rounded-3xl border border-white/10 p-4 shadow-xl backdrop-blur-sm flex-[1.2] flex flex-col min-h-0">
                          <h3 className="text-[8px] font-bold uppercase tracking-[0.2em] text-white/40 font-mono mb-2 shrink-0">Balance Distribution</h3>
                          <div className="flex-1 min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={[
                                { subject: '눈', A: result.partScores?.eyes || result.landmarks.eyes.score },
                                { subject: '눈썹', A: result.partScores?.brows || result.landmarks.brows.score },
                                { subject: '입', A: result.partScores?.mouth || result.landmarks.mouth.score },
                                { subject: '턱', A: result.partScores?.jaw || result.landmarks.jawline.score },
                              ]}>
                                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 700 }} />
                                <Radar name="Symmetry" dataKey="A" stroke="#10b981" fill="#10b981" fillOpacity={0.4} />
                              </RadarChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="mt-2 pt-3 border-t border-white/5 space-y-2">
                            <p className="text-[12px] font-bold text-emerald-400 leading-relaxed text-center">
                              {result.summary}
                            </p>
                            <p className="text-[10px] text-white/60 leading-relaxed text-center font-medium px-2">
                              {result.analysisSummary}
                            </p>
                          </div>
                        </div>

                        {/* Visual Analysis (Mesh) */}
                        <div className="bg-white/5 rounded-3xl border border-white/10 p-3 shadow-xl backdrop-blur-sm flex-1 flex flex-col min-h-0">
                          <div className="flex items-center justify-between mb-2 shrink-0">
                            <h3 className="text-[8px] font-bold uppercase tracking-[0.2em] text-white/40 font-mono">Visual Mesh Analysis</h3>
                            <div className="flex gap-1">
                              <button onClick={() => setAutoCorrectEnabled(!autoCorrectEnabled)} className={cn("p-1 rounded-lg transition-all border", autoCorrectEnabled ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-400" : "bg-white/5 border-white/10 text-white/40")}>
                                <RotateCcw size={10} />
                              </button>
                              <button onClick={() => setShowOverlay(!showOverlay)} className={cn("p-1 rounded-lg transition-all border", showOverlay ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" : "bg-white/5 border-white/10 text-white/40")}>
                                <Scan size={10} />
                              </button>
                            </div>
                          </div>

                          <div className="flex-1 relative rounded-2xl overflow-hidden border border-white/10 bg-black flex items-center justify-center min-h-0">
                            <div 
                              className="relative transition-transform duration-500 ease-out"
                              style={{ 
                                width: imageAspectRatio > 1 ? '100%' : `${imageAspectRatio * 100}%`,
                                aspectRatio: imageAspectRatio,
                                transform: autoCorrectEnabled ? `translateX(${-centerOffset}%) rotate(${rotationAngle}deg) scale(1.1)` : `scale(1.0)`
                              }}
                            >
                              <img src={image || ''} alt="Analysis" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                              
                              <div className={cn(
                                "absolute inset-0 pointer-events-none transition-opacity duration-300",
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
                                  <div key={`zone-${i}`} className="absolute" style={{ left: `${zone.x}%`, top: `${zone.y}%`, width: `${zone.radius * 2.5}%`, height: `${zone.radius * 2.5}%`, marginLeft: `-${zone.radius * 1.25}%`, marginTop: `-${zone.radius * 1.25}%` }}>
                                    <motion.div 
                                      className="w-full h-full rounded-full" 
                                      style={{ background: `radial-gradient(circle, rgba(239, 68, 68, ${zone.intensity * 0.8}) 0%, rgba(239, 68, 68, 0) 70%)` }} 
                                      animate={{ scale: [1, 1.2, 1], opacity: [zone.intensity, zone.intensity * 0.5, zone.intensity] }} 
                                      transition={{ duration: 2, repeat: Infinity }} 
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                            {result.metrics?.midline !== undefined && (
                              <div className="absolute inset-y-0 w-px bg-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.5)] z-10" style={{ left: `${result.metrics.midline * 100}%` }} />
                            )}
                          </div>
                        </div>

                        {/* Part Scores */}
                        <div className="grid grid-cols-4 gap-2 shrink-0">
                          {[
                            { label: '눈', score: result.partScores?.eyes || result.landmarks.eyes.score, status: result.landmarks.eyes.status },
                            { label: '눈썹', score: result.partScores?.brows || result.landmarks.brows.score, status: result.landmarks.brows.status },
                            { label: '입', score: result.partScores?.mouth || result.landmarks.mouth.score, status: result.landmarks.mouth.status },
                            { label: '턱', score: result.partScores?.jaw || result.landmarks.jawline.score, status: result.landmarks.jawline.status }
                          ].map((m, idx) => (
                            <div key={idx} className="bg-white/5 p-2 rounded-xl border border-white/10 flex flex-col items-center gap-0.5">
                              <span className="text-[8px] text-white/40 uppercase font-mono font-bold">{m.label}</span>
                              <span className="text-[14px] font-black text-emerald-400 italic">{m.score}</span>
                              <span className="text-[7px] text-white/30 font-bold truncate w-full text-center">{m.status}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {reportStep === 2 && (
                      <div className="flex flex-col gap-3 min-h-0 py-2">
                        <div className="grid grid-cols-2 gap-3 shrink-0">
                          {/* Face Shape Card */}
                          <div className="bg-white/5 rounded-3xl border border-white/10 p-4 shadow-xl backdrop-blur-sm flex flex-col justify-center gap-1">
                            <div className="flex items-center gap-2">
                              <Maximize2 size={14} className="text-emerald-400" />
                              <h3 className="text-[9px] font-bold uppercase tracking-widest text-white/40">Face Shape</h3>
                            </div>
                            <p className="text-[14px] font-black text-white italic">{result.faceShape || "분석 중..."}</p>
                          </div>

                          {/* Improvement Potential Card */}
                          <div className="bg-emerald-500/5 rounded-3xl border border-emerald-500/20 p-4 shadow-xl backdrop-blur-sm flex flex-col justify-center gap-1">
                            <div className="flex items-center gap-2">
                              <TrendingUp size={14} className="text-emerald-400" />
                              <h3 className="text-[9px] font-bold uppercase tracking-widest text-emerald-400/80">Potential</h3>
                            </div>
                            <p className="text-[14px] font-black text-emerald-400 italic">{result.improvementPotential?.range}</p>
                          </div>
                        </div>

                        <div className="bg-white/5 rounded-3xl border border-white/10 p-4 shadow-xl backdrop-blur-sm flex-1 flex flex-col gap-4 min-h-0">
                          <div className="flex items-center gap-2 shrink-0">
                            <Zap size={14} className="text-amber-400" />
                            <h3 className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/40 font-mono">Advanced Metrics</h3>
                          </div>

                          <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-4">
                            {/* Eye Spacing */}
                            <div className="space-y-1.5">
                              <div className="flex justify-between items-end">
                                <span className="text-[10px] font-bold text-white/80">Eye Spacing Ratio</span>
                                <span className="text-[12px] font-mono font-black text-emerald-400">{result.advancedMetrics?.eyeSpacing.value.toFixed(2)}</span>
                              </div>
                              <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                                <p className="text-[9px] font-bold text-emerald-400/80 mb-1">{result.advancedMetrics?.eyeSpacing.status}</p>
                                <p className="text-[9px] text-white/60 leading-tight">{result.advancedMetrics?.eyeSpacing.feedback}</p>
                              </div>
                            </div>

                            {/* Facial Proportion */}
                            <div className="space-y-1.5">
                              <div className="flex justify-between items-end">
                                <span className="text-[10px] font-bold text-white/80">Facial Proportion (V)</span>
                                <span className="text-[12px] font-mono font-black text-emerald-400">
                                  {result.advancedMetrics?.facialProportion.value.upper}:{result.advancedMetrics?.facialProportion.value.mid}:{result.advancedMetrics?.facialProportion.value.lower}
                                </span>
                              </div>
                              <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                                <p className="text-[9px] font-bold text-emerald-400/80 mb-1">{result.advancedMetrics?.facialProportion.status}</p>
                                <p className="text-[9px] text-white/60 leading-tight">{result.advancedMetrics?.facialProportion.feedback}</p>
                              </div>
                            </div>

                            {/* Balanced Face Visualization */}
                            <div className="pt-2 space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Sparkles size={12} className="text-emerald-400" />
                                  <h4 className="text-[9px] font-bold text-white/40 uppercase tracking-widest font-mono">Balanced Face Simulation</h4>
                                </div>
                                <span className="text-[8px] text-emerald-400/60 font-mono font-bold">30% Symmetry</span>
                              </div>
                              <div className="relative aspect-[4/5] w-full rounded-3xl overflow-hidden border border-white/10 bg-black/40 group">
                                {result.balancedImage ? (
                                  <img 
                                    src={result.balancedImage} 
                                    alt="Balanced Face" 
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-white/20 text-[10px]">
                                    Generating simulation...
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                                  <p className="text-[9px] text-white/80 leading-relaxed font-medium">
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
                        {/* Summary Card */}
                        <div className="bg-white/5 rounded-3xl border border-white/10 p-4 shadow-2xl backdrop-blur-sm shrink-0 w-full min-w-0 relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Sparkles size={40} className="text-blue-400" />
                          </div>
                          <div className="flex items-center gap-2 mb-3 w-full min-w-0">
                            <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                              <Sparkles size={14} className="text-blue-400" />
                            </div>
                            <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] font-mono truncate">Balance Insight</h4>
                          </div>
                          <p className="text-[13px] text-white leading-relaxed font-bold italic relative z-10">
                            "{result.angelFeedback}"
                          </p>
                          <div className="mt-3 pt-3 border-t border-white/5">
                            <p className="text-[11px] text-white/60 leading-relaxed font-medium italic">
                              분석 결과를 바탕으로 맞춤형 케어 가이드를 확인해보세요.
                            </p>
                          </div>
                        </div>

                        {/* Care Guides */}
                        <div className="bg-white/5 rounded-3xl border border-white/10 overflow-hidden shadow-2xl backdrop-blur-sm flex-1 flex flex-col min-h-0 w-full min-w-0">
                          <div className="flex border-b border-white/10 shrink-0 w-full min-w-0">
                            <div className="flex-1 py-2 text-center text-[10px] font-black uppercase tracking-widest bg-white/5 text-emerald-400 truncate">
                              Personalized Solution
                            </div>
                          </div>
                          <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 custom-scrollbar space-y-5 w-full min-w-0">
                            <div className="space-y-3 min-w-0 w-full box-border">
                              <div className="flex items-center gap-2 px-1">
                                <ShieldCheck size={14} className="text-emerald-500" />
                                <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-wider">Recommended Care</h4>
                              </div>
                              <div className="text-[11px] text-white/70 leading-relaxed prose-compact px-1 w-full break-words box-border">
                                <Markdown components={laymanMarkdownComponents}>{result.homeCareGuide}</Markdown>
                              </div>
                            </div>
                            
                            <div className="h-px bg-white/5 w-full" />
                            
                            <div className="space-y-3 min-w-0 w-full box-border">
                              <div className="flex items-center gap-2 px-1">
                                <Info size={14} className="text-blue-400" />
                                <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-wider">Expert Advice</h4>
                              </div>
                              <div className="text-[11px] text-white/70 leading-relaxed prose-compact px-1 w-full break-words box-border">
                                <Markdown components={professionalMarkdownComponents}>{result.professionalCareOptions}</Markdown>
                              </div>
                            </div>
                          </div>
                          
                          {/* AI Disclaimer */}
                          <div className="px-4 py-3 bg-black/40 border-t border-white/5 shrink-0">
                            <p className="text-[8px] text-white/30 text-center leading-normal font-medium">
                              ※ 본 분석 결과는 AI 기반 얼굴 균형 분석 참고 정보이며 의학적 진단이나 치료를 대체하지 않습니다. 개인의 상태에 따라 결과는 달라질 수 있습니다.
                            </p>
                          </div>
                        </div>

                        {/* Share Section (Primary CTA) */}
                        <div className="flex flex-col gap-2 shrink-0">
                          <button 
                            onClick={() => setShowExportModal(true)} 
                            className="w-full bg-emerald-500 text-black py-4 rounded-3xl font-black text-[12px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:bg-emerald-400 transition-all active:scale-[0.98]"
                          >
                            <Sparkles size={18} />
                            결과 카드 내보내기
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
            className="w-[1080px] h-[1920px] bg-[#050505] text-white relative flex flex-col items-center justify-between py-32 px-24 overflow-hidden"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            {/* Background Accents */}
            <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[50%] bg-emerald-500/10 blur-[250px] rounded-full" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[120%] h-[50%] bg-blue-500/10 blur-[250px] rounded-full" />
            
            {/* Header */}
            <div className="w-full flex flex-col items-center z-10">
              <h1 className="text-[80px] font-black italic tracking-tighter uppercase leading-none">
                Face Symmetry <span className="text-emerald-500">Pro</span>
              </h1>
              <div className="mt-6 px-10 py-3 bg-white/5 border border-white/10 rounded-full">
                <p className="text-2xl font-mono text-white/40 uppercase tracking-[0.5em]">AI Biometric Analysis</p>
              </div>
            </div>

            {/* Main Content: User Image */}
            <div className="relative z-10">
              <div className="w-[880px] h-[880px] rounded-full overflow-hidden border-[12px] border-white/10 shadow-[0_0_150px_rgba(0,0,0,0.8)]">
                <img 
                  src={image} 
                  alt="Analysis" 
                  className="w-full h-full object-cover"
                  style={{ transform: `translateX(${-centerOffset}%) rotate(${rotationAngle}deg) scale(1.2)` }}
                  referrerPolicy="no-referrer"
                />
              </div>
              {/* Scan Line Animation (Static for screenshot) */}
              <div className="absolute top-1/2 left-0 w-full h-2 bg-emerald-500/40 shadow-[0_0_40px_rgba(16,185,129,0.8)] z-20" />
            </div>

            {/* Stats Section */}
            <div className="w-full flex flex-col items-center gap-12 z-10">
              <div className="flex flex-col items-center">
                <p className="text-[120px] font-black italic text-emerald-400 leading-none">
                  TOP {100 - (result.percentile || 0)}%
                </p>
                <p className={cn(
                  "mt-4 text-[60px] font-black uppercase tracking-[0.2em]",
                  result.tier?.color
                )}>
                  {result.tier?.label}
                </p>
              </div>

              <div className="h-px w-64 bg-white/10" />

              <div className="flex flex-col items-center">
                <p className="text-3xl font-mono text-white/30 uppercase tracking-[0.4em] mb-4">Balance Score</p>
                <p className="text-[180px] font-black italic text-white leading-none">
                  {result.overallScore}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="w-full flex flex-col items-center z-10 opacity-40">
              <p className="text-2xl font-medium tracking-widest uppercase">AI Facial Balance Analysis</p>
              <p className="text-xl font-mono mt-2">facesymmetrypro.app</p>
            </div>
          </div>
        </div>
      )}
      
      <footer className="max-w-3xl mx-auto px-6 py-12 border-t border-white/5 text-center">
        <p className="text-[10px] text-white/20 uppercase tracking-[0.2em] font-mono">
          &copy; 2026 Face Symmetry Pro. [DISCLAIMER] BIOMETRIC DATA IS FOR REFERENCE ONLY.
        </p>
      </footer>

      {/* Export Modal (Bottom Sheet style) */}
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
                    onClick={() => generateAndShareImage('save')}
                    disabled={isGeneratingShareImage}
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
                    {isGeneratingShareImage && <RefreshCw size={16} className="animate-spin text-white/20" />}
                  </button>

                  <button 
                    onClick={() => generateAndShareImage('share')}
                    disabled={isGeneratingShareImage}
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
                    {isGeneratingShareImage && <RefreshCw size={16} className="animate-spin text-white/20" />}
                  </button>

                  <button 
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
