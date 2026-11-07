import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { useCampaignJobs } from '../../api/queries';
import { AsyncBoundary } from '../../components/ui/AsyncBoundary';
import { PageHeader } from '../../components/ui/PageHeader';
import { Reveal } from '../../components/ui/Reveal';
import { CampaignSkeleton } from '../../components/ui/Skeletons';
import { Button, EmptyState } from '../../components/ui/States';
import type { EvaluationJob } from '../../domain/types';
import { useMediaQuery } from '../../lib/useMediaQuery';
import { DEFAULT_VIEW, filterSortJobs, paginate, type JobsView } from './filterSortJobs';
import { Pagination } from './Pagination';
import { JobsCards, JobsTable } from './JobsTable';
import { JobsToolbar } from './JobsToolbar';
import { StatusFilter } from './StatusFilter';
import { getRememberedView, rememberView } from './viewMemory';

export function parseCampaignId(value: string | undefined): number | null {
  return value !== undefined && /^[1-9]\d{0,8}$/.test(value) ? Number(value) : null;
}

export function CampaignPage() {
  const { campaignId: raw } = useParams();
  const campaignId = parseCampaignId(raw);
  const state = useCampaignJobs(campaignId);

  if (campaignId === null) {
    return (
      <EmptyState title="Invalid campaign ID">
        “{raw}” is not a campaign ID. Choose a campaign above.
      </EmptyState>
    );
  }

  const jobTitle = state.status === 'success' ? (state.data.find((j) => j.jobTitle)?.jobTitle ?? null) : null;

  return (
    <section aria-labelledby="campaign-heading" className="space-y-8">
      <Reveal>
        <PageHeader
          id="campaign-heading"
          eyebrow={jobTitle ?? 'Hiring campaign'}
          title={`Campaign ${campaignId}`}
          subtitle="Review identity verification and proctoring results for every candidate in this campaign."
        />
      </Reveal>
      <AsyncBoundary
        state={state}
        loading={<CampaignSkeleton />}
        empty={(retry) => (
          <EmptyState
            title={`No evaluation jobs in campaign ${campaignId}`}
            action={
              <Button variant="primary" onClick={retry}>
                Reload
              </Button>
            }
          >
            Candidates appear here once they start an interview.
          </EmptyState>
        )}
      >
        {/* Keyed by campaign so filters reset when switching campaigns. */}
        {(jobs) => <CampaignJobs key={campaignId} campaignId={campaignId} jobs={jobs} />}
      </AsyncBoundary>
    </section>
  );
}

function CampaignJobs({ campaignId, jobs }: { readonly campaignId: number; readonly jobs: readonly EvaluationJob[] }) {
  const [view, setView] = useState<JobsView>(() => getRememberedView(campaignId) ?? DEFAULT_VIEW);
  useEffect(() => rememberView(campaignId, view), [campaignId, view]);
  // The input stays instant; filtering a large list waits for typing to settle.
  const deferredQuery = useDeferredValue(view.emailQuery);
  const visible = useMemo(
    () => filterSortJobs(jobs, { status: view.status, emailQuery: deferredQuery, sort: view.sort }),
    [jobs, view.status, deferredQuery, view.sort],
  );
  const paged = paginate(visible, view.page);
  const wide = useMediaQuery('(min-width: 960px)');
  // Any change to what's being listed starts again from the first page.
  const refine = (next: JobsView) => setView({ ...next, page: 0 });
  return (
    <div className="space-y-6">
      <StatusFilter jobs={jobs} value={view.status} onChange={(status) => refine({ ...view, status })} />
      <Reveal index={2}>
        <div className="overflow-hidden rounded-card bg-white shadow-card">
          <JobsToolbar view={view} onChange={refine} shown={visible.length} total={jobs.length} />
          {visible.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="No matching candidates"
                action={<Button onClick={() => setView({ ...DEFAULT_VIEW, sort: view.sort })}>Clear filters</Button>}
              >
                No candidate matches the current status filter and email search.
              </EmptyState>
            </div>
          ) : wide ? (
            <JobsTable jobs={paged.items} sort={view.sort} />
          ) : (
            <JobsCards jobs={paged.items} sort={view.sort} />
          )}
          <Pagination page={paged.page} pageCount={paged.pageCount} from={paged.from} to={paged.to} total={visible.length} onPage={(page) => setView({ ...view, page })} />
        </div>
      </Reveal>
    </div>
  );
}
