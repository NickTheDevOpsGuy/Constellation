// src/app/utils/edgeBuilders.ts
import type { EdgeType, LinkEdge, PersonNode, PostNode } from '../types/linkedin';

export type BuildEdgesInput = {
  people: PersonNode[];
  posts?: PostNode[];
  interactions?: {
    actorPersonId: string;
    targetPostId: string;
    type: EdgeType; // 'authored' | 'commented' | 'liked' | 'reacted' | 'messaged'
    date?: string;
  }[];
  invitations?: {
    fromId: string; // person.id
    toId: string; // person.id
    date?: string;
  }[];
  enabled: Set<EdgeType>; // which edge types are ON from the legend
};

/** Star-connect nodes within each bucket (hub = first id). */
function starEdges(
  nodes: PersonNode[],
  keyOf: (n: PersonNode) => string,
  type: EdgeType,
): LinkEdge[] {
  const buckets = new Map<string, string[]>();
  for (const n of nodes) {
    const k = keyOf(n).trim();
    if (!k) continue;
    (buckets.get(k) ?? buckets.set(k, []).get(k)!).push(n.id);
  }
  const edges: LinkEdge[] = [];
  for (const ids of buckets.values()) {
    if (ids.length < 2) continue;
    const hub = ids[0];
    for (let i = 1; i < ids.length; i++) {
      edges.push({ source: hub, target: ids[i], type });
    }
  }
  return edges;
}

export function buildEdges(input: BuildEdgesInput): LinkEdge[] {
  const {
    people,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    posts = [],
    interactions = [],
    invitations = [],
    enabled,
  } = input;
  const out: LinkEdge[] = [];

  // Inferred person↔person: same company
  if (enabled.has('co_company')) {
    out.push(...starEdges(people, (n) => n.company ?? '', 'co_company'));
  }

  // Inferred person↔person: same title
  if (enabled.has('co_title')) {
    out.push(...starEdges(people, (n) => n.title ?? '', 'co_title'));
  }

  // Optional: invitations (person↔person)
  if (enabled.has('invited') && invitations.length) {
    for (const inv of invitations) {
      if (!inv.fromId || !inv.toId) continue;
      out.push({
        source: inv.fromId,
        target: inv.toId,
        type: 'invited',
        date: inv.date,
      });
    }
  }

  // Optional: post interactions (person↔post)
  if (interactions.length) {
    const allowed: EdgeType[] = ['authored', 'commented', 'liked', 'reacted', 'messaged'];
    for (const ix of interactions) {
      if (!allowed.includes(ix.type)) continue;
      if (!enabled.has(ix.type)) continue;
      out.push({
        source: ix.actorPersonId,
        target: ix.targetPostId,
        type: ix.type,
        date: ix.date,
      });
    }
  }

  return out;
}
