/**
 * Synthetic fixtures mirroring the live API shape (probed 2026-11-05).
 * No personal data from the live API is used: names are historical figures, emails use example.test.
 */
import type { RawCampaignJobsResponse, RawIdentityPhase1, RawRoomResponse } from '../../api/raw-types';
import { analytic, job, line, obs, recording, signal } from './builders';

export const ROOMS = {
  ada: 'campaign_119interview~~ada.lovelace@example.test~~a1b2c3d4e5f6',
  grace: 'campaign_119interview~~grace.hopper@example.test~~b2c3d4e5f6a1',
  alan: 'campaign_119interview~~alan turing 12@example.test',
  katherine: 'campaign_119interview~~katherine.j@example.test~~c3d4e5f6a1b2',
  slash: 'campaign_123interview~~ops/qa@example.test~~d4e5f6a1b2c3',
  hedy: 'campaign_123interview~~hedy.lamarr@example.test~~e5f6a1b2c3d4',
  mary: 'campaign_123interview~~mary.jackson@example.test~~f6a1b2c3d4e5',
  dorothy: 'campaign_123interview~~dorothy.v@example.test~~a6b5c4d3e2f1',
  annie: 'campaign_123interview~~annie.easley@example.test~~b6a5c4d3e2f1',
  radia: 'campaign_123interview~~radia.p@example.test~~c6b5a4d3e2f1',
} as const;

export const campaignJobs: Readonly<Record<number, RawCampaignJobsResponse>> = {
  119: [
    job(ROOMS.ada, 119, 'Ada Lovelace', 'ada.lovelace@example.test', '2026-10-27T09:17:20.822+00:00', 100, 1),
    job(ROOMS.grace, 119, 'Grace Hopper', 'grace.hopper@example.test', '2026-10-22T09:32:01.019+00:00', 25, 1),
    job(ROOMS.alan, 119, null, 'alan turing 12@example.test', '2026-10-16T17:50:05.873+00:00', 0, 0),
    job(ROOMS.katherine, 119, 'Katherine Johnson', 'katherine.j@example.test', '2026-10-15T10:08:06.313+00:00', 0, 1),
  ],
  120: [],
  122: [],
  123: [
    job(ROOMS.slash, 123, null, 'ops/qa@example.test', '2026-11-04T09:38:14.744+00:00', 18.18182, 0),
    job(ROOMS.hedy, 123, 'Hedy Lamarr', 'hedy.lamarr@example.test', '2026-11-03T17:00:18.559+00:00', 100, 1),
    job(ROOMS.mary, 123, null, 'mary.jackson@example.test', '2026-11-03T15:07:25.922+00:00', 0, 0),
    job(ROOMS.dorothy, 123, null, 'dorothy.v@example.test', '2026-11-03T08:01:26.029+00:00', 0, 0),
    job(ROOMS.annie, 123, null, 'annie.easley@example.test', '2026-11-02T14:06:33.889+00:00', 15.78947, 0),
    job(ROOMS.radia, 123, 'Radia Perlman', 'radia.p@example.test', '2026-11-01T20:28:24.518+00:00', 33.33333, 1),
  ],
};

const lowSignals = {
  synthetic: signal('LOW', 0.92, [obs('00:03', 'SYNTHETIC_VIDEO', 'Natural skin texture and lighting consistent with a live camera.')]),
  continuity: signal('LOW', 0.96, [obs('00:00', 'PERSON_CONTINUITY', 'A single candidate remains present throughout.')]),
  audioVideo: signal('LOW', 0.9, [obs('00:12', 'AUDIO_VIDEO', 'Lip movement matches spoken audio.')]),
  offScreen: signal('LOW', 0.88, [obs('01:05', 'OFF_SCREEN_ACTIVITY', 'Brief glance down, consistent with thinking.')]),
};

