import { useState, useEffect, useCallback } from 'react';
import { getTodayString } from '../utils/dateUtils';

export const useAnalysisLimit = () => {
  const [analysisCount, setAnalysisCount] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  const unlock = useCallback(() => {
    setIsLocked(false);
    localStorage.setItem('face_analysis_pro', 'true');
  }, []);

  useEffect(() => {
    const isPro = localStorage.getItem('face_analysis_pro') === 'true';
    const lastReset = localStorage.getItem('face_analysis_last_reset');
    const today = getTodayString();

    let count = parseInt(localStorage.getItem('face_analysis_count') || '0');
    
    // Reset count if it's a new day
    if (lastReset !== today) {
      count = 0;
      localStorage.setItem('face_analysis_count', '0');
      localStorage.setItem('face_analysis_last_reset', today);
    }
    
    setAnalysisCount(count);
    
    if (isPro) {
      setIsLocked(false);
    } else if (count >= 2) {
      setIsLocked(true);
    }
  }, []);

  const incrementCount = useCallback(() => {
    const isPro = localStorage.getItem('face_analysis_pro') === 'true';
    if (isPro) return;

    setAnalysisCount(prev => {
      const newCount = prev + 1;
      localStorage.setItem('face_analysis_count', newCount.toString());
      
      // Ensure the reset date is current
      localStorage.setItem('face_analysis_last_reset', getTodayString());

      if (newCount >= 2) {
        setIsLocked(true);
      }
      return newCount;
    });
  }, []);

  return { analysisCount, isLocked, incrementCount, unlock };
};
