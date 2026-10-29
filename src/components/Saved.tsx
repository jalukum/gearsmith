import { useEffect, useState } from 'react';
import { heroById, heroPerkNames } from '../lib/data';
import { href } from '../lib/route';
import { solve, tierById } from '../lib/perks';
import { loadBuilds, saveBuilds, type SavedBuild } from '../lib/storage';
import { Glyph, Icon, ICONS } from './Glyph';
import { Crest } from './Crest';

export default function Saved() {
  const [builds, setBuilds] = useState<SavedBuild[]>(loadBuilds);
  useEffect(() => {
    const on = () => setBuilds(loadBuilds());
    window.addEventListener('gearsmith:builds', on);
    window.addEventListener('storage', on);
    return () => { window.removeEventListener('gearsmith:builds', on); window.removeEventListener('storage', on); };
  }, []);
  const remove = (id: string) => saveBuilds(builds.filter((b) => b.id !== id));
  return (
    <div className="page">
      <header className="masthead compact">
        <div className="eyebrow">Your loadouts</div>
        <h1>Saved builds</h1>
        <p className="sub">Stored on this device only.</p>
      </header>
      {builds.length === 0 && <div className="empty">No saved builds yet. Open a hero, pick perks, and tap <b>Save build</b>.</div>}
      <div className="stack">
        {builds.map((b) => {
          const h = heroById(b.heroId);
          if (!h) return null;
          const names = heroPerkNames(h);
          const t = tierById(b.tier);
          const ok = solve(t, b.positions) !== null;
          const done = b.checks.filter(Boolean).length;
          return (
            <article key={b.id} className={`saved-card f-${h.faction.replace(' ', '')}`}>
              <a className="saved-main" href={href({ name: 'hero', id: h.id, tab: 'build', positions: b.positions, tier: b.tier })}>
                <Crest name={h.name} faction={h.faction} size={48} />
                <div className="saved-body">
                  <div className="saved-title">{h.name} <span className="muted">· {t.label}</span></div>
                  <div className="saved-perks">{b.positions.map((p) => <span key={p}><Glyph name={names[p]} size={14} />{names[p]}</span>)}</div>
                  <div className="saved-meta">
                    {ok ? <span className="okc">{done}/6 pieces collected</span> : <span className="badc">Not possible at this rarity</span>}
                    <span className="muted"> · {new Date(b.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="mini-bar"><div style={{ width: `${(done / 6) * 100}%` }} /></div>
                </div>
              </a>
              <button className="icon-btn" onClick={() => remove(b.id)} aria-label={`Delete ${h.name} build`}><Icon d={ICONS.trash} size={18} /></button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
