import { useEffect, useRef } from 'react';
import { SearchIcon, XIcon } from '../../components/ui/Icons';
import { Select } from '../../components/ui/Select';
import { Tooltip } from '../../components/ui/Tooltip';
import type { JobsView, SortDirection } from './filterSortJobs';

const SORT_OPTIONS: readonly { value: SortDirection; label: string }[] = [
  { value: 'desc', label: 'Newest first' },
  { value: 'asc', label: 'Oldest first' },
];

export function JobsToolbar({
  view,
  onChange,
  shown,
  total,
}: {
  readonly view: JobsView;
  readonly onChange: (v: JobsView) => void;
  readonly shown: number;
  readonly total: number;
}) {
  const input = useRef<HTMLInputElement>(null);
  // "/" focuses search from anywhere on the page (unless the user is already typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target instanceof HTMLElement ? e.target : null;
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      e.preventDefault();
      input.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <div className="flex flex-col gap-3 border-b border-slate-200/80 p-4 md:flex-row md:items-center md:justify-between">
      <div className="relative w-full md:max-w-sm">
        <label htmlFor="email-search" className="sr-only">
          Search by email
        </label>
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-500" />
        <input
          ref={input}
          id="email-search"
          type="search"
          aria-keyshortcuts="/"
          autoComplete="off"
          spellCheck={false}
          className="w-full rounded-xl bg-slate-100 py-2 pr-9 pl-9 text-sm placeholder:text-slate-500 transition-[background-color,box-shadow] duration-200 ease-out-soft hover:bg-slate-200/60 focus:bg-white focus:ring-2 focus:ring-brand-600 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          placeholder="Search by email"
          value={view.emailQuery}
          onChange={(e) => onChange({ ...view, emailQuery: e.target.value })}
        />
        {view.emailQuery ? (
          <button
            type="button"
            onClick={() => onChange({ ...view, emailQuery: '' })}
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-800"
            aria-label="Clear search"
          >
            <XIcon width={14} height={14} />
          </button>
        ) : (
          <span className="absolute top-1/2 right-2.5 hidden -translate-y-1/2 sm:block">
            <Tooltip content="Press / to search from anywhere on this page" describe={false}>
              <kbd
                aria-hidden="true"
                onClick={() => input.current?.focus()}
                className="cursor-pointer rounded border border-slate-200 bg-white px-1.5 font-mono text-[11px] text-slate-500"
              >
                /
              </kbd>
            </Tooltip>
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-4 md:justify-end">
        <p className="text-sm text-slate-500 tabular-nums" aria-live="polite">
          Showing <span className="font-semibold text-slate-900">{shown}</span> of {total} candidates
        </p>
        <Select
          className="w-40"
          label="Sort by submission time"
          hideLabel
          size="sm"
          align="end"
          value={view.sort}
          options={SORT_OPTIONS}
          onChange={(sort) => onChange({ ...view, sort })}
          tooltip="Sort by submission time"
        />
      </div>
    </div>
  );
}
