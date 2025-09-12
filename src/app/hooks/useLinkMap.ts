// src/app/hooks/useLinkMap.ts
import { create } from 'zustand';
import type { LinkedInRawRecord, PostNode, EdgeType } from '../types/linkedin';
import { parseCsv } from '../utils/parseCsv';
import { parseShares } from '../utils/parseShares';
import { parseComments } from '../utils/parseComments';
import { parseReactions } from '../utils/parseReactions';

const errMsg = (err: unknown, fallback: string) =>
  err instanceof Error ? err.message : fallback;

/** People↔Posts interaction (aligns with EdgeType) */
export type Interaction = {
  actorName: string;
  actorPersonId?: string;
  targetPostId: string;
  type: EdgeType;
  date?: string;
};

type LinkMapStore = {
  // Parsed inputs
  raw: LinkedInRawRecord[];
  posts: PostNode[];
  interactions: Interaction[];
  invitations: {
    direction: 'sent' | 'received';
    name?: string;
    date?: string;
  }[];

  // UX state
  errors: string[];
  isLoading: boolean;

  // Loaders
  loadRaw: (text: string) => Promise<void>;
  loadPosts: (text: string) => Promise<void>;
  loadInteractions: (bundle: {
    commentsCsv?: string | null;
    reactionsCsv?: string | null;
  }) => Promise<void>;
  loadInvitations: () => Promise<void>;

  // Utils
  reset: () => void;
  clearErrors: () => void;
};

type ShareRow = {
  postId?: string;
  createdAt?: string;
  url?: string;
  text?: string;
  sharedUrl?: string;
  visibility?: string;
};

type CommentRow = {
  actorName?: string;
  postId?: string;
  createdAt?: string;
  text?: string;
};

type ReactionRow = {
  actorName?: string;
  postId?: string;
  createdAt?: string;
  reaction?: string;
};

export const useLinkMap = create<LinkMapStore>((set, get) => {
  let loading = 0;
  const begin = () => {
    loading += 1;
    set({ isLoading: true });
  };
  const end = () => {
    loading = Math.max(0, loading - 1);
    if (!loading) set({ isLoading: false });
  };

  // helper: build a quick name → personId map
  function buildNameIndex(rows: LinkedInRawRecord[]) {
    const m = new Map<string, string>(); // lowercased full name -> id (index as string)
    rows.forEach((r, i) => {
      const key = [r.firstName, r.lastName]
        .filter(Boolean)
        .join(' ')
        .trim()
        .toLowerCase();
      if (key) m.set(key, String(i));
    });
    return m;
  }

  // helper: normalize a "post id" string used for PostNode.id
  function normPostId(x?: string) {
    return x && x.trim() ? `post:${x.trim()}` : '';
  }

  return {
    raw: [],
    posts: [],
    interactions: [],
    invitations: [],

    errors: [],
    isLoading: false,

    async loadRaw(text: string) {
      try {
        begin();
        const rows = parseCsv(text);
        set((s: LinkMapStore) => ({ ...s, raw: rows }));
      } catch (err: unknown) {
        set((s: LinkMapStore) => ({
          ...s,
          raw: [],
          errors: [...s.errors, errMsg(err, 'Failed to parse Connections.csv')],
        }));
      } finally {
        end();
      }
    },

    async loadPosts(text: string) {
      try {
        begin();
        const shares = parseShares(text) as ShareRow[];
        const posts: PostNode[] = shares.map((s, idx) => ({
          id: normPostId(s.postId) || `post:auto:${idx}`,
          kind: 'post',
          name:
            s.text ||
            s.sharedUrl ||
            s.url ||
            (s.postId ? `Post ${s.postId}` : `Post ${idx + 1}`),
          url: s.url,
          createdAt: s.createdAt,
          topics: [], // keep for later
        }));
        set((st: LinkMapStore) => ({ ...st, posts }));
      } catch (err: unknown) {
        set((s: LinkMapStore) => ({
          ...s,
          posts: [],
          errors: [...s.errors, errMsg(err, 'Failed to parse Shares.csv')],
        }));
      } finally {
        end();
      }
    },

    async loadInteractions(bundle: {
      commentsCsv?: string | null;
      reactionsCsv?: string | null;
    }) {
      try {
        begin();
        const { raw, posts } = get();
        const nameIdx = buildNameIndex(raw);
        const postIdSet = new Set(posts.map((p) => p.id));

        const all: Interaction[] = [];

        if (bundle.commentsCsv) {
          const comments = parseComments(bundle.commentsCsv) as CommentRow[];
          for (const c of comments) {
            const actorKey = (c.actorName ?? '').trim().toLowerCase();
            const actorPersonId = actorKey ? nameIdx.get(actorKey) : undefined;
            const pid = normPostId(c.postId);
            if (!pid || !postIdSet.has(pid)) continue;
            all.push({
              actorName: c.actorName ?? '',
              actorPersonId,
              targetPostId: pid,
              type: 'commented',
              date: c.createdAt,
            });
          }
        }

        if (bundle.reactionsCsv) {
          const reactions = parseReactions(
            bundle.reactionsCsv
          ) as ReactionRow[];
          for (const r of reactions) {
            const actorKey = (r.actorName ?? '').trim().toLowerCase();
            const actorPersonId = actorKey ? nameIdx.get(actorKey) : undefined;
            const pid = normPostId(r.postId);
            if (!pid || !postIdSet.has(pid)) continue;
            all.push({
              actorName: r.actorName ?? '',
              actorPersonId,
              targetPostId: pid,
              type: 'liked', // treat all as 'liked' for now
              date: r.createdAt,
            });
          }
        }

        set((st: LinkMapStore) => ({ ...st, interactions: all }));
      } catch (err: unknown) {
        set((s: LinkMapStore) => ({
          ...s,
          interactions: [],
          errors: [...s.errors, errMsg(err, 'Failed to parse interactions')],
        }));
      } finally {
        end();
      }
    },

    async loadInvitations() {
      // no-op (placeholder)
    },

    reset() {
      loading = 0;
      set({
        raw: [],
        posts: [],
        interactions: [],
        invitations: [],
        errors: [],
        isLoading: false,
      });
    },

    clearErrors() {
      set((s: LinkMapStore) => ({ ...s, errors: [] }));
    },
  };
});
