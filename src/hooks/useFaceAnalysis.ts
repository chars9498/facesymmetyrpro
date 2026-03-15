import { useState, useRef, useEffect, useCallback } from 'react';
import { analyzeLocally, type AnalysisResult } from "../services/analysisEngine";
import { calculateSymmetryV2 } from "../services/analysisEngine_v2";

export type ScanQuality = {
  alignment: 'Good' | 'Fair' | 'Poor';
  lighting: 'Good' | 'Low Light' | 'Overexposed' | 'Uneven';
  stability: 'High' | 'Medium' | 'Low';
};

export function useFaceAnalysis() {
  const [engineStatus, setEngineStatus] = useState<'idle' | 'loading' | 'ready' | 'failed'>('idle');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFakeScanning, setIsFakeScanning] = useState(false);
  const [scanningLandmarks, setScanningLandmarks] = useState<any[] | null>(null);
  const [scanQuality, setScanQuality] = useState<ScanQuality>({
    alignment: 'Good',
    lighting: 'Good',
    stability: 'High'
  });
  const [error, setError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [analysisStep, setAnalysisStep] = useState<string>('');
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  
  const addDebugLog = (msg: string) => {
    console.log(`[CAMERA_DEBUG] ${msg}`);
    setDebugLogs(prev => [...prev.slice(-4), msg]);
  };
  
  const faceMeshRef = useRef<any | null>(null);
  const faceMeshCallbackRef = useRef<((results: any) => void) | null>(null);
  const realTimeCallbackRef = useRef<((results: any) => void) | null>(null);
  const smoothedLandmarksRef = useRef<any[] | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Handle stream attachment to video element
  useEffect(() => {
    const video = videoRef.current;
    if (video && stream) {
      addDebugLog('VIDEO_SRC_ATTACHING');
      video.srcObject = stream;
      
      const handleLoadedMetadata = () => {
        addDebugLog('VIDEO_METADATA_LOADED');
        video.play()
          .then(() => addDebugLog('VIDEO_PLAY_SUCCESS'))
          .catch(err => {
            addDebugLog(`VIDEO_PLAY_FAILED: ${err.message}`);
            // Fallback for some browsers that require user interaction even with muted
            const playOnInteraction = () => {
              video.play();
              window.removeEventListener('click', playOnInteraction);
            };
            window.addEventListener('click', playOnInteraction);
          });
      };

      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      };
    }
  }, [stream]);

  const initFaceMesh = useCallback(async () => {
    if (engineStatus === 'ready' || engineStatus === 'loading') return true;
    
    setEngineStatus('loading');
    setError(null);
    
    try {
      // Fix for "Module.arguments has been replaced with plain arguments_" error
      if (typeof window !== 'undefined') {
        (window as any).arguments = (window as any).arguments || [];
      }

      // Initialize FaceMesh using the global window object
      const FaceMeshConstructor = (window as any).FaceMesh;

      if (!FaceMeshConstructor || typeof FaceMeshConstructor !== 'function') {
        throw new Error("FaceMesh constructor not found on window. Please check if the CDN script is loaded.");
      }

      const fm = new FaceMeshConstructor({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
      });

      fm.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.35,
        minTrackingConfidence: 0.35
      });

      fm.onResults((results: any) => {
        if (faceMeshCallbackRef.current) {
          faceMeshCallbackRef.current(results);
        } else if (realTimeCallbackRef.current) {
          realTimeCallbackRef.current(results);
        }
      });

      faceMeshRef.current = fm;
      setEngineStatus('ready');
      
      // Warm up
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      await fm.send({ image: canvas });
      return true;
    } catch (err) {
      console.error("FaceMesh Init Error:", err);
      setEngineStatus('failed');
      return false;
    }
  }, [engineStatus]);

  // Cleanup FaceMesh on unmount
  useEffect(() => {
    return () => {
      if (faceMeshRef.current) {
        faceMeshRef.current.close();
      }
    };
  }, []);

  // Real-time detection
  useEffect(() => {
    let animationFrameId: number;
    let lastDetectionTime = 0;
    let lastLightingCheckTime = 0;
    let lastLightingStatus: ScanQuality['lighting'] = 'Good';

    const checkLighting = () => {
      const now = Date.now();
      if (now - lastLightingCheckTime < 1500) return lastLightingStatus;
      
      lastLightingCheckTime = now;
      if (!videoRef.current || !canvasRef.current) return 'Good';
      
      const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
      if (!ctx) return 'Good';

      ctx.drawImage(videoRef.current, 0, 0, 100, 100);
      const imageData = ctx.getImageData(0, 0, 100, 100);
      const data = imageData.data;
      
      let totalBrightness = 0;
      let brightnessValues = [];
      
      for (let i = 0; i < data.length; i += 4) {
        const b = (data[i] + data[i + 1] + data[i + 2]) / 3;
        brightnessValues.push(b);
        totalBrightness += b;
      }
      
      const avgBrightness = totalBrightness / brightnessValues.length;
      let variance = 0;
      for (const b of brightnessValues) {
        variance += Math.pow(b - avgBrightness, 2);
      }
      const stdDev = Math.sqrt(variance / brightnessValues.length);

      if (avgBrightness < 60) lastLightingStatus = 'Low Light';
      else if (avgBrightness > 180) lastLightingStatus = 'Overexposed';
      else if (stdDev > 50) lastLightingStatus = 'Uneven';
      else lastLightingStatus = 'Good';
      
      return lastLightingStatus;
    };

    const detectFace = async () => {
      if (isCameraActive && videoRef.current && faceMeshRef.current && !isAnalyzing) {
        const now = Date.now();
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const interval = isMobile ? 1000 : 500;
        
        if (now - lastDetectionTime > interval) { 
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
      realTimeCallbackRef.current = (results) => {
        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
          const landmarks = results.multiFaceLandmarks[0];
          
          if (!smoothedLandmarksRef.current) {
            smoothedLandmarksRef.current = landmarks;
          } else {
            const alpha = 0.3;
            smoothedLandmarksRef.current = landmarks.map((p, i) => ({
              x: p.x * alpha + (smoothedLandmarksRef.current![i]?.x || p.x) * (1 - alpha),
              y: p.y * alpha + (smoothedLandmarksRef.current![i]?.y || p.y) * (1 - alpha),
              z: (p.z || 0) * alpha + (smoothedLandmarksRef.current![i]?.z || 0) * (1 - alpha)
            }));
          }

          const currentLandmarks = smoothedLandmarksRef.current;
          const leftEye = currentLandmarks[33];
          const rightEye = currentLandmarks[263];
          const roll = Math.abs(Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x));
          const faceWidth = Math.sqrt(Math.pow(currentLandmarks[234].x - currentLandmarks[454].x, 2) + Math.pow(currentLandmarks[234].y - currentLandmarks[454].y, 2));
          
          setScanQuality({
            alignment: roll < 0.05 ? 'Good' : roll < 0.12 ? 'Fair' : 'Poor',
            lighting: checkLighting(),
            stability: faceWidth > 0.3 && faceWidth < 0.7 ? 'High' : 'Medium'
          });
        } else {
          setScanQuality({ alignment: 'Poor', lighting: 'Low Light', stability: 'Low' });
          smoothedLandmarksRef.current = null;
        }
      };
      detectFace();
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      realTimeCallbackRef.current = null;
    };
  }, [isCameraActive, isAnalyzing]);

  const startCamera = useCallback(async () => {
    addDebugLog('CAMERA_REQUEST_START');
    try {
      // Lazy init engine when camera starts
      initFaceMesh();

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
      addDebugLog('CAMERA_STREAM_RECEIVED');
      setStream(mediaStream);
      setIsCameraActive(true);
      setError(null);
    } catch (err: any) {
      addDebugLog(`CAMERA_ERROR: ${err.name}`);
      let message = "카메라를 시작할 수 없습니다.";
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = "카메라 권한이 거부되었습니다. 브라우저 설정에서 권한을 허용해주세요.";
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = "카메라를 찾을 수 없습니다.";
      }
      setError(message);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  }, [stream]);

  return {
    engineStatus,
    initFaceMesh,
    isAnalyzing,
    setIsAnalyzing,
    isFakeScanning,
    setIsFakeScanning,
    scanningLandmarks,
    setScanningLandmarks,
    scanQuality,
    error,
    setError,
    isCameraActive,
    startCamera,
    stopCamera,
    analysisStep,
    setAnalysisStep,
    debugLogs,
    faceMeshRef,
    faceMeshCallbackRef,
    videoRef,
    canvasRef
  };
}
