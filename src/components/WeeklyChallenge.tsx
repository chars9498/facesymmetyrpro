import React from 'react';
import { useTranslation } from 'react-i18next';

interface WeeklyChallengeProps {
  scans: number;
  lastScanDate: string;
}

export const WeeklyChallenge: React.FC<WeeklyChallengeProps> = ({ scans, lastScanDate }) => {
  const { t } = useTranslation();
  const target = 3;
  const clamped = Math.max(0, Math.min(scans, target));
  const percent = Math.round((clamped / target) * 100);

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-white/70">
        {t('challenge.title')}
      </h3>
      <p className="mb-2 text-sm text-white/80">{t('challenge.scansCompleted', { count: scans })}</p>
      <div className="h-2 w-full overflow-hidden rounded bg-white/10">
        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-2 text-xs text-white/60">
        {clamped >= target ? t('challenge.completed') : t('challenge.moreScans', { count: target - clamped })}
      </p>
      {lastScanDate ? (
        <p className="mt-1 text-[11px] text-white/40">
          {t('challenge.lastScan', { date: lastScanDate })}
        </p>
      ) : null}
    </section>
  );
};
