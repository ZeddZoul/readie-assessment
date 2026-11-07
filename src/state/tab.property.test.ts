import fc from 'fast-check';
import { ROOM_TABS, parseTab } from './tab';

// Property 11 — Validates: Requirements 10.1, 10.2
describe('Property 11: tab parsing is total and canonical', () => {
  it('maps any input to a valid tab', () => {
    fc.assert(
      fc.property(fc.option(fc.string(), { nil: null }), (v) => {
        const { tab, wasValid } = parseTab(v);
        expect(ROOM_TABS).toContain(tab);
        expect(wasValid).toBe(v !== null && ROOM_TABS.some((t) => t === v));
      }),
      { numRuns: 200 },
    );
  });

  it('keeps every valid tab', () => {
    for (const t of ROOM_TABS) expect(parseTab(t)).toEqual({ tab: t, wasValid: true });
  });
});
