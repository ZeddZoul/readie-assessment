import fc from 'fast-check';
import { toEvaluationJob } from '../../domain/adapters';
import type { EvaluationJob } from '../../domain/types';
import { campaignJobArb } from '../../test/arbitraries';
import { filterSortJobs, matchesView, paginate, type StatusFilter } from './filterSortJobs';

const jobsArb = fc.array(campaignJobArb, { maxLength: 15 }).map((raws) => raws.map(toEvaluationJob).filter((j): j is EvaluationJob => j !== null));
const statusArb = fc.constantFrom<StatusFilter>('ALL', 'COMPLETED', 'IN_PROGRESS', 'FAILED');
const queryArb = fc.oneof(fc.constant(''), fc.constantFrom(' A ', '@', '.com', 'x'), fc.string({ maxLength: 4 }));

describe('filter/sort properties', () => {
  // Property 5 — Validates: Requirements 3.1, 3.2, 3.3
  it('Property 5: filter and search are exact', () => {
    fc.assert(
      fc.property(jobsArb, statusArb, queryArb, (jobs, status, emailQuery) => {
        const out = filterSortJobs(jobs, { status, emailQuery, sort: 'desc' });
        const q = emailQuery.trim().toLowerCase();
        for (const j of out) {
          expect(status === 'ALL' || j.verificationStatus === status).toBe(true);
          expect(j.candidateEmail.toLowerCase().includes(q)).toBe(true);
        }
        expect(out.length).toBe(jobs.filter((j) => matchesView(j, { status, emailQuery })).length);
      }),
      { numRuns: 200 },
    );
  });

  // Property 6 — Validates: Requirements 3.4
  it('Property 6: sort is an ordered permutation', () => {
    fc.assert(
      fc.property(jobsArb, fc.constantFrom('asc' as const, 'desc' as const), (jobs, sort) => {
        const out = filterSortJobs(jobs, { status: 'ALL', emailQuery: '', sort });
        const key = (j: EvaluationJob) => JSON.stringify(j);
        expect(out.map(key).sort()).toEqual(jobs.map(key).sort());
        for (let i = 1; i < out.length; i++) {
          const prev = out[i - 1]?.submittedAt.getTime() ?? 0;
          const cur = out[i]?.submittedAt.getTime() ?? 0;
          if (sort === 'asc') expect(cur).toBeGreaterThanOrEqual(prev);
          else expect(cur).toBeLessThanOrEqual(prev);
        }
      }),
      { numRuns: 200 },
    );
  });
});

describe('pagination', () => {
  it('covers every item exactly once, in order, and clamps any requested page', () => {
    fc.assert(
      fc.property(fc.array(fc.integer(), { maxLength: 120 }), fc.integer({ min: 1, max: 30 }), fc.integer({ min: -5, max: 50 }), (items, size, requested) => {
        const first = paginate(items, 0, size);
        const all = Array.from({ length: first.pageCount }, (_, p) => paginate(items, p, size).items).flat();
        expect(all).toEqual(items);
        const r = paginate(items, requested, size);
        expect(r.page).toBeGreaterThanOrEqual(0);
        expect(r.page).toBeLessThan(r.pageCount);
        expect(r.items.length).toBeLessThanOrEqual(size);
        if (items.length === 0) expect([r.from, r.to]).toEqual([0, 0]);
        else expect(r.to - r.from + 1).toBe(r.items.length);
      }),
      { numRuns: 300 },
    );
  });
});
