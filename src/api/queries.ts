import { QueryClient, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';
import type { EvaluationJob, RoomEvaluation } from '../domain/types';
import { toAsyncState, type AsyncState } from '../state/async-state';
import { getCampaignJobs, getRoomEvaluation } from './endpoints';
import { ApiRequestError, isRetryable } from './errors';

export function createQueryClient(overrides: { retry?: boolean } = {}): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        refetchOnWindowFocus: false,
        retry:
          overrides.retry === false
            ? false
            : (count, error) => count < 2 && error instanceof ApiRequestError && isRetryable(error.apiError),
        retryDelay: (attempt) => Math.min(400 * 2 ** attempt, 2000),
      },
    },
  });
}

export const queryKeys = {
  campaign: (id: number) => ['campaign', id] as const,
  room: (name: string) => ['room', name] as const,
};

export function useCampaignJobs(campaignId: number | null): AsyncState<readonly EvaluationJob[]> {
  const q = useQuery({
    queryKey: queryKeys.campaign(campaignId ?? -1),
    queryFn: ({ signal }) => getCampaignJobs(campaignId ?? -1, signal),
    enabled: campaignId !== null,
  });
  return toAsyncState(q, (d) => (d.length === 0 ? null : d));
}

export function useRoomEvaluation(roomName: string | null): AsyncState<RoomEvaluation> {
  const q = useQuery({
    queryKey: queryKeys.room(roomName ?? ''),
    queryFn: ({ signal }) => getRoomEvaluation(roomName ?? '', signal),
    enabled: roomName !== null,
  });
  return toAsyncState(q, (d) => d);
}

/** Warms the room cache on hover/focus so opening a room feels instant. */
export function usePrefetchRoom(): (roomName: string) => void {
  const client = useQueryClient();
  return useCallback(
    (roomName: string) => {
      void client.prefetchQuery({ queryKey: queryKeys.room(roomName), queryFn: ({ signal }) => getRoomEvaluation(roomName, signal), staleTime: 60_000 });
    },
    [client],
  );
}

const HOVER_INTENT_MS = 150;

/**
 * Prefetch on intent rather than on every pass of the pointer: hover must rest ~150ms, while
 * keyboard focus and touch prefetch immediately. Sweeping across many rows sends no requests.
 */
export function useRoomPrefetchIntent(): (roomName: string) => {
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onFocus: () => void;
  onTouchStart: () => void;
} {
  const prefetch = usePrefetchRoom();
  const timer = useRef<number | null>(null);
  const cancel = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  }, []);
  useEffect(() => cancel, [cancel]);
  return useCallback(
    (roomName: string) => ({
      onMouseEnter: () => {
        cancel();
        timer.current = window.setTimeout(() => prefetch(roomName), HOVER_INTENT_MS);
      },
      onMouseLeave: cancel,
      onFocus: () => prefetch(roomName),
      onTouchStart: () => prefetch(roomName),
    }),
    [cancel, prefetch],
  );
}
