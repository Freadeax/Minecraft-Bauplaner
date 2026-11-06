// UI-03: Design-System – Standardthema, Lesbarkeit hell/dunkel, iPad-Ziele, keine Querverschiebung, reduzierte Bewegung.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { waitForStart, openSampleProject } from './start.mjs';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const PORT = 4231, BASE = `http://127.0.0.1:${PORT}/Minecraft-Bauplaner/`;
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

/** Text, der auf seinem tatsächlichen Hintergrund zu schwach ist (WCAG AA: 4,5 bzw. 3 bei großer Schrift). 3D-Bühnen und Vorschaubilder sind ausgenommen. */
function lowContrast() {
  const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = ({ r, g, b }) => { const f = v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
  const bgOf = el => {
    const stack = [];
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.backgroundImage !== 'none') return null;
      const c = parse(cs.backgroundColor);
      if (c && c.a > 0) { stack.push(c); if (c.a >= .99) break; }
    }
    let out = stack.length && stack[stack.length - 1].a >= .99 ? stack.pop() : parse(getComputedStyle(document.documentElement).backgroundColor) ?? { r: 255, g: 255, b: 255 };
    for (const c of stack.reverse()) out = { r: c.r * c.a + out.r * (1 - c.a), g: c.g * c.a + out.g * (1 - c.a), b: c.b * c.a + out.b * (1 - c.a) };
    return out;
  };
  const bad = [], seen = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const el = walker.currentNode.parentElement;
    if (!walker.currentNode.textContent.trim() || !el || seen.has(el)) continue;
    seen.add(el);
    if (el.closest('.viewport,.detail-stage,.build-3d,.diff-stage,.layer-canvas,.layer-thumb,.thumb,canvas,svg,[aria-hidden=true],.sr-only,.skip,[disabled],[aria-disabled=true]')) continue;
    const cs = getComputedStyle(el), box = el.getBoundingClientRect();
    if (cs.visibility === 'hidden' || +cs.opacity < .5 || !box.width || !box.height || box.bottom < 0 || box.top > innerHeight) continue;
    const fg = parse(cs.color), bg = bgOf(el);
    if (!fg || !bg) continue;
    const a = lum(fg), b = lum(bg), ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
    const big = parseFloat(cs.fontSize) >= 18 || (parseFloat(cs.fontSize) >= 14 && +cs.fontWeight >= 700);
    if (ratio < (big ? 3 : 4.5) - .05) bad.push(`${el.tagName}.${el.className}: „${walker.currentNode.textContent.trim().slice(0, 30)}“ ${ratio.toFixed(2)}`);
  }
  return bad;
}

test('Werkbank ist das Standardthema und gilt schon beim ersten Bild', async () => {
  const context = await browser.newContext({ colorScheme: 'dark' });
  const page = await context.newPage();
  try {
    await page.goto(BASE);
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'werkbank');
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--theme-accent').trim()), '#7fd494');
    assert.equal(await page.evaluate(() => document.querySelector('meta[name="theme-color"]').content), '#111715');
    await page.locator('.theme-control summary').click();
    assert.equal(await page.getByRole('radiogroup', { name: 'Oberflächenthema' }).getByRole('radio').count(), 6);
    assert.equal(await page.getByRole('radio', { name: 'Werkbank' }).getAttribute('aria-checked'), 'true');
  } finally { await context.close(); }
});

for (const scheme of ['light', 'dark']) {
  test(`Lesbarkeit: Seiten und Projektreiter erreichen WCAG-Kontrast (${scheme})`, async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 2000 }, colorScheme: scheme, reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.setDefaultTimeout(20_000);
    const problems = [];
    const check = async name => { await page.waitForTimeout(600); for (const p of await page.evaluate(lowContrast)) problems.push(`${name}: ${p}`); };
    try {
      await page.goto(BASE);
      await waitForStart(page);
      await check('Projektzentrale');
      for (const route of ['anleitung', 'bibliothek', 'bibliothek/generatoren', 'karte', 'mod', 'system']) {
        await page.goto(`${BASE}#/${route}`);
        await page.locator('h1').first().waitFor();
        await check(route);
      }
      await page.goto(BASE);
      await openSampleProject(page);
      const tabs = page.getByRole('navigation', { name: 'Projektbereiche' }).getByRole('link');
      for (const name of ['Editor', 'Bauen', 'Material', 'Baustelle', 'Team']) {
        await tabs.filter({ hasText: name }).first().click();
        await check(`Reiter ${name}`);
      }
      assert.deepEqual(problems, []);
    } finally { await context.close(); }
  });
}

test('iPad: große Bedienziele, Reiter in der Leiste, kein waagerechtes Scrollen', async () => {
  const context = await browser.newContext({ ...devices['iPad Pro 11'], colorScheme: 'light' });
  const page = await context.newPage();
  try {
    await page.goto(BASE);
    await waitForStart(page);
    assert.equal(await page.evaluate(() => matchMedia('(pointer: coarse)').matches), true, 'Fingerbedienung erkannt');
    const sample = page.getByRole('button', { name: 'Beispielprojekt „Burgmauer“' });
    assert.ok((await sample.boundingBox()).height >= 44, 'Knopf mindestens 44 px hoch');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Projektzentrale passt in die Breite');
    await sample.click();
    const tabs = page.getByRole('navigation', { name: 'Projektbereiche' });
    await tabs.waitFor();
    // UX-01 ordnet die Reiter in vier Schritten; alle bleiben sichtbar und liegen innerhalb der Leiste.
    const bar = await tabs.boundingBox();
    for (const box of await tabs.getByRole('link').evaluateAll(links => links.map(a => a.getBoundingClientRect().toJSON()))) assert.ok(box.right <= bar.x + bar.width + 1 && box.left >= bar.x - 1, 'Reiter innerhalb der Leiste');
    for (const box of await tabs.getByRole('link').evaluateAll(links => links.map(a => a.getBoundingClientRect().height))) assert.ok(box >= 44, `Reiter ${box} px hoch`);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Projekt passt in die Breite');
  } finally { await context.close(); }
});

test('Bewegung reduzieren schaltet Animationen ab, sonst blenden Seiten kurz ein', async () => {
  for (const reducedMotion of ['reduce', 'no-preference']) {
    const context = await browser.newContext({ reducedMotion });
    const page = await context.newPage();
    try {
      await page.goto(BASE);
      await waitForStart(page);
      const ms = await page.locator('.home-hero').first().evaluate(el => parseFloat(getComputedStyle(el).animationDuration) * 1000);
      if (reducedMotion === 'reduce') assert.ok(ms <= 1, `reduziert: ${ms} ms`);
      else assert.ok(ms > 100 && ms <= 300, `kurz: ${ms} ms`);
      const transform = await page.locator('.content > *').first().evaluate(el => getComputedStyle(el).transform);
      assert.equal(transform, 'none', 'nach der Einblendung bleibt kein transform (fixe Leisten bleiben am Bildschirm)');
    } finally { await context.close(); }
  }
});
