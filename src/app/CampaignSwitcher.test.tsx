import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { parseCampaignDirectory, readRecentCampaigns } from '../lib/recentCampaigns';
import { renderApp } from '../test/renderApp';
import { buildCampaignOptions } from './CampaignSwitcher';

describe('buildCampaignOptions', () => {
  const dir = [119, 120, 122, 123, 130, 131, 132, 133, 140, 141];
  const ids = (o: readonly { kind: string; id: number }[]) => o.map((x) => `${x.kind}:${x.id}`);

  it('always lists campaigns to browse (first 8), with up to 3 recents first and no duplicates', () => {
    expect(ids(buildCampaignOptions('', [], dir))).toEqual(dir.slice(0, 8).map((id) => `campaign:${id}`));
    const withRecents = ids(buildCampaignOptions('', [123, 500, 119, 141], dir));
    expect(withRecents.slice(0, 3)).toEqual(['recent:123', 'recent:500', 'recent:119']);
    expect(withRecents).not.toContain('campaign:123');
    expect(withRecents.filter((x) => x.startsWith('campaign:'))).toHaveLength(8);
  });

  it('search filters both sections, shows every match, and offers "open" for an unlisted ID', () => {
    expect(ids(buildCampaignOptions('13', [], dir))).toEqual(['open:13', 'campaign:130', 'campaign:131', 'campaign:132', 'campaign:133']);
    expect(ids(buildCampaignOptions('123', [], dir))).toEqual(['campaign:123']);
    expect(ids(buildCampaignOptions('#4567', [119], dir))).toEqual(['open:4567']);
    expect(buildCampaignOptions('abc', [119], dir)).toEqual([]);
  });

  it('reads the directory from VITE_CAMPAIGNS and falls back to the test campaigns', () => {
    expect(parseCampaignDirectory('7, 8,#9,x,8')).toEqual([7, 8, 9]);
    expect(parseCampaignDirectory(undefined)).toEqual([119, 120, 122, 123]);
  });
});

describe('CampaignSwitcher', () => {
  it('opens any typed campaign ID with Enter, remembers it, and returns focus to the trigger', async () => {
    const { router } = renderApp('/jobs/campaign/119');
    const trigger = await screen.findByRole('button', { name: /campaign 119\. switch campaign/i });
    await userEvent.click(trigger);
    const box = screen.getByRole('combobox', { name: /find or enter a campaign id/i });
    expect(box).toHaveFocus();
    await userEvent.type(box, '4567{Enter}');
    await waitFor(() => expect(router.state.location.pathname).toBe('/jobs/campaign/4567'));
    expect(readRecentCampaigns()[0]).toBe(4567);
    await waitFor(() => expect(screen.getByRole('button', { name: /campaign 4567\. switch campaign/i })).toHaveFocus());
  });

  it('navigates recents with the keyboard and closes on Escape', async () => {
    const { router } = renderApp('/jobs/campaign/119');
    await userEvent.click(await screen.findByRole('button', { name: /switch campaign/i }));
    const box = screen.getByRole('combobox', { name: /find or enter a campaign id/i });
    // Browsing shows the directory straight away; ArrowDown moves the active option.
    expect(screen.getByRole('option', { name: /campaign 120/i })).toBeInTheDocument();
    await userEvent.keyboard('{ArrowDown}');
    expect(document.getElementById(box.getAttribute('aria-activedescendant') ?? '')).toHaveTextContent('Campaign 120');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('combobox', { name: /find or enter a campaign id/i })).toBeNull());
    expect(router.state.location.pathname).toBe('/jobs/campaign/119');
  });
});
