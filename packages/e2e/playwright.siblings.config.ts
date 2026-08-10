import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './specs/siblings',
  fullyParallel: true,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 4,
  reporter: [['list']],
  use: {
    trace: 'retain-on-failure',
    navigationTimeout: 45_000,
  },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
  webServer: [
    {
      command: 'pnpm --dir ../../apps/bonfire dev',
      url: 'http://localhost:3010',
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
    {
      command: 'pnpm --dir ../../apps/wkc dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
    {
      command: 'pnpm --dir ../../apps/spg exec vite --port 5174',
      url: 'http://localhost:5174',
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
})
