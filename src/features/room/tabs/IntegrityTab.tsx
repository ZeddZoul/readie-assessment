import clsx from 'clsx';
import { CheckIcon } from '../../../components/ui/Icons';
import { Reveal } from '../../../components/ui/Reveal';
import { EmptyState } from '../../../components/ui/States';
import { RISK_TONE, StatusTag, TONE_DOT } from '../../../components/ui/StatusTag';
import type { AnalysedRecording, FlaggedFrameSource } from '../../../domain/types';
import { formatPercent } from '../../../lib/time';
import { Card, ObservationList, TextList, TimeBadge } from './shared';

const SOURCE_LABEL: Readonly<Record<FlaggedFrameSource, string>> = {
  personContinuity: 'Person continuity',
  possibleOffScreenAssistance: 'Off-screen / second device',
  syntheticVideo: 'Synthetic video',
  audioVideoConsistency: 'Audio / video',
  suspiciousTimeRange: 'Suspicious range',
  identity: 'Identity',
};

const humanize = (s: string): string => {
  const t = s.replace(/_/g, ' ').toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
};

function Metric({ label, value, unit, hint, bar }: { readonly label: string; readonly value: string; readonly unit?: string; readonly hint: string; readonly bar?: number | null }) {
  return (
    <div className="h-full rounded-card bg-white p-5 shadow-card">
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="mt-2 flex items-baseline gap-1">
        <span className="text-4xl leading-none font-semibold tracking-tight text-slate-900 tabular-nums">{value}</span>
        {unit ? <span className="text-sm font-medium text-slate-500">{unit}</span> : null}
      </p>
      {bar !== undefined ? (
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
          <div className="h-full rounded-full bg-brand-500 transition-[width] duration-700 ease-out-soft" style={{ width: `${bar ?? 0}%` }} />
        </div>
      ) : null}
      <p className="mt-3 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

export function IntegrityTab({ recording }: { readonly recording: AnalysedRecording | null }) {
  if (!recording) return <EmptyState title="Analysis not yet available">This room has no analysed recording yet.</EmptyState>;
  const r = recording.integrity;
  if (!r) return <EmptyState title="Phase 2 integrity audit unavailable">The selected recording has no proctoring result.</EmptyState>;
  return (
    <div className="space-y-4">
      <Reveal>
        <div className="flex flex-col gap-2 rounded-card bg-white p-5 shadow-card sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-sm text-slate-500">Overall status</span>
            <span data-testid="integrity-status">
              <StatusTag kind="integrity" value={r.status} size="lg" />
            </span>
          </div>
          <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-slate-500">
            <span>{humanize(r.dispositionLabel)}</span>
            {r.humanReviewRequired ? (
              <>
                <span aria-hidden="true">·</span>
                <span role="note" className="font-medium text-slate-800">
                  Human review required
                </span>
              </>
            ) : null}
          </p>
        </div>
      </Reveal>
      <div className="grid gap-4 sm:grid-cols-3">
        <Reveal index={1}>
          <Metric
            label="Gaze tracking index"
            value={r.gazeTrackingIndex === null ? 'n/a' : String(r.gazeTrackingIndex)}
            {...(r.gazeTrackingIndex === null ? {} : { unit: '/ 100' })}
            bar={r.gazeTrackingIndex}
            hint="Higher means more on-screen attention"
          />
        </Reveal>
        <Reveal index={2}>
          <Metric label="Audio anomaly count" value={String(r.audioAnomalyCount)} hint="Audio/video mismatches and audio flags" />
        </Reveal>
        <Reveal index={3}>
          <Metric label="Flagged frames" value={String(r.flaggedFrames.length)} hint="Multiple faces, second device, substitution" />
        </Reveal>
      </div>
      <Reveal index={4}>
        <Card title="Flagged frames">
          {r.flaggedFrames.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-emerald-800">
              <CheckIcon className="text-emerald-600" /> No frames flagged.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {r.flaggedFrames.map((f, i) => (
                <li key={i} className="flex flex-wrap items-start gap-x-3 gap-y-1 py-2.5 first:pt-0 last:pb-0">
                  <TimeBadge label={f.timestampLabel ?? '—'} />
                  <span className="w-44 shrink-0 text-xs font-semibold text-slate-500 sm:pt-0.5">{SOURCE_LABEL[f.source]}</span>
                  <span className="min-w-0 flex-1 text-slate-800">{f.reason}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </Reveal>
      <div className="grid gap-4 md:grid-cols-2">
        {r.signals.map((s, i) => (
          <Reveal key={s.key} index={5 + i}>
            <Card title={s.label} aside={<StatusTag kind="risk" value={s.risk} />} className="h-full">
              <div className="mb-4 flex items-center gap-3 text-xs text-slate-500">
                <span className="w-20 shrink-0">Confidence</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                  <span className={clsx('block h-full rounded-full', TONE_DOT[RISK_TONE[s.risk]])} style={{ width: `${Math.min(1, Math.max(0, s.confidence)) * 100}%` }} />
                </span>
                <span className="w-10 text-right font-semibold text-slate-700 tabular-nums">{formatPercent(s.confidence)}</span>
              </div>
              <ObservationList items={s.observations} empty="No observations." />
            </Card>
          </Reveal>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Suspicious time ranges">
          {r.suspiciousTimeRanges.length === 0 ? (
            <p className="text-sm text-slate-500">None reported.</p>
          ) : (
            <ul className="space-y-2.5 text-sm">
              {r.suspiciousTimeRanges.map((s, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">{s.label}</span>
                  <span className="text-slate-700">{s.reason}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Analysis limitations">
          <TextList items={r.limitations} empty="No limitations reported." />
        </Card>
      </div>
    </div>
  );
}
