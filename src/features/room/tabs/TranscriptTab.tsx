import clsx from 'clsx';
import { LuInfo } from 'react-icons/lu';
import { useReveal } from '../../../components/ui/Reveal';
import { EmptyState } from '../../../components/ui/States';
import type { AnalysedRecording, SpeakerRole, TranscriptEntry } from '../../../domain/types';

/**
 * Two sides, like a chat: the interviewee on the left in a grey bubble; the interviewer and every other
 * participant (however many) on the right. The interviewer is a blue bubble; other participants appear as
 * white system-style notes (hairline border, flatter, no tail) with their own name and initial. Every bubble shows
 * the speaker on top and the timestamp at the bottom.
 */
const ROLE: Readonly<Record<SpeakerRole, { side: 'left' | 'right'; bubble: string; meta: string; text: string; badge: string; label: string }>> = {
  candidate: {
    side: 'left',
    bubble: 'rounded-2xl rounded-tl-md bg-slate-100 text-slate-800',
    meta: 'text-slate-600',
    text: 'text-sm',
    badge: 'bg-slate-200 text-slate-700',
    label: 'Candidate',
  },
  interviewer: {
    side: 'right',
    bubble: 'rounded-2xl rounded-tr-md bg-brand-600 text-white shadow-card',
    meta: 'text-white',
    text: 'text-sm',
    badge: 'bg-brand-100 text-brand-700',
    label: 'Interviewer / AI',
  },
  // System-style note: white with a hairline border, flatter corners, no tail, no shadow, quieter text.
  other: {
    side: 'right',
    bubble: 'rounded-lg border border-slate-200 bg-white text-slate-700',
    meta: 'text-slate-600',
    text: 'text-[13px]',
    badge: 'bg-slate-200 text-slate-700',
    label: 'Participant',
  },
};

const ANIMATED_ENTRIES = 12;

const initialOf = (entry: TranscriptEntry): string =>
  entry.role === 'candidate' ? 'C' : entry.role === 'interviewer' ? 'I' : (entry.speakerLabel.trim().charAt(0) || 'P').toUpperCase();

function Entry({ entry, index }: { readonly entry: TranscriptEntry; readonly index: number }) {
  const s = ROLE[entry.role];
  // Only the first screenful animates in; long transcripts render statically (no observer per entry).
  const r = useReveal<HTMLLIElement>(index, index < ANIMATED_ENTRIES);
  const right = s.side === 'right';
  const badge = (
    <span aria-hidden="true" className={clsx('mt-1 flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold', s.badge)}>
      {initialOf(entry)}
    </span>
  );
  return (
    <li
      ref={r.ref}
      data-visible={r['data-visible']}
      style={r.style}
      className={clsx(r.className, 'flex gap-2.5', right ? 'justify-end' : 'justify-start')}
      data-role={entry.role}
      data-side={s.side}
    >
      {right ? null : badge}
      <div className={clsx('max-w-[88%] px-4 sm:max-w-[72%]', entry.role === 'other' ? 'py-2.5' : 'py-3', s.bubble)}>
        <div className={clsx('mb-1 flex flex-wrap items-center gap-x-1.5 text-xs', right && 'justify-end', s.meta)}>
          {entry.role === 'other' ? <LuInfo aria-hidden="true" size={13} className="shrink-0" /> : null}
          <span className="font-semibold">{entry.speakerLabel}</span>
          <span>· {s.label}</span>
        </div>
        <p className={clsx('leading-relaxed', s.text)}>{entry.text}</p>
        <time className={clsx('mt-1.5 block text-right font-mono text-[11px] tabular-nums', s.meta)}>{entry.timestampLabel}</time>
      </div>
      {right ? badge : null}
    </li>
  );
}

export function TranscriptTab({ recording }: { readonly recording: AnalysedRecording | null }) {
  if (!recording) return <EmptyState title="Analysis not yet available">This room has no analysed recording yet.</EmptyState>;
  if (recording.transcript.length === 0) return <EmptyState title="No transcript">The selected recording has no transcript entries.</EmptyState>;
  return (
    <div className="rounded-card bg-white p-4 shadow-card sm:p-6">
      <ol className="space-y-4" aria-label="Interview transcript">
        {recording.transcript.map((e, i) => (
          <Entry key={i} entry={e} index={i} />
        ))}
      </ol>
    </div>
  );
}
