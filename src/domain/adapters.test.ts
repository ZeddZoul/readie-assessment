import { ROOMS, campaignJobs, roomRecordings } from '../mocks/fixtures';
import { parseCampaignJobs, parseRoomRecordings } from './adapters';

describe('parseCampaignJobs', () => {
  it('maps campaign 119 with each verification status and the name placeholder source', () => {
    const res = parseCampaignJobs(campaignJobs[119]);
    if (!res.ok) throw new Error('expected ok');
    expect(res.value.map((j) => j.verificationStatus)).toEqual(['COMPLETED', 'IN_PROGRESS', 'FAILED', 'IN_PROGRESS']);
    expect(res.value[2]?.candidateName).toBeNull();
    expect(res.value[0]?.submittedAt.toISOString()).toBe('2026-10-27T09:17:20.822Z');
  });

  it('returns an empty list for empty campaigns', () => {
    expect(parseCampaignJobs([])).toEqual({ ok: true, value: [] });
  });

  it('returns a validation error for bad shapes and bad dates', () => {
    const bad = parseCampaignJobs({ nope: true });
    expect(bad.ok).toBe(false);
    const badDate = parseCampaignJobs([{ ...campaignJobs[119]?.[0], candidateDateCreated: 'yesterday' }]);
    expect(badDate.ok ? null : badDate.error.kind).toBe('validation');
  });
});

describe('parseRoomRecordings', () => {
  it('returns null for an empty room', () => {
    expect(parseRoomRecordings([], ROOMS.katherine)).toEqual({ ok: true, value: null });
  });

  it('orders analysed recordings newest first and defaults to the newest', () => {
    const res = parseRoomRecordings(roomRecordings[ROOMS.ada], ROOMS.ada);
    if (!res.ok || !res.value) throw new Error('expected room');
    const room = res.value;
    expect(room.recordingCount).toBe(4);
    expect(room.analysed.map((r) => r.integrity?.status)).toEqual(['PASSED', 'WARNING', 'FAILED']);
    expect(room.defaultRecordingId).toBe(room.analysed[0]?.id);
    expect(room.candidateEmail).toBe('ada.lovelace@example.test');
    expect(room.completeness).toBe('complete');
  });

  it('maps the failing recording to anomalies, flagged frames and audio anomalies', () => {
    const res = parseRoomRecordings(roomRecordings[ROOMS.ada], ROOMS.ada);
    if (!res.ok || !res.value) throw new Error('expected room');
    const failed = res.value.analysed[2];
    expect(failed?.identity?.decision).toBe('INCONSISTENT');
    expect(failed?.identity?.anomalies.map((a) => a.kind)).toEqual(['conflicting-evidence', 'multiple-people', 'low-video-quality']);
    expect(failed?.integrity?.audioAnomalyCount).toBe(2);
    expect(failed?.integrity?.gazeTrackingIndex).toBe(5);
    expect(failed?.integrity?.flaggedFrames.length).toBe(6);
    // Live API sends some ranges as bare "mm:ss-mm:ss" strings.
    expect(failed?.integrity?.suspiciousTimeRanges.map((r) => r.label)).toEqual(['00:50–01:00', '01:15–01:25']);
  });

  it('handles recordings without analysis and null identity', () => {
    const grace = parseRoomRecordings(roomRecordings[ROOMS.grace], ROOMS.grace);
    if (!grace.ok || !grace.value) throw new Error('expected room');
    expect(grace.value.analysed).toHaveLength(0);
    expect(grace.value.defaultRecordingId).toBeNull();
    expect(grace.value.completeness).toBe('partial');

    const alan = parseRoomRecordings(roomRecordings[ROOMS.alan], ROOMS.alan);
    if (!alan.ok || !alan.value) throw new Error('expected room');
    expect(alan.value.analysed[0]?.identity).toBeNull();
    expect(alan.value.analysed[0]?.transcript).toHaveLength(0);
    expect(alan.value.analysed[0]?.overallDisposition).toBe('REVIEW_REQUIRED');
    expect(alan.value.analysed[0]?.integrity?.status).toBe('PASSED');
  });

  it('classifies all three speaker types', () => {
    const res = parseRoomRecordings(roomRecordings[ROOMS.ada], ROOMS.ada);
    if (!res.ok || !res.value) throw new Error('expected room');
    expect(new Set(res.value.analysed[0]?.transcript.map((t) => t.role))).toEqual(new Set(['interviewer', 'candidate', 'other']));
  });
});
