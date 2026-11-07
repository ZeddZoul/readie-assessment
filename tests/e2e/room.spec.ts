import { expect, test } from '@playwright/test';
import { ROOMS, roomUrl } from './helpers';

test.describe('room drill-down', () => {
  test('row click, pasted URL and reload render the same room and tab', async ({ page, context }) => {
    await page.goto('/jobs/campaign/119');
    await page.getByRole('link', { name: /open room for ada lovelace/i }).click();
    await expect(page).toHaveURL(roomUrl(ROOMS.ada, 'transcript'));
    await expect(page.getByTestId('room-title')).toHaveText('ada.lovelace@example.test');
    await page.getByRole('tab', { name: 'Identity Verification' }).click();
    const shared = page.url();
    const header = await page.getByTestId('room-title').textContent();

    await page.reload();
    await expect(page.getByTestId('room-title')).toHaveText(header ?? '');
    await expect(page.getByRole('tab', { name: 'Identity Verification' })).toHaveAttribute('aria-selected', 'true');

    const fresh = await context.newPage();
    await fresh.goto(shared);
    await expect(fresh.getByTestId('room-title')).toHaveText(header ?? '');
    await expect(fresh.getByRole('meter', { name: 'Match confidence' })).toBeVisible();
  });

  test('room names with a space and with "/" open correctly', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (r) => {
      if (r.url().includes('/roomsHACKATHON/')) requests.push(r.url());
    });
    await page.goto(roomUrl(ROOMS.alan, 'identity'));
    await expect(page.getByTestId('room-title')).toHaveText('alan turing 12@example.test');
    await expect(page.getByText('Phase 1 identity analysis unavailable')).toBeVisible();

    await page.goto(roomUrl(ROOMS.slash, 'integrity'));
    await expect(page.getByTestId('room-title')).toHaveText('ops/qa@example.test');
    await expect(page.getByTestId('integrity-status')).toContainText('WARNING');
    expect(requests.some((u) => u.endsWith('/roomsHACKATHON/campaign_119interview~~alan%20turing%2012%40example.test'))).toBe(true);
    expect(requests.some((u) => u.includes('ops%2Fqa%40example.test'))).toBe(true);
    expect(requests.every((u) => !u.includes('%25'))).toBe(true);
  });

  test('Back and Forward walk tab → room → campaign', async ({ page }) => {
    await page.goto('/jobs/campaign/119');
    await page.getByRole('link', { name: /open room for ada lovelace/i }).click();
    await expect(page).toHaveURL(/tab=transcript/);
    await page.getByRole('tab', { name: 'Integrity & Proctoring' }).click();
    await expect(page).toHaveURL(/tab=integrity/);
    await page.getByRole('tab', { name: 'Identity Verification' }).click();
    await expect(page).toHaveURL(/tab=identity/);

    await page.goBack();
    await expect(page).toHaveURL(/tab=integrity/);
    await expect(page.getByRole('tab', { name: 'Integrity & Proctoring' })).toHaveAttribute('aria-selected', 'true');
    await page.goBack();
    await expect(page).toHaveURL(/tab=transcript/);
    await page.goBack();
    await expect(page).toHaveURL(/\/jobs\/campaign\/119$/);
    await expect(page.getByTestId('job-row')).toHaveCount(4);
    await page.goForward();
    await expect(page.getByTestId('room-title')).toHaveText('ada.lovelace@example.test');
    await page.goForward();
    await expect(page).toHaveURL(/tab=integrity/);
  });

  test('an invalid tab is replaced, not pushed', async ({ page }) => {
    await page.goto('/jobs/campaign/119');
    await page.goto(roomUrl(ROOMS.ada, 'bogus'));
    await expect(page).toHaveURL(/tab=transcript/);
    await page.goBack();
    await expect(page).toHaveURL(/\/jobs\/campaign\/119$/);
  });

  test('the three tabs render', async ({ page }) => {
    await page.goto(roomUrl(ROOMS.ada, 'transcript'));
    await expect(page.getByRole('list', { name: 'Interview transcript' }).getByRole('listitem')).toHaveCount(6);
    await page.getByRole('tab', { name: 'Identity Verification' }).click();
    await expect(page.getByRole('meter', { name: 'Liveness confidence' })).toBeVisible();
    await page.getByRole('tab', { name: 'Integrity & Proctoring' }).click();
    await expect(page.getByText('Gaze tracking index')).toBeVisible();
    await expect(page.getByTestId('integrity-status')).toContainText('PASSED');
  });

  test('the selected recording is in the URL: reload and shared links reopen it, Back returns', async ({ page, context }) => {
    await page.goto(roomUrl(ROOMS.ada, 'integrity'));
    await expect(page.getByTestId('integrity-status')).toContainText('PASSED');
    await page.getByRole('button', { name: /analysed recording/i }).click();
    await page.getByRole('listbox', { name: /analysed recording/i }).getByRole('option').nth(2).click();
    await expect(page).toHaveURL(/rec=2026-10-27T09%3A12%3A00\.000000/);
    await expect(page.getByTestId('integrity-status')).toContainText('FAILED');
    const shared = page.url();

    await page.reload();
    await expect(page.getByTestId('integrity-status')).toContainText('FAILED');

    const fresh = await context.newPage();
    await fresh.goto(shared);
    await expect(fresh.getByTestId('integrity-status')).toContainText('FAILED');

    await page.goBack();
    await expect(page).not.toHaveURL(/rec=/);
    await expect(page.getByTestId('integrity-status')).toContainText('PASSED');
  });
});
