import { useEffect, useState } from 'react';
import { TIERS, type Pos, type TierId } from './perks';

export type Route =
  | { name: 'heroes' }
  | { name: 'hero'; id: number; tab: 'build' | 'perks' | 'feats'; positions: Pos[]; tier: TierId }
  | { name: 'saved' }
  | { name: 'rules' };

const LETTERS = 'ABCDEFG';
export const encodePositions = (p: Pos[]) => [...p].sort().map((x) => LETTERS[x]).join('');
export const decodePositions = (s: string | null): Pos[] =>
  [...new Set((s || '').toUpperCase().split('').map((c) => LETTERS.indexOf(c)).filter((i) => i >= 0))].slice(0, 3).sort() as Pos[];

export function parse(hash: string): Route {
  const [path, qs] = hash.replace(/^#/, '').split('?');
  const q = new URLSearchParams(qs || '');
  const parts = path.split('/').filter(Boolean);
  if (parts[0] === 'hero' && parts[1]) {
    const tab = (['build', 'perks', 'feats'] as const).find((t) => t === parts[2]) ?? 'build';
    const t = q.get('t');
    const tier = (TIERS.find((x) => x.id === t)?.id ?? 'legendary4') as TierId;
    return { name: 'hero', id: Number(parts[1]), tab, positions: decodePositions(q.get('p')), tier };
  }
  if (parts[0] === 'saved') return { name: 'saved' };
  if (parts[0] === 'rules') return { name: 'rules' };
  return { name: 'heroes' };
}

export function href(r: Route): string {
  switch (r.name) {
    case 'heroes': return '#/';
    case 'saved': return '#/saved';
    case 'rules': return '#/rules';
    case 'hero': {
      const q = new URLSearchParams();
      if (r.positions.length) q.set('p', encodePositions(r.positions));
      if (r.tier !== 'legendary4') q.set('t', r.tier);
      const s = q.toString();
      return `#/hero/${r.id}/${r.tab}${s ? '?' + s : ''}`;
    }
  }
}

export function navigate(r: Route, replace = false) {
  const h = href(r);
  if (replace) history.replaceState(null, '', h);
  else history.pushState(null, '', h);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

export function useRoute(): Route {
  const [r, setR] = useState(() => parse(location.hash));
  useEffect(() => {
    const on = () => setR(parse(location.hash));
    window.addEventListener('hashchange', on);
    window.addEventListener('popstate', on);
    return () => { window.removeEventListener('hashchange', on); window.removeEventListener('popstate', on); };
  }, []);
  return r;
}
