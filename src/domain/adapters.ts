import type { ApiError } from '../api/errors';
import type {
  RawAnalytic,
  RawCampaignJob,
  RawDeepfakePhase2,
  RawIdentityPhase1,
  RawObservation,
  RawRiskSignal,
  RawSuspiciousTimeRange,
} from '../api/raw-types';
import { campaignJobsResponseSchema, formatIssues, roomResponseSchema } from '../api/schemas';
import { parseRoomName } from '../lib/roomName';
import { parseClock, parseIsoDate } from '../lib/time';
import {
  deriveAudioAnomalyCount,
  deriveCompleteness,
  deriveFlaggedFrames,
  deriveGazeIndex,
  deriveIntegrityStatus,
  deriveLiveness,
  deriveVerificationStatus,
  isLowQuality,
  normaliseRisk,
  orderAnalysed,
  sortByTimestamp,
  speakerRole,
} from './derive';
import type {
  AnalysedRecording,
  EvaluationJob,
  IdentityAnomaly,
  IdentityDecision,
  IdentityResult,
  IntegrityResult,
  Observation,
  Result,
  RiskSignal,
  RoomEvaluation,
  SignalKey,
  SuspiciousRange,
  TranscriptEntry,
} from './types';

const validationError = (issues: readonly string[]): { ok: false; error: ApiError } => ({
  ok: false,
  error: { kind: 'validation', issues },
});

// ---------- campaign jobs ----------

export function toEvaluationJob(raw: RawCampaignJob): EvaluationJob | null {
  const submittedAt = parseIsoDate(raw.candidateDateCreated);
  if (!submittedAt) return null;
  const name = raw.candidateName?.trim();
  return {
    roomName: raw.roomName,
    campaignId: raw.campaignId,
    candidateName: name ? name : null,
    candidateEmail: raw.candidateEmail,
    submittedAt,
    submittedAtIso: raw.candidateDateCreated,
    jobTitle: raw.campaignJobTitle ?? null,
    analysisPercent: raw.percentageAnalyticCompleted,
    verificationStatus: deriveVerificationStatus({
      analyticsCompleted: raw.analyticsCompleted,
      percent: raw.percentageAnalyticCompleted,
      videoCount: raw.campaign_assessment_video_link?.length ?? 0,
    }),
  };
}

/** Validates and maps the jobs payload. Never throws. */
export function parseCampaignJobs(json: unknown): Result<EvaluationJob[], ApiError> {
  const parsed = campaignJobsResponseSchema.safeParse(json);
  if (!parsed.success) return validationError(formatIssues(parsed.error));
  const jobs: EvaluationJob[] = [];
  const issues: string[] = [];
  parsed.data.forEach((raw, i) => {
    const job = toEvaluationJob(raw);
    if (job) jobs.push(job);
    else issues.push(`${i}.candidateDateCreated: invalid date "${raw.candidateDateCreated}"`);
  });
  return issues.length ? validationError(issues) : { ok: true, value: jobs };
}

// ---------- room evaluation ----------

export function toObservation(raw: RawObservation): Observation {
  const label = raw.timestamp?.trim() ?? '';
  return {
    timestampSec: parseClock(label),
    timestampLabel: label || '—',
    category: raw.category ?? 'UNSPECIFIED',
    text: raw.observation ?? '',
    source: raw.source ?? 'unknown',
  };
}

const SIGNAL_LABELS: Readonly<Record<SignalKey, string>> = {
  syntheticVideo: 'Synthetic video (deepfake)',
  personContinuity: 'Person continuity',
  audioVideoConsistency: 'Audio / video consistency',
  possibleOffScreenAssistance: 'Off-screen assistance (gaze)',
};
export const SIGNAL_KEYS: readonly SignalKey[] = [
  'syntheticVideo',
  'personContinuity',
  'audioVideoConsistency',
  'possibleOffScreenAssistance',
];

function toRiskSignal(key: SignalKey, raw: RawRiskSignal | null | undefined): RiskSignal | null {
  if (!raw) return null;
  return {
    key,
    label: SIGNAL_LABELS[key],
    risk: normaliseRisk(raw.risk),
    confidence: raw.confidence ?? 0,
    observations: sortByTimestamp((raw.observations ?? []).map(toObservation)),
  };
}

export function toSuspiciousRange(raw: RawSuspiciousTimeRange | string): SuspiciousRange {
  if (typeof raw === 'string') {
    // Live API form: "03:38-03:55" (or a single "03:38"), with no reason attached.
    const [start, end] = raw.split(/\s*[-–]\s*/);
    const label = start && end ? `${start}–${end}` : raw.trim() || '—';
    return { label, timestampSec: parseClock(start), category: null, reason: 'Suspicious activity' };
  }
  const start = raw.start ?? raw.timestamp ?? null;
  const label = start && raw.end ? `${start}–${raw.end}` : (start ?? '—');
  return {
    label,
    timestampSec: parseClock(start),
    category: raw.category ?? null,
    reason: raw.reason ?? raw.description ?? raw.category ?? 'Suspicious activity',
  };
}

