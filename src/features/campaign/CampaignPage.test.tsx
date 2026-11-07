import { at } from '../../test/at';
import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { campaignJobs } from '../../mocks/fixtures';
import userEvent from '@testing-library/user-event';
import { setScenario } from '../../mocks/scenario';
import { ROOMS } from '../../mocks/fixtures';
import { roomPath } from '../../lib/roomName';
import { renderApp } from '../../test/renderApp';

describe('CampaignPage', () => {
  it('redirects / to campaign 119 and renders loading then the table', async () => {
    const { router } = renderApp('/');
    expect(await screen.findByRole('status', { name: /loading/i })).toBeInTheDocument();
    expect(await screen.findAllByTestId('job-row')).toHaveLength(4);
    expect(router.state.location.pathname).toBe('/jobs/campaign/119');
    for (const h of ['Candidate Name', 'Email', 'Room Identifier', 'Submission Timestamp', 'Verification Status']) {
      expect(screen.getByRole('columnheader', { name: new RegExp(h, 'i') })).toBeInTheDocument();
    }
    expect(screen.getByText('Unnamed candidate')).toBeInTheDocument();
  });

  it('defaults to newest first and toggles sort', async () => {
    renderApp('/jobs/campaign/119');
    const rows = await screen.findAllByTestId('job-row');
    expect(within(at(rows, 0)).getByText('Ada Lovelace')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /sort by submission time/i }));
    await userEvent.click(screen.getByRole('option', { name: 'Oldest first' }));
    expect(within(at(screen.getAllByTestId('job-row'), 0)).getByText('Katherine Johnson')).toBeInTheDocument();
  });

  it('filters by status and searches by email, with a clearable no-match state', async () => {
    renderApp('/jobs/campaign/119');
    await screen.findAllByTestId('job-row');
    await userEvent.click(screen.getByRole('radio', { name: /^failed/i }));
    expect(screen.getAllByTestId('job-row')).toHaveLength(1);
    await userEvent.click(screen.getByRole('radio', { name: /^all candidates/i }));
    await userEvent.type(screen.getByLabelText(/search by email/i), '  GRACE ');
    expect(screen.getAllByTestId('job-row')).toHaveLength(1);
    await userEvent.clear(screen.getByLabelText(/search by email/i));
    await userEvent.type(screen.getByLabelText(/search by email/i), 'nobody');
    expect(screen.getByText('No matching candidates')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /clear filters/i }));
    expect(screen.getAllByTestId('job-row')).toHaveLength(4);
  });

  it('shows the empty state for campaign 120', async () => {
    renderApp('/jobs/campaign/120');
    expect(await screen.findByText('No evaluation jobs in campaign 120')).toBeInTheDocument();
  });

  it('shows an invalid-campaign message without calling the API', async () => {
    renderApp('/jobs/campaign/abc');
    expect(await screen.findByText('Invalid campaign ID')).toBeInTheDocument();
  });

  it('shows Error + Retry, and the auth message for 401', async () => {
    setScenario('error-500');
    renderApp('/jobs/campaign/119');
    expect(await screen.findByTestId('error-state')).toHaveTextContent(/500/);
    setScenario('normal');
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(await screen.findAllByTestId('job-row')).toHaveLength(4);
  });

  it('explains rejected credentials', async () => {
    setScenario('error-401');
    renderApp('/jobs/campaign/119');
    expect(await screen.findByTestId('error-state')).toHaveTextContent(/credentials were rejected/i);
  });

  it('navigates to the single-encoded room path on row click', async () => {
    const { router } = renderApp('/jobs/campaign/119');
    await userEvent.click(await screen.findByRole('link', { name: /open room for ada lovelace/i }));
    await waitFor(() => expect(router.state.location.pathname).toBe(roomPath(ROOMS.ada)));
  });

  it('paginates large campaigns 25 at a time and returns to page 1 when the filter changes', async () => {
    const template = campaignJobs[119]?.[0];
    if (!template) throw new Error('fixture missing');
    const many = Array.from({ length: 60 }, (_, i) => ({
      ...template,
      roomName: `campaign_777interview~~cand${i}@example.test~~${String(i).padStart(12, '0')}`,
      candidateEmail: `cand${i}@example.test`,
      candidateDateCreated: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString(),
    }));
    server.use(http.get('http://localhost:3000/api/campaignHACKATHON/777', () => HttpResponse.json(many)));
    renderApp('/jobs/campaign/777');
    expect(await screen.findAllByTestId('job-row')).toHaveLength(25);
    expect(screen.getByRole('navigation', { name: 'Pages' })).toHaveTextContent('1–25 of 60');
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getAllByTestId('job-row')).toHaveLength(10);
    expect(screen.getByRole('navigation', { name: 'Pages' })).toHaveTextContent('51–60 of 60');
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/search by email/i), 'cand1');
    await waitFor(() => expect(screen.getAllByTestId('job-row')).toHaveLength(11));
    expect(screen.queryByRole('navigation', { name: 'Pages' })).toBeNull();
  });
});
