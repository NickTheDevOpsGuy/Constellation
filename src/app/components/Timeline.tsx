'use client';

import React, { useEffect, useMemo, useState } from 'react';

function pad2(n: number) {
  return n.toString().padStart(2, '0');
}

function ym(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

function addMonths(d: Date, m: number) {
  const x = new Date(d.getTime());
  x.setMonth(x.getMonth() + m);
  return x;
}

export type TimelineChange = (window: {
  from: string | undefined;
  to: string | undefined;
}) => void;

export default function Timeline({
  dates,
  onChange,
  initialWindowMonths = 3,
}: {
  dates: string[];
  onChange: TimelineChange;
  initialWindowMonths?: number;
}) {
  // Derive monthly domain from ISO date strings
  const months = useMemo(() => {
    const set = new Set<string>();
    for (const s of dates) {
      const t = Date.parse(s);
      if (!Number.isNaN(t)) set.add(ym(new Date(t)));
    }
    return [...set].sort(); // ['2023-07','2023-08',...]
  }, [dates]);

  const [i, setI] = useState(() => Math.max(0, months.length - 1)); // end index
  const [playing, setPlaying] = useState(false);

  // Emit initial window
  useEffect(() => {
    if (!months.length) return;
    const end = months[Math.max(0, months.length - 1)];
    const [ey, em] = end.split('-').map(Number);
    const endDate = new Date(ey, em - 1 + 1, 0); // end of month
    const startDate = addMonths(
      new Date(ey, em - 1, 1),
      -initialWindowMonths + 1
    );
    onChange({
      from: startDate.toISOString().slice(0, 10),
      to: endDate.toISOString().slice(0, 10),
    });
    setI(months.length - 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [months.length]);

  // Update window when index changes
  useEffect(() => {
    if (!months.length) return;
    const end = months[i];
    const [ey, em] = end.split('-').map(Number);
    const endDate = new Date(ey, em - 1 + 1, 0);
    const startDate = addMonths(
      new Date(ey, em - 1, 1),
      -initialWindowMonths + 1
    );
    onChange({
      from: startDate.toISOString().slice(0, 10),
      to: endDate.toISOString().slice(0, 10),
    });
  }, [i, months, initialWindowMonths, onChange]);

  // Play/pause playback
  useEffect(() => {
    if (!playing || months.length === 0) return;
    const id = setInterval(() => {
      setI((prev) => (prev < months.length - 1 ? prev + 1 : 0));
    }, 900);
    return () => clearInterval(id);
  }, [playing, months.length]);

  if (months.length === 0) {
    return (
      <div className='text-sm text-gray-500'>
        No dates available for timeline
      </div>
    );
  }

  return (
    <div className='flex items-center gap-2'>
      <button
        type='button'
        onClick={() => setPlaying((p) => !p)}
        className='rounded border px-2 py-1 text-xs'
        aria-pressed={playing}
      >
        {playing ? 'Pause' : 'Play'}
      </button>

      <input
        type='range'
        min={0}
        max={months.length - 1}
        value={i}
        onChange={(e) => setI(Number(e.target.value))}
        className='w-64'
      />

      <div className='text-xs tabular-nums'>{months[i]}</div>
    </div>
  );
}
