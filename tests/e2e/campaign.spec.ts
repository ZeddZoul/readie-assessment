import { expect, test } from '@playwright/test';

test.describe('campaign overview', () => {
  for (const [id, rows] of [
    [119, 4],
    [123, 6],
  ] as const) {
    test(`campaign ${id} loads, filters, searches and sorts`, async ({ page }) => {
      await page.goto(`/jobs/campaign/${id}`);
      const table = page.getByTestId('job-row');
      await expect(table).toHaveCount(rows);
      await page.getByRole('radiogroup', { name: 'Verification status' }).getByText('In progress').click();
      const inProgress = await table.count();
      expect(inProgress).toBeGreaterThan(0);
      expect(inProgress).toBeLessThan(rows);
      await page.getByRole('radiogroup', { name: 'Verification status' }).getByText('All candidates').click();
      await page.getByLabel('Search by email').fill('example.test');
      await expect(table).toHaveCount(rows);
      await page.getByLabel('Search by email').fill('zzz-nobody');
      await expect(page.getByText('No matching candidates')).toBeVisible();
      await page.getByRole('button', { name: 'Clear filters' }).click();
      const firstBefore = await table.first().textContent();
      await page.getByRole('button', { name: /sort by submission time/i }).click();
      await page.getByRole('option', { name: 'Oldest first' }).click();
      await expect(table.first()).not.toHaveText(firstBefore ?? '');
    });
  }

  for (const id of [120, 122]) {
    test(`campaign ${id} shows the empty state`, async ({ page }) => {
      await page.goto(`/jobs/campaign/${id}`);
      await expect(page.getByText(`No evaluation jobs in campaign ${id}`)).toBeVisible();
    });
  }

  test('root redirects to campaign 119 and the switcher opens any campaign by ID', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/jobs\/campaign\/119$/);
    await page.getByRole('button', { name: /switch campaign/i }).click();
    await page.getByRole('combobox', { name: /find or enter a campaign id/i }).fill('123');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/jobs\/campaign\/123$/);
    await expect(page.getByTestId('job-row')).toHaveCount(6);
  });
});
