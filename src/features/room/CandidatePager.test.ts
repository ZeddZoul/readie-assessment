import { parseCampaignJobs } from '../../domain/adapters';
import { campaignJobs } from '../../mocks/fixtures';
import { findCandidates } from './CandidatePager';

describe('findCandidates', () => {
  const parsed = parseCampaignJobs(campaignJobs[119]);
  const jobs = parsed.ok ? parsed.value : [];

  it('matches name or email, case-insensitively, ignoring surrounding spaces', () => {
    expect(findCandidates(jobs, '  GRACE ').map((j) => j.candidateEmail)).toEqual(['grace.hopper@example.test']);
    expect(findCandidates(jobs, 'katherine.j@').map((j) => j.candidateName)).toEqual(['Katherine Johnson']);
    expect(findCandidates(jobs, 'alan turing')).toHaveLength(1);
  });

  it('returns everyone for an empty query and nobody for no match', () => {
    expect(findCandidates(jobs, '')).toHaveLength(jobs.length);
    expect(findCandidates(jobs, 'zzz')).toEqual([]);
  });
});
