// src/app/utils/parseInvitations.ts
import type { LinkEdge } from '../types/linkedin';

/** Very light CSV parser that handles quoted commas. */
function parseCsvLoose(text: string): Record<string, string>[] {
  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter(Boolean);
  if (lines.length === 0) return [];

  const split = (line: string) => {
    const out: string[] = [];
    let cur = '';
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (q && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          q = !q;
        }
      } else if (ch === ',' && !q) {
        out.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out;
  };

  const headers = split(lines[0]).map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = split(lines[i]);
    if (cells.length === 1 && cells[0].trim() === '') continue;
    const rec: Record<string, string> = {};
    headers.forEach((h, idx) => (rec[h] = (cells[idx] ?? '').trim()));
    rows.push(rec);
  }
  return rows;
}

type InviteCsvRow = {
  From?: string;
  To?: string;
  Direction?: string; // keep but we won't put it on LinkEdge (not in type)
  SentAt?: string;
  'Inviter Name'?: string;
  'Invitee Name'?: string;
  'Sent At'?: string;
};

/**
 * Parse Invitations.csv into LinkEdge[] (type = 'invited').
 * We keep only fields defined on LinkEdge to satisfy typing.
 */
export function parseInvitations(csvText: string): LinkEdge[] {
  const rows = parseCsvLoose(csvText) as InviteCsvRow[];
  const edges: LinkEdge[] = [];

  for (const r of rows) {
    const from = r.From || r['Inviter Name'] || '';
    const to = r.To || r['Invitee Name'] || '';
    const sentAt = r.SentAt || r['Sent At'] || '';

    const srcName = (from ?? '').trim();
    const dstName = (to ?? '').trim();
    if (!srcName && !dstName) continue;

    const source = srcName
      ? `person:${srcName.toLowerCase()}`
      : 'person:unknown_src';
    const target = dstName
      ? `person:${dstName.toLowerCase()}`
      : 'person:unknown_dst';

    edges.push({
      source,
      target,
      type: 'invited',
      weight: 1,
      date: sentAt || undefined,
    });
  }

  return edges;
}
