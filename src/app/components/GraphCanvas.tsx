// src/app/pages/components/GraphCanvas.tsx
'use client';

import React, { useMemo, useRef, useEffect } from 'react';
import ForceGraph2D, { ForceGraphMethods, NodeObject, LinkObject } from 'react-force-graph-2d';
import type { GraphData, PersonNode, PostNode } from '../types/linkedin';

export type GraphDimension = '2d' | '3d';
type LabelMode = 'zoom' | 'always' | 'none';

type Props = {
  data: GraphData; // { nodes, edges }
  groupBy: 'company' | 'title' | 'communityId';
  labelMode?: LabelMode;
  dimension?: GraphDimension; // API symmetry; we render 2D here
  className?: string;
};

// --- local render types (what we pass to the graph lib) ---
type ForceNode = (PersonNode | PostNode) & {
  id: string;
  x?: number;
  y?: number;
  degree?: number;
};
type ForceLink = {
  source: string;
  target: string;
  type?: string;
  weight?: number;
};
type ForceGraphData = { nodes: ForceNode[]; links: ForceLink[] };

/** Vivid palette for dark backgrounds. */
const DARK_PALETTE = [
  '#64D2FF',
  '#FF6B6B',
  '#FFD166',
  '#06D6A0',
  '#A29BFE',
  '#F72585',
  '#4CC9F0',
  '#43AA8B',
  '#F8961E',
  '#E76F51',
];

/** Edge colors tuned for dark canvas */
const EDGE_COLOR: Record<string, string> = {
  connection: '#C9CED6',
  co_company: '#FF5AA0',
  co_title: '#29D0CF',
  authored: '#6FA8FF',
  commented: '#FFA45E',
  liked: '#B879FF',
  reacted: '#B879FF',
  invited: '#FF6B6B',
  messaged: '#7CE7FF',
};

function isPerson(n: PersonNode | PostNode): n is PersonNode {
  return (n as PersonNode).kind === 'person';
}

function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function nodeFill(n: PersonNode | PostNode, groupBy: Props['groupBy']) {
  if (!isPerson(n)) return '#bdbdbd';
  const key =
    groupBy === 'communityId'
      ? String((n as unknown as { communityId?: number }).communityId ?? '')
      : String(n[groupBy] ?? '');
  if (!key) return '#9aa0a6';
  return DARK_PALETTE[hashStr(key) % DARK_PALETTE.length];
}

