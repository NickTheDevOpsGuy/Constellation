// src/app/types/linkedin.ts

/** All edge kinds we render / count in the UI */
export type EdgeType =
  | 'connection'
  | 'invited'
  | 'authored'
  | 'commented'
  | 'liked'
  | 'reacted'
  | 'messaged'
  | 'co_company'
  | 'co_title';

/** CSV row from LinkedIn “Connections.csv” (keep fields optional) */
export interface LinkedInRawRecord {
  firstName?: string;
  lastName?: string;
  company?: string;
  title?: string;
  connectedOn?: string; // ISO or locale date string
  url?: string; // profile url
  // allow extra columns without failing typecheck
  [k: string]: unknown;
}

interface BaseNode {
  id: string;
  kind: 'person' | 'post';
  name?: string;
  url?: string;
}

/** Node for a person (most of your graph) */
export interface PersonNode extends BaseNode {
  kind: 'person';
  firstName?: string;
  lastName?: string;
  company?: string;
  title?: string;
  connectedOn?: string;
  degree?: number;
  /** injected by community detection */
  communityId?: number;
}

/** Node for a LinkedIn post (for interactions graph) */
export interface PostNode extends BaseNode {
  kind: 'post';
  createdAt?: string;
  topics?: string[];
}

/** Union of nodes */
export type AnyNode = PersonNode | PostNode;

/** Edge in our graph. `kind` is tolerated as an alias for `type`. */
export interface LinkEdge {
  source: string | number;
  target: string | number;
  type?: EdgeType;
  kind?: EdgeType; // some parsers fill this
  date?: string;   // when the interaction happened
  weight?: number; // used for layout/community detection
}

/** Alias kept for older imports */
export type GraphEdge = LinkEdge;

/** Graph payload used across the app */
export interface GraphData {
  nodes: AnyNode[];
  edges: GraphEdge[];
}
