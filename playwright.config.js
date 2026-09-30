import { defineConfig, devices } from '@playwright/test';

// PAINEL_URL aponta para produção (smoke test pós-deploy); sem ela, sobe o servidor local.
const url = process.env.PAINEL_URL || 'http://localhost:4173/analise/';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: url, ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, trace: 'retain-on-failure' },
  webServer: process.env.PAINEL_URL ? undefined : {
    command: 'node tests/servidor.js', url, reuseExistingServer: !process.env.CI
  }
});