/** Human labels for tooltips */
function personTooltip(p: PersonNode) {
  const name = [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Person';
  const co = p.company || '—';
  const ti = p.title || '—';
  return `${name}\n${co}${ti ? ` — ${ti}` : ''}`;
}
function linkTooltip(l: ForceLink) {
  const type = l.type ?? 'connection';
  const nice =
    type === 'co_company'
      ? 'Same Company'
      : type === 'co_title'
        ? 'Same Title'
        : type.charAt(0).toUpperCase() + type.slice(1);
  const w = l.weight ? ` (w=${l.weight})` : '';
  return `${nice}${w}`;
}

export default function GraphCanvas({
  data,
  groupBy,
  labelMode = 'zoom',
  dimension: _dimension = '2d',
  className,
}: Props) {
  const fgRef = useRef<
    ForceGraphMethods<NodeObject<ForceNode>, LinkObject<ForceNode, ForceLink>> | undefined
  >(undefined);

  // Build graph data (typed) and degree
  const graphData: ForceGraphData = useMemo(() => {
    const nodes: ForceNode[] = (data.nodes ?? []).map((n) => ({
      ...(n as ForceNode),
      id: String(n.id),
    }));
    const links: ForceLink[] = (data.edges ?? []).map((e) => ({
      source: String(e.source),
      target: String(e.target),
      type: (e as { type?: string }).type,
      weight: (e as { weight?: number }).weight,
    }));

    const deg = new Map<string, number>();
    for (const l of links) {
      deg.set(l.source, (deg.get(l.source) ?? 0) + 1);
      deg.set(l.target, (deg.get(l.target) ?? 0) + 1);
    }
    for (const n of nodes) n.degree = deg.get(n.id) ?? 0;

    return { nodes, links };
  }, [data]);

  // Fit to view on major changes
  useEffect(() => {
    const inst = fgRef.current;
    if (inst?.zoomToFit) setTimeout(() => inst.zoomToFit(300, 40), 0);
    inst?.d3ReheatSimulation?.();
  }, [graphData.nodes.length, graphData.links.length]);

  const nodeLabel = (n: ForceNode): string => {
    if (labelMode === 'none') return '';
    if (isPerson(n as PersonNode | PostNode)) return personTooltip(n as PersonNode);
    return 'Post';
  };

  const drawNode = (node: ForceNode, ctx: CanvasRenderingContext2D, scale: number) => {
    const degree = node.degree ?? 0;
    const baseR = 3 + Math.sqrt(degree) * 0.9;
    const r = Math.max(4, Math.min(14, baseR));
    const color = nodeFill(node as PersonNode | PostNode, groupBy);

    // Soft outer glow
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(node.x ?? 0, node.y ?? 0, r, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();

    // Halo for contrast
    ctx.beginPath();
    ctx.lineWidth = 1.25;
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.arc(node.x ?? 0, node.y ?? 0, r + 1.25, 0, 2 * Math.PI);
    ctx.stroke();

    // Label
    const show = labelMode === 'always' || (labelMode === 'zoom' && scale > 1.4) || degree >= 10;
    if (show) {
      const text = isPerson(node as PersonNode | PostNode)
        ? [(node as PersonNode).firstName, (node as PersonNode).lastName].filter(Boolean).join(' ')
        : 'Post';
      if (text) {
        ctx.font = `${Math.max(8, 14 / (scale * 0.9))}px ui-sans-serif, system-ui, -apple-system`;
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(0,0,0,0.55)';
        ctx.strokeText(text, (node.x ?? 0) + r + 6, node.y ?? 0);
        ctx.fillStyle = 'rgba(255,255,255,0.96)';
        ctx.fillText(text, (node.x ?? 0) + r + 6, node.y ?? 0);
      }
    }
  };

  // Brighter, thicker links so they are clearly visible
  const linkColor = (l: ForceLink) => EDGE_COLOR[l.type ?? 'connection'] ?? '#C9CED6';
  const linkWidth = (l: ForceLink) =>
    Math.max(1.2, Math.min(2.8, 0.8 + Math.log2((l.weight ?? 1) + 1)));
  const linkCurvature = () => 0.15;

  // Subtle glow underneath link to improve contrast on dark bg
  const linkCanvasObject = (
    link: LinkObject<ForceNode, ForceLink>,
    ctx: CanvasRenderingContext2D,
  ) => {
    const l = link as unknown as ForceLink;
    const c = linkColor(l);
    const from = link.source as unknown as ForceNode;
    const to = link.target as unknown as ForceNode;
    if (!from || !to || from.x == null || from.y == null || to.x == null || to.y == null) return;

    ctx.save();
    ctx.strokeStyle = c;
    ctx.lineWidth = linkWidth(l) + 1;
    ctx.globalAlpha = 0.15;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.quadraticCurveTo(
      (from.x + to.x) / 2 + 0.15 * (to.y - from.y),
      (from.y + to.y) / 2 + 0.15 * (from.x - to.x),
      to.x,
      to.y,
    );
    ctx.stroke();
    ctx.restore();
  };

  return (
    <div
      className={className ?? ''}
      data-dimension={_dimension}
      style={{
        height: '100%',
        background:
          'radial-gradient(1200px 700px at 50% -20%, rgba(64,174,255,0.18), rgba(0,0,0,0)),' +
          'radial-gradient(1000px 600px at 80% 20%, rgba(255,86,170,0.14), rgba(0,0,0,0)),' +
          'radial-gradient(900px 600px at 15% 30%, rgba(64,255,220,0.12), rgba(0,0,0,0)),' +
          '#0b1220',
      }}
    >
      <ForceGraph2D
        ref={
          fgRef as React.MutableRefObject<
            ForceGraphMethods<NodeObject<ForceNode>, LinkObject<ForceNode, ForceLink>> | undefined
          >
        }
        nodeId="id"
        graphData={
          graphData as unknown as {
            nodes: NodeObject<ForceNode>[];
            links: LinkObject<ForceNode, ForceLink>[];
          }
        }
        // TOOLTIP TEXTS
        nodeLabel={nodeLabel as unknown as (n: NodeObject<ForceNode>) => string}
        linkLabel={(l: LinkObject<ForceNode, ForceLink>) => linkTooltip(l as unknown as ForceLink)}
        // NODE RENDER
        nodeCanvasObject={
          drawNode as unknown as (
            node: NodeObject<ForceNode>,
            ctx: CanvasRenderingContext2D,
            globalScale: number,
          ) => void
        }
        // LINK RENDER + STYLING
        linkColor={linkColor as unknown as (link: LinkObject<ForceNode, ForceLink>) => string}
        linkWidth={linkWidth as unknown as (link: LinkObject<ForceNode, ForceLink>) => number}
        linkCurvature={
          linkCurvature as unknown as (link: LinkObject<ForceNode, ForceLink>) => number
        }
        linkCanvasObject={linkCanvasObject}
        linkDirectionalParticles={(l: LinkObject<ForceNode, ForceLink>) =>
          (l as unknown as ForceLink).type === 'connection' ? 0 : 2
        }
        linkDirectionalParticleWidth={1.2}
        linkDirectionalArrowLength={3.5}
        linkDirectionalArrowRelPos={0.6}
        // PHYSICS
        cooldownTicks={150}
        d3VelocityDecay={0.35}
        onEngineStop={() => fgRef.current?.zoomToFit?.(300, 40)}
      />
    </div>
  );
}
