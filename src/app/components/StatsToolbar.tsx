// src/app/components/StatsToolbar.tsx
'use client';

import React from 'react';

type Props = {
  filterText: string;
  onFilterTextChange: (t: string) => void;
  fromDate?: string;
  onFromDateChange: (t?: string) => void;
  toDate?: string;
  onToDateChange: (t?: string) => void;
};

export default function StatsToolbar({
  filterText,
  onFilterTextChange,
  fromDate,
  onFromDateChange,
  toDate,
  onToDateChange,
}: Props) {
  return (
    <div className='flex flex-col sm:flex-row sm:items-center gap-3 w-full'>
      {/* Search input takes up all remaining width */}
      <div className='flex-1'>
        <label className='sr-only' htmlFor='stats-search'>
          Search (company, title, or name)
        </label>
        <input
          id='stats-search'
          type='text'
          placeholder='e.g. google, engineer...'
          value={filterText}
          onChange={(e) => onFilterTextChange(e.target.value)}
          className='w-full rounded-md border border-white/10 bg-slate-800/50 text-slate-100 placeholder-slate-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-600'
        />
      </div>

      {/* Date range inputs */}
      <div className='flex items-center gap-2'>
        <div>
          <label className='sr-only' htmlFor='from-date'>
            From
          </label>
          <input
            id='from-date'
            type='date'
            value={fromDate ?? ''}
            onChange={(e) => onFromDateChange(e.target.value || undefined)}
            className='rounded-md border border-white/10 bg-slate-800/50 text-slate-100 placeholder-slate-400 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-600'
          />
        </div>
        <div>
          <label className='sr-only' htmlFor='to-date'>
            To
          </label>
          <input
            id='to-date'
            type='date'
            value={toDate ?? ''}
            onChange={(e) => onToDateChange(e.target.value || undefined)}
            className='rounded-md border border-white/10 bg-slate-800/50 text-slate-100 placeholder-slate-400 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-600'
          />
        </div>
      </div>
    </div>
  );
}
