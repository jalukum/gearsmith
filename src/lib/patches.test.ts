import { describe, expect, it } from 'vitest';
import bundled from '../data/patches.json';
import { href, parse } from './route';
import {
  BUNDLED_PATCHES,
  formatPatchDate,
  normalizeFeed,
  officialPatchUrl,
  parseInlines,
  parsePatchMarkdown,
  patchVersion,
  preferFeed,
  type PatchFeed,
} from './patches';

const Y10_TU2 = `
# IMPROVEMENTS

## Voice Chat

•	Improved internal voice chat quality – better encoding with higher bitrate

# BALANCING CHANGES

### Jiang Jun

•	Zone Attack (Fatal Swirl) now costs 35 Stamina (up from 20)

**[Developer’s Comments]**

Jiang Jun has a very high pick rate.

### Valkyrie
•	Sweep Punish now deals 18 damage (down from 22)

# Feat Changes

•	Thrilling Comeback (Tier 2 Feat) has been adjusted as follows:
o	Heals for 20 HP when entering Revenge (down from 40)
•	Phalanx (Tier 4 Feat) grants a 70 HP Shield (down from 100)

# BUG FIXES

## Balancing

Characters
•	Barracks: The preview of all equipped Executions now plays in the Effects menu.
`;

const Y10_S2 = `
## NEW FEATURE

- Hero Lore - Visit the Barracks to view a new Lore section for each Hero.

## BALANCING CHANGES

__Berserker__

- Spin Chop was adjusted as follows:
  - Attack is now Enhanced.
  - Cannot be cancelled via Dodge Recovery

[Developer's Comments]

Spin Chop was too strong in team fights.

__Jiang Jun__

- Can now perform Light Openers from 300 to 900ms during Front Dodge.

**EXAMPLE:** *if an ally hits the enemy, damage is reduced.*

See the [patch notes](https://www.ubisoft.com/en-us/game/for-honor/news-updates) for the full list.
`;

const feed = (date: string, title = 'PATCH NOTES 2.71.1 – FOR HONOR'): PatchFeed => ({
  source: 'test',
  sourcePage: 'https://www.ubisoft.com/en-us/game/for-honor/news-updates',
  patches: [{
    id: 'a',
    title,
    date,
    abstract: '',
    content: '# BUG FIXES\n\n- Fixed a thing.',
    version: '2.71.1',
    url: 'https://www.ubisoft.com/en-us/game/for-honor/news-updates/a/patch',
  }],
});

describe('patch note markdown', () => {
  it('reads headings, hero names, bullets, sub-bullets, and developer comments', () => {
    const blocks = parsePatchMarkdown(Y10_TU2);
    const headings = blocks.filter((b) => b.type === 'heading').map((b) => `${b.level}:${b.text}`);
    expect(headings).toEqual([
      '1:IMPROVEMENTS',
      '2:Voice Chat',
      '1:BALANCING CHANGES',
      '3:Jiang Jun',
      '3:Valkyrie',
      '1:Feat Changes',
      '1:BUG FIXES',
      '2:Balancing',
      '3:Characters',
    ]);
    const voice = blocks.find((b) => b.type === 'list');
    expect(voice).toMatchObject({ type: 'list' });
    if (voice?.type === 'list') expect(voice.items[0]?.inlines).toEqual([
      { kind: 'text', text: 'Improved internal voice chat quality – better encoding with higher bitrate' },
    ]);
    const callouts = blocks.filter((b) => b.type === 'callout');
    expect(callouts).toHaveLength(1);
    if (callouts[0]?.type === 'callout') {
      expect(callouts[0].label).toBe("Developer's Comments");
      expect(callouts[0].blocks[0]).toMatchObject({ type: 'paragraph' });
    }
    const feat = blocks.find((b) => b.type === 'list' && b.items.some((item) => item.depth > 0));
    if (feat?.type === 'list') expect(feat.items.map((item) => item.depth)).toEqual([0, 1, 0]);
    const jiang = blocks.findIndex((b) => b.type === 'heading' && b.text === 'Jiang Jun');
    expect(blocks[jiang + 1]?.type).toBe('list');
    expect(blocks[jiang + 2]?.type).toBe('callout');
  });

  it('reads underscore hero names, nested dashes, emphasis, and links', () => {
    const blocks = parsePatchMarkdown(Y10_S2);
    expect(blocks.filter((b) => b.type === 'heading').map((b) => b.text)).toEqual([
      'NEW FEATURE',
      'BALANCING CHANGES',
      'Berserker',
      'Jiang Jun',
    ]);
    const nested = blocks.find((b) => b.type === 'list' && b.items.length > 1);
    if (nested?.type === 'list') expect(nested.items.map((item) => item.depth)).toEqual([0, 1, 1]);
    const example = blocks.find((b) => b.type === 'paragraph' && b.inlines.some((n) => n.kind === 'strong'));
    expect(example).toMatchObject({
      type: 'paragraph',
      inlines: [
        { kind: 'strong', text: 'EXAMPLE:' },
        { kind: 'text', text: ' ' },
        { kind: 'em', text: 'if an ally hits the enemy, damage is reduced.' },
      ],
    });
    const link = parseInlines('See the [patch notes](https://www.ubisoft.com/en-us/game/for-honor/news-updates) online.');
    expect(link[1]).toEqual({
      kind: 'link',
      text: 'patch notes',
      href: 'https://www.ubisoft.com/en-us/game/for-honor/news-updates',
    });
  });

  it('skips empty headings and keeps a plain paragraph', () => {
    const blocks = parsePatchMarkdown('###\n### Audio\n\n•\tFixed an emote.\n\nStill looking at this.');
    expect(blocks.map((b) => b.type)).toEqual(['heading', 'list', 'paragraph']);
  });

  it('keeps a one-word label above the next line as its own heading', () => {
    const blocks = parsePatchMarkdown('Localisation\nFrench : Fixed the translation.\n\nthe Great Beyond\n\nDeadly Hare');
    expect(blocks.filter((b) => b.type === 'heading').map((b) => b.text)).toEqual(['Localisation']);
    expect(blocks.filter((b) => b.type === 'paragraph').map((b) => b.inlines.map((n) => n.kind === 'text' ? n.text : '').join(''))).toEqual([
      'French : Fixed the translation.',
      'the Great Beyond',
      'Deadly Hare',
    ]);
  });
});

