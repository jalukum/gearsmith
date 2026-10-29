import { useMemo, useState } from 'react';
import { CLASSES, FACTIONS, HEROES, heroPerkNames, heroFeatNames } from '../lib/data';
import { href } from '../lib/route';
import { suggestBuilds } from '../lib/recommend';
import { Glyph } from './Glyph';
import { Crest } from './Crest';

const FKEY = 'gearsmith.filters.v1';

export default function HeroGrid() {
  const saved = (() => { try { return JSON.parse(sessionStorage.getItem(FKEY) || '{}'); } catch { return {}; } })();
  const [faction, setFaction] = useState<string | null>(saved.faction ?? null);
  const [cls, setCls] = useState<string | null>(saved.cls ?? null);
  const persist = (o: object) => sessionStorage.setItem(FKEY, JSON.stringify({ faction, cls, ...o }));

  const list = useMemo(() => {
    return HEROES.filter((h) => (!faction || h.faction === faction) && (!cls || h.class === cls));
  }, [faction, cls]);

  return (
    <div className="page">
      <div className="fan-banner" role="note"><span aria-hidden>⚔</span> Unofficial fan app · not affiliated with Ubisoft</div>
      <header className="masthead">
        <div className="eyebrow">For Honor · Gear perks</div>
        <h1>Gearsmith</h1>
        <div className="divider" aria-hidden><span /></div>
        <p className="sub">Pick a hero, choose up to three perks, get the exact gear to roll.</p>
      </header>


      <div className="chips chips-5" role="group" aria-label="Faction">
        {FACTIONS.map((f) => (
          <button key={f} className={`chip f-${f.replace(' ', '')} ${faction === f ? 'on' : ''}`} onClick={() => { const v = faction === f ? null : f; setFaction(v); persist({ faction: v }); }} aria-pressed={faction === f} aria-label={f} title={f}>{f}</button>
        ))}
      </div>
      <div className="chips chips-4" role="group" aria-label="Class">
        {CLASSES.map((c) => (
          <button key={c} className={`chip ${cls === c ? 'on' : ''}`} onClick={() => { const v = cls === c ? null : c; setCls(v); persist({ cls: v }); }} aria-pressed={cls === c}>{c}</button>
        ))}
      </div>

      <div className="count">{list.length} {list.length === 1 ? 'hero' : 'heroes'}</div>
      <div className="grid">
        {list.map((h) => {
          const top = suggestBuilds(h.name, heroPerkNames(h), heroFeatNames(h))[0];
          return (
            <a key={h.id} className={`hero-card f-${h.faction.replace(' ', '')}`} href={href({ name: 'hero', id: h.id, tab: 'build', positions: [], tier: 'legendary4' })}>
              <div className="hc-banner"><Crest name={h.name} faction={h.faction} size={84} /></div>
              <div className="hc-name">{h.name}</div>
              <div className="hc-meta">{h.class}</div>
              <div className="hc-perks" title={`Suggested: ${top.names.join(', ')}`}>
                {top.names.map((n) => <span key={n} className="mini"><Glyph name={n} size={14} /></span>)}
              </div>
            </a>
          );
        })}
      </div>
      {list.length === 0 && <div className="empty">No heroes match. Try clearing a filter.</div>}
          </div>
  );
}

