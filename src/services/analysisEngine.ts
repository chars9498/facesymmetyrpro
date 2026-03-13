
export type FaceType = 'visual_actor' | 'soft_actor' | 'comedy_face' | 'idol_face';

export interface AnalysisMetrics {
  eyeScore: number;
  browsScore: number;
  mouthScore: number;
  jawScore: number;
  eyeDiff: number;
  browsDiff: number;
  mouthDiff: number;
  jawDiff: number;
  eyeSlant: number;
  mouthSlant: number;
  overallScore: number;
  symmetryScore: number;
  percentile: number;
  midline: number;
  personality: 'fact' | 'angel';
  // Raw Ratios for Matching
  faceRatio: number;
  eyeDistanceRatio: number;
  noseLengthRatio: number;
  mouthWidthRatio: number;
  jawWidthRatio: number;
  cheekboneWidthRatio: number;
  foreheadRatio: number;
  foreheadWidthRatio: number;
  philtrumLengthRatio: number;
  eyeWidthRatio: number;
  noseWidthRatio: number;
  lowerFaceRatio: number;
}

export interface AnalysisResult {
  overallScore?: number;
  symmetryScore?: number;
  proportionScore?: number;
  summary: string;
  faceShape?: string;
  strongestFeatures?: string[];
  detailedFeedback: string;
  muscleAnalysis: string;
  landmarks: {
    eyes: { score?: number; status: string; feedback: string };
    brows: { score?: number; status: string; feedback: string };
    mouth: { score?: number; status: string; feedback: string };
    jawline: { score?: number; status: string; feedback: string };
  };
  advancedMetrics: {
    eyeSpacing: { value: number; status: string; feedback: string };
    facialProportion: { value: { upper: number; mid: number; lower: number }; status: string; feedback: string };
    faceRatio: { value: number; status: string; feedback: string };
  };
  balancedImage?: string;
  laymanProtocol: string;
  professionalProtocol: string;
  landmarkPoints?: { x: number; y: number; label: string }[];
  symmetryLines?: { x1: number; y1: number; x2: number; y2: number; label: string }[];
  asymmetryZones?: { x: number; y: number; radius: number; intensity: number; label: string }[];
  autoCenterOffset?: number;
  rotationAngle?: number;
  percentile?: number;
  metrics?: {
    midline: number;
    [key: string]: any;
  };
  rawLandmarks?: any[];
}

const getRandom = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

