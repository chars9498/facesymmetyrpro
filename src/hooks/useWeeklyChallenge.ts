import { useState, useEffect, useCallback } from 'react';

interface ChallengeData {
  weekStart: string;
  scans: number;
  lastScanDate: string;
}

const STORAGE_KEY = 'face_weekly_challenge';

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
}

export function useWeeklyChallenge() {
  const [challenge, setChallenge] = useState<ChallengeData>({
    weekStart: getWeekStart(new Date()),
    scans: 0,
    lastScanDate: '',
  });

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const currentWeekStart = getWeekStart(new Date());

    if (saved) {
      try {
        const parsed: ChallengeData = JSON.parse(saved);
        if (parsed.weekStart !== currentWeekStart) {
          // New week, reset
          const resetData = { weekStart: currentWeekStart, scans: 0, lastScanDate: '' };
          setChallenge(resetData);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(resetData));
        } else {
          setChallenge(parsed);
        }
      } catch (e) {
        console.error('Failed to parse weekly challenge data', e);
      }
    } else {
      const initialData = { weekStart: currentWeekStart, scans: 0, lastScanDate: '' };
      setChallenge(initialData);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialData));
    }
  }, []);

  const incrementWeeklyScan = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    const currentWeekStart = getWeekStart(new Date());

    setChallenge(prev => {
      // Check if week changed
      if (prev.weekStart !== currentWeekStart) {
        const newData = { weekStart: currentWeekStart, scans: 1, lastScanDate: today };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
        return newData;
      }

      // Check if already scanned today
      if (prev.lastScanDate === today) {
        return prev;
      }

      // Increment scans (max 3)
      const newScans = Math.min(prev.scans + 1, 3);
      const newData = { ...prev, scans: newScans, lastScanDate: today };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
      return newData;
    });
  }, []);

  return {
    challenge,
    incrementWeeklyScan,
  };
}
