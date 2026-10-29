import { describe, expect, it } from 'vitest';
import { TIERS, tierById, feasibleCombos, solve, closestValid, ACTIVATION, type Pos, candidateRolls, lowestTier } from './perks';

const L = (s: string) => s.split('').map((c) => 'ABCDEFG'.indexOf(c) as Pos);
const key = (c: Pos[]) => c.map((p) => 'ABCDEFG'[p]).join('');
const pairs = (letters: string) => {
  const r: string[] = [];
  for (let i = 0; i < letters.length; i++) for (let j = i + 1; j < letters.length; j++) r.push(letters[i] + letters[j]);
  return r;
};
const cross = (a: string, b: string) => [...a].flatMap((x) => [...b].map((y) => [x, y].sort().join('')));
const triples = (letters: string) => {
  const r: string[] = [];
  for (let i = 0; i < letters.length; i++) for (let j = i + 1; j < letters.length; j++) for (let k = j + 1; k < letters.length; k++) r.push(letters[i] + letters[j] + letters[k]);
  return r;
};
const uniqSorted = (xs: string[]) => [...new Set(xs.map((x) => [...x].sort().join('')))].sort();

// Ubisoft "Perks Explained": possible combinations by rarity (A..G = perks top to bottom in the gear screen)
const OFFICIAL: Record<string, { two: string[]; three: string[] }> = {
  common: { two: ['AB', 'AC'], three: [] },
  rare: { two: pairs('ABCD'), three: [] },
  heroic: { two: uniqSorted([...pairs('ABCD'), ...cross('ABC', 'E')]), three: [] },
  epic: { two: uniqSorted([...pairs('ABCD'), ...cross('ABC', 'D'), ...cross('ABCD', 'EF')]), three: ['ABC'] },
  legendary: {
    two: uniqSorted([...pairs('ABCD'), ...cross('ABCD', 'EFG'), ...pairs('EFG')]),
    three: uniqSorted([...triples('ABCD'), ...pairs('ABCD').flatMap((p) => [...'EFG'].map((e) => p + e))]),
  },
};
OFFICIAL.epic2 = OFFICIAL.epic;
OFFICIAL.legendary2 = OFFICIAL.legendary;
OFFICIAL.legendary4 = OFFICIAL.legendary;

describe('feasible combos match the official Ubisoft table', () => {
  for (const t of TIERS) {
    it(`${t.label}: 2-perk combos`, () => {
      expect(uniqSorted(feasibleCombos(t, 2).map(key))).toEqual(uniqSorted(OFFICIAL[t.id].two));
    });
    it(`${t.label}: 3-perk combos`, () => {
      expect(uniqSorted(feasibleCombos(t, 3).map(key))).toEqual(uniqSorted(OFFICIAL[t.id].three));
    });
    it(`${t.label}: never more than 3 perks`, () => {
      expect(solve(t, L('ABCD'))).toBeNull();
    });
  }
});

describe('solutions are valid gear loadouts', () => {
  for (const t of TIERS) {
    for (const size of [1, 2, 3]) {
      it(`${t.label}: every ${size}-perk solution has 6 pieces, distinct perks per piece and ≥600 each`, () => {
        for (const combo of feasibleCombos(t, size)) {
          const s = solve(t, combo)!;
          expect(s.rolls).toHaveLength(6);
          s.totals.forEach((v) => expect(v).toBeGreaterThanOrEqual(ACTIVATION));
          for (const r of s.rolls) {
            if (r.second !== null && r.first !== 'any') expect(r.second).not.toBe(r.first);
            // each roll must come from a real template of this tier
            const tpl = t.templates[r.template];
            expect(tpl).toBeTruthy();
            if (r.first !== 'any') expect(tpl!.first).toContain(r.first);
            if (r.second !== null && r.second !== 'any') expect(tpl!.second).toContain(r.second);
          }
        }
      });
    }
  }
});

describe('spot checks from the wiki', () => {
  const L4 = tierById('legendary4');
  it('Warden: Survival Instinct (E) + Head Hunter (F) + Fresh Focus (G) is impossible', () => {
    expect(solve(L4, L('EFG'))).toBeNull();
  });
  it('Two E–G perks plus one A–D perk is impossible even at Legendary ♦♦♦♦', () => {
    expect(solve(L4, L('AEF'))).toBeNull();
  });
  it('An E–G perk needs its low roll on at least 5 pieces when paired with two A–D perks', () => {
    const s = solve(L4, L('ABE'))!;
    expect(s.rolls.filter((r) => r.vec[2] > 0).length).toBeGreaterThanOrEqual(5);
  });
  it('Common: A+B works, B+C does not', () => {
    expect(solve(tierById('common'), L('AB'))).not.toBeNull();
    expect(solve(tierById('common'), L('BC'))).toBeNull();
  });
  it('Epic: A+B+C works, A+B+D does not', () => {
    expect(solve(tierById('epic'), L('ABC'))).not.toBeNull();
    expect(solve(tierById('epic'), L('ABD'))).toBeNull();
  });
  it('lowest rarity for a combo', () => {
    expect(lowestTier(L('AB'))!.id).toBe('common');
    expect(lowestTier(L('CD'))!.id).toBe('rare');
    expect(lowestTier(L('AE'))!.id).toBe('heroic');
    expect(lowestTier(L('ABC'))!.id).toBe('epic');
    expect(lowestTier(L('ABG'))!.id).toBe('legendary');
    expect(lowestTier(L('EFG'))).toBeNull();
  });
  it('closest valid to E+F+G keeps two of them and swaps the third... or offers A–D partners', () => {
    const c = closestValid(L4, L('EFG')).map(key);
    expect(c.length).toBeGreaterThan(0);
    c.forEach((x) => expect(x.length).toBe(3));
    // all suggestions share exactly one of E/F/G (two E–G perks can never be in a 3-perk build)
    c.forEach((x) => expect([...x].filter((ch) => 'EFG'.includes(ch)).length).toBe(1));
  });
  it('candidate rolls never put the same perk twice on a piece', () => {
    for (const t of TIERS) for (const r of candidateRolls(t, L('AB'))) if (r.first !== 'any') expect(r.second).not.toBe(r.first);
  });
});
