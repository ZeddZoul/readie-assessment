/**
 * Campaigns the auditor has opened on this device, newest first. There is no "list campaigns"
 * endpoint, so recents plus "type any ID" is how the switcher scales to any number of campaigns.
 * Storage can be unavailable (private mode, blocked site data); every access is guarded.
 */
const KEY = 'readie.recentCampaigns';
const MAX = 8;

/**
 * The campaigns the switcher lists for browsing. The API has no "list campaigns" endpoint, so this is
 * configured via VITE_CAMPAIGNS (comma-separated IDs) and defaults to the brief's test campaigns.
 * Swap in a /campaigns endpoint here later without touching the UI.
 */
export function parseCampaignDirectory(raw: string | undefined): number[] {
  const ids = (raw ?? '')
    .split(',')
    .map((part) => parseCampaignQuery(part))
    .filter((id): id is number => id !== null);
  return ids.length ? [...new Set(ids)] : [119, 120, 122, 123];
}

export const CAMPAIGN_DIRECTORY: readonly number[] = parseCampaignDirectory(import.meta.env.VITE_CAMPAIGNS);

const isCampaignId = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v > 0;

export function readRecentCampaigns(): number[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter(isCampaignId).slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function rememberCampaign(id: number): number[] {
  const next = [id, ...readRecentCampaigns().filter((c) => c !== id)].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // storage unavailable: recents simply won't persist
  }
  return next;
}

/** Parses a typed campaign ID ("123", " 123 ", "#123"); null when it isn't a positive integer. */
export function parseCampaignQuery(query: string): number | null {
  const m = /^#?\s*([1-9]\d{0,8})$/.exec(query.trim());
  return m?.[1] ? Number(m[1]) : null;
}
