import clsx from 'clsx';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { LuChevronLeft, LuChevronRight, LuChevronsUpDown } from 'react-icons/lu';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useCampaignJobs } from '../../api/queries';
import { Avatar } from '../../components/ui/Avatar';
import { ComboboxPopover, type ComboboxItem } from '../../components/ui/ComboboxPopover';
import { PagerSkeleton } from '../../components/ui/Skeletons';
import { Tooltip } from '../../components/ui/Tooltip';
import { TONE_DOT, VERIFICATION_TONE } from '../../components/ui/StatusTag';
import type { EvaluationJob } from '../../domain/types';
import { roomPath } from '../../lib/roomName';
import { parseTab } from '../../state/tab';
import { DEFAULT_VIEW, filterSortJobs } from '../campaign/filterSortJobs';
import { getRememberedView } from '../campaign/viewMemory';

const SEGMENT = 'flex h-8 w-9 items-center justify-center transition-colors duration-200';
const FINDER_LIMIT = 50;

function Step({ to, label, shortcut, children }: { readonly to: string | null; readonly label: string; readonly shortcut: string; readonly children: React.ReactNode }) {
  if (to === null) {
    return (
      <span className={clsx(SEGMENT, 'text-slate-300')} aria-hidden="true">
        {children}
      </span>
    );
  }
  return (
    <Tooltip content={label} shortcut={shortcut.toUpperCase()} describe={false}>
      <Link to={to} className={clsx(SEGMENT, 'text-slate-700 hover:bg-slate-100 hover:text-slate-900')} aria-label={label} aria-keyshortcuts={shortcut}>
        {children}
      </Link>
    </Tooltip>
  );
}

/** Pure finder filter (exported for tests): name or email contains the query, case-insensitive. */
export function findCandidates(jobs: readonly EvaluationJob[], query: string): EvaluationJob[] {
  const q = query.trim().toLowerCase();
  return q === '' ? [...jobs] : jobs.filter((j) => j.candidateEmail.toLowerCase().includes(q) || (j.candidateName?.toLowerCase().includes(q) ?? false));
}

/**
 * Candidate navigation inside a room: a searchable finder ("2 of 4 ⌄", or press /) over every
 * candidate in the campaign, plus prev/next chevrons and J/K through the auditor's filtered list.
 * Both keep the current tab.
 */
export function CandidatePager({ campaignId, roomName }: { readonly campaignId: number; readonly roomName: string }) {
  const state = useCampaignJobs(campaignId);
  const [params] = useSearchParams();
  const { tab } = parseTab(params.get('tab'));
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const remembered = getRememberedView(campaignId) ?? DEFAULT_VIEW;
  const nav = useMemo(() => {
    if (state.status !== 'success') return null;
    const filtered = filterSortJobs(state.data, remembered);
    const list = filtered.some((j) => j.roomName === roomName) ? filtered : filterSortJobs(state.data, DEFAULT_VIEW);
    const i = list.findIndex((j) => j.roomName === roomName);
    if (i === -1) return null;
    return { index: i, total: list.length, prev: list[i - 1]?.roomName ?? null, next: list[i + 1]?.roomName ?? null };
  }, [state, remembered, roomName]);

  // The finder searches every candidate in the campaign (not just the filtered list), in the auditor's sort order.
  const matches = useMemo(() => {
    if (state.status !== 'success') return [];
    return findCandidates(filterSortJobs(state.data, { ...DEFAULT_VIEW, sort: remembered.sort }), query);
  }, [state, remembered.sort, query]);

  useEffect(() => {
    if (!nav) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target instanceof HTMLElement ? e.target : null;
      if (e.metaKey || e.ctrlKey || e.altKey || (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)))) return;
      const target = e.key === 'j' ? nav.next : e.key === 'k' ? nav.prev : null;
      if (target) void navigate(roomPath(target, tab));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nav, navigate, tab]);

  // Every API call surfaces its state: placeholder while loading, inline retry on error.
  if (state.status === 'loading') return <PagerSkeleton />;
  if (state.status === 'error') {
    return (
      <p role="alert" className="flex items-center gap-2 text-sm text-slate-500">
        Couldn’t load candidates
        <button type="button" onClick={state.retry} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-200/70">
          Retry
        </button>
      </p>
    );
  }
  // Empty campaign or a single candidate: there is nothing to step through.
  if (!nav || nav.total < 2) return null;

  const shown = matches.slice(0, FINDER_LIMIT);
  const items: ComboboxItem[] = shown.map((job) => ({
    value: job.roomName,
    selected: job.roomName === roomName,
    content: (
      <>
        <Avatar name={job.candidateName} email={job.candidateEmail} size="sm" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className={clsx('truncate', job.roomName === roomName ? 'font-semibold text-slate-900' : 'text-slate-800')}>
            {job.candidateName ?? <span className="text-slate-500 italic">Unnamed candidate</span>}
          </span>
          <span className="truncate text-xs text-slate-500">{job.candidateEmail}</span>
        </span>
        <span aria-hidden="true" title={job.verificationStatus} className={clsx('size-2 shrink-0 rounded-full', TONE_DOT[VERIFICATION_TONE[job.verificationStatus]])} />
      </>
    ),
  }));

  return (
    <nav aria-label="Candidates" className="flex items-center gap-2">
      <ComboboxPopover
        triggerLabel={`Candidate ${nav.index + 1} of ${nav.total}. Find a candidate`}
        triggerClassName="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm text-slate-500 tabular-nums transition-colors duration-200 hover:bg-slate-200/60 hover:text-slate-700"
        triggerContent={
          <>
            <span>
              <span className="font-semibold text-slate-900">{nav.index + 1}</span> of {nav.total}
            </span>
            <LuChevronsUpDown aria-hidden="true" size={14} />
          </>
        }
        tooltip="Find a candidate"
        dialogLabel="Find a candidate"
        inputLabel="Search candidates by name or email"
        placeholder="Search name or email"
        query={query}
        onQueryChange={setQuery}
        items={items}
        onChoose={(value) => {
          if (value !== roomName) void navigate(roomPath(value, tab));
        }}
        empty="No candidate matches that name or email."
        footer={
          matches.length > FINDER_LIMIT ? (
            `Showing ${FINDER_LIMIT} of ${matches.length}. Keep typing to narrow.`
          ) : (
            <>
              Press <kbd className="rounded border border-slate-200 bg-white px-1 font-mono">/</kbd> to search ·{' '}
              <kbd className="rounded border border-slate-200 bg-white px-1 font-mono">J</kbd>
              <kbd className="ml-0.5 rounded border border-slate-200 bg-white px-1 font-mono">K</kbd> to step
            </>
          )
        }
        shortcut="/"
      />
      <div className="flex items-center divide-x divide-slate-200 overflow-hidden rounded-full bg-white shadow-card ring-1 ring-black/[0.06]">
        <Step to={nav.prev ? roomPath(nav.prev, tab) : null} label="Previous candidate" shortcut="k">
          <LuChevronLeft aria-hidden="true" size={17} />
        </Step>
        <Step to={nav.next ? roomPath(nav.next, tab) : null} label="Next candidate" shortcut="j">
          <LuChevronRight aria-hidden="true" size={17} />
        </Step>
      </div>
    </nav>
  );
}
