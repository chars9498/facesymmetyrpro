import { useState, useEffect, useCallback } from 'react';

export interface HistoryItem {
  timestamp: number;
  overallScore: number;
}

const STORAGE_KEY = 'face_symmetry_history';

export function useAnalysisHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse history', e);
      }
    }
  }, []);

  const saveToHistory = useCallback((score: number) => {
    const newItem: HistoryItem = {
      timestamp: Date.now(),
      overallScore: score,
    };
    
    setHistory(prev => {
      const updated = [newItem, ...prev].slice(0, 50); // Keep last 50
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const getPreviousScan = useCallback(() => {
    // The current scan is already in history if we save it immediately on completion
    // So we look for the second item if we want the "previous" one relative to the current session
    // Or we can just return the first item if we haven't saved the current one yet.
    return history.length > 0 ? history[0] : null;
  }, [history]);

  return {
    history,
    saveToHistory,
    getPreviousScan,
  };
}
