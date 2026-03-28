import React from 'react';
import { useTranslation } from 'react-i18next';

type LanguageItem = {
  code: 'en' | 'ko' | 'ja' | 'zh';
  label: string;
};

const LANGUAGES: LanguageItem[] = [
  { code: 'en', label: 'EN' },
  { code: 'ko', label: 'KO' },
  { code: 'ja', label: 'JA' },
  { code: 'zh', label: 'ZH' },
];

export const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const current = (i18n.resolvedLanguage || i18n.language).split('-')[0];
  const current = i18n.language.split('-')[0];
  const onChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    void i18n.changeLanguage(event.target.value);
  };

  return (
    <label className="inline-flex items-center gap-2 text-xs text-white/70">
      <span className="uppercase tracking-wider">Lang</span>
      <select
        aria-label="Language selector"
        value={LANGUAGES.some((l) => l.code === current) ? current : 'en'}
        onChange={onChange}
        className="rounded-md border border-white/20 bg-black/30 px-2 py-1 text-white"
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.label}
          </option>
        ))}
      </select>
    </label>
  );
};
