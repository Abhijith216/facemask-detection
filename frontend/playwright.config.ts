import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: '../reports/browser/html', open: 'never' }],
    ['json', { outputFile: '../reports/browser/results.json' }],
    ['junit', { outputFile: '../reports/browser/junit.xml' }],
  ],
  outputDir: '../reports/browser/test-results',
  use: {
    baseURL: 'http://127.0.0.1:5000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{
    name: 'chromium',
    use: {
      ...devices['Desktop Chrome'],
      viewport: { width: 1440, height: 1080 },
      permissions: ['camera'],
      launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] },
    },
  }],
  webServer: {
    command: `"${process.env.PYTHON_EXECUTABLE || 'python'}" app.py`,
    cwd: fileURLToPath(new URL('../backend', import.meta.url)),
    url: 'http://127.0.0.1:5000/api/health',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { TF_CPP_MIN_LOG_LEVEL: '2', TF_NUM_INTEROP_THREADS: '1', TF_NUM_INTRAOP_THREADS: '1' },
  },
});
