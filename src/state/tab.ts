import { isOneOf } from '../lib/guards';

export const ROOM_TABS = ['transcript', 'identity', 'integrity'] as const;
export type RoomTab = (typeof ROOM_TABS)[number];
export const DEFAULT_TAB: RoomTab = 'transcript';

export const TAB_LABELS: Readonly<Record<RoomTab, string>> = {
  transcript: 'Transcript',
  identity: 'Identity Verification',
  integrity: 'Integrity & Proctoring',
};

/** Compact labels for narrow screens; the full label stays the accessible name. */
export const TAB_SHORT_LABELS: Readonly<Record<RoomTab, string>> = {
  transcript: 'Transcript',
  identity: 'Identity',
  integrity: 'Integrity',
};

export function isRoomTab(value: string): value is RoomTab {
  return isOneOf(ROOM_TABS, value);
}

export function parseTab(value: string | null): { tab: RoomTab; wasValid: boolean } {
  if (value !== null && isRoomTab(value)) return { tab: value, wasValid: true };
  return { tab: DEFAULT_TAB, wasValid: false };
}
