import clsx from 'clsx';
import { TONE_DOT, VERIFICATION_TONE } from '../../components/ui/StatusTag';
import { useReveal } from '../../components/ui/Reveal';
import type { EvaluationJob } from '../../domain/types';
import type { StatusFilter as Filter } from './filterSortJobs';

const OPTIONS: readonly { value: Filter; label: string; hint: string }[] = [
  { value: 'ALL', label: 'All candidates', hint: 'Every evaluation job' },
  { value: 'COMPLETED', label: 'Completed', hint: 'Analysis finished' },
  { value: 'IN_PROGRESS', label: 'In progress', hint: 'Analysis running' },
  { value: 'FAILED', label: 'Failed', hint: 'Nothing captured' },
];

function Option({
  option,
  count,
  total,
  checked,
  onSelect,
  index,
}: {
  readonly option: (typeof OPTIONS)[number];
  readonly count: number;
  readonly total: number;
  readonly checked: boolean;
  readonly onSelect: () => void;
  readonly index: number;
}) {
  const r = useReveal<HTMLLabelElement>(index);
  const share = total === 0 ? 0 : count / total;
  const dot = option.value === 'ALL' ? 'bg-brand-500' : TONE_DOT[VERIFICATION_TONE[option.value]];
  return (
    <label
      ref={r.ref}
      data-visible={r['data-visible']}
      style={r.style}
      className={clsx(
        r.className,
        'relative flex cursor-pointer flex-col rounded-card border bg-white p-3.5 shadow-card sm:p-4',
        'transition-[border-color,box-shadow,background-color] duration-200 ease-out-soft',
        'has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-brand-600',
        checked ? 'border-brand-500 ring-1 ring-brand-500' : 'border-transparent hover:shadow-raised',
      )}
    >
      <input type="radio" name="verification-status" className="sr-only" checked={checked} onChange={onSelect} />
      <span className="flex items-center gap-2 text-sm font-medium text-slate-600">
        <span aria-hidden="true" className={clsx('size-2 rounded-full', dot)} />
        {option.label}
      </span>
      <span className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums sm:mt-2 sm:text-3xl">{count}</span>
      <span className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-slate-100 sm:mt-3" aria-hidden="true">
        <span className={clsx('block h-full rounded-full', dot)} style={{ width: `${share * 100}%` }} />
      </span>
      <span className="mt-2 hidden text-xs text-slate-500 sm:block">
        {option.value === 'ALL' ? option.hint : `${Math.round(share * 100)}% · ${option.hint}`}
      </span>
    </label>
  );
}

/** Summary cards that double as the status filter (a native radio group, so arrow keys work). */
export function StatusFilter({ jobs, value, onChange }: { readonly jobs: readonly EvaluationJob[]; readonly value: Filter; readonly onChange: (f: Filter) => void }) {
  const counts: Record<Filter, number> = { ALL: jobs.length, COMPLETED: 0, IN_PROGRESS: 0, FAILED: 0 };
  for (const j of jobs) counts[j.verificationStatus] += 1;
  return (
    <fieldset>
      <legend className="sr-only">Verification status</legend>
      <div role="radiogroup" aria-label="Verification status" className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {OPTIONS.map((o, i) => (
          <Option key={o.value} option={o} index={i} count={counts[o.value]} total={jobs.length} checked={value === o.value} onSelect={() => onChange(o.value)} />
        ))}
      </div>
    </fieldset>
  );
}
