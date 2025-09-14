// src/app/pages/GraphPage.tsx
'use client';

import React, { useMemo, useState, useEffect } from 'react';
import Toolbar, { type Mode } from '../components/Toolbar';
import Facets, { type FacetItem } from '../components/Facets';
import GraphCanvas, { type GraphDimension } from '../components/GraphCanvas';
import GraphDimToggle from '../components/GraphDimToggle';
import Legend from '../components/Legend';
import Timeline from '../components/Timeline';
import { useLinkMap } from '../hooks/useLinkMap';
import { useCommunities } from '../hooks/useCommunities';
import { rowsToGraph } from '../utils/rowsToGraph';
import { quickFilterGraph } from '../utils/quickFilterGraph';
import type {
  EdgeType,
  GraphData,
  LinkedInRawRecord,
  PersonNode,
  PostNode,
} from '../types/linkedin';

function countBy<T>(rows: T[], keyOf: (r: T) => string) {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = keyOf(r).trim();
    if (!k) continue;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}
function isPerson(n: PersonNode | PostNode): n is PersonNode {
  return n.kind === 'person';
}
function filterNodesByFacets(
  nodes: PersonNode[],
  companies: Set<string>,
  titles: Set<string>
) {
  if (companies.size === 0 && titles.size === 0) return nodes;
  return nodes.filter((n) => {
    const coOk =
      companies.size === 0 || (n.company && companies.has(n.company));
    const tiOk = titles.size === 0 || (n.title && titles.has(n.title));
    return coOk && tiOk;
  });
}
function normalizeEdgeType(t?: EdgeType): EdgeType {
  return (t ?? 'connection') as EdgeType;
}
function filterEdgesByTypes(
  edges: GraphData['edges'],
  active: Set<EdgeType>,
  keepIds: Set<string>
) {
  return edges.filter((e) => {
    const t = normalizeEdgeType(e.type);
    return (
      active.has(t) &&
      keepIds.has(String(e.source)) &&
      keepIds.has(String(e.target))
    );
  });
}
function edgeTypeCounts(edges: GraphData['edges']) {
  const m = new Map<EdgeType, number>();
  for (const e of edges) {
    const t = normalizeEdgeType(e.type);
    m.set(t, (m.get(t) ?? 0) + 1);
  }
  return m;
}

