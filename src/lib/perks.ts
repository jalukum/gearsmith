/**
 * For Honor gear-perk solver.
 *
 * Model (sources: For Honor Fandom wiki "Perk" page — Potential Combinations + Value Distribution;
 * Ubisoft "Marching Fire Perks Explained"):
 *  - A hero has 7 perks, in gear-screen order A..G (Info Hub `perk_slot` 1..7).
 *  - You wear 6 gear pieces (Helm, Chest, Arms, 3 weapon parts). Perk points from all pieces add up;
 *    a perk activates at 600 points. Points above 600 do nothing.
 *  - Each piece rolls one of a few perk templates for its rarity (below). Values assume fully levelled gear.
 */

export type Pos = 0 | 1 | 2 | 3 | 4 | 5 | 6; // A..G
export const POS_LETTER = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const;
export const ACTIVATION = 600;
export const PIECES = ['Helm', 'Chest', 'Arms', 'Weapon part 1', 'Weapon part 2', 'Weapon part 3'] as const;

export type TierId = 'common' | 'rare' | 'heroic' | 'epic' | 'epic2' | 'legendary' | 'legendary2' | 'legendary4';

/** One way a single gear piece can roll. `high`/`low` are the two perk slots; `single` means a one-perk piece. */
export interface Template {
  kind: 'single' | 'even' | 'doubled';
  /** allowed positions for the first (or only, or high) perk */
  first: Pos[];
  firstValue: number;
  /** allowed positions for the second (low) perk; empty for single */
  second: Pos[];
  secondValue: number;
}

export interface Tier {
  id: TierId;
  label: string;
  rep: string;
  max: number;
  templates: Template[];
}

const AC: Pos[] = [0, 1, 2];
const AD: Pos[] = [0, 1, 2, 3];
const EG: Pos[] = [4, 5, 6];

function epicLike(id: TierId, label: string, rep: string, even: number, high: number): Tier {
  return {
    id, label, rep, max: even * 2,
    templates: [
      { kind: 'doubled', first: AC, firstValue: high, second: AC, secondValue: even },
      { kind: 'even', first: AD, firstValue: even, second: AD, secondValue: even },
      { kind: 'even', first: AD, firstValue: even, second: [4, 5], secondValue: even },
    ],
  };
}
function legendaryLike(id: TierId, label: string, rep: string, even: number, low: number, high: number): Tier {
  return {
    id, label, rep, max: even * 2,
    templates: [
      { kind: 'doubled', first: AD, firstValue: high, second: AD, secondValue: low },
      { kind: 'doubled', first: AD, firstValue: high, second: EG, secondValue: low },
      { kind: 'even', first: EG, firstValue: even, second: EG, secondValue: even },
    ],
  };
}

export const TIERS: Tier[] = [
  {
    id: 'common', label: 'Common', rep: 'Rep 0', max: 200,
    templates: [
      { kind: 'single', first: [0], firstValue: 200, second: [], secondValue: 0 },
      { kind: 'even', first: [0], firstValue: 100, second: [1, 2], secondValue: 100 },
    ],
  },
  { id: 'rare', label: 'Rare', rep: 'Rep 1', max: 210,
    templates: [{ kind: 'even', first: AD, firstValue: 105, second: AD, secondValue: 105 }] },
  { id: 'heroic', label: 'Heroic', rep: 'Rep 3', max: 220,
    templates: [
      { kind: 'even', first: AD, firstValue: 110, second: AD, secondValue: 110 },
      { kind: 'even', first: AC, firstValue: 110, second: [4], secondValue: 110 },
    ] },
  epicLike('epic', 'Epic', 'Rep 5', 115, 230),
  epicLike('epic2', 'Epic ♦♦', 'Rep 6', 120, 240),
  legendaryLike('legendary', 'Legendary', 'Rep 7', 130, 120, 260),
  legendaryLike('legendary2', 'Legendary ♦♦', 'Rep 9', 140, 130, 280),
  legendaryLike('legendary4', 'Legendary ♦♦♦♦', 'Rep 12', 145, 140, 290),
];
export const tierById = (id: TierId) => TIERS.find((t) => t.id === id)!;

/** A concrete piece roll, relative to the requested target positions. */
export interface PieceRoll {
  kind: Template['kind'];
  /** index into tier.templates */
  template: number;
  /** perk at the first slot: a target position, or 'any' (an off-target perk from `firstAny`) */
  first: Pos | 'any';
  firstAny: Pos[];
  firstValue: number;
  second: Pos | 'any' | null;
  secondAny: Pos[];
  secondValue: number;
  /** points contributed to each target, in target order */
  vec: number[];
}

