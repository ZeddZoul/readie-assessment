import { ApiRequestError, type ApiError } from '../api/errors';

export type AsyncState<T> =
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly error: ApiError; readonly retry: () => void }
  | { readonly status: 'empty'; readonly retry: () => void }
  | { readonly status: 'success'; readonly data: T; readonly isRefetching: boolean };

/** The subset of a TanStack Query result that the mapping needs. */
export interface QueryLike<T> {
  readonly status: 'pending' | 'error' | 'success';
  readonly data: T | undefined;
  readonly error: Error | null;
  readonly isFetching: boolean;
  readonly refetch: () => unknown;
}

export function toApiError(error: Error | null): ApiError {
  if (error instanceof ApiRequestError) return error.apiError;
  return { kind: 'network', message: error?.message ?? 'Unknown error' };
}

/**
 * Maps a query to exactly one UI state. `toData` returns the value to render, or `null`
 * when the response counts as empty, so `success` can never carry an empty value.
 */
export function toAsyncState<T, U>(q: QueryLike<T>, toData: (d: T) => U | null): AsyncState<U> {
  const retry = (): void => {
    void q.refetch();
  };
  switch (q.status) {
    case 'pending':
      return { status: 'loading' };
    case 'error':
      return { status: 'error', error: toApiError(q.error), retry };
    case 'success': {
      const data = q.data === undefined ? null : toData(q.data);
      return data === null ? { status: 'empty', retry } : { status: 'success', data, isRefetching: q.isFetching };
    }
  }
}

export function assertNever(x: never): never {
  throw new Error(`Unhandled state: ${JSON.stringify(x)}`);
}
