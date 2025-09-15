// src/app/utils/rowsToGraph.ts
import type {
  GraphData,
  LinkedInRawRecord,
  PersonNode,
  PostNode,
  LinkEdge,
} from '../types/linkedin';

type InferMode = 'none' | 'company' | 'title' | 'both';

function groupBy<T>(arr: T[], keyOf: (x: T) => string) {
  const m = new Map<string, T[]>();
  for (const it of arr) {
    const k = keyOf(it).trim();
    if (!k) continue;
    (m.get(k) ?? m.set(k, []).get(k)!).push(it);
  }
  return m;
}
function star(ids: string[], type: LinkEdge['type']): LinkEdge[] {
  if (ids.length < 2) return [];
  const hub = ids[0];
  return ids.slice(1).map((id) => ({ source: hub, target: id, type }));
}

export function rowsToGraph(
  rows: LinkedInRawRecord[],
  _groupHint?: 'company' | 'title', // made optional to avoid "assigned but never used"
  opts: {
    infer?: InferMode;
    posts?: PostNode[];
    // interactions: actorPersonId (resolved) → post.id
    interactions?: {
      actorPersonId?: string;
      targetPostId: string;
      type: LinkEdge['type'];
      date?: string;
    }[];
  } = {}
): GraphData {
  const infer: InferMode = opts.infer ?? 'both';
  const posts = opts.posts ?? [];
  const interactions = opts.interactions ?? [];

  // 1) people nodes
  const people: PersonNode[] = rows.map((r, i) => {
    const id = String(i);
    const name = `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim() || id;
    return {
      id,
      kind: 'person',
      name,
      firstName: r.firstName,
      lastName: r.lastName,
      company: r.company,
      title: r.title,
      connectedOn: r.connectedOn,
      url: r.url,
      // degree: will populate after edges
    };
  });

  // 2) post nodes (if any)
  const postNodes: PostNode[] = posts.map((p) => ({
    ...p,
    kind: 'post',
  }));

  // 3) inferred co-edges among people
  const edges: LinkEdge[] = [];
  if (infer === 'both' || infer === 'company') {
    const g = groupBy(people, (n) => n.company ?? '');
    for (const val of g.values())
      edges.push(
        ...star(
          val.map((n) => n.id),
          'co_company'
        )
      );
  }
  if (infer === 'both' || infer === 'title') {
    const g = groupBy(people, (n) => n.title ?? '');
    for (const val of g.values())
      edges.push(
        ...star(
          val.map((n) => n.id),
          'co_title'
        )
      );
  }

  // 4) person→post edges from interactions (only if actorPersonId is resolved & post exists)
  const postIdSet = new Set(postNodes.map((p) => p.id));
  for (const it of interactions) {
    if (!it.actorPersonId) continue;
    if (!postIdSet.has(it.targetPostId)) continue;
    edges.push({
      source: it.actorPersonId,
      target: it.targetPostId,
      type: it.type,
      date: it.date,
    });
  }

  // 5) compute degree for importance-based sizing (counts incident edges)
  if (edges.length > 0) {
    const deg = new Map<string, number>();
    for (const e of edges) {
      const s = String(e.source);
      const t = String(e.target);
      deg.set(s, (deg.get(s) ?? 0) + 1);
      deg.set(t, (deg.get(t) ?? 0) + 1);
    }
    for (const n of people) n.degree = deg.get(n.id) ?? 0;
    // post nodes could also get degree if you want:
    // for (const p of postNodes) (p as any).degree = deg.get(p.id) ?? 0;
  }

  return {
    nodes: [...people, ...postNodes],
    edges,
  };
}
