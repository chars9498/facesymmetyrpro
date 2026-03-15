
export interface AnalysisMetricsV2 {
  eyeSymmetry: number;
  browsSymmetry: number;
  noseAlignment: number;
  mouthSymmetry: number;
  jawSymmetry: number;
  faceWidthBalance: number;
  overallScore: number;
  percentile: number;
}

export interface Landmark {
  x: number;
  y: number;
  z?: number;
}

/**
 * Advanced Face Symmetry Analysis Engine V2 (Robust Edition)
 * Implements region-based averaging and robust midline estimation.
 */
// Pre-defined landmark indices for performance
const LEFT_EYE_INDICES = [33, 133, 157, 158, 159, 160, 161, 173, 246, 7, 163, 144, 145, 153, 154, 155];
const RIGHT_EYE_INDICES = [263, 362, 384, 385, 386, 387, 388, 398, 466, 249, 390, 373, 374, 380, 381, 382];
const MIDLINE_INDICES = [10, 168, 1, 2, 152, 6];
const FACE_EDGE_INDICES = [234, 127, 93, 454, 356, 323];

const EYE_PAIRS: [number, number][] = [[33, 263], [133, 362], [159, 386], [145, 374], [158, 385], [153, 380], [160, 387], [154, 381]];
const BROW_PAIRS: [number, number][] = [[70, 300], [105, 334], [63, 293], [107, 336], [52, 282], [46, 276]];
const NOSE_WIDTH_PAIRS: [number, number][] = [[102, 331], [64, 294], [98, 327]];
const MOUTH_PAIRS: [number, number][] = [[61, 291], [37, 267], [39, 269], [84, 314], [87, 317], [0, 17]];
const JAW_PAIRS: [number, number][] = [[234, 454], [172, 397], [150, 379], [149, 378], [148, 377], [132, 361], [58, 288]];
const WIDTH_PAIRS: [number, number][] = [[127, 356], [21, 251], [162, 389], [103, 332], [54, 284]];

// Combined unique indices for transformation
const REQUIRED_INDICES = Array.from(new Set([
  ...LEFT_EYE_INDICES, ...RIGHT_EYE_INDICES, ...MIDLINE_INDICES, ...FACE_EDGE_INDICES,
  ...EYE_PAIRS.flat(), ...BROW_PAIRS.flat(), ...NOSE_WIDTH_PAIRS.flat(), 
  ...MOUTH_PAIRS.flat(), ...JAW_PAIRS.flat(), ...WIDTH_PAIRS.flat()
]));

/**
 * Advanced Face Symmetry Analysis Engine V2 (Robust Edition)
 * Optimized for performance and stability.
 */
