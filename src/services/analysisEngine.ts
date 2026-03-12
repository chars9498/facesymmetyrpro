
export interface AnalysisMetrics {
  eyeScore: number;
  noseScore: number;
  mouthScore: number;
  jawScore: number;
  eyeDiff: number;
  mouthDiff: number;
  jawDiff: number;
  eyeSlant: number;
  mouthSlant: number;
  overallScore: number;
  personality: 'fact' | 'angel';
  gender?: 'male' | 'female';
}

export interface AnalysisResult {
  summary: string;
  celebrityMatches: { name: string; confidence: number }[];
  detailedFeedback: string;
  muscleAnalysis: string;
  landmarks: {
    eyes: { feedback: string };
    nose: { feedback: string };
    mouth: { feedback: string };
    jawline: { feedback: string };
  };
  laymanProtocol: string;
  professionalProtocol: string;
}

interface Celebrity {
  name: string;
  gender: 'male' | 'female';
  category: 'visual' | 'friendly';
  ratios: { eyes: number; nose: number; mouth: number; jaw: number };
}

const CELEBRITIES: Celebrity[] = [
  // Female - Visuals
  { name: "김태희", gender: "female", category: 'visual', ratios: { eyes: 98, nose: 97, mouth: 96, jaw: 98 } },
  { name: "한가인", gender: "female", category: 'visual', ratios: { eyes: 95, nose: 99, mouth: 94, jaw: 95 } },
  { name: "수지", gender: "female", category: 'visual', ratios: { eyes: 92, nose: 91, mouth: 93, jaw: 90 } },
  { name: "아이유", gender: "female", category: 'visual', ratios: { eyes: 88, nose: 86, mouth: 90, jaw: 87 } },
  { name: "카리나", gender: "female", category: 'visual', ratios: { eyes: 97, nose: 96, mouth: 94, jaw: 99 } },
  { name: "제니", gender: "female", category: 'visual', ratios: { eyes: 90, nose: 88, mouth: 94, jaw: 89 } },
  { name: "장원영", gender: "female", category: 'visual', ratios: { eyes: 96, nose: 94, mouth: 93, jaw: 92 } },
  { name: "한소희", gender: "female", category: 'visual', ratios: { eyes: 92, nose: 90, mouth: 91, jaw: 93 } },
  { name: "김지원", gender: "female", category: 'visual', ratios: { eyes: 94, nose: 95, mouth: 96, jaw: 93 } },
  { name: "김고은", gender: "female", category: 'visual', ratios: { eyes: 82, nose: 84, mouth: 81, jaw: 83 } },
  { name: "박소담", gender: "female", category: 'visual', ratios: { eyes: 81, nose: 83, mouth: 82, jaw: 80 } },

  // Female - Friendly (Lowered scores to avoid overlap)
  { name: "박나래", gender: "female", category: 'friendly', ratios: { eyes: 62, nose: 60, mouth: 65, jaw: 58 } },
  { name: "김숙", gender: "female", category: 'friendly', ratios: { eyes: 65, nose: 62, mouth: 60, jaw: 68 } },
  { name: "장도연", gender: "female", category: 'friendly', ratios: { eyes: 75, nose: 78, mouth: 74, jaw: 80 } },

  // Male - Visuals
  { name: "원빈", gender: "male", category: 'visual', ratios: { eyes: 97, nose: 98, mouth: 97, jaw: 96 } },
  { name: "차은우", gender: "male", category: 'visual', ratios: { eyes: 99, nose: 96, mouth: 98, jaw: 97 } },
  { name: "공유", gender: "male", category: 'visual', ratios: { eyes: 92, nose: 94, mouth: 93, jaw: 98 } },
  { name: "강동원", gender: "male", category: 'visual', ratios: { eyes: 96, nose: 97, mouth: 92, jaw: 93 } },
  { name: "정국", gender: "male", category: 'visual', ratios: { eyes: 95, nose: 94, mouth: 97, jaw: 95 } },
  { name: "뷔", gender: "male", category: 'visual', ratios: { eyes: 96, nose: 98, mouth: 95, jaw: 94 } },
  { name: "현빈", gender: "male", category: 'visual', ratios: { eyes: 95, nose: 97, mouth: 96, jaw: 98 } },
  { name: "박보검", gender: "male", category: 'visual', ratios: { eyes: 94, nose: 92, mouth: 95, jaw: 91 } },
  { name: "송중기", gender: "male", category: 'visual', ratios: { eyes: 93, nose: 91, mouth: 92, jaw: 90 } },
  { name: "김수현", gender: "male", category: 'visual', ratios: { eyes: 92, nose: 93, mouth: 91, jaw: 93 } },
  { name: "주우재", gender: "male", category: 'visual', ratios: { eyes: 86, nose: 88, mouth: 84, jaw: 90 } },
  { name: "덱스", gender: "male", category: 'visual', ratios: { eyes: 88, nose: 86, mouth: 90, jaw: 92 } },
  { name: "이도현", gender: "male", category: 'visual', ratios: { eyes: 85, nose: 87, mouth: 84, jaw: 86 } },
  { name: "남주혁", gender: "male", category: 'visual', ratios: { eyes: 84, nose: 86, mouth: 83, jaw: 88 } },
  { name: "최우식", gender: "male", category: 'visual', ratios: { eyes: 82, nose: 84, mouth: 83, jaw: 81 } },
  { name: "손석구", gender: "male", category: 'visual', ratios: { eyes: 83, nose: 88, mouth: 85, jaw: 90 } },
  { name: "류준열", gender: "male", category: 'visual', ratios: { eyes: 78, nose: 84, mouth: 86, jaw: 82 } },

  // Male - Friendly (Lowered scores to avoid overlap)
  { name: "유재석", gender: "male", category: 'friendly', ratios: { eyes: 65, nose: 68, mouth: 62, jaw: 64 } },
  { name: "조세호", gender: "male", category: 'friendly', ratios: { eyes: 60, nose: 58, mouth: 65, jaw: 56 } },
  { name: "양세형", gender: "male", category: 'friendly', ratios: { eyes: 62, nose: 64, mouth: 66, jaw: 60 } },
  { name: "강호동", gender: "male", category: 'friendly', ratios: { eyes: 55, nose: 60, mouth: 58, jaw: 65 } },
  { name: "박명수", gender: "male", category: 'friendly', ratios: { eyes: 54, nose: 62, mouth: 56, jaw: 58 } },
];

