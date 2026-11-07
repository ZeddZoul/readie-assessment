import type { Observation } from '../../../domain/types';

export { Card } from '../../../components/ui/States';

export function TimeBadge({ label }: { readonly label: string }) {
  return <time className="inline-flex w-12 shrink-0 justify-center rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600 tabular-nums">{label}</time>;
}

export function ObservationList({ items, empty }: { readonly items: readonly Observation[]; readonly empty: string }) {
  if (items.length === 0) return <p className="text-sm text-slate-500">{empty}</p>;
  return (
    <ul className="space-y-2.5 text-sm">
      {items.map((o, i) => (
        <li key={i} className="flex items-start gap-3">
          <TimeBadge label={o.timestampLabel} />
          <span className="leading-relaxed text-slate-700">{o.text}</span>
        </li>
      ))}
    </ul>
  );
}

export function TextList({ items, empty }: { readonly items: readonly string[]; readonly empty: string }) {
  if (items.length === 0) return <p className="text-sm text-slate-500">{empty}</p>;
  return (
    <ul className="space-y-2 text-sm text-slate-700">
      {items.map((t, i) => (
        <li key={i} className="flex gap-2.5 leading-relaxed">
          <span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-slate-400" />
          {t}
        </li>
      ))}
    </ul>
  );
}
