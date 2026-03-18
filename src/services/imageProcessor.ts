/**
 * Resizes an image to fit within maxDimension while maintaining aspect ratio.
 */
export const resizeImage = (base64Str: string, maxDimension: number = 1024): Promise<string> => {
  return new Promise((resolve) => {
    console.log('[imageProcessor] resizeImage started', { maxDimension });
    const img = new Image();
    img.onload = () => {
      console.log('[imageProcessor] resizeImage: source image loaded', { w: img.width, h: img.height });
      let width = img.width;
      let height = img.height;

      if (width === 0 || height === 0) {
        console.warn('[imageProcessor] resizeImage: zero dimensions, returning original');
        resolve(base64Str);
        return;
      }

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

      try {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          console.warn('[imageProcessor] resizeImage: failed to get context');
          resolve(base64Str);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const result = canvas.toDataURL('image/jpeg', 0.85);
        if (result === 'data:,' || !result) {
          throw new Error('toDataURL failed');
        }
        console.log('[imageProcessor] resizeImage completed');
        resolve(result);
      } catch (e) {
        console.error('[imageProcessor] resizeImage failed', e);
        resolve(base64Str);
      }
    };
    img.onerror = (e) => {
      console.error('[imageProcessor] resizeImage: image load error', e);
      resolve(base64Str);
    };
    img.src = base64Str;
  });
};

/**
 * Enhances image brightness and contrast for better face detection.
 */
