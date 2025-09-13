// src/app/hooks/useCommunities.ts
import { useState, useCallback } from 'react';
import { UndirectedGraph } from 'graphology';
import louvain from 'graphology-communities-louvain';
import modularity from 'graphology-metrics/graph/modularity';
import type { GraphData, AnyNode } from '../types/linkedin';

export type CommunityCounts = Array<{ communityId: number; count: number }>;

export function useCommunities() {
  const [modularityScore, setModularityScore] = useState<number | null>(null);
  const [counts, setCounts] = useState<CommunityCounts>([]);

  const compute = useCallback((graph: GraphData) => {
    const g = new UndirectedGraph({ multi: false, allowSelfLoops: false });
    const isPerson = (n: AnyNode) => (n as any).kind === 'person';

    // Nodes
    for (const n of graph.nodes) {
      if (isPerson(n)) g.addNode(String(n.id));
    }
    // Edges (weighted)
    for (const e of graph.edges) {
      const s = String(e.source);
      const t = String(e.target);
      if (g.hasNode(s) && g.hasNode(t) && !g.hasEdge(s, t)) {
        g.addEdge(s, t, { weight: e.weight ?? 1 });
      }
    }

    const communities: Record<string, number> = louvain(g, {
      getEdgeWeight: (_edge, attr: any) => attr?.weight ?? 1,
    });

    const mod = modularity(g, {
      getNodeCommunity: (node) => communities[node],
      getEdgeWeight: (_edge, attr: any) => attr?.weight ?? 1,
    });

    // Counts
    const m = new Map<number, number>();
    for (const id of Object.values(communities)) {
      m.set(id, (m.get(id) ?? 0) + 1);
    }
    const nextCounts: CommunityCounts = [...m.entries()]
      .map(([communityId, count]) => ({ communityId, count }))
      .sort((a, b) => b.count - a.count);

    setModularityScore(mod);
    setCounts(nextCounts);

    return { communities, modularity: mod, counts: nextCounts };
  }, []);

  const applyCommunities = useCallback(
    (graph: GraphData) => {
      const { communities, modularity, counts } = compute(graph);
      const nodes = graph.nodes.map((n) =>
        (n as any).kind === 'person'
          ? ({ ...n, communityId: communities[String(n.id)] ?? -1 } as AnyNode)
          : n
      );
      return { graph: { ...graph, nodes }, modularity, counts };
    },
    [compute]
  );

  return {
    modularity: modularityScore,
    counts,
    compute,
    applyCommunities,
  };
}
