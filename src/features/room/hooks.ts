import { useCallback, useEffect, useMemo } from 'react';
import { useLocation, useSearchParams } from 'react-router';
import type { AnalysedRecording, RoomEvaluation } from '../../domain/types';
import { decodeRoomSegment, roomSegmentFromPathname, type DecodeResult } from '../../lib/roomName';
import { parseTab, type RoomTab } from '../../state/tab';

/** Query parameter holding the selected recording; omitted when the newest (default) recording is shown. */
export const RECORDING_PARAM = 'rec';

/**
 * Reads the room name from the still-encoded pathname and decodes it exactly once.
 * (useParams() would decode for us, and its %2F handling differs across router versions.)
 */
export function useRoomNameParam(): DecodeResult {
  const { pathname } = useLocation();
  return useMemo(() => decodeRoomSegment(roomSegmentFromPathname(pathname) ?? ''), [pathname]);
}

export interface RoomUrlState {
  readonly tab: RoomTab;
  readonly setTab: (next: RoomTab) => void;
  readonly selected: AnalysedRecording | null;
  readonly setRecording: (id: string) => void;
}

/**
 * Everything a shared room link must reproduce lives in the URL: the tab (`?tab=`) and the
 * recording (`?rec=`). Changes push history; invalid or redundant values are fixed with a single
 * replace, so normalising the tab and the recording can never overwrite each other.
 */
export function useRoomUrlState(room: RoomEvaluation): RoomUrlState {
  const [params, setParams] = useSearchParams();
  const { tab, wasValid } = parseTab(params.get('tab'));
  const rawRec = params.get(RECORDING_PARAM);
  const match = rawRec === null ? undefined : room.analysed.find((r) => r.id === rawRec);
  const selected = match ?? room.analysed[0] ?? null;
  const recNeedsRemoval = rawRec !== null && (match === undefined || match.id === room.defaultRecordingId);

  useEffect(() => {
    if (wasValid && !recNeedsRemoval) return;
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', tab);
        if (recNeedsRemoval) next.delete(RECORDING_PARAM);
        return next;
      },
      { replace: true },
    );
  }, [wasValid, recNeedsRemoval, tab, setParams]);

  const setTab = useCallback(
    (nextTab: RoomTab) =>
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', nextTab);
        return next;
      }),
    [setParams],
  );

  const setRecording = useCallback(
    (id: string) =>
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        if (id === room.defaultRecordingId) next.delete(RECORDING_PARAM);
        else next.set(RECORDING_PARAM, id);
        return next;
      }),
    [setParams, room.defaultRecordingId],
  );

  return { tab, setTab, selected, setRecording };
}
