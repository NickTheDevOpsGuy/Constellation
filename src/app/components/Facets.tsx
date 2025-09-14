'use client';

import React from 'react';

export type FacetItem = {
  value: string;
  count: number;
  checked?: boolean;
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
    <div className='flex flex-col gap-3 text-white'>
      <div className='flex items-center justify-between'>
        <h3 className='text-sm font-semibold text-white/90'>Filters</h3>
        <button
          type='button'
          onClick={onClearAll}
          className='text-xs px-2 py-1 rounded-md border border-white/15 text-white/80 hover:text-white hover:border-white/25'
          title='Clear all filters'
        >
          Clear
        </button>
      </div>

      {/* Companies */}
      <section>
        <div className='text-xs font-medium text-white/80 mb-1'>Companies</div>
        <ul className='max-h-48 overflow-auto pr-1 custom-scroll'>
          {companies.map((f) => (
            <li key={f.value}>
              <label
                className='flex items-center gap-2 px-2 py-1 rounded hover:bg-white/5 cursor-pointer'
                title={f.value || '—'}
              >
                <input
                  type='checkbox'
                  checked={!!f.checked}
                  onChange={() => onToggleCompany(f.value)}
                  className='h-3.5 w-3.5 rounded border-white/30 bg-white/5 text-sky-400 focus:ring-sky-400/40 focus:ring-offset-0'
                />
                <span className='flex-1 truncate text-white/90 text-sm'>
                  {f.value || '—'}
                </span>
                <span className='text-xs text-white/60'>({f.count})</span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      {/* Titles */}
      <section>
        <div className='text-xs font-medium text-white/80 mb-1'>Titles</div>
        <ul className='max-h-48 overflow-auto pr-1 custom-scroll'>
          {titles.map((f) => (
            <li key={f.value}>
              <label
                className='flex items-center gap-2 px-2 py-1 rounded hover:bg-white/5 cursor-pointer'
                title={f.value || '—'}
              >
                <input
                  type='checkbox'
                  checked={!!f.checked}
                  onChange={() => onToggleTitle(f.value)}
                  className='h-3.5 w-3.5 rounded border-white/30 bg-white/5 text-sky-400 focus:ring-sky-400/40 focus:ring-offset-0'
                />
                <span className='flex-1 truncate text-white/90 text-sm'>
                  {f.value || '—'}
                </span>
                <span className='text-xs text-white/60'>({f.count})</span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      {/* NOTE: plain <style>, not styled-jsx */}
      <style>{`
        .custom-scroll::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scroll::-webkit-scrollbar-thumb {
          background-color: rgba(255, 255, 255, 0.2);
          border-radius: 9999px;
        }
        .custom-scroll::-webkit-scrollbar-track {
          background-color: transparent;
        }
      `}</style>
    </div>
  );
}
