// src/app/components/ConnectionsTable.tsx
'use client';
import React, { useMemo, useState } from 'react';
import type { LinkedInRawRecord } from '../types/linkedin';

type SortKey = 'name' | 'company' | 'title' | 'connectedOn';
type SortDir = 'asc' | 'desc';

function sortRows(rows: LinkedInRawRecord[], key: SortKey, dir: SortDir) {
  const mult = dir === 'asc' ? 1 : -1;
  const val = (r: LinkedInRawRecord) => {
    switch (key) {
      case 'name':
        return `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim().toLowerCase();
      case 'company':
        return (r.company ?? '').toLowerCase();
      case 'title':
        return (r.title ?? '').toLowerCase();
      case 'connectedOn': {
        const s = r.connectedOn ?? '';
        // if format is yyyy-mm-dd then string-compare is correct; otherwise parse
        return /^\d{4}-\d{2}-\d{2}/.test(s) ? s : String(Date.parse(s) || '');
      }
    }
  };
  return [...rows].sort((a, b) =>
    val(a) > val(b) ? mult : val(a) < val(b) ? -mult : 0
  );
}

function Th({
  label,
  onClick,
  icon,
}: {
  label: string;
  onClick: () => void;
  icon: string;
}) {
  return (
    <th
      className='px-2 py-2 text-left font-semibold cursor-pointer select-none'
      onClick={onClick}
      title={`Sort by ${label}`}
    >
      {label} <span className='opacity-60'>{icon}</span>
    </th>
  );
}

export default function ConnectionsTable({
  rows,
  className = '',
  pageSize = 120,
}: {
  rows: LinkedInRawRecord[];
  className?: string;
  pageSize?: number;
}) {
  const [sortKey, setSortKey] = useState<SortKey>('connectedOn');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const data = useMemo(
    () => sortRows(rows, sortKey, sortDir).slice(0, pageSize),
    [rows, sortKey, sortDir, pageSize]
  );

  function toggleSort(k: SortKey) {
    setSortKey(k);
    setSortDir((d) => (k === sortKey ? (d === 'asc' ? 'desc' : 'asc') : 'asc'));
  }

  const sortIcon = (k: SortKey) =>
    sortKey !== k ? '↕' : sortDir === 'asc' ? '↑' : '↓';

  return (
    <div className={`bg-white border rounded p-0 overflow-auto ${className}`}>
      <table className='w-full text-sm table-fixed border-collapse'>
        <colgroup>
          <col style={{ width: '28%' }} />
          <col style={{ width: '26%' }} />
          <col style={{ width: '32%' }} />
          <col style={{ width: '14%' }} />
        </colgroup>
        <thead className='bg-gray-50 sticky top-0 z-[1] border-b'>
          <tr>
            <Th
              onClick={() => toggleSort('name')}
              label='Name'
              icon={sortIcon('name')}
            />
            <Th
              onClick={() => toggleSort('company')}
              label='Company'
              icon={sortIcon('company')}
            />
            <Th
              onClick={() => toggleSort('title')}
              label='Title'
              icon={sortIcon('title')}
            />
            <Th
              onClick={() => toggleSort('connectedOn')}
              label='ConnectedOn'
              icon={sortIcon('connectedOn')}
            />
          </tr>
        </thead>
        <tbody>
          {data.map((r, i) => {
            const name =
              `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim() ||
              `Person ${i + 1}`;
            return (
              <tr
                key={`${name}-${i}`}
                className='border-b last:border-0 align-top'
              >
                <td className='px-2 py-1 truncate'>
                  {r.url ? (
                    <a
                      href={r.url}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='text-blue-600 hover:underline'
                      title={name}
                    >
                      {name}
                    </a>
                  ) : (
                    <span title={name}>{name}</span>
                  )}
                </td>
                <td className='px-2 py-1 truncate' title={r.company ?? ''}>
                  {r.company}
                </td>
                <td className='px-2 py-1 truncate' title={r.title ?? ''}>
                  {r.title}
                </td>
                <td className='px-2 py-1 whitespace-nowrap'>
                  {r.connectedOn ?? '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length > pageSize && (
        <div className='px-3 py-2 text-xs text-gray-500'>
          Showing {pageSize} of {rows.length}
        </div>
      )}
    </div>
  );
}
