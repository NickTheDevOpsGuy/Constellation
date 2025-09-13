'use client';

import React, { useMemo, useState, useEffect } from 'react';
import Toolbar, { type Mode } from '../components/Toolbar';
import Facets, { type FacetItem } from '../components/Facets';
import GraphCanvas, { type GraphDimension } from '../components/GraphCanvas';
import GraphDimToggle from '../components/GraphDimToggle';
import Legend from '../components/Legend';
import Timeline from '../components/Timeline';
import { useLinkMap } from '../hooks/useLinkMap';
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

  // Collect all dates for the timeline (connections + any edge dates)
  const allDates = useMemo(() => {
    const ds: string[] = [];
    for (const r of raw) if (r.connectedOn) ds.push(r.connectedOn);
    for (const e of baseGraph.edges ?? []) {
      // strictly check for a date field and push if present
      if ('date' in e && e.date) {
        ds.push(e.date as string);
      }
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

  // G) legend counts from edges that connect kept nodes
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

  // early return AFTER hooks
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
          onModeChange={setMode}
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

      {/* legend */}
      <div style={{ gridColumn: '1 / span 2' }} className='px-1'>
        <Legend
          items={legendItems}
          active={activeEdgeTypes}
          onToggle={(t) =>
            setActiveEdgeTypes((prev) => {
              const next = new Set(prev);
              if (next.has(t)) next.delete(t);
              else next.add(t);
              return next;
            })
          }
          className='mt-1'
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
            data={finalGraph}
            groupBy={mode}
            labelMode='zoom'
            dimension={dim}
          />

          <div className='absolute right-3 top-3 z-10'>
            <GraphDimToggle value={dim} onChange={setDim} />
          </div>
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
      </section>
    </div>
  );
}
