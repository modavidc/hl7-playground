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

test('loads the synthetic financial example with DFT field guidance', async ({ page }) => {
  await page.locator('[data-example="3"]').click();

  await expect(page.locator('.message-pill')).toHaveText('DFT ^ P03');
  await expect(page.locator('.segment-name').nth(3)).toHaveText('FT1');
  await expect(page.locator('.segment-description').nth(3)).toHaveText('Financial Transaction');
  await page.locator('[data-field="FT1-7"]').click();
  await expect(page.locator('.field-detail')).toContainText('Code identifying the billed service');
  await expect(page.locator('.validation')).toContainText('No basic structure issues found.');
});

test('identifies a Z segment as a local extension without guessing its field meaning', async ({ page }) => {
  await page.getByRole('textbox', { name: 'HL7 v2 message input' }).fill(
    'MSH|^~\\&|APP|FAC|REC|RFAC|20250101010101||ADT^A01|CTRL1|P|2.5\nZDN|LOCAL-VALUE'
  );
  await page.getByRole('button', { name: 'Parse message' }).click();

  await expect(page.locator('.segment-description').nth(1)).toHaveText('Local extension (implementation-defined)');
  await page.locator('[data-field="ZDN-1"]').click();
  await expect(page.locator('.field-detail')).toContainText('meaning depends on the sending implementation');
});

test('loads a local HL7 file into the editor and parses it in the browser', async ({ page }) => {
  const externalRequests: string[] = [];
  page.on('request', request => {
    if (new URL(request.url()).origin !== 'http://127.0.0.1:4173') externalRequests.push(request.url());
  });
  const message = [
    'MSH|^~\\&|APP|FAC|REC|RFAC|20250101010101||ADT^A01|CTRL1|P|2.5',
    'PID|1||MRN42^^^FAC^MR||Doe^Jane||19800101|F',
    'PV1|1|I|4W^412^A'
  ].join('\r');

  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Load .hl7' }).click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles({
    name: 'sample.hl7',
    mimeType: 'text/plain',
    buffer: Buffer.from(message)
  });

  await expect(page.getByRole('textbox', { name: 'HL7 v2 message input' })).toHaveValue(message.replaceAll('\r', '\n'));
  await expect(page.locator('.message-pill')).toHaveText('ADT ^ A01');
  await expect(page.locator('#announcements')).toContainText('Loaded sample.hl7');
  await expect(page.locator('.validation')).toContainText('No basic structure issues found.');
  expect(externalRequests).toEqual([]);
});

test('rejects local files above the file size limit without replacing the editor content', async ({ page }) => {
  await page.locator('#message-file').setInputFiles({
    name: 'oversized.hl7',
    mimeType: 'text/plain',
    buffer: Buffer.alloc(2 * 1024 * 1024 + 1)
  });

  await expect(page.locator('#file-error')).toHaveText('This file exceeds the 2 MB local file limit.');
  await expect(page.getByRole('textbox', { name: 'HL7 v2 message input' })).toHaveValue(/ADT\^A01/);
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