function toIntegrity(raw: RawDeepfakePhase2, identity: RawIdentityPhase1 | null | undefined): IntegrityResult {
  const gemini = raw.gemini;
  const signals = SIGNAL_KEYS.map((k) => toRiskSignal(k, gemini?.[k])).filter((s): s is RiskSignal => s !== null);
  const ranges = (gemini?.suspiciousTimeRanges ?? []).map(toSuspiciousRange);
  const overallRisk = normaliseRisk(gemini?.overallRisk);
  const disposition = raw.disposition ?? 'UNKNOWN';
  const humanReviewRequired = raw.humanReviewRequired ?? false;
  const find = (k: SignalKey): RiskSignal | null => signals.find((s) => s.key === k) ?? null;
  const av = find('audioVideoConsistency');
  return {
    status: deriveIntegrityStatus({
      overallRisk,
      signalRisks: signals.map((s) => s.risk),
      disposition,
      humanReviewRequired,
      suspiciousRangeCount: ranges.length,
    }),
    overallRisk,
    dispositionLabel: disposition,
    humanReviewRequired,
    gazeTrackingIndex: deriveGazeIndex(find('possibleOffScreenAssistance')),
    audioAnomalyCount: deriveAudioAnomalyCount(av ? { risk: av.risk, observationCount: av.observations.length } : null, ranges),
    flaggedFrames: deriveFlaggedFrames({ signals, ranges, multiplePeopleDetected: identity?.multiplePeopleDetected ?? false }),
    signals,
    suspiciousTimeRanges: sortByTimestamp(ranges),
    limitations: gemini?.limitations ?? [],
  };
}

function toDecision(raw: string | null | undefined): IdentityDecision {
  const v = raw?.trim().toUpperCase();
  return v === 'CONSISTENT' || v === 'INCONSISTENT' || v === 'INCONCLUSIVE' ? v : 'UNKNOWN';
}

function toIdentity(raw: RawIdentityPhase1, phase2: RawDeepfakePhase2 | null | undefined): IdentityResult {
  const anomalies: IdentityAnomaly[] = (raw.conflictingEvidence ?? []).map((o) => ({
    kind: 'conflicting-evidence',
    observation: toObservation(o),
  }));
  if (raw.multiplePeopleDetected) anomalies.push({ kind: 'multiple-people' });
  if (isLowQuality(raw.referenceVideoQuality)) {
    anomalies.push({ kind: 'low-video-quality', which: 'reference', quality: raw.referenceVideoQuality ?? '' });
  }
  if (isLowQuality(raw.interviewVideoQuality)) {
    anomalies.push({ kind: 'low-video-quality', which: 'interview', quality: raw.interviewVideoQuality ?? '' });
  }
  const synthetic = toRiskSignal('syntheticVideo', phase2?.gemini?.syntheticVideo);
  return {
    decision: toDecision(raw.decision),
    decisionLabel: raw.decision ?? 'UNKNOWN',
    matchConfidence: raw.confidence ?? 0,
    referenceVideoQuality: raw.referenceVideoQuality ?? null,
    interviewVideoQuality: raw.interviewVideoQuality ?? null,
    liveness: deriveLiveness(synthetic),
    anomalies,
    matchingEvidence: sortByTimestamp((raw.matchingEvidence ?? []).map(toObservation)),
    limitations: raw.limitations ?? [],
  };
}

function toTranscript(analytic: RawAnalytic): TranscriptEntry[] {
  const entries = analytic.deepfake_phase2?.gemini?.transcript?.entries ?? [];
  return sortByTimestamp(
    entries.map((e) => {
      const label = e.timestamp?.trim() ?? '';
      return {
        timestampSec: parseClock(label),
        timestampLabel: label || '—',
        speakerLabel: e.speaker ?? 'UNKNOWN',
        role: speakerRole(e.speaker),
        text: e.text ?? '',
      };
    }),
  );
}

function toAnalysedRecording(id: string, analytic: RawAnalytic, createdAt: Date): AnalysedRecording {
  const phase2 = analytic.deepfake_phase2;
  return {
    id,
    createdAt,
    transcript: toTranscript(analytic),
    identity: analytic.identity_phase1 ? toIdentity(analytic.identity_phase1, phase2) : null,
    integrity: phase2 ? toIntegrity(phase2, analytic.identity_phase1) : null,
    overallDisposition: analytic.disposition ?? phase2?.disposition ?? 'UNKNOWN',
    overallHumanReviewRequired: analytic.humanReviewRequired ?? phase2?.humanReviewRequired ?? false,
  };
}

/** Validates and maps the room payload. `null` means the API returned no recordings. Never throws. */
export function parseRoomRecordings(json: unknown, requestedRoomName: string): Result<RoomEvaluation | null, ApiError> {
  const parsed = roomResponseSchema.safeParse(json);
  if (!parsed.success) return validationError(formatIssues(parsed.error));
  const recordings = parsed.data;
  const first = recordings[0];
  if (!first) return { ok: true, value: null };

  const issues: string[] = [];
  const analysedUnordered: AnalysedRecording[] = [];
  const usedIds = new Set<string>();
  recordings.forEach((r, i) => {
    const createdAt = parseIsoDate(r.createdAt);
    if (!createdAt) {
      issues.push(`${i}.createdAt: invalid date "${r.createdAt}"`);
      return;
    }
    if (!r.analytic) return;
    // Stable, shareable id: the recording's own timestamp (position-independent), de-duplicated if needed.
    const base = r.createdAt.trim();
    let id = base;
    for (let n = 2; usedIds.has(id); n++) id = `${base}~${n}`;
    usedIds.add(id);
    analysedUnordered.push(toAnalysedRecording(id, r.analytic, createdAt));
  });
  if (issues.length) return validationError(issues);

  const analysed = orderAnalysed(analysedUnordered);
  return {
    ok: true,
    value: {
      roomName: requestedRoomName,
      campaignId: first.campaignId,
      candidateEmail: parseRoomName(requestedRoomName).email,
      recordingCount: recordings.length,
      completeness: deriveCompleteness(recordings.map((r) => r.analyticsCompleted)),
      analysed,
      defaultRecordingId: analysed[0]?.id ?? null,
    },
  };
}
