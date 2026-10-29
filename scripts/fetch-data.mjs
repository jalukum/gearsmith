// Refreshes app data from For Honor Info Hub's public API (https://forhonorinfohub.com).
// Usage: npm run fetch-data   (run once per season; commit src/data/game.json)
// Also cross-checks hero perk pools against the For Honor Fandom wiki "Perk" page.
import { writeFile, mkdir } from 'node:fs/promises';

const API = 'https://forhonorinfohub.com/api';
const WIKI = 'https://forhonor.fandom.com/api.php?action=parse&page=Perk&prop=wikitext&format=json';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJSON(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'fh-gear-fan-app data refresh' } });
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return await res.json();
    } catch (e) {
      if (i === tries - 1) throw e;
      await sleep(800 * (i + 1));
    }
  }
}
const clean = (s) => (s ?? '').replace(/\r\n/g, '\n').replace(/\t/g, '').trim();

const perksRaw = await getJSON(`${API}/Perks`);
const stats = await getJSON(`${API}/CharacterStats`);
const perkByName = new Map(perksRaw.map((p) => [p.name, p]));

const perks = perksRaw.map((p) => ({
  id: p.ID,
  name: p.name,
  category: p.category,
  description: clean(p.description),
  explanation: clean(p.explanation),
  image: p.image || null,
}));

const heroes = [];
for (const s of stats.sort((a, b) => a.CharacterID - b.CharacterID)) {
  const id = s.CharacterID;
  const [nameRow] = await getJSON(`${API}/CharacterName?characterId=${id}`);
  const [facRow] = await getJSON(`${API}/CharacterFaction?characterId=${id}`);
  if (nameRow?.name !== s.name) throw new Error(`Name mismatch for ${id}: ${nameRow?.name} vs ${s.name}`);
  if (facRow?.faction !== s.faction) throw new Error(`Faction mismatch for ${id}`);
  const hp = await getJSON(`${API}/Perks/Id?characterId=${id}`);
  if (hp.length !== 7) throw new Error(`${s.name} has ${hp.length} perks`);
  const heroPerks = hp
    .map((p) => ({ slot: p.perk_slot, perkId: perkByName.get(p.name)?.ID }))
    .sort((a, b) => a.slot - b.slot);
  if (heroPerks.some((p) => !p.perkId) || heroPerks.map((p) => p.slot).join() !== '1,2,3,4,5,6,7')
    throw new Error(`Bad perk slots for ${s.name}`);
  const feats = (await getJSON(`${API}/Feats/Id?characterId=${id}`))
    .map((f) => ({
      name: f.name,
      tier: Number(f.tier),
      slot: f.feat_slot,
      description: clean(f.description),
      cooldown: f.cooldown,
      explanation: clean(f.explanation),
      image: f.image || null,
    }))
    .sort((a, b) => a.tier - b.tier || a.slot - b.slot);
  heroes.push({
    id,
    name: s.name,
    faction: s.faction === 'Wu-Lin' ? 'Wu Lin' : s.faction,
    class: s.class,
    health: s.health,
    stamina: s.stamina,
    guard: s.guard_type,
    perks: heroPerks,
    feats,
  });
  process.stdout.write(`${id}:${s.name} `);
  await sleep(120);
}
console.log();

// Cross-check perk pools against the wiki table (it may lag on brand-new heroes).
try {
  const wt = (await getJSON(WIKI)).parse.wikitext['*'];
  let checked = 0, mismatches = [];
  for (const h of heroes) {
    const re = new RegExp(`!\\[\\[${h.name}\\]\\]\\n\\|[^\\n]*\\n((?:\\|[^\\n]*\\n){5})`);
    const m = wt.match(re);
    if (!m) continue;
    const names = [...m[1].matchAll(/File:([^|\]]+?) Full\.png/g)].map((x) => x[1]);
    const ours = h.perks.map((p) => perks.find((q) => q.id === p.perkId).name);
    checked++;
    if (names.join() !== ours.join())
      mismatches.push(`${h.name}: wiki=${names.join('/')} api=${ours.join('/')}`);
  }
  console.log(`Wiki cross-check: ${checked} heroes compared, ${mismatches.length} mismatches`);
  mismatches.forEach((m) => console.log('  ' + m));
} catch (e) {
  console.warn('Wiki cross-check skipped:', e.message);
}

await mkdir(new URL('../src/data/', import.meta.url), { recursive: true });
const out = {
  meta: {
    fetchedAt: new Date().toISOString(),
    source: 'For Honor Info Hub (forhonorinfohub.com)',
    heroCount: heroes.length,
  },
  perks,
  heroes,
};
await writeFile(new URL('../src/data/game.json', import.meta.url), JSON.stringify(out, null, 1));
// Game icons (perks, feats, heroes) -> public/icons/game + src/data/icons.json
if (!process.argv.includes('--no-icons')) {
  const { fetchIcons } = await import('./fetch-icons.mjs');
  await fetchIcons(out);
}
console.log(`Wrote src/data/game.json: ${heroes.length} heroes, ${perks.length} perks, ${heroes.reduce((a, h) => a + h.feats.length, 0)} hero-feat entries`);
