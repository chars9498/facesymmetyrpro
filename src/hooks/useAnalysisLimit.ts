import { useState, useEffect } from 'react';

const STORAGE_KEY = 'face_symmetry_pro_analysis_count';

export const useAnalysisLimit = () => {
  const [analysisCount, setAnalysisCount] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? parseInt(saved, 10) : 0;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, analysisCount.toString());
  }, [analysisCount]);

  const incrementAnalysisCount = () => {
    setAnalysisCount(prev => prev + 1);
  };

  const resetAnalysisCount = () => {
    setAnalysisCount(0);
  };

  const isLocked = analysisCount >= 1;

  return {
    analysisCount,
    isLocked,
    incrementAnalysisCount,
    resetAnalysisCount,
  };
};
