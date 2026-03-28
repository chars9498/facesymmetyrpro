import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { analyzeLocally, type AnalysisResult } from "../services/analysisEngine";
import { calculateSymmetryV2 } from "../services/analysisEngine_v2";
import { useFaceAnalysis } from './useFaceAnalysis';
import { enhanceImage, generateSoftSymmetry, generateSymmetryTwins } from "../services/imageProcessor";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_UPLOAD_DIMENSION = 1280;
const MIN_UPLOAD_DIMENSION = 320;
const MIN_FACE_WIDTH_RATIO = 0.22;
const MIN_FACE_HEIGHT_RATIO = 0.28;
const MAX_FACE_CENTER_OFFSET = 0.18;
const MAX_FACE_TILT_RADIANS = 0.3;

type ProcessedUploadImage = {
  dataUrl: string;
  width: number;
  height: number;
};

const readFileAsDataUrl = (file: File): Promise<ProcessedUploadImage> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const preview = new Image();
        preview.onload = () => resolve({
          dataUrl: reader.result as string,
          width: preview.naturalWidth || preview.width,
          height: preview.naturalHeight || preview.height
        });
        preview.onerror = () => reject(new Error('FILE_READ_ERROR'));
        preview.src = reader.result;
        return;
      }
      reject(new Error('FILE_READ_ERROR'));
    };
    reader.onerror = () => reject(new Error('FILE_READ_ERROR'));
    reader.readAsDataURL(file);
  });

const downscaleUploadImage = async (file: File): Promise<ProcessedUploadImage> => {
  const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const objectUrl = URL.createObjectURL(file);

  const drawToCanvas = (source: CanvasImageSource, width: number, height: number) => {
    const scale = Math.min(1, MAX_UPLOAD_DIMENSION / Math.max(width, height));
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('CANVAS_CONTEXT_ERROR');
    }
    ctx.drawImage(source, 0, 0, targetWidth, targetHeight);
    return {
      dataUrl: canvas.toDataURL(mimeType, mimeType === 'image/png' ? undefined : 0.9),
      width,
      height
    };
  };

  try {
    if (typeof createImageBitmap === 'function') {
      const bitmap = await createImageBitmap(file);
      try {
        return drawToCanvas(bitmap, bitmap.width, bitmap.height);
      } finally {
        bitmap.close();
      }
    }

    return await new Promise<ProcessedUploadImage>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          resolve(drawToCanvas(img, img.naturalWidth || img.width, img.naturalHeight || img.height));
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error('IMAGE_DECODE_ERROR'));
      img.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

interface AnalysisFlowOptions {
  onAnalysisComplete?: (result: AnalysisResult) => void;
}

