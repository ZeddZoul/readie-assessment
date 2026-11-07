import { at } from '../../test/at';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ROOMS } from '../../mocks/fixtures';
import { setScenario } from '../../mocks/scenario';
import { roomPath } from '../../lib/roomName';
import { renderApp } from '../../test/renderApp';

describe('RoomPage', () => {
  it('spike: the router keeps the pathname encoded, so the room name is decoded exactly once', async () => {
    const name = 'campaign_1interview~~a/b c@x.io~~abcdef123456';
    const { router } = renderApp(roomPath(name));
    expect(router.state.location.pathname).toBe(roomPath(name));
    expect(await screen.findByText(/no recordings found/i)).toBeInTheDocument();
    expect(screen.getByText(/a\/b c@x\.io/)).toBeInTheDocument();
  });

  it('replaces a missing tab with ?tab=transcript and renders the timeline by role', async () => {
    const { router } = renderApp(roomPath(ROOMS.ada));
    expect(await screen.findByTestId('room-title')).toHaveTextContent('ada.lovelace@example.test');
    expect(screen.queryByText(ROOMS.ada)).toBeNull();
    await waitFor(() => expect(router.state.location.search).toBe('?tab=transcript'));
    expect(router.state.historyAction).toBe('REPLACE');
    const entries = Array.from(document.querySelectorAll('[data-role]'));
    expect(new Set(entries.map((el) => el.getAttribute('data-role')))).toEqual(new Set(['interviewer', 'candidate', 'other']));
    // Interviewee on the left; interviewer and every other participant on the right.
    for (const el of entries) expect(el.getAttribute('data-side')).toBe(el.getAttribute('data-role') === 'candidate' ? 'left' : 'right');
    expect(screen.getByRole('link', { name: /back to campaign 119/i })).toHaveAttribute('href', '/jobs/campaign/119');
  });

  it('switching tabs pushes ?tab= and shows identity and integrity panels', async () => {
    const { router } = renderApp(roomPath(ROOMS.ada, 'transcript'));
    await screen.findByTestId('room-title');
    await userEvent.click(screen.getByRole('tab', { name: /identity verification/i }));
    expect(router.state.location.search).toBe('?tab=identity');
    expect(router.state.historyAction).toBe('PUSH');
    expect(screen.getByRole('meter', { name: 'Match confidence' })).toHaveAttribute('aria-valuenow', '86');
    expect(screen.getByRole('meter', { name: 'Liveness confidence' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: /integrity/i }));
    expect(screen.getByTestId('integrity-status')).toHaveTextContent('PASSED');
  });

  it('recording selector updates every tab', async () => {
    renderApp(roomPath(ROOMS.ada, 'integrity'));
    await screen.findByTestId('room-title');
    await userEvent.click(screen.getByRole('button', { name: /analysed recording/i }));
    const listbox = screen.getByRole('listbox', { name: /analysed recording/i });
    await userEvent.click(at(within(listbox).getAllByRole('option'), 2));
    await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
    expect(screen.getByTestId('integrity-status')).toHaveTextContent('FAILED');
    expect(screen.getByText(/human review required/i)).toBeInTheDocument();
    expect(screen.getAllByText(/reads from a second device/i).length).toBeGreaterThanOrEqual(2);
    await userEvent.click(screen.getByRole('tab', { name: /identity verification/i }));
    expect(screen.getByText(/multiple people detected/i)).toBeInTheDocument();
    expect(screen.getByText(/reference video quality is POOR/i)).toBeInTheDocument();
  });

  it('selecting an older recording writes ?rec= (push) and that link reopens the same recording', async () => {
    const { router } = renderApp(roomPath(ROOMS.ada, 'integrity'));
    await screen.findByTestId('room-title');
    await userEvent.click(screen.getByRole('button', { name: /analysed recording/i }));
    await userEvent.click(at(within(screen.getByRole('listbox')).getAllByRole('option'), 2));
    const params = new URLSearchParams(router.state.location.search);
    expect(params.get('rec')).toBe('2026-10-27T09:12:00.000000');
    expect(params.get('tab')).toBe('integrity');
    expect(router.state.historyAction).toBe('PUSH');
    expect(screen.getByTestId('integrity-status')).toHaveTextContent('FAILED');
  });

  it('a shared link with ?rec= opens that recording directly', async () => {
    renderApp(`${roomPath(ROOMS.ada, 'integrity')}&rec=${encodeURIComponent('2026-10-27T09:14:00.000000')}`);
    expect(await screen.findByTestId('integrity-status')).toHaveTextContent('WARNING');
  });

  it('an unknown ?rec= falls back to the newest recording and is removed with a replace', async () => {
    const { router } = renderApp(`${roomPath(ROOMS.ada, 'integrity')}&rec=bogus`);
    expect(await screen.findByTestId('integrity-status')).toHaveTextContent('PASSED');
    await waitFor(() => expect(new URLSearchParams(router.state.location.search).get('rec')).toBeNull());
    expect(router.state.historyAction).toBe('REPLACE');
    expect(new URLSearchParams(router.state.location.search).get('tab')).toBe('integrity');
  });

  it('choosing the newest recording again removes ?rec= so default links stay clean', async () => {
    const { router } = renderApp(`${roomPath(ROOMS.ada, 'integrity')}&rec=${encodeURIComponent('2026-10-27T09:14:00.000000')}`);
    await screen.findByTestId('integrity-status');
    await userEvent.click(screen.getByRole('button', { name: /analysed recording/i }));
    await userEvent.click(at(within(screen.getByRole('listbox')).getAllByRole('option'), 0));
    expect(new URLSearchParams(router.state.location.search).get('rec')).toBeNull();
    expect(screen.getByTestId('integrity-status')).toHaveTextContent('PASSED');
  });

  it('the candidate finder searches by name or email and keeps the tab (also opens with /)', async () => {
    const { router } = renderApp(roomPath(ROOMS.ada, 'identity'));
    await screen.findByTestId('room-title');
    const trigger = await screen.findByRole('button', { name: /candidate \d+ of 4\. find a candidate/i });
    await userEvent.keyboard('/');
    const box = screen.getByRole('combobox', { name: /search candidates by name or email/i });
    expect(box).toHaveFocus();
    expect(within(screen.getByRole('listbox', { name: /find a candidate/i })).getAllByRole('option')).toHaveLength(4);
    await userEvent.type(box, 'grace{Enter}');
    await waitFor(() => expect(router.state.location.pathname).toBe(roomPath(ROOMS.grace)));
    expect(new URLSearchParams(router.state.location.search).get('tab')).toBe('identity');
    expect(trigger).toBeDefined();
  });

  it('room with a space and null identity shows the Phase 1 empty state', async () => {
    renderApp(roomPath(ROOMS.alan, 'identity'));
    expect(await screen.findByText(/phase 1 identity analysis unavailable/i)).toBeInTheDocument();
  });

  it('room with recordings but no analysis shows per-tab empty states', async () => {
    renderApp(roomPath(ROOMS.grace, 'integrity'));
    expect(await screen.findByText(/analysis not yet available/i)).toBeInTheDocument();
    expect(screen.getByText(/analysis partial/i)).toBeInTheDocument();
  });

  it('empty room and malformed link', async () => {
    renderApp(roomPath(ROOMS.katherine));
    expect(await screen.findByText(/no recordings found for this room/i)).toBeInTheDocument();
  });

  it('a room name containing % is single-encoded, so the API sees %25 and answers 400 (as live)', async () => {
    renderApp(roomPath('campaign_1interview~~100%@x.io'));
    expect(await screen.findByTestId('error-state')).toHaveTextContent(/400/);
  });

  it('malformed percent-encoding shows an invalid link without calling the API', async () => {
    renderApp('/jobs/room/campaign_1%E0%A4%A');
    expect(await screen.findByText('This room link is invalid')).toBeInTheDocument();
  });

  it('invalid response shape becomes an error state', async () => {
    setScenario('invalid-shape');
    renderApp(roomPath(ROOMS.ada));
    expect(await screen.findByTestId('error-state')).toHaveTextContent(/unexpected response/i);
  });
});
