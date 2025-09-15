// src/app/pages/StatsPage.tsx
'use client';

import React, { useMemo, useState } from 'react';
import StatsToolbar from '../components/StatsToolbar';
import { useLinkMap } from '../hooks/useLinkMap';
import type { LinkedInRawRecord } from '../types/linkedin';

/* ---------------- helpers ---------------- */

type Stats = {
  total: number;
  uniqueCompanies: number;
  uniqueTitles: number;
  firstDate?: string;
  lastDate?: string;
};

type CountItem = { label: string; count: number };
type KwSort = 'count' | 'alpha';

function fmtISO(d: Date) {
  return d.toISOString().slice(0, 10);
}
function ymKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function topCounts(
  rows: LinkedInRawRecord[],
  field: 'company' | 'title',
  topN = 10
): CountItem[] {
  const m = new Map<string, number>();
  for (const r of rows) {
    const v = (r[field] ?? '').trim();
    if (!v) continue;
    m.set(v, (m.get(v) ?? 0) + 1);
  }
  return [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([label, count]) => ({ label, count }));
}
function monthSeries(rows: LinkedInRawRecord[], monthsBack = 24) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1);
  const buckets = new Map<string, number>();
  const cursor = new Date(start);
  for (let i = 0; i < monthsBack; i++) {
    buckets.set(ymKey(cursor), 0);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  for (const r of rows) {
    if (!r.connectedOn) continue;
    const t = Date.parse(r.connectedOn);
    if (Number.isNaN(t)) continue;
    const d = new Date(t);
    const k = ymKey(d);
    if (!buckets.has(k)) continue;
    buckets.set(k, (buckets.get(k) ?? 0) + 1);
  }
  return [...buckets.entries()].map(([ym, count]) => ({ ym, count }));
}
function keywordBuckets(rows: LinkedInRawRecord[]) {
  const keys = ['engineer', 'manager', 'director', 'founder', 'product', 'data', 'sales', 'marketing'];
  const counts: Record<string, number> = Object.fromEntries(keys.map((k) => [k, 0]));
  for (const r of rows) {
    const t = (r.title ?? '').toLowerCase();
    for (const k of keys) if (t.includes(k)) counts[k] += 1;
  }
  return counts;
}

/* tiny SVG bar chart — dark-friendly */
function MonthBars({ series }: { ym: string; count: number }[]) {
  const W = 560;
  const H = 100;
  const pad = 8;
  const barGap = 2;
  const max = Math.max(1, ...series.map((s) => s.count));
  const n = series.length;
  const barW = Math.max(1, Math.floor((W - pad * 2 - barGap * (n - 1)) / n));

  return (
    <svg width={W} height={H} className="block">
      {series.map((s, i) => {
        const h = Math.round((s.count / max) * (H - pad * 2) || 0);
        const x = pad + i * (barW + barGap);
        const y = H - pad - h;
        return (
          <g key={s.ym}>
            <rect x={x} y={y} width={barW} height={h} fill="#60a5fa" />
            {i % 6 === 0 && (
              <text x={x} y={H - 2} fontSize="9" fill="#a3aed0">
                {s.ym}
              </text>
            )}
          </g>
        );
      })}
      <text x={W - pad} y={12} textAnchor="end" fontSize="10" fill="#94a3b8">
        max {max}
      </text>
    </svg>
  );
}

/* ---------------- page ---------------- */

