import type { EvaluationJob, VerificationStatus } from '../../domain/types';

export type StatusFilter = VerificationStatus | 'ALL';
export type SortDirection = 'asc' | 'desc';

export interface JobsView {
  readonly status: StatusFilter;
  readonly emailQuery: string;
  readonly sort: SortDirection;
  /** Zero-based page of the filtered, sorted list. */
  readonly page: number;
}

export type JobsQuery = Pick<JobsView, 'status' | 'emailQuery' | 'sort'>;

export const PAGE_SIZE = 25;
export const DEFAULT_VIEW: JobsView = { status: 'ALL', emailQuery: '', sort: 'desc', page: 0 };

export function matchesView(job: EvaluationJob, view: Pick<JobsView, 'status' | 'emailQuery'>): boolean {
  const q = view.emailQuery.trim().toLowerCase();
  return (view.status === 'ALL' || job.verificationStatus === view.status) && (q === '' || job.candidateEmail.toLowerCase().includes(q));
}

/** Pure filter + search + stable sort by submission time. */
export function filterSortJobs(jobs: readonly EvaluationJob[], view: JobsQuery): EvaluationJob[] {
  const dir = view.sort === 'asc' ? 1 : -1;
  return jobs
    .map((job, index) => ({ job, index }))
    .filter(({ job }) => matchesView(job, view))
    .sort((a, b) => dir * (a.job.submittedAt.getTime() - b.job.submittedAt.getTime()) || a.index - b.index)
    .map(({ job }) => job);
}

export interface Page<T> {
  readonly items: readonly T[];
  /** Clamped zero-based page actually shown. */
  readonly page: number;
  readonly pageCount: number;
  /** 1-based index of the first item shown (0 when empty). */
  readonly from: number;
  /** 1-based index of the last item shown (0 when empty). */
  readonly to: number;
}

/** Pure, total pagination: any requested page is clamped into range. */
export function paginate<T>(items: readonly T[], page: number, size: number = PAGE_SIZE): Page<T> {
  const pageCount = Math.max(1, Math.ceil(items.length / size));
  const safe = Number.isFinite(page) ? Math.min(Math.max(0, Math.trunc(page)), pageCount - 1) : 0;
  const start = safe * size;
  const slice = items.slice(start, start + size);
  return { items: slice, page: safe, pageCount, from: slice.length ? start + 1 : 0, to: start + slice.length };
}
