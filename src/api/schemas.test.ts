import fc from 'fast-check';
import { campaignJobs, roomRecordings } from '../mocks/fixtures';
import { campaignJobsResponseSchema, formatIssues, roomResponseSchema } from './schemas';

describe('schemas', () => {
  it('accept every campaign fixture', () => {
    for (const jobs of Object.values(campaignJobs)) expect(campaignJobsResponseSchema.safeParse(jobs).success).toBe(true);
  });

  it('reject a job missing roomName with a readable issue', () => {
    const first = campaignJobs[119]?.[0];
    const { roomName: _omit, ...broken } = first ?? { roomName: '' };
    const res = campaignJobsResponseSchema.safeParse([broken]);
    expect(res.success).toBe(false);
    if (!res.success) expect(formatIssues(res.error).join()).toMatch(/0\.roomName/);
  });

  it('reject wrong types', () => {
    expect(campaignJobsResponseSchema.safeParse([{ ...campaignJobs[119]?.[0], campaignId: '119' }]).success).toBe(false);
    expect(roomResponseSchema.safeParse({ not: 'an array' }).success).toBe(false);
  });

  // Property 15 — Validates: Requirements 13.1
  it('Property 15: every room fixture matches the live contract', () => {
    const entries = Object.entries(roomRecordings);
    fc.assert(
      fc.property(fc.constantFrom(...entries), ([, recs]) => {
        expect(roomResponseSchema.safeParse(recs).success).toBe(true);
      }),
      { numRuns: entries.length * 3 },
    );
  });
});
