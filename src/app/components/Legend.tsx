// src/app/components/Legend.tsx
'use client';
import React from 'react';
import type { EdgeType } from '../types/linkedin';

const COLORS: Record<EdgeType, string> = {
  connection: '#8b8b8b',
  authored: '#1f77b4',
  commented: '#2ca02c',
  liked: '#ff7f0e',
  reacted: '#9467bd',
  invited: '#d62728',
  messaged: '#17becf',
  co_company: '#ff1493', // Same Company
  co_title: '#00ced1', // Same Title
};

function labelFor(t: EdgeType) {
  switch (t) {
    case 'connection':
      return 'Connection';
    case 'authored':
      return 'Authored (person → post)';
    case 'commented':
      return 'Commented (person → post)';
    case 'liked':
      return 'Liked (person → post)';
    case 'reacted':
      return 'Reacted (person → post)';
    case 'invited':
      return 'Invited (person → person)';
    case 'messaged':
      return 'Messaged (person → person)';
    case 'co_company':
      return 'Same Company (inferred)';
    case 'co_title':
      return 'Same Title (inferred)';
    default:
      return t;
  }
}

type LegendItem = { type: EdgeType; count: number };

type Props = {
  items: LegendItem[]; // types present in the current view (+ counts)
  active: Set<EdgeType>; // which types are visible
  onToggle: (t: EdgeType) => void;
  className?: string;
  showCounts?: boolean;
  showHeader?: boolean;
};

export default function Legend({
  items,
  active,
  onToggle,
  className = '',
  showCounts = true,
  showHeader = true,
}: Props) {
  const visible = (items ?? []).filter((i) => i && i.type && i.count > 0);

  if (visible.length === 0) {
    return (
      <div className={`text-xs text-gray-500 ${className}`}>
        No edges in view. Try lowering “Min size” or enabling inferred edges.
      </div>
    );
  }

  return (
    <div className={className}>
      {showHeader && (
        <div className="mb-2 flex items-center gap-2">
          <strong className="text-sm">Legend</strong>
          <span className="text-xs text-gray-500">Click to show/hide edge types</span>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {visible.map(({ type, count }) => {
          const on = active.has(type);
          const color = COLORS[type] ?? '#8b8b8b';
          return (
            <button
              key={type}
              onClick={() => onToggle(type)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition
                ${on ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}
                dark:${on ? 'bg-gray-100 text-gray-900 border-gray-100' : 'bg-gray-800 text-gray-100 border-gray-700 hover:bg-gray-700'}`}
              aria-pressed={on}
              title={`${labelFor(type)}${showCounts ? ` (${count})` : ''}`}
            >
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: color }}
              />
              {labelFor(type)}
              {showCounts && <span className="opacity-70">({count})</span>}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-gray-500">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full align-middle mr-1"
          style={{ background: '#ff1493' }}
        />{' '}
        Same Company
        <span className="mx-2">•</span>
        <span
          className="inline-block h-2.5 w-2.5 rounded-full align-middle mr-1"
          style={{ background: '#00ced1' }}
        />{' '}
        Same Title
        <span className="mx-2">•</span>
        Gray = direct connections; colors like blue/green/orange = post interactions.
      </p>
    </div>
  );
}