const fullTranscript = [
  line('00:01', 'INTERVIEWER', 'Welcome to this interview. Could you introduce yourself?'),
  line('00:09', 'INTERVIEWEE', 'Hi, I design analytical engines and have written the first published algorithm.'),
  line('00:41', 'INTERVIEWER', 'How do you approach a new design problem?'),
  line('00:48', 'INTERVIEWEE', 'I start by understanding the people who will use it, then sketch several options.'),
  line('01:30', 'PARTICIPANT', 'Sorry, joining late. Please continue.'),
  line('02:02', 'INTERVIEWEE', 'Then I test the riskiest assumption first with a quick prototype.'),
];

const goodIdentity: RawIdentityPhase1 = {
  decision: 'CONSISTENT',
  confidence: 0.86,
  referenceVideoQuality: 'GOOD',
  interviewVideoQuality: 'FAIR',
  multiplePeopleDetected: false,
  matchingEvidence: [
    obs('00:15', 'IDENTITY_MATCH', 'Facial structure and hairline match the reference video.', 'readie_1'),
    obs('00:08', 'IDENTITY_MATCH', 'Voice timbre consistent with the reference recording.', 'readie_1'),
  ],
  conflictingEvidence: [],
  limitations: ['Reference webcam feed is a small picture-in-picture.'],
};

const badIdentity: RawIdentityPhase1 = {
  decision: 'INCONSISTENT',
  confidence: 0.41,
  referenceVideoQuality: 'POOR',
  interviewVideoQuality: 'FAIR',
  multiplePeopleDetected: true,
  matchingEvidence: [],
  conflictingEvidence: [obs('00:22', 'IDENTITY_CONFLICT', 'Jawline and eye spacing differ from the reference video.', 'readie_1')],
  limitations: ['Cap brim shadows the upper face.'],
};