export const calculateSymmetryV2 = (landmarks: Landmark[]): AnalysisMetricsV2 => {
  console.time('Symmetry-Engine-V2');
  
  if (!landmarks || landmarks.length < 468) {
    throw new Error("Invalid landmarks provided");
  }

  // 1. Face Alignment (Roll Correction)
  const getRawCentroid = (indices: number[]): Landmark => {
    let x = 0, y = 0, z = 0;
    const len = indices.length;
    for (let i = 0; i < len; i++) {
      const p = landmarks[indices[i]];
      x += p.x;
      y += p.y;
      z += (p.z || 0);
    }
    return { x: x / len, y: y / len, z: z / len };
  };

  const leftEyeCentroid = getRawCentroid(LEFT_EYE_INDICES);
  const rightEyeCentroid = getRawCentroid(RIGHT_EYE_INDICES);
  
  const eyeCenter = {
    x: (leftEyeCentroid.x + rightEyeCentroid.x) / 2,
    y: (leftEyeCentroid.y + rightEyeCentroid.y) / 2
  };
  
  const rollAngle = Math.atan2(rightEyeCentroid.y - leftEyeCentroid.y, rightEyeCentroid.x - leftEyeCentroid.x);
  const cosA = Math.cos(-rollAngle);
  const sinA = Math.sin(-rollAngle);

  // 2. Transform ONLY required landmarks
  const alignedLandmarks: { [key: number]: Landmark } = {};
  for (let i = 0; i < REQUIRED_INDICES.length; i++) {
    const idx = REQUIRED_INDICES[i];
    const p = landmarks[idx];
    const dx = p.x - eyeCenter.x;
    const dy = p.y - eyeCenter.y;
    alignedLandmarks[idx] = {
      x: dx * cosA - dy * sinA,
      y: dx * sinA + dy * cosA,
      z: p.z
    };
  }

  // 3. Estimate Robust Vertical Facial Midline
  let midlineXSum = 0;
  for (let i = 0; i < MIDLINE_INDICES.length; i++) {
    midlineXSum += alignedLandmarks[MIDLINE_INDICES[i]].x;
  }
  const midlineX = midlineXSum / MIDLINE_INDICES.length;

  // 4. Normalization Factor (Face Width)
  const leftFaceEdge = (alignedLandmarks[234].x + alignedLandmarks[127].x + alignedLandmarks[93].x) / 3;
  const rightFaceEdge = (alignedLandmarks[454].x + alignedLandmarks[356].x + alignedLandmarks[323].x) / 3;
  const faceWidth = Math.abs(rightFaceEdge - leftFaceEdge);

  const calculateSymmetryScore = (pairs: [number, number][], k: number = 15): number => {
    let totalDiff = 0;
    const len = pairs.length;
    for (let i = 0; i < len; i++) {
      const [l, r] = pairs[i];
      const distL = Math.abs(alignedLandmarks[l].x - midlineX);
      const distR = Math.abs(alignedLandmarks[r].x - midlineX);
      const heightDiff = Math.abs(alignedLandmarks[l].y - alignedLandmarks[r].y);
      totalDiff += (Math.abs(distL - distR) / faceWidth) + (heightDiff / faceWidth);
    }
    const avgDiff = totalDiff / (len * 2);
    return Math.max(0, Math.min(100, 100 * Math.exp(-k * avgDiff)));
  };

  // 5. Component Symmetry Scores
  const eyeSymmetry = calculateSymmetryScore(EYE_PAIRS, 20);
  const browsSymmetry = calculateSymmetryScore(BROW_PAIRS, 15);

  // Nose Alignment
  const noseMidlineIndicesActual = [168, 6, 1, 2];
  let noseDiff = 0;
  for (let i = 0; i < noseMidlineIndicesActual.length; i++) {
    noseDiff += Math.abs(alignedLandmarks[noseMidlineIndicesActual[i]].x - midlineX) / faceWidth;
  }
  const noseWidthSym = calculateSymmetryScore(NOSE_WIDTH_PAIRS, 25);
  const noseAlignment = (Math.max(0, Math.min(100, 100 * Math.exp(-30 * (noseDiff / noseMidlineIndicesActual.length)))) + noseWidthSym) / 2;

  const mouthSymmetry = calculateSymmetryScore(MOUTH_PAIRS, 22);

  // Jaw Symmetry
  const chinOffset = Math.abs(alignedLandmarks[152].x - midlineX) / faceWidth;
  const jawBaseSym = calculateSymmetryScore(JAW_PAIRS, 12);
  const jawSymmetry = (jawBaseSym + Math.max(0, Math.min(100, 100 * Math.exp(-40 * chinOffset)))) / 2;

  const faceWidthBalance = calculateSymmetryScore(WIDTH_PAIRS, 14);

  // 6. Overall Symmetry Score (Weighted)
  let rawOverallScore = (
    (eyeSymmetry * 0.25) +
    (noseAlignment * 0.20) +
    (jawSymmetry * 0.20) +
    (mouthSymmetry * 0.15) +
    (faceWidthBalance * 0.20)
  );

  // 7. Score Normalization
  let normalizedScore = rawOverallScore;
  if (normalizedScore > 85) {
    normalizedScore = 85 + (normalizedScore - 85) * 0.4;
  } else if (normalizedScore < 60) {
    normalizedScore = 60 - (60 - normalizedScore) * 0.8;
  }
  
  const overallScore = Math.round(normalizedScore);

  // 8. Percentile Ranking System
  const calculatePercentile = (score: number): number => {
    const mean = 72;
    const stdDev = 8;
    const z = (score - mean) / stdDev;
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp(-z * z / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    let percentile = z > 0 ? 1 - p : p;
    return Math.round((1 - percentile) * 100);
  };

  const percentile = calculatePercentile(overallScore);

  console.timeEnd('Symmetry-Engine-V2');

  return {
    eyeSymmetry: Math.round(eyeSymmetry),
    browsSymmetry: Math.round(browsSymmetry),
    noseAlignment: Math.round(noseAlignment),
    mouthSymmetry: Math.round(mouthSymmetry),
    jawSymmetry: Math.round(jawSymmetry),
    faceWidthBalance: Math.round(faceWidthBalance),
    overallScore,
    percentile
  };
};
