"use client";
import React from 'react';

const TYPES: { key: 'chronos' | 'morai' | 'timesfm'; label: string; desc: string }[] = [
{ key: 'chronos', label: 'Chronos', desc: 'Dane o stabilnym trendzie i bez anomalii.' },
{ key: 'morai', label: 'Morai', desc: 'Dane nieregularne lub zawierające nagłe anomalie.' },
{ key: 'timesfm', label: 'TimesFM', desc: 'Dane z wyraźnym trendem lub sezonowością.' },

];

interface Props {
  value: '' | 'chronos' | 'morai' | 'timesfm';
  onChange: (v: 'chronos' | 'morai' | 'timesfm') => void;
  disabled?: boolean;
}

export const ModelTypeSelector: React.FC<Props> = ({ value, onChange }) => {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {TYPES.map(t => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className={`text-left p-4 rounded-lg border transition shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:hover:border-gray-400 ${value === t.key ? 'border-blue-500 ring-1 ring-blue-300 dark:border-blue-400' : 'border-gray-200'}`}
        >
          <div className="font-medium text-gray-900 dark:text-gray-100 mb-1">{t.label}</div>
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-snug">{t.desc}</p>
        </button>
      ))}
    </div>
  );
};
