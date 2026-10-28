import { expect, test } from '@playwright/test';
import { MAX_MESSAGE_CHARACTERS, MAX_SEGMENTS } from '../src/parser';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('loads the ADT example and exposes its parsed structure', async ({ page }) => {
  await expect(page.locator('.message-pill')).toHaveText('ADT ^ A01');
  await expect(page.locator('.segment-name').first()).toHaveText('MSH');
  await expect(page.getByText('No basic structure issues found.')).toBeVisible();
});

test('preserves keyboard focus while expanding segments and field explanations', async ({ page }) => {
  const segment = page.locator('[data-segment="1"]');
  await segment.focus();
  await segment.press('Enter');
  await expect(segment).toBeFocused();
  await expect(segment).toHaveAttribute('aria-expanded', 'false');
  await segment.press('Enter');

  const field = page.locator('[data-field="MSH-1"]');
  await field.focus();
  await field.press('Enter');
  await expect(field).toBeFocused();
  await expect(field).toHaveAttribute('aria-expanded', 'true');
});

test('announces validation results and points to the original source line', async ({ page }) => {
  const editor = page.getByRole('textbox', { name: 'HL7 v2 message input' });
  await editor.fill('\n\nMSH|^~\\&|APP|FAC|REC|RFAC|20250101010101||ADT^A01|CTRL1|P|2.5\n\nPID^1|MRN42');
  await page.getByRole('button', { name: 'Parse message' }).click();

  await expect(page.locator('#announcements')).toContainText('Validation found');
  await expect(page.locator('.issue').filter({ hasText: 'PID (line 5)' })).toBeVisible();
});

test('reports oversize messages without building a parsed tree', async ({ page }) => {
  const editor = page.getByRole('textbox', { name: 'HL7 v2 message input' });
  await editor.fill('X'.repeat(MAX_MESSAGE_CHARACTERS + 1));
  await page.getByRole('button', { name: 'Parse message' }).click();

  await expect(page.getByText(`Message exceeds the ${MAX_MESSAGE_CHARACTERS.toLocaleString('en-US')} character limit.`)).toBeVisible();
  await expect(page.locator('.validation')).toContainText('Message exceeds the size limit');
});

test('reports messages above the segment limit without rendering each segment', async ({ page }) => {
  const editor = page.getByRole('textbox', { name: 'HL7 v2 message input' });
  await editor.fill(Array.from({ length: MAX_SEGMENTS + 1 }, () => 'ZXX|1').join('\n'));
  await page.getByRole('button', { name: 'Parse message' }).click();

  await expect(page.getByText(`Message exceeds the ${MAX_SEGMENTS.toLocaleString('en-US')} segment limit.`)).toBeVisible();
  await expect(page.locator('.segment')).toHaveCount(0);
});

test('renders pasted markup as text rather than executable HTML', async ({ page }) => {
  const editor = page.getByRole('textbox', { name: 'HL7 v2 message input' });
  await editor.fill('MSH|^~\\&|APP|FAC|REC|RFAC|20250101010101||ADT^A01|CTRL1|P|2.5\nZXX|<img src=x onerror=alert(1)>');
  await page.getByRole('button', { name: 'Parse message' }).click();

  await expect(page.locator('.field-value').filter({ hasText: '<img src=x onerror=alert(1)>' })).toBeVisible();
  await expect(page.locator('img[src="x"]')).toHaveCount(0);
});
