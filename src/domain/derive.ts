/**
 * Derivation rules D1–D12 (see .kiro/specs/candidate-audit-portal/design.md).
 * Every function is pure and total.
 */
import type {
  AnalysisCompleteness,
  ConfidenceBand,
  FlaggedFrame,
  IntegrityStatus,
  Liveness,
  Observation,
  RiskLevel,
  SignalKey,
  SpeakerRole,
  SuspiciousRange,
  VerificationStatus,
} from './types';

/** D1 Verification Status (job level). */
export function deriveVerificationStatus(input: {
  readonly analyticsCompleted: boolean;
  readonly percent: number;
  readonly videoCount: number;
}): VerificationStatus {
  if (input.analyticsCompleted || input.percent >= 100) return 'COMPLETED';
  if (input.percent <= 0 && input.videoCount === 0) return 'FAILED';
  return 'IN_PROGRESS';
}

/** D2 Risk normalisation. */
export function normaliseRisk(value: string | null | undefined): RiskLevel {
  const v = value?.trim().toUpperCase();
  return v === 'LOW' || v === 'MEDIUM' || v === 'HIGH' ? v : 'UNKNOWN';
}

export const INTEGRITY_RANK: Readonly<Record<IntegrityStatus, number>> = { PASSED: 0, WARNING: 1, FAILED: 2 };

/** D3 Integrity Status (Phase 2). */
export function deriveIntegrityStatus(input: {
  readonly overallRisk: RiskLevel;
  readonly signalRisks: readonly RiskLevel[];
  readonly disposition: string;
  readonly humanReviewRequired: boolean;
  readonly suspiciousRangeCount: number;
}): IntegrityStatus {
  const risks = [input.overallRisk, ...input.signalRisks];
  if (risks.includes('HIGH') || /FAIL|REJECT|HIGH_RISK/i.test(input.disposition)) return 'FAILED';
  if (
    input.humanReviewRequired ||
    /REVIEW/i.test(input.disposition) ||
    risks.some((r) => r === 'MEDIUM' || r === 'UNKNOWN') ||
    input.suspiciousRangeCount > 0
  ) {
    return 'WARNING';
  }
  return 'PASSED';
}

const clamp01 = (n: number): number => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

/** D4 Gaze Tracking Index (0–100, higher = more on-screen attention), from possibleOffScreenAssistance. */
export function deriveGazeIndex(signal: { readonly risk: RiskLevel; readonly confidence: number } | null): number | null {
  if (!signal) return null;
  const c = clamp01(signal.confidence);
  switch (signal.risk) {
    case 'LOW':
      return Math.round(67 + 33 * c);
    case 'MEDIUM':
      return 50;
    case 'HIGH':
      return Math.round(33 - 33 * c);
    case 'UNKNOWN':
      return null;
  }
}

const AUDIO_PATTERN = /audio|voice|speech/i;

/** D5 Audio Anomaly Count. */
export function deriveAudioAnomalyCount(
  audioVideo: { readonly risk: RiskLevel; readonly observationCount: number } | null,
  ranges: readonly SuspiciousRange[],
): number {
  const fromSignal = audioVideo && audioVideo.risk !== 'LOW' ? Math.max(1, audioVideo.observationCount) : 0;
  const fromRanges = ranges.filter((r) => AUDIO_PATTERN.test(`${r.category ?? ''} ${r.reason}`)).length;
  return fromSignal + fromRanges;
}

const FRAME_SIGNALS: readonly SignalKey[] = ['personContinuity', 'possibleOffScreenAssistance', 'syntheticVideo'];

/** D6 Flagged Frames. */
export function deriveFlaggedFrames(input: {
  readonly signals: readonly { readonly key: SignalKey; readonly risk: RiskLevel; readonly observations: readonly Observation[] }[];
  readonly ranges: readonly SuspiciousRange[];
  readonly multiplePeopleDetected: boolean;
}): FlaggedFrame[] {
  const frames: FlaggedFrame[] = [];
  for (const s of input.signals) {
    if (!FRAME_SIGNALS.includes(s.key) || s.risk === 'LOW') continue;
    for (const o of s.observations) {
      frames.push({ timestampLabel: o.timestampLabel, timestampSec: o.timestampSec, reason: o.text, source: s.key });
    }
  }
  for (const r of input.ranges) {
    frames.push({ timestampLabel: r.label, timestampSec: r.timestampSec, reason: r.reason, source: 'suspiciousTimeRange' });
  }
  if (input.multiplePeopleDetected) {
    frames.push({ timestampLabel: null, timestampSec: null, reason: 'Multiple people detected in frame', source: 'identity' });
  }
  return sortByTimestamp(frames);
}

/** D7 Liveness, from Phase 2 syntheticVideo. */
export function deriveLiveness(syntheticVideo: { readonly risk: RiskLevel; readonly confidence: number } | null): Liveness | null {
  if (!syntheticVideo) return null;
  const passed = syntheticVideo.risk === 'UNKNOWN' ? null : syntheticVideo.risk === 'LOW';
  return { passed, risk: syntheticVideo.risk, confidence: clamp01(syntheticVideo.confidence) };
}

/** D8 Identity confidence thresholds. */
export const CONFIDENCE_THRESHOLDS = { pass: 0.8, warn: 0.6 } as const;

export function classifyConfidence(value: number): ConfidenceBand {
  if (value >= CONFIDENCE_THRESHOLDS.pass) return 'pass';
  if (value >= CONFIDENCE_THRESHOLDS.warn) return 'warn';
  return 'fail';
}

export function isLowQuality(quality: string | null | undefined): boolean {
  return quality !== null && quality !== undefined && /^(POOR|LOW|UNUSABLE)$/i.test(quality.trim());
}

/** D9 Speaker role. */
export function speakerRole(speaker: string | null | undefined): SpeakerRole {
  const s = speaker?.trim().toUpperCase() ?? '';
  if (['INTERVIEWER', 'AI', 'SYSTEM', 'BOT'].includes(s)) return 'interviewer';
  if (['INTERVIEWEE', 'CANDIDATE'].includes(s)) return 'candidate';
  return 'other';
}

/** D10 Stable sort by timestampSec; entries without a timestamp keep their order, after timed ones. */
export function sortByTimestamp<T extends { readonly timestampSec: number | null }>(items: readonly T[]): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const ta = a.item.timestampSec;
      const tb = b.item.timestampSec;
      if (ta === null && tb === null) return a.index - b.index;
      if (ta === null) return 1;
      if (tb === null) return -1;
      return ta - tb || a.index - b.index;
    })
    .map(({ item }) => item);
}

/** D11 Recording selection: analysed recordings newest first; default = first. */
export function orderAnalysed<T extends { readonly createdAt: Date }>(recordings: readonly T[]): T[] {
  return recordings
    .map((r, index) => ({ r, index }))
    .sort((a, b) => b.r.createdAt.getTime() - a.r.createdAt.getTime() || a.index - b.index)
    .map(({ r }) => r);
}

/** D12 Room analysis completeness from per-recording "Y" / "P" / "N" flags. */
export function deriveCompleteness(flags: readonly (string | null | undefined)[]): AnalysisCompleteness {
  const norm = flags.map((f) => f?.trim().toUpperCase());
  if (norm.includes('Y')) return 'complete';
  if (norm.includes('P')) return 'partial';
  if (norm.length > 0 && norm.every((f) => f === 'N')) return 'none';
  return 'unknown';
}
