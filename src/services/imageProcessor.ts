
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

    // 3, 4, 5. Soft Symmetry Blending with Feathering
    const blendWidth = width * 0.1; // 10% width for feathering
    const symmetryInfluence = 0.3; // 30% influence

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

      // Blend: strength * mirrored (symData) + (1 - strength) * original
      for (let i = 0; i < symData.data.length; i += 4) {
        resultData.data[i] = symData.data[i] * strength + originalData.data[i] * (1 - strength);
        resultData.data[i+1] = symData.data[i+1] * strength + originalData.data[i+1] * (1 - strength);
        resultData.data[i+2] = symData.data[i+2] * strength + originalData.data[i+2] * (1 - strength);
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
