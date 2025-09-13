import type {
  EdgeType,
  LinkEdge,
  PersonNode,
  PostNode,
} from '../types/linkedin';

export type BuildEdgesInput = {
  people: PersonNode[];
  posts?: PostNode[]; // accepted but not used
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
  enabled: Set<EdgeType>;
};

function starEdges(
  nodes: PersonNode[],
  keyOf: (n: PersonNode) => string,
  type: EdgeType
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

/** Keep the most recent date */
function newerDate(a?: string, b?: string) {
  const ta = a ? Date.parse(a) : NaN;
  const tb = b ? Date.parse(b) : NaN;
  if (Number.isNaN(ta)) return b;
  if (Number.isNaN(tb)) return a;
  return ta >= tb ? a : b;
}

export function buildEdges(input: BuildEdgesInput): LinkEdge[] {
  const {
    people,
    // posts intentionally unused
    interactions = [],
    invitations = [],
    enabled,
  } = input;

  // 1) Collect raw edges
  const raw: LinkEdge[] = [];

  if (enabled.has('co_company')) {
    raw.push(...starEdges(people, (n) => n.company ?? '', 'co_company'));
  }
  if (enabled.has('co_title')) {
    raw.push(...starEdges(people, (n) => n.title ?? '', 'co_title'));
  }

  if (enabled.has('invited') && invitations.length) {
    for (const inv of invitations) {
      if (!inv.fromId || !inv.toId) continue;
      raw.push({
        source: inv.fromId,
        target: inv.toId,
        type: 'invited',
        date: inv.date,
      });
    }
  }

  if (interactions.length) {
    const allowed: EdgeType[] = [
      'authored',
      'commented',
      'liked',
      'reacted',
      'messaged',
    ];
    for (const ix of interactions) {
      if (!allowed.includes(ix.type)) continue;
      if (!enabled.has(ix.type)) continue;
      raw.push({
        source: ix.actorPersonId,
        target: ix.targetPostId,
        type: ix.type,
        date: ix.date,
      });
    }
  }

  // 2) Aggregate duplicates → set weight, keep most recent date
  type Key = string;
  const agg = new Map<Key, LinkEdge & { weight: number }>();
  const keyOf = (e: LinkEdge) =>
    `${e.source}::${e.type ?? 'connection'}::${e.target}`;

  for (const e of raw) {
    const k = keyOf(e);
    const prev = agg.get(k);
    if (!prev) {
      agg.set(k, { ...e, weight: 1 });
    } else {
      prev.weight += 1;
      prev.date = newerDate(prev.date, e.date);
    }
  }

  return [...agg.values()];
}