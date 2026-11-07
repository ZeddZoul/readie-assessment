import { expect, test } from '@playwright/test';

/**
 * Opt-in smoke test against the real hackathon API (it will be decommissioned, so this never runs in CI).
 *   1. Configure .env.local for live mode (client or proxy credentials) and start `npm run dev`.
 *   2. Run `npm run test:e2e:live` (override the URL with E2E_LIVE_URL).
 */
const LIVE = process.env.E2E_LIVE_URL ?? 'http://localhost:5173';

test.describe('live API smoke', () => {
  test.skip(!process.env.E2E_LIVE, 'Set E2E_LIVE=1 to run against the real API');
  test.setTimeout(180_000);

  for (const id of [119, 120, 122, 123]) {
    test(`campaign ${id} and its first room load without errors`, async ({ page }) => {
      await page.goto(`${LIVE}/jobs/campaign/${id}`);
      const ready = page.getByTestId('job-row').first().or(page.getByTestId('empty-state')).or(page.getByTestId('error-state'));
      await expect(ready).toBeVisible({ timeout: 60_000 });
      await expect(page.getByTestId('error-state')).toHaveCount(0);
      if ((await page.getByTestId('job-row').count()) === 0) return;

      await page.getByRole('link', { name: /open room for/i }).first().click();
      const room = page.getByTestId('room-title').or(page.getByTestId('empty-state')).or(page.getByTestId('error-state'));
      await expect(room.first()).toBeVisible({ timeout: 60_000 });
      await expect(page.getByTestId('error-state')).toHaveCount(0);
      for (const tab of ['Transcript', 'Identity Verification', 'Integrity & Proctoring']) {
        const trigger = page.getByRole('tab', { name: tab });
        if (await trigger.count()) {
          await trigger.click();
          await expect(page.getByRole('tabpanel')).toBeVisible();
        }
      }
      await expect(page.getByTestId('error-state')).toHaveCount(0);
    });
  }
});
