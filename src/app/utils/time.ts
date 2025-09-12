// src/app/utils/time.ts
/** Returns epoch ms, or NaN if input is falsy/invalid. */
export function ts(s?: string): number {
  if (!s) return NaN;
  const n = Date.parse(s);
  return Number.isFinite(n) ? n : NaN;
}
