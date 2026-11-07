/**
 * Parses an ISO-8601 timestamp. Zone-less values (the room endpoint's `createdAt`)
 * are UTC on the server, so they are read as UTC. Fractions beyond milliseconds are dropped.
 */
export function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  let v = value.trim().replace(' ', 'T');
  v = v.replace(/(\.\d{3})\d+/, '$1');
  if (!/(Z|[+-]\d{2}:?\d{2})$/i.test(v)) v += 'Z';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Parses "mm:ss", "m:ss" or "h:mm:ss" into seconds. Returns null when unparsable. */
export function parseClock(label: string | null | undefined): number | null {
  if (!label) return null;
  const m = /^\s*(?:(\d+):)?(\d{1,3}):(\d{2})(?:\.\d+)?\s*$/.exec(label);
  if (!m) return null;
  const h = m[1] !== undefined ? Number(m[1]) : 0;
  const min = Number(m[2]);
  const s = Number(m[3]);
  if (s >= 60 || (m[1] !== undefined && min >= 60)) return null;
  return h * 3600 + min * 60 + s;
}

const dateTimeFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
const timeFormat = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' });

export function formatDate(d: Date): string {
  return dateFormat.format(d);
}

export function formatTime(d: Date): string {
  return timeFormat.format(d);
}

export function formatDateTime(d: Date): string {
  return dateTimeFormat.format(d);
}

export function formatPercent(fraction: number): string {
  return `${Math.round(Math.min(1, Math.max(0, fraction)) * 100)}%`;
}
