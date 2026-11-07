export const ROOMS = {
  ada: 'campaign_119interview~~ada.lovelace@example.test~~a1b2c3d4e5f6',
  alan: 'campaign_119interview~~alan turing 12@example.test',
  slash: 'campaign_123interview~~ops/qa@example.test~~d4e5f6a1b2c3',
} as const;

export const roomUrl = (name: string, tab?: string): string => `/jobs/room/${encodeURIComponent(name)}${tab ? `?tab=${tab}` : ''}`;
