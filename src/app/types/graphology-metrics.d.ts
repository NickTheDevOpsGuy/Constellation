// src/app/types/cgrapholog-metrics-d.ts
declare module 'graphology-metrics/community/modularity' {
  import { Graph } from 'graphology-types';
  function modularity(
    graph: Graph,
    communities: Record<string, number>,
    options?: { getEdgeWeight?: (edge: string, attr: any) => number }
  ): number;
  export default modularity;
}