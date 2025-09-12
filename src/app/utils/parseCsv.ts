// src/app/utils/parseCsv.ts
import Papa from 'papaparse';
import type { LinkedInRawRecord } from '../types/linkedin';

/** Safely trim unknown values to a string */
function safe(val: unknown): string {
  return typeof val === 'string' ? val.trim() : '';
}

/** LinkedIn exports sometimes include a Notes preamble before headers */
function stripPreamble(text: string): string {
  const noBom = text.replace(/^\uFEFF/, '');
  const lines = noBom.split(/\r?\n/);
  const headerIdx = lines.findIndex((l) => /first\s*name/i.test(l) && /last\s*name/i.test(l));
  return headerIdx === -1 ? noBom : lines.slice(headerIdx).join('\n');
}

/** Normalize LinkedIn-ish URL into https://www.linkedin.com/... */
function normalizeLinkedInUrl(raw?: string): string | undefined {
  const s = safe(raw);
  if (!s) return undefined;

  let u = s;
  if (/^\/(in|pub|company|school)\//i.test(u)) {
    u = `https://www.linkedin.com${u}`;
  }
  if (/^(www\.|linkedin\.com)/i.test(u)) {
    u = `https://${u}`;
  }
  try {
    const url = new URL(u);
    if (url.hostname.endsWith('linkedin.com') && url.hostname !== 'www.linkedin.com') {
      url.hostname = 'www.linkedin.com';
    }
    return url.toString();
  } catch {
    if (/linkedin\.com/i.test(u)) return `https://${u.replace(/^https?:\/\//i, '')}`;
    return undefined;
  }
}

/** Returns the first non-empty value from candidate keys */
function pickFirst(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = safe(obj[k]);
    if (v) return v;
  }
  return undefined;
}

/**
 * Parse LinkedIn Connections.csv → LinkedInRawRecord[]
 */
export function parseCsv(text: string): LinkedInRawRecord[] {
  const clean = stripPreamble(text);

  const { data, errors } = Papa.parse<Record<string, unknown>>(clean, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });

  if (errors.length) {
    const first = errors[0];
    throw new Error(first.message || 'CSV parse error');
  }

  const rows: LinkedInRawRecord[] = (data as Record<string, unknown>[])
    .map((r) => {
      const firstName = pickFirst(r, ['First Name', 'FirstName', 'firstName']) ?? '';
      const lastName = pickFirst(r, ['Last Name', 'LastName', 'lastName']) ?? '';
      const company = pickFirst(r, ['Company', 'Company Name', 'company']);
      const title = pickFirst(r, [
        'Position',
        'Title',
        'Current Position',
        'Current Title',
        'title',
        'position',
      ]);
      const connectedOn = pickFirst(r, ['Connected On', 'connectedOn', 'ConnectedOn']);
      const url = normalizeLinkedInUrl(
        pickFirst(r, [
          'URL',
          'Public Profile URL',
          'Profile URL',
          'LinkedIn Profile URL',
          'LinkedIn URL',
          'LinkedIn',
          'Profile',
          'Url',
          'profileUrl',
          'url',
        ]),
      );

      return { firstName, lastName, company, title, connectedOn, url };
    })
    .filter((row) => row.firstName !== '' || row.lastName !== '');

  return rows;
}
