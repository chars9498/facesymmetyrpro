
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
  rotationAngle?: number;
  landmarkConfidence?: number;
  faceSize?: number;
  lightingStatus?: 'Good' | 'Low Light' | 'Overexposed' | 'Uneven';
}

export interface AnalysisResult {
  overallScore?: number;
  symmetryScore?: number;
  proportionScore?: number;
  summary: string;
  faceShape?: string;
  strongestFeatures?: string[];
  detailedFeedback: string;
  factFeedback: string;
  angelFeedback: string;
  primaryImbalance: string;
  analysisSummary: string;
  homeCareGuide: string;
  professionalCareOptions: string;
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
  landmarkPoints?: { x: number; y: number; label: string }[];
  symmetryLines?: { x1: number; y1: number; x2: number; y2: number; label: string }[];
  asymmetryZones?: { x: number; y: number; radius: number; intensity: number; label: string }[];
  autoCenterOffset?: number;
  rotationAngle?: number;
  percentile?: number;
  tier?: {
    label: string;
    color: string;
    icon: string;
  };
  partScores?: {
    eyes: number;
    brows: number;
    mouth: number;
    jaw: number;
  };
  metrics?: {
    midline: number;
    [key: string]: any;
  };
  rawLandmarks?: any[];
  scanQuality?: {
    alignment: 'Good' | 'Fair' | 'Poor';
    lighting: 'Good' | 'Low Light' | 'Overexposed' | 'Uneven';
    stability: 'High' | 'Medium' | 'Low';
  };
  resultStability?: 'High' | 'Medium' | 'Low';
  improvementPotential?: {
    score?: number;
    range: string;
    targetRange: [number, number];
    feedback: string;
  };
  symmetryTwins?: {
    left: string;
    right: string;
  };
}

const getRandom = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

