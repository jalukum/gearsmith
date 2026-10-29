import type { Pos, TierId } from './perks';

export interface SavedBuild { id: string; heroId: number; positions: Pos[]; tier: TierId; name?: string; checks: boolean[]; createdAt: number }
const KEY = 'gearsmith.builds.v1';

export function loadBuilds(): SavedBuild[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
export function saveBuilds(b: SavedBuild[]) {
  localStorage.setItem(KEY, JSON.stringify(b));
  window.dispatchEvent(new Event('gearsmith:builds'));
}
export const sameBuild = (a: { heroId: number; positions: Pos[]; tier: TierId }, b: { heroId: number; positions: Pos[]; tier: TierId }) =>
  a.heroId === b.heroId && a.tier === b.tier && [...a.positions].sort().join() === [...b.positions].sort().join();