export default function StatsPage() {
  const { raw } = useLinkMap();

  // Toolbar state (search + dates only)
  const [filterText, setFilterText] = useState('');
  const [fromDate, setFromDate] = useState<string | undefined>();
  const [toDate, setToDate] = useState<string | undefined>();

  // Keyword sorting + focus
  const [kwSort, setKwSort] = useState<KwSort>('count');
  const [focusKw, setFocusKw] = useState<string | null>(null);

  // Filter rows (search + date)
  const q = filterText.toLowerCase();
  const filtered = useMemo(() => {
    return raw.filter((r: LinkedInRawRecord) => {
      const matchesText =
        !q ||
        (r.company ?? '').toLowerCase().includes(q) ||
        (r.title ?? '').toLowerCase().includes(q) ||
        `${r.firstName} ${r.lastName}`.toLowerCase().includes(q);

      const d = r.connectedOn ? new Date(r.connectedOn) : null;
      const inRange =
        (!fromDate || (d && d >= new Date(fromDate))) &&
        (!toDate || (d && d <= new Date(toDate)));

      return matchesText && inRange;
    });
  }, [raw, q, fromDate, toDate]);

  // KPIs
  const stats: Stats = useMemo(() => {
    const total = filtered.length;
    const co = new Set<string>();
    const ti = new Set<string>();
    let minT = Number.POSITIVE_INFINITY;
    let maxT = Number.NEGATIVE_INFINITY;

    for (const r of filtered) {
      if (r.company) co.add(r.company);
      if (r.title) ti.add(r.title);
      if (r.connectedOn) {
        const t = Date.parse(r.connectedOn);
        if (!Number.isNaN(t)) {
          if (t < minT) minT = t;
          if (t > maxT) maxT = t;
        }
      }
    }

    return {
      total,
      uniqueCompanies: co.size,
      uniqueTitles: ti.size,
      firstDate: Number.isFinite(minT) ? fmtISO(new Date(minT)) : undefined,
      lastDate: Number.isFinite(maxT) ? fmtISO(new Date(maxT)) : undefined,
    };
  }, [filtered]);

  // Derived sections
  const topCompanies = useMemo(() => topCounts(filtered, 'company', 10), [filtered]);
  const topTitles = useMemo(() => topCounts(filtered, 'title', 10), [filtered]);
  const months = useMemo(() => monthSeries(filtered, 24), [filtered]);
  const kw = useMemo(() => keywordBuckets(filtered), [filtered]);

  // Sortable keyword chips
  const kwEntries = useMemo(
    () =>
      Object.entries(kw).sort((a, b) =>
        kwSort === 'count' ? b[1] - a[1] : a[0].localeCompare(b[0])
      ),
    [kw, kwSort]
  );

  // Recent connections
  const recent = useMemo(() => {
    const withDate = filtered
      .filter((r) => r.connectedOn && !Number.isNaN(Date.parse(r.connectedOn)))
      .map((r) => ({ r, t: Date.parse(r.connectedOn!) }));
    withDate.sort((a, b) => {
      if (focusKw) {
        const ak = (a.r.title ?? '').toLowerCase().includes(focusKw) ? 1 : 0;
        const bk = (b.r.title ?? '').toLowerCase().includes(focusKw) ? 1 : 0;
        if (ak !== bk) return bk - ak;
      }
      return b.t - a.t;
    });
    return withDate.slice(0, 12).map((x) => x.r);
  }, [filtered, focusKw]);

  if (raw.length === 0) {
    return <p className="text-slate-400">No data yet. Go to Import and upload a CSV.</p>;
  }

  return (
    <div className="max-w-6xl mx-auto pt-8 sm:pt-10"> {/* push page down under sticky header */}
      <h2 className="text-xl font-semibold mb-4 text-slate-100">Stats</h2>

      <div className="rounded-xl border border-white/10 bg-slate-950/50 backdrop-blur p-4">
        <StatsToolbar
          filterText={filterText}
          onFilterTextChange={setFilterText}
          fromDate={fromDate}
          onFromDateChange={setFromDate}
          toDate={toDate}
          onToDateChange={setToDate}
        />
      </div>

      {/* KPI cards */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Stat label="Total Connections" value={stats.total} />
        <Stat label="Unique Companies" value={stats.uniqueCompanies} />
        <Stat label="Unique Titles" value={stats.uniqueTitles} />
        {stats.firstDate && <Stat label="Earliest Connection" value={stats.firstDate} />}
        {stats.lastDate && <Stat label="Latest Connection" value={stats.lastDate} />}
      </div>

      {/* Connections by Month */}
      <section className="mt-8 rounded-xl border border-white/10 bg-slate-950/50 backdrop-blur p-4">
        <h3 className="font-semibold mb-3 text-slate-100">Connections by Month (last 24 months)</h3>
        <MonthBars series={months} />
      </section>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Companies */}
        <section className="rounded-xl border border-white/10 bg-slate-950/50 backdrop-blur p-4">
          <h3 className="font-semibold mb-3 text-slate-100">Top Companies</h3>
          <TopList items={topCompanies} empty="No company data" />
        </section>

        {/* Top Titles */}
        <section className="rounded-xl border border-white/10 bg-slate-950/50 backdrop-blur p-4">
          <h3 className="font-semibold mb-3 text-slate-100">Top Titles</h3>
          <TopList items={topTitles} empty="No title data" />
        </section>
      </div>

      {/* Title keywords with sorting + focus */}
      <section className="mt-8 rounded-xl border border-white/10 bg-slate-950/50 backdrop-blur p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-100">Title Keywords</h3>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Sort by:</span>
            <button
              type="button"
              onClick={() => setKwSort('count')}
              aria-pressed={kwSort === 'count'}
              className={`px-2 py-1 rounded border transition ${
                kwSort === 'count'
                  ? 'bg-cyan-700 text-white border-cyan-600'
                  : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
              }`}
              title="Sort by count (desc)"
            >
              Count
            </button>
            <button
              type="button"
              onClick={() => setKwSort('alpha')}
              aria-pressed={kwSort === 'alpha'}
              className={`px-2 py-1 rounded border transition ${
                kwSort === 'alpha'
                  ? 'bg-cyan-700 text-white border-cyan-600'
                  : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
              }`}
              title="Sort alphabetically (A–Z)"
            >
              A–Z
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {kwEntries.map(([k, v]) => {
            const on = focusKw === k;
            return (
              <button
                key={k}
                onClick={() => setFocusKw(on ? null : k)}
                className={`text-xs border rounded-full px-3 py-1 transition ${
                  on
                    ? 'bg-cyan-700 text-white border-cyan-600'
                    : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                }`}
                title={`Show ${k} titles first in Recent`}
                aria-pressed={on}
              >
                {k}{' '}
                <span className={on ? 'opacity-90' : 'text-slate-400'}>
                  ({v})
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Recent connections */}
      <section className="mt-8 rounded-xl border border-white/10 bg-slate-950/50 backdrop-blur p-4 mb-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-100">Recent Connections</h3>
          {focusKw && (
            <div className="text-xs text-slate-400">
              Showing <strong className="text-slate-200">{focusKw}</strong> titles first
              <button
                className="ml-2 underline text-cyan-400 hover:text-cyan-300"
                onClick={() => setFocusKw(null)}
                title="Clear keyword focus"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        <ul className="divide-y divide-white/10">
          {recent.map((r, i) => {
            const name = `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim() || `Person ${i + 1}`;
            return (
              <li key={`${name}-${i}`} className="py-2 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate text-slate-100">
                    {r.url ? (
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:underline"
                      >
                        {name}
                      </a>
                    ) : (
                      name
                    )}
                  </div>
                  <div className="text-xs text-slate-400 truncate">
                    {[r.company, r.title].filter(Boolean).join(' — ') || '—'}
                  </div>
                </div>
                <div className="text-xs text-slate-400 whitespace-nowrap">
                  {r.connectedOn ?? '—'}
                </div>
              </li>
            );
          })}
          {recent.length === 0 && (
            <li className="py-2 text-sm text-slate-400">No recent data</li>
          )}
        </ul>
      </section>
    </div>
  );
}

/* ---------------- tiny components ---------------- */

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start rounded-xl border border-white/10 bg-slate-950/50 backdrop-blur p-4 shadow-sm">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="text-xl font-semibold text-slate-100">{value ?? '—'}</div>
    </div>
  );
}

function TopList({ items, empty }: { items: CountItem[]; empty: string }) {
  if (items.length === 0) return <div className="text-sm text-slate-400">{empty}</div>;
  return (
    <ol className="text-sm space-y-1">
      {items.map((it) => (
        <li key={it.label} className="flex items-center justify-between gap-3">
          <span className="truncate text-slate-100">{it.label}</span>
          <span className="text-slate-400">{it.count}</span>
        </li>
      ))}
    </ol>
  );
}
