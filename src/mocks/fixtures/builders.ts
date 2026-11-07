/** Small builders so fixtures stay readable. All data is synthetic. */
import type {
  RawAnalytic,
  RawCampaignJob,
  RawObservation,
  RawRiskSignal,
  RawRoomRecording,
  RawSuspiciousTimeRange,
  RawTranscriptEntry,
} from '../../api/raw-types';

export const obs = (timestamp: string, category: string, observation: string, source = 'GEMINI'): RawObservation => ({
  timestamp,
  source,
  category,
  observation,
});

export const signal = (risk: string, confidence: number, observations: RawObservation[]): RawRiskSignal => ({
  risk,
  confidence,
  observations,
});

export const line = (timestamp: string, speaker: string, text: string): RawTranscriptEntry => ({ timestamp, speaker, text });

export interface Phase2Spec {
  overallRisk: string;
  synthetic: RawRiskSignal;
  continuity: RawRiskSignal;
  audioVideo: RawRiskSignal;
  offScreen: RawRiskSignal;
  ranges?: (RawSuspiciousTimeRange | string)[];
  limitations?: string[];
  transcript?: RawTranscriptEntry[];
  disposition: string;
  humanReviewRequired: boolean;
}

export function analytic(
  spec: Phase2Spec | null,
  identity: RawAnalytic['identity_phase1'],
  top: { disposition: string; humanReviewRequired: boolean; candidateId: string },
): RawAnalytic {
  return {
    identity_phase1: identity,
    deepfake_phase2: spec
      ? {
          gemini: {
            overallRisk: spec.overallRisk,
            syntheticVideo: spec.synthetic,
            personContinuity: spec.continuity,
            audioVideoConsistency: spec.audioVideo,
            possibleOffScreenAssistance: spec.offScreen,
            suspiciousTimeRanges: spec.ranges ?? [],
            limitations: spec.limitations ?? [],
            transcript: { entries: spec.transcript ?? [] },
          },
          specialistResults: [],
          disposition: spec.disposition,
          humanReviewRequired: spec.humanReviewRequired,
        }
      : null,
    candidateId: top.candidateId,
    disposition: top.disposition,
    humanReviewRequired: top.humanReviewRequired,
  };
}

export function recording(
  roomName: string,
  campaignId: number,
  createdAt: string,
  analyticValue: RawAnalytic | null,
  opts: { status?: string; analyticsCompleted?: string } = {},
): RawRoomRecording {
  const slug = roomName.replace(/~~/g, '__').replace(/[^a-zA-Z0-9_.-]/g, '_');
  return {
    roomName,
    campaignId,
    recordingType: 'COMPOSITE',
    status: opts.status ?? 'PERSISTED',
    createdAt,
    updatedAt: createdAt,
    persistedAt: opts.status === 'FAILED' ? null : createdAt,
    finalUrl: opts.status === 'FAILED' ? null : `https://storage.example.test/recordings/${slug}/composite.mp4`,
    extractedEmail: roomName.split('~~').pop() ?? '',
    analytic: analyticValue,
    analyticsCompleted: opts.analyticsCompleted ?? (analyticValue ? 'Y' : 'N'),
  };
}

export function job(
  roomName: string,
  campaignId: number,
  candidateName: string | null,
  candidateEmail: string,
  candidateDateCreated: string,
  percent: number,
  videoCount: number,
): RawCampaignJob {
  return {
    roomName,
    campaignId,
    userId: 1000 + Math.round(percent),
    candidateId: String(1000 + Math.round(percent)),
    candidateName,
    candidateEmail,
    candidateDateCreated,
    campaignJobTitle: campaignId === 119 ? 'Product Designer (UX/UI)' : 'Backend Engineer',
    analyticsCompleted: percent >= 100,
    percentageAnalyticCompleted: percent,
    campaign_assessment_video_link: Array.from({ length: videoCount }, (_, i) => ({
      created_at: '2026-10-20 10:00:00.000000',
      video_url_link: `https://storage.example.test/assessment/${campaignId}/${i}.webm`,
    })),
  };
}
