import { expect, test } from '@playwright/test';
import { ROOMS, roomUrl } from './helpers';

test.describe('async states on demand', () => {
  test('slow shows loading skeletons first', async ({ page }) => {
    await page.goto('/jobs/campaign/119?mock=slow');
    await expect(page.getByRole('status', { name: 'Loading' })).toBeVisible();
    await expect(page.getByTestId('job-row')).toHaveCount(4, { timeout: 10_000 });
  });

  test('error-500 shows Error + Retry', async ({ page }) => {
    await page.goto(`${roomUrl(ROOMS.ada)}&mock=error-500`.replace('&', '?'));
    await expect(page.getByTestId('error-state')).toContainText('500', { timeout: 15_000 });
    await expect(page.getByTestId('error-state').getByRole('button', { name: 'Retry' })).toBeVisible();
  });

  test('error-401 explains rejected credentials', async ({ page }) => {
    await page.goto('/jobs/campaign/119?mock=error-401');
    await expect(page.getByTestId('error-state')).toContainText('credentials were rejected');
  });

  test('invalid-shape shows a validation error and recovers when switched back', async ({ page }) => {
    await page.goto('/jobs/campaign/119?mock=invalid-shape');
    await expect(page.getByTestId('error-state')).toContainText('Unexpected response');
    await page.getByLabel('Mock scenario').selectOption('normal');
    await expect(page.getByTestId('job-row')).toHaveCount(4);
  });

  test('an empty room shows the empty state', async ({ page }) => {
    await page.goto(roomUrl('campaign_119interview~~katherine.j@example.test~~c3d4e5f6a1b2'));
    await expect(page.getByText('No recordings found for this room')).toBeVisible();
  });

  test('an unknown address shows the custom 404 page with a way back', async ({ page }) => {
    await page.goto('/jobs/campaigns/119');
    await expect(page.getByRole('heading', { name: /this page doesn’t exist/i })).toBeVisible();
    await page.getByRole('link', { name: 'Go to campaigns' }).click();
    await expect(page).toHaveURL(/\/jobs\/campaign\/119$/);
  });
});
