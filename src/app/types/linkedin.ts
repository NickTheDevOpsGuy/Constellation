// src/app/types/linkedin.ts

/** A single record from the LinkedIn CSV after parsing */
export type LinkedInRawRecord = {
  firstName: string;
  lastName: string;
  company?: string;
  /** We normalize Position/Title → `title` in parseCsv */
  title?: string;
  /** Keep as string; format in UI as needed */
  connectedOn?: string;
  url?: string;
};

/** Node "kind" */
export type NodeKind = 'person' | 'post';

export type BaseNode = {
  id: string;
  kind: NodeKind;
  name?: string;
  url?: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
};

export type PersonNode = BaseNode & {
  kind: 'person';
  firstName?: string;
  lastName?: string;
  company?: string;
  title?: string;
  connectedOn?: string;
  degree?: number;
};

export type PostNode = BaseNode & {
  kind: 'post';
  postId?: string;
  authorId?: string;
  createdAt?: string;
  topics?: string[];
};

export type EdgeType =
  | 'connection'
  | 'invited'
  | 'authored'
  | 'commented'
  | 'liked'
  | 'reacted'
  | 'messaged'
  | 'co_company' // inferred: same company
  | 'co_title'; // inferred: same title

export type LinkEdge = {
  source: string;
  target: string;
  type?: EdgeType;
  date?: string;
  weight?: number;
  topics?: string[];
};

export type GraphData = {
  nodes: (PersonNode | PostNode)[];
  edges: LinkEdge[];
};
