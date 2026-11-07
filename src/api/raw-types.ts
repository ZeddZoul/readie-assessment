/**
 * Raw response contracts of the Readie hackathon API, as observed on 2026-11-05.
 * Enum-like fields are `string`: adapters narrow them, so a new backend value
 * never fails validation. Fields the portal does not use are stripped by the schemas.
 */

export interface RawAssessmentVideo {
  created_at?: string | null | undefined;
  video_url_link?: string | null | undefined;
}

export interface RawCampaignJob {
  roomName: string;
  campaignId: number;
  userId?: number | null | undefined;
  candidateId?: string | null | undefined;
  candidateName?: string | null | undefined;
  candidateEmail: string;
  /** ISO-8601 with offset, e.g. "2026-10-22T09:32:01.019+00:00". */
  candidateDateCreated: string;
  campaignJobTitle?: string | null | undefined;
  analyticsCompleted: boolean;
  /** 0–100, fractional. */
  percentageAnalyticCompleted: number;
  campaign_assessment_video_link?: RawAssessmentVideo[] | null | undefined;
}
export type RawCampaignJobsResponse = RawCampaignJob[];

export interface RawObservation {
  timestamp?: string | null | undefined;
  source?: string | null | undefined;
  category?: string | null | undefined;
  observation?: string | null | undefined;
}

export interface RawRiskSignal {
  risk?: string | null | undefined;
  confidence?: number | null | undefined;
  observations?: RawObservation[] | null | undefined;
}

/** Seen as objects in the brief's model and as bare "mm:ss-mm:ss" strings from the live API (2026-11-07). */
export interface RawSuspiciousTimeRange {
  start?: string | null | undefined;
  end?: string | null | undefined;
  timestamp?: string | null | undefined;
  category?: string | null | undefined;
  reason?: string | null | undefined;
  description?: string | null | undefined;
}

export interface RawTranscriptEntry {
  timestamp?: string | null | undefined;
  speaker?: string | null | undefined;
  text?: string | null | undefined;
}

export interface RawGeminiPhase2 {
  overallRisk?: string | null | undefined;
  syntheticVideo?: RawRiskSignal | null | undefined;
  personContinuity?: RawRiskSignal | null | undefined;
  audioVideoConsistency?: RawRiskSignal | null | undefined;
  possibleOffScreenAssistance?: RawRiskSignal | null | undefined;
  suspiciousTimeRanges?: (RawSuspiciousTimeRange | string)[] | null | undefined;
  limitations?: string[] | null | undefined;
  transcript?: { entries?: RawTranscriptEntry[] | null | undefined } | null | undefined;
}

export interface RawDeepfakePhase2 {
  gemini?: RawGeminiPhase2 | null | undefined;
  /** Validated as an array; contents are never read. */
  specialistResults?: unknown[] | null | undefined;
  disposition?: string | null | undefined;
  humanReviewRequired?: boolean | null | undefined;
}

export interface RawIdentityPhase1 {
  decision?: string | null | undefined;
  /** 0–1 */
  confidence?: number | null | undefined;
  referenceVideoQuality?: string | null | undefined;
  interviewVideoQuality?: string | null | undefined;
  multiplePeopleDetected?: boolean | null | undefined;
  matchingEvidence?: RawObservation[] | null | undefined;
  conflictingEvidence?: RawObservation[] | null | undefined;
  limitations?: string[] | null | undefined;
}

export interface RawAnalytic {
  identity_phase1?: RawIdentityPhase1 | null | undefined;
  deepfake_phase2?: RawDeepfakePhase2 | null | undefined;
  candidateId?: string | null | undefined;
  disposition?: string | null | undefined;
  humanReviewRequired?: boolean | null | undefined;
}

export interface RawRoomRecording {
  roomName: string;
  campaignId: number;
  recordingType?: string | null | undefined;
  status?: string | null | undefined;
  /** ISO local time without zone (UTC on the server), e.g. "2026-10-22T09:32:01.019101". */
  createdAt: string;
  updatedAt?: string | null | undefined;
  persistedAt?: string | null | undefined;
  finalUrl?: string | null | undefined;
  extractedEmail?: string | null | undefined;
  analytic?: RawAnalytic | null | undefined;
  /** "Y" | "P" | "N" observed. */
  analyticsCompleted?: string | null | undefined;
}
export type RawRoomResponse = RawRoomRecording[];
