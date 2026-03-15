import { useState, useEffect } from 'react';

export const useAnalysisLimit = () => {
  const [analysisCount, setAnalysisCount] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  const unlock = () => {
    setIsLocked(false);
    // For demo purposes, we can reset the count or just set isLocked to false
    // If we want it to persist, we could use another localStorage key
    localStorage.setItem('face_analysis_pro', 'true');
  };

  useEffect(() => {
    const isPro = localStorage.getItem('face_analysis_pro') === 'true';
    const count = parseInt(localStorage.getItem('face_analysis_count') || '0');
    setAnalysisCount(count);
    
    if (isPro) {
      setIsLocked(false);
    } else if (count >= 2) {
      setIsLocked(true);
    }
  }, []);

  const incrementCount = () => {
    const isPro = localStorage.getItem('face_analysis_pro') === 'true';
    if (isPro) return;

    const newCount = analysisCount + 1;
    setAnalysisCount(newCount);
    localStorage.setItem('face_analysis_count', newCount.toString());
    if (newCount >= 2) {
      setIsLocked(true);
    }
  };

  return { analysisCount, isLocked, incrementCount, unlock };
};
