// Downloads real in-game icons and records where each came from.
//  - Perk + feat icons: For Honor Info Hub static images (https://forhonorinfohub.com/perks/<image>.png,
//    /feats/<image>.png — the same paths the Info Hub web app uses; Info Hub credits Ubisoft, "used with permission").
//  - Hero icons: official hero portraits on ubisoft.com/en-us/game/for-honor/heroes (staticctf CDN),
//    cropped to a square head-and-shoulders bust.
// Output: public/icons/game/{perks,feats,heroes}/*.webp and src/data/icons.json (manifest with source URLs).
// Usage: node scripts/fetch-icons.mjs   (also run automatically by npm run fetch-data)
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import sharp from 'sharp';

const ROOT = new URL('../', import.meta.url);
const OUT = new URL('public/icons/game/', ROOT);
const IH = 'https://forhonorinfohub.com';
const UBI_HEROES = 'https://www.ubisoft.com/en-us/game/for-honor/heroes';
const UA = { 'User-Agent': 'Mozilla/5.0 (Gearsmith fan app icon refresh)' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function get(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: UA });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(`${r.status} ${url}`);
      return Buffer.from(await r.arrayBuffer());
    } catch (e) {
      if (i === tries - 1) throw e;
      await sleep(700 * (i + 1));
    }
  }
}

// Manual bust crops (px, for the 750x770 portraits) where auto-detection picks a weapon or misses the head.
const CROP_OVERRIDE = {
  Gryphon: [234, 40, 200], Juren: [322, 95, 196], Lawbringer: [330, 120, 200], Medjay: [310, 10, 220],
  Warmonger: [425, 0, 240], Zhanhu: [185, 60, 300], Warden: [229, 22, 250],
};

// Per-hero framing tweaks so every head lands at the same spot (top of helmet ~8% down, centred):
// [dx, dy, scale] — shifts in units of the base crop size, scale multiplies it. Tuned by eye on a contact sheet.
const HERO_ADJUST = {"Arakure":[0,-0.105,1],"Berserker":[-0.08,0.073,1],"Black Prior":[0,-0.01,1],"Conqueror":[0,-0.05,1],"Gryphon":[0,0.13,0.85],"Jiang Jun":[0,0.117,1],"Khatun":[0,-0.163,1],"Lawbringer":[-0.08,0.247,0.9],"Nuxia":[0,0.068,1.1],"Shaolin":[0,0.05,1.1],"Sohei":[0,0.098,1],"Tiandi":[0,0.138,1],"Afeera":[0,0.025,1],"Aramusha":[0,0.037,1],"Centurion":[0,0.037,1],"Gladiator":[0,0.037,1],"Hitokiri":[0,0.037,1],"Jormungandr":[0,0.075,1],"Juren":[0,0.1,1],"Kensei":[0,0.025,1],"Kyoshin":[0,0.075,1],"Medjay":[-0.17,0.312,1],"Nobushi":[0,-0.037,1],"Ocelotl":[0,0.037,1],"Peacekeeper":[0,0.025,1],"Pirate":[0,0.025,1],"Shaman":[0,0.037,1],"Shinobi":[0,0.075,1],"Valkyrie":[0,0.037,1],"Varangian Guard":[0,-0.112,1],"Vortiger":[0,0.075,1],"Warden":[0,-0.025,1],"Warmonger":[0,0.037,1],"Zhanhu":[0,-0.062,1.15]};
// Portrait card output: 4:5, full-bleed.
const HERO_W = 288, HERO_H = 360;

// Auto bust crop: find the figure against the dark backdrop (per-row background from the side strips),
// take its top/bottom in the central band, and crop a square around the head scaled to body height.
async function autoCrop(buf) {
  const { data, info } = await sharp(buf).removeAlpha().blur(2).raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const sw = Math.round(W * 0.12), x0 = Math.round(W * 0.2), x1 = Math.round(W * 0.8);
  const med = (arr) => arr.sort((p, q) => p - q)[arr.length >> 1];
  const mask = (y) => {
    const bg = [0, 1, 2].map((c) => {
      const v = [];
      for (let x = 0; x < sw; x++) v.push(data[(y * W + x) * 3 + c], data[(y * W + W - 1 - x) * 3 + c]);
      return med(v);
    });
    const row = new Uint8Array(x1 - x0);
    for (let x = x0; x < x1; x++) {
      const i = (y * W + x) * 3;
      row[x - x0] = Math.abs(data[i] - bg[0]) + Math.abs(data[i + 1] - bg[1]) + Math.abs(data[i + 2] - bg[2]) > 55 ? 1 : 0;
    }
    return row;
  };
  const rows = [];
  for (let y = 0; y < H; y++) {
    const r = mask(y); let best = 0, cur = 0;
    for (const v of r) { cur = v ? cur + 1 : 0; if (cur > best) best = cur; }
    if (best >= W * 0.06) rows.push(y);
  }
  const y0 = rows[0], y1 = rows.filter((y) => y < H * 0.97).pop(), hb = y1 - y0;
  const xs = [];
  for (let y = y0; y < y0 + hb * 0.08; y++) mask(y).forEach((v, i) => v && xs.push(x0 + i));
  const cx = med(xs), size = Math.round(hb * 0.36);
  const left = Math.max(0, Math.min(W - size, Math.round(cx - size / 2)));
  const top = Math.max(0, Math.min(H - size, Math.round(y0 - hb * 0.035)));
  return [left, top, size];
}

