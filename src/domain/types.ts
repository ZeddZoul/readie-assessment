export type VerificationStatus = 'COMPLETED' | 'IN_PROGRESS' | 'FAILED';
export const VERIFICATION_STATUSES: readonly VerificationStatus[] = ['COMPLETED', 'IN_PROGRESS', 'FAILED'];

export type IntegrityStatus = 'PASSED' | 'WARNING' | 'FAILED';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN';
export type SpeakerRole = 'interviewer' | 'candidate' | 'other';
export type AnalysisCompleteness = 'complete' | 'partial' | 'none' | 'unknown';
export type ConfidenceBand = 'pass' | 'warn' | 'fail';

export interface EvaluationJob {
  readonly roomName: string;
  readonly campaignId: number;
  readonly candidateName: string | null;
  readonly candidateEmail: string;
  readonly submittedAt: Date;
  readonly submittedAtIso: string;
  readonly jobTitle: string | null;
  readonly analysisPercent: number;
  readonly verificationStatus: VerificationStatus;
}

export interface Observation {
  readonly timestampSec: number | null;
  readonly timestampLabel: string;
  readonly category: string;
  readonly text: string;
  readonly source: string;
}

export interface TranscriptEntry {
  readonly timestampSec: number | null;
  readonly timestampLabel: string;
  readonly speakerLabel: string;
  readonly role: SpeakerRole;
  readonly text: string;
}

export interface Liveness {
  readonly passed: boolean | null;
  readonly risk: RiskLevel;
  readonly confidence: number;
}

export type IdentityDecision = 'CONSISTENT' | 'INCONSISTENT' | 'INCONCLUSIVE' | 'UNKNOWN';

export type IdentityAnomaly =
  | { readonly kind: 'conflicting-evidence'; readonly observation: Observation }
  | { readonly kind: 'multiple-people' }
  | { readonly kind: 'low-video-quality'; readonly which: 'reference' | 'interview'; readonly quality: string };

export interface IdentityResult {
  readonly decision: IdentityDecision;
  readonly decisionLabel: string;
  readonly matchConfidence: number;
  readonly referenceVideoQuality: string | null;
  readonly interviewVideoQuality: string | null;
  readonly liveness: Liveness | null;
  readonly anomalies: readonly IdentityAnomaly[];
  readonly matchingEvidence: readonly Observation[];
  readonly limitations: readonly string[];
}

export type SignalKey = 'syntheticVideo' | 'personContinuity' | 'audioVideoConsistency' | 'possibleOffScreenAssistance';

export interface RiskSignal {
  readonly key: SignalKey;
  readonly label: string;
  readonly risk: RiskLevel;
  readonly confidence: number;
  readonly observations: readonly Observation[];
}

export interface SuspiciousRange {
  readonly label: string;
  readonly timestampSec: number | null;
  readonly category: string | null;
  readonly reason: string;
}

export type FlaggedFrameSource = SignalKey | 'suspiciousTimeRange' | 'identity';

export interface FlaggedFrame {
  readonly timestampLabel: string | null;
  readonly timestampSec: number | null;
  readonly reason: string;
  readonly source: FlaggedFrameSource;
}

export interface IntegrityResult {
  readonly status: IntegrityStatus;
  readonly overallRisk: RiskLevel;
  readonly dispositionLabel: string;
  readonly humanReviewRequired: boolean;
  readonly gazeTrackingIndex: number | null;
  readonly audioAnomalyCount: number;
  readonly flaggedFrames: readonly FlaggedFrame[];
  readonly signals: readonly RiskSignal[];
  readonly suspiciousTimeRanges: readonly SuspiciousRange[];
  readonly limitations: readonly string[];
}

export interface AnalysedRecording {
  readonly id: string;
  readonly createdAt: Date;
  readonly transcript: readonly TranscriptEntry[];
  readonly identity: IdentityResult | null;
  readonly integrity: IntegrityResult | null;
  readonly overallDisposition: string;
  readonly overallHumanReviewRequired: boolean;
}

export interface RoomEvaluation {
  readonly roomName: string;
  readonly campaignId: number;
  readonly candidateEmail: string | null;
  readonly recordingCount: number;
  readonly completeness: AnalysisCompleteness;
  /** Newest first. */
  readonly analysed: readonly AnalysedRecording[];
  readonly defaultRecordingId: string | null;
}

export type Result<T, E> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E };
