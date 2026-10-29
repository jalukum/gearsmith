// Refresh src/data/patches.json from Ubisoft's public For Honor patch notes.
// The news site (https://www.ubisoft.com/en-us/game/for-honor/news-updates) reads the
// same Nimbus updates API. Steam news is not used: Ubisoft no longer posts every
// patch there, so it lags the official page by several versions.
//
// The Nimbus content key is published in that page (it is not a secret). We read it
// on each run so a redeploy that rotates the key still works. Run:
//   node scripts/fetch-patches.mjs
// The GitHub Actions workflow runs this daily and commits only when the notes change.
import { readFile, writeFile } from 'node:fs/promises';

const PAGE = 'https://www.ubisoft.com/en-us/game/for-honor/news-updates';
const KEEP = 6;
const UA = 'GearsmithPatchNotes/1.0 (unofficial fan app; patch-notes mirror)';
const OUT = new URL('../src/data/patches.json', import.meta.url);
// Last key seen on the public news page. Used only if the page HTML no longer exposes one.
const FALLBACK_KEY = 'vBD74x38DZbzhwTWaTdhV63Zsec9yuFj';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getText(url, headers, tries = 3) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json, text/html', ...headers } });
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return await res.text();
    } catch (e) {
      last = e;
      if (i === tries - 1) break;
      await sleep(800 * (i + 1));
    }
  }
  throw last;
}

function discover(html) {
  const key = html.match(/"nimbusApiKey":"([^"]+)"/)?.[1] || FALLBACK_KEY;
  const host = html.match(/"nimbusBaseUrl":"([^"]+)"/)?.[1] || 'nimbus.ubisoft.com';
  const tag = html.match(/"tag":"(BR-for-honor[^"]*)"/)?.[1] || 'BR-for-honor GA-for-honor';
  if (!html.includes('nimbusApiKey')) console.warn('nimbusApiKey not found in the news page; using the last known public key');
  return { key, host, tag };
}

function toPatch(item) {
  const title = String(item?.title ?? '').trim();
  const content = String(item?.content ?? '').replace(/\r\n/g, '\n').trim();
  const date = String(item?.date ?? '').trim();
  const id = String(item?.id ?? '').trim();
  if (!title || !content || !date || !id) return null;
  // The query already asks for patch-notes. Drop an item only when it says it is something else.
  if (Array.isArray(item.categories) && !item.categories.includes('patch-notes')) return null;
  return {
    id,
    title,
    date,
    abstract: String(item.abstract ?? '').replace(/\s+/g, ' ').trim(),
    buttonUrl: String(item.button?.buttonUrl ?? '').trim(),
    content,
  };
}

const page = await getText(PAGE, { Accept: 'text/html' });
const { key, host, tag } = discover(page);
const query = new URLSearchParams({
  locale: 'en-us',
  fallbackLocale: 'en-us',
  categoriesFilter: 'patch-notes',
  mediaFilter: 'news',
  limit: String(KEEP),
  skip: '0',
  tags: tag,
});
const api = `https://${host}/api/v1/items?${query}`;
const data = JSON.parse(await getText(api, { Authorization: key }));
const patches = (Array.isArray(data.items) ? data.items : [])
  .map(toPatch)
  .filter(Boolean)
  .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
  .slice(0, KEEP);

if (!patches.length) throw new Error(`No patch notes returned by ${api}`);

const feed = {
  source: 'Ubisoft Nimbus updates API (For Honor news, category patch-notes)',
  sourcePage: PAGE,
  patches,
};
const body = `${JSON.stringify(feed, null, 2)}\n`;
const prev = await readFile(OUT, 'utf8').catch(() => '');
if (prev === body) {
  console.log(`patch notes unchanged (${patches[0].title})`);
} else {
  await writeFile(OUT, body);
  console.log(`wrote ${patches.length} patch notes; latest: ${patches[0].title}`);
}