export const analyzeLocally = (metrics: AnalysisMetrics): AnalysisResult => {
  const isFact = metrics.personality === 'fact';
  
  // 1. Summary Generation
  const summaries = metrics.overallScore > 90 
    ? ["황금비율에 근접한 이상적인 대칭 구조", "안면 골격의 정렬이 매우 우수한 케이스", "균형미가 돋보이는 완성도 높은 마스크"]
    : metrics.overallScore > 80
    ? ["전반적으로 조화로운 대칭성을 가진 얼굴", "미세한 비대칭이 매력으로 승화된 구조", "안정적인 골격 정렬을 유지 중인 상태"]
    : ["개성적인 비대칭이 조화를 이루는 마스크", "특정 부위의 근육 불균형이 관찰되는 구조", "교정이 필요한 비대칭적 요소가 존재하는 상태"];

  // 2. Face Shape Analysis
  let faceShape = "Oval";
  const ratio = metrics.faceRatio;
  const jawRatio = metrics.jawWidthRatio / metrics.cheekboneWidthRatio;
  const foreheadRatio = metrics.foreheadWidthRatio / metrics.cheekboneWidthRatio;

  if (ratio > 1.55) {
    faceShape = "Oblong (긴 얼굴형)";
  } else if (jawRatio > 0.92 && ratio < 1.35) {
    faceShape = "Square (각진형)";
  } else if (ratio < 1.30) {
    faceShape = "Round (둥근형)";
  } else if (foreheadRatio > jawRatio) {
    faceShape = "Heart (하트형)";
  } else {
    faceShape = "Oval (타원형)";
  }

  // 3. Strongest Features Analysis (Viral Elements)
  const strongestFeatures = [];
  
  // Eye Spacing
  if (metrics.eyeDistanceRatio > 0.32 && metrics.eyeDistanceRatio < 0.38) {
    strongestFeatures.push("균형 잡힌 미간 너비 (Ideal Eye Spacing)");
  }
  
  // Jawline
  if (metrics.jawScore > 85) {
    strongestFeatures.push("선명하고 입체적인 턱선 (Strong Jawline)");
  }
  
  // Midface
  if (metrics.lowerFaceRatio > 0.3 && metrics.lowerFaceRatio < 0.36) {
    strongestFeatures.push("매력적인 안면 비율 (Attractive Proportions)");
  }

  // 4. Advanced Metrics Calculation
  // 1) Eye Spacing Ratio
  const eyeSpacingVal = metrics.eyeDistanceRatio / (metrics.eyeWidthRatio || 0.2);
  let eyeSpacingStatus = "균형 양호";
  let eyeSpacingFeedback = "양쪽 눈 사이 간격이 눈 너비와 비슷한 비율로 나타나 안면 균형이 비교적 안정적으로 보입니다.";
  if (eyeSpacingVal < 0.9) {
    eyeSpacingStatus = "좁은 간격";
    eyeSpacingFeedback = "눈 사이 간격이 눈 너비에 비해 약간 좁은 편으로 나타납니다.";
  } else if (eyeSpacingVal > 1.1) {
    eyeSpacingStatus = "넓은 간격";
    eyeSpacingFeedback = "눈 사이 간격이 눈 너비에 비해 약간 넓은 편으로 나타납니다.";
  }

  // 2) Facial Proportion (Vertical 3-way)
  // upperFaceRatio, noseLengthRatio, lowerFaceRatio
  const totalVertical = metrics.foreheadRatio + metrics.noseLengthRatio + metrics.lowerFaceRatio;
  const upperP = Math.round((metrics.foreheadRatio / totalVertical) * 100);
  const midP = Math.round((metrics.noseLengthRatio / totalVertical) * 100);
  const lowerP = Math.round((metrics.lowerFaceRatio / totalVertical) * 100);
  
  let propStatus = "이상적 비율";
  let propFeedback = "얼굴의 세로 비율이 1:1:1에 근접하여 매우 안정적인 조화를 이룹니다.";
  if (midP > 36) {
    propStatus = "중안부 긴 편";
    propFeedback = "중안부 비율이 다른 부위에 비해 약간 긴 편으로 나타납니다.";
  } else if (lowerP > 36) {
    propStatus = "하안부 긴 편";
    propFeedback = "하안부 비율이 다른 부위에 비해 약간 긴 편으로 나타납니다.";
  } else if (upperP > 36) {
    propStatus = "상안부 긴 편";
    propFeedback = "상안부 비율이 다른 부위에 비해 약간 긴 편으로 나타납니다.";
  }

  // 3) Face Shape Ratio (Width-to-Height)
  // faceWidth / faceHeight (brow to chin)
  const faceRatioVal = metrics.faceRatio; // This was calculated as height/width in App.tsx, let's adjust or use as is
  // User asked for Width / Height (1.6 ~ 1.9 range usually for specific definitions, but let's follow their logic)
  // Actually the user provided: faceWidth / faceHeight (brow to chin)
  // In App.tsx: faceHeight = dist2D(alignedLandmarks[10], alignedLandmarks[152]); faceWidth = dist2D(alignedLandmarks[234], alignedLandmarks[454]);
  // Let's assume we pass the correct ratio from App.tsx
  const widthHeightRatio = 1 / metrics.faceRatio; 
  let ratioStatus = "균형 범위";
  let ratioFeedback = "얼굴 가로세로 비율이 비교적 균형 잡힌 범위에 있습니다.";
  if (widthHeightRatio < 0.7) {
    ratioStatus = "슬림한 비율";
    ratioFeedback = "얼굴이 가로 폭에 비해 세로로 긴 슬림한 비율을 보입니다.";
  } else if (widthHeightRatio > 0.85) {
    ratioStatus = "넓은 비율";
    ratioFeedback = "얼굴의 가로 폭이 세로 길이에 비해 상대적으로 넓은 편입니다.";
  }

  const proportionScore = Math.round(100 - (Math.abs(33.3 - upperP) + Math.abs(33.3 - midP) + Math.abs(33.3 - lowerP)) * 2);

  // 4. Detailed Feedback Generation Logic (Observational Style)
  const getFeedback = (score: number, type: 'eye' | 'mouth' | 'jaw' | 'brows') => {
    const pool = {
      eye: [
        { min: 85, status: "균형 매우 우수", texts: [
          "좌우 눈 높이와 간격이 매우 안정적으로 나타나며 얼굴 상부의 균형이 잘 유지되고 있습니다."
        ] },
        { min: 70, status: "균형 양호", texts: [
          "좌우 눈의 위치가 전반적으로 균형을 이루고 있으며 눈 주변 구조가 비교적 안정적으로 보입니다."
        ] },
        { min: 55, status: "약한 비대칭", texts: [
          "좌우 눈 높이에 약간의 차이가 보이며 얼굴 상부 균형이 완전히 동일하지 않을 수 있습니다."
        ] },
        { min: 0, status: "비대칭 뚜렷", texts: [
          "양쪽 눈의 높이나 기울기에 비교적 뚜렷한 차이가 나타나며 얼굴 상부의 좌우 균형이 다르게 보일 수 있습니다."
        ] }
      ],
      brows: [
        { min: 85, status: "균형 매우 우수", texts: [
          "양쪽 눈썹의 높이와 곡선이 안정적으로 정렬되어 있어 상안부 균형이 매우 자연스럽게 유지됩니다."
        ] },
        { min: 70, status: "균형 양호", texts: [
          "좌우 눈썹의 높이가 전반적으로 균형을 이루며 표정 근육의 사용이 비교적 안정적으로 나타납니다."
        ] },
        { min: 55, status: "약한 비대칭", texts: [
          "좌우 눈썹 높이에 약간의 차이가 있어 표정 변화 시 상안부 균형이 조금 달라 보일 수 있습니다."
        ] },
        { min: 0, status: "비대칭 뚜렷", texts: [
          "눈썹 높이나 각도에 비교적 뚜렷한 차이가 나타나며 상안부 좌우 균형이 다르게 보일 수 있습니다."
        ] }
      ],
      mouth: [
        { min: 85, status: "균형 매우 우수", texts: [
          "입꼬리 높이와 입 주변 근육의 균형이 안정적으로 나타나며 하안부의 조화가 자연스럽습니다."
        ] },
        { min: 70, status: "균형 양호", texts: [
          "입꼬리 높이가 전반적으로 균형을 이루고 있으며 표정 근육의 움직임이 비교적 안정적으로 보입니다."
        ] },
        { min: 55, status: "약한 비대칭", texts: [
          "좌우 입꼬리 높이에 약간의 차이가 보이며 표정 근육의 사용 패턴이 조금 다를 수 있습니다."
        ] },
        { min: 0, status: "비대칭 뚜렷", texts: [
          "입꼬리 위치나 입 라인의 기울기에 비교적 뚜렷한 차이가 나타나 하안부 균형이 다르게 보일 수 있습니다."
        ] }
      ],
      jaw: [
        { min: 85, status: "균형 매우 우수", texts: [
          "턱선의 좌우 볼륨과 윤곽이 안정적으로 유지되어 얼굴 하부의 균형이 매우 자연스럽게 나타납니다."
        ] },
        { min: 70, status: "균형 양호", texts: [
          "턱선의 좌우 균형이 비교적 안정적으로 보이며 얼굴 하부 구조가 자연스럽게 정렬되어 있습니다."
        ] },
        { min: 55, status: "약한 비대칭", texts: [
          "턱선의 좌우 볼륨이나 각도에 약간의 차이가 있어 얼굴 하부 균형이 조금 달라 보일 수 있습니다."
        ] },
        { min: 0, status: "비대칭 뚜렷", texts: [
          "턱선의 좌우 윤곽 차이가 비교적 뚜렷하게 나타나 얼굴 하부의 비대칭이 강조되어 보일 수 있습니다."
        ] }
      ]
    };

    const selected = pool[type].find(p => score >= p.min);
    return {
      status: selected?.status || "분석 완료",
      feedback: getRandom(selected?.texts || ["분석 데이터를 바탕으로 상태를 확인 중입니다."])
    };
  };

  const eyeRes = getFeedback(metrics.eyeScore, 'eye');
  const mouthRes = getFeedback(metrics.mouthScore, 'mouth');
  const jawRes = getFeedback(metrics.jawScore, 'jaw');
  const browsRes = getFeedback(metrics.browsScore, 'brows');

  // 4. Dynamic Muscle Analysis
  const primaryCause = metrics.jawDiff > metrics.eyeDiff ? '턱 주변 근육' : '눈 주변 근육';
  const secondaryCause = metrics.mouthSlant > 0.03 ? '입가 근육' : '얼굴 측면 근육';
  
  const muscleAnalysis = metrics.overallScore > 92
    ? "전반적인 안면 근육의 균형이 매우 우수합니다. 현재의 건강한 생활 습관을 유지하며 미세한 긴장만 관리해주시면 충분합니다."
    : `현재 비대칭의 주요 원인은 **${primaryCause}**과 **목 주변 근육**의 비대칭적 긴장에 기인한 것으로 보입니다. 특히 ${secondaryCause}의 사용 패턴 차이가 안면 하부의 정렬에 영향을 미치고 있는 것으로 분석됩니다.`;

  // 4. Protocols
  const laymanProtocol = `
    ### 🏠 데일리 홈케어 가이드
    1. **${metrics.jawDiff > 0.05 ? '저작 습관 개선' : '수면 자세 교정'}**: 한쪽으로만 음식을 씹는 습관을 피하고 양쪽을 골고루 사용해 보세요.
    2. **온열 찜질**: 긴장도가 느껴지는 턱 근육 부위에 하루 15분간 온찜질을 하면 근육 이완에 도움이 됩니다.
    3. **거울 피드백**: 거울을 보며 입꼬리 높이를 맞추는 미소 연습을 통해 표정 근육의 균형을 잡아보세요.
  `;

  const professionalProtocol = `
    ### 🩺 전문가용 관리 프로토콜
    1. **근막 이완 관리**: 긴장이 집중된 **턱 및 측두 부위**의 심부 연부조직을 부드럽게 이완하여 근막의 유착을 해소하는 것이 좋습니다.
    2. **정렬 개선 스트레칭**: 목과 어깨 주변 근육의 균형을 맞추는 스트레칭을 통해 전신 정렬을 바로잡는 것이 안면 대칭에 긍정적인 영향을 줍니다.
    3. **표정 재교육**: 특정 근육의 과도한 사용을 줄이고 약화된 부위를 활성화하는 안면 근육 운동 프로그램을 권장합니다.
  `;

  // 5. Detailed Feedback Generation
  const angelFeedbacks = [
    "당신의 얼굴은 왼쪽과 오른쪽이 서로 다른 매력을 품고 있네요. 미세한 차이가 오히려 당신만의 독특한 분위기를 만들어내고 있습니다.",
    "완벽한 대칭보다 더 아름다운 것은 당신만의 개성입니다. 좌우의 미세한 차이가 인상을 더욱 입체적이고 생동감 있게 만들어주네요.",
    "자연스러운 비대칭은 인간적인 매력의 원천입니다. 당신의 마스크는 정형화되지 않은 자연스러운 아름다움을 간직하고 있어요.",
    "좌우의 균형이 조금씩 다른 점이 오히려 당신의 표정을 더욱 풍부하게 만들어줍니다. 지금 그대로도 충분히 매력적인 마스크예요."
  ];

  // 6. Dynamic Expert Advice
  const getExpertAdvice = () => {
    if (isFact) {
      if (metrics.overallScore > 96) {
        return `정밀 분석 결과, 안면 대칭 지수가 매우 높은 수준으로 나타났습니다. 골격적 정렬과 연부조직의 분포가 조화로우며, 현재의 생활 습관을 유지하는 것만으로도 충분해 보입니다.`;
      }
      
      if (metrics.eyeSlant < 0.01 && metrics.jawDiff < 0.01) {
        return `현재 측정된 수치는 매우 이상적인 균형 상태를 보여줍니다. 얼굴에서 나타날 수 있는 가장 조화로운 상태 중 하나이며, 미세한 차이는 근육의 실시간 움직임에 따른 자연스러운 현상으로 보입니다.`;
      }

      const severity = metrics.eyeSlant > 0.06 || metrics.jawDiff > 0.09 ? '근육의 강한 긴장과 정렬 차이' : '연부조직의 비대칭적 발달';
      const recommendation = metrics.overallScore < 75 ? '전문적인 관리가 도움이 될 수 있는' : '꾸준한 홈케어와 습관 교정으로 충분히 개선 가능한';
      
      return `분석 결과, 안면의 수평 정렬과 하악각의 균형에서 약간의 차이가 관찰됩니다. 이는 ${recommendation} ${severity}에 의한 결과로 보입니다.`;
    }
    return getRandom(angelFeedbacks);
  };

  // 7. Overall Balance Summary
  let balanceSummary = "전반적인 얼굴 균형이 비교적 안정적인 편입니다.";
  if (metrics.overallScore >= 85) balanceSummary = "전반적인 얼굴 균형이 매우 우수하고 이상적입니다.";
  else if (metrics.overallScore >= 70) balanceSummary = "전반적인 얼굴 균형이 비교적 안정적인 편입니다.";
  else if (metrics.overallScore >= 55) balanceSummary = "전반적인 얼굴 균형에 약간의 차이가 관찰됩니다.";
  else balanceSummary = "전반적인 얼굴 균형이 다소 비대칭적으로 보일 수 있습니다.";

  return {
    overallScore: metrics.overallScore,
    symmetryScore: metrics.overallScore,
    proportionScore: proportionScore,
    summary: balanceSummary,
    faceShape,
    strongestFeatures: strongestFeatures.slice(0, 3),
    detailedFeedback: getExpertAdvice(),
    muscleAnalysis: muscleAnalysis.trim(),
    landmarks: {
      eyes: eyeRes,
      brows: browsRes,
      mouth: mouthRes,
      jawline: jawRes
    },
    advancedMetrics: {
      eyeSpacing: { value: eyeSpacingVal, status: eyeSpacingStatus, feedback: eyeSpacingFeedback },
      facialProportion: { value: { upper: upperP, mid: midP, lower: lowerP }, status: propStatus, feedback: propFeedback },
      faceRatio: { value: widthHeightRatio, status: ratioStatus, feedback: ratioFeedback }
    },
    laymanProtocol: laymanProtocol.trim(),
    professionalProtocol: professionalProtocol.trim()
  };
};
