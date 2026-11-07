import clsx from 'clsx';

/** One neutral monogram tone, Apple Contacts-style; colour is reserved for status. */
const TONE = 'bg-gradient-to-b from-slate-200 to-slate-300/80 text-slate-600';

export function initialsOf(name: string | null, email: string | null): string {
  const source = name?.trim() || email?.split('@')[0] || '?';
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  const letters = parts.length >= 2 ? `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}` : source.slice(0, 2);
  return letters.toUpperCase();
}

export function Avatar({ name, email, size = 'md' }: { readonly name: string | null; readonly email: string | null; readonly size?: 'sm' | 'md' | 'lg' | 'hero' }) {
  return (
    <span
      aria-hidden="true"
      className={clsx(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold select-none',
        size === 'sm' && 'size-7 text-[11px]',
        size === 'md' && 'size-9 text-xs',
        size === 'lg' && 'size-14 text-base',
        size === 'hero' && 'size-11 text-sm sm:size-14 sm:text-base',
        TONE,
      )}
    >
      {initialsOf(name, email)}
    </span>
  );
}
