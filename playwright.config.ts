import { defineConfig, devices } from '@playwright/test';

/** E2E tests run against the production build served under /rihaan-math/ (like swaruplab.bio.uci.edu/rihaan-math/). */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173/rihaan-math/',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort --base /rihaan-math/',
    url: 'http://localhost:4173/rihaan-math/',
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
    // Safari engine (WebKit) — the main targets: iPad (landscape + portrait), iPhone, and Safari on Mac.
    { name: 'ipad-landscape', use: { ...devices['iPad Pro 11 landscape'] } },
    { name: 'ipad-portrait', use: { ...devices['iPad (gen 7)'] } },
    { name: 'iphone', use: { ...devices['iPhone 14'] } },
    { name: 'mac-safari', use: { ...devices['Desktop Safari'] } },
  ],
});
