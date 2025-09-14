'use client';

import React, { useMemo, useRef, useEffect } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import type { GraphData, PersonNode, PostNode } from '../types/linkedin';
import { schemeTableau10 } from 'd3-scale-chromatic';

export type GraphDimension = '2d' | '3d';
type LabelMode = 'zoom' | 'always' | 'none';

type Props = {
  data: GraphData; // { nodes, edges }
  groupBy: 'company' | 'title' | 'communityId';
  labelMode?: LabelMode;
  dimension?: GraphDimension;
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

// minimal surface the FG ref exposes that we use
interface FGInstance {
  graphData: (d: ForceGraphData) => FGInstance | void;
  d3ReheatSimulation?: () => void;
  zoomToFit?: (ms?: number, px?: number) => void;
}

const PALETTE = schemeTableau10 as string[];

// Edge type → color
const EDGE_COLOR: Record<string, string> = {
  connection: '#bcbcbc',
  co_company: '#ff5a9e',
  co_title: '#29d0cf',
  authored: '#6fa8ff',
  commented: '#ffa45e',
  liked: '#b879ff',
  reacted: '#b879ff',
  invited: '#ff6b6b',
  messaged: '#7ce7ff',
};

function isPerson(n: PersonNode | PostNode): n is PersonNode {
  return (n as PersonNode).kind === 'person';
}

function nodeFill(n: PersonNode | PostNode, groupBy: Props['groupBy']) {
  if (!isPerson(n)) return '#bdbdbd';
  const key =
    groupBy === 'communityId'
      ? String((n as unknown as { communityId?: number }).communityId ?? '')
      : String(n[groupBy] ?? '');
  if (!key) return '#9aa0a6';
  let h = 0;
  for (let i = 0; i < key.length; i++) h = ((h << 5) - h + key.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

export default function GraphCanvas({
  data,
  groupBy,
  labelMode = 'zoom',
  dimension: _dimension = '2d', // keep prop for API, mark unused
  className,
}: Props) {
  const fgRef = useRef<FGInstance | null>(null);

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
    if (inst?.zoomToFit) setTimeout(() => inst.zoomToFit?.(300, 40), 0);
    inst?.d3ReheatSimulation?.();
  }, [graphData.nodes.length, graphData.links.length]);

  const nodeLabel = (n: ForceNode): string => {
    if (labelMode === 'none') return '';
    if (isPerson(n as PersonNode | PostNode)) {
      const p = n as PersonNode;
      const name = [p.firstName, p.lastName].filter(Boolean).join(' ');
      return name || '';
    }
    return ((n as unknown as PostNode).title ?? 'post') as string;
  };

  const drawNode = (node: ForceNode, ctx: CanvasRenderingContext2D, scale: number) => {
    const degree = node.degree ?? 0;
    const baseR = 3 + Math.sqrt(degree) * 0.9;
    const r = Math.max(4, Math.min(14, baseR));

    // Glow
    ctx.save();
    ctx.shadowColor = nodeFill(node as PersonNode | PostNode, groupBy);
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.fillStyle = nodeFill(node as PersonNode | PostNode, groupBy);
    ctx.arc(node.x ?? 0, node.y ?? 0, r, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();

    // Inner ring for high-degree
    if (degree >= 12) {
      ctx.beginPath();
      ctx.lineWidth = Math.max(1, 2.5 - Math.min(1.5, scale / 4));
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.arc(node.x ?? 0, node.y ?? 0, r + 1.5, 0, 2 * Math.PI);
      ctx.stroke();
    }

    // Label
    const show = labelMode === 'always' || (labelMode === 'zoom' && scale > 1.4) || degree >= 10;
    if (show) {
      const label = nodeLabel(node);
      if (label) {
        ctx.font = `${Math.max(8, 14 / (scale * 0.9))}px ui-sans-serif, system-ui, -apple-system`;
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(0,0,0,0.55)';
        ctx.strokeText(label, (node.x ?? 0) + r + 6, node.y ?? 0);
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.fillText(label, (node.x ?? 0) + r + 6, node.y ?? 0);
      }
    }
  };

  const linkColor = (l: ForceLink) => `${EDGE_COLOR[l.type ?? ''] ?? '#7a7a7a'}88`;
  const linkWidth = (l: ForceLink) => Math.min(2.2, 0.6 + Math.log2((l.weight ?? 1) + 1));
  const linkCurvature = () => 0.15;

  return (
    <div
      className={className ?? ''}
      data-dimension={_dimension} // <-- uses the prop (silences no-unused-vars)
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
        ref={fgRef as React.MutableRefObject<FGInstance>}
        nodeId="id"
        graphData={graphData}
        nodeCanvasObject={drawNode}
        linkColor={linkColor}
        linkWidth={linkWidth}
        linkCurvature={linkCurvature}
        linkDirectionalParticles={(l: ForceLink) => (l.type === 'connection' ? 0 : 1)}
        linkDirectionalParticleWidth={1.2}
        cooldownTicks={150}
        d3VelocityDecay={0.35}
        onEngineStop={() => fgRef.current?.zoomToFit?.(300, 40)}
      />
    </div>
  );
}