export const enhanceImage = (base64Str: string): Promise<string> => {
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

/**
 * Generates a soft symmetry version of the face.
 */
export const generateSoftSymmetry = async (
  imgSrc: string,
  landmarks: any[],
  width: number,
  height: number
): Promise<string> => {
  try {
    console.log('[imageProcessor] generateSoftSymmetry started', { width, height });
    
    // Safety: Cap dimensions for mobile memory stability
    const MAX_PROCESS_DIM = 1280;
    let targetWidth = width;
    let targetHeight = height;
    
    if (targetWidth > MAX_PROCESS_DIM || targetHeight > MAX_PROCESS_DIM) {
      const scale = Math.min(MAX_PROCESS_DIM / targetWidth, MAX_PROCESS_DIM / targetHeight);
      targetWidth = Math.round(targetWidth * scale);
      targetHeight = Math.round(targetHeight * scale);
      console.log('[imageProcessor] generateSoftSymmetry: scaling down for memory', { targetWidth, targetHeight });
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      console.warn('[imageProcessor] generateSoftSymmetry: failed to get context');
      return imgSrc;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    
    try {
      img.src = imgSrc;
      await img.decode();
      console.log('[imageProcessor] generateSoftSymmetry: source image decoded', {
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight
      });
    } catch (decodeError) {
      console.error('[imageProcessor] generateSoftSymmetry: decode failed', decodeError);
      // Fallback to onload if decode fails
      await new Promise((resolve, reject) => {
        img.onload = () => {
          console.log('[imageProcessor] generateSoftSymmetry: fallback onload success');
          resolve(true);
        };
        img.onerror = (e) => {
          console.error('[imageProcessor] generateSoftSymmetry: fallback onload failed', e);
          reject(e);
        };
      });
    }

    if (img.naturalWidth === 0 || img.naturalHeight === 0) {
      throw new Error('Decoded image has zero dimensions');
    }

    // 1. Face Alignment
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const angle = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);

    // 2. Robust Midline Detection
    const midlinePoints = [landmarks[168], landmarks[1], landmarks[164], landmarks[152]];
    const midlineX = (midlinePoints.reduce((sum, p) => sum + p.x, 0) / midlinePoints.length) * targetWidth;

    // Draw original aligned
    ctx.save();
    ctx.translate(midlineX, targetHeight / 2);
    ctx.rotate(-angle);
    ctx.translate(-midlineX, -targetHeight / 2);
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
    ctx.restore();
    
    // Verify canvas is not empty
    const testPixel = ctx.getImageData(Math.floor(targetWidth/2), Math.floor(targetHeight/2), 1, 1).data;
    console.log('[imageProcessor] generateSoftSymmetry: canvas test pixel', { r: testPixel[0], g: testPixel[1], b: testPixel[2], a: testPixel[3] });
    
    const alignedData = ctx.getImageData(0, 0, targetWidth, targetHeight);
    
    // Create mirrored version in memory
    const mirroredCanvas = document.createElement('canvas');
    mirroredCanvas.width = targetWidth;
    mirroredCanvas.height = targetHeight;
    const mCtx = mirroredCanvas.getContext('2d');
    if (!mCtx) return imgSrc;

    mCtx.save();
    mCtx.translate(midlineX, 0);
    mCtx.scale(-1, 1);
    mCtx.translate(-midlineX, 0);
    mCtx.drawImage(canvas, 0, 0);
    mCtx.restore();

    const mirroredData = mCtx.getImageData(0, 0, targetWidth, targetHeight);
    const resultData = ctx.createImageData(targetWidth, targetHeight);

    // 3. Create a face mask using landmarks
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = targetWidth;
    maskCanvas.height = targetHeight;
    const maskCtx = maskCanvas.getContext('2d');
    if (maskCtx) {
      maskCtx.fillStyle = 'black';
      maskCtx.fillRect(0, 0, targetWidth, targetHeight);
      
      // Draw face silhouette
      maskCtx.fillStyle = 'white';
      maskCtx.beginPath();
      // Face oval indices (more precise set)
      const faceOvalIndices = [
        10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109
      ];
      
      const firstPoint = landmarks[faceOvalIndices[0]];
      maskCtx.moveTo(firstPoint.x * targetWidth, firstPoint.y * targetHeight);
      for (let i = 1; i < faceOvalIndices.length; i++) {
        const p = landmarks[faceOvalIndices[i]];
        maskCtx.lineTo(p.x * targetWidth, p.y * targetHeight);
      }
      maskCtx.closePath();
      maskCtx.fill();
      
      // Use a smaller blur for sharper edges, preventing background ghosting
      maskCtx.filter = 'blur(10px)';
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = targetWidth;
      tempCanvas.height = targetHeight;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.drawImage(maskCanvas, 0, 0);
        maskCtx.clearRect(0, 0, targetWidth, targetHeight);
        maskCtx.drawImage(tempCanvas, 0, 0);
      }
    }
    const maskData = maskCtx?.getImageData(0, 0, targetWidth, targetHeight);

    // 4, 5. Soft Symmetry Blending with Masking
    const symmetryInfluence = 0.35; // 35% influence

    for (let y = 0; y < targetHeight; y++) {
      for (let x = 0; x < targetWidth; x++) {
        const idx = (y * targetWidth + x) * 4;
        
        // Get mask value (0 to 255)
        const maskValue = maskData ? maskData.data[idx] / 255 : 0;
        
        // Only apply symmetry where mask is white (face region)
        // We use a sharper threshold to avoid background ghosting
        const influence = symmetryInfluence * Math.pow(maskValue, 2); 
        
        if (influence > 0.01) {
          for (let i = 0; i < 3; i++) { // RGB
            const original = alignedData.data[idx + i];
            const mirrored = mirroredData.data[idx + i];
            resultData.data[idx + i] = original * (1 - influence) + mirrored * influence;
          }
        } else {
          // Keep original background
          resultData.data[idx] = alignedData.data[idx];
          resultData.data[idx + 1] = alignedData.data[idx + 1];
          resultData.data[idx + 2] = alignedData.data[idx + 2];
        }
        resultData.data[idx + 3] = 255;
      }
    }

    ctx.putImageData(resultData, 0, 0);
    const result = canvas.toDataURL('image/jpeg', 0.85);
    if (result === 'data:,' || !result) {
      throw new Error('toDataURL failed');
    }
    console.log('[imageProcessor] generateSoftSymmetry completed');
    return result;
  } catch (e) {
    console.error("[imageProcessor] Soft symmetry generation failed", e);
    return imgSrc;
  }
};

