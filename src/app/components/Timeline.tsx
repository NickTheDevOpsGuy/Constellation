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

export type TimelineChange = (window: { from: string | undefined; to: string | undefined }) => void;

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
    const startDate = addMonths(new Date(ey, em - 1, 1), -initialWindowMonths + 1);
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
    const startDate = addMonths(new Date(ey, em - 1, 1), -initialWindowMonths + 1);
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
    return <div className="text-sm text-white/60">No dates available for timeline</div>;
  }

  return (
    <div className="flex items-center gap-3 text-white">
      <button
        type="button"
        onClick={() => setPlaying((p) => !p)}
        className="rounded-md border border-white/15 bg-black/40 px-2 py-1
                   text-xs text-white/85 hover:text-white hover:border-white/25
                   focus:outline-none focus:ring-2 focus:ring-sky-400/50"
        aria-pressed={playing}
        title={playing ? 'Pause' : 'Play'}
      >
        {playing ? 'Pause' : 'Play'}
      </button>

      <input
        type="range"
        min={0}
        max={months.length - 1}
        value={i}
        onChange={(e) => setI(Number(e.target.value))}
        className="w-64 timeline-range"
      />

      <div className="text-xs tabular-nums text-white/80">{months[i]}</div>

      {/* dark-mode slider styling (plain <style>, not styled-jsx) */}
      <style>{`
        .timeline-range {
          appearance: none;
          height: 6px;
          background: linear-gradient(to right, rgba(56, 189, 248, 0.8), rgba(99, 102, 241, 0.8));
          border-radius: 9999px;
          outline: none;
          border: 1px solid rgba(255, 255, 255, 0.15);
        }
        .timeline-range:focus {
          box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.25);
        }

        /* WebKit */
        .timeline-range::-webkit-slider-thumb {
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 9999px;
          background: white;
          border: 2px solid rgba(56, 189, 248, 0.95); /* sky-400 */
          box-shadow: 0 0 12px rgba(56, 189, 248, 0.7);
          margin-top: -5px; /* centers thumb on 6px track */
        }

        /* Firefox */
        .timeline-range::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 9999px;
          background: white;
          border: 2px solid rgba(56, 189, 248, 0.95);
          box-shadow: 0 0 12px rgba(56, 189, 248, 0.7);
        }
        .timeline-range::-moz-range-track {
          height: 6px;
          background: linear-gradient(to right, rgba(56, 189, 248, 0.8), rgba(99, 102, 241, 0.8));
          border-radius: 9999px;
          border: 1px solid rgba(255, 255, 255, 0.15);
        }
      `}</style>
    </div>
  );
}
