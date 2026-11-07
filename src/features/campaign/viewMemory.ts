import type { JobsView } from './filterSortJobs';

/**
 * Remembers each campaign's filter/search/sort for the session (not the URL), so returning
 * from a room restores the auditor's view and the room pager can follow the same list.
 */
const memory = new Map<number, JobsView>();

export function getRememberedView(campaignId: number): JobsView | null {
  return memory.get(campaignId) ?? null;
}

export function rememberView(campaignId: number, view: JobsView): void {
  memory.set(campaignId, view);
}

export function clearViewMemory(): void {
  memory.clear();
}
