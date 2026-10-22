import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import type { DetectionResult } from '../src/types/index.js';

const fixture = (name: string) => fileURLToPath(new URL(`../../backend/tests/fixtures/${name}`, import.meta.url));
const browserErrors = new WeakMap<Page, string[]>();

test.beforeEach(({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
});

test.afterEach(({ page }) => {
  expect(browserErrors.get(page), 'Uncaught browser errors').toEqual([]);
});

async function uploadAndDetect(page: Page, name: string): Promise<DetectionResult> {
  await page.goto('/image');
  await expect(page.getByRole('heading', { name: 'Image Analysis Lab' })).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles(fixture(name));
  await expect(page.locator('#analyze-btn')).toBeEnabled();
  const responsePromise = page.waitForResponse(response =>
    response.url().endsWith('/api/detect/image') && response.request().method() === 'POST');
  await page.locator('#analyze-btn').click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  const result = await response.json() as DetectionResult;
  await expect(page.getByText(`${result.face_count} faces detected`, { exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Detection result' })).toBeVisible();
  return result;
}

test('dashboard, navigation, metrics and direct SPA routes render', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /AI Face Mask Surveillance/ })).toBeVisible();
  for (const name of ['Image Analysis', 'Detection History', 'Model Performance', 'About Project', 'Settings']) {
    await page.getByRole('link', { name, exact: true }).click();
    await expect(page.getByRole('heading', { name: name === 'Image Analysis' ? 'Image Analysis Lab' : name, exact: true })).toBeVisible();
  }
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
});

test('collage upload shows 22 faces, downloads annotation and persists history', async ({ page }, testInfo) => {
  const result = await uploadAndDetect(page, 'mask_collage.jpg');
  expect(result.face_count).toBe(22);
  expect(result.detections).toHaveLength(22);
  expect(Object.values(result.summary).reduce((sum, count) => sum + count, 0)).toBe(22);
  await expect(page.getByText(/^Face \d+ /)).toHaveCount(22);
  await testInfo.attach('collage-result', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#download-result-btn').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('mask_detection_result.jpg');
  const downloadedPath = testInfo.outputPath('mask_detection_result.jpg');
  await download.saveAs(downloadedPath);
  expect((await readFile(downloadedPath)).subarray(0, 2)).toEqual(Buffer.from([0xff, 0xd8]));
  const history = await (await page.request.get('/api/history?per_page=1')).json();
  expect(history.records[0].face_count).toBe(22);
  expect(history.records[0].detections).toHaveLength(22);
  await page.getByRole('link', { name: 'Detection History', exact: true }).click();
  await expect(page.locator('tbody tr').first().getByRole('cell').nth(3)).toHaveText('22');
});

test('four portraits show two masks and two unmasked faces without duplicates', async ({ page }, testInfo) => {
  const result = await uploadAndDetect(page, 'four_portraits.jpg');
  expect(result.face_count).toBe(4);
  expect(result.summary.with_mask).toBe(2);
  expect(result.summary.without_mask).toBe(2);
  expect(result.summary.uncertain).toBe(0);
  await expect(page.getByText(/^Face \d+ /)).toHaveCount(4);
  await testInfo.attach('portrait-result', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
});

test('frontend rejects an unsupported upload before enabling analysis', async ({ page }) => {
  await page.goto('/image');
  await page.locator('input[type="file"]').setInputFiles({ name: 'unsupported.txt', mimeType: 'text/plain', buffer: Buffer.from('not an image') });
  await expect(page.getByText('File rejected. Use JPG or PNG and keep size under 16 MB.')).toBeVisible();
  await expect(page.locator('#analyze-btn')).toBeDisabled();
});

test('sample preset loads from the real backend', async ({ page }) => {
  await page.goto('/image');
  await page.getByRole('button', { name: /Load Sample: Mask$/ }).click();
  await expect(page.getByRole('img', { name: 'Preview', exact: true })).toBeVisible();
  await expect(page.locator('#analyze-btn')).toBeEnabled();
});

test('virtual webcam starts, sends a frame to the backend and stops', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('maskAI_settings', JSON.stringify({ saveHistory: false })));
  await page.goto('/live');
  await expect(page.locator('#start-camera-btn')).toBeEnabled();
  await page.locator('#start-camera-btn').click();
  await expect(page.locator('video')).toBeVisible();
  await expect(page.locator('#start-detection-btn')).toBeVisible();
  const responsePromise = page.waitForResponse(response => response.url().endsWith('/api/detect/frame'));
  await page.locator('#start-detection-btn').click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  const result = await response.json() as DetectionResult;
  expect(result.face_count).toBeGreaterThanOrEqual(0);
  expect(result.detections).toHaveLength(result.face_count);
  await page.locator('#stop-detection-btn').click();
  await page.locator('#stop-camera-btn').click();
  await expect(page.locator('#start-camera-btn')).toBeVisible();
});

test('live API health, metrics, statistics and invalid requests behave correctly', async ({ request }) => {
  const health = await request.get('/api/health');
  expect(health.status()).toBe(200);
  expect((await health.json()).model.loaded).toBe(true);
  const metrics = await request.get('/api/metrics');
  expect(metrics.status()).toBe(200);
  expect((await metrics.json()).available).toBe(true);
  const statistics = await request.get('/api/statistics');
  expect(statistics.status()).toBe(200);
  expect(typeof (await statistics.json()).total_faces).toBe('number');
  expect((await request.post('/api/detect/image')).status()).toBe(400);
  expect((await request.post('/api/detect/frame', { data: {} })).status()).toBe(400);
  expect((await request.post('/api/detect/image', {
    multipart: { file: { name: 'unsupported.gif', mimeType: 'image/gif', buffer: Buffer.from('GIF89a') } },
  })).status()).toBe(415);
  expect((await request.get('/api/missing-endpoint')).status()).toBe(404);
});
