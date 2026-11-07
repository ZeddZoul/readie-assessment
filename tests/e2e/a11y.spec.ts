import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { ROOMS, roomUrl } from './helpers';

const scan = async (page: Page) => {
  // Wait for fades to finish so contrast is measured on the settled UI, not mid-animation.
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'));
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
};

test('campaign page and each tab have no WCAG AA violations', async ({ page }) => {
  // Scan the settled UI: mid-fade text is semi-transparent and would be measured at partial opacity.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/jobs/campaign/119');
  await expect(page.getByTestId('job-row')).toHaveCount(4);
  await scan(page);
  for (const tab of ['transcript', 'identity', 'integrity']) {
    await page.goto(roomUrl(ROOMS.ada, tab));
    await expect(page.getByTestId('room-title')).toBeVisible();
    await scan(page);
  }
});

test('keyboard-only path from a table row to the Integrity tab', async ({ page }) => {
  await page.goto('/jobs/campaign/119');
  await expect(page.getByTestId('job-row')).toHaveCount(4);
  await page.getByRole('link', { name: /open room for ada lovelace/i }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('room-title')).toBeVisible();
  await page.getByRole('tab', { name: 'Transcript' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Identity Verification' })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Integrity & Proctoring' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/tab=integrity/);
  await expect(page.getByTestId('integrity-status')).toBeVisible();
});
