import clsx from 'clsx';
import { useEffect, useState, type ReactNode } from 'react';
import { LuCheck, LuLink } from 'react-icons/lu';
import { Avatar } from '../../components/ui/Avatar';
import { StatusTag } from '../../components/ui/StatusTag';
import { classifyConfidence } from '../../domain/derive';
import type { AnalysedRecording, AnalysisCompleteness, RoomEvaluation } from '../../domain/types';
import { Select } from '../../components/ui/Select';
import { formatPercent, formatTime } from '../../lib/time';
import type { RoomTab } from '../../state/tab';

const COMPLETENESS: Readonly<Record<AnalysisCompleteness, string>> = {
  complete: 'Analysis complete (Y)',
  partial: 'Analysis partial (P)',
  none: 'Not analysed (N)',
  unknown: 'Analysis status unknown',
};

function CopyLinkButton() {
  const [state, setState] = useState<'idle' | 'copied' | 'error'>('idle');
  useEffect(() => {
    if (state === 'idle') return;
    const t = window.setTimeout(() => setState('idle'), 2000);
    return () => window.clearTimeout(t);
  }, [state]);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(window.location.href).then(
          () => setState('copied'),
          () => setState('error'),
        );
      }}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-slate-100 p-2 text-sm font-semibold text-slate-800 transition-colors duration-200 hover:bg-slate-200/70 sm:px-3 sm:py-1.5"
    >
      {state === 'copied' ? <LuCheck aria-hidden="true" size={15} className="text-emerald-600" /> : <LuLink aria-hidden="true" size={15} />}
      <span aria-live="polite" className="sr-only sm:not-sr-only">
        {state === 'copied' ? 'Copied' : state === 'error' ? 'Copy failed' : 'Copy link'}
      </span>
    </button>
  );
}

function VerdictTile({
  label,
  short,
  onClick,
  children,
  hint,
}: {
  readonly label: string;
  readonly short: string;
  readonly onClick: () => void;
  readonly children: ReactNode;
  readonly hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label}: ${hint}. Open tab`}
      className="group flex min-w-0 flex-col items-start rounded-2xl bg-slate-50 px-3 py-2.5 text-left transition-[background-color,box-shadow] duration-200 ease-out-soft hover:bg-white hover:shadow-card sm:px-3.5 sm:py-3"
    >
      <span className="text-eyebrow max-w-full truncate text-slate-500 group-hover:text-brand-700">
        <span className="sm:hidden">{short}</span>
        <span className="hidden sm:inline">{label}</span>
      </span>
      <span className="mt-1.5 flex min-h-6 items-center">{children}</span>
    </button>
  );
}

export function RoomHeader({
  room,
  selected,
  onOpenTab,
}: {
  readonly room: RoomEvaluation;
  readonly selected: AnalysedRecording | null;
  readonly onOpenTab: (tab: RoomTab) => void;
}) {
  const integrity = selected?.integrity ?? null;
  const identity = selected?.identity ?? null;
  const band = identity ? classifyConfidence(identity.matchConfidence) : null;
  return (
    <div className="rounded-card bg-white p-4 shadow-card sm:p-6">
      <div className="flex items-start gap-3 sm:gap-4">
        <Avatar name={null} email={room.candidateEmail} size="hero" />
        <div className="min-w-0 flex-1">
          <p className="text-eyebrow text-slate-500">Interview room</p>
          <h1 className="text-title mt-1 break-all text-slate-900" data-testid="room-title">
            {room.candidateEmail ?? 'Unknown candidate'}
          </h1>
          <p className="mt-1.5 flex flex-wrap gap-x-1.5 text-xs text-slate-500">
            <span>Campaign {room.campaignId}</span>
            <span aria-hidden="true">·</span>
            <span>
              {room.recordingCount} recordings ({room.analysed.length} analysed)
            </span>
            <span aria-hidden="true">·</span>
            <span>{COMPLETENESS[room.completeness]}</span>
          </p>
        </div>
        <CopyLinkButton />
      </div>

      {selected ? (
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 sm:gap-3">
          <VerdictTile label="Integrity" short="Integrity" hint={integrity?.status ?? 'unavailable'} onClick={() => onOpenTab('integrity')}>
            {integrity ? <StatusTag kind="integrity" value={integrity.status} /> : <span className="text-sm text-slate-500">n/a</span>}
          </VerdictTile>
          <VerdictTile label="Identity match" short="Identity" hint={identity ? `${formatPercent(identity.matchConfidence)}, ${identity.decisionLabel.toLowerCase()}` : 'unavailable'} onClick={() => onOpenTab('identity')}>
            {identity ? (
              <span className="flex items-center gap-1.5 text-lg leading-none font-semibold tracking-tight text-slate-900 tabular-nums">
                <span
                  aria-hidden="true"
                  className={clsx('size-2 rounded-full', band === 'pass' ? 'bg-emerald-500' : band === 'warn' ? 'bg-amber-500' : 'bg-red-500')}
                />
                {formatPercent(identity.matchConfidence)}
                <span className="hidden text-xs font-medium tracking-normal text-slate-500 sm:inline">{identity.decision === 'UNKNOWN' ? '' : identity.decision.toLowerCase()}</span>
              </span>
            ) : (
              <span className="text-sm text-slate-500">n/a</span>
            )}
          </VerdictTile>
          <VerdictTile label="Flagged frames" short="Flags" hint={integrity ? String(integrity.flaggedFrames.length) : 'unavailable'} onClick={() => onOpenTab('integrity')}>
            <span className="text-lg leading-none font-semibold tracking-tight text-slate-900 tabular-nums">{integrity ? integrity.flaggedFrames.length : '—'}</span>
          </VerdictTile>
        </div>
      ) : null}
    </div>
  );
}

export function RecordingSelect({
  recordings,
  value,
  onChange,
}: {
  readonly recordings: readonly AnalysedRecording[];
  readonly value: string;
  readonly onChange: (id: string) => void;
}) {
  const options = recordings.map((r, i) => ({
    value: r.id,
    label: `${formatShortDate(r.createdAt)} · ${formatTime(r.createdAt)}${i === 0 ? ' · Latest' : ''}`,
    trailing: r.integrity ? <StatusTag kind="integrity" value={r.integrity.status} /> : undefined,
  }));
  return <Select className="w-full sm:w-80" label="Analysed recording" hideLabel align="end" value={value} options={options} onChange={onChange} />;
}

const shortDate = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
const formatShortDate = (d: Date): string => shortDate.format(d);
