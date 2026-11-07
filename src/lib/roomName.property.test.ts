import fc from 'fast-check';
import { roomNameArb } from '../test/arbitraries';
import { decodeRoomSegment, roomApiPath, roomPath, roomSegmentFromPathname } from './roomName';

describe('room name properties', () => {
  // Property 1 — Validates: Requirements 5.1, 5.2, 5.4, 5.6
  it('Property 1: route path round-trips and the segment has no reserved delimiters', () => {
    fc.assert(
      fc.property(roomNameArb, (name) => {
        const seg = roomSegmentFromPathname(roomPath(name));
        expect(seg).not.toBeNull();
        expect(seg).not.toMatch(/[/?#]/);
        expect(decodeRoomSegment(seg ?? '')).toEqual({ ok: true, value: name });
      }),
      { numRuns: 300 },
    );
  });

  // Property 2 — Validates: Requirements 5.3, 6.1
  it('Property 2: API path is encoded exactly once', () => {
    fc.assert(
      fc.property(roomNameArb, (name) => {
        const seg = roomApiPath(name).slice('/roomsHACKATHON/'.length);
        expect(decodeURIComponent(seg)).toBe(name);
        if (!name.includes('%')) expect(seg).not.toContain('%25');
      }),
      { numRuns: 300 },
    );
  });

  // Property 3 — Validates: Requirements 5.7
  it('Property 3: malformed segments decode to an error, never throw', () => {
    const malformed = fc.string({ maxLength: 10 }).map((s) => `${s}%${s.length % 2 ? 'G' : ''}`);
    fc.assert(
      fc.property(malformed, (seg) => {
        let threw = false;
        try {
          decodeURIComponent(seg);
        } catch {
          threw = true;
        }
        const res = decodeRoomSegment(seg);
        if (threw) expect(res).toEqual({ ok: false, reason: 'malformed' });
      }),
      { numRuns: 200 },
    );
  });
});
