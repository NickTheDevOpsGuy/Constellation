// src/app/types/graphology-metrics.d.ts

declare module 'graphology-metrics/graph/modularity' {
  import { Graph } from 'graphology-types';
  export interface ModularityOptions {
    getNodeCommunity: (node: string) => number;
    getEdgeWeight?: (edge: string, attr: Record<string, unknown>) => number;
  }
  export default function modularity(graph: Graph, options: ModularityOptions): number;
}

declare module 'graphology-communities-louvain' {
  import { Graph } from 'graphology-types';
  export interface LouvainOptions {
    getEdgeWeight?: (edge: string, attr: Record<string, unknown>) => number;
    // plus other optional fields the lib supports; we only use weight getter
  }
  function louvain(graph: Graph, options?: LouvainOptions): Record<string, number>;
  namespace louvain {
    const detection: typeof louvain; // some builds expose .detection
  }
  export default louvain;
}
