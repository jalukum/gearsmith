// Single switch for real game icons. When false (or an icon is missing / fails to load),
// the app falls back to its original SVG glyphs and faction crests.
import icons from '../data/icons.json';

export const USE_GAME_ICONS = true;

type Entry = { file: string; source: string };
const map = icons as unknown as { perks: Record<string, Entry>; feats: Record<string, Entry>; heroes: Record<string, Entry> };
const url = (e?: Entry) => (USE_GAME_ICONS && e ? `./${e.file}` : null);

export const perkIcon = (name: string) => url(map.perks[name]);
export const featIcon = (image?: string | null) => (image ? url(map.feats[image]) : null);
export const heroIcon = (name: string) => url(map.heroes[name]);
