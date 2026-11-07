import fc from 'fast-check';
import { phase2Arb, campaignJobArb } from '../test/arbitraries';
import { parseRoomRecordings, toEvaluationJob } from './adapters';
import { INTEGRITY_RANK, deriveIntegrityStatus, deriveVerificationStatus } from './derive';
import type { RiskLevel } from './types';

const ORDER: readonly RiskLevel[] = ['LOW', 'MEDIUM', 'HIGH'];
const known = fc.constantFrom<RiskLevel>('LOW', 'MEDIUM', 'HIGH');

describe('derivation properties', () => {
  // Property 4 — Validates: Requirements 2.5
  it('Property 4: verification status is total and consistent', () => {
    fc.assert(
      fc.property(campaignJobArb, (raw) => {
        const job = toEvaluationJob(raw);
        expect(job).not.toBeNull();
        expect(['COMPLETED', 'IN_PROGRESS', 'FAILED']).toContain(job?.verificationStatus);
        if (raw.analyticsCompleted) expect(job?.verificationStatus).toBe('COMPLETED');
        expect(job?.verificationStatus).toBe(
          deriveVerificationStatus({
            analyticsCompleted: raw.analyticsCompleted,
            percent: raw.percentageAnalyticCompleted,
            videoCount: raw.campaign_assessment_video_link?.length ?? 0,
          }),
        );
      }),
      { numRuns: 200 },
    );
  });

  // Property 7 — Validates: Requirements 9.2
  it('Property 7: integrity status is monotone in risk', () => {
    fc.assert(
      fc.property(
        known,
        fc.array(known, { minLength: 1, maxLength: 4 }),
        fc.nat(),
        fc.constantFrom('PASS_WITH_LOW_RISK', 'REVIEW_REQUIRED', 'X'),
        fc.boolean(),
        fc.nat({ max: 2 }),
        (overall, risks, idxSeed, disposition, review, ranges) => {
          const idx = idxSeed % risks.length;
          const before = deriveIntegrityStatus({ overallRisk: overall, signalRisks: risks, disposition, humanReviewRequired: review, suspiciousRangeCount: ranges });
          const current = risks[idx] ?? 'LOW';
          const raised = ORDER[Math.min(ORDER.indexOf(current) + 1, 2)] ?? 'HIGH';
          const next = risks.map((r, i) => (i === idx ? raised : r));
          const after = deriveIntegrityStatus({ overallRisk: overall, signalRisks: next, disposition, humanReviewRequired: review, suspiciousRangeCount: ranges });
          expect(INTEGRITY_RANK[after]).toBeGreaterThanOrEqual(INTEGRITY_RANK[before]);
          if (next.includes('HIGH')) expect(after).toBe('FAILED');
        },
      ),
      { numRuns: 300 },
    );
  });

  // Property 8 — Validates: Requirements 9.1, 8.4
  it('Property 8: derived proctoring metrics are bounded', () => {
    fc.assert(
      fc.property(phase2Arb, fc.boolean(), (phase2, multiplePeople) => {
        const res = parseRoomRecordings(
          [
            {
              roomName: 'r',
              campaignId: 1,
              createdAt: '2026-01-01T00:00:00',
              analytic: {
                identity_phase1: { decision: 'CONSISTENT', confidence: 0.9, multiplePeopleDetected: multiplePeople },
                deepfake_phase2: phase2,
                disposition: 'X',
                humanReviewRequired: false,
              },
            },
          ],
          'r',
        );
        expect(res.ok).toBe(true);
        if (!res.ok) return;
        const integrity = res.value?.analysed[0]?.integrity;
        expect(integrity).toBeTruthy();
        if (!integrity) return;
        const g = integrity.gazeTrackingIndex;
        if (g !== null) {
          expect(Number.isInteger(g)).toBe(true);
          expect(g).toBeGreaterThanOrEqual(0);
          expect(g).toBeLessThanOrEqual(100);
          const risk = integrity.signals.find((s) => s.key === 'possibleOffScreenAssistance')?.risk;
          if (risk === 'LOW') expect(g).toBeGreaterThanOrEqual(67);
          if (risk === 'HIGH') expect(g).toBeLessThanOrEqual(33);
        }
        expect(Number.isInteger(integrity.audioAnomalyCount)).toBe(true);
        expect(integrity.audioAnomalyCount).toBeGreaterThanOrEqual(0);
        const allLow = integrity.signals.every((s) => s.risk === 'LOW');
        if (allLow && integrity.suspiciousTimeRanges.length === 0 && !multiplePeople) expect(integrity.flaggedFrames).toHaveLength(0);
      }),
      { numRuns: 200 },
    );
  });

  // Property 10 — Validates: Requirements 7.1, 7.2, 7.3
  it('Property 10: transcript is an ordered permutation with one role per entry', () => {
    fc.assert(
      fc.property(phase2Arb, (phase2) => {
        const res = parseRoomRecordings(
          [{ roomName: 'r', campaignId: 1, createdAt: '2026-01-01T00:00:00', analytic: { deepfake_phase2: phase2 } }],
          'r',
        );
        if (!res.ok) throw new Error('unexpected');
        const transcript = res.value?.analysed[0]?.transcript ?? [];
        expect(transcript).toHaveLength(phase2.gemini?.transcript?.entries?.length ?? 0);
        let seenNull = false;
        let last = -Infinity;
        for (const e of transcript) {
          expect(['interviewer', 'candidate', 'other']).toContain(e.role);
          if (e.timestampSec === null) seenNull = true;
          else {
            expect(seenNull).toBe(false);
            expect(e.timestampSec).toBeGreaterThanOrEqual(last);
            last = e.timestampSec;
          }
        }
      }),
      { numRuns: 200 },
    );
  });
});
