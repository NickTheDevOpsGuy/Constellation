// src/app/components/GraphCanvas.tsx
'use client';

import React, { useMemo, useRef, useEffect, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import ForceGraph3D from 'react-force-graph-3d';
import type { GraphData, PersonNode, PostNode } from '../types/linkedin';
import { schemeTableau10 } from 'd3-scale-chromatic';

export type GraphDimension = '2d' | '3d';
type LabelMode = 'zoom' | 'always' | 'none';

type Props = {
  data: GraphData;                // { nodes, edges }
  groupBy: 'company' | 'title' | 'communityId';
  labelMode?: LabelMode;
  dimension?: GraphDimension;
  className?: string;
};

const PALETTE = schemeTableau10 as string[];

function isPerson(n: PersonNode | PostNode): n is PersonNode {
  return (n as PersonNode).kind === 'person';
}

function colorForNode(n: PersonNode | PostNode, groupBy: Props['groupBy']) {
  if (groupBy === 'communityId') {
    const id = (n as any).communityId ?? -1;
    return id >= 0 ? PALETTE[id % PALETTE.length] : '#9aa0a6';
  }
  if (isPerson(n)) {
    const key = (n[groupBy] ?? '') as string;
    if (!key) return '#9aa0a6';
    let h = 0;
    for (let i = 0; i < key.length; i++) h = ((h << 5) - h + key.charCodeAt(i)) | 0;
    const idx = Math.abs(h) % PALETTE.length;
    return PALETTE[idx];
  }
  return '#bdbdbd';
}

function checkWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2', { powerPreference: 'high-performance' }) ||
      canvas.getContext('webgl', { powerPreference: 'high-performance' }) ||
      canvas.getContext('experimental-webgl' as any);
    return !!gl;
  } catch {
    return false;
  }
}

export default function GraphCanvas({
  data,
  groupBy,
  labelMode = 'zoom',
  dimension = '2d',
  className,
}: Props) {
  const fg2dRef = useRef<any>(null);
  const fg3dRef = useRef<any>(null);
  const [webglOk, setWebglOk] = useState<boolean>(true);

  useEffect(() => {
    setWebglOk(checkWebGL());
  }, []);

  const use3d = dimension === '3d' && webglOk;

  // Build a new object identity for the lib when data changes
  const graphData = useMemo(() => {
    const nodes = (data.nodes ?? []).map((n) => ({
      ...n,
      id: String(n.id),
    }));
    const links = (data.edges ?? []).map((e) => ({
      ...e,
      source: String(e.source),
      target: String(e.target),
    }));
    return { nodes, links };
  }, [data]);

  // Imperative sync
  useEffect(() => {
    const ref = use3d ? fg3dRef.current : fg2dRef.current;
    if (ref && typeof ref.graphData === 'function') {
      ref.graphData(graphData);
      if (typeof ref.d3ReheatSimulation === 'function') {
        ref.d3ReheatSimulation();
      }
    }
  }, [graphData, use3d]);

  // Dispose 3D renderer on unmount to release WebGL context
  useEffect(() => {
    return () => {
      try {
        const ref = fg3dRef.current;
        if (ref && typeof ref.renderer === 'function') {
          const renderer = ref.renderer();
          if (renderer && typeof renderer.dispose === 'function') {
            renderer.dispose();
          }
        }
      } catch {}
    };
  }, []);

  const nodeLabel = (n: any) => {
    if (labelMode === 'none') return '';
    const name = isPerson(n)
      ? [n.firstName, n.lastName].filter(Boolean).join(' ')
      : (n.title ?? 'post');
    return name || '';
  };

  const commonProps = {
    nodeId: 'id',
    graphData,
    nodeCanvasObject: (node: any, ctx: CanvasRenderingContext2D, scale: number) => {
      const r = 3 + Math.log10((node.degree ?? 1) + 9);
      ctx.beginPath();
      ctx.fillStyle = colorForNode(node, groupBy);
      ctx.arc(node.x!, node.y!, r, 0, 2 * Math.PI, false);
      ctx.fill();

      if (labelMode === 'always' || (labelMode === 'zoom' && scale > 1.6)) {
        const label = nodeLabel(node);
        if (label) {
          ctx.font = `${Math.max(8, 10 / scale)}px sans-serif`;
          ctx.fillStyle = 'rgba(0,0,0,0.85)';
          ctx.fillText(label, node.x! + r + 2, node.y! + r + 2);
        }
      }
    },
    linkColor: () => '#c7c7c7',
    linkWidth: () => 0.6,
    cooldownTicks: 150,
    onEngineStop: () => {
      const ref = use3d ? fg3dRef.current : fg2dRef.current;
      if (ref?.zoomToFit) ref.zoomToFit(300, 30);
    },
  } as const;

  if (use3d) {
    return (
      <div className={className ?? ''} style={{ height: '100%' }}>
        <ForceGraph3D
          ref={fg3dRef}
          {...commonProps}
          rendererConfig={{
            antialias: true,
            powerPreference: 'high-performance',
            preserveDrawingBuffer: false,
            alpha: false,
          }}
        />
      </div>
    );
  }

  if (dimension === '3d' && !webglOk) {
    console.warn('[GraphCanvas] WebGL unavailable; falling back to 2D.');
  }

  return (
    <div className={className ?? ''} style={{ height: '100%' }}>
      <ForceGraph2D ref={fg2dRef} {...commonProps} />
    </div>
  );
}