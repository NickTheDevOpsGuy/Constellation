// src/app/components/Legend.tsx
'use client';

import React from 'react';
import { schemeTableau10 } from 'd3-scale-chromatic';

export type LegendItem = { type: string; count: number };

type Props = {
  items: LegendItem[];
  active: Set<string>;
  onToggle: (t: string) => void;
  className?: string;

  communityCounts?: Array<{ communityId: number; count: number }>;
  communityTitle?: string;
};

const EDGE_COLOR: Record<string, string> = {
  connection: '#8b8b8b',
  invited: '#d62728',
  authored: '#1f77b4',
  commented: '#2ca02c',
  liked: '#ff7f0e',
  reacted: '#9467bd',
  messaged: '#17becf',
  co_company: '#ff1493',
  co_title: '#00ced1',
};

const EDGE_LABEL: Record<string, string> = {
  connection: 'Direct Connection',
  invited: 'Invitation Sent',
  authored: 'Authored Post',
  commented: 'Commented',
  liked: 'Liked',
  reacted: 'Reacted',
  messaged: 'Messaged',
  co_company: 'Same Company',
  co_title: 'Same Title',
};

const COMMUNITY_PALETTE = schemeTableau10 as string[];
const colorForCommunityId = (id: number) =>
  COMMUNITY_PALETTE[id % COMMUNITY_PALETTE.length] ?? '#999';

function Swatch({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className='inline-block align-middle rounded-sm'
      style={{
        width: 10,
        height: 10,
        backgroundColor: color,
        boxShadow: '0 0 0 1px rgba(0,0,0,0.25) inset',
        marginRight: 6,
      }}
    />
  );
}

export default function Legend({
  items,
  active,
  onToggle,
  className,
  communityCounts,
  communityTitle = 'Communities (node colors)',
}: Props) {
  const showCommunities =
    Array.isArray(communityCounts) && communityCounts.length > 0;

  return (
    <div className={`grid gap-2 ${className ?? ''}`}>
      <div className='text-xs font-semibold text-gray-800 dark:text-gray-100'>
        {showCommunities
          ? 'Legend — Edges (toggle) • Nodes = Communities'
          : 'Legend — Edge types (toggle to hide/show)'}
      </div>

      {/* Edge types */}
      <div>
        <div className='flex flex-wrap gap-1'>
          {items.map(({ type, count }) => {
            const key = String(type);
            const on = active.has(key);
            const label = EDGE_LABEL[key] ?? key;
            const color = EDGE_COLOR[key] ?? '#888';
            return (
              <button
                key={key}
                type='button'
                onClick={() => onToggle(key)}
                className={
                  'px-2 py-1 rounded-md text-xs border transition ' +
                  (on
                    ? 'bg-white/90 dark:bg-gray-900/90 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 border-gray-300/70 dark:border-gray-700')
                }
                title={on ? `Click to hide ${label}` : `Click to show ${label}`}
              >
                <Swatch color={color} />
                <span className='align-middle'>{label}</span>
                <span className='align-middle opacity-70 ml-1'>({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Node colors (community legend) */}
      {showCommunities && (
        <div className='mt-1'>
          <div className='text-xs font-medium text-gray-700 dark:text-gray-200 mb-1'>
            {communityTitle}
          </div>
          <div className='flex flex-wrap gap-1'>
            {communityCounts!.slice(0, 10).map((c) => (
              <div
                key={c.communityId}
                className='px-2 py-1 rounded-md text-xs border bg-white/90 dark:bg-gray-900/90
                           text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 shadow-sm'
              >
                <Swatch color={colorForCommunityId(c.communityId)} />
                <span className='align-middle'>#{c.communityId}</span>
                <span className='align-middle opacity-70 ml-1'>
                  ({c.count})
                </span>
              </div>
            ))}
          </div>
          <div className='text-[11px] text-gray-500 dark:text-gray-400 mt-1'>
            Each color = one Louvain cluster. Sizes shown in parentheses.
          </div>
        </div>
      )}
    </div>
  );
}
