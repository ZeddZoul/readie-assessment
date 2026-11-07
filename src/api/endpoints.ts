import { parseCampaignJobs, parseRoomRecordings } from '../domain/adapters';
import type { EvaluationJob, RoomEvaluation } from '../domain/types';
import { roomApiPath } from '../lib/roomName';
import { apiGet } from './client';

export function getCampaignJobs(campaignId: number, signal?: AbortSignal): Promise<EvaluationJob[]> {
  return apiGet(`/campaignHACKATHON/${campaignId}`, parseCampaignJobs, signal);
}

/** Resolves to null when the API returns no recordings for the room. */
export function getRoomEvaluation(roomName: string, signal?: AbortSignal): Promise<RoomEvaluation | null> {
  return apiGet(roomApiPath(roomName), (json) => parseRoomRecordings(json, roomName), signal);
}
