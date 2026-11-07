import fc from 'fast-check';
import type { RawCampaignJob, RawDeepfakePhase2, RawObservation, RawRiskSignal, RawRoomRecording } from '../api/raw-types';

/** Room names biased towards the delimiters and characters that break URLs. */
export const roomNameArb: fc.Arbitrary<string> = fc.oneof(
  fc.string({ unit: 'grapheme', minLength: 1, maxLength: 40 }),
  fc
    .tuple(
      fc.integer({ min: 1, max: 999 }),
      fc.array(fc.constantFrom('a', 'Z', '7', '.', '@', ' ', '%', '/', '#', '?', '&', '+', '~', 'é', '日', '🙂', '%20', '%2F'), {
        minLength: 1,
        maxLength: 20,
      }),
      fc.option(fc.string({ unit: fc.constantFrom(...'0123456789abcdef'), minLength: 12, maxLength: 12 }), { nil: undefined }),
    )
    .map(([id, chars, suffix]) => `campaign_${id}interview~~${chars.join('')}${suffix ? `~~${suffix}` : ''}`),
);

export const riskArb = fc.constantFrom('LOW', 'MEDIUM', 'HIGH', 'low', 'UNKNOWN_VALUE', '');
export const clockArb = fc.oneof(
  fc.tuple(fc.integer({ min: 0, max: 99 }), fc.integer({ min: 0, max: 59 })).map(([m, s]) => `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`),
  fc.constantFrom('', 'n/a', '1:02:03'),
);

export const observationArb: fc.Arbitrary<RawObservation> = fc.record({
  timestamp: clockArb,
  source: fc.constant('GEMINI'),
  category: fc.constantFrom('SYNTHETIC_VIDEO', 'PERSON_CONTINUITY', 'AUDIO_VIDEO', 'OFF_SCREEN_ACTIVITY'),
  observation: fc.string({ maxLength: 30 }),
});

export const riskSignalArb: fc.Arbitrary<RawRiskSignal> = fc.record({
  risk: riskArb,
  confidence: fc.double({ min: 0, max: 1, noNaN: true }),
  observations: fc.array(observationArb, { maxLength: 4 }),
});

export const phase2Arb: fc.Arbitrary<RawDeepfakePhase2> = fc.record({
  gemini: fc.record({
    overallRisk: riskArb,
    syntheticVideo: riskSignalArb,
    personContinuity: riskSignalArb,
    audioVideoConsistency: riskSignalArb,
    possibleOffScreenAssistance: riskSignalArb,
    suspiciousTimeRanges: fc.array(
      fc.oneof(
        fc.record({ start: clockArb, end: clockArb, category: fc.constantFrom('AUDIO', 'VIDEO', 'GAZE'), reason: fc.string({ maxLength: 20 }) }),
        fc.tuple(clockArb, clockArb).map(([a, b]) => `${a}-${b}`),
      ),
      { maxLength: 3 },
    ),
    limitations: fc.array(fc.string({ maxLength: 20 }), { maxLength: 3 }),
    transcript: fc.record({
      entries: fc.array(
        fc.record({ timestamp: clockArb, speaker: fc.constantFrom('INTERVIEWER', 'INTERVIEWEE', 'PARTICIPANT', 'AI', 'x'), text: fc.string({ maxLength: 20 }) }),
        { maxLength: 6 },
      ),
    }),
  }),
  specialistResults: fc.constant([]),
  disposition: fc.constantFrom('PASS_WITH_LOW_RISK', 'REVIEW_REQUIRED', 'FAIL_HIGH_RISK', 'SOMETHING_NEW'),
  humanReviewRequired: fc.boolean(),
});

const isoArb = fc
  .date({ min: new Date('2020-01-01T00:00:00Z'), max: new Date('2030-01-01T00:00:00Z'), noInvalidDate: true })
  .map((d) => d.toISOString().replace('Z', '+00:00'));

export const campaignJobArb: fc.Arbitrary<RawCampaignJob> = fc.record({
  roomName: roomNameArb,
  campaignId: fc.integer({ min: 1, max: 999 }),
  candidateName: fc.option(fc.string({ maxLength: 20 }), { nil: null }),
  candidateEmail: fc.emailAddress(),
  candidateDateCreated: isoArb,
  analyticsCompleted: fc.boolean(),
  percentageAnalyticCompleted: fc.oneof(fc.constant(0), fc.constant(100), fc.double({ min: 0, max: 100, noNaN: true })),
  campaign_assessment_video_link: fc.option(fc.array(fc.record({ created_at: fc.constant('2026-10-20 10:00:00.000000') }), { maxLength: 2 }), {
    nil: null,
  }),
});

export const roomRecordingArb: fc.Arbitrary<RawRoomRecording> = fc.record({
  roomName: fc.constant('campaign_1interview~~a@b.c~~abcdef123456'),
  campaignId: fc.constant(1),
  createdAt: fc
    .date({ min: new Date('2024-01-01T00:00:00Z'), max: new Date('2030-01-01T00:00:00Z'), noInvalidDate: true })
    .map((d) => d.toISOString().replace('Z', '')),
  analytic: fc.option(
    fc.record({
      identity_phase1: fc.constant(null),
      deepfake_phase2: phase2Arb,
      disposition: fc.constantFrom('PASS_WITH_LOW_RISK', 'REVIEW_REQUIRED'),
      humanReviewRequired: fc.boolean(),
    }),
    { nil: null },
  ),
  analyticsCompleted: fc.constantFrom('Y', 'P', 'N'),
});
