import { useState, useEffect, useCallback } from 'react';
import { getTodayString } from '../utils/dateUtils';

interface StreakData {
  lastScanDate: string;
  streak: number;
}

const STORAGE_KEY = 'face_daily_streak';

export function useDailyStreak() {
  const [streakData, setStreakData] = useState<StreakData>({
    lastScanDate: '',
    streak: 0,
  });

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed: StreakData = JSON.parse(saved);
        setStreakData(parsed);
      } catch (e) {
        console.error('Failed to parse daily streak data', e);
      }
    }
  }, []);

  const incrementStreak = useCallback(() => {
    const today = getTodayString();
    
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, '0')}-${String(yesterdayDate.getDate()).padStart(2, '0')}`;

    setStreakData(prev => {
      if (prev.lastScanDate === today) {
        // Already counted today
        return prev;
      }

      let newStreak = prev.streak;
      if (prev.lastScanDate === yesterdayStr) {
        // Consecutive day
        newStreak += 1;
      } else {
        // Streak broken or first time
        newStreak = 1;
      }

      const newData = { lastScanDate: today, streak: newStreak };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
      return newData;
    });
  }, []);

  return {
    streakData,
    incrementStreak,
  };
}
