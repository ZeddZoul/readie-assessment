import fc from 'fast-check';
import { roomRecordingArb } from '../test/arbitraries';
import { parseCampaignJobs, parseRoomRecordings } from './adapters';

describe('adapter properties', () => {
  // Property 9 — Validates: Requirements 6.3, 6.4
  it('Property 9: default recording is the newest analysed one', () => {
    fc.assert(
      fc.property(fc.array(roomRecordingArb, { maxLength: 8 }), (recs) => {
        const res = parseRoomRecordings(recs, 'r');
        if (!res.ok) throw new Error('unexpected validation error');
        if (recs.length === 0) {
          expect(res.value).toBeNull();
          return;
        }
        const room = res.value;
        const analysedTimes = recs.filter((r) => r.analytic).map((r) => new Date(`${r.createdAt}Z`).getTime());
        if (analysedTimes.length === 0) {
          expect(room?.defaultRecordingId).toBeNull();
          return;
        }
        const def = room?.analysed.find((a) => a.id === room.defaultRecordingId);
        expect(def?.createdAt.getTime()).toBe(Math.max(...analysedTimes));
      }),
      { numRuns: 200 },
    );
  });

  // Property 12 — Validates: Requirements 14.4, 11.2
  it('Property 12: adapters never throw on arbitrary JSON', () => {
    fc.assert(
      fc.property(fc.jsonValue(), (json) => {
        const a = parseCampaignJobs(json);
        const b = parseRoomRecordings(json, 'r');
        for (const r of [a, b]) if (!r.ok) expect(r.error.kind).toBe('validation');
      }),
      { numRuns: 300 },
    );
  });
});
