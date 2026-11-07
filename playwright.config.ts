import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    // Locally reuse the installed Google Chrome; CI installs Playwright's Chromium.
    ...(process.env.CI ? {} : { channel: 'chrome' }),
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Live smoke runs against an already-running dev server, so it must not build or start the mock preview.
  ...(process.env.E2E_LIVE ? {} : { webServer: {
    // Production build + preview, in mock mode, so the e2e run is fully offline.
    command: `npx vite build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { VITE_API_MODE: 'mock', VITE_API_AUTH_KEY: '', VITE_API_BASIC_TOKEN: '', API_PROXY_TARGET: '', VITE_API_CREDENTIALS: 'client' },
  } }),
});
