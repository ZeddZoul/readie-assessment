import { ConfidenceGauge } from '../../../components/ui/ConfidenceGauge';
import { AlertIcon, CheckIcon } from '../../../components/ui/Icons';
import { Reveal } from '../../../components/ui/Reveal';
import { EmptyState } from '../../../components/ui/States';
import { StatusTag } from '../../../components/ui/StatusTag';
import type { AnalysedRecording, IdentityAnomaly, IdentityDecision } from '../../../domain/types';
import { Card, ObservationList, TextList, TimeBadge } from './shared';

const DECISION_TONE: Readonly<Record<IdentityDecision, 'good' | 'bad' | 'warn' | 'neutral'>> = {
  CONSISTENT: 'good',
  INCONSISTENT: 'bad',
  INCONCLUSIVE: 'warn',
  UNKNOWN: 'neutral',
};

function AnomalyRow({ a }: { readonly a: IdentityAnomaly }) {
  switch (a.kind) {
    case 'conflicting-evidence':
      return (
        <>
          <TimeBadge label={a.observation.timestampLabel} />
          <span>{a.observation.text}</span>
        </>
      );
    case 'multiple-people':
      return <span>Multiple people detected in the interview video</span>;
    case 'low-video-quality':
      return <span>{`${a.which === 'reference' ? 'Reference' : 'Interview'} video quality is ${a.quality}`}</span>;
  }
}

export function IdentityTab({ recording }: { readonly recording: AnalysedRecording | null }) {
  if (!recording) return <EmptyState title="Analysis not yet available">This room has no analysed recording yet.</EmptyState>;
  const id = recording.identity;
  if (!id) {
    return (
      <EmptyState title="Phase 1 identity analysis unavailable">
        The selected recording has no identity verification result. Check the Integrity tab for Phase 2.
      </EmptyState>
    );
  }
  const live = id.liveness;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Reveal>
        <Card title="Biometric match" aside={<StatusTag kind="custom" value={id.decisionLabel} tone={DECISION_TONE[id.decision]} size="lg" />} className="h-full">
          <ConfidenceGauge label="Match confidence" value={id.matchConfidence} />
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-xs">
            <div>
              <dt className="text-slate-500">Reference video quality</dt>
              <dd className="mt-0.5 font-semibold text-slate-900">{id.referenceVideoQuality ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Interview video quality</dt>
              <dd className="mt-0.5 font-semibold text-slate-900">{id.interviewVideoQuality ?? '—'}</dd>
            </div>
          </dl>
        </Card>
      </Reveal>
      <Reveal index={1}>
        <Card
          title="Liveness detection"
          className="h-full"
          aside={
            live ? (
              <StatusTag
                kind="custom"
                value={live.passed === null ? 'Undetermined' : live.passed ? 'Live person' : 'Possible spoof'}
                tone={live.passed === null ? 'neutral' : live.passed ? 'good' : 'bad'}
                size="lg"
              />
            ) : undefined
          }
        >
          {live ? (
            <>
              <ConfidenceGauge label="Liveness confidence" value={live.confidence} />
              <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
                Synthetic-video risk <StatusTag kind="risk" value={live.risk} />
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">No liveness signal for this recording.</p>
          )}
        </Card>
      </Reveal>
      <Reveal index={2} className="md:col-span-2">
        <Card
          title="Flagged anomalies"
          aside={<span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 tabular-nums">{id.anomalies.length}</span>}
        >
          {id.anomalies.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-emerald-800">
              <CheckIcon className="text-emerald-600" /> No anomalies flagged.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {id.anomalies.map((a, i) => (
                <li key={i} className="flex items-start gap-3 rounded-xl bg-slate-50 px-3 py-2.5 text-slate-800">
                  <AlertIcon className="mt-0.5 shrink-0 text-red-600" />
                  <AnomalyRow a={a} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </Reveal>
      <Reveal index={3}>
        <Card title="Matching evidence" className="h-full">
          <ObservationList items={id.matchingEvidence} empty="No matching evidence recorded." />
        </Card>
      </Reveal>
      <Reveal index={4}>
        <Card title="Analysis limitations" className="h-full">
          <TextList items={id.limitations} empty="No limitations reported." />
        </Card>
      </Reveal>
    </div>
  );
}
