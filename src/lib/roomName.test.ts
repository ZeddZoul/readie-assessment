import { decodeRoomSegment, parseRoomName, roomApiPath, roomPath, roomSegmentFromPathname } from './roomName';

const BRIEF = 'campaign_119interview~~stephtester1@readie.io~~a3953942a9f2';
const SPACED = 'campaign_119interview~~fpqwz0gqfv 12@lnovic.com';

describe('room name codec', () => {
  it('encodes the brief example once for routes and the API', () => {
    expect(roomPath(BRIEF)).toBe('/jobs/room/campaign_119interview~~stephtester1%40readie.io~~a3953942a9f2');
    expect(roomApiPath(BRIEF)).toBe('/roomsHACKATHON/campaign_119interview~~stephtester1%40readie.io~~a3953942a9f2');
  });

  it('encodes spaces as %20 and appends the tab', () => {
    expect(roomPath(SPACED, 'identity')).toBe('/jobs/room/campaign_119interview~~fpqwz0gqfv%2012%40lnovic.com?tab=identity');
  });

  it('round-trips names with %, /, #, ? and emoji', () => {
    for (const name of ['a%20b', 'x/y@z', 'room#1?q=2', 'cand 🙂@ex.io', '100%']) {
      const seg = roomSegmentFromPathname(roomPath(name));
      expect(seg).not.toBeNull();
      expect(decodeRoomSegment(seg ?? '')).toEqual({ ok: true, value: name });
    }
  });

  it('reports malformed and empty segments instead of throwing', () => {
    expect(decodeRoomSegment('%E0%A4%A')).toEqual({ ok: false, reason: 'malformed' });
    expect(decodeRoomSegment('%')).toEqual({ ok: false, reason: 'malformed' });
    expect(decodeRoomSegment('')).toEqual({ ok: false, reason: 'empty' });
  });

  it('extracts the raw segment only from room paths', () => {
    expect(roomSegmentFromPathname('/jobs/room/a%40b/')).toBe('a%40b');
    expect(roomSegmentFromPathname('/jobs/campaign/119')).toBeNull();
  });

  it('parses campaign id, email and suffix', () => {
    expect(parseRoomName(BRIEF)).toEqual({ campaignId: 119, email: 'stephtester1@readie.io', suffix: 'a3953942a9f2' });
    expect(parseRoomName(SPACED)).toEqual({ campaignId: 119, email: 'fpqwz0gqfv 12@lnovic.com', suffix: null });
    expect(parseRoomName('weird')).toEqual({ campaignId: null, email: null, suffix: null });
  });
});
