import type { ReactNode } from 'react';
import { assertNever, type AsyncState } from '../../state/async-state';
import { ErrorState, Skeleton } from './States';

export interface AsyncBoundaryProps<T> {
  readonly state: AsyncState<T>;
  readonly loading?: ReactNode;
  readonly empty: (retry: () => void) => ReactNode;
  readonly children: (data: T) => ReactNode;
}

/** Renders exactly one branch of an AsyncState; a missing branch is a compile error via assertNever. */
export function AsyncBoundary<T>({ state, loading, empty, children }: AsyncBoundaryProps<T>) {
  switch (state.status) {
    case 'loading':
      return <>{loading ?? <Skeleton />}</>;
    case 'error':
      return <ErrorState error={state.error} onRetry={state.retry} />;
    case 'empty':
      return <>{empty(state.retry)}</>;
    case 'success':
      return <>{children(state.data)}</>;
    default:
      return assertNever(state);
  }
}
