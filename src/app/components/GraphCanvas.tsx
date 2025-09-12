// src/app/components/GraphCanvas.tsx
'use client';

import React, { useEffect, useMemo, useRef, useCallback, useState } from 'react';
import ForceGraph2D, {
  type ForceGraphMethods,
  type NodeObject as RFBaseNode,
  type LinkObject as RFBaseLink,
} from 'react-force-graph-2d';
import type { GraphData, PersonNode, LinkEdge, PostNode } from '../types/linkedin';

type Props = {
  data: GraphData;
  labelMode?: 'zoom' | 'always' | 'none';
  groupBy?: 'company' | 'title';
  className?: string;
};

/** Node type used by react-force-graph */
type RFNode = RFBaseNode &
  (PersonNode | PostNode) & {
    __color?: string;
    val?: number;
  };

/** Link type used by react-force-graph */
type RFLink = RFBaseLink<RFNode, { type?: string; date?: string }> & {
  source: string | number;
  target: string | number;
  type?: string;
  date?: string;
};

/** Methods we rely on, plus helpers some builds expose */
type ForceGraphWithCanvas = ForceGraphMethods<RFNode, RFLink> & {
  canvas?: () => HTMLCanvasElement | undefined;
  d3VelocityDecay?: (v: number) => void;
};

type CanvasPersonNode = PersonNode & {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  degree?: number;
  __color?: string;
  val?: number;
};

function isPersonNode(n: unknown): n is CanvasPersonNode {
  if (!n || typeof n !== 'object') return false;
  const obj = n as Partial<PersonNode & { kind?: unknown }>;
  return obj?.kind === 'person' && typeof obj.id === 'string';
}

function fallbackLinks(nodes: PersonNode[], groupBy: 'company' | 'title'): LinkEdge[] {
  const keyOf = (n: PersonNode) => (groupBy === 'company' ? n.company : n.title) ?? '';
  const groups = new Map<string, string[]>();
  for (const n of nodes) {
    const k = keyOf(n).trim();
    if (!k) continue;
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(n.id);
  }
  const links: LinkEdge[] = [];
  for (const ids of groups.values()) {
    if (ids.length < 2) continue;
    const hub = ids[0];
    for (let i = 1; i < ids.length; i++)
      links.push({ source: hub, target: ids[i], type: 'connection' });
  }
  return links;
}

