// src/app/components/Toolbar.tsx
import React from 'react';

export type Mode = 'company' | 'title';

type ToolbarProps = {
  filterText: string;
  onFilterTextChange: (t: string) => void;

  fromDate?: string;
  onFromDateChange: (d: string) => void;

  toDate?: string;
  onToDateChange: (d: string) => void;

  minSize: number;
  onMinSizeChange: (n: number) => void;

  mode: Mode;
  onModeChange: (m: Mode) => void;

  className?: string;
};

export default function Toolbar({
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
  className = '',
}: ToolbarProps) {
  return (
    <div
      className={`w-full flex flex-wrap items-end gap-4 bg-white/70 backdrop-blur rounded-xl border p-4 ${className}`}
      role="region"
      aria-label="Filters toolbar"
    >
      {/* 🔎 Search */}
      <div className="flex-1 min-w-[220px]">
        <label htmlFor="tb-search" className="block text-sm font-medium text-gray-700 mb-1">
          Search (company, title, or name)
        </label>
        <input
          id="tb-search"
          type="text"
          value={filterText}
          onChange={(e) => onFilterTextChange(e.target.value)}
          placeholder="e.g. Google, engineer…"
          className="w-full border rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* 📅 Date range: From */}
      <div className="min-w-[160px]">
        <label htmlFor="tb-from" className="block text-sm font-medium text-gray-700 mb-1">
          From
        </label>
        <input
          id="tb-from"
          type="date"
          value={fromDate ?? ''}
          onChange={(e) => onFromDateChange(e.target.value)}
          className="w-full border rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* 📅 Date range: To */}
      <div className="min-w-[160px]">
        <label htmlFor="tb-to" className="block text-sm font-medium text-gray-700 mb-1">
          To
        </label>
        <input
          id="tb-to"
          type="date"
          value={toDate ?? ''}
          onChange={(e) => onToDateChange(e.target.value)}
          className="w-full border rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* 📉 Minimum group size */}
      <div className="min-w-[140px]">
        <label htmlFor="tb-minsize" className="block text-sm font-medium text-gray-700 mb-1">
          Min group size
        </label>
        <input
          id="tb-minsize"
          type="number"
          min={1}
          value={Number.isFinite(minSize) ? minSize : 1}
          onChange={(e) => onMinSizeChange(Math.max(1, Number(e.target.value || 1)))}
          className="w-full border rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* 🔀 Mode toggle */}
      <div className="min-w-[220px]">
        <span className="block text-sm font-medium text-gray-700 mb-1">Group by</span>
        <div className="inline-flex rounded-md overflow-hidden border">
          <button
            type="button"
            aria-pressed={mode === 'company'}
            onClick={() => onModeChange('company')}
            className={`px-3 py-2 text-sm ${mode === 'company' ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-50'}`}
          >
            Company
          </button>
          <button
            type="button"
            aria-pressed={mode === 'title'}
            onClick={() => onModeChange('title')}
            className={`px-3 py-2 text-sm border-l ${mode === 'title' ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-50'}`}
          >
            Title
          </button>
        </div>
      </div>
    </div>
  );
}
