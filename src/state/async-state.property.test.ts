import fc from 'fast-check';
import { ApiRequestError } from '../api/errors';
import { toAsyncState, type QueryLike } from './async-state';

// Property 13 — Validates: Requirements 11.1, 11.4, 11.5, 11.6
describe('Property 13: async state is exhaustive and exclusive', () => {
  it('maps every query combination to exactly one state', () => {
    const data = fc.option(fc.array(fc.integer(), { maxLength: 3 }), { nil: undefined });
    fc.assert(
      fc.property(fc.constantFrom<QueryLike<number[]>['status']>('pending', 'error', 'success'), data, fc.boolean(), fc.boolean(), (status, d, fetching, apiErr) => {
        const q: QueryLike<number[]> = {
          status,
          data: d,
          error: status === 'error' ? (apiErr ? new ApiRequestError({ kind: 'http', status: 500, message: 'x' }) : new Error('boom')) : null,
          isFetching: fetching,
          refetch: () => undefined,
        };
        const s = toAsyncState(q, (x) => (x.length === 0 ? null : x));
        const expected = status === 'pending' ? 'loading' : status === 'error' ? 'error' : d === undefined || d.length === 0 ? 'empty' : 'success';
        expect(s.status).toBe(expected);
        if (s.status === 'success') expect(s.data.length).toBeGreaterThan(0);
        if (s.status === 'error') expect(s.error.kind).toBe(apiErr ? 'http' : 'network');
      }),
      { numRuns: 300 },
    );
  });
});
