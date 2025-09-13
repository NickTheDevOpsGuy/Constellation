// src/app/types/linkedin.ts

/** Base shape shared by all nodes */
export type BaseNode = {
  id: string;
  /** optional x/y/vx/vy for force layout libs */
  x?: number;
  y?: number;
  z?: number;
  vx?: number;
  vy?: number;
  vz?: number;
};

/** Person nodes (primary graph entities) */
export type PersonNode = BaseNode & {
  kind: 'person';
  firstName?: string;
  lastName?: string;
  name?: string;
  company?: string;
  title?: string;
  connectedOn?: string;
  degree?: number;
  communityId?: number;
  url?: string;
};

/** You can extend with other node kinds if you use them (e.g., posts) */
export type OtherNode = BaseNode & {
  kind: 'other';
  label?: string;
};

export type AnyNode = PersonNode | OtherNode;

/** Graph edge */
export type GraphEdge = {
  id?: string;
  source: string; // node id
  target: string; // node id
  weight?: number; // used by Louvain
  kind?: 'company' | 'title' | 'interaction' | 'other';
  timestamp?: string;
};

export type GraphData = {
  nodes: AnyNode[];
  edges: GraphEdge[];
};
