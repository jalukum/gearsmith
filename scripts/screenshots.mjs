// iPhone-sized screenshots + console error / overflow / offline checks.
// Usage: WIDTH=375 SHOT_PREFIX=v3- node scripts/screenshots.mjs [baseUrl]  -> shots/v3-375-*.png
import puppeteer from 'puppeteer-core';
const BASE = process.argv[2] || 'http://127.0.0.1:8070/';
const OUT = new URL('../shots/', import.meta.url).pathname + (process.env.SHOT_PREFIX ?? 'v3-') + (process.env.WIDTH ?? '393') + '-';
const WIDTH = Number(process.env.WIDTH ?? 393);
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--hide-scrollbars'] });
const page = await browser.newPage();
await page.emulate({
  viewport: { width: WIDTH, height: WIDTH < 390 ? 812 : 852, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
});
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('requestfailed', (r) => errors.push('requestfailed: ' + r.url()));
const go = async (hash) => { await page.goto(BASE + hash, { waitUntil: 'networkidle0' }); await new Promise((r) => setTimeout(r, 450)); };
const overflow = [];
const checkOverflow = (name) => page.evaluate(() => {
  const bad = [];
  if (document.documentElement.scrollWidth > innerWidth + 1) bad.push(`page scrollWidth ${document.documentElement.scrollWidth} > ${innerWidth}`);
  for (const el of document.querySelectorAll('.chip, .hc-name, .pick-name, .total-top, .rl, .saved-title, h1, .fan-banner'))
    if (el.scrollWidth > el.clientWidth + 1) bad.push(`${el.className}: "${el.textContent.trim().slice(0, 30)}" ${el.scrollWidth}>${el.clientWidth}`);
  return bad;
}).then((b) => b.length && overflow.push({ name, b }));
const shot = async (name, full = false) => { await checkOverflow(name); if (globalThis.settle) await globalThis.settle().catch(() => {}); await page.screenshot({ path: `${OUT}${name}.png`, fullPage: full }); console.log('shot', name); };

await go('');
await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
await go('#/');
// wait for lazy portraits to decode
globalThis.settle = () => page.evaluate(async () => {
  for (const i of document.images) i.loading = 'eager';
  await Promise.race([Promise.all([...document.images].map((i) => (i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; })))), new Promise((r) => setTimeout(r, 4000))]);
});
await globalThis.settle();
await shot('01-hero-grid');
await shot('01c-hero-grid-full', true);
await page.click('.chips-5 .chip:nth-child(4)');
await page.click('.chips-4 .chip:nth-child(3)');
await new Promise((r) => setTimeout(r, 200));
await shot('01b-hero-grid-filtered');
await page.evaluate(() => sessionStorage.clear());

await go('#/hero/1/perks');
await shot('02-hero-page-perks');

// Builder: tap the top suggestion
await go('#/hero/1/build');
await page.click('.sug');
await new Promise((r) => setTimeout(r, 300));
await page.evaluate(() => document.querySelector('.result')?.scrollIntoView({ block: 'start' }));
await new Promise((r) => setTimeout(r, 300));
await shot('03-builder-result');
await shot('03b-builder-result-full', true);
// tick two pieces and save
await page.$$eval('.piece', (els) => els.slice(0, 2).forEach((e) => e.click()));
await page.click('.btn.primary');
await new Promise((r) => setTimeout(r, 300));

// Impossible combo: Survival Instinct + Head Hunter + Fresh Focus (E, F, G)
await go('#/hero/1/build?p=EFG');
await page.evaluate(() => document.querySelector('.result')?.scrollIntoView({ block: 'start' }));
await new Promise((r) => setTimeout(r, 300));
await shot('04-builder-impossible');

// Save another build (Conqueror top pick) via the UI
await go('#/hero/2/build');
await page.click('.sug');
await new Promise((r) => setTimeout(r, 200));
await page.click('.btn.primary');
await go('#/hero/39/build?p=BDF&t=legendary');
await page.click('.btn.primary');
await go('#/saved');
await shot('05-saved-builds');

await go('#/hero/39/feats');
await shot('06-hero-feats');
await go('#/rules');
await shot('07-rules');

// Offline: service worker should serve the app with the network off
await go('#/');
await page.evaluate(async () => { await navigator.serviceWorker.ready; });
await page.reload({ waitUntil: 'networkidle0' });
const swCtl = await page.evaluate(() => !!navigator.serviceWorker.controller);
await page.setOfflineMode(true);
const errCountBefore = errors.length;
await page.goto(BASE + '#/hero/15/build?p=ABF', { waitUntil: 'domcontentloaded' });
await new Promise((r) => setTimeout(r, 800));
const offlineOk = await page.evaluate(() => !!document.querySelector('.verdict-ok, .verdict-bad'));
await shot('08-offline-builder');
await page.setOfflineMode(false);
errors.splice(errCountBefore); // offline mode request failures are expected noise

// Manifest check
const manifest = await (await fetch(BASE + 'manifest.webmanifest')).json();
console.log(JSON.stringify({ swControlling: swCtl, offlineOk, manifestIcons: manifest.icons.length, consoleErrors: errors, overflow }, null, 1));
await browser.close();