// Match Ubisoft portrait file names to hero names.
const HERO_FILE_HINT = {
  'Black Prior': /BlackPrior/i, 'Jiang Jun': /JiangJun/i, 'Varangian Guard': /Varangian/i,
  Conqueror: /Conq/i, Hitokiri: /Hitokiri-F/i, Tiandi: /Tiandi-F/i, Zhanhu: /Zhanhu-F/i,
  Jormungandr: /Jormungandr-F/i, Medjay: /Medjay_02/i, Virtuosa: /Virtuosa/i,
};

export async function fetchIcons(game) {
  if (!game) game = JSON.parse(await readFile(new URL('src/data/game.json', ROOT), 'utf8'));
  await rm(OUT, { recursive: true, force: true });
  for (const d of ['perks', 'feats', 'heroes']) await mkdir(new URL(d + '/', OUT), { recursive: true });
  const manifest = {
    generatedAt: new Date().toISOString(),
    note: 'Game icons are property of Ubisoft Entertainment. Used in an unofficial, non-commercial fan app; see README for terms.',
    perks: {}, feats: {}, heroes: {}, missing: { perks: [], feats: [], heroes: [] },
  };

  // Perks — 3x of a ~40px display = 120px
  for (const p of game.perks) {
    const url = `${IH}/perks/${encodeURIComponent(p.image)}.png`;
    const buf = p.image ? await get(url) : null;
    if (!buf) { manifest.missing.perks.push(p.name); continue; }
    const file = `perks/${slug(p.name)}.webp`;
    await sharp(buf).resize(128, 128, { fit: 'contain', background: '#0000' }).webp({ quality: 90 }).toFile(new URL(file, OUT).pathname);
    manifest.perks[p.name] = { file: `icons/game/${file}`, source: url };
  }

  // Feats — dedupe by image name; 3x of ~48px = 144px
  const images = new Map();
  for (const h of game.heroes) for (const f of h.feats) {
    if (!f.image) { manifest.missing.feats.push(`${h.name}: ${f.name}`); continue; }
    images.set(f.image, (images.get(f.image) || []).concat(`${h.name}: ${f.name}`));
  }
  for (const [img, users] of images) {
    const url = `${IH}/feats/${encodeURIComponent(img)}.png`;
    const buf = await get(url);
    if (!buf) { manifest.missing.feats.push(...users.map((u) => `${u} (image ${img})`)); continue; }
    const file = `feats/${slug(img)}.webp`;
    try {
      await sharp(buf).resize(144, 144, { fit: 'contain', background: '#0000' }).webp({ quality: 88 }).toFile(new URL(file, OUT).pathname);
      manifest.feats[img] = { file: `icons/game/${file}`, source: url };
    } catch (e) {
      manifest.missing.feats.push(...users.map((u) => `${u} (bad image ${img})`));
    }
    await sleep(40);
  }

  // Heroes — official portraits from the Ubisoft heroes page
  const html = (await get(UBI_HEROES)).toString('utf8');
  const urls = [...new Set(html.match(/https:\/\/staticctf\.ubisoft\.com\/[^"'\s)]+?\.(?:jpg|png)/g) || [])];
  for (const h of game.heroes) {
    const key = h.name.replace(/\s+/g, '');
    const re = HERO_FILE_HINT[h.name] || new RegExp(key, 'i');
    const url = urls.find((u) => re.test(u.split('/').pop()));
    const buf = url ? await get(url) : null;
    if (!buf) { manifest.missing.heroes.push(h.name); continue; }
    const img = sharp(buf);
    const [left, top, size] = CROP_OVERRIDE[h.name] || (await autoCrop(buf));
    const file = `heroes/${slug(h.name)}.webp`;
    const [dx, dy, ds] = HERO_ADJUST[h.name] || [0, 0, 1];
    const w = Math.round(size * ds), hgt = Math.round(w * HERO_H / HERO_W);
    const bx = Math.round(left + size / 2 + dx * size - w / 2), by = Math.round(top + dy * size - 0.08 * w);
    // Pad with the backdrop colour so boxes that run past the portrait edge stay seamless.
    const PAD = 400;
    const { data: px } = await sharp(buf).removeAlpha().extract({ left: 2, top: 2, width: 6, height: 6 }).raw().toBuffer({ resolveWithObject: true });
    const bg = { r: px[0], g: px[1], b: px[2] };
    const padded = await img.removeAlpha().extend({ top: PAD, bottom: PAD, left: PAD, right: PAD, background: bg }).toBuffer();
    await sharp(padded).extract({ left: bx + PAD, top: by + PAD, width: w, height: hgt }).resize(HERO_W, HERO_H).webp({ quality: 78 }).toFile(new URL(file, OUT).pathname);
    manifest.heroes[h.name] = { file: `icons/game/${file}`, source: url, sourcePage: UBI_HEROES, crop: { left: bx, top: by, width: w, height: hgt, manual: !!CROP_OVERRIDE[h.name], adjust: HERO_ADJUST[h.name] || null } };
  }

  await writeFile(new URL('src/data/icons.json', ROOT), JSON.stringify(manifest, null, 1));
  const n = (o) => Object.keys(o).length;
  console.log(`Icons: perks ${n(manifest.perks)}/${game.perks.length}, feat images ${n(manifest.feats)}/${images.size}, heroes ${n(manifest.heroes)}/${game.heroes.length}`);
  for (const [k, v] of Object.entries(manifest.missing)) if (v.length) console.log(`  missing ${k}: ${v.join('; ')}`);
  return manifest;
}

if (import.meta.url === `file://${process.argv[1]}`) await fetchIcons();
