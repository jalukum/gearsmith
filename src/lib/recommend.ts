/**
 * Suggested builds. These are NOT official — they are derived from the community perk
 * explanations published by For Honor Info Hub (forhonorinfohub.com), turned into a simple score.
 * Each rating below paraphrases Info Hub's verdict for that perk.
 */
import { solve, tierById, type Pos, type TierId } from './perks';

export type Mode = 'dominion' | 'breach';

export const PERK_RATING: Record<string, { score: number; verdict: string; breach?: number }> = {
  'Vengeful Barrier': { score: 10, verdict: 'Best defense perk' },
  'Rapid Refresh': { score: 10, verdict: 'Arguably the best perk' },
  'Last Stand': { score: 8, verdict: 'Quite good' },
  'Bulk Up': { score: 8, verdict: 'Pretty good' },
  'Radiant Rebound': { score: 8, verdict: 'Very good in Dominion', breach: 5 },
  'Rising Dawn': { score: 7, verdict: 'Good', breach: 9 },
  Endurance: { score: 6, verdict: 'Decent' },
  'Head Hunter': { score: 6, verdict: 'Decent' },
  Remedy: { score: 6, verdict: 'Decent' },
  Bastion: { score: 6, verdict: 'Good for stalling; great in Breach', breach: 9 },
  Galestorm: { score: 5, verdict: 'Decent' },
  'Fresh Focus': { score: 5, verdict: 'Decent' },
  Devourer: { score: 4, verdict: 'Situational' },
  Supersonic: { score: 3, verdict: 'Mediocre' },
  'Feline Agility': { score: 3, verdict: 'Mediocre' },
  Aegis: { score: 2, verdict: 'Mediocre; better in Breach', breach: 5 },
  'Clever Tactics': { score: 2, verdict: 'Weak in Dominion; Breach archer lane', breach: 6 },
  'Survival Instinct': { score: 2, verdict: 'Underwhelming' },
  'Shields Up': { score: 1, verdict: 'Weak after nerf' },
  'Early Reaper': { score: 1, verdict: 'Weak' },
  'Crush Them': { score: 1, verdict: 'Weak' },
};

// Hero-specific notes taken from Info Hub's explanations
const HERO_BONUS: Record<string, Record<string, number>> = {
  Devourer: { Warden: 2, Shaman: 2, Peacekeeper: 2, Shaolin: 2 },
  Remedy: { Shaolin: 1, Shaman: 1 },
  'Head Hunter': { Shaolin: 1, Shaman: 1 },
};

function comboScore(names: string[], hero: string, mode: Mode, featNames: string[] = []): number {
  let s = 0;
  // Info Hub: Rising Dawn is especially good with revive feats (Speed Revive, Protected Revive)
  if (names.includes('Rising Dawn') && featNames.some((f) => f === 'Speed Revive' || f === 'Protected Revive')) s += 2;
  for (const n of names) {
    const r = PERK_RATING[n];
    s += (mode === 'breach' ? r?.breach ?? r?.score : r?.score) ?? 0;
    s += HERO_BONUS[n]?.[hero] ?? 0;
  }
  const has = (n: string) => names.includes(n);
  // Synergies / anti-synergies called out by Info Hub
  if (has('Remedy') && has('Head Hunter')) s += 2;
  if (has('Devourer') && has('Head Hunter')) s += 1;
  if (has('Last Stand') && has('Vengeful Barrier')) s += 2;
  if (has('Last Stand') && has('Bastion')) s -= 3; // damage resistance does not stack
  return s;
}

export interface Suggestion {
  label: string;
  positions: Pos[];
  names: string[];
  score: number;
}

export function suggestBuilds(hero: string, perkNames: string[], featNames: string[] = [], tier: TierId = 'legendary4'): Suggestion[] {
  const t = tierById(tier);
  const triples: Pos[][] = [];
  for (let a = 0; a < 7; a++) for (let b = a + 1; b < 7; b++) for (let c = b + 1; c < 7; c++) triples.push([a, b, c] as Pos[]);
  const feasible = triples.filter((c) => solve(t, c));
  const ranked = (mode: Mode) =>
    feasible
      .map((c) => ({ positions: c, names: c.map((p) => perkNames[p]), score: comboScore(c.map((p) => perkNames[p]), hero, mode, featNames) }))
      .sort((x, y) => y.score - x.score);
  const dom = ranked('dominion');
  const br = ranked('breach');
  const same = (x: Pos[], y: Pos[]) => x.join() === y.join();
  const out: Suggestion[] = [{ label: 'Top pick', ...dom[0] }];
  const alt = dom.find((d) => !same(d.positions, dom[0].positions));
  if (alt) out.push({ label: 'Alternative', ...alt });
  const hit = out.find((o) => same(o.positions, br[0].positions));
  if (hit) hit.label += ' · also best for Breach';
  else out.push({ label: 'Breach pick', ...br[0] });
  return out;
}

export const scoreForHero = (hero: string, featNames: string[] = [], mode: Mode = 'dominion') => (names: string[]) => comboScore(names, hero, mode, featNames);