export const analyzeLocally = (metrics: AnalysisMetrics): AnalysisResult => {
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

  // 4. Analysis Summary & Influencing Factors (Dynamic)
  const getDynamicAnalysis = () => {
    const scores = [
      { name: "눈 주변", score: metrics.eyeScore, key: 'eyes', detail: "좌우 눈 높이" },
      { name: "눈썹 라인", score: metrics.browsScore, key: 'brows', detail: "눈썹의 기울기" },
      { name: "입 주변", score: metrics.mouthScore, key: 'mouth', detail: "입꼬리 위치" },
      { name: "얼굴 하부", score: metrics.jawScore, key: 'jaw', detail: "턱선의 대칭성" }
    ];

    // Sort by score to find lowest
    const sortedScores = [...scores].sort((a, b) => a.score - b.score);
    const lowest = sortedScores[0];
    const secondLowest = sortedScores[1];

    const imbalancedAreas = scores.filter(s => s.score < 88).map(s => s.name);
    
    // 1. Overall Summary based on overallScore
    let overallSummary = "";
    if (metrics.overallScore >= 90) overallSummary = "전반적인 얼굴 균형이 매우 안정적이며 조화로운 구조를 보입니다.";
    else if (metrics.overallScore >= 80) overallSummary = "전반적인 얼굴 균형은 안정적인 범위에 있습니다.";
    else if (metrics.overallScore >= 70) overallSummary = "전반적인 얼굴 균형은 비교적 안정적인 편이지만 일부 영역에서 차이가 관찰될 수 있습니다.";
    else if (metrics.overallScore >= 60) overallSummary = "얼굴 일부 영역에서 좌우 균형 차이가 비교적 뚜렷하게 나타날 수 있습니다.";
    else overallSummary = "여러 영역에서 좌우 균형 차이가 관찰됩니다.";

    // 2. Area deviations based on area scores
    const deviations = sortedScores.slice(0, 2).map((s) => {
      let desc = "";
      if (s.score >= 85) desc = "미세한 차이";
      else if (s.score >= 75) desc = "약간의 편차";
      else if (s.score >= 65) desc = "비교적 큰 편차";
      else desc = "뚜렷한 편차";
      
      return `${s.name}(${s.detail})에서 ${desc}가 관찰되었습니다.`;
    }).join("\n");

    const influenceExplanation = "이러한 차이는 표정 습관, 근육 사용 패턴, 또는 자세 요인의 영향을 받을 수 있습니다.";
    const analysisSummary = `${overallSummary}\n\n${deviations}\n\n${influenceExplanation}`;

    // 3. Key Insight (Exactly 3 lines, 20-35 chars per line)
    let primaryImbalance = "";
    if (lowest.score < 90) {
      const secondaryDetail = secondLowest.score < 92 ? `와 ${secondLowest.detail}` : "";
      primaryImbalance = `얼굴 ${lowest.name} 영역에서 가장 큰 좌우 균형 차이가 관찰됩니다.
${lowest.detail}${secondaryDetail} 부위에서 상대적으로 높은 편차가 나타났습니다.
이러한 차이는 표정 습관이나 근육 사용 패턴의 영향일 수 있습니다.`;
    } else {
      primaryImbalance = `전반적인 안면 대칭이 매우 안정적인 상태로 관찰되고 있습니다.
모든 측정 부위가 조화로운 균형을 유지하며 우수한 상태입니다.
현재의 생활 습관을 유지하며 정기적으로 상태를 체크해보세요.`;
    }

    // 4. Dynamic Home Care Guide (Structured: 2 lines per item, 2+2 items)
    const tips = {
      eyes: "**안륜근(Orbicularis Oculi)**은 눈 주변을 감싸며 표정을 담당합니다.\n눈꼬리 주변을 손가락 끝으로 지압하며 부드럽게 마사지하면 도움이 됩니다.",
      brows: "**전두근(Frontalis)**은 이마를 덮고 있으며 눈썹 높낮이를 조절합니다.\n이마 중앙에서 관자놀이 방향으로 부드럽게 밀어내듯 마사지하면 좋습니다.",
      mouth: "**구각거근(Levator Anguli Oris)**은 입꼬리를 올리는 역할을 합니다.\n거울을 보며 양쪽 입꼬리를 대칭으로 올리는 미소 연습이 도움이 됩니다.",
      jaw: "**교근(Masseter)**은 턱의 움직임을 주도하며 하부 윤곽을 형성합니다.\n귀 아래 턱 근육 부위를 지그시 누르며 이완해주면 대칭성에 도움이 됩니다."
    };

    const generalTips = [
      "**흉쇄유돌근(SCM)**은 목의 정렬을 담당하며 안면 대칭에 관여합니다.\n목을 좌우로 천천히 스트레칭하여 긴장을 풀어주면 밸런스에 도움이 됩니다.",
      "**바른 생활 습관**: 한쪽으로만 씹거나 턱을 괴는 습관을 지양하십시오.\n바른 자세를 유지하는 것이 장기적인 안면 대칭 유지에 도움이 됩니다."
    ];

    let homeCareGuide = "#### 🎯 우선 권장 관리\n";
    if (lowest.score < 90) {
      homeCareGuide += `- ${(tips as any)[lowest.key]}\n`;
    }
    if (secondLowest.score < 92) {
      homeCareGuide += `- ${(tips as any)[secondLowest.key]}\n`;
    }
    if (lowest.score >= 90 && secondLowest.score >= 92) {
      homeCareGuide += "- 현재의 우수한 균형 상태를 유지하기 위한 전반적인 안면 스트레칭을 권장합니다.\n";
    }

    homeCareGuide += "\n#### 🧘 보조 습관 관리\n";
    homeCareGuide += `- ${generalTips[0]}\n`;
    homeCareGuide += `- ${generalTips[1]}\n`;

    return { primaryImbalance, analysisSummary, homeCareGuide };
  };

  const { primaryImbalance, analysisSummary, homeCareGuide } = getDynamicAnalysis();

  // 5. Result Stability & Scan Quality
  const rotation = Math.abs(metrics.rotationAngle || 0);
  const confidence = metrics.landmarkConfidence || 0.95;
  const faceSize = metrics.faceSize || 0.5;
  
  let resultStability: 'High' | 'Medium' | 'Low' = 'High';
  
  // Trigger 'Low' only if 2 or more conditions are met
  let lowConditions = 0;
  if (rotation > 0.21) lowConditions++; // > 12 degrees
  if (faceSize < 0.25) lowConditions++; // Too far
  if (confidence < 0.8) lowConditions++; // Poor detection
  
  if (lowConditions >= 2) resultStability = 'Low';
  else if (rotation > 0.1 || confidence < 0.88 || faceSize < 0.35) resultStability = 'Medium';

  const scanQuality: AnalysisResult['scanQuality'] = {
    alignment: rotation < 0.05 ? 'Good' : rotation < 0.15 ? 'Fair' : 'Poor',
    lighting: metrics.lightingStatus || (confidence > 0.9 ? 'Good' : 'Low Light'),
    stability: resultStability
  };

  // 6. Improvement Potential
  const currentScore = metrics.overallScore;
  let potentialRange = "";
  let potentialFeedback = "";
  let targetRange: [number, number] = [currentScore, currentScore];

  if (currentScore > 92) {
    potentialRange = "+1 ~ +3";
    targetRange = [currentScore + 1, Math.min(100, currentScore + 3)];
    potentialFeedback = "이미 매우 높은 수준의 대칭성을 유지하고 있습니다. 미세한 근육 긴장 완화로 완벽에 가까운 균형을 유지할 수 있습니다.";
  } else if (currentScore > 80) {
    potentialRange = "+4 ~ +7";
    targetRange = [currentScore + 4, Math.min(100, currentScore + 7)];
    potentialFeedback = "꾸준한 관리 습관을 유지하면 얼굴 균형 점수가 소폭 개선될 가능성이 있습니다.";
  } else {
    potentialRange = "+8 ~ +15";
    targetRange = [currentScore + 8, Math.min(100, currentScore + 15)];
    potentialFeedback = "근육 사용 불균형을 바로잡고 집중적인 관리를 병행한다면 대칭성이 크게 개선될 가능성이 높습니다.";
  }

  // 7. Professional Care Options (Suggestive Tone)
  const professionalCareOptions = `
전문가에 의한 근막 이완 관리나 턱 주변 교근(Masseter), 측두근(Temporalis)의 긴장 조절 프로그램이 얼굴 균형 관리에 도움이 될 수 있습니다. 특정 근육의 과도한 긴장을 해소하고 얼굴 전체의 해부학적 밸런스를 맞추는 전문가용 케어를 통해 보다 체계적인 관리를 고려해 보시기 바랍니다.
  `.trim();

  // 7. Detailed Feedback Generation Logic (Observational Style, 3-line structure)
  const angelFeedbacks = [
    "얼굴의 좌우에는 자연스러운 미세한 차이가 관찰됩니다.\n이러한 차이는 대부분의 사람에게 나타나는 특징이며 얼굴 인상에 입체감을 줄 수 있습니다.\n완벽한 대칭보다는 자연스러운 균형이 얼굴 인상을 더 조화롭게 보이게 할 수 있습니다.",
    "안면 분석 결과, 좌우 균형에서 자연스러운 미세 편차가 관찰됩니다.\n이러한 차이는 개개인의 고유한 인상을 형성하며 자연스러운 조화를 이룹니다.\n인위적인 대칭보다 조화로운 균형이 당신만의 매력을 더 돋보이게 합니다.",
    "측정된 비대칭 수치는 일상적인 범위 내에 있으며 조화로운 인상을 유지하고 있습니다.\n미세한 차이는 표정의 생동감을 더해주는 자연스러운 요소로 분석됩니다.\n자연스러운 안면 밸런스는 인상을 더욱 부드럽고 생기 있게 만들어 줍니다.",
    "전반적인 안면 정렬은 안정적인 상태를 유지하고 있는 것으로 분석됩니다.\n관찰되는 미세한 좌우 차이는 안면 근육의 자연스러운 발달 과정에서 나타납니다.\n균형 잡힌 인상은 신뢰감을 주며 얼굴 전체의 조화를 완성하는 핵심 요소입니다."
  ];

  // 6. Dynamic Expert Advice
  const getFactFeedback = () => {
    if (metrics.overallScore > 96) {
      return `정밀 분석 결과, 안면 대칭 지수가 매우 높은 수준으로 나타났습니다. 골격적 정렬과 연부조직의 분포가 조화로우며, 현재의 생활 습관을 유지하는 것만으로도 충분해 보입니다.`;
    }
    
    if (metrics.eyeSlant < 0.01 && metrics.jawDiff < 0.01) {
      return `현재 측정된 수치는 매우 이상적인 균형 상태를 보여줍니다. 얼굴에서 나타날 수 있는 가장 조화로운 상태 중 하나이며, 미세한 차이는 근육의 실시간 움직임에 따른 자연스러운 현상으로 보입니다.`;
    }

    const severity = metrics.eyeSlant > 0.06 || metrics.jawDiff > 0.09 ? '근육의 강한 긴장과 정렬 차이' : '연부조직의 비대칭적 발달';
    const recommendation = metrics.overallScore < 75 ? '전문적인 관리가 도움이 될 수 있는' : '꾸준한 홈케어와 습관 교정으로 충분히 개선 가능한';
    
    return `분석 결과, 안면의 수평 정렬과 하악각의 균형에서 약간의 차이가 관찰됩니다. 이는 ${recommendation} ${severity}에 의한 결과로 보입니다.`;
  };

  const getAngelFeedback = () => getRandom(angelFeedbacks);

  // 7. Overall Balance Summary (Consistent with analysisSummary)
  let balanceSummary = "";
  if (metrics.overallScore >= 90) balanceSummary = "전반적인 얼굴 균형이 매우 안정적이며 조화로운 구조를 보입니다.";
  else if (metrics.overallScore >= 80) balanceSummary = "전반적인 얼굴 균형은 안정적인 범위에 있습니다.";
  else if (metrics.overallScore >= 70) balanceSummary = "전반적인 얼굴 균형은 비교적 안정적인 편입니다.";
  else if (metrics.overallScore >= 60) balanceSummary = "얼굴 일부 영역에서 좌우 균형 차이가 관찰됩니다.";
  else balanceSummary = "여러 영역에서 좌우 균형 차이가 관찰됩니다.";

  // Tier Calculation
  const p = metrics.percentile || 50;
  let tier = { label: "Average", color: "text-yellow-400", icon: "🟡" };
  if (p >= 90) tier = { label: "Elite", color: "text-purple-400", icon: "🟣" };
  else if (p >= 75) tier = { label: "Excellent", color: "text-blue-400", icon: "🔵" };
  else if (p >= 60) tier = { label: "Balanced", color: "text-emerald-400", icon: "🟢" };

  // Part Scores Calculation (Using actual scores from metrics)
  const partScores = {
    eyes: metrics.eyeScore,
    brows: metrics.browsScore,
    mouth: metrics.mouthScore,
    jaw: metrics.jawScore,
  };

  const factFeedback = getFactFeedback();
  const angelFeedback = getAngelFeedback();

  return {
    overallScore: metrics.overallScore,
    symmetryScore: metrics.overallScore,
    proportionScore: proportionScore,
    summary: balanceSummary,
    faceShape,
    strongestFeatures: strongestFeatures.slice(0, 3),
    detailedFeedback: factFeedback,
    factFeedback,
    angelFeedback,
    primaryImbalance,
    analysisSummary,
    homeCareGuide,
    professionalCareOptions,
    scanQuality,
    resultStability,
    percentile: metrics.percentile,
    tier,
    partScores,
    improvementPotential: {
      range: potentialRange,
      targetRange: targetRange,
      feedback: potentialFeedback
    },
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
    }
  };
};
