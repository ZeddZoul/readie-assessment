import clsx from 'clsx';
import type { IntegrityStatus, RiskLevel, VerificationStatus } from '../../domain/types';

export type Tone = 'good' | 'warn' | 'bad' | 'info' | 'neutral';

/** Colour lives only in the dot; text stays neutral (Apple-style minimal status). */
export const TONE_DOT: Readonly<Record<Tone, string>> = {
  good: 'bg-emerald-500',
  warn: 'bg-amber-500',
  bad: 'bg-red-500',
  info: 'bg-sky-500',
  neutral: 'bg-slate-400',
};

export const VERIFICATION_TONE: Readonly<Record<VerificationStatus, Tone>> = { COMPLETED: 'good', IN_PROGRESS: 'info', FAILED: 'bad' };
const INTEGRITY_TONE: Readonly<Record<IntegrityStatus, Tone>> = { PASSED: 'good', WARNING: 'warn', FAILED: 'bad' };
export const RISK_TONE: Readonly<Record<RiskLevel, Tone>> = { LOW: 'good', MEDIUM: 'warn', HIGH: 'bad', UNKNOWN: 'neutral' };

export type StatusTagProps =
  | { readonly kind: 'verification'; readonly value: VerificationStatus }
  | { readonly kind: 'integrity'; readonly value: IntegrityStatus }
  | { readonly kind: 'risk'; readonly value: RiskLevel }
  | { readonly kind: 'custom'; readonly value: string; readonly tone: Tone };

function toneOf(p: StatusTagProps): Tone {
  switch (p.kind) {
    case 'verification':
      return VERIFICATION_TONE[p.value];
    case 'integrity':
      return INTEGRITY_TONE[p.value];
    case 'risk':
      return RISK_TONE[p.value];
    case 'custom':
      return p.tone;
  }
}

/** Brief status values (COMPLETED, PASSED…) keep their literal text and are displayed in sentence case via CSS. */
function labelOf(p: StatusTagProps): string {
  switch (p.kind) {
    case 'verification':
    case 'integrity':
    case 'custom':
      return p.value.replace(/_/g, ' ');
    case 'risk':
      return `${p.value} risk`;
  }
}

export function StatusTag(props: StatusTagProps & { readonly size?: 'sm' | 'lg' }) {
  const tone = toneOf(props);
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 whitespace-nowrap',
        props.size === 'lg' ? 'text-sm font-semibold text-slate-900' : 'text-[13px] font-medium text-slate-700',
      )}
      data-tone={tone}
    >
      <span aria-hidden="true" className={clsx('shrink-0 rounded-full', props.size === 'lg' ? 'size-2' : 'size-1.5', TONE_DOT[tone])} />
      <span className="inline-block lowercase first-letter:uppercase">{labelOf(props)}</span>
    </span>
  );
}
