import { useState, useCallback, useRef } from 'react';
import { analyzeLocally, type AnalysisResult } from "../services/analysisEngine";
import { calculateSymmetryV2 } from "../services/analysisEngine_v2";
import { useFaceAnalysis } from './useFaceAnalysis';
import { useAnalysisLimit } from './useAnalysisLimit';
import { resizeImage, enhanceImage, generateSoftSymmetry, generateSymmetryTwins } from "../services/imageProcessor";

interface AnalysisFlowOptions {
  onAnalysisComplete?: (result: AnalysisResult) => void;
}

export function useAnalysisFlow({ onAnalysisComplete }: AnalysisFlowOptions = {}) {
  const {
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
    isCameraActive: isCameraReady,
    startCamera,
    stopCamera,
    debugLogs,
    analysisStep: analysisStatus,
    setAnalysisStep: setAnalysisStatus,
    faceMeshRef,
    faceMeshCallbackRef,
    videoRef,
    canvasRef
  } = useFaceAnalysis();

  const { isLocked, incrementCount } = useAnalysisLimit();

  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [centerOffset, setCenterOffset] = useState(0);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [imageAspectRatio, setImageAspectRatio] = useState(1);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [symmetryStrength, setSymmetryStrength] = useState(0.85);

  const updateSymmetryTwins = useCallback(async (strength: number) => {
    if (!capturedImage || !result?.rawLandmarks) return;
    const twins = await generateSymmetryTwins(
      capturedImage, 
      result.rawLandmarks, 
      imageDimensions.width, 
      imageDimensions.height, 
      strength
    );
    setResult(prev => prev ? { ...prev, symmetryTwins: twins } : null);
  }, [capturedImage, result?.rawLandmarks, imageDimensions]);

  const analyzeImage = useCallback(async (base64Image: string) => {
    if (isAnalyzing) return;
    
    if (isLocked) {
      setError("Analysis limit reached. Please unlock to continue.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    setCenterOffset(0);
    setRotationAngle(0);
    setAnalysisProgress(0);
    setAnalysisStatus('Initializing AI...');

    try {
      setAnalysisProgress(10);
      
      // Lazy initialize engine if needed
      if (engineStatus !== 'ready') {
        setAnalysisStatus('Initializing AI engine...');
        const success = await initFaceMesh();
        if (!success) {
          throw new Error("얼굴 인식 엔진을 초기화하지 못했습니다. 페이지를 새로고침하거나 나중에 다시 시도해주세요.");
        }
      }

      await new Promise(resolve => setTimeout(resolve, 300));

      if (!faceMeshRef.current) {
        throw new Error("Face detection model is not ready.");
      }

      setAnalysisStatus('Detecting face landmarks...');
      setAnalysisProgress(25);
      const resizedImage = await resizeImage(base64Image, 512);
      
      const imgInfo = new Image();
      imgInfo.src = resizedImage;
      await imgInfo.decode();
      
      setImageDimensions({ width: imgInfo.width, height: imgInfo.height });
      setImageAspectRatio(imgInfo.width / imgInfo.height);

      const runFaceMesh = async (imgSrc: string): Promise<any> => {
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = () => reject(new Error("Failed to load image for analysis"));
          img.src = imgSrc;
        });

        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            faceMeshCallbackRef.current = null;
            reject(new Error("Face analysis took too long. Please try again."));
          }, 15000);

          faceMeshCallbackRef.current = (results) => {
            clearTimeout(timeout);
            faceMeshCallbackRef.current = null;
            resolve(results);
          };

          faceMeshRef.current!.send({ image: img }).catch((err) => {
            clearTimeout(timeout);
            faceMeshCallbackRef.current = null;
            reject(new Error(err.message || "Failed to send image to AI model"));
          });
        });
      };

      let faceResults = await runFaceMesh(resizedImage);

      if (!faceResults || !faceResults.multiFaceLandmarks || faceResults.multiFaceLandmarks.length === 0) {
        setAnalysisStatus('Enhancing image quality...');
        const enhancedImage = await enhanceImage(resizedImage);
        faceResults = await runFaceMesh(enhancedImage);
      }

      if (!faceResults || !faceResults.multiFaceLandmarks || faceResults.multiFaceLandmarks.length === 0) {
        throw new Error("No face detected. Please ensure your face is clearly visible and well-lit.");
      }

      setAnalysisProgress(50);
      setAnalysisStatus('Calculating symmetry metrics...');
      const rawLandmarks = faceResults.multiFaceLandmarks[0];
      setScanningLandmarks(rawLandmarks);
      
      const v2Metrics = await calculateSymmetryV2(rawLandmarks);
      
      setAnalysisProgress(75);
      setAnalysisStatus('Generating report...');
      
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

      const alignedLandmarks = rawLandmarks.map((p: any) => {
        const tx = p.x - eyeCenterMid.x;
        const ty = p.y - eyeCenterMid.y;
        const rx = tx * Math.cos(-rollAngle) - ty * Math.sin(-rollAngle);
        const ry = tx * Math.sin(-rollAngle) + ty * Math.cos(-rollAngle);
        return { x: rx, y: ry, z: p.z };
      });

      const centralIndices = [8, 1, 2, 152];
      const midlineX = centralIndices.reduce((sum, idx) => sum + alignedLandmarks[idx].x, 0) / centralIndices.length;

      const faceWidth = dist2D(alignedLandmarks[234], alignedLandmarks[454]);
      const faceHeight = dist2D(alignedLandmarks[10], alignedLandmarks[152]);

      const metrics = {
        overallScore: v2Metrics.overallScore,
        percentile: v2Metrics.percentile,
        symmetryScore: v2Metrics.overallScore,
        eyeScore: v2Metrics.eyeSymmetry,
        browsScore: v2Metrics.browsSymmetry,
        mouthScore: v2Metrics.mouthSymmetry,
        jawScore: v2Metrics.jawSymmetry,
        eyeDiff: Math.abs(dist2D(alignedLandmarks[33], alignedLandmarks[133]) - dist2D(alignedLandmarks[263], alignedLandmarks[362])) / faceWidth,
        browsDiff: Math.abs(alignedLandmarks[70].y - alignedLandmarks[300].y) / faceWidth,
        mouthDiff: Math.abs(alignedLandmarks[61].x - midlineX - (midlineX - alignedLandmarks[291].x)) / faceWidth,
        jawDiff: Math.abs(dist2D(alignedLandmarks[152], alignedLandmarks[234]) - dist2D(alignedLandmarks[152], alignedLandmarks[454])) / faceWidth,
        eyeSlant: Math.abs(alignedLandmarks[33].y - alignedLandmarks[263].y) / faceWidth,
        mouthSlant: Math.abs(alignedLandmarks[61].y - alignedLandmarks[291].y) / faceWidth,
        midline: midlineX,
        faceRatio: faceHeight / faceWidth,
        eyeDistanceRatio: (dist2D(leftEyeCenter, rightEyeCenter)) / faceWidth,
        noseLengthRatio: (dist2D(alignedLandmarks[1], alignedLandmarks[168])) / faceHeight,
        mouthWidthRatio: (dist2D(alignedLandmarks[61], alignedLandmarks[291])) / faceWidth,
        jawWidthRatio: dist2D(alignedLandmarks[132], alignedLandmarks[361]) / faceWidth,
        cheekboneWidthRatio: dist2D(alignedLandmarks[127], alignedLandmarks[356]) / faceWidth,
        foreheadRatio: (dist2D(alignedLandmarks[10], alignedLandmarks[168])) / faceHeight,
        foreheadWidthRatio: (dist2D(alignedLandmarks[103], alignedLandmarks[332])) / faceWidth,
        philtrumLengthRatio: (dist2D(alignedLandmarks[2], alignedLandmarks[0])) / faceHeight,
        eyeWidthRatio: ((dist2D(alignedLandmarks[33], alignedLandmarks[133]) + dist2D(alignedLandmarks[263], alignedLandmarks[362])) / 2) / faceWidth,
        noseWidthRatio: (dist2D(alignedLandmarks[102], alignedLandmarks[331])) / faceWidth,
        lowerFaceRatio: (dist2D(alignedLandmarks[164], alignedLandmarks[152])) / faceHeight,
        rotationAngle: rollAngle,
        landmarkConfidence: 0.98,
        faceSize: faceWidth,
        lightingStatus: 'Good' as const,
        absMidline: eyeCenterMid.x + midlineX
      };

      const parsedResult = analyzeLocally(metrics);
      
      setIsFakeScanning(true);
      const scanningSteps = [
        { text: "Analyzing facial features...", timeout: 800, progress: 85 },
        { text: "Calculating balance score...", timeout: 1200, progress: 95 },
        { text: "Generating personalized report...", timeout: 600, progress: 100 }
      ];
      
      for (let i = 0; i < scanningSteps.length; i++) {
        setAnalysisStatus(scanningSteps[i].text);
        setAnalysisProgress(scanningSteps[i].progress);
        await new Promise(resolve => setTimeout(resolve, scanningSteps[i].timeout));
      }
      
      setIsFakeScanning(false);
      setScanningLandmarks(null);

      const balancedImage = await generateSoftSymmetry(resizedImage, rawLandmarks, imgInfo.width, imgInfo.height);
      const symmetryTwins = await generateSymmetryTwins(resizedImage, rawLandmarks, imgInfo.width, imgInfo.height, symmetryStrength);

      const safeLandmarks: any = parsedResult.landmarks || {};
      
      const finalResult: AnalysisResult = {
        ...parsedResult,
        summary: parsedResult.summary,
        overallScore: v2Metrics.overallScore,
        symmetryScore: v2Metrics.overallScore,
        percentile: v2Metrics.percentile,
        balancedImage,
        symmetryTwins,
        landmarks: {
          eyes: { score: v2Metrics.eyeSymmetry, status: safeLandmarks.eyes?.status || "Analysis Complete", feedback: safeLandmarks.eyes?.feedback || "Analysis Complete" },
          brows: { score: v2Metrics.browsSymmetry, status: safeLandmarks.brows?.status || "Analysis Complete", feedback: safeLandmarks.brows?.feedback || "Analysis Complete" },
          mouth: { score: v2Metrics.mouthSymmetry, status: safeLandmarks.mouth?.status || "Analysis Complete", feedback: safeLandmarks.mouth?.feedback || "Analysis Complete" },
          jawline: { score: v2Metrics.jawSymmetry, status: safeLandmarks.jawline?.status || "Analysis Complete", feedback: safeLandmarks.jawline?.feedback || "Analysis Complete" },
        },
        asymmetryZones: [
          { x: rawLandmarks[33].x * 100, y: rawLandmarks[33].y * 100, radius: 6, intensity: Math.min(1, Math.max(0.7, (96 - v2Metrics.eyeSymmetry) / 20)), label: "EYE ASYMMETRY" },
          { x: rawLandmarks[70].x * 100, y: rawLandmarks[70].y * 100, radius: 5, intensity: Math.min(1, Math.max(0.7, (96 - v2Metrics.browsSymmetry) / 20)), label: "BROW ASYMMETRY" },
          { x: rawLandmarks[61].x * 100, y: rawLandmarks[61].y * 100, radius: 6, intensity: Math.min(1, Math.max(0.7, (96 - v2Metrics.mouthSymmetry) / 20)), label: "ORAL ASYMMETRY" },
          { x: rawLandmarks[234].x * 100, y: rawLandmarks[234].y * 100, radius: 8, intensity: Math.min(1, Math.max(0.6, (96 - v2Metrics.jawSymmetry) / 30)), label: "JAW ASYMMETRY" }
        ],
        rawLandmarks,
        metrics: {
          ...metrics,
          midline: metrics.absMidline
        }
      };

      setResult(finalResult);
      // Center offset should be how much we need to shift the image to put the midline at 50%
      // eyeCenterMid.x + midlineX is the absolute X of the midline (0 to 1)
      // We want this to be at 0.5. So offset is (0.5 - (eyeCenterMid.x + midlineX))
      setCenterOffset((0.5 - (eyeCenterMid.x + midlineX)) * 100);
      setRotationAngle(-rollAngle * (180 / Math.PI));
      setCapturedImage(resizedImage);

      if (onAnalysisComplete) {
        onAnalysisComplete(finalResult);
      }

    } catch (err: any) {
      setError(err.message || "An error occurred during analysis. Please try again.");
    } finally {
      setIsAnalyzing(false);
      setAnalysisStatus('');
      faceMeshCallbackRef.current = null;
    }
  }, [engineStatus, initFaceMesh, faceMeshRef, faceMeshCallbackRef, isAnalyzing, isLocked, setError, setIsAnalyzing, setAnalysisStatus, setIsFakeScanning, setScanningLandmarks, symmetryStrength, onAnalysisComplete]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (context) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const base64 = canvas.toDataURL('image/jpeg', 0.95);
      analyzeImage(base64);
      stopCamera();
    }
  }, [analyzeImage, stopCamera, videoRef, canvasRef]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        analyzeImage(base64);
      };
      reader.readAsDataURL(file);
    }
  }, [analyzeImage]);

  const resetAnalysis = useCallback(() => {
    setCapturedImage(null);
    setResult(null);
    setError(null);
    stopCamera();
    setAnalysisProgress(0);
  }, [stopCamera, setError]);

  return {
    capturedImage,
    result,
    centerOffset,
    rotationAngle,
    imageDimensions,
    imageAspectRatio,
    isAnalyzing,
    isFakeScanning,
    scanningLandmarks,
    scanQuality,
    error,
    isCameraReady,
    startCamera,
    stopCamera,
    debugLogs,
    engineStatus,
    initFaceMesh,
    analysisStatus,
    analysisProgress,
    analyzeImage,
    capturePhoto,
    handleFileUpload,
    resetAnalysis,
    symmetryStrength,
    setSymmetryStrength,
    updateSymmetryTwins,
    videoRef,
    canvasRef
  };
}

