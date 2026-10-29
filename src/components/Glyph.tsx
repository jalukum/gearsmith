import { GameImg } from './GameImg';
import { perkIcon } from '../lib/icons';

// Original line-art glyphs (not game assets). 24×24, stroke = currentColor.
const P: Record<string, string> = {
  Galestorm: 'M3 9h11a3 3 0 1 0-3-3M3 13h15a3 3 0 1 1-3 3M3 17h6',
  Devourer: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10zM9 11l1.5 2L12 11l1.5 2L15 11',
  'Early Reaper': 'M5 19L15 9M15 9c1-3 4-5 6-5-1 4-3 6-6 6M5 19l-1 1M8 16l-2-2',
  Endurance: 'M13 2L5 14h6l-1 8 8-12h-6l1-8z',
  'Survival Instinct': 'M12 3c3 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-3 0-5 1-8z',
  'Crush Them': 'M4 20l7-7M9 6l5-3 7 7-3 5-4-1-4-4-1-4zM11 13l-2-2',
  'Head Hunter': 'M12 3v4M12 17v4M3 12h4M17 12h4M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 11v2',
  Aegis: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z',
  'Shields Up': 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3zM12 16V9M9 12l3-3 3 3',
  Bastion: 'M4 21V8h3V5h3v3h4V5h3v3h3v13H4zM10 21v-5h4v5',
  'Vengeful Barrier': 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3zM13 7l-3 5h4l-3 5',
  'Last Stand': 'M12 3l8 3v6c0 5-3.5 8-8 9V3zM12 3L4 6v6c0 5 3.5 8 8 9',
  'Fresh Focus': 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  'Bulk Up': 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10zM12 9v6M9 12h6',
  'Radiant Rebound': 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M5 19l2-2',
  Remedy: 'M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3z',
  'Feline Agility': 'M4 20c6 0 14-6 16-16-6 1-12 6-13 13M8 14h5M10 11h5',
  Supersonic: 'M4 6l6 6-6 6M12 6l6 6-6 6',
  'Clever Tactics': 'M5 21V4M5 4h12l-3 4 3 4H5',
  'Rising Dawn': 'M3 18h18M6 18a6 6 0 0 1 12 0M12 6V3M4.5 10.5l-2-1.5M19.5 10.5l2-1.5M12 14v-3M10 12.5l2-2 2 2',
  'Rapid Refresh': 'M6 3h12M6 21h12M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9s10 4 10 9',
};
export function Glyph({ name, size = 22 }: { name: string; size?: number }) {
  return <GameImg className="gi perk-img" src={perkIcon(name)} size={Math.round(size * 1.25)} fallback={<GlyphSvg name={name} size={size} />} />;
}
export function GlyphSvg({ name, size = 22 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={P[name] ?? 'M12 3l9 9-9 9-9-9z'} />
    </svg>
  );
}

export function Icon({ d, size = 22 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}
export const ICONS = {
  heroes: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z',
  saved: 'M6 3h12v18l-6-4-6 4V3z',
  rules: 'M5 4h10a4 4 0 0 1 4 4v12H9a4 4 0 0 1-4-4V4zM9 9h6M9 13h6',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
  back: 'M15 5l-7 7 7 7',
  share: 'M12 3v12M8 7l4-4 4 4M5 13v6h14v-6',
  check: 'M5 12l5 5 9-11',
  x: 'M6 6l12 12M18 6L6 18',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  spark: 'M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z',
};