export const roomRecordings: Readonly<Record<string, RawRoomResponse>> = {
  // Four recordings: one unanalysed, then FAILED (oldest) → WARNING → PASSED (newest).
  [ROOMS.ada]: [
    recording(ROOMS.ada, 119, '2026-10-27T09:10:00.000000', null),
    recording(
      ROOMS.ada,
      119,
      '2026-10-27T09:12:00.000000',
      analytic(
        {
          overallRisk: 'HIGH',
          synthetic: signal('LOW', 0.8, [obs('00:02', 'SYNTHETIC_VIDEO', 'No synthetic artefacts.')]),
          continuity: signal('HIGH', 0.9, [
            obs('00:40', 'PERSON_CONTINUITY', 'A second face appears beside the candidate.'),
            obs('01:10', 'PERSON_CONTINUITY', 'Candidate replaced by a different person for 6 seconds.'),
          ]),
          audioVideo: signal('MEDIUM', 0.7, [obs('00:55', 'AUDIO_VIDEO', 'Whispered voice not matching lip movement.')]),
          offScreen: signal('HIGH', 0.85, [obs('01:20', 'OFF_SCREEN_ACTIVITY', 'Candidate reads from a second device held below the camera.')]),
          ranges: [{ start: '00:50', end: '01:00', category: 'AUDIO', reason: 'Second voice heard prompting answers.' }, '01:15-01:25'],
          limitations: ['Low light in the second half of the recording.'],
          transcript: [line('00:01', 'INTERVIEWER', 'Please describe your last project.'), line('00:30', 'INTERVIEWEE', 'I worked on a mobile banking app.')],
          disposition: 'FAIL_HIGH_RISK',
          humanReviewRequired: true,
        },
        badIdentity,
        { disposition: 'REVIEW_REQUIRED', humanReviewRequired: true, candidateId: '1100' },
      ),
    ),
    recording(
      ROOMS.ada,
      119,
      '2026-10-27T09:14:00.000000',
      analytic(
        {
          overallRisk: 'MEDIUM',
          ...lowSignals,
          offScreen: signal('MEDIUM', 0.6, [obs('00:33', 'OFF_SCREEN_ACTIVITY', 'Repeated glances to the right while answering.')]),
          transcript: [line('00:05', 'INTERVIEWER', 'Tell us about a hard trade-off.'), line('00:20', 'INTERVIEWEE', 'Choosing speed over polish for a launch.')],
          disposition: 'REVIEW_REQUIRED',
          humanReviewRequired: true,
        },
        goodIdentity,
        { disposition: 'REVIEW_REQUIRED', humanReviewRequired: true, candidateId: '1100' },
      ),
    ),
    recording(
      ROOMS.ada,
      119,
      '2026-10-27T09:17:20.822875',
      analytic(
        {
          overallRisk: 'LOW',
          ...lowSignals,
          limitations: ['Candidate face partially cropped at the bottom edge.'],
          transcript: fullTranscript,
          disposition: 'PASS_WITH_LOW_RISK',
          humanReviewRequired: false,
        },
        goodIdentity,
        { disposition: 'PASS_WITH_LOW_RISK', humanReviewRequired: false, candidateId: '1100' },
      ),
    ),
  ],
  // Recordings exist but none analysed yet.
  [ROOMS.grace]: [
    recording(ROOMS.grace, 119, '2026-10-22T09:32:01.019101', null, { analyticsCompleted: 'P' }),
    recording(ROOMS.grace, 119, '2026-10-22T09:40:00.000000', null, { status: 'FAILED', analyticsCompleted: 'N' }),
  ],
  // Room name with a space; Phase 1 missing; empty transcript (mirrors the live API).
  [ROOMS.alan]: [
    recording(
      ROOMS.alan,
      119,
      '2026-10-16T17:50:05.873194',
      analytic(
        {
          overallRisk: 'LOW',
          ...lowSignals,
          limitations: ['Video duration is very short (under 8 seconds).', 'No speech occurs during the clip.'],
          transcript: [],
          disposition: 'PASS_WITH_LOW_RISK',
          humanReviewRequired: false,
        },
        null,
        { disposition: 'REVIEW_REQUIRED', humanReviewRequired: true, candidateId: '1000' },
      ),
    ),
  ],
  [ROOMS.katherine]: [],
  // Room name containing "/".
  [ROOMS.slash]: [
    recording(
      ROOMS.slash,
      123,
      '2026-11-04T09:38:14.744000',
      analytic(
        {
          overallRisk: 'LOW',
          ...lowSignals,
          transcript: [line('00:02', 'INTERVIEWER', 'Walk me through your on-call process.'), line('00:15', 'INTERVIEWEE', 'We rotate weekly and keep runbooks close.')],
          disposition: 'REVIEW_REQUIRED',
          humanReviewRequired: true,
        },
        { ...goodIdentity, confidence: 0.67 },
        { disposition: 'REVIEW_REQUIRED', humanReviewRequired: true, candidateId: '1018' },
      ),
      { analyticsCompleted: 'P' },
    ),
  ],
  [ROOMS.hedy]: [
    recording(
      ROOMS.hedy,
      123,
      '2026-11-03T17:00:18.559000',
      analytic(
        { overallRisk: 'LOW', ...lowSignals, transcript: fullTranscript, disposition: 'PASS_WITH_LOW_RISK', humanReviewRequired: false },
        goodIdentity,
        { disposition: 'PASS_WITH_LOW_RISK', humanReviewRequired: false, candidateId: '1100' },
      ),
    ),
  ],
  [ROOMS.mary]: [recording(ROOMS.mary, 123, '2026-11-03T15:07:25.922000', null)],
  [ROOMS.dorothy]: [],
  [ROOMS.annie]: [recording(ROOMS.annie, 123, '2026-11-02T14:06:33.889000', null, { analyticsCompleted: 'P' })],
  [ROOMS.radia]: [recording(ROOMS.radia, 123, '2026-11-01T20:28:24.518000', null, { analyticsCompleted: 'P' })],
};
