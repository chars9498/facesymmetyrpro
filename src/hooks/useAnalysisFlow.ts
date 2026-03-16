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
    analysisStep: analysisStatus,
    setAnalysisStep: setAnalysisStatus,
    faceMeshRef,
    isFaceMeshBusyRef,
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

  const analyzeImage = useCallback(async (base64Image: string, source: 'camera' | 'upload' = 'camera') => {
    if (isAnalyzing) return;
    
    if (isLocked) {
      setError("Analysis limit reached. Please unlock to continue.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    setCapturedImage(base64Image); // Set early to prevent UI reset
    setCenterOffset(0);
    setRotationAngle(0);
    setAnalysisProgress(0);
    setAnalysisStatus('Initializing AI...');
    console.log('[DEBUG] ANALYSIS_START', { source });

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

      const runFaceMesh = async (imgSrc: string, isRetry: boolean = false): Promise<any> => {
        // ---------------------------------------------------------
        // UPLOAD PIPELINE (Instruction 1-6)
        // ---------------------------------------------------------
        if (source === 'upload') {
          return new Promise((resolve, reject) => {
            const image = new Image();
            
            // 1. Ensure the uploaded image is fully loaded before analysis.
            image.onload = async () => {
              try {
                // 2. Validate dimensions before analysis
                if (image.width === 0 || image.height === 0) {
                  throw new Error("Invalid image dimensions (0x0)");
                }

                // 4. Safe resize after image load only
                const maxDim = 640;
                let targetWidth = image.width;
                let targetHeight = image.height;
                if (targetWidth > targetHeight) {
                  if (targetWidth > maxDim) {
                    targetHeight *= maxDim / targetWidth;
                    targetWidth = maxDim;
                  }
                } else {
                  if (targetHeight > maxDim) {
                    targetWidth *= maxDim / targetHeight;
                    targetHeight = maxDim;
                  }
                }

                const canvas = document.createElement('canvas');
                canvas.width = targetWidth;
                canvas.height = targetHeight;
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                  throw new Error("Failed to create canvas context");
                }

                // 3. Ensure canvas draw actually completes
                ctx.drawImage(image, 0, 0, targetWidth, targetHeight);
                
                // Wait one animation frame to ensure draw completes
                await new Promise(requestAnimationFrame);

                // Final validation before sending
                if (canvas.width === 0 || canvas.height === 0) {
                  throw new Error("Invalid canvas dimensions (0x0)");
                }

                // Update dimensions for UI scaling
                setImageDimensions({ width: targetWidth, height: targetHeight });
                setImageAspectRatio(targetWidth / targetHeight);

                // 5. Log debugging values before analysis.
                console.log('[DEBUG] UPLOAD_PIPELINE_SEND', {
                  imageWidth: image.width,
                  imageHeight: image.height,
                  canvasWidth: canvas.width,
                  canvasHeight: canvas.height,
                  isRetry
                });

                // Handle busy state if needed
                if (isFaceMeshBusyRef.current) {
                  await new Promise(r => setTimeout(r, 500));
                }

                const timeout = setTimeout(() => {
                  faceMeshCallbackRef.current = null;
                  isFaceMeshBusyRef.current = false;
                  reject(new Error("Face analysis took too long. Please try again."));
                }, 15000);

                faceMeshCallbackRef.current = (results) => {
                  clearTimeout(timeout);
                  faceMeshCallbackRef.current = null;
                  isFaceMeshBusyRef.current = false;
                  resolve(results);
                };

                isFaceMeshBusyRef.current = true;

                // 4. Wait one frame before calling FaceMesh.
                requestAnimationFrame(() => {
                  if (!faceMeshRef.current) {
                    clearTimeout(timeout);
                    isFaceMeshBusyRef.current = false;
                    reject(new Error("Face detection model is not ready."));
                    return;
                  }

                  faceMeshRef.current.send({ image: canvas }).catch((err: any) => {
                    clearTimeout(timeout);
                    faceMeshCallbackRef.current = null;
                    isFaceMeshBusyRef.current = false;
                    reject(new Error(err.message || "Failed to send image to AI model"));
                  });
                });
              } catch (err: any) {
                reject(err);
              }
            };

            image.onerror = () => reject(new Error("Failed to load image for analysis"));
            image.src = imgSrc;
          });
        }

        // ---------------------------------------------------------
        // CAMERA PIPELINE (Instruction 7: Do not modify)
        // ---------------------------------------------------------
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = () => {
            setImageDimensions({ width: img.width, height: img.height });
            setImageAspectRatio(img.width / img.height);
            resolve(null);
          };
          img.onerror = () => reject(new Error("Failed to load image for analysis"));
          img.src = imgSrc;
        });

        if (isFaceMeshBusyRef.current) {
          // Wait a bit if busy
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            faceMeshCallbackRef.current = null;
            isFaceMeshBusyRef.current = false;
            reject(new Error("Face analysis took too long. Please try again."));
          }, 15000);

          faceMeshCallbackRef.current = (results) => {
            clearTimeout(timeout);
            faceMeshCallbackRef.current = null;
            isFaceMeshBusyRef.current = false;
            resolve(results);
          };

          isFaceMeshBusyRef.current = true;
          
          // 4. Add debug validation before faceMesh.send()
          console.log('[DEBUG] FACEMESH_SEND', {
            width: img.width,
            height: img.height
          });

          if (img.width === 0 || img.height === 0) {
            clearTimeout(timeout);
            isFaceMeshBusyRef.current = false;
            reject(new Error("Invalid image dimensions for analysis"));
            return;
          }

          // 5. Ensure FaceMesh receives the canvas correctly
          const analysisCanvas = document.createElement('canvas');
          analysisCanvas.width = img.width;
          analysisCanvas.height = img.height;
          const analysisCtx = analysisCanvas.getContext('2d');
          
          if (analysisCtx) {
            analysisCtx.drawImage(img, 0, 0);
            
            // 3. Ensure the canvas frame is fully rendered before analysis.
            if (analysisCanvas.width > 0 && analysisCanvas.height > 0) {
              // 5. Add debug logging before send():
              console.log("FaceMesh analysis starting", {
                width: analysisCanvas.width,
                height: analysisCanvas.height
              });

              // 1. Delay FaceMesh analysis by one frame after capture.
              // Using requestAnimationFrame or a small timeout to ensure state is settled
              setTimeout(() => {
                if (!faceMeshRef.current) {
                  reject(new Error("FaceMesh instance lost during delay"));
                  return;
                }
                
                faceMeshRef.current.send({ image: analysisCanvas }).catch((err: any) => {
                  clearTimeout(timeout);
                  faceMeshCallbackRef.current = null;
                  isFaceMeshBusyRef.current = false;
                  reject(new Error(err.message || "Failed to send image to AI model"));
                });
              }, 60); // 60ms is roughly 4 frames at 60fps, very safe
            } else {
              clearTimeout(timeout);
              isFaceMeshBusyRef.current = false;
              reject(new Error("Failed to render analysis frame"));
            }
          } else {
            // Fallback if context creation fails
            console.log("FaceMesh analysis starting (fallback)", {
              width: img.width,
              height: img.height
            });
            
            setTimeout(() => {
              faceMeshRef.current!.send({ image: img }).catch((err) => {
                clearTimeout(timeout);
                faceMeshCallbackRef.current = null;
                isFaceMeshBusyRef.current = false;
                reject(new Error(err.message || "Failed to send image to AI model"));
              });
            }, 60);
          }
        });
      };

      // Initial analysis attempt
      let faceResults = await runFaceMesh(base64Image);

      // 5. Add one retry path for upload only
      if (source === 'upload' && (!faceResults || !faceResults.multiFaceLandmarks || faceResults.multiFaceLandmarks.length === 0)) {
        console.log('[DEBUG] UPLOAD_RETRY_ENHANCED');
        setAnalysisStatus('Could not detect landmarks from this image. Retrying...');
        
        // Slightly increase contrast/brightness before retry
        const enhancedImage = await enhanceImage(base64Image);
        faceResults = await runFaceMesh(enhancedImage, true);
        
        if (!faceResults || !faceResults.multiFaceLandmarks || faceResults.multiFaceLandmarks.length === 0) {
          throw new Error("Face analysis failed on this image. Please try another photo.");
        }
      }

      // Camera pipeline retry logic (Instruction 7: Do not modify)
      if (source === 'camera') {
        if (!faceResults || !faceResults.multiFaceLandmarks || faceResults.multiFaceLandmarks.length === 0) {
          console.log('[DEBUG] FACEMESH_RETRY_ENHANCED');
          setAnalysisStatus('Enhancing image quality...');
          const enhancedImage = await enhanceImage(base64Image);
          faceResults = await runFaceMesh(enhancedImage);
        }

        if (!faceResults || !faceResults.multiFaceLandmarks || faceResults.multiFaceLandmarks.length === 0) {
          console.log('[DEBUG] FACEMESH_RETRY_DELAY');
          await new Promise(resolve => setTimeout(resolve, 1000));
          faceResults = await runFaceMesh(base64Image);
        }

        if (!faceResults || !faceResults.multiFaceLandmarks || faceResults.multiFaceLandmarks.length === 0) {
          throw new Error("No face detected. Please ensure your face is clearly visible and well-lit.");
        }
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

      // Use original image for final processing
      const finalImgInfo = new Image();
      finalImgInfo.src = base64Image;
      await finalImgInfo.decode();

      const balancedImage = await generateSoftSymmetry(base64Image, rawLandmarks, finalImgInfo.width, finalImgInfo.height);
      const symmetryTwins = await generateSymmetryTwins(base64Image, rawLandmarks, finalImgInfo.width, finalImgInfo.height, symmetryStrength);

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
      console.log('[DEBUG] REPORT_SHOWN');
      setCenterOffset((0.5 - (eyeCenterMid.x + midlineX)) * 100);
      setRotationAngle(-rollAngle * (180 / Math.PI));
      setCapturedImage(base64Image);

      if (onAnalysisComplete) {
        onAnalysisComplete(finalResult);
      }

    } catch (err: any) {
      console.error("Analysis Error:", err);
      setError(err.message || "Face analysis failed. Please ensure your face is clearly visible and try again.");
    } finally {
      setIsAnalyzing(false);
      setAnalysisStatus('');
      faceMeshCallbackRef.current = null;
    }
  }, [engineStatus, initFaceMesh, faceMeshRef, faceMeshCallbackRef, isAnalyzing, isLocked, setError, setIsAnalyzing, setAnalysisStatus, setIsFakeScanning, setScanningLandmarks, symmetryStrength, onAnalysisComplete]);

  const capturePhoto = useCallback(() => {
    console.log('[DEBUG] CAPTURE_CLICKED');
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    
    // 1. Ensure the captured frame is valid.
    if (!video.videoWidth || !video.videoHeight) {
      setError("Invalid video dimensions. Please wait for the camera to initialize.");
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
      
      // Stop camera before starting analysis to free up resources
      stopCamera();
      
      // Small delay to ensure camera tracks are fully stopped and FaceMesh is idle
      setTimeout(() => {
        analyzeImage(finalBase64, 'camera');
      }, 100);
    }
  }, [analyzeImage, stopCamera, videoRef, canvasRef, setError]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('[DEBUG] FILE_SELECTED');
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        analyzeImage(base64, 'upload');
      };
      reader.readAsDataURL(file);
    }
  }, [analyzeImage]);

  const resetAnalysis = useCallback(() => {
    console.log('[DEBUG] RESET_CALLED');
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

