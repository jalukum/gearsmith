// Renders public/icons/icon.svg to PNGs with headless Chrome (one-off; output is committed).
import puppeteer from 'puppeteer-core';
import { readFile } from 'node:fs/promises';
const svg = await readFile(new URL('../public/icons/icon.svg', import.meta.url), 'utf8');
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const page = await browser.newPage();
for (const [name, size, pad] of [['icon-192.png', 192, 0], ['icon-512.png', 512, 0], ['apple-touch-icon.png', 180, 0], ['icon-maskable-512.png', 512, 0.12]]) {
  await page.setViewport({ width: size, height: size });
  const inner = Math.round(size * (1 - pad * 2));
  await page.setContent(`<html><body style="margin:0;background:#0b0a0c;display:grid;place-items:center;width:${size}px;height:${size}px">${svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</body></html>`);
  await page.screenshot({ path: new URL(`../public/icons/${name}`, import.meta.url).pathname, omitBackground: false });
}
await browser.close();
console.log('icons written');
