import game from '../data/game.json';
import type { Pos } from './perks';

export interface Perk { id: number; name: string; category: 'Offense' | 'Defense' | 'Assist'; description: string; explanation: string; image?: string | null }
export interface Feat { name: string; tier: number; slot: number; description: string; cooldown: string | null; explanation: string; image?: string | null }
export interface Hero {
  id: number; name: string; faction: string; class: string; health: number; stamina: number; guard: string;
  perks: { slot: number; perkId: number }[]; feats: Feat[];
}

export const META = game.meta;
export const PERKS = game.perks as Perk[];
export const HEROES = (game.heroes as Hero[]).slice().sort((a, b) => a.name.localeCompare(b.name));
export const FACTIONS = ['Knights', 'Vikings', 'Samurai', 'Wu Lin', 'Outlanders'];
export const CLASSES = ['Vanguard', 'Heavy', 'Assassin', 'Hybrid'];

const perkById = new Map(PERKS.map((p) => [p.id, p]));
export const heroById = (id: number) => HEROES.find((h) => h.id === id);
/** Hero's 7 perks in gear-screen order (A..G). */
export const heroPerks = (h: Hero): Perk[] => h.perks.slice().sort((a, b) => a.slot - b.slot).map((p) => perkById.get(p.perkId)!);
export const heroPerkNames = (h: Hero) => heroPerks(h).map((p) => p.name);
export const heroFeatNames = (h: Hero) => h.feats.map((f) => f.name);
export const posOfPerk = (h: Hero, perkId: number) => (h.perks.find((p) => p.perkId === perkId)!.slot - 1) as Pos;
export const heroesWithPerk = (perkId: number) => HEROES.filter((h) => h.perks.some((p) => p.perkId === perkId));
