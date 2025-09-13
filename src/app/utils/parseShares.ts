// src/app/utils/parseShares.ts

/**
 * We return a normalized "share row" shape that useLinkMap
 * later turns into PostNode objects. This avoids NodeKind typing issues.
 */
export type ShareRow = {
  postId?: string;
  createdAt?: string;
  url?: string;
  text?: string;
  sharedUrl?: string;
  visibility?: string;
};

/** Very light CSV parser that handles quoted commas. */
function parseCsvLoose(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(Boolean);
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

  for (let li = 1; li < lines.length; li++) {
    const cells = split(lines[li]);
    if (cells.length === 1 && cells[0].trim() === '') continue;
    const rec: Record<string, string> = {};
    headers.forEach((h, idx) => (rec[h] = (cells[idx] ?? '').trim()));
    rows.push(rec);
  }
  return rows;
}

/**
 * Parse Shares.csv and return a lightweight array that the store
 * converts into PostNode[].
 */
export function parseShares(csvText: string): ShareRow[] {
  const data = parseCsvLoose(csvText);

  // Common LinkedIn headers (be flexible with casing/aliases)
  const rows: ShareRow[] = data.map((r) => {
    const postId =
      r['Post ID'] ||
      r['PostId'] ||
      r['ShareId'] ||
      r['Share ID'] ||
      r['UpdateId'] ||
      r['Update ID'] ||
      '';

    const createdAt = r['Created At'] || r['CreatedAt'] || r['Date'] || r['Timestamp'] || '';

    const url = r['Url'] || r['URL'] || r['Link'] || r['Permalink'] || '';

    const text = r['Text'] || r['Content'] || r['Body'] || r['Message'] || '';

    const sharedUrl = r['ShareLink'] || r['Shared Url'] || r['SharedUrl'] || '';

    const visibility = r['Visibility'] || r['Audience'] || '';

    return {
      postId: postId || undefined,
      createdAt: createdAt || undefined,
      url: url || undefined,
      text: text || undefined,
      sharedUrl: sharedUrl || undefined,
      visibility: visibility || undefined,
    };
  });

  return rows;
}