/**
 * Generates left and right symmetry twins.
 */
export const generateSymmetryTwins = async (
  imgSrc: string,
  landmarks: any[],
  width: number,
  height: number,
  strength: number = 0.7
): Promise<{ left: string; right: string }> => {
  try {
    console.log('[imageProcessor] generateSymmetryTwins started', { width, height });
    
    // Safety: Cap dimensions for mobile memory stability
    const MAX_PROCESS_DIM = 1280;
    let targetWidth = width;
    let targetHeight = height;
    
    if (targetWidth > MAX_PROCESS_DIM || targetHeight > MAX_PROCESS_DIM) {
      const scale = Math.min(MAX_PROCESS_DIM / targetWidth, MAX_PROCESS_DIM / targetHeight);
      targetWidth = Math.round(targetWidth * scale);
      targetHeight = Math.round(targetHeight * scale);
      console.log('[imageProcessor] generateSymmetryTwins: scaling down for memory', { targetWidth, targetHeight });
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      console.warn('[imageProcessor] generateSymmetryTwins: failed to get context');
      return { left: imgSrc, right: imgSrc };
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    
    try {
      img.src = imgSrc;
      await img.decode();
      console.log('[imageProcessor] generateSymmetryTwins: source image decoded', {
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight
      });
    } catch (decodeError) {
      console.error('[imageProcessor] generateSymmetryTwins: decode failed', decodeError);
      await new Promise((resolve, reject) => {
        img.onload = () => {
          console.log('[imageProcessor] generateSymmetryTwins: fallback onload success');
          resolve(true);
        };
        img.onerror = (e) => {
          console.error('[imageProcessor] generateSymmetryTwins: fallback onload failed', e);
          reject(e);
        };
      });
    }

    if (img.naturalWidth === 0 || img.naturalHeight === 0) {
      throw new Error('Decoded image has zero dimensions');
    }

    // 1. Face Alignment
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const angle = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);

    const midlinePoints = [landmarks[168], landmarks[1], landmarks[164], landmarks[152]];
    const midlineX = (midlinePoints.reduce((sum, p) => sum + p.x, 0) / midlinePoints.length) * targetWidth;

    // Draw original aligned
    ctx.save();
    ctx.translate(midlineX, targetHeight / 2);
    ctx.rotate(-angle);
    ctx.translate(-midlineX, -targetHeight / 2);
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
    ctx.restore();
    
    // Verify canvas is not empty
    const testPixel = ctx.getImageData(Math.floor(targetWidth/2), Math.floor(targetHeight/2), 1, 1).data;
    console.log('[imageProcessor] generateSymmetryTwins: canvas test pixel', { r: testPixel[0], g: testPixel[1], b: testPixel[2], a: testPixel[3] });
    
    const originalData = ctx.getImageData(0, 0, targetWidth, targetHeight);

    const generateTwin = (side: 'left' | 'right') => {
      try {
        console.log(`[imageProcessor] generateTwin started: ${side}`);
        const twinCanvas = document.createElement('canvas');
        twinCanvas.width = targetWidth;
        twinCanvas.height = targetHeight;
        const tCtx = twinCanvas.getContext('2d');
        if (!tCtx) return imgSrc;

        // Create the "Full Symmetry" version first
        const symCanvas = document.createElement('canvas');
        symCanvas.width = targetWidth;
        symCanvas.height = targetHeight;
        const sCtx = symCanvas.getContext('2d');
        if (!sCtx) return imgSrc;

        // Draw the chosen side
        sCtx.drawImage(canvas, 0, 0);
        
        // Mirror the chosen side to the other side
        sCtx.save();
        sCtx.translate(midlineX, 0);
        sCtx.scale(-1, 1);
        sCtx.translate(-midlineX, 0);
        
        // Clip to only draw the mirrored part onto the opposite side
        sCtx.beginPath();
        if (side === 'left') {
          // Mirror left to right
          sCtx.rect(midlineX, 0, targetWidth - midlineX, targetHeight);
        } else {
          // Mirror right to left
          sCtx.rect(0, 0, midlineX, targetHeight);
        }
        sCtx.clip();
        sCtx.drawImage(canvas, 0, 0);
        sCtx.restore();

        const symData = sCtx.getImageData(0, 0, targetWidth, targetHeight);
        const resultData = tCtx.createImageData(targetWidth, targetHeight);

        // Create a mask for the twin as well to avoid background duplication
        const twinMaskCanvas = document.createElement('canvas');
        twinMaskCanvas.width = targetWidth;
        twinMaskCanvas.height = targetHeight;
        const tmCtx = twinMaskCanvas.getContext('2d');
        if (tmCtx) {
          tmCtx.fillStyle = 'black';
          tmCtx.fillRect(0, 0, targetWidth, targetHeight);
          tmCtx.fillStyle = 'white';
          tmCtx.beginPath();
          const faceOvalIndices = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
          const firstPoint = landmarks[faceOvalIndices[0]];
          tmCtx.moveTo(firstPoint.x * targetWidth, firstPoint.y * targetHeight);
          for (let i = 1; i < faceOvalIndices.length; i++) {
            const p = landmarks[faceOvalIndices[i]];
            tmCtx.lineTo(p.x * targetWidth, p.y * targetHeight);
          }
          tmCtx.closePath();
          tmCtx.fill();
          tmCtx.filter = 'blur(15px)';
          const tempTwinCanvas = document.createElement('canvas');
          tempTwinCanvas.width = targetWidth;
          tempTwinCanvas.height = targetHeight;
          const ttCtx = tempTwinCanvas.getContext('2d');
          if (ttCtx) {
            ttCtx.drawImage(twinMaskCanvas, 0, 0);
            tmCtx.clearRect(0, 0, targetWidth, targetHeight);
            tmCtx.drawImage(tempTwinCanvas, 0, 0);
          }
        }
        const twinMaskData = tmCtx?.getImageData(0, 0, targetWidth, targetHeight);

        // Blend: strength * mirrored (symData) + (1 - strength) * original
        for (let i = 0; i < symData.data.length; i += 4) {
          const mVal = twinMaskData ? twinMaskData.data[i] / 255 : 0;
          const currentStrength = strength * Math.pow(mVal, 1.5);

          if (currentStrength > 0.01) {
            resultData.data[i] = symData.data[i] * currentStrength + originalData.data[i] * (1 - currentStrength);
            resultData.data[i+1] = symData.data[i+1] * currentStrength + originalData.data[i+1] * (1 - currentStrength);
            resultData.data[i+2] = symData.data[i+2] * currentStrength + originalData.data[i+2] * (1 - currentStrength);
          } else {
            resultData.data[i] = originalData.data[i];
            resultData.data[i+1] = originalData.data[i+1];
            resultData.data[i+2] = originalData.data[i+2];
          }
          resultData.data[i+3] = 255;
        }

        tCtx.putImageData(resultData, 0, 0);
        const result = twinCanvas.toDataURL('image/jpeg', 0.85);
        if (result === 'data:,' || !result) {
          throw new Error('toDataURL failed');
        }
        console.log(`[imageProcessor] generateTwin completed: ${side}`);
        return result;
      } catch (innerErr) {
        console.error(`[imageProcessor] generateTwin failed: ${side}`, innerErr);
        return imgSrc;
      }
    };

    return {
      left: generateTwin('left'),
      right: generateTwin('right')
    };
  } catch (err) {
    console.error("[imageProcessor] Symmetry Twin Generation Error:", err);
    return { left: imgSrc, right: imgSrc };
  }
};