const getRandom = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

export const analyzeLocally = (metrics: AnalysisMetrics): AnalysisResult => {
  const isFact = metrics.personality === 'fact';
  const targetGender = metrics.gender || 'male';
  
  // 1. Summary Generation
  const summaries = metrics.overallScore > 90 
    ? ["황금비율에 근접한 이상적인 대칭 구조", "안면 골격의 정렬이 매우 우수한 케이스", "균형미가 돋보이는 완성도 높은 마스크"]
    : metrics.overallScore > 80
    ? ["전반적으로 조화로운 대칭성을 가진 얼굴", "미세한 비대칭이 매력으로 승화된 구조", "안정적인 골격 정렬을 유지 중인 상태"]
    : ["개성적인 비대칭이 조화를 이루는 마스크", "특정 부위의 근육 불균형이 관찰되는 구조", "교정이 필요한 비대칭적 요소가 존재하는 상태"];

  // 2. Celebrity Matching Logic (Weighted Similarity)
  const celebrityMatches = CELEBRITIES
    .filter(cel => cel.gender === targetGender)
    .map(cel => {
      // Weighted Euclidean distance calculation
      // Jaw (2.0), Nose (1.5), and Eyes (1.2) are prioritized as per user feedback
      const weights = { eyes: 1.2, nose: 1.5, mouth: 1, jaw: 2 };
      
      const distance = Math.sqrt(
        weights.eyes * Math.pow(cel.ratios.eyes - metrics.eyeScore, 2) +
        weights.nose * Math.pow(cel.ratios.nose - metrics.noseScore, 2) +
        weights.mouth * Math.pow(cel.ratios.mouth - metrics.mouthScore, 2) +
        weights.jaw * Math.pow(cel.ratios.jaw - metrics.jawScore, 2)
      );
      
      // Category-based balancing: 
      // If a user's average score is above 75, we assume they have a "Visual" profile
      const avgUserScore = (metrics.eyeScore + metrics.noseScore + metrics.mouthScore + metrics.jawScore) / 4;
      let categoryPenalty = 0;
      if (avgUserScore > 75 && cel.category === 'friendly') {
        categoryPenalty = 35; // Increased penalty to be even stricter
      } else if (avgUserScore < 60 && cel.category === 'visual') {
        categoryPenalty = 15;
      }

      // Convert distance to confidence (lower distance = higher confidence)
      // Max possible distance is now sqrt(100^2 * 5) ≈ 223
      const confidence = Math.max(5, Math.min(99, Math.round(100 - (distance * 1.0) - categoryPenalty)));
      
      return { name: cel.name, confidence };
    })
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);

  // 3. Detailed Feedback Generation Logic
  const getFeedback = (score: number, slant: number, diff: number, type: 'eye' | 'mouth' | 'jaw' | 'nose') => {
    const pool = {
      eye: [
        { min: 97, texts: [
          "안륜근(Orbicularis oculi)의 좌우 긴장도가 완벽하게 균일하며 상안검거근의 기능적 대칭이 매우 우수합니다.",
          "안와(Orbit)의 수평 정렬이 이상적이며, 눈둘레근의 수축력이 좌우 균등하게 분포되어 있습니다.",
          "양측 안검거근의 장력이 대칭적이며, 눈꼬리의 각도가 해부학적 황금비율에 근접해 있습니다."
        ] },
        { min: 88, texts: [
          "전반적으로 안정적인 안륜근 정렬을 보이나, 미세한 측두근 긴장 차이로 인한 수평 편차가 존재합니다.",
          "상안검거근의 대칭성이 양호하며, 일상적인 표정 근육 사용에 따른 자연스러운 편차 수준입니다.",
          "눈 주위 근육의 탄력이 균형 잡혀 있으며, 미세한 시선 방향에 따른 일시적 비대칭으로 분석됩니다."
        ] },
        { min: 75, texts: [
          "측두근(Temporalis)의 비대칭적 수축으로 인해 안와의 수평 정렬에 유의미한 편차가 관찰됩니다.",
          "상안검거근의 비대칭적 약화로 인해 안검하수 양상의 편차가 존재하며, 이는 눈 피로도에 영향을 줄 수 있습니다.",
          "눈썹 주위 근육(Corrugator)의 편측 긴장으로 인해 눈매의 높낮이 차이가 가시화된 상태입니다."
        ] },
        { min: 0, texts: [
          "안륜근의 심한 불균형과 전두근의 보상적 수축이 관찰됩니다. 안구 주위 근육의 이완이 시급한 상태입니다.",
          "심부 근막의 유착으로 인해 눈꼬리 높이의 가시적인 비대칭이 두드러지며 전문적인 교정이 권장됩니다.",
          "상안검거근의 기능 저하가 비대칭적으로 진행되어 안면 상부의 전반적인 정렬을 무너뜨리고 있습니다."
        ] }
      ],
      mouth: [
        { min: 97, texts: [
          "구륜근(Orbicularis oris)과 대관골근의 협응 능력이 매우 대칭적이며 미소 시 균형감이 탁월합니다.",
          "입술 주위 근육의 동적 대칭성이 완벽하며, 구각거근의 수축력이 좌우 동일하게 작용합니다.",
          "입꼬리 올림근들의 길항 작용이 조화로워 표정 변화 시에도 정중선이 흔들림 없이 유지됩니다."
        ] },
        { min: 88, texts: [
          "구각거근(Levator anguli oris)의 미세한 편측 활성화가 관찰되나 전반적인 미소 라인은 안정적입니다.",
          "소근(Risorius)의 좌우 긴장도 차이가 미미하며, 일상적인 대화 시 대칭성이 잘 유지되고 있습니다.",
          "입술 주위 근육의 긴장도가 비교적 균일하며, 특정 방향으로의 저작 습관만 주의하면 될 수준입니다."
        ] },
        { min: 75, texts: [
          "구각거근의 편측 과활성화로 인해 구각의 수평선이 비대칭적으로 형성되었습니다. 저작 습관 확인이 필요합니다.",
          "소근과 하순저근의 불균형으로 인해 미소 시 비대칭적 수축이 두드러지며 한쪽 입꼬리가 처지는 경향이 있습니다.",
          "대관골근의 비대칭적 수축력이 입술의 정중선을 한쪽으로 견인하고 있는 양상이 관찰됩니다."
        ] },
        { min: 0, texts: [
          "구륜근의 심부 유착과 광대근의 기능적 저하가 동시에 관찰됩니다. 안면 하부의 근육 재교육이 필요한 단계입니다.",
          "입술 비대칭 지수가 높으며, 이는 하악의 편위와 연관된 복합적인 근육 불균형의 결과로 분석됩니다.",
          "구강 주위 근육의 전반적인 톤 저하와 편측 근육의 과도한 단축이 심각한 비대칭을 유발하고 있습니다."
        ] }
      ],
      jaw: [
        { min: 95, texts: ["하악골(Mandible)의 정렬이 정중선에 정확히 일치하며 교근의 부피가 좌우 균등하게 분포되어 있습니다.", "턱관절의 가동 범위가 대칭적이며, 하악각의 골격적 정렬이 매우 우수한 상태입니다."] },
        { min: 85, texts: ["교근(Masseter)의 미세한 부피 차이가 관찰되나 하악의 중심축 정렬은 비교적 안정적입니다.", "턱관절 주위 인대의 긴장도가 양호하며, 골격적 비대칭보다는 근육량의 미세한 차이가 주원인입니다."] },
        { min: 70, texts: ["편측 교근의 과도한 비대로 인해 하악각의 가시적 비대칭과 골격적 변위가 의심됩니다.", "측두하악관절(TMJ)의 기능적 불균형으로 인해 하악의 편위 현상이 관찰되며 저작 시 소음이 동반될 수 있습니다."] },
        { min: 0, texts: ["하악의 정중선 이탈이 뚜렷하며, 이는 경추 정렬의 불균형과 연관된 심각한 골격적 비대칭일 가능성이 높습니다.", "교근과 익상근의 심한 비대칭적 수축으로 인해 하악각의 변형이 진행되고 있는 것으로 분석됩니다."] }
      ],
      nose: [
        { min: 90, texts: ["비중격의 정렬이 정중선에 일치하며 비근근(Procerus)의 긴장도가 매우 낮아 안정적입니다.", "코의 중심축이 안면 정중선과 완벽히 일치하며 콧볼의 대칭성이 우수합니다."] },
        { min: 0, texts: ["비중격의 미세한 편위가 관찰되나 기능적 문제는 없으며, 비근근의 미세한 긴장이 관찰됩니다.", "콧볼 주위 근육의 비대칭적 수축으로 인해 코의 중심선이 미세하게 한쪽으로 치우쳐 보입니다."] }
      ]
    };

    const selected = pool[type].find(p => score >= p.min);
    return getRandom(selected?.texts || ["분석 데이터를 바탕으로 상태를 확인 중입니다."]);
  };

  const eyeFeedback = getFeedback(metrics.eyeScore, metrics.eyeSlant, metrics.eyeDiff, 'eye');
  const mouthFeedback = getFeedback(metrics.mouthScore, metrics.mouthSlant, metrics.mouthDiff, 'mouth');
  const jawFeedback = getFeedback(metrics.jawScore, 0, metrics.jawDiff, 'jaw');
  const noseFeedback = getFeedback(metrics.noseScore, 0, 0, 'nose');

  // 4. Dynamic Muscle Analysis
  const primaryCause = metrics.jawDiff > metrics.eyeDiff ? '교근(Masseter)' : '측두근(Temporalis)';
  const secondaryCause = metrics.mouthSlant > 0.03 ? '대관골근(Zygomaticus)' : '익상근(Pterygoid)';
  
  const muscleAnalysis = metrics.overallScore > 92
    ? "전반적인 근육 대칭성이 매우 우수합니다. 현재의 생활 습관을 유지하며 미세한 근육 긴장만 관리해주시면 충분합니다."
    : `현재 비대칭의 주요 원인은 **${primaryCause}**과 **흉쇄유돌근(SCM)**의 비대칭적 긴장에 기인합니다. 특히 ${secondaryCause}의 기능적 저하가 안면 하부의 정렬에 영향을 미치고 있는 것으로 분석됩니다.`;

  // 4. Protocols
  const laymanProtocol = `
    ### 🏠 데일리 홈케어 가이드
    1. **${metrics.jawDiff > 0.05 ? '저작 습관 개선' : '수면 자세 교정'}**: 한쪽으로만 음식을 씹는 습관을 버리고 양쪽을 골고루 사용하세요.
    2. **온열 찜질**: 비대칭이 심한 쪽의 턱 근육에 하루 15분간 온찜질을 시행하여 근육 긴장을 완화하세요.
    3. **거울 피드백**: 미소 연습 시 거울을 보며 낮은 쪽 입꼬리를 의도적으로 더 올리는 연습을 하세요.
  `;

  const professionalProtocol = `
    ### 🩺 임상 교정 프로토콜
    1. **연부조직 이완술(Myofascial Release)**: 과활성화된 **교근(Masseter)**과 **측두근(Temporalis)** 부위에 IASTM 도구를 활용한 심부 연부조직 이완술을 시행하여 근막 유착을 해소합니다.
    2. **근막 신장술(Clinical Stretching)**: 단축된 **흉쇄유돌근(SCM)**과 **사각근(Scalene)**에 대해 PNF(고유수용성 신경근 촉진법) 스트레칭을 적용하여 경추 정렬을 정상화합니다.
    3. **기능적 재교육 운동(Functional Exercise)**: **내익상근(Medial Pterygoid)**의 대칭적 수축을 유도하는 하악 저항 운동과 안면 신경 재교육 프로그램을 통해 동적 대칭성을 확보합니다.
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
        return `정밀 분석 결과, 안면 대칭 지수가 상위 0.5%에 해당하는 극히 드문 황금 비율입니다. 골격적 정렬과 연부조직의 분포가 해부학적으로 완벽에 가까우며, 현재의 생활 습관을 유지하는 것만으로도 충분합니다.`;
      }
      
      if (metrics.eyeSlant < 0.01 && metrics.jawDiff < 0.01) {
        return `현재 측정된 수치(${metrics.eyeSlant.toFixed(4)}rad, ${metrics.jawDiff.toFixed(4)})는 의학적으로 '완전 대칭' 범주에 속합니다. 인간의 얼굴에서 나타날 수 있는 가장 이상적인 균형 상태이며, 미세한 차이는 근육의 실시간 움직임에 따른 자연스러운 현상입니다.`;
      }

      const severity = metrics.eyeSlant > 0.06 || metrics.jawDiff > 0.09 ? '심부 근막의 강한 유착과 골격적 변위' : '연부조직의 비대칭적 발달';
      const recommendation = metrics.overallScore < 75 ? '전문적인 도수 치료나 근막 이완술이 권장되는' : '꾸준한 홈케어와 습관 교정으로 충분히 개선 가능한';
      
      return `분석 결과, 안면 골격의 수평 편차는 ${metrics.eyeSlant.toFixed(3)}rad이며, 하악각의 비대칭 지수는 ${metrics.jawDiff.toFixed(3)}입니다. 이는 ${recommendation} ${severity}에 의한 결과로 판단됩니다.`;
    }
    return getRandom(angelFeedbacks);
  };
  return {
    summary: getRandom(summaries),
    celebrityMatches,
    detailedFeedback: getExpertAdvice(),
    muscleAnalysis: muscleAnalysis.trim(),
    landmarks: {
      eyes: { feedback: eyeFeedback },
      nose: { feedback: noseFeedback },
      mouth: { feedback: mouthFeedback },
      jawline: { feedback: jawFeedback }
    },
    laymanProtocol: laymanProtocol.trim(),
    professionalProtocol: professionalProtocol.trim()
  };
};
