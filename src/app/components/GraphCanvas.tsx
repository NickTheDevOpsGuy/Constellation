// src/app/components/GraphCanvas.tsx
'use client';

import React, {
  useEffect,
  useMemo,
  useRef,
  useCallback,
  useState,
} from 'react';
import ForceGraph2D, {
  type NodeObject as RFBaseNode,
  type LinkObject as RFBaseLink,
  type ForceGraphMethods as FG2DMethods,
} from 'react-force-graph-2d';
import ForceGraph3D, {
  type ForceGraphMethods as FG3DMethods,
} from 'react-force-graph-3d';
import { schemeTableau10 } from 'd3-scale-chromatic';
import type { GraphData, PersonNode } from '../types/linkedin';

export type GraphDimension = '2d' | '3d';
export type GroupBy = 'company' | 'title' | 'communityId';

type Props = {
  data: GraphData;
  labelMode?: 'zoom' | 'always' | 'none';
  groupBy?: GroupBy;
  className?: string;
  dimension?: GraphDimension; // '2d' by default
};

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return (
      !!window.WebGLRenderingContext &&
      !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

/** Edge type helpers (friendly labels + colors) */
type EdgeType =
  | 'connection'
  | 'invited'
  | 'authored'
  | 'commented'
  | 'liked'
  | 'reacted'
  | 'messaged'
  | 'co_company'
  | 'co_title';

const EDGE_LABEL: Record<EdgeType, string> = {
  connection: 'Direct Connection',
  invited: 'Invitation Sent',
  authored: 'Authored Post',
  commented: 'Commented',
  liked: 'Liked',
  reacted: 'Reacted',
  messaged: 'Messaged',
  co_company: 'Same Company',
  co_title: 'Same Title',
};

const EDGE_COLOR = (t?: string) => {
  switch (t as EdgeType) {
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
};

/** Minimal LinkEdge type locally */
type LinkEdge = {
  source: string | number;
  target: string | number;
  type?: string;
  kind?: string;
  date?: string;
  weight?: number;
};

type Urlish = { url?: string; profileUrl?: string; linkedinUrl?: string };

/** Node type used by react-force-graph */
type RFNode = RFBaseNode &
  PersonNode & {
    __color?: string; // set by nodeAutoColorBy (non-community modes)
    color?: string;
    val?: number;
    communityId?: number;
  };

/** Link type used by react-force-graph */
type RFLink = RFBaseLink<
  RFNode,
  { type?: string; kind?: string; date?: string; weight?: number }
> &
  LinkEdge;

/** The exact ref type both 2D and 3D components expect */
type FGRefType = React.MutableRefObject<
  | import('react-force-graph-2d').ForceGraphMethods<
      RFBaseNode<RFNode>,
      RFBaseLink<RFNode, RFLink>
    >
  | undefined
>;

type FGCommon = {
  zoomToFit?: (durationMs?: number, padding?: number) => unknown;
  d3Force?: (name: string) => unknown;
};

type CanvasPersonNode = PersonNode & {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  degree?: number;
  __color?: string;
  color?: string;
  val?: number;
  communityId?: number;
};

function isPersonNode(n: unknown): n is CanvasPersonNode {
  if (!n || typeof n !== 'object') return false;
  const obj = n as Partial<PersonNode & { kind?: unknown }>;
  return obj?.kind === 'person' && typeof obj.id === 'string';
}

/** Try to resolve a profile URL from different fields */
function getNodeUrl(n: Urlish | null | undefined): string | undefined {
  return n?.url ?? n?.profileUrl ?? n?.linkedinUrl ?? undefined;
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
function openNodeUrl(n: Urlish) {
  const href = getNodeUrl(n);
  if (href) openInNewTab(String(href));
}

/** Community colors (Tableau10) */
const COMMUNITY_PALETTE = schemeTableau10 as readonly string[];
const DEFAULT_NODE_COLOR = '#1f77b4';
const colorForCommunityId = (id?: number) =>
  id === undefined || id === null || id < 0
    ? DEFAULT_NODE_COLOR
    : (COMMUNITY_PALETTE[id % COMMUNITY_PALETTE.length] ?? DEFAULT_NODE_COLOR);

/** string -> stable color for company/title */
function stringToColor(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  const hue = Math.abs(h) % 360;
  return `hsl(${hue} 70% 45%)`;
}

/** Derive color based on groupBy */
function getNodeColorByGroup(n: RFNode, groupBy: GroupBy): string {
  if (groupBy === 'communityId') {
    return colorForCommunityId(n.communityId);
  }
  if (groupBy === 'company') {
    return stringToColor(n.company ?? 'n/a');
  }
  return stringToColor(n.title ?? 'n/a');
}

/** Pick a stroke color that contrasts on most backgrounds */
const nodeStrokeColor = () => 'rgba(255,255,255,0.95)';

const GraphCanvas: React.FC<Props> = ({
  data,
  labelMode = 'zoom',
  groupBy = 'company',
  className = '',
  dimension = '2d',
}) => {
  const fgInteropRef: FGRefType = useRef<
    FG2DMethods<RFBaseNode<RFNode>, RFBaseLink<RFNode, RFLink>> | undefined
  >(undefined);
  const fgCommonRef = useRef<FGCommon | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const [hoverNode, setHoverNode] = useState<CanvasPersonNode | null>(null);
  const [hoverLink, setHoverLink] = useState<RFLink | null>(null);
  const [mouse, setMouse] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [glOk, setGlOk] = useState<boolean>(true);

  useEffect(() => setGlOk(webglAvailable()), []);

  /** Keep fgCommonRef updated */
  useEffect(() => {
    fgCommonRef.current = (fgInteropRef.current as unknown as FGCommon) ?? null;
  }, [dimension, data]);

  /** Normalize graph */
  const graph = useMemo(() => {
    const nodes: RFNode[] = (data?.nodes ?? []).map((n) => ({
      ...(n as PersonNode),
      val: 3,
    })) as RFNode[];

    const rawLinks =
      'edges' in data
        ? (data.edges ?? [])
        : ((data as unknown as { links?: LinkEdge[] }).links ?? []);

    const normalizedLinks: RFLink[] = rawLinks.map((l) => ({
      source: l.source ?? '',
      target: l.target ?? '',
      type: l.type ?? l.kind ?? 'connection',
      kind: l.kind,
      date: l.date,
      weight: l.weight,
    })) as RFLink[];

    return { nodes, links: normalizedLinks };
  }, [data]);

  /** Physics & zoom */
  useEffect(() => {
    const fg = fgCommonRef.current;
    if (!fg) return;

    type ForceLike = {
      strength?: (v: number) => void;
      distance?: (v: number) => void;
    };

    const charge = (fg.d3Force?.('charge') as unknown as ForceLike) ?? null;
    charge?.strength?.(-80);

    const link = (fg.d3Force?.('link') as unknown as ForceLike) ?? null;
    link?.distance?.(30);
    link?.strength?.(0.25);

    const decay = (
      fgInteropRef.current as unknown as {
        d3VelocityDecay?: (v: number) => void;
      }
    )?.d3VelocityDecay;
    decay?.(0.4);
  }, [graph]);

  useEffect(() => {
    const t = setTimeout(() => fgCommonRef.current?.zoomToFit?.(400, 40), 0);
    return () => clearTimeout(t);
  }, [graph]);

  /** 2D node painter with contrast outline */
  const drawNode2D = useCallback(
    (node: RFNode, ctx: CanvasRenderingContext2D, scale: number) => {
      if (!isPersonNode(node)) return;

      const degree = Number.isFinite(node.degree) ? node.degree! : 0;
      const r = Math.min(18, 4 + Math.log2(degree + 1) * 5);

      const base =
        groupBy === 'communityId'
          ? getNodeColorByGroup(node, groupBy)
          : node.__color || node.color || getNodeColorByGroup(node, groupBy);

      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
      const prevAlpha = ctx.globalAlpha;
      ctx.globalAlpha = Math.min(1, 0.5 + degree / 12);
      ctx.fillStyle = base;
      ctx.fill();
      ctx.globalAlpha = prevAlpha;

      // Outline for readability
      ctx.lineWidth = Math.max(1, 1.5 / Math.max(1, scale));
      ctx.strokeStyle = nodeStrokeColor();
      ctx.stroke();

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

      // halo
      ctx.save();
      ctx.shadowColor = 'rgba(255,255,255,0.9)';
      ctx.shadowBlur = 4 / Math.max(1, scale);
      ctx.fillText(label, node.x + r + pad, node.y);
      ctx.restore();
    },
    [labelMode, groupBy]
  );

  /** Pointer area for precise hovers */
  const paintPointerArea = useCallback(
    (node: RFNode, color: string, ctx: CanvasRenderingContext2D) => {
      if (!isPersonNode(node)) return;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(node.x, node.y, 10, 0, 2 * Math.PI);
      ctx.fill();
    },
    []
  );

  /** Mouse for tooltip positioning */
  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setMouse({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  /** Only use 3D if requested AND WebGL is OK */
  const want3D = dimension === '3d' && glOk;

  /** Friendly text for a link */
  const linkFriendly = (l: RFLink) => {
    const raw = (l.type ?? l.kind ?? 'connection') as EdgeType;
    const label = EDGE_LABEL[raw] ?? raw;
    return label;
  };

  return (
    <div
      ref={wrapRef}
      onMouseMove={onMouseMove}
      className={`relative w-full h-full ${className}`}
    >
      <div className='absolute inset-0 border rounded overflow-hidden'>
        {want3D ? (
          <ForceGraph3D<RFNode, RFLink>
            key='fg3d'
            ref={
              fgInteropRef as unknown as React.MutableRefObject<
                | FG3DMethods<RFBaseNode<RFNode>, RFBaseLink<RFNode, RFLink>>
                | undefined
              >
            }
            graphData={graph}
            backgroundColor='#ffffff'
            {...(groupBy === 'communityId'
              ? {
                  nodeAutoColorBy: undefined as never,
                  nodeColor: (n: RFNode) => getNodeColorByGroup(n, groupBy),
                }
              : { nodeAutoColorBy: groupBy as 'company' | 'title' })}
            nodeRelSize={8}
            linkColor={(l) => EDGE_COLOR(l.type || l.kind || 'connection')}
            linkOpacity={0.9}
            linkWidth={1.5}
            warmupTicks={120}
            onEngineStop={() =>
              setTimeout(() => fgCommonRef.current?.zoomToFit?.(500, 120), 600)
            }
            onNodeClick={(node) => {
              if (isPersonNode(node)) openNodeUrl(node);
            }}
            onNodeHover={(node) => {
              setHoverNode(node && isPersonNode(node) ? node : null);
              // if node hovered, hide link tooltip
              if (node) setHoverLink(null);
            }}
            onLinkHover={(link) => {
              setHoverLink(link ?? null);
              if (link) setHoverNode(null);
            }}
          />
        ) : (
          <ForceGraph2D<RFNode, RFLink>
            key='fg2d'
            ref={fgInteropRef}
            graphData={graph}
            backgroundColor='#ffffff'
            nodeRelSize={6}
            {...(groupBy === 'communityId'
              ? { nodeAutoColorBy: undefined as never }
              : { nodeAutoColorBy: groupBy as 'company' | 'title' })}
            nodeCanvasObject={drawNode2D}
            nodeCanvasObjectMode={() => 'replace'}
            nodePointerAreaPaint={paintPointerArea}
            enableNodeDrag={false}
            linkColor={(l) => EDGE_COLOR(l.type || l.kind || 'connection')}
            linkWidth={1}
            warmupTicks={60}
            cooldownTicks={100}
            onEngineStop={() => fgCommonRef.current?.zoomToFit?.(200, 40)}
            onNodeClick={(node) => {
              if (isPersonNode(node)) openNodeUrl(node);
            }}
            onNodeHover={(node) => {
              setHoverNode(node && isPersonNode(node) ? node : null);
              if (node) setHoverLink(null);

              const canvasGetter =
                (fgInteropRef.current as unknown as {
                  canvas?: () => HTMLCanvasElement | undefined;
                }) ?? undefined;
              const canvas = canvasGetter?.canvas?.();
              if (canvas) {
                const hasUrl = !!(
                  node &&
                  isPersonNode(node) &&
                  getNodeUrl(node)
                );
                canvas.style.cursor = hasUrl ? 'pointer' : 'default';
              }
              fgCommonRef.current =
                (fgInteropRef.current as unknown as FGCommon) ?? null;
            }}
            onLinkHover={(link) => {
              setHoverLink(link ?? null);
              if (link) {
                // pointer hint for links
                const canvasGetter =
                  (fgInteropRef.current as unknown as {
                    canvas?: () => HTMLCanvasElement | undefined;
                  }) ?? undefined;
                const canvas = canvasGetter?.canvas?.();
                if (canvas) canvas.style.cursor = 'help';
              }
            }}
          />
        )}
      </div>

      {dimension === '3d' && !glOk && (
        <div className='absolute right-3 top-3 z-10 rounded-md bg-amber-100 text-amber-900 text-xs px-2 py-1 shadow'>
          WebGL not available — showing 2D
        </div>
      )}

      {/* Node tooltip (priority over link tooltip) */}
      {hoverNode ? (
        <div
          className='pointer-events-none absolute z-10 max-w-xs rounded-md border bg-white/95 shadow-lg text-xs p-2
                     dark:bg-gray-900/95 dark:text-gray-100 dark:border-gray-700'
          style={{
            left: Math.min(
              mouse.x + 14,
              (wrapRef.current?.clientWidth ?? 0) - 220
            ),
            top: Math.min(
              mouse.y + 14,
              (wrapRef.current?.clientHeight ?? 0) - 140
            ),
          }}
          role='tooltip'
        >
          <div className='font-semibold'>
            {hoverNode.name ||
              [hoverNode.firstName, hoverNode.lastName]
                .filter(Boolean)
                .join(' ') ||
              hoverNode.company ||
              hoverNode.id}
          </div>
          {(hoverNode.company || hoverNode.title) && (
            <div className='mt-0.5 text-gray-600 dark:text-gray-300'>
              {hoverNode.company && <span>{hoverNode.company}</span>}
              {hoverNode.company && hoverNode.title && <span> • </span>}
              {hoverNode.title && <span>{hoverNode.title}</span>}
            </div>
          )}
          {hoverNode.connectedOn && (
            <div className='mt-0.5 text-gray-500 dark:text-gray-400'>
              Connected: {hoverNode.connectedOn}
            </div>
          )}
          {Number.isFinite(hoverNode.degree) && (hoverNode.degree ?? 0) > 0 && (
            <div className='mt-0.5 text-gray-500 dark:text-gray-400'>
              Degree: {hoverNode.degree}
            </div>
          )}
          {typeof hoverNode.communityId === 'number' && (
            <div className='mt-0.5 text-gray-500 dark:text-gray-400'>
              Community: {hoverNode.communityId}
            </div>
          )}
          {getNodeUrl(hoverNode) && (
            <div className='mt-1'>
              <span className='opacity-70'>Profile:</span>{' '}
              <span className='underline opacity-90'>
                {String(getNodeUrl(hoverNode)).replace(
                  /^https?:\/\/(www\.)?/,
                  ''
                )}
              </span>
            </div>
          )}
        </div>
      ) : null}

      {/* Link tooltip (friendly labels) — only when no node is hovered */}
      {!hoverNode && hoverLink ? (
        <div
          className='pointer-events-none absolute z-10 max-w-xs rounded-md border bg-white/95 shadow-lg text-xs p-2
                     dark:bg-gray-900/95 dark:text-gray-100 dark:border-gray-700'
          style={{
            left: Math.min(
              mouse.x + 14,
              (wrapRef.current?.clientWidth ?? 0) - 220
            ),
            top: Math.min(
              mouse.y + 14,
              (wrapRef.current?.clientHeight ?? 0) - 90
            ),
          }}
          role='tooltip'
        >
          <div className='font-semibold'>{linkFriendly(hoverLink)}</div>
          {(hoverLink.date || hoverLink.weight) && (
            <div className='mt-0.5 text-gray-500 dark:text-gray-400'>
              {hoverLink.date && <span>When: {hoverLink.date}</span>}
              {hoverLink.date && hoverLink.weight && <span> • </span>}
              {hoverLink.weight && <span>Weight: {hoverLink.weight}</span>}
            </div>
          )}
          <div className='mt-0.5 text-[11px] text-gray-500 dark:text-gray-400'>
            Edge color:{' '}
            {EDGE_COLOR(hoverLink.type || hoverLink.kind || 'connection')}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default GraphCanvas;
