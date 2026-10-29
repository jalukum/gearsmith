import { GameImg } from './GameImg';
import { heroIcon } from '../lib/icons';
// Original faction crest: a shaped badge with the hero's monogram. No game art.
const SHAPES: Record<string, string> = {
  Knights: 'M24 3l17 6v13c0 11-7.5 18-17 23C14.5 40 7 33 7 22V9z',
  Vikings: 'M24 3l19 11v20L24 45 5 34V14z',
  Samurai: 'M24 3c11 0 19 8 19 19v4c0 11-8 19-19 19S5 37 5 26v-4C5 11 13 3 24 3z',
  'Wu Lin': 'M16 3h16l12 12v18L32 45H16L4 33V15z',
  Outlanders: 'M24 2l20 22-20 22L4 24z',
};
// Hero portrait (4:5, full-bleed) with the original faction crest as fallback.
export function Crest(props: { name: string; faction: string; size?: number }) {
  const size = props.size ?? 48;
  return (
    <span className="crest-wrap" style={{ width: size, height: Math.round(size * 1.25) }}>
      <GameImg className="gi hero-img" src={heroIcon(props.name)} size={size} alt="" fallback={<CrestSvg {...props} />} />
    </span>
  );
}
export function CrestSvg({ name, faction, size = 48 }: { name: string; faction: string; size?: number }) {
  const mono = name.split(' ').map((w) => w[0]).join('').slice(0, 2);
  return (
    <svg className="crest" width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <path d={SHAPES[faction] ?? SHAPES.Knights} className="crest-bg" />
      <path d={SHAPES[faction] ?? SHAPES.Knights} className="crest-line" fill="none" />
      <text x="24" y="29.5" textAnchor="middle" className="crest-text">{mono}</text>
    </svg>
  );
}
