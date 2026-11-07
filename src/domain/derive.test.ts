import {
  classifyConfidence,
  deriveAudioAnomalyCount,
  deriveCompleteness,
  deriveFlaggedFrames,
  deriveGazeIndex,
  deriveIntegrityStatus,
  deriveLiveness,
  deriveVerificationStatus,
  isLowQuality,
  normaliseRisk,
  sortByTimestamp,
  speakerRole,
} from './derive';

describe('D1 verification status', () => {
  it.each([
    [{ analyticsCompleted: true, percent: 0, videoCount: 0 }, 'COMPLETED'],
    [{ analyticsCompleted: false, percent: 100, videoCount: 0 }, 'COMPLETED'],
    [{ analyticsCompleted: false, percent: 0, videoCount: 0 }, 'FAILED'],
    [{ analyticsCompleted: false, percent: 0, videoCount: 1 }, 'IN_PROGRESS'],
    [{ analyticsCompleted: false, percent: 18.18, videoCount: 0 }, 'IN_PROGRESS'],
  ] as const)('%j → %s', (input, expected) => expect(deriveVerificationStatus(input)).toBe(expected));
});

describe('D2 risk', () => {
  it('normalises case and unknowns', () => {
    expect(normaliseRisk('low')).toBe('LOW');
    expect(normaliseRisk(' HIGH ')).toBe('HIGH');
    expect(normaliseRisk('CRITICAL')).toBe('UNKNOWN');
    expect(normaliseRisk(null)).toBe('UNKNOWN');
  });
});

describe('D3 integrity status', () => {
  const base = { overallRisk: 'LOW', signalRisks: ['LOW', 'LOW'], disposition: 'PASS_WITH_LOW_RISK', humanReviewRequired: false, suspiciousRangeCount: 0 } as const;
  it('passes observed PASS_WITH_LOW_RISK', () => expect(deriveIntegrityStatus(base)).toBe('PASSED'));
  it('warns on REVIEW_REQUIRED', () => expect(deriveIntegrityStatus({ ...base, disposition: 'REVIEW_REQUIRED' })).toBe('WARNING'));
  it('warns on human review', () => expect(deriveIntegrityStatus({ ...base, humanReviewRequired: true })).toBe('WARNING'));
  it('warns on MEDIUM or UNKNOWN', () => {
    expect(deriveIntegrityStatus({ ...base, signalRisks: ['MEDIUM'] })).toBe('WARNING');
    expect(deriveIntegrityStatus({ ...base, overallRisk: 'UNKNOWN' })).toBe('WARNING');
  });
  it('warns on suspicious ranges', () => expect(deriveIntegrityStatus({ ...base, suspiciousRangeCount: 1 })).toBe('WARNING'));
  it('fails on HIGH or failing disposition', () => {
    expect(deriveIntegrityStatus({ ...base, signalRisks: ['HIGH'] })).toBe('FAILED');
    expect(deriveIntegrityStatus({ ...base, disposition: 'REJECTED' })).toBe('FAILED');
  });
});

describe('D4 gaze index', () => {
  it('maps risk bands', () => {
    expect(deriveGazeIndex({ risk: 'LOW', confidence: 1 })).toBe(100);
    expect(deriveGazeIndex({ risk: 'LOW', confidence: 0.8 })).toBe(93);
    expect(deriveGazeIndex({ risk: 'MEDIUM', confidence: 0.3 })).toBe(50);
    expect(deriveGazeIndex({ risk: 'HIGH', confidence: 1 })).toBe(0);
    expect(deriveGazeIndex({ risk: 'UNKNOWN', confidence: 1 })).toBeNull();
    expect(deriveGazeIndex(null)).toBeNull();
  });
});

describe('D5 audio anomaly count', () => {
  it('counts non-LOW audio observations (min 1) and audio ranges', () => {
    expect(deriveAudioAnomalyCount({ risk: 'LOW', observationCount: 3 }, [])).toBe(0);
    expect(deriveAudioAnomalyCount({ risk: 'MEDIUM', observationCount: 0 }, [])).toBe(1);
    expect(deriveAudioAnomalyCount({ risk: 'HIGH', observationCount: 2 }, [{ label: '00:50', timestampSec: 50, category: 'AUDIO', reason: 'x' }])).toBe(3);
    expect(deriveAudioAnomalyCount(null, [{ label: '-', timestampSec: null, category: 'VIDEO', reason: 'second voice heard' }])).toBe(1);
  });
});

describe('D6 flagged frames', () => {
  it('collects non-LOW frame signals, ranges and multiple people, sorted', () => {
    const o = (s: number, text: string) => ({ timestampSec: s, timestampLabel: `00:${s}`, category: 'C', text, source: 'G' });
    const frames = deriveFlaggedFrames({
      signals: [
        { key: 'personContinuity', risk: 'HIGH', observations: [o(40, 'second face')] },
        { key: 'possibleOffScreenAssistance', risk: 'LOW', observations: [o(10, 'ignored')] },
        { key: 'audioVideoConsistency', risk: 'HIGH', observations: [o(5, 'not a frame signal')] },
      ],
      ranges: [{ label: '00:20', timestampSec: 20, category: null, reason: 'range' }],
      multiplePeopleDetected: true,
    });
    expect(frames.map((f) => f.reason)).toEqual(['range', 'second face', 'Multiple people detected in frame']);
  });
});

describe('D7–D12', () => {
  it('derives liveness from synthetic video', () => {
    expect(deriveLiveness({ risk: 'LOW', confidence: 0.9 })).toEqual({ passed: true, risk: 'LOW', confidence: 0.9 });
    expect(deriveLiveness({ risk: 'HIGH', confidence: 0.9 })?.passed).toBe(false);
    expect(deriveLiveness({ risk: 'UNKNOWN', confidence: 0.9 })?.passed).toBeNull();
    expect(deriveLiveness(null)).toBeNull();
  });
  it('classifies confidence and quality', () => {
    expect(classifyConfidence(0.82)).toBe('pass');
    expect(classifyConfidence(0.6)).toBe('warn');
    expect(classifyConfidence(0.59)).toBe('fail');
    expect(isLowQuality('poor')).toBe(true);
    expect(isLowQuality('FAIR')).toBe(false);
  });
  it('classifies speakers', () => {
    expect(speakerRole('INTERVIEWER')).toBe('interviewer');
    expect(speakerRole('INTERVIEWEE')).toBe('candidate');
    expect(speakerRole('PARTICIPANT')).toBe('other');
  });
  it('sorts timed entries first, stably', () => {
    const r = sortByTimestamp([{ timestampSec: null, k: 'a' }, { timestampSec: 5, k: 'b' }, { timestampSec: 1, k: 'c' }, { timestampSec: null, k: 'd' }]);
    expect(r.map((x) => x.k)).toEqual(['c', 'b', 'a', 'd']);
  });
  it('derives completeness', () => {
    expect(deriveCompleteness(['N', 'Y'])).toBe('complete');
    expect(deriveCompleteness(['N', 'P'])).toBe('partial');
    expect(deriveCompleteness(['N'])).toBe('none');
    expect(deriveCompleteness([])).toBe('unknown');
  });
});
