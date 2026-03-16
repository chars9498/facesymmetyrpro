
/**
 * Resizes an image to fit within maxDimension while maintaining aspect ratio.
 */
export const resizeImage = (base64Str: string, maxDimension: number = 1024): Promise<string> => {
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

    // 3. Create a face mask using landmarks
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = width;
    maskCanvas.height = height;
    const maskCtx = maskCanvas.getContext('2d');
    if (maskCtx) {
      maskCtx.fillStyle = 'black';
      maskCtx.fillRect(0, 0, width, height);
      
      // Draw face silhouette
      maskCtx.fillStyle = 'white';
      maskCtx.beginPath();
      // Face oval indices (more precise set)
      const faceOvalIndices = [
        10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109
      ];
      
      const firstPoint = landmarks[faceOvalIndices[0]];
      maskCtx.moveTo(firstPoint.x * width, firstPoint.y * height);
      for (let i = 1; i < faceOvalIndices.length; i++) {
        const p = landmarks[faceOvalIndices[i]];
        maskCtx.lineTo(p.x * width, p.y * height);
      }
      maskCtx.closePath();
      maskCtx.fill();
      
      // Use a smaller blur for sharper edges, preventing background ghosting
      maskCtx.filter = 'blur(10px)';
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.drawImage(maskCanvas, 0, 0);
        maskCtx.clearRect(0, 0, width, height);
        maskCtx.drawImage(tempCanvas, 0, 0);
      }
    }
    const maskData = maskCtx?.getImageData(0, 0, width, height);

    // 4, 5. Soft Symmetry Blending with Masking
    const symmetryInfluence = 0.35; // 35% influence

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        
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
    return canvas.toDataURL('image/jpeg', 0.85);
  } catch (e) {
    console.error("Soft symmetry generation failed", e);
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
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return { left: imgSrc, right: imgSrc };

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imgSrc;
    await img.decode();

    // 1. Face Alignment
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const angle = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);

    const midlinePoints = [landmarks[168], landmarks[1], landmarks[164], landmarks[152]];
    const midlineX = (midlinePoints.reduce((sum, p) => sum + p.x, 0) / midlinePoints.length) * width;

    // Draw original aligned
    ctx.save();
    ctx.translate(midlineX, height / 2);
    ctx.rotate(-angle);
    ctx.translate(-midlineX, -height / 2);
    ctx.drawImage(img, 0, 0, width, height);
    ctx.restore();
    
    const originalData = ctx.getImageData(0, 0, width, height);

    const generateTwin = (side: 'left' | 'right') => {
      const twinCanvas = document.createElement('canvas');
      twinCanvas.width = width;
      twinCanvas.height = height;
      const tCtx = twinCanvas.getContext('2d');
      if (!tCtx) return imgSrc;

      // Create the "Full Symmetry" version first
      const symCanvas = document.createElement('canvas');
      symCanvas.width = width;
      symCanvas.height = height;
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
        sCtx.rect(midlineX, 0, width - midlineX, height);
      } else {
        // Mirror right to left
        sCtx.rect(0, 0, midlineX, height);
      }
      sCtx.clip();
      sCtx.drawImage(canvas, 0, 0);
      sCtx.restore();

      const symData = sCtx.getImageData(0, 0, width, height);
      const resultData = tCtx.createImageData(width, height);

      // Create a mask for the twin as well to avoid background duplication
      const twinMaskCanvas = document.createElement('canvas');
      twinMaskCanvas.width = width;
      twinMaskCanvas.height = height;
      const tmCtx = twinMaskCanvas.getContext('2d');
      if (tmCtx) {
        tmCtx.fillStyle = 'black';
        tmCtx.fillRect(0, 0, width, height);
        tmCtx.fillStyle = 'white';
        tmCtx.beginPath();
        const faceOvalIndices = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
        const firstPoint = landmarks[faceOvalIndices[0]];
        tmCtx.moveTo(firstPoint.x * width, firstPoint.y * height);
        for (let i = 1; i < faceOvalIndices.length; i++) {
          const p = landmarks[faceOvalIndices[i]];
          tmCtx.lineTo(p.x * width, p.y * height);
        }
        tmCtx.closePath();
        tmCtx.fill();
        tmCtx.filter = 'blur(15px)';
        const tempTwinCanvas = document.createElement('canvas');
        tempTwinCanvas.width = width;
        tempTwinCanvas.height = height;
        const ttCtx = tempTwinCanvas.getContext('2d');
        if (ttCtx) {
          ttCtx.drawImage(twinMaskCanvas, 0, 0);
          tmCtx.clearRect(0, 0, width, height);
          tmCtx.drawImage(tempTwinCanvas, 0, 0);
        }
      }
      const twinMaskData = tmCtx?.getImageData(0, 0, width, height);

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
      return twinCanvas.toDataURL('image/jpeg', 0.85);
    };

    return {
      left: generateTwin('left'),
      right: generateTwin('right')
    };
  } catch (err) {
    console.error("Symmetry Twin Generation Error:", err);
    return { left: imgSrc, right: imgSrc };
  }
};
