import clsx from 'clsx';
import { CONFIDENCE_THRESHOLDS } from '../../domain/derive';
import { formatPercent } from '../../lib/time';

type Band = 'pass' | 'warn' | 'fail';
const BAR: Readonly<Record<Band, string>> = { pass: 'bg-emerald-500', warn: 'bg-amber-500', fail: 'bg-red-500' };
const DOT: Readonly<Record<Band, string>> = { pass: 'bg-emerald-500', warn: 'bg-amber-500', fail: 'bg-red-500' };
const BAND_TEXT: Readonly<Record<Band, string>> = { pass: 'Strong', warn: 'Needs review', fail: 'Weak' };

export interface ConfidenceGaugeProps {
  readonly label: string;
  /** 0–1 */
  readonly value: number;
  readonly thresholds?: { readonly pass: number; readonly warn: number };
}

/** Threshold bar with marked thresholds; meaning is carried in text as well as colour. */
export function ConfidenceGauge({ label, value, thresholds = CONFIDENCE_THRESHOLDS }: ConfidenceGaugeProps) {
  const v = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
  const band: Band = v >= thresholds.pass ? 'pass' : v >= thresholds.warn ? 'warn' : 'fail';
  const pct = formatPercent(v);
  return (
    <div className="w-full">
      <div className="flex items-end justify-between gap-3">
        <span className="text-sm font-medium text-slate-600">{label}</span>
        <span className="text-2xl leading-none font-semibold tracking-tight tabular-nums">{pct}</span>
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(v * 100)}
        aria-valuetext={`${pct}, ${BAND_TEXT[band]}`}
        className="relative mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100"
      >
        <div className={clsx('h-full rounded-full transition-[width] duration-700 ease-out-soft', BAR[band])} style={{ width: `${v * 100}%` }} />
        {[thresholds.warn, thresholds.pass].map((t) => (
          <div key={t} aria-hidden="true" className="absolute top-0 h-full w-[3px] -translate-x-1/2 bg-white" style={{ left: `${t * 100}%` }} />
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
          <span aria-hidden="true" className={clsx('size-1.5 rounded-full', DOT[band])} />
          {BAND_TEXT[band]}
        </span>
        <span>
          Review &lt; {Math.round(thresholds.pass * 100)}% · Weak &lt; {Math.round(thresholds.warn * 100)}%
        </span>
      </div>
    </div>
  );
}
