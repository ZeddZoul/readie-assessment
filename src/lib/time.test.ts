import { parseClock, parseIsoDate } from './time';

describe('time helpers', () => {
  it('parses ISO with offset, zone-less (as UTC), and microseconds', () => {
    expect(parseIsoDate('2026-10-22T09:32:01.019+00:00')?.toISOString()).toBe('2026-10-22T09:32:01.019Z');
    expect(parseIsoDate('2026-10-22T09:32:01.019101')?.toISOString()).toBe('2026-10-22T09:32:01.019Z');
    expect(parseIsoDate('2026-10-23 13:13:05.000000')?.toISOString()).toBe('2026-10-23T13:13:05.000Z');
    expect(parseIsoDate('nope')).toBeNull();
    expect(parseIsoDate(null)).toBeNull();
  });

  it('parses clock labels', () => {
    expect(parseClock('00:01')).toBe(1);
    expect(parseClock('02:08')).toBe(128);
    expect(parseClock('1:02:03')).toBe(3723);
    expect(parseClock('00:61')).toBeNull();
    expect(parseClock('')).toBeNull();
    expect(parseClock('soon')).toBeNull();
  });
});
