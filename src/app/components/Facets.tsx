// src/app/components/Facets.tsx
'use client';
import React from 'react';

export type FacetItem = {
  value: string;
  count: number;
  checked: boolean;
};

type Props = {
  companies: FacetItem[];
  titles: FacetItem[];
  onToggleCompany: (v: string) => void;
  onToggleTitle: (v: string) => void;
  onClearAll: () => void;
};

export default function Facets({
  companies,
  titles,
  onToggleCompany,
  onToggleTitle,
  onClearAll,
}: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="font-semibold mb-2">Companies</h4>
        <ul className="space-y-1 max-h-60 overflow-y-auto">
          {companies.map((f) => (
            <li key={f.value} className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`co-${f.value}`}
                checked={f.checked}
                onChange={() => onToggleCompany(f.value)}
                className="w-4 h-4"
              />
              <label htmlFor={`co-${f.value}`} className="text-sm flex-1 truncate">
                {f.value || <em>(none)</em>} <span className="text-gray-500">({f.count})</span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h4 className="font-semibold mb-2">Titles</h4>
        <ul className="space-y-1 max-h-60 overflow-y-auto">
          {titles.map((f) => (
            <li key={f.value} className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`ti-${f.value}`}
                checked={f.checked}
                onChange={() => onToggleTitle(f.value)}
                className="w-4 h-4"
              />
              <label htmlFor={`ti-${f.value}`} className="text-sm flex-1 truncate">
                {f.value || <em>(none)</em>} <span className="text-gray-500">({f.count})</span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div className="pt-2">
        <button
          type="button"
          onClick={onClearAll}
          className="text-sm text-blue-600 hover:underline"
        >
          Clear all
        </button>
      </div>
    </div>
  );
}
