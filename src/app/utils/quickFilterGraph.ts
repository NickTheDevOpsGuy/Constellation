// src/app/utils/quickFilterGraph.ts
import type { GraphData, PersonNode, LinkEdge, PostNode } from '../types/linkedin';
import { ts } from './time';

export type QuickFilterOpts = {
  q?: string; // text filter (company/title/name)
  from?: string; // ISO yyyy-mm-dd
  to?: string; // ISO yyyy-mm-dd
  limit?: number; // hard cap on nodes
  minGroup?: number; // minimum size for company/title groups
  topKGroups?: number; // keep only top-K groups by size
  hideIsolates?: boolean; // drop nodes with no incident edges
  mode?: 'company' | 'title'; // which field defines a group
  // (note: fallback edges are added in GraphCanvas, not here)
};

function isPerson(n: PersonNode | PostNode): n is PersonNode {
  return n.kind === 'person';
}

export function quickFilterGraph(raw: GraphData, opts: QuickFilterOpts): GraphData {
  const {
    q = '',
    from,
    to,
    limit = 400,
    minGroup = 1,
    topKGroups,
    hideIsolates = true,
    mode = 'company',
  } = opts;

  const ql = q.trim().toLowerCase();

  // bounds once → numbers
  const fromMs = from ? ts(from) : NaN;
  const toMs = to ? ts(to) : NaN;

  // --- 1) Node-level filtering (text + date) ---
  const textMatch = (n: PersonNode) => {
    if (!ql) return true;
    const name = n.name || [n.firstName, n.lastName].filter(Boolean).join(' ');
    return (
      (n.company ?? '').toLowerCase().includes(ql) ||
      (n.title ?? '').toLowerCase().includes(ql) ||
      (name ?? '').toLowerCase().includes(ql)
    );
  };

  const dateMatch = (n: PersonNode) => {
    if (!from && !to) return true;
    const d = ts(n.connectedOn);
    if (!Number.isFinite(d)) return false;
    if (Number.isFinite(fromMs) && d < fromMs) return false;
    if (Number.isFinite(toMs) && d > toMs) return false;
    return true;
  };

  const peopleNodes = raw.nodes.filter(isPerson);

  let nodes = peopleNodes.filter((n) => textMatch(n) && dateMatch(n));

  // --- 2) Group filtering (company/title) ---
  const keyOf = (n: PersonNode) => (mode === 'company' ? n.company : n.title) ?? '';
  if (minGroup > 1 || (topKGroups && topKGroups > 0)) {
    const counts = new Map<string, number>();
    for (const n of nodes) {
      const k = keyOf(n).trim();
      if (!k) continue;
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }

    let allow = new Set<string>();
    if (topKGroups && topKGroups > 0) {
      const top = [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, topKGroups)
        .map(([k]) => k);
      allow = new Set(top);
    }

    nodes = nodes.filter((n) => {
      const k = keyOf(n).trim();
      const c = counts.get(k) ?? 0;
      const passMin = c >= minGroup;
      const passTop = allow.size === 0 || allow.has(k);
      return passMin && passTop;
    });
  }

  // Hard cap to avoid label soup
  nodes = nodes.slice(0, Math.max(10, limit));
  const keep = new Set(nodes.map((n) => n.id));

  // --- 3) Edge filtering: keep only edges between kept nodes ---
  let edges = (raw.edges ?? []).filter(
    (e) => keep.has(String(e.source)) && keep.has(String(e.target)),
  ) as LinkEdge[];

  // Optionally drop isolates
  if (hideIsolates) {
    const deg = new Map<string, number>();
    for (const e of edges) {
      const s = String(e.source);
      const t = String(e.target);
      deg.set(s, (deg.get(s) ?? 0) + 1);
      deg.set(t, (deg.get(t) ?? 0) + 1);
    }
    nodes = nodes.filter((n) => (deg.get(n.id) ?? 0) > 0);
    const keep2 = new Set(nodes.map((n) => n.id));
    edges = edges.filter((e) => keep2.has(String(e.source)) && keep2.has(String(e.target)));
  }

  return { nodes, edges };
}
