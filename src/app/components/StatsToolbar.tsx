// src/app/components/StatsToolbar.tsx
'use client';
import React from 'react';

type Props = {
  /** free-text search over company/title/name */
  filterText: string;
  onFilterTextChange: (t: string) => void;

  /** date range (YYYY-MM-DD) */
  fromDate?: string;
  onFromDateChange: (d: string) => void;

  toDate?: string;
  onToDateChange: (d: string) => void;

  className?: string;
};

export default function StatsToolbar({
  filterText,
  onFilterTextChange,
  fromDate,
  onFromDateChange,
  toDate,
  onToDateChange,
  className = '',
}: Props) {
  return (
    <div
      className={`w-full max-w-4xl flex flex-wrap items-end gap-4 bg-white/70 backdrop-blur rounded-xl border p-4 ${className}`}
      role="region"
      aria-label="Stats filters"
    >
      {/* Search */}
      <div className="flex-1 min-w-[220px]">
        <label htmlFor="stb-search" className="block text-sm font-medium text-gray-700 mb-1">
          Search (company, title, or name)
        </label>
        <input
          id="stb-search"
          type="text"
          value={filterText}
          onChange={(e) => onFilterTextChange(e.target.value)}
          placeholder="e.g. google, engineer…"
          className="w-full border rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* From */}
      <div className="min-w-[160px]">
        <label htmlFor="stb-from" className="block text-sm font-medium text-gray-700 mb-1">
          From
        </label>
        <input
          id="stb-from"
          type="date"
          value={fromDate ?? ''}
          onChange={(e) => onFromDateChange(e.target.value)}
          className="w-full border rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* To */}
      <div className="min-w-[160px]">
        <label htmlFor="stb-to" className="block text-sm font-medium text-gray-700 mb-1">
          To
        </label>
        <input
          id="stb-to"
          type="date"
          value={toDate ?? ''}
          onChange={(e) => onToDateChange(e.target.value)}
          className="w-full border rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}
