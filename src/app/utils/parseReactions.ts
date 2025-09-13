// src/app/utils/parseReactions.ts
import Papa from 'papaparse';
import type { LinkEdge } from '../types/linkedin';

/**
 * Parse Reactions.csv into edges: person -> post
 */
export function parseReactions(csv: string): LinkEdge[] {
  const { data } = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
  });

  return (data as Record<string, string>[]).map((row, i) => {
    const actor = row['Profile URL'] || row['Person ID'] || `actor-${i}`;
    const post = row['Update URN'] || row['Post URN'] || row['Content URN'] || `post-${i}`;
    const date = row['Date'] || row['Created At'];

    return {
      source: actor,
      target: post,
      type: 'reacted',
      date,
    };
  });
}
