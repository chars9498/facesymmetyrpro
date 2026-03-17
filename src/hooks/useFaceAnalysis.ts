import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { analyzeLocally, type AnalysisResult } from "../services/analysisEngine";
import { calculateSymmetryV2 } from "../services/analysisEngine_v2";

// Fix for MediaPipe/Emscripten "Module.arguments" error
// This error occurs when Emscripten's 'arguments' global is interfered with by polyfills or other scripts.
// We set it once at the module level to ensure a stable environment for the WASM module.
if (typeof window !== 'undefined' && !(window as any).arguments) {
  (window as any).arguments = [];
}

export type ScanQuality = {
  alignment: 'Good' | 'Fair' | 'Poor';
  lighting: 'Good' | 'Low Light' | 'Overexposed' | 'Uneven';
  stability: 'High' | 'Medium' | 'Low';
};

export function useFaceAnalysis() {
  const { t } = useTranslation();
  const [engineStatus, setEngineStatus] = useState<'idle' | 'loading' | 'ready' | 'failed' | 'failed-temporary'>('idle');
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
  
  const faceMeshRef = useRef<any | null>(null);
  const isFaceMeshBusyRef = useRef(false);
  const faceMeshCallbackRef = useRef<((results: any) => void) | null>(null);
  const realTimeCallbackRef = useRef<((results: any) => void) | null>(null);
  const smoothedLandmarksRef = useRef<any[] | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const initRetryCountRef = useRef(0);
  const loadingPromiseRef = useRef<Promise<boolean> | null>(null);

  // Handle stream attachment to video element
  useEffect(() => {
    const video = videoRef.current;
    if (video && stream) {
      video.srcObject = stream;
      
      const handleLoadedMetadata = () => {
        video.play()
          .catch(err => {
            console.error("Video play failed:", err);
            // Fallback for some browsers that require user interaction even with muted
            const playOnInteraction = () => {
              video.play().catch(e => console.error("Retry play failed:", e));
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

  const initFaceMesh = useCallback(async (isPreload: boolean = false) => {
    // 1. Singleton Pattern: If instance already exists and is ready, reuse it.
    if (faceMeshRef.current && engineStatus === 'ready') {
      return true;
    }
    
    // 2. Handle concurrent initialization attempts
    if (loadingPromiseRef.current) {
      if (isPreload) return true;
      return loadingPromiseRef.current;
    }
    
    console.log("FaceMesh init start", { isPreload });
    setEngineStatus('loading');
    if (!isPreload) setError(null);
    
    const performInit = async () => {
      try {
        // Initialize FaceMesh using the global window object
        const FaceMeshConstructor = (window as any).FaceMesh;

        if (!FaceMeshConstructor || typeof FaceMeshConstructor !== 'function') {
          throw new Error(t('errors.modelFail'));
        }

        console.log("FaceMesh instance creating...");
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

        console.log("FaceMesh model loading...");
        
        // Safe initialization check
        if (typeof fm.initialize === 'function') {
          await fm.initialize();
        }
        
        faceMeshRef.current = fm;
        console.log("FaceMesh ready");
        
        setEngineStatus('ready');
        
        // Warm up - ensures WASM is fully loaded and ready for real data
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        isFaceMeshBusyRef.current = true;
        try {
          await fm.send({ image: canvas });
        } finally {
          isFaceMeshBusyRef.current = false;
        }
        return true;
      } catch (e) {
        faceMeshRef.current = null;
        throw e;
      }
    };

    const promise = (async () => {
      try {
        // 5. Add a timeout fallback (5 seconds)
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("INITIALIZATION_TIMEOUT")), 5000)
        );

        await Promise.race([performInit(), timeoutPromise]);
        initRetryCountRef.current = 0; // Reset on success
        return true;
      } catch (err: any) {
        console.error("FaceMesh Init Error:", err);
        faceMeshRef.current = null;
        
        // Retry logic only for on-demand calls
        if (err.message === "INITIALIZATION_TIMEOUT" && initRetryCountRef.current < 1 && !isPreload) {
          console.log("FaceMesh initialization timed out. Retrying...");
          setAnalysisStep(t('errors.initTimeout'));
          initRetryCountRef.current += 1;
          
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
          return initFaceMesh(false);
        }

        if (isPreload) {
          console.log("Preload failed silently. Will retry on demand.");
          setEngineStatus('failed-temporary');
        } else {
          setEngineStatus('failed');
          setError(t('errors.initFailed'));
        }
        return false;
      }
    })();

    loadingPromiseRef.current = promise;
    try {
      return await promise;
    } finally {
      loadingPromiseRef.current = null;
    }
  }, [engineStatus, setAnalysisStep]);

  // 3. Optional preload - silent and non-blocking
  useEffect(() => {
    initFaceMesh(true);
  }, []);

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
      // Real-time detection disabled to prevent conflicts and improve stability
      // FaceMesh will only run on explicit capture or upload
    };

    if (isCameraActive) {
      // Lighting check can still run as it doesn't use FaceMesh
      const lightingInterval = setInterval(() => {
        if (isCameraActive && !isAnalyzing) {
          setScanQuality(prev => ({
            ...prev,
            lighting: checkLighting()
          }));
        }
      }, 2000);

      return () => {
        clearInterval(lightingInterval);
        realTimeCallbackRef.current = null;
      };
    }
  }, [isCameraActive, isAnalyzing]);

  const startCamera = useCallback(async () => {
    try {
      // Lazy init engine when camera starts
      initFaceMesh();

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(t('errors.browserNotSupported'));
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
      let message = t('errors.cameraStartFailed');
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = t('errors.cameraPermissionDenied');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = t('errors.cameraNotFound');
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
    faceMeshRef,
    isFaceMeshBusyRef,
    faceMeshCallbackRef,
    videoRef,
    canvasRef
  };
}
