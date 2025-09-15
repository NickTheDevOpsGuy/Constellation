// src/app/components/StatsPanel.tsx
'use client';

import { useMemo, type ReactNode } from 'react';
import { useLinkMap } from '../hooks/useLinkMap';
import type { LinkedInRawRecord } from '../types/linkedin';

// Use a local name to avoid conflicts with any other `Summary` in the codebase
type PanelSummary = {
  total: number;
  uniqueCompanies: number;
  uniqueTitles: number;
  firstDate?: string;
  lastDate?: string;
};

function fmtISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

function buildSummary(rows: LinkedInRawRecord[]): PanelSummary {
  const total = rows.length;
  const companies = new Set<string>();
  const titles = new Set<string>();
  let minT = Number.POSITIVE_INFINITY;
  let maxT = Number.NEGATIVE_INFINITY;

  for (const r of rows) {
    if (r.company) companies.add(r.company);
    if (r.title) titles.add(r.title);
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
    uniqueCompanies: companies.size,
    uniqueTitles: titles.size,
    firstDate: Number.isFinite(minT) ? fmtISO(new Date(minT)) : undefined,
    lastDate: Number.isFinite(maxT) ? fmtISO(new Date(maxT)) : undefined,
  };
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col items-start rounded-xl border border-white/10 bg-slate-950/50 backdrop-blur p-4">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="text-xl font-semibold text-slate-100">{value ?? '—'}</div>
    </div>
  );
}

export default function StatsPanel() {
  const { raw } = useLinkMap();
  const stats = useMemo<PanelSummary>(() => buildSummary(raw), [raw]);

  if (raw.length === 0) {
    return (
      <p className="text-slate-400">
        No data yet. Go to <span className="text-slate-200 font-medium">Import</span> and upload a CSV/ZIP.
      </p>
    );
  }

  const n = (x: number) => x.toLocaleString();

  return (
    <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
      <Stat label="Total Connections" value={n(stats.total)} />
      <Stat label="Unique Companies" value={n(stats.uniqueCompanies)} />
      <Stat label="Unique Titles" value={n(stats.uniqueTitles)} />
      {stats.firstDate && <Stat label="Earliest Connection" value={stats.firstDate} />}
      {stats.lastDate && <Stat label="Latest Connection" value={stats.lastDate} />}
    </div>
  );
}
