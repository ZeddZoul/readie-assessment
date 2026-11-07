import clsx from 'clsx';
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';

const SEGMENT = 'flex h-8 w-9 items-center justify-center transition-colors duration-200';

/** Apple-style joined chevrons with a "1–25 of 312" summary. Hidden when everything fits on one page. */
export function Pagination({
  page,
  pageCount,
  from,
  to,
  total,
  onPage,
}: {
  readonly page: number;
  readonly pageCount: number;
  readonly from: number;
  readonly to: number;
  readonly total: number;
  readonly onPage: (page: number) => void;
}) {
  if (pageCount <= 1) return null;
  const btn = (disabled: boolean) => clsx(SEGMENT, disabled ? 'cursor-not-allowed text-slate-300' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900');
  return (
    <nav aria-label="Pages" className="flex items-center justify-between gap-3 border-t border-slate-200/80 px-4 py-3">
      <p className="text-sm text-slate-500 tabular-nums" aria-live="polite">
        <span className="font-semibold text-slate-900">
          {from}–{to}
        </span>{' '}
        of {total}
        <span className="sr-only">
          , page {page + 1} of {pageCount}
        </span>
      </p>
      <div className="flex items-center divide-x divide-slate-200 overflow-hidden rounded-full bg-white shadow-card ring-1 ring-black/[0.06]">
        <button type="button" className={btn(page === 0)} disabled={page === 0} onClick={() => onPage(page - 1)} aria-label="Previous page">
          <LuChevronLeft aria-hidden="true" size={17} />
        </button>
        <button type="button" className={btn(page >= pageCount - 1)} disabled={page >= pageCount - 1} onClick={() => onPage(page + 1)} aria-label="Next page">
          <LuChevronRight aria-hidden="true" size={17} />
        </button>
      </div>
    </nav>
  );
}
