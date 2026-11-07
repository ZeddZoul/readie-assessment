import { z } from 'zod';
import type {
  RawAnalytic,
  RawAssessmentVideo,
  RawCampaignJob,
  RawDeepfakePhase2,
  RawGeminiPhase2,
  RawIdentityPhase1,
  RawObservation,
  RawRiskSignal,
  RawRoomRecording,
  RawSuspiciousTimeRange,
  RawTranscriptEntry,
} from './raw-types';

const str = z.string().nullish();
const num = z.number().nullish();
const bool = z.boolean().nullish();

export const assessmentVideoSchema = z.object({
  created_at: str,
  video_url_link: str,
}) satisfies z.ZodType<RawAssessmentVideo>;

export const campaignJobSchema = z.object({
  roomName: z.string().min(1),
  campaignId: z.number(),
  userId: num,
  candidateId: str,
  candidateName: str,
  candidateEmail: z.string(),
  candidateDateCreated: z.string(),
  campaignJobTitle: str,
  analyticsCompleted: z.boolean(),
  percentageAnalyticCompleted: z.number(),
  campaign_assessment_video_link: z.array(assessmentVideoSchema).nullish(),
}) satisfies z.ZodType<RawCampaignJob>;

export const campaignJobsResponseSchema = z.array(campaignJobSchema);

export const observationSchema = z.object({
  timestamp: str,
  source: str,
  category: str,
  observation: str,
}) satisfies z.ZodType<RawObservation>;

export const riskSignalSchema = z.object({
  risk: str,
  confidence: num,
  observations: z.array(observationSchema).nullish(),
}) satisfies z.ZodType<RawRiskSignal>;

export const suspiciousTimeRangeSchema = z.object({
  start: str,
  end: str,
  timestamp: str,
  category: str,
  reason: str,
  description: str,
}) satisfies z.ZodType<RawSuspiciousTimeRange>;

export const transcriptEntrySchema = z.object({
  timestamp: str,
  speaker: str,
  text: str,
}) satisfies z.ZodType<RawTranscriptEntry>;

export const geminiPhase2Schema = z.object({
  overallRisk: str,
  syntheticVideo: riskSignalSchema.nullish(),
  personContinuity: riskSignalSchema.nullish(),
  audioVideoConsistency: riskSignalSchema.nullish(),
  possibleOffScreenAssistance: riskSignalSchema.nullish(),
  suspiciousTimeRanges: z.array(z.union([suspiciousTimeRangeSchema, z.string()])).nullish(),
  limitations: z.array(z.string()).nullish(),
  transcript: z.object({ entries: z.array(transcriptEntrySchema).nullish() }).nullish(),
}) satisfies z.ZodType<RawGeminiPhase2>;

export const deepfakePhase2Schema = z.object({
  gemini: geminiPhase2Schema.nullish(),
  specialistResults: z.array(z.unknown()).nullish(),
  disposition: str,
  humanReviewRequired: bool,
}) satisfies z.ZodType<RawDeepfakePhase2>;

export const identityPhase1Schema = z.object({
  decision: str,
  confidence: num,
  referenceVideoQuality: str,
  interviewVideoQuality: str,
  multiplePeopleDetected: bool,
  matchingEvidence: z.array(observationSchema).nullish(),
  conflictingEvidence: z.array(observationSchema).nullish(),
  limitations: z.array(z.string()).nullish(),
}) satisfies z.ZodType<RawIdentityPhase1>;

export const analyticSchema = z.object({
  identity_phase1: identityPhase1Schema.nullish(),
  deepfake_phase2: deepfakePhase2Schema.nullish(),
  candidateId: str,
  disposition: str,
  humanReviewRequired: bool,
}) satisfies z.ZodType<RawAnalytic>;

export const roomRecordingSchema = z.object({
  roomName: z.string(),
  campaignId: z.number(),
  recordingType: str,
  status: str,
  createdAt: z.string(),
  updatedAt: str,
  persistedAt: str,
  finalUrl: str,
  extractedEmail: str,
  analytic: analyticSchema.nullish(),
  analyticsCompleted: str,
}) satisfies z.ZodType<RawRoomRecording>;

export const roomResponseSchema = z.array(roomRecordingSchema);

/** Formats zod issues as "path: message" strings. */
export function formatIssues(error: z.ZodError): string[] {
  return error.issues.map((i) => `${i.path.map(String).join('.') || '(root)'}: ${i.message}`);
}
