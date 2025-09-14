// src/app/components/Toolbar.tsx
'use client';

import React from 'react';

export type Mode = 'company' | 'title';

type Props = {
  className?: string;

  filterText: string;
  onFilterTextChange: (v: string) => void;

  fromDate?: string;
  onFromDateChange: (v?: string) => void;

  toDate?: string;
  onToDateChange: (v?: string) => void;

  minSize: number;
  onMinSizeChange: (v: number) => void;

  mode: Mode;
  onModeChange: (m: Mode) => void;
};

export default function Toolbar({
  className,
  filterText,
  onFilterTextChange,
  fromDate,
  onFromDateChange,
  toDate,
  onToDateChange,
  minSize,
  onMinSizeChange,
  mode,
  onModeChange,
}: Props) {
  return (
    <div
      className={
        'w-full rounded-md px-3 py-2 border backdrop-blur ' +
        'bg-black/30 border-white/10 text-white ' +
        (className ?? '')
      }
    >
      <div className="grid gap-2 items-center md:grid-cols-[1fr_auto_auto_auto_auto]">
        {/* Search */}
        <div className="w-full">
          <label className="block text-[11px] font-medium text-white/60 mb-1">
            Search (company, title, or name)
          </label>
          <input
            type="text"
            value={filterText}
            onChange={(e) => onFilterTextChange(e.target.value)}
            placeholder="e.g. Google, engineer..."
            className="w-full h-9 px-3 rounded-md bg-black/40 text-white
                       border border-white/15 placeholder-white/50
                       focus:outline-none focus:ring-1 focus:ring-sky-400"
          />
        </div>

        {/* From */}
        <div className="min-w-[160px]">
          <label className="block text-[11px] font-medium text-white/60 mb-1">From</label>
          <input
            type="date"
            value={fromDate ?? ''}
            onChange={(e) => onFromDateChange(e.target.value || undefined)}
            className="w-full h-9 px-2 rounded-md bg-black/40 text-white
                       border border-white/15 focus:outline-none
                       focus:ring-1 focus:ring-sky-400"
          />
        </div>

        {/* To */}
        <div className="min-w-[160px]">
          <label className="block text-[11px] font-medium text-white/60 mb-1">To</label>
          <input
            type="date"
            value={toDate ?? ''}
            onChange={(e) => onToDateChange(e.target.value || undefined)}
            className="w-full h-9 px-2 rounded-md bg-black/40 text-white
                       border border-white/15 focus:outline-none
                       focus:ring-1 focus:ring-sky-400"
          />
        </div>

        {/* Min group size */}
        <div className="min-w-[120px]">
          <label className="block text-[11px] font-medium text-white/60 mb-1">Min group size</label>
          <input
            type="number"
            value={minSize}
            onChange={(e) => onMinSizeChange(Number(e.target.value || 0))}
            className="w-full h-9 px-2 rounded-md bg-black/40 text-white
                       border border-white/15 focus:outline-none
                       focus:ring-1 focus:ring-sky-400"
          />
        </div>

        {/* Group by (mode) */}
        <div className="min-w-[180px]">
          <label className="block text-[11px] font-medium text-white/60 mb-1">Group by</label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={
                'px-3 h-9 rounded-md text-sm font-medium border ' +
                (mode === 'company'
                  ? 'bg-sky-600 text-white border-sky-500'
                  : 'bg-black/40 text-white/75 hover:text-white border-white/15')
              }
              onClick={() => onModeChange('company')}
            >
              Company
            </button>
            <button
              type="button"
              className={
                'px-3 h-9 rounded-md text-sm font-medium border ' +
                (mode === 'title'
                  ? 'bg-sky-600 text-white border-sky-500'
                  : 'bg-black/40 text-white/75 hover:text-white border-white/15')
              }
              onClick={() => onModeChange('title')}
            >
              Title
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
