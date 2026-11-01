// UI-01 / WORLD-02: complete theme matrix and the three latest editorial routes.
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const PORT = 4207, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
const themes = ['modern', 'medieval', 'industrial', 'fantasy', 'nether'];
const screenshots = process.env.LMNT_UI_SCREENSHOTS;
let server, browser;
before(async () => {
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
  let ready = false;
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(BASE)).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  assert.ok(ready, 'Pages preview starts');
  browser = await chromium.launch();
  if (screenshots) await mkdir(screenshots, { recursive: true });
});
after(async () => { await browser?.close(); server?.kill(); });

async function appearance(page, theme, mode) {
  await page.locator('.theme-control summary').click();
  await page.getByLabel('Oberflächenthema').selectOption(theme);
  await page.getByLabel('Erscheinungsbild').selectOption(mode);
  await page.waitForFunction(([theme, mode]) => document.documentElement.dataset.theme === theme && document.documentElement.dataset.appearance === mode, [theme, mode]);
  await page.locator('.theme-control summary').click();
}
async function fits(page) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), 'page fits horizontally');
}
async function capture(page, name) {
  if (screenshots) await page.screenshot({ path: `${screenshots}/${name}.png`, animations: 'disabled' });
}

for (const viewport of [{ width: 1400, height: 1000 }, { width: 390, height: 844 }]) {
  test(`Materiallabor: five themes in light/dark preserve quantities (${viewport.width}px)`, async () => {
    const context = await browser.newContext({ viewport, hasTouch: viewport.width === 390 });
    const page = await context.newPage();
    page.setDefaultTimeout(10_000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await page.goto(BASE);
      await page.getByRole('button', { name: 'Beispielprojekt „Burgmauer“' }).click();
      await page.getByText('✓ Geometrisch konfliktfrei').waitFor();
      await page.getByRole('link', { name: 'Material', exact: true }).click();
      const lab = page.getByRole('region', { name: 'Materiallabor', exact: true });
      await lab.waitFor();
      const totals = await page.locator('.materials-stats').innerText();
      const entries = await page.locator('.materials-table').first().innerText();
      for (const theme of themes) for (const mode of ['light', 'dark']) {
        await page.evaluate(() => scrollTo(0, 0));
        await appearance(page, theme, mode);
        assert.equal(await page.locator('.materials-stats').innerText(), totals);
        assert.equal(await page.locator('.materials-table').first().innerText(), entries);
        await fits(page);
        await lab.scrollIntoViewIfNeeded();
        await capture(page, `lab-${viewport.width}-${theme}-${mode}`);
        await lab.getByLabel('Materiallabor durchsuchen').fill('cobble');
        assert.equal(await lab.locator('.material-lab-card').count(), 1);
        assert.match(await lab.locator('.material-lab-card h4').innerText(), /cobblestone/);
        if (!await lab.locator('.material-lab-card details').evaluate(element => element.open)) await lab.locator('.material-lab-card summary').click();
        await lab.getByText(/Zellen → .* Bauitems/).first().waitFor();
        await lab.getByRole('button', { name: 'Zurücksetzen', exact: true }).click();
        assert.equal(await page.locator('.materials-stats').innerText(), totals);
        assert.equal(await page.locator('.materials-table').first().innerText(), entries);
      }
      assert.deepEqual(errors, []);
    } finally { await context.close(); }
  });

  test(`Bauwelten: all themes and latest routes survive reload (${viewport.width}px)`, async () => {
    const context = await browser.newContext({ viewport, hasTouch: viewport.width === 390 });
    const page = await context.newPage();
    page.setDefaultTimeout(10_000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await page.goto(`${BASE}#/bibliothek/bauwelten`);
      await page.waitForFunction(() => document.querySelectorAll('.build-theme-card').length === 11);
      for (const theme of themes) for (const mode of ['light', 'dark']) {
        await page.evaluate(() => scrollTo(0, 0));
        await appearance(page, theme, mode);
        await fits(page);
        await page.locator('#bauwelt-fernost').scrollIntoViewIfNeeded();
        await page.waitForFunction(() => {
          const images = [...document.querySelectorAll('#bauwelt-fernost img')];
          return images.length === 3 && images.every(image => image.complete && image.naturalWidth > 0);
        });
        await capture(page, `worlds-${viewport.width}-${theme}-${mode}`);
      }
      for (const [id, count] of [['fernost', 3], ['wuestenhandel', 6], ['endposten', 2]]) {
        await page.goto(`${BASE}#/bibliothek/bauwelten`);
        const card = page.locator(`#bauwelt-${id}`);
        await card.waitFor();
        assert.equal(await card.locator('.build-theme-previews a').count(), Math.min(count, 3));
        const names = await card.locator('.build-theme-previews strong').allInnerTexts();
        assert.ok(names.every(Boolean));
        for (const mode of ['light', 'dark']) {
          await page.evaluate(() => scrollTo(0, 0));
          await appearance(page, 'nether', mode);
          await card.scrollIntoViewIfNeeded();
          await page.waitForFunction(([id, count]) => {
            const images = [...document.querySelectorAll(`#bauwelt-${id} img`)];
            return images.length === Math.min(count, 3) && images.every(image => image.complete && image.naturalWidth > 0);
          }, [id, count]);
          await fits(page);
          if (screenshots) await card.screenshot({ path: `${screenshots}/card-${id}-${viewport.width}-${mode}.png`, animations: 'disabled' });
        }
        await card.locator('.build-theme-browse').click();
        await page.waitForFunction(n => Number(document.querySelector('.result-count b')?.textContent) === n, count);
        const url = page.url();
        assert.match(url, /varianten=alle/);
        const results = await page.locator('.bcard strong').allInnerTexts();
        for (const name of names) assert.ok((await page.locator('.bcard').allTextContents()).join(' ').includes(name), `real preview ${name} appears in results`);
        await page.reload();
        await page.waitForFunction(n => Number(document.querySelector('.result-count b')?.textContent) === n, count);
        assert.deepEqual(await page.locator('.bcard strong').allInnerTexts(), results, 'same ordered results after canonical URL reload');
        const before = new URLSearchParams(url.split('?')[1]);
        const after = new URLSearchParams(page.url().split('?')[1]);
        for (const key of ['stil', 'kategorie', 'varianten']) assert.equal(after.get(key), before.get(key));
        await fits(page);
      }
      assert.deepEqual(errors, []);
    } finally { await context.close(); }
  });
}
