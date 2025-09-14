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
  return (n as PersonNode).kind === 'person';
}
function isPost(n: PersonNode | PostNode | undefined): n is PostNode {
  return !!n && (n as PostNode).kind === 'post';
}
function normalizeEdgeType(t?: EdgeType): EdgeType {
  return (t ?? 'connection') as EdgeType;
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

  // Color mode (company | title | community)
  const [colorMode, setColorMode] = useState<'company' | 'title' | 'community'>(
    mode as 'company' | 'title'
  );

  // Facets
  const [selCompanies, setSelCompanies] = useState<Set<string>>(new Set());
  const [selTitles, setSelTitles] = useState<Set<string>>(new Set());

  // Legend (edge-type visibility)
  const [activeEdgeTypes, setActiveEdgeTypes] = useState<Set<string>>(
    () =>
      new Set<string>([
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

  // Dimension
  const [dim, setDim] = useState<GraphDimension>('2d');
  useEffect(() => {
    try {
      const saved = localStorage.getItem(
        'graph-dimension'
      ) as GraphDimension | null;
      if (saved === '2d' || saved === '3d') setDim(saved);
    } catch {
      /* ignore storage */
    }
  }, []);

  const q = filterText.toLowerCase();

  // A) Toolbar text + date filter
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

  // B) Facet counts (for left panel)
  const companyCounts = countBy(baseRows, (r) => r.company ?? '');
  const titleCounts = countBy(baseRows, (r) => r.title ?? '');

  // C) Apply facets to the rows (drives both table & graph)
  const filteredRows = useMemo(() => {
    if (selCompanies.size === 0 && selTitles.size === 0) return baseRows;
    return baseRows.filter((r) => {
      const coOk =
        selCompanies.size === 0 || (r.company && selCompanies.has(r.company));
      const tiOk = selTitles.size === 0 || (r.title && selTitles.has(r.title));
      return coOk && tiOk;
    });
  }, [baseRows, selCompanies, selTitles]);

  // D) Build graph from *faceted* rows
  const facetedGraph = useMemo(
    () => rowsToGraph(filteredRows, mode, { infer: 'both' }),
    [filteredRows, mode]
  );

  // Dates for timeline
  const allDates = useMemo(() => {
    const ds: string[] = [];
    for (const r of raw) if (r.connectedOn) ds.push(r.connectedOn);
    for (const e of facetedGraph.edges ?? []) {
      if ('date' in e && e.date) ds.push(e.date as string);
    }
    return ds;
  }, [raw, facetedGraph.edges]);

  // E) Thin the *faceted* graph — adaptively
  const thinned = useMemo(() => {
    const nodeCount = facetedGraph.nodes?.length ?? 0;
    const edgeCount = facetedGraph.edges?.length ?? 0;
    const facetsOn = selCompanies.size > 0 || selTitles.size > 0;
    const smallSlice = nodeCount <= 250 || edgeCount <= 400 || facetsOn;

    const params = smallSlice
      ? {
          q: filterText,
          from: fromDate,
          to: toDate,
          limit: Math.max(2000, edgeCount + 200),
          minGroup: 1,
          topKGroups: 999,
          hideIsolates: false,
          mode,
        }
      : {
          q: filterText,
          from: fromDate,
          to: toDate,
          limit: 400,
          minGroup,
          topKGroups: 8,
          hideIsolates: true,
          mode,
        };

    return quickFilterGraph(facetedGraph, params);
  }, [
    facetedGraph,
    filterText,
    fromDate,
    toDate,
    minGroup,
    selCompanies.size,
    selTitles.size,
    mode,
  ]);

  // id → node
  const nodeById = useMemo(() => {
    const m = new Map<string, PersonNode | PostNode>();
    for (const n of thinned.nodes ?? []) m.set(String(n.id), n);
    return m;
  }, [thinned.nodes]);

  // F) Keep people matching facets; include their connected posts
  const { preLegendEdges, keptIds } = useMemo(() => {
    const people = (thinned.nodes ?? []).filter(isPerson);
    const keptPeople = people.filter((n) => {
      const coOk =
        selCompanies.size === 0 || (n.company && selCompanies.has(n.company));
      const tiOk = selTitles.size === 0 || (n.title && selTitles.has(n.title));
      return coOk && tiOk;
    });
    const keptPersonIds = new Set(keptPeople.map((n) => String(n.id)));

    const preLegendEdges = (thinned.edges ?? []).filter((e) => {
      const s = String(e.source);
      const t = String(e.target);
      const sKept = keptPersonIds.has(s) && isPerson(nodeById.get(s)!);
      const tKept = keptPersonIds.has(t) && isPerson(nodeById.get(t)!);
      return sKept || tKept;
    });

    const keptIds = new Set<string>(keptPersonIds);
    for (const e of preLegendEdges) {
      const s = String(e.source);
      const t = String(e.target);
      const sn = nodeById.get(s);
      const tn = nodeById.get(t);
      if (isPost(sn)) keptIds.add(s);
      if (isPost(tn)) keptIds.add(t);
    }
    return { preLegendEdges, keptIds };
  }, [thinned.nodes, thinned.edges, selCompanies, selTitles, nodeById]);

  // G) Legend counts
  const countsBeforeLegend = useMemo(
    () => edgeTypeCounts(preLegendEdges),
    [preLegendEdges]
  );
  const legendItems = useMemo(() => {
    const order: EdgeType[] = [
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
    return order
      .map((t) => ({ type: String(t), count: countsBeforeLegend.get(t) ?? 0 }))
      .filter((i) => i.count > 0);
  }, [countsBeforeLegend]);

  // H) Apply legend filter
  const edgesAfterLegend = useMemo(
    () =>
      preLegendEdges.filter((e) =>
        activeEdgeTypes.has(String(normalizeEdgeType(e.type)))
      ),
    [preLegendEdges, activeEdgeTypes]
  );

  // I) Final nodes = kept people + any posts referenced by edgesAfterLegend
  const nodesAfterLegend = useMemo(() => {
    const ids = new Set<string>(keptIds);
    for (const e of edgesAfterLegend) {
      ids.add(String(e.source));
      ids.add(String(e.target));
    }
    const out: Array<PersonNode | PostNode> = [];
    for (const id of ids) {
      const n = nodeById.get(id);
      if (n) out.push(n);
    }
    return out;
  }, [edgesAfterLegend, keptIds, nodeById]);

  const finalGraph: GraphData = useMemo(
    () => ({ nodes: nodesAfterLegend, edges: edgesAfterLegend }),
    [nodesAfterLegend, edgesAfterLegend]
  );

  // J) Optional communities (applied only when colorMode === 'community')
  const { applyCommunities, counts } = useCommunities();
  const graphForCanvas: GraphData = useMemo(() => {
    if (colorMode !== 'community') return finalGraph;
    const { graph } = applyCommunities(finalGraph);
    return graph;
  }, [finalGraph, colorMode, applyCommunities]);

  const groupByForCanvas =
    colorMode === 'community' ? 'communityId' : (mode as 'company' | 'title');

  if (raw.length === 0) {
    return <div className='text-gray-600'>No data yet. Import a CSV.</div>;
  }

  // Facet VMs
  const companyFacets: FacetItem[] = companyCounts
    .slice(0, 24)
    .map(([v, c]) => ({
      value: v,
      count: c,
      checked: selCompanies.has(v),
    }));
  const titleFacets: FacetItem[] = titleCounts.slice(0, 24).map(([v, c]) => ({
    value: v,
    count: c,
    checked: selTitles.has(v),
  }));

  const clearFacets = () => {
    setSelCompanies(new Set());
    setSelTitles(new Set());
  };

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

  return (
    <div
      className='w-full grid gap-3'
      style={{
        height: 'calc(100vh - 140px)',
        gridTemplateRows: 'auto auto auto minmax(420px,1fr) auto',
        gridTemplateColumns: '280px 1fr',
        background:
          'radial-gradient(1200px 700px at 50% -20%, rgba(64,174,255,0.18), rgba(0,0,0,0)), ' +
          'radial-gradient(1000px 600px at 80% 20%, rgba(255,86,170,0.14), rgba(0,0,0,0)), ' +
          'radial-gradient(900px 600px at 15% 30%, rgba(64,255,220,0.12), rgba(0,0,0,0)), ' +
          '#0b1220',
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

      {/* legend */}
      <div style={{ gridColumn: '1 / span 2' }} className='px-1'>
        <Legend
          items={legendItems}
          active={activeEdgeTypes}
          onToggle={(t: string) =>
            setActiveEdgeTypes((prev) => {
              const k = String(t);
              const next = new Set(prev);
              if (next.has(k)) next.delete(k);
              else next.add(k);
              return next;
            })
          }
          className='mt-1'
          communityCounts={colorMode === 'community' ? counts : undefined}
          communityTitle='Communities (node colors)'
        />
      </div>

      {/* facets */}
      <aside
        className='rounded p-3 overflow-auto text-white'
        style={{
          background: 'rgba(10,15,28,0.6)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(6px)',
        }}
      >
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
        className='rounded overflow-hidden'
        style={{
          minHeight: 420,
          background: 'transparent',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
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

          <div
            className='absolute right-3 top-3 z-10 flex items-center gap-2
                       rounded-md border border-gray-300/20
                       bg-black/40 text-white backdrop-blur px-2 py-1'
          >
            <label className='text-xs md:text-sm mr-1'>Color:</label>
            <select
              className='appearance-none text-xs md:text-sm h-8 px-2 rounded-md
                         bg-black/40 text-white border border-white/10'
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
                  } catch {
                    /* ignore storage */
                  }
                }}
              />
            </div>
          </div>
        </div>
      </main>

      {/* table with tooltips */}
      <section
        style={{ gridColumn: '1 / span 2' }}
        className='rounded p-3 overflow-auto'
      >
        <h4 className='text-sm font-semibold mb-2 text-white/90'>
          Connections
        </h4>
        <table className='w-full text-sm border-collapse text-white/90'>
          <thead className='border-b border-white/10 bg-white/5'>
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
              const tip = `${name}\n${r.company ?? '—'}${r.title ? ` — ${r.title}` : ''}\n${r.connectedOn ?? ''}`;
              return (
                <tr
                  key={i}
                  className='border-b border-white/5 last:border-0'
                  title={tip}
                >
                  <td className='px-2 py-1' title={name}>
                    {r.url ? (
                      <a
                        href={r.url}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='text-sky-300 hover:underline'
                        title={tip}
                      >
                        {name}
                      </a>
                    ) : (
                      name
                    )}
                  </td>
                  <td className='px-2 py-1' title={r.company ?? '—'}>
                    {r.company ?? '—'}
                  </td>
                  <td className='px-2 py-1' title={r.title ?? '—'}>
                    {r.title ?? '—'}
                  </td>
                  <td className='px-2 py-1' title={r.connectedOn ?? '—'}>
                    {r.connectedOn ?? '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
