import type { ReactNode } from 'react';

export function PageHeader({ eyebrow, title, subtitle, id }: { readonly eyebrow: string; readonly title: string; readonly subtitle?: ReactNode; readonly id?: string }) {
  return (
    <header className="max-w-3xl">
      <p className="text-eyebrow text-slate-500">{eyebrow}</p>
      <h1 id={id} className="text-display mt-2 text-slate-900">
        {title}
      </h1>
      {subtitle ? <p className="mt-3 text-[15px] leading-relaxed text-slate-600">{subtitle}</p> : null}
    </header>
  );
}
