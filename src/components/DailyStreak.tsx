import React from 'react';
import { useTranslation } from 'react-i18next';

interface DailyStreakProps {
  streak: number;
  lastScanDate: string;
}

export const DailyStreak: React.FC<DailyStreakProps> = ({ streak, lastScanDate }) => {
  const { t } = useTranslation();

  if (streak <= 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-white/70">{t('streak.title')}</h3>
      <p className="text-sm text-white/90">{t('streak.days', { count: streak })}</p>
      {lastScanDate ? (
        <p className="mt-1 text-[11px] text-white/40">{t('streak.lastScan', { date: lastScanDate, defaultValue: `Last scan: ${lastScanDate}` })}</p>
      ) : null}
    </section>
  );
};
