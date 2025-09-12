// src/app/utils/extractCsvFromFile.ts
import JSZip from 'jszip';

export type ExtractedCsv = {
  connections?: string | null;
  invitations?: string | null;
  shares?: string | null;
  comments?: string | null;
  reactions?: string | null;
  // add more later if you want (messages, endorsements, etc.)
};

/**
 * Accepts a File that is either:
 *   - a single CSV (Connections.csv, Shares.csv, etc.)
 *   - a LinkedIn data .zip containing multiple CSVs
 * Returns the CSV text(s) if found.
 */
export async function extractCsvFromFile(file: File): Promise<ExtractedCsv> {
  const name = file.name.toLowerCase();

  // Single CSV path
  if (name.endsWith('.csv')) {
    const text = await file.text();

    // Quick sniff: decide which bucket it belongs to
    if (/connections\.csv$/i.test(file.name) || text.includes('Connected On')) {
      return { connections: text };
    }
    if (/shares\.csv$/i.test(file.name) || text.includes('ShareLink')) {
      return { shares: text };
    }
    if (/comments\.csv$/i.test(file.name) || text.includes('Comment')) {
      return { comments: text };
    }
    if (/reactions\.csv$/i.test(file.name) || text.includes('Reaction')) {
      return { reactions: text };
    }
    if (/invitations\.csv$/i.test(file.name) || text.includes('Invitation')) {
      return { invitations: text };
    }

    // fallback if unknown
    return { connections: text };
  }

  if (!name.endsWith('.zip')) {
    return {
      connections: null,
      invitations: null,
      shares: null,
      comments: null,
      reactions: null,
    };
  }

  // ZIP path: scan for common filenames (case-insensitive)
  const zip = await JSZip.loadAsync(file);
  const files = Object.keys(zip.files);

  const find = (candidates: string[]) =>
    candidates
      .map((c) => files.find((f) => f.toLowerCase().endsWith(c.toLowerCase())))
      .find(Boolean);

  const connPath = find(['connections.csv']);
  const invitePath = find(['invitations.csv']);
  const sharePath = find(['shares.csv']);
  const commentPath = find(['comments.csv']);
  const reactionPath = find(['reactions.csv']);

  const load = async (path: string | undefined | null) =>
    path ? await zip.file(path)!.async('string') : null;

  const connections = await load(connPath);
  const invitations = await load(invitePath);
  const shares = await load(sharePath);
  const comments = await load(commentPath);
  const reactions = await load(reactionPath);

  return { connections, invitations, shares, comments, reactions };
}
