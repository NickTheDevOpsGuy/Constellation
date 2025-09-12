import type { LinkedInRawRecord } from '../types/linkedin';

export type Summary = {
  byCompanyTop5: { company: string; count: number }[];
  byTitleTop5: { title: string; count: number }[];
  total: number;
  recentConnections: { name: string; connectedOn?: string }[];
};

export function summarize(rows: LinkedInRawRecord[]): Summary {
  // --- Company counts ---
  const companyCounts = new Map<string, { display: string; count: number }>();
  for (const r of rows) {
    if (!r.company) continue;
    const key = r.company.trim().toLowerCase();
    const display = r.company.trim();
    const prev = companyCounts.get(key);
    if (prev) prev.count += 1;
    else companyCounts.set(key, { display, count: 1 });
  }
  const byCompanyTop5 = Array.from(companyCounts.values())
    .map(({ display, count }) => ({ company: display, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // --- Title counts ---
  const titleCounts = new Map<string, { display: string; count: number }>();
  for (const r of rows) {
    const title = r.title; // remove `any`
    if (!title) continue;
    const key = title.trim().toLowerCase();
    const display = title.trim();
    const prev = titleCounts.get(key);
    if (prev) prev.count += 1;
    else titleCounts.set(key, { display, count: 1 });
  }
  const byTitleTop5 = Array.from(titleCounts.values())
    .map(({ display, count }) => ({ title: display, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // --- Recent connections (newest first, top 5) ---
  const recentConnections = rows
    .slice()
    .sort((a, b) => {
      const da = a.connectedOn ? Date.parse(a.connectedOn) : 0;
      const db = b.connectedOn ? Date.parse(b.connectedOn) : 0;
      return db - da; // newest first
    })
    .slice(0, 5)
    .map((r) => ({
      name: `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim(),
      connectedOn: r.connectedOn,
    }));

  return {
    byCompanyTop5,
    byTitleTop5,
    total: rows.length,
    recentConnections,
  };
}