describe('patch feed helpers', () => {
  it('pulls a version and builds the official URL', () => {
    expect(patchVersion('PATCH NOTES 2.71.1 – FOR HONOR')).toBe('2.71.1');
    expect(patchVersion('Patch Notes 6.65.3 - FOR HONOR')).toBe('6.65.3');
    expect(patchVersion('Warrior’s Den Recap')).toBeNull();
    expect(officialPatchUrl('3dy1', '/3dy1MpNPAHkL2oS1LvB7bS/patch-notes-2711-for-honor')).toBe(
      'https://www.ubisoft.com/en-us/game/for-honor/news-updates/3dy1MpNPAHkL2oS1LvB7bS/patch-notes-2711-for-honor',
    );
    expect(officialPatchUrl('abc', '')).toBe('https://www.ubisoft.com/en-us/game/for-honor/news-updates/abc');
    expect(formatPatchDate('2026-10-22T12:00:00.000Z')).toBe('October 22, 2026');
  });

  it('rejects a broken payload and prefers a newer feed over a stale one', () => {
    const current = feed('2026-10-22T12:00:00.000Z');
    expect(normalizeFeed(null)).toBeNull();
    expect(normalizeFeed({ patches: [] })).toBeNull();
    expect(normalizeFeed({ patches: [{ title: 'Nope' }] })).toBeNull();
    expect(preferFeed(current, { nope: true })).toBe(current);
    expect(preferFeed(current, { patches: [{ id: 'old', title: 'Patch Notes 2.69.0 - FOR HONOR', date: '2026-07-23T12:00:00.000Z', content: '# BUG FIXES\n- x', buttonUrl: '/x/y' }] })).toBe(current);
    const newer = preferFeed(current, {
      source: 'ubi',
      patches: [{ id: 'new', title: 'PATCH NOTES 2.72.0 – FOR HONOR', date: '2026-11-19T12:00:00.000Z', abstract: 'PC: 1GB', content: '# BUG FIXES\n\n- Fixed it.', buttonUrl: '/new/patch-notes-2720-for-honor' }],
    });
    expect(newer.patches[0]?.version).toBe('2.72.0');
    expect(newer.patches[0]?.url).toContain('/new/patch-notes-2720-for-honor');
    const sameDayEdit = {
      patches: [{ id: 'a', title: current.patches[0]!.title, date: current.patches[0]!.date, content: '# BUG FIXES\n\n- A same-day wording fix.' }],
    };
    expect(preferFeed(current, sameDayEdit).patches[0]?.content).toBe(current.patches[0]!.content);
  });
});

describe('committed patch notes', () => {
  it('parses every saved note into readable sections', () => {
    expect(BUNDLED_PATCHES.patches.length).toBeGreaterThan(0);
    const latest = BUNDLED_PATCHES.patches[0]!;
    expect(latest.title.length).toBeGreaterThan(0);
    expect(latest.url.startsWith('https://www.ubisoft.com/')).toBe(true);
    expect(Number.isNaN(Date.parse(latest.date))).toBe(false);
    for (const note of BUNDLED_PATCHES.patches) {
      const blocks = parsePatchMarkdown(note.content);
      expect(blocks.length).toBeGreaterThan(0);
      const headings = blocks.filter((b) => b.type === 'heading');
      const lists = blocks.filter((b) => b.type === 'list');
      expect(headings.length + lists.length).toBeGreaterThan(0);
    }
    const titles = BUNDLED_PATCHES.patches.map((p) => p.date);
    expect([...titles].sort((a, b) => Date.parse(b) - Date.parse(a))).toEqual(titles);
  });

  it('matches the file the scheduled job writes', () => {
    const normalized = normalizeFeed(bundled);
    expect(normalized?.patches.map((p) => p.id)).toEqual(BUNDLED_PATCHES.patches.map((p) => p.id));
  });
});

describe('patch notes route', () => {
  it('opens the tab from the hash', () => {
    expect(parse('#/patches')).toEqual({ name: 'patches' });
    expect(parse('#/patches?x=1')).toEqual({ name: 'patches' });
    expect(href({ name: 'patches' })).toBe('#/patches');
  });
});
