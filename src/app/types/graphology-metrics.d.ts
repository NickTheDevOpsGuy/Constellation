// src/app/types/graphology-metrics.d.ts
import { Graph, Attributes } from 'graphology';

declare module 'graphology-metrics/centrality/pageRank' {
  interface PageRankOptions {
    attributes?: Attributes;
    getEdgeWeight?: (edge: string, attr: Attributes) => number;
    tolerance?: number;
    maxIterations?: number;
  }

  export default function pageRank(
    graph: Graph,
    options?: PageRankOptions
  ): Record<string, number>;
}
