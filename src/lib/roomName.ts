import type { RoomTab } from '../state/tab';

export const ROOM_ROUTE_PREFIX = '/jobs/room/';

export type DecodeResult = { ok: true; value: string } | { ok: false; reason: 'malformed' | 'empty' };

/** The single place a room name is encoded for the router. Encodes exactly once. */
export function roomPath(roomName: string, tab?: RoomTab): string {
  const base = ROOM_ROUTE_PREFIX + encodeURIComponent(roomName);
  return tab ? `${base}?tab=${tab}` : base;
}

/** The single place a room name is encoded for the API. Encodes exactly once (`@` → `%40`, space → `%20`). */
export function roomApiPath(roomName: string): string {
  return '/roomsHACKATHON/' + encodeURIComponent(roomName);
}

/** Decodes a raw (still percent-encoded) route segment exactly once. Never throws. */
export function decodeRoomSegment(segment: string): DecodeResult {
  if (segment === '') return { ok: false, reason: 'empty' };
  try {
    return { ok: true, value: decodeURIComponent(segment) };
  } catch {
    return { ok: false, reason: 'malformed' };
  }
}

/** Extracts the raw room segment from a percent-encoded pathname, or null if it is not a room path. */
export function roomSegmentFromPathname(pathname: string): string | null {
  if (!pathname.startsWith(ROOM_ROUTE_PREFIX)) return null;
  const rest = pathname.slice(ROOM_ROUTE_PREFIX.length);
  return rest.endsWith('/') ? rest.slice(0, -1) : rest;
}

export interface ParsedRoomName {
  readonly campaignId: number | null;
  readonly email: string | null;
  readonly suffix: string | null;
}

/** Room names look like `campaign_119interview~~person@host.io~~a3953942a9f2` (suffix optional). */
export function parseRoomName(roomName: string): ParsedRoomName {
  const campaignMatch = /^campaign_(\d+)/.exec(roomName);
  const campaignId = campaignMatch?.[1] !== undefined ? Number(campaignMatch[1]) : null;
  const parts = roomName.split('~~');
  const email = parts.slice(1).find((p) => p.includes('@')) ?? null;
  const last = parts.length >= 3 ? parts[parts.length - 1] : undefined;
  const suffix = last !== undefined && /^[0-9a-f]{6,}$/i.test(last) ? last : null;
  return { campaignId, email, suffix };
}