/** All distinct useful rolls for a set of target positions at a tier. */
export function candidateRolls(tier: Tier, targets: Pos[]): PieceRoll[] {
  const out: PieceRoll[] = [];
  const seen = new Set<string>();
  const isT = (p: Pos) => targets.includes(p);
  tier.templates.forEach((t, ti) => {
    const fOpts: (Pos | 'any')[] = [...t.first.filter(isT)];
    const fOff = t.first.filter((p) => !isT(p));
    if (fOff.length) fOpts.push('any');
    for (const f of fOpts) {
      if (t.kind === 'single') {
        push(t, ti, f, fOff, null, []);
        continue;
      }
      const sOff = t.second.filter((p) => !isT(p) && p !== f);
      const sOpts: (Pos | 'any')[] = t.second.filter((p) => isT(p) && p !== f);
      // 'any' + 'any' is only possible if two distinct off-target positions exist
      if (sOff.length && !(f === 'any' && new Set([...fOff, ...sOff]).size < 2)) sOpts.push('any');
      for (const s of sOpts) push(t, ti, f, fOff, s, sOff);
    }
  });
  function push(t: Template, ti: number, f: Pos | 'any', fOff: Pos[], s: Pos | 'any' | null, sOff: Pos[]) {
    const vec = targets.map((p) => (f === p ? t.firstValue : 0) + (s === p ? t.secondValue : 0));
    if (vec.every((v) => v === 0)) return;
    const key = `${ti}|${t.kind}|${f}|${s}|${vec.join()}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({
      kind: t.kind, template: ti, first: f, firstAny: f === 'any' ? fOff : [], firstValue: t.firstValue,
      second: s, secondAny: s === 'any' ? sOff : [], secondValue: t.secondValue, vec,
    });
  }
  return out;
}

export interface Solution {
  feasible: true;
  rolls: PieceRoll[]; // length 6
  totals: number[]; // per target
}

const dominates = (a: number[], b: number[]) => a.every((v, i) => v >= b[i]);

/**
 * Find the best 6-piece loadout reaching 600 on every target.
 * Preference: fewest distinct roll types (easier shopping), then most minimum surplus,
 * then most "any other perk" wildcards (easier to find).
 */
const solveCache = new Map<string, Solution | null>();
export function solve(tier: Tier, targets: Pos[]): Solution | null {
  const ck = `${tier.id}:${[...targets].sort().join()}:${targets.join()}`;
  if (solveCache.has(ck)) return solveCache.get(ck)!;
  const res = solveUncached(tier, targets);
  solveCache.set(ck, res);
  return res;
}
function solveUncached(tier: Tier, targets: Pos[]): Solution | null {
  if (targets.length === 0 || targets.length > 3) return null;
  if (new Set(targets).size !== targets.length) return null;
  const all = candidateRolls(tier, targets);
  // drop rolls strictly dominated by another roll (keeping ties for wildcard preference)
  const rolls = all.filter((r) => !all.some((o) => o !== r && dominates(o.vec, r.vec) && o.vec.some((v, i) => v > r.vec[i])));
  const n = rolls.length;
  let best: { idx: number[]; score: number[] } | null = null;
  const idx: number[] = [];
  const sums = targets.map(() => 0);
  const better = (a: number[], b: number[]) => {
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] > b[i];
    return false;
  };
  const rec = (start: number, depth: number) => {
    if (depth === 6) {
      if (sums.every((s) => s >= ACTIVATION)) {
        const distinct = new Set(idx).size;
        const minSurplus = Math.min(...sums) - ACTIVATION;
        const wild = idx.reduce((a, i) => a + (rolls[i].first === 'any' ? 1 : 0) + (rolls[i].second === 'any' ? 1 : 0), 0);
        const score = [-distinct, minSurplus, wild];
        if (!best || better(score, best.score)) best = { idx: [...idx], score };
      }
      return;
    }
    for (let i = start; i < n; i++) {
      idx.push(i);
      rolls[i].vec.forEach((v, k) => (sums[k] += v));
      rec(i, depth + 1);
      rolls[i].vec.forEach((v, k) => (sums[k] -= v));
      idx.pop();
    }
  };
  rec(0, 0);
  if (!best) return null;
  const b = best as { idx: number[] };
  const chosen = b.idx.map((i) => rolls[i]);
  // Order: most valuable/specific pieces first for a tidy checklist
  chosen.sort((x, y) => y.vec.reduce((a, c) => a + c, 0) - x.vec.reduce((a, c) => a + c, 0));
  return { feasible: true, rolls: chosen, totals: targets.map((_, k) => chosen.reduce((a, r) => a + r.vec[k], 0)) };
}

export const isFeasible = (tier: Tier, targets: Pos[]) => solve(tier, targets) !== null;

/** Every feasible combo of exactly `size` perks for a tier (positions sorted). */
export function feasibleCombos(tier: Tier, size: number): Pos[][] {
  const res: Pos[][] = [];
  const all: Pos[] = [0, 1, 2, 3, 4, 5, 6];
  const pick = (start: number, cur: Pos[]) => {
    if (cur.length === size) {
      if (isFeasible(tier, cur)) res.push([...cur]);
      return;
    }
    for (let i = start; i < 7; i++) pick(i + 1, [...cur, all[i]]);
  };
  pick(0, []);
  return res;
}

/** Closest valid combos to an impossible selection: same size, sharing as many perks as possible. */
export function closestValid(tier: Tier, targets: Pos[], score?: (combo: Pos[]) => number): Pos[][] {
  const size = targets.length;
  const combos = feasibleCombos(tier, size);
  const shared = (c: Pos[]) => c.filter((p) => targets.includes(p)).length;
  const maxShared = Math.max(-1, ...combos.map(shared));
  let out = combos.filter((c) => shared(c) === maxShared && maxShared > 0);
  if (score) out = out.sort((a, b) => score(b) - score(a));
  return out;
}

/** Highest tier needed (lowest rarity that works), or null if impossible even at Legendary ♦♦♦♦. */
export function lowestTier(targets: Pos[]): Tier | null {
  return TIERS.find((t) => isFeasible(t, targets)) ?? null;
}

/** Human explanation of why a selection cannot be activated at a tier. */
export function explainImpossible(tier: Tier, targets: Pos[]): string {
  const low = lowestTier(targets);
  const lateCount = targets.filter((p) => p >= 4).length;
  if (targets.length > 3) return 'Six pieces can hold at most 3 active perks.';
  if (low) return `This combo needs ${low.label} gear or better — ${tier.label} pieces can’t carry enough points.`;
  if (targets.length === 3 && lateCount >= 2)
    return 'Perks E–G (the bottom three) only roll as a small secondary value on a piece, or paired with each other. A 3-perk build can include only one of them.';
  return 'No mix of six pieces reaches 600 points on every one of these perks.';
}
