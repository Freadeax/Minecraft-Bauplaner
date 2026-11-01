// UI-01: actual controls, reload persistence, system updates and narrow touch layout.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4197, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
let server, browser;
before(async () => {
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(BASE)).ok) break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  browser = await chromium.launch();
});
after(async () => { await browser?.close(); server?.kill(); });

for (const viewport of [{ width: 1400, height: 1000 }, { width: 390, height: 844 }]) {
  test(`Darstellung: controls and persisted light/dark themes (${viewport.width}px)`, async () => {
    const context = await browser.newContext({ viewport, colorScheme: 'dark' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await page.goto(BASE);
      await page.locator('.theme-control summary').click();
      const box = await page.locator('.theme-popover').boundingBox();
      assert.ok(box && box.x >= 0 && box.x + box.width <= viewport.width, 'theme controls fit inside screen');
      assert.ok(box.y + box.height <= viewport.height, 'all controls fit vertically');
      await page.getByRole('combobox', { name: 'Oberflächenthema' }).selectOption('fantasy');
      await page.getByRole('combobox', { name: 'Erscheinungsbild' }).selectOption('light');
      await page.waitForFunction(() => document.documentElement.dataset.theme === 'fantasy' && document.documentElement.dataset.appearance === 'light');
      assert.equal(await page.locator('html').evaluate(el => getComputedStyle(el).colorScheme), 'light');
      await page.reload();
      await page.waitForFunction(() => document.documentElement.dataset.theme === 'fantasy' && document.documentElement.dataset.appearance === 'light');
      await page.locator('.theme-control summary').click();
      assert.equal(await page.getByRole('combobox', { name: 'Oberflächenthema' }).inputValue(), 'fantasy');
      await page.getByRole('combobox', { name: 'Erscheinungsbild' }).selectOption('dark');
      await page.waitForFunction(() => document.documentElement.dataset.appearance === 'dark');
      assert.equal(await page.locator('html').evaluate(el => getComputedStyle(el).colorScheme), 'dark');
      await page.getByRole('combobox', { name: 'Erscheinungsbild' }).selectOption('system');
      await page.emulateMedia({ colorScheme: 'light' });
      await page.waitForFunction(() => document.documentElement.dataset.appearance === 'light');
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.waitForFunction(() => document.documentElement.dataset.appearance === 'dark');
      assert.deepEqual(errors, []);
    } finally { await context.close(); }
  });
}