export function useAnalysisFlow({ onAnalysisComplete }: AnalysisFlowOptions = {}) {
  const { t, i18n } = useTranslation();
  const {
    engineStatus,
    initFaceMesh,
    isAnalyzing,
    setIsAnalyzing,
    isFakeScanning,
    setIsFakeScanning,
    scanningLandmarks,
    setScanningLandmarks,
    error,
    setError,
    isCameraActive: isCameraReady,
    startCamera,
    stopCamera,
    analysisStep: analysisStatus,
    setAnalysisStep: setAnalysisStatus,
    faceMeshRef,
    isFaceMeshBusyRef,
    faceMeshCallbackRef,
    videoRef,
    canvasRef
  } = useFaceAnalysis();

  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [centerOffset, setCenterOffset] = useState(0);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [imageAspectRatio, setImageAspectRatio] = useState(1);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [symmetryStrength, setSymmetryStrength] = useState(0.85);

  const getFaceValidationKey = useCallback((results: any, requireCentered: boolean = false) => {
    const faces = results?.multiFaceLandmarks ?? [];
    if (faces.length === 0) {
      return 'errors.noFaceDetected';
    }
    if (faces.length > 1) {
      return 'errors.multipleFacesDetected';
    }

    const landmarks = faces[0];
    if (!landmarks?.length) {
      return 'errors.noFaceDetected';
    }

    const xs = landmarks.map((point: any) => point.x);
    const ys = landmarks.map((point: any) => point.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const faceWidth = maxX - minX;
    const faceHeight = maxY - minY;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const tilt = leftEye && rightEye
      ? Math.abs(Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x))
      : 0;

    if (
      faceWidth < MIN_FACE_WIDTH_RATIO ||
      faceHeight < MIN_FACE_HEIGHT_RATIO ||
      tilt > MAX_FACE_TILT_RADIANS ||
      (
        requireCentered &&
        (
          Math.abs(centerX - 0.5) > MAX_FACE_CENTER_OFFSET ||
          Math.abs(centerY - 0.45) > MAX_FACE_CENTER_OFFSET
        )
      )
    ) {
      return 'errors.faceTooSmallOrTilted';
    }

    return null;
  }, []);

  const runFaceMesh = useCallback(async (
    imageSource: string | HTMLCanvasElement,
    source: 'camera' | 'upload',
    options: { updatePreview?: boolean } = {}
  ): Promise<any> => {
    const { updatePreview = true } = options;
    console.log(`[useAnalysisFlow] runFaceMesh started: source=${source}`);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.error('[useAnalysisFlow] FaceMesh analysis timed out');
        reject(new Error(t('errors.timeout')));
      }, 15000);

      const processSource = async (loadedSource: CanvasImageSource, width: number, height: number) => {
        if (width === 0 || height === 0) {
          clearTimeout(timeout);
          reject(new Error(t('errors.invalidDimensions')));
          return;
        }

        try {
          const canvas = document.createElement('canvas');
          const MAX_ANALYSIS_DIM = 640;
          let targetWidth = width;
          let targetHeight = height;

          if (targetWidth > MAX_ANALYSIS_DIM || targetHeight > MAX_ANALYSIS_DIM) {
            const scale = Math.min(MAX_ANALYSIS_DIM / targetWidth, MAX_ANALYSIS_DIM / targetHeight);
            targetWidth = Math.round(targetWidth * scale);
            targetHeight = Math.round(targetHeight * scale);
            console.log('[useAnalysisFlow] runFaceMesh: scaling down for analysis', { targetWidth, targetHeight });
          }

          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error(t('errors.canvasContext'));

          ctx.drawImage(loadedSource, 0, 0, targetWidth, targetHeight);
          await new Promise(requestAnimationFrame);

          if (updatePreview) {
            setImageDimensions({ width: targetWidth, height: targetHeight });
            setImageAspectRatio(targetWidth / targetHeight);
          }

          if (isFaceMeshBusyRef.current) {
            await new Promise(r => setTimeout(r, 500));
          }

          faceMeshCallbackRef.current = (results) => {
            clearTimeout(timeout);
            isFaceMeshBusyRef.current = false;
            faceMeshCallbackRef.current = null;
            resolve(results);
          };

          isFaceMeshBusyRef.current = true;
          await faceMeshRef.current?.send({ image: canvas });
        } catch (err) {
          clearTimeout(timeout);
          console.error('[useAnalysisFlow] runFaceMesh error:', err);
          isFaceMeshBusyRef.current = false;
          faceMeshCallbackRef.current = null;
          reject(err);
        }
      };

      if (typeof imageSource !== 'string') {
        processSource(imageSource, imageSource.width, imageSource.height);
        return;
      }

      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = async () => {
        await processSource(image, image.width, image.height);
      };
      image.onerror = (e) => {
        clearTimeout(timeout);
        console.error('[useAnalysisFlow] runFaceMesh: image load error', e);
        reject(new Error(t('errors.loadFailed')));
      };
      image.src = imageSource;
    });
  }, [faceMeshRef, faceMeshCallbackRef, isFaceMeshBusyRef, setImageDimensions, setImageAspectRatio, t]);

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

  const analyzeImage = useCallback(async (base64Image: string, source: 'camera' | 'upload' = 'camera') => {
    if (isAnalyzing) return;
    
    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    setCapturedImage(base64Image); // Set early to prevent UI reset
    setCenterOffset(0);
    setRotationAngle(0);
    setAnalysisProgress(0);
    setAnalysisStatus(t('analysis.steps.initializing'));
    console.log('[DEBUG] ANALYSIS_START', { source });

    try {
      setAnalysisProgress(10);
      
      // Lazy initialize engine if needed
      if (engineStatus !== 'ready') {
        setAnalysisStatus(t('analysis.steps.initializingEngine'));
        const success = await initFaceMesh();
        if (!success) {
          throw new Error(t('errors.initFailed'));
        }
      }

      await new Promise(resolve => setTimeout(resolve, 300));

      if (!faceMeshRef.current) {
        throw new Error(t('errors.modelNotReady'));
      }

      setAnalysisStatus(t('analysis.steps.detecting'));
      setAnalysisProgress(25);

      // Initial analysis attempt
      let faceResults;
      try {
        faceResults = await runFaceMesh(base64Image, source);
      } catch (err) {
        console.warn('[useAnalysisFlow] Initial analysis failed', err);
      }

      const firstValidationKey = getFaceValidationKey(faceResults);

      // Retry only when no face is found on upload
      if (source === 'upload' && firstValidationKey === 'errors.noFaceDetected') {
        console.log('[DEBUG] UPLOAD_RETRY_ENHANCED');
        setAnalysisStatus(t('analysis.steps.retrying'));
        
        // Slightly increase contrast/brightness before retry
        const enhancedImage = await enhanceImage(base64Image);
        try {
          faceResults = await runFaceMesh(enhancedImage, 'upload');
        } catch (err) {
          console.error('[useAnalysisFlow] Enhanced retry failed', err);
        }
      }

      const validationKey = getFaceValidationKey(faceResults, source === 'camera');
      if (validationKey) {
        throw new Error(t(validationKey));
      }

      setAnalysisProgress(50);
      setAnalysisStatus(t('analysis.steps.calculating'));
      const rawLandmarks = faceResults.multiFaceLandmarks[0];
      setScanningLandmarks(rawLandmarks);
      
      const v2Metrics = await calculateSymmetryV2(rawLandmarks);
      
      setAnalysisProgress(75);
      setAnalysisStatus(t('analysis.steps.generating'));
      
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
        { text: t('analysis.steps.analyzingFeatures'), timeout: 800, progress: 85 },
        { text: t('analysis.steps.calculatingScore'), timeout: 1200, progress: 90 },
        { text: t('analysis.steps.generatingPersonalized'), timeout: 600, progress: 94 }
      ];
      
      for (let i = 0; i < scanningSteps.length; i++) {
        setAnalysisStatus(scanningSteps[i].text);
        setAnalysisProgress(scanningSteps[i].progress);
        await new Promise(resolve => setTimeout(resolve, scanningSteps[i].timeout));
      }
      
      setIsFakeScanning(false);
      setScanningLandmarks(null);

      // Use original image for final processing
      const finalImgInfo = new Image();
      finalImgInfo.src = base64Image;
      try {
        console.log('[useAnalysisFlow] Decoding final image for processing');
        await finalImgInfo.decode();
        console.log('[useAnalysisFlow] Final image decoded successfully', {
          w: finalImgInfo.width,
          h: finalImgInfo.height
        });
      } catch (e) {
        console.warn('[useAnalysisFlow] Final image decode failed, falling back to onload', e);
        await new Promise((resolve) => {
          finalImgInfo.onload = () => {
            console.log('[useAnalysisFlow] Final image fallback onload success');
            resolve(true);
          };
          finalImgInfo.onerror = (err) => {
            console.error('[useAnalysisFlow] Final image fallback onload failed', err);
            resolve(false);
          };
        });
      }

      // 5. Fallback behavior: if processed image generation fails, show original
      let balancedImage = base64Image;
      let symmetryTwins = { left: base64Image, right: base64Image };

      setAnalysisStatus(t('analysis.steps.renderingResults'));
      setAnalysisProgress(97);

      try {
        console.log('[useAnalysisFlow] Generating final images: soft symmetry and twins');
        const [softSym, twins] = await Promise.all([
          generateSoftSymmetry(base64Image, rawLandmarks, finalImgInfo.width || imageDimensions.width, finalImgInfo.height || imageDimensions.height),
          generateSymmetryTwins(base64Image, rawLandmarks, finalImgInfo.width || imageDimensions.width, finalImgInfo.height || imageDimensions.height, symmetryStrength)
        ]);
        
        if (softSym && softSym !== base64Image) {
          console.log('[useAnalysisFlow] Soft symmetry generated successfully');
          balancedImage = softSym;
        } else {
          console.warn('[useAnalysisFlow] Soft symmetry generation returned original or empty');
        }

        if (twins && twins.left && twins.right) {
          console.log('[useAnalysisFlow] Symmetry twins generated successfully');
          symmetryTwins = twins;
        } else {
          console.warn('[useAnalysisFlow] Symmetry twins generation returned invalid object');
        }
      } catch (imgErr) {
        console.error('[useAnalysisFlow] Final image generation failed critical error', imgErr);
      }

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
          eyes: { score: v2Metrics.eyeSymmetry, status: safeLandmarks.eyes?.status || t('analysis.feedback.status.analyzed'), feedback: safeLandmarks.eyes?.feedback || t('analysis.feedback.status.analyzed') },
          brows: { score: v2Metrics.browsSymmetry, status: safeLandmarks.brows?.status || t('analysis.feedback.status.analyzed'), feedback: safeLandmarks.brows?.feedback || t('analysis.feedback.status.analyzed') },
          mouth: { score: v2Metrics.mouthSymmetry, status: safeLandmarks.mouth?.status || t('analysis.feedback.status.analyzed'), feedback: safeLandmarks.mouth?.feedback || t('analysis.feedback.status.analyzed') },
          jawline: { score: v2Metrics.jawSymmetry, status: safeLandmarks.jawline?.status || t('analysis.feedback.status.analyzed'), feedback: safeLandmarks.jawline?.feedback || t('analysis.feedback.status.analyzed') },
        },
        asymmetryZones: [
          { x: rawLandmarks[33].x * 100, y: rawLandmarks[33].y * 100, radius: 6, intensity: Math.min(1, Math.max(0.7, (96 - v2Metrics.eyeSymmetry) / 20)), label: t('analysis.labels.eyeAsymmetry') },
          { x: rawLandmarks[70].x * 100, y: rawLandmarks[70].y * 100, radius: 5, intensity: Math.min(1, Math.max(0.7, (96 - v2Metrics.browsSymmetry) / 20)), label: t('analysis.labels.browAsymmetry') },
          { x: rawLandmarks[61].x * 100, y: rawLandmarks[61].y * 100, radius: 6, intensity: Math.min(1, Math.max(0.7, (96 - v2Metrics.mouthSymmetry) / 20)), label: t('analysis.labels.oralAsymmetry') },
          { x: rawLandmarks[234].x * 100, y: rawLandmarks[234].y * 100, radius: 8, intensity: Math.min(1, Math.max(0.6, (96 - v2Metrics.jawSymmetry) / 30)), label: t('analysis.labels.jawAsymmetry') }
        ],
        rawLandmarks,
        metrics: {
          ...metrics,
          midline: metrics.absMidline
        }
      };

      setAnalysisProgress(100);
      console.log('[DEBUG] SETTING_RESULT', finalResult.overallScore);
      setResult(finalResult);
      console.log('[DEBUG] REPORT_SHOWN');
      setCenterOffset((0.5 - (eyeCenterMid.x + midlineX)) * 100);
      setRotationAngle(-rollAngle * (180 / Math.PI));
      setCapturedImage(base64Image);

      if (onAnalysisComplete) {
        console.log('[DEBUG] CALLING_ON_ANALYSIS_COMPLETE');
        onAnalysisComplete(finalResult);
      }

    } catch (err: any) {
      console.error("[DEBUG] ANALYSIS_ERROR", err);
      setError(err.message || t('errors.analysisFailed'));
    } finally {
      console.log('[DEBUG] ANALYSIS_FINALLY');
      setIsAnalyzing(false);
      setAnalysisStatus('');
      faceMeshCallbackRef.current = null;
    }
  }, [engineStatus, initFaceMesh, isAnalyzing, setError, setIsAnalyzing, setAnalysisStatus, setIsFakeScanning, setScanningLandmarks, symmetryStrength, onAnalysisComplete, runFaceMesh, getFaceValidationKey, t]);

  const capturePhoto = useCallback(async () => {
    console.log('[DEBUG] CAPTURE_CLICKED');
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    
    // 1. Ensure the captured frame is valid.
    if (!video.videoWidth || !video.videoHeight) {
      setError(t('errors.invalidDimensions'));
      return;
    }

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (context) {
      // 1. Set canvas size EXACTLY from the video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // 2. Remove ALL mirror transforms from the analysis image.
      // (No translate or scale here)
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // 3. Add safe image resizing before analysis.
      const maxSize = 640;
      const scale = Math.min(maxSize / canvas.width, maxSize / canvas.height);
      
      let finalBase64 = '';
      if (scale < 1) {
        const resizedCanvas = document.createElement('canvas');
        resizedCanvas.width = canvas.width * scale;
        resizedCanvas.height = canvas.height * scale;
        const rCtx = resizedCanvas.getContext('2d');
        if (rCtx) {
          rCtx.drawImage(canvas, 0, 0, resizedCanvas.width, resizedCanvas.height);
          finalBase64 = resizedCanvas.toDataURL('image/jpeg', 0.95);
        } else {
          finalBase64 = canvas.toDataURL('image/jpeg', 0.95);
        }
      } else {
        finalBase64 = canvas.toDataURL('image/jpeg', 0.95);
      }
      
      // 4. Add debug validation before faceMesh.send()
      console.log('[DEBUG] CAPTURE_VALIDATION', {
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        scale
      });

      try {
        if (engineStatus !== 'ready') {
          const ready = await initFaceMesh();
          if (!ready) {
            throw new Error(t('errors.initFailed'));
          }
        }

        const captureCheck = await runFaceMesh(canvas, 'camera', { updatePreview: false });
        const captureErrorKey = getFaceValidationKey(captureCheck, true);
        if (captureErrorKey) {
          setError(t(captureErrorKey));
          return;
        }
      } catch (err: any) {
        setError(err?.message || t('errors.analysisFailed'));
        return;
      }
      
      // Stop camera before starting analysis to free up resources
      stopCamera();
      
      // Small delay to ensure camera tracks are fully stopped and FaceMesh is idle
      setTimeout(() => {
        analyzeImage(finalBase64, 'camera');
      }, 100);
    }
  }, [analyzeImage, engineStatus, getFaceValidationKey, initFaceMesh, runFaceMesh, stopCamera, videoRef, canvasRef, setError, t]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('[DEBUG] FILE_SELECTED');
    const file = e.target.files?.[0];
    e.target.value = '';

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError(t('errors.unsupportedFormat'));
      return;
    }

    if (file.size === 0) {
      setError(t('errors.emptyFile'));
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      setError(t('errors.fileTooLarge'));
      return;
    }

    try {
      setError(null);
      let processedImage: ProcessedUploadImage;

      try {
        processedImage = await downscaleUploadImage(file);
      } catch (preprocessError) {
        console.warn('[useAnalysisFlow] Downscale failed, falling back to FileReader', preprocessError);
        processedImage = await readFileAsDataUrl(file);
      }

      if (
        processedImage.width < MIN_UPLOAD_DIMENSION ||
        processedImage.height < MIN_UPLOAD_DIMENSION
      ) {
        setError(t('errors.lowResolution'));
        return;
      }

      analyzeImage(processedImage.dataUrl, 'upload');
    } catch (err) {
      console.error('[useAnalysisFlow] File preprocessing failed', err);
      setError(t('errors.loadFailed'));
    }
  }, [analyzeImage, setError, t]);

  const resetAnalysis = useCallback(() => {
    console.log('[DEBUG] RESET_CALLED');
    setCapturedImage(null);
    setResult(null);
    setError(null);
    stopCamera();
    setAnalysisProgress(0);
  }, [stopCamera, setError]);

  // Re-run analysis when language changes to prevent mixed-language UI
  useEffect(() => {
    if (result && result.metrics) {
      // Re-run the local analysis with the same metrics but current language
      const updatedResult = analyzeLocally(result.metrics as any);
      
      setResult(prev => {
        if (!prev) return null;
        // Merge updated translated strings with existing calculated data (images, etc.)
        return {
          ...prev,
          ...updatedResult,
          // Preserve fields that are not generated by analyzeLocally but added in analyzeImage
          balancedImage: prev.balancedImage,
          symmetryTwins: prev.symmetryTwins,
          rawLandmarks: prev.rawLandmarks,
          // Deep merge landmarks to preserve scores if they were added
          landmarks: {
            eyes: { ...prev.landmarks.eyes, ...updatedResult.landmarks.eyes },
            brows: { ...prev.landmarks.brows, ...updatedResult.landmarks.brows },
            mouth: { ...prev.landmarks.mouth, ...updatedResult.landmarks.mouth },
            jawline: { ...prev.landmarks.jawline, ...updatedResult.landmarks.jawline },
          }
        };
      });
    }
  }, [i18n.language]);

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
    error,
    isCameraReady,
    startCamera,
    stopCamera,
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