function openInNewTab(href: string) {
  const a = document.createElement('a');
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

const GraphCanvas: React.FC<Props> = ({
  data,
  labelMode = 'zoom',
  groupBy = 'company',
  className = '',
}) => {
  const fgRef = useRef<ForceGraphWithCanvas | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const [hoverNode, setHoverNode] = useState<CanvasPersonNode | null>(null);
  const [mouse, setMouse] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const graph = useMemo(() => {
    const nodes: RFNode[] = (data.nodes ?? []).map((n) => ({
      ...(n as PersonNode | PostNode),
      val: 3,
    })) as RFNode[];

    const inputEdges = (data.edges ?? []) as LinkEdge[];
    const links: RFLink[] =
      inputEdges.length > 0
        ? (inputEdges as unknown as RFLink[])
        : (fallbackLinks(
            nodes.filter((n): n is PersonNode => (n as { kind?: string }).kind === 'person'),
            groupBy,
          ) as unknown as RFLink[]);

    return { nodes, links };
  }, [data, groupBy]);

  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;

    const charge = fg.d3Force?.('charge') as { strength?: (s: number) => unknown } | undefined;
    charge?.strength?.(-80);

    const link = fg.d3Force?.('link') as
      | { distance?: (d: number) => unknown; strength?: (s: number) => unknown }
      | undefined;
    link?.distance?.(30);
    link?.strength?.(0.25);

    fg.d3VelocityDecay?.(0.4);
  }, [graph]);

  useEffect(() => {
    const t = setTimeout(() => fgRef.current?.zoomToFit(400, 40), 0);
    return () => clearTimeout(t);
  }, [graph]);

  const drawNode = useCallback(
    (node: RFNode, ctx: CanvasRenderingContext2D, scale: number) => {
      if (!isPersonNode(node)) return;

      const degree = Number.isFinite(node.degree) ? node.degree! : 0;
      const r = Math.min(18, 4 + Math.log2(degree + 1) * 5);

      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);

      const base = node.__color ?? '#1f77b4';
      const prevAlpha = ctx.globalAlpha;
      ctx.globalAlpha = Math.min(1, 0.5 + degree / 12);
      ctx.fillStyle = base;
      ctx.fill();
      ctx.globalAlpha = prevAlpha;

      if (labelMode === 'none') return;
      if (labelMode === 'zoom' && scale < 1.2) return;

      const label =
        node.name ||
        [node.firstName, node.lastName].filter(Boolean).join(' ') ||
        node.company ||
        String(node.id);

      if (!label) return;

      const fontSize = Math.max(12 / scale, 3);
      const pad = 6 / scale;
      ctx.font = `${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
      ctx.fillStyle = '#111';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillText(label, node.x + r + pad, node.y);
    },
    [labelMode],
  );

  const paintPointerArea = useCallback(
    (node: RFNode, color: string, ctx: CanvasRenderingContext2D) => {
      if (!isPersonNode(node)) return;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(node.x, node.y, 10, 0, 2 * Math.PI);
      ctx.fill();
    },
    [],
  );

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setMouse({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div ref={wrapRef} onMouseMove={onMouseMove} className={`relative w-full h-full ${className}`}>
      <div className="absolute inset-0 border rounded overflow-hidden">
        <ForceGraph2D<RFNode, RFLink>
          ref={
            fgRef as unknown as React.MutableRefObject<
              ForceGraphMethods<RFNode, RFLink> | undefined
            >
          }
          graphData={graph}
          backgroundColor="#ffffff"
          nodeRelSize={6}
          nodeAutoColorBy={groupBy}
          nodeCanvasObject={drawNode}
          nodeCanvasObjectMode={() => 'replace'}
          nodePointerAreaPaint={paintPointerArea}
          enableNodeDrag={false}
          linkColor={(link) => {
            const t = link.type || 'connection';
            switch (t) {
              case 'authored':
                return '#1f77b4';
              case 'commented':
                return '#2ca02c';
              case 'liked':
                return '#ff7f0e';
              case 'reacted':
                return '#9467bd';
              case 'invited':
                return '#d62728';
              case 'messaged':
                return '#17becf';
              case 'co_company':
                return '#ff1493';
              case 'co_title':
                return '#00ced1';
              default:
                return '#8b8b8b';
            }
          }}
          linkWidth={1}
          warmupTicks={60}
          cooldownTicks={100}
          onEngineStop={() => fgRef.current?.zoomToFit(200, 40)}
          onNodeClick={(node) => {
            if (isPersonNode(node) && node.url) openInNewTab(String(node.url));
          }}
          onNodeHover={(node) => {
            setHoverNode(node && isPersonNode(node) ? (node as CanvasPersonNode) : null);
            const canvas = fgRef.current?.canvas?.();
            if (canvas) {
              const hasUrl = !!(node && isPersonNode(node) && node.url);
              canvas.style.cursor = hasUrl ? 'pointer' : 'default';
            }
          }}
        />
      </div>

      {hoverNode ? (
        <div
          className="pointer-events-none absolute z-10 max-w-xs rounded-md border bg-white/95 shadow-lg text-xs p-2
                     dark:bg-gray-900/95 dark:text-gray-100 dark:border-gray-700"
          style={{
            left: Math.min(mouse.x + 14, (wrapRef.current?.clientWidth ?? 0) - 220),
            top: Math.min(mouse.y + 14, (wrapRef.current?.clientHeight ?? 0) - 120),
          }}
          role="tooltip"
        >
          <div className="font-semibold">
            {hoverNode.name ||
              [hoverNode.firstName, hoverNode.lastName].filter(Boolean).join(' ') ||
              hoverNode.company ||
              hoverNode.id}
          </div>
          {(hoverNode.company || hoverNode.title) && (
            <div className="mt-0.5 text-gray-600 dark:text-gray-300">
              {hoverNode.company && <span>{hoverNode.company}</span>}
              {hoverNode.company && hoverNode.title && <span> • </span>}
              {hoverNode.title && <span>{hoverNode.title}</span>}
            </div>
          )}
          {hoverNode.connectedOn && (
            <div className="mt-0.5 text-gray-500 dark:text-gray-400">
              Connected: {hoverNode.connectedOn}
            </div>
          )}
          {Number.isFinite(hoverNode.degree) && (hoverNode.degree ?? 0) > 0 && (
            <div className="mt-0.5 text-gray-500 dark:text-gray-400">
              Degree: {hoverNode.degree}
            </div>
          )}
          {hoverNode.url && (
            <div className="mt-1">
              <span className="opacity-70">Profile:</span>{' '}
              <span className="underline opacity-90">
                {String(hoverNode.url).replace(/^https?:\/\/(www\.)?/, '')}
              </span>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default GraphCanvas;
