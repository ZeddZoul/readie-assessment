import clsx from 'clsx';
import type { ReactNode } from 'react';
import { describeApiError, isAuthError, type ApiError } from '../../api/errors';
import { AlertIcon, SearchIcon } from './Icons';

export function Skeleton({ rows = 5, label = 'Loading' }: { readonly rows?: number; readonly label?: string }) {
  return (
    <div role="status" aria-live="polite" aria-label={label} className="rounded-card bg-white p-4 shadow-card">
      <div className="space-y-3">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="size-9 rounded-full bg-slate-100 motion-safe:animate-pulse" />
            <div className="h-3 flex-1 rounded-full bg-slate-100 motion-safe:animate-pulse" style={{ maxWidth: `${70 - i * 6}%` }} />
            <div className="hidden h-3 w-24 rounded-full bg-slate-100 motion-safe:animate-pulse sm:block" />
          </div>
        ))}
      </div>
      <span className="sr-only">{label}…</span>
    </div>
  );
}

export function EmptyState({
  title,
  children,
  action,
  icon,
}: {
  readonly title: string;
  readonly children?: ReactNode;
  readonly action?: ReactNode;
  readonly icon?: ReactNode;
}) {
  return (
    <div className="rounded-card border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center" data-testid="empty-state">
      <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        {icon ?? <SearchIcon width={20} height={20} />}
      </div>
      <p className="text-base font-semibold tracking-tight text-slate-900">{title}</p>
      {children ? <div className="mx-auto mt-1.5 max-w-md text-sm text-slate-600">{children}</div> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { readonly error: ApiError; readonly onRetry?: () => void }) {
  const auth = isAuthError(error);
  return (
    <div role="alert" className="rounded-card border border-red-200 bg-white p-6 shadow-card" data-testid="error-state">
      <div className="flex gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
          <AlertIcon width={20} height={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold tracking-tight text-slate-900">{auth ? 'Credentials rejected' : 'Something went wrong'}</p>
          <p className="mt-1 text-sm text-slate-600">{describeApiError(error)}</p>
          {error.kind === 'validation' && import.meta.env.DEV ? (
            <details className="mt-2 text-xs text-slate-600">
              <summary className="cursor-pointer">Validation issues ({error.issues.length})</summary>
              <ul className="mt-1 list-disc pl-5">
                {error.issues.slice(0, 20).map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </details>
          ) : null}
          {onRetry ? (
            <div className="mt-4">
              <Button variant="primary" onClick={onRetry}>
                Retry
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = 'secondary',
}: {
  readonly children: ReactNode;
  readonly onClick: () => void;
  readonly variant?: 'primary' | 'secondary';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-[background-color,box-shadow,color] duration-200 ease-out-soft',
        variant === 'primary'
          ? 'bg-brand-600 text-white shadow-sm hover:bg-brand-700'
          : 'bg-white text-slate-800 shadow-card ring-1 ring-slate-200 ring-inset hover:bg-slate-50',
      )}
    >
      {children}
    </button>
  );
}

export function Card({
  title,
  children,
  className,
  aside,
}: {
  readonly title?: string;
  readonly children: ReactNode;
  readonly className?: string;
  readonly aside?: ReactNode;
}) {
  return (
    <section className={clsx('rounded-card bg-white p-5 shadow-card', className)}>
      {title ? (
        <header className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold tracking-tight text-slate-900">{title}</h3>
          {aside}
        </header>
      ) : null}
      {children}
    </section>
  );
}
