type Landmark = { x: number; y: number };
const MAX_CANVAS_DIMENSION = 2048;

const clampDimension = (value: number): number => Math.max(1, Math.min(value, MAX_CANVAS_DIMENSION));

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });

const toJpeg = (canvas: HTMLCanvasElement, quality = 0.9): string => {
  const output = canvas.toDataURL('image/jpeg', quality);
  return output && output !== 'data:,' ? output : '';
};

export const resizeImage = async (base64Str: string, maxDimension = 1024): Promise<string> => {
  try {
    const image = await loadImage(base64Str);
    const { width, height } = image;

    if (!width || !height) {
      return base64Str;
    }

    const ratio = Math.min(1, maxDimension / Math.max(width, height));
    const targetWidth = clampDimension(Math.round(width * ratio));
    const targetHeight = clampDimension(Math.round(height * ratio));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return base64Str;
    }

    ctx.drawImage(image, 0, 0, targetWidth, targetHeight);
    return toJpeg(canvas, 0.85) || base64Str;
  } catch {
    return base64Str;
  }
};

export const enhanceImage = async (base64Str: string): Promise<string> => {
  try {
    const image = await loadImage(base64Str);
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return base64Str;
    }

    ctx.filter = 'brightness(1.08) contrast(1.06)';
    ctx.drawImage(image, 0, 0);

    return toJpeg(canvas, 0.9) || base64Str;
  } catch {
    return base64Str;
  }
};

export const generateSoftSymmetry = async (
  imgSrc: string,
  landmarks: Landmark[],
  width: number,
  height: number,
): Promise<string> => {
  try {
    const image = await loadImage(imgSrc);
    const canvas = document.createElement('canvas');
    canvas.width = clampDimension(width || image.width);
    canvas.height = clampDimension(height || image.height);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return imgSrc;
    }

    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    const leftEye = landmarks?.[33];
    const rightEye = landmarks?.[263];
    if (leftEye && rightEye) {
      const eyeY = ((leftEye.y + rightEye.y) / 2) * canvas.height;
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.beginPath();
      ctx.moveTo(0, eyeY);
      ctx.lineTo(canvas.width, eyeY);
      ctx.stroke();
    }

    return toJpeg(canvas, 0.9) || imgSrc;
  } catch {
    return imgSrc;
  }
};

export const generateSymmetryTwins = async (
  imgSrc: string,
  _landmarks: Landmark[],
  width: number,
  height: number,
  _strength = 0.7,
): Promise<{ left: string; right: string }> => {
  try {
    const image = await loadImage(imgSrc);
    const targetWidth = clampDimension(width || image.width);
    const targetHeight = clampDimension(height || image.height);

    const sourceCanvas = document.createElement('canvas');
    sourceCanvas.width = targetWidth;
    sourceCanvas.height = targetHeight;

    const sourceCtx = sourceCanvas.getContext('2d');
    if (!sourceCtx) {
      return { left: imgSrc, right: imgSrc };
    }

    sourceCtx.drawImage(image, 0, 0, targetWidth, targetHeight);

    const makeTwin = (flipAroundLeft: boolean): string => {
      const out = document.createElement('canvas');
      out.width = targetWidth;
      out.height = targetHeight;
      const ctx = out.getContext('2d');
      if (!ctx) {
        return imgSrc;
      }

      const half = targetWidth / 2;
      if (flipAroundLeft) {
        ctx.drawImage(sourceCanvas, 0, 0, half, targetHeight, 0, 0, half, targetHeight);
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(sourceCanvas, 0, 0, half, targetHeight, -targetWidth, 0, half, targetHeight);
        ctx.restore();
      } else {
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(sourceCanvas, half, 0, half, targetHeight, -half, 0, half, targetHeight);
        ctx.restore();
        ctx.drawImage(sourceCanvas, half, 0, half, targetHeight, half, 0, half, targetHeight);
      }

      return toJpeg(out, 0.9) || imgSrc;
    };

    return {
      left: makeTwin(true),
      right: makeTwin(false),
    };
  } catch {
    return { left: imgSrc, right: imgSrc };
  }
};