export default function GraphPage() {
  const { raw } = useLinkMap();

  // Toolbar
  const [filterText, setFilterText] = useState('');
  const [fromDate, setFromDate] = useState<string | undefined>();
  const [toDate, setToDate] = useState<string | undefined>();
  const [minGroup, setMinGroup] = useState(8);
  const [mode, setMode] = useState<Mode>('title');

  // Canvas color mode (company | title | community)
  const [colorMode, setColorMode] = useState<'company' | 'title' | 'community'>(
    mode as 'company' | 'title'
  );

  // Facets
  const [selCompanies, setSelCompanies] = useState<Set<string>>(new Set());
  const [selTitles, setSelTitles] = useState<Set<string>>(new Set());

  // Legend (edge-type visibility)
  const [activeEdgeTypes, setActiveEdgeTypes] = useState<Set<EdgeType>>(
    () =>
      new Set<EdgeType>([
        'connection',
        'invited',
        'authored',
        'commented',
        'liked',
        'reacted',
        'messaged',
        'co_company',
        'co_title',
      ])
  );

  // Dimension state (2D/3D), persisted in localStorage
  const [dim, setDim] = useState<GraphDimension>('2d');
  useEffect(() => {
    try {
      const saved = localStorage.getItem(
        'graph-dimension'
      ) as GraphDimension | null;
      if (saved === '2d' || saved === '3d') setDim(saved);
    } catch (_err) {
      console.log('Errors:' + _err);
    }
  }, []);

  const q = filterText.toLowerCase();

  // A) toolbar filter
  const baseRows = useMemo(
    () =>
      raw.filter((r: LinkedInRawRecord) => {
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
      }),
    [raw, q, fromDate, toDate]
  );

  // B) facet counts
  const companyCounts = countBy(baseRows, (r) => r.company ?? '');
  const titleCounts = countBy(baseRows, (r) => r.title ?? '');

  // C) rows after facets
  const filteredRows = useMemo(() => {
    if (selCompanies.size === 0 && selTitles.size === 0) return baseRows;
    return baseRows.filter((r) => {
      const coOk =
        selCompanies.size === 0 || (r.company && selCompanies.has(r.company));
      const tiOk = selTitles.size === 0 || (r.title && selTitles.has(r.title));
      return coOk && tiOk;
    });
  }, [baseRows, selCompanies, selTitles]);

  // D) base graph from toolbar-filtered rows
  const baseGraph = useMemo(
    () =>
      rowsToGraph(baseRows, mode, {
        infer: 'both',
      }),
    [baseRows, mode]
  );

  // Dates for timeline
  const allDates = useMemo(() => {
    const ds: string[] = [];
    for (const r of raw) if (r.connectedOn) ds.push(r.connectedOn);
    for (const e of baseGraph.edges ?? []) {
      if ('date' in e && e.date) ds.push(e.date as string);
    }
    return ds;
  }, [raw, baseGraph.edges]);

  // E) thin graph
  const thinned = useMemo(
    () =>
      quickFilterGraph(baseGraph, {
        q: filterText,
        from: fromDate,
        to: toDate,
        limit: 400,
        minGroup,
        topKGroups: 8,
        hideIsolates: true,
        mode,
      }),
    [baseGraph, filterText, fromDate, toDate, minGroup, mode]
  );

  // F) nodes after facets
  const nodesAfterFacets = useMemo(() => {
    const peopleOnly = (thinned.nodes ?? []).filter(isPerson);
    return filterNodesByFacets(peopleOnly, selCompanies, selTitles);
  }, [thinned.nodes, selCompanies, selTitles]);

  const keptIds = useMemo(
    () => new Set(nodesAfterFacets.map((n) => n.id)),
    [nodesAfterFacets]
  );

  // G) legend counts
  const countsBeforeLegend = useMemo(() => {
    const prelim = (thinned.edges ?? []).filter(
      (e) => keptIds.has(String(e.source)) && keptIds.has(String(e.target))
    );
    return edgeTypeCounts(prelim);
  }, [thinned.edges, keptIds]);

  const legendItems = useMemo(() => {
    const ordered: EdgeType[] = [
      'connection',
      'invited',
      'authored',
      'commented',
      'liked',
      'reacted',
      'messaged',
      'co_company',
      'co_title',
    ];
    return ordered
      .map((t) => ({ type: t, count: countsBeforeLegend.get(t) ?? 0 }))
      .filter((i) => i.count > 0);
  }, [countsBeforeLegend]);

  // H) apply legend filter
  const edgesAfterLegend = useMemo(
    () => filterEdgesByTypes(thinned.edges ?? [], activeEdgeTypes, keptIds),
    [thinned.edges, activeEdgeTypes, keptIds]
  );

  const finalGraph: GraphData = useMemo(
    () => ({ nodes: nodesAfterFacets, edges: edgesAfterLegend }),
    [nodesAfterFacets, edgesAfterLegend]
  );

  // Communities (computed on *already filtered* graph)
  const { applyCommunities, modularity, counts } = useCommunities();

  const graphForCanvas: GraphData = useMemo(() => {
    if (colorMode !== 'community') return finalGraph;
    // ✅ Optional early guard: if no edges left, skip compute (hook also guards)
    if (!finalGraph.edges?.length) return finalGraph;
    const { graph: withComms } = applyCommunities(finalGraph);
    return withComms;
  }, [finalGraph, colorMode, applyCommunities]);

  const groupByForCanvas =
    colorMode === 'community' ? 'communityId' : (mode as 'company' | 'title');

  if (raw.length === 0) {
    return (
      <div className='text-gray-600'>
        No data yet. Go to Import and upload a CSV.
      </div>
    );
  }

  // facet VMs
  const companyFacets: FacetItem[] = companyCounts
    .slice(0, 24)
    .map(([value, count]) => ({
      value,
      count,
      checked: selCompanies.has(value),
    }));
  const titleFacets: FacetItem[] = titleCounts
    .slice(0, 24)
    .map(([value, count]) => ({
      value,
      count,
      checked: selTitles.has(value),
    }));

  const toggleCompany = (v: string) =>
    setSelCompanies((prev) => {
      const n = new Set(prev);
      if (n.has(v)) n.delete(v);
      else n.add(v);
      return n;
    });
  const toggleTitle = (v: string) =>
    setSelTitles((prev) => {
      const n = new Set(prev);
      if (n.has(v)) n.delete(v);
      else n.add(v);
      return n;
    });
  const clearFacets = () => {
    setSelCompanies(new Set());
    setSelTitles(new Set());
  };

  // ✅ Mutually exclusive legend toggles for co_company vs co_title
  function toggleEdgeTypeExclusive(t: EdgeType) {
    setActiveEdgeTypes((prev) => {
      const next = new Set(prev);
      const isOn = next.has(t);

      const turnOn = () => {
        next.add(t);
        if (t === 'co_company') next.delete('co_title');
        if (t === 'co_title') next.delete('co_company');
      };

      if (isOn) {
        // Turn OFF current
        next.delete(t);
      } else {
        // Turn ON current (and enforce exclusivity if needed)
        turnOn();
      }
      return next;
    });
  }

  return (
    <div
      className='w-full grid gap-3'
      style={{
        height: 'calc(100vh - 140px)',
        gridTemplateRows: 'auto auto auto minmax(420px,1fr) auto',
        gridTemplateColumns: '280px 1fr',
      }}
    >
      {/* toolbar */}
      <div style={{ gridColumn: '1 / span 2' }}>
        <Toolbar
          className='max-w-none'
          filterText={filterText}
          onFilterTextChange={setFilterText}
          fromDate={fromDate}
          onFromDateChange={setFromDate}
          toDate={toDate}
          onToDateChange={setToDate}
          minSize={minGroup}
          onMinSizeChange={setMinGroup}
          mode={mode}
          onModeChange={(m) => {
            setMode(m);
            if (m === 'company' || m === 'title') setColorMode(m);
          }}
        />
      </div>

      {/* timeline */}
      <div
        style={{ gridColumn: '1 / span 2' }}
        className='px-1 -mt-2 flex items-center gap-3'
      >
        <Timeline
          dates={allDates}
          onChange={({ from, to }) => {
            setFromDate(from);
            setToDate(to);
          }}
          initialWindowMonths={3}
        />
      </div>

      {/* legend (now aware of community mode) */}
      <div style={{ gridColumn: '1 / span 2' }} className='px-1'>
        <Legend
          items={legendItems}
          active={activeEdgeTypes}
          onToggle={(t) => toggleEdgeTypeExclusive(t)}
          className='mt-1'
          /* ✅ Only pass communityCounts in community mode */
          communityCounts={colorMode === 'community' ? counts : undefined}
          communityTitle='Communities (node colors)'
        />
      </div>

      {/* facets */}
      <aside className='border rounded p-3 overflow-auto'>
        <Facets
          companies={companyFacets}
          titles={titleFacets}
          onToggleCompany={toggleCompany}
          onToggleTitle={toggleTitle}
          onClearAll={clearFacets}
        />
      </aside>

      {/* graph */}
      <main
        className='border rounded overflow-hidden'
        style={{ minHeight: 420 }}
      >
        <div
          className='relative h-full'
          style={{ height: 'var(--graph-height, 66vh)' }}
        >
          <GraphCanvas
            data={graphForCanvas}
            groupBy={groupByForCanvas}
            labelMode='zoom'
            dimension={dim}
          />

          {/* Top-right controls (high-contrast) */}
          <div
            className='absolute right-3 top-3 z-10 flex items-center gap-2
                       rounded-md border border-gray-300 dark:border-gray-700
                       bg-white/95 dark:bg-gray-900/95 shadow-md px-2 py-1'
          >
            <label className='text-xs md:text-sm text-gray-600 dark:text-gray-300 mr-1'>
              Color:
            </label>
            <select
              className='appearance-none text-xs md:text-sm h-8 px-2 rounded-md
                         bg-white dark:bg-gray-800
                         text-gray-900 dark:text-gray-100
                         border border-gray-300 dark:border-gray-600
                         focus:outline-none focus:ring-2 focus:ring-blue-500'
              value={colorMode}
              onChange={(e) =>
                setColorMode(
                  e.target.value as 'company' | 'title' | 'community'
                )
              }
              aria-label='Color nodes by'
            >
              <option value='company'>Company</option>
              <option value='title'>Title</option>
              <option value='community'>Community (Louvain)</option>
            </select>

            <div className='ml-2'>
              <GraphDimToggle
                value={dim}
                onChange={(v) => {
                  setDim(v);
                  try {
                    localStorage.setItem('graph-dimension', v);
                  } catch (err) {
                    // ignore write errors (Safari private mode, etc.)
                    void err;
                  }
                }}
              />
            </div>
          </div>

          {/* Modularity badge (high-contrast) */}
          {colorMode === 'community' && (
            <div
              className='absolute left-3 top-3 z-10 rounded-md
                         bg-black/70 text-white border border-white/20
                         px-2 py-1 text-xs shadow-md'
            >
              {typeof modularity === 'number'
                ? `Modularity: ${modularity.toFixed(3)}`
                : 'Computing communities…'}
            </div>
          )}
        </div>
      </main>

      {/* table */}
      <section
        style={{ gridColumn: '1 / span 2' }}
        className='border rounded p-3 overflow-auto'
      >
        <h4 className='text-sm font-semibold mb-2'>Connections</h4>
        <table className='w-full text-sm border-collapse'>
          <thead className='bg-gray-50 border-b'>
            <tr>
              <th className='px-2 py-1 text-left'>Name</th>
              <th className='px-2 py-1 text-left'>Company</th>
              <th className='px-2 py-1 text-left'>Title</th>
              <th className='px-2 py-1 text-left'>ConnectedOn</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.slice(0, 120).map((r, i) => {
              const name =
                [r.firstName, r.lastName].filter(Boolean).join(' ') || '—';
              return (
                <tr key={i} className='border-b last:border-0'>
                  <td className='px-2 py-1'>
                    {r.url ? (
                      <a
                        href={r.url}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='text-blue-600 hover:underline'
                      >
                        {name}
                      </a>
                    ) : (
                      name
                    )}
                  </td>
                  <td className='px-2 py-1'>{r.company ?? '—'}</td>
                  <td className='px-2 py-1'>{r.title ?? '—'}</td>
                  <td className='px-2 py-1'>{r.connectedOn ?? '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {colorMode === 'community' &&
          Array.isArray(counts) &&
          counts.length > 0 && (
            <div className='text-xs text-gray-600 mt-2'>
              <strong>Top communities:</strong>{' '}
              {counts
                .slice(0, 6)
                .map((c) => `#${c.communityId} (${c.count})`)
                .join(', ')}
            </div>
          )}
      </section>
    </div>
  );
}
