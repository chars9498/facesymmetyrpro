
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

import i18n from '../i18n';

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
  primaryImbalanceArea: string;
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

export const analyzeLocally = (metrics: AnalysisMetrics): AnalysisResult => {
  // 1. Face Shape Analysis
  let faceShape = i18n.t('analysis.faceShapes.oval');
  let faceShapeKey = 'oval';
  const ratio = metrics.faceRatio;
  const jawRatio = metrics.jawWidthRatio / metrics.cheekboneWidthRatio;
  const foreheadRatioVal = metrics.foreheadWidthRatio / metrics.cheekboneWidthRatio;

  if (ratio > 1.55) {
    faceShape = i18n.t('analysis.faceShapes.oblong');
    faceShapeKey = 'oblong';
  } else if (jawRatio > 0.92 && ratio < 1.35) {
    faceShape = i18n.t('analysis.faceShapes.square');
    faceShapeKey = 'square';
  } else if (ratio < 1.30) {
    faceShape = i18n.t('analysis.faceShapes.round');
    faceShapeKey = 'round';
  } else if (foreheadRatioVal > jawRatio) {
    faceShape = i18n.t('analysis.faceShapes.heart');
    faceShapeKey = 'heart';
  } else {
    faceShape = i18n.t('analysis.faceShapes.oval');
    faceShapeKey = 'oval';
  }

  // 2. Strongest Features Analysis
  const strongestFeatures = [];
  if (metrics.eyeDistanceRatio > 0.32 && metrics.eyeDistanceRatio < 0.38) {
    strongestFeatures.push(i18n.t('analysis.features.eyeSpacing'));
  }
  if (metrics.jawScore > 85) {
    strongestFeatures.push(i18n.t('analysis.features.jawline'));
  }
  if (metrics.lowerFaceRatio > 0.3 && metrics.lowerFaceRatio < 0.36) {
    strongestFeatures.push(i18n.t('analysis.features.proportions'));
  }

  // 3. Advanced Metrics Calculation
  const eyeSpacingVal = metrics.eyeDistanceRatio / (metrics.eyeWidthRatio || 0.2);
  let eyeSpacingStatus = i18n.t('analysis.advanced.eyeSpacing.good');
  let eyeSpacingFeedback = i18n.t('analysis.advanced.eyeSpacing.goodFeedback');
  if (eyeSpacingVal < 0.9) {
    eyeSpacingStatus = i18n.t('analysis.advanced.eyeSpacing.narrow');
    eyeSpacingFeedback = i18n.t('analysis.advanced.eyeSpacing.narrowFeedback');
  } else if (eyeSpacingVal > 1.1) {
    eyeSpacingStatus = i18n.t('analysis.advanced.eyeSpacing.wide');
    eyeSpacingFeedback = i18n.t('analysis.advanced.eyeSpacing.wideFeedback');
  }

  const totalVertical = metrics.foreheadRatio + metrics.noseLengthRatio + metrics.lowerFaceRatio;
  const upperP = Math.round((metrics.foreheadRatio / totalVertical) * 100);
  const midP = Math.round((metrics.noseLengthRatio / totalVertical) * 100);
  const lowerP = Math.round((metrics.lowerFaceRatio / totalVertical) * 100);
  
  let propStatus = i18n.t('analysis.advanced.proportion.ideal');
  let propFeedback = i18n.t('analysis.advanced.proportion.idealFeedback');
  if (midP > 36) {
    propStatus = i18n.t('analysis.advanced.proportion.longMid');
    propFeedback = i18n.t('analysis.advanced.proportion.longMidFeedback');
  } else if (lowerP > 36) {
    propStatus = i18n.t('analysis.advanced.proportion.longLower');
    propFeedback = i18n.t('analysis.advanced.proportion.longLowerFeedback');
  } else if (upperP > 36) {
    propStatus = i18n.t('analysis.advanced.proportion.longUpper');
    propFeedback = i18n.t('analysis.advanced.proportion.longUpperFeedback');
  }

  const widthHeightRatio = 1 / metrics.faceRatio; 
  let ratioStatus = i18n.t('analysis.advanced.ratio.balanced');
  let ratioFeedback = i18n.t('analysis.advanced.ratio.balancedFeedback');
  if (widthHeightRatio < 0.7) {
    ratioStatus = i18n.t('analysis.advanced.ratio.slim');
    ratioFeedback = i18n.t('analysis.advanced.ratio.slimFeedback');
  } else if (widthHeightRatio > 0.85) {
    ratioStatus = i18n.t('analysis.advanced.ratio.wide');
    ratioFeedback = i18n.t('analysis.advanced.ratio.wideFeedback');
  }

  const proportionScore = Math.round(100 - (Math.abs(33.3 - upperP) + Math.abs(33.3 - midP) + Math.abs(33.3 - lowerP)) * 2);

  const getRandomIndex = (max: number) => Math.floor(Math.random() * max);
  const getRandom = (arr: string[]) => arr[getRandomIndex(arr.length)];

  const getFeedback = (score: number, type: 'eyes' | 'mouth' | 'jaw' | 'brows') => {
    const statusKeys = ['excellent', 'good', 'slight', 'noticeable'];
    let index = 0;
    if (score >= 85) index = 0;
    else if (score >= 70) index = 1;
    else if (score >= 55) index = 2;
    else index = 3;

    return {
      score,
      status: i18n.t(`analysis.feedback.status.${statusKeys[index]}`),
      feedback: i18n.t(`analysis.feedback.${type}.${statusKeys[index]}`)
    };
  };

  const eyeRes = getFeedback(metrics.eyeScore, 'eyes');
  const mouthRes = getFeedback(metrics.mouthScore, 'mouth');
  const jawRes = getFeedback(metrics.jawScore, 'jaw');
  const browsRes = getFeedback(metrics.browsScore, 'brows');

  const getDynamicAnalysis = () => {
    const scores = [
      { name: i18n.t('analysis.areas.eyes'), score: metrics.eyeScore, key: 'eyes', detail: i18n.t('analysis.details.eyeHeight') },
      { name: i18n.t('analysis.areas.brows'), score: metrics.browsScore, key: 'brows', detail: i18n.t('analysis.details.browSlant') },
      { name: i18n.t('analysis.areas.mouth'), score: metrics.mouthScore, key: 'mouth', detail: i18n.t('analysis.details.mouthPos') },
      { name: i18n.t('analysis.areas.jaw'), score: metrics.jawScore, key: 'jaw', detail: i18n.t('analysis.details.jawSym') }
    ];

    const sortedScores = [...scores].sort((a, b) => a.score - b.score);
    const lowest = sortedScores[0];
    const secondLowest = sortedScores[1];

    const summaries = [
      i18n.t('analysis.summaries.high'),
      i18n.t('analysis.summaries.high2'),
      i18n.t('analysis.summaries.high3'),
      i18n.t('analysis.summaries.mid'),
      i18n.t('analysis.summaries.mid2'),
      i18n.t('analysis.summaries.mid3'),
      i18n.t('analysis.summaries.low'),
      i18n.t('analysis.summaries.low2'),
      i18n.t('analysis.summaries.low3')
    ];
    
    let overallSummary = "";
    if (metrics.overallScore >= 90) overallSummary = summaries[getRandomIndex(3)];
    else if (metrics.overallScore >= 75) overallSummary = summaries[3 + getRandomIndex(3)];
    else overallSummary = summaries[6 + getRandomIndex(3)];

    const deviations = sortedScores.slice(0, 2).map((s) => {
      let desc = "";
      if (s.score >= 85) desc = i18n.t('analysis.dynamic.deviation.slight');
      else if (s.score >= 75) desc = i18n.t('analysis.dynamic.deviation.minor');
      else if (s.score >= 65) desc = i18n.t('analysis.dynamic.deviation.noticeable');
      else desc = i18n.t('analysis.dynamic.deviation.significant');
      
      return i18n.t('analysis.dynamic.observation', { area: s.name, detail: s.detail, desc });
    }).join("\n");

    const influenceExplanation = i18n.t('analysis.dynamic.influence');
    const analysisSummary = `${overallSummary}\n\n${deviations}\n\n${influenceExplanation}`;

    let primaryImbalance = "";
    let primaryImbalanceArea = "";
    if (lowest.score < 90) {
      primaryImbalanceArea = lowest.name;
      const secondaryDetail = secondLowest.score < 92 ? i18n.t('analysis.dynamic.insight.andDetail', { detail: secondLowest.detail }) : "";
      primaryImbalance = i18n.t('analysis.dynamic.insight.imbalance', { 
        area: lowest.name, 
        detail: lowest.detail + secondaryDetail 
      });
    } else {
      primaryImbalance = i18n.t('analysis.dynamic.insight.stable');
      primaryImbalanceArea = i18n.t('analysis.areas.overall');
    }

    const tips = {
      eyes: i18n.t('analysis.care.tips.eyes'),
      brows: i18n.t('analysis.care.tips.brows'),
      mouth: i18n.t('analysis.care.tips.mouth'),
      jaw: i18n.t('analysis.care.tips.jaw')
    };

    const generalTips = i18n.t('analysis.care.general', { returnObjects: true }) as string[];

    let homeCareGuide = i18n.t('analysis.care.title') + "\n";
    if (lowest.score < 90) {
      homeCareGuide += `- ${(tips as any)[lowest.key]}\n`;
    }
    if (secondLowest.score < 92) {
      homeCareGuide += `- ${(tips as any)[secondLowest.key]}\n`;
    }
    if (lowest.score >= 90 && secondLowest.score >= 92) {
      homeCareGuide += `- ${i18n.t('analysis.care.maintain')}\n`;
    }

    homeCareGuide += "\n" + i18n.t('analysis.care.secondaryTitle') + "\n";
    homeCareGuide += `- ${generalTips[0]}\n`;
    homeCareGuide += `- ${generalTips[1]}\n`;

    return { primaryImbalance, primaryImbalanceArea, analysisSummary, homeCareGuide };
  };

  const { primaryImbalance, primaryImbalanceArea, analysisSummary, homeCareGuide } = getDynamicAnalysis();

  const rotation = Math.abs(metrics.rotationAngle || 0);
  const confidence = metrics.landmarkConfidence || 0.95;
  const faceSize = metrics.faceSize || 0.5;
  
  let resultStability: 'High' | 'Medium' | 'Low' = 'High';
  let lowConditions = 0;
  if (rotation > 0.21) lowConditions++;
  if (faceSize < 0.25) lowConditions++;
  if (confidence < 0.8) lowConditions++;
  
  if (lowConditions >= 2) resultStability = 'Low';
  else if (rotation > 0.1 || confidence < 0.88 || faceSize < 0.35) resultStability = 'Medium';

  const scanQuality: AnalysisResult['scanQuality'] = {
    alignment: rotation < 0.05 ? 'Good' : rotation < 0.15 ? 'Fair' : 'Poor',
    lighting: metrics.lightingStatus || (confidence > 0.9 ? 'Good' : 'Low Light'),
    stability: resultStability
  };

  const currentScore = metrics.overallScore;
  let potentialRange = "";
  let potentialFeedback = "";
  let targetRange: [number, number] = [currentScore, currentScore];

  if (currentScore > 92) {
    potentialRange = "+1 ~ +3";
    targetRange = [currentScore + 1, Math.min(100, currentScore + 3)];
    potentialFeedback = i18n.t('analysis.potential.high');
  } else if (currentScore > 80) {
    potentialRange = "+4 ~ +7";
    targetRange = [currentScore + 4, Math.min(100, currentScore + 7)];
    potentialFeedback = i18n.t('analysis.potential.mid');
  } else {
    potentialRange = "+8 ~ +15";
    targetRange = [currentScore + 8, Math.min(100, currentScore + 15)];
    potentialFeedback = i18n.t('analysis.potential.low');
  }

  const professionalCareOptions = i18n.t('analysis.care.professional');

  const angelFeedbacks = [
    i18n.t('analysis.angel.1'),
    i18n.t('analysis.angel.2'),
    i18n.t('analysis.angel.3'),
    i18n.t('analysis.angel.4')
  ];

  const getFactFeedback = () => {
    if (metrics.overallScore > 96) {
      return i18n.t('analysis.fact.excellent');
    }
    if (metrics.eyeSlant < 0.01 && metrics.jawDiff < 0.01) {
      return i18n.t('analysis.fact.ideal');
    }
    const severity = metrics.eyeSlant > 0.06 || metrics.jawDiff > 0.09 ? i18n.t('analysis.fact.severity.tension') : i18n.t('analysis.fact.severity.softTissue');
    const recommendation = metrics.overallScore < 75 ? i18n.t('analysis.fact.recommendation.professional') : i18n.t('analysis.fact.recommendation.homecare');
    return i18n.t('analysis.fact.observation', { recommendation, severity });
  };

  const getAngelFeedback = () => getRandom(angelFeedbacks);

  let balanceSummary = "";
  if (metrics.overallScore >= 90) balanceSummary = i18n.t('analysis.dynamic.overall.excellent');
  else if (metrics.overallScore >= 80) balanceSummary = i18n.t('analysis.dynamic.overall.good');
  else if (metrics.overallScore >= 70) balanceSummary = i18n.t('analysis.dynamic.overall.fair');
  else if (metrics.overallScore >= 60) balanceSummary = i18n.t('analysis.dynamic.overall.noticeable');
  else balanceSummary = i18n.t('analysis.dynamic.overall.multiple');

  const p = metrics.percentile || 50;
  let tier = { label: i18n.t('analysis.tiers.average'), color: "text-yellow-400", icon: "🟡" };
  if (p >= 90) tier = { label: i18n.t('analysis.tiers.elite'), color: "text-purple-400", icon: "🟣" };
  else if (p >= 75) tier = { label: i18n.t('analysis.tiers.excellent'), color: "text-blue-400", icon: "🔵" };
  else if (p >= 60) tier = { label: i18n.t('analysis.tiers.balanced'), color: "text-emerald-400", icon: "🟢" };

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
    primaryImbalanceArea,
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
    },
    metrics
  };
};
