import { heroById, heroPerks, type Hero } from '../lib/data';
import { navigate, type Route } from '../lib/route';
import { POS_LETTER, lowestTier, type Pos } from '../lib/perks';
import { PERK_RATING } from '../lib/recommend';
import { Glyph, Icon, ICONS } from './Glyph';
import { Crest } from './Crest';
import { GameImg } from './GameImg';
import { featIcon } from '../lib/icons';
import Builder from './Builder';

type HeroRoute = Extract<Route, { name: 'hero' }>;

export default function HeroPage({ route }: { route: HeroRoute }) {
  const hero = heroById(route.id);
  if (!hero) return <div className="page"><a className="back" href="#/"><Icon d={ICONS.back} size={18} />Heroes</a><div className="empty">Hero not found.</div></div>;
  const go = (tab: HeroRoute['tab']) => navigate({ ...route, tab }, true);
  return (
    <div className={`page hero-page f-${hero.faction.replace(' ', '')}`}>
      <a className="back" href="#/"><Icon d={ICONS.back} size={18} />Heroes</a>
      <header className="hero-head">
        <Crest name={hero.name} faction={hero.faction} size={84} />
        <div>
          <div className="eyebrow">{hero.faction} · {hero.class}</div>
          <h1>{hero.name}</h1>
          <div className="stats">
            <span><b>{hero.health}</b> HP</span><span><b>{hero.stamina}</b> stamina</span><span>{hero.guard}</span>
          </div>
        </div>
      </header>
      <div className="seg" role="tablist">
        {(['build', 'perks', 'feats'] as const).map((t) => (
          <button key={t} role="tab" aria-selected={route.tab === t} className={route.tab === t ? 'on' : ''} onClick={() => go(t)}>
            {t === 'build' ? 'Builder' : t === 'perks' ? 'Perks' : 'Feats'}
          </button>
        ))}
      </div>
      {route.tab === 'build' && <Builder hero={hero} positions={route.positions} tier={route.tier} onChange={(positions, tier) => navigate({ ...route, positions, tier }, true)} />}
      {route.tab === 'perks' && <PerkList hero={hero} onBuild={(p) => navigate({ ...route, tab: 'build', positions: [p] }, false)} />}
      {route.tab === 'feats' && <FeatList hero={hero} />}
    </div>
  );
}

function PerkList({ hero, onBuild }: { hero: Hero; onBuild: (p: Pos) => void }) {
  const perks = heroPerks(hero);
  return (
    <div className="stack">
      <p className="hint">Perks are listed in gear-screen order. Letters A–G decide which gear rolls can carry them.</p>
      {perks.map((p, i) => {
        const low = lowestTier([i as Pos]);
        const r = PERK_RATING[p.name];
        return (
          <article key={p.id} className={`perk-card cat-${p.category}`}>
            <div className="pc-top">
              <span className="pc-glyph"><Glyph name={p.name} size={26} /></span>
              <div className="pc-title">
                <h3>{p.name}</h3>
                <div className="pc-meta"><span className="letter">{POS_LETTER[i]}</span>{p.category}{low && <> · from {low.label}</>}</div>
              </div>
              {r && <span className={`verdict v${Math.min(3, Math.floor(r.score / 3.4))}`}>{r.verdict}</span>}
            </div>
            <p className="pc-desc">{p.description}</p>
            {p.explanation && <details><summary>Analysis</summary><p>{p.explanation}</p></details>}
            <button className="link" onClick={() => onBuild(i as Pos)}>Build around {p.name} →</button>
          </article>
        );
      })}
      <p className="hint">“From …” is the lowest rarity where this perk alone reaches 600 points.</p>
    </div>
  );
}

function FeatList({ hero }: { hero: Hero }) {
  const tiers = [1, 2, 3, 4];
  return (
    <div className="stack">
      {tiers.map((t) => (
        <section key={t}>
          <h2 className="section">Tier {t}</h2>
          {hero.feats.filter((f) => f.tier === t).map((f) => {
            const [kind, ...rest] = f.description.split(' | ');
            const desc = rest.length ? rest.join(' | ') : kind;
            return (
              <article key={f.name} className="feat-card">
                <div className="fc-top">
                  <span className="fc-icon"><GameImg className="gi feat-img" src={featIcon(f.image)} size={40} fallback={<span className="fc-tier">{['I', 'II', 'III', 'IV'][t - 1]}</span>} /></span>
                  <h3>{f.name}</h3>
                  <span className={`tag ${f.cooldown ? 'active' : ''}`}>{rest.length ? kind : f.cooldown ? 'Active' : 'Feat'}{f.cooldown ? ` · ${f.cooldown}s` : ''}</span>
                </div>
                <p className="fc-desc">{desc}</p>
                {f.explanation && <details><summary>Analysis</summary><p>{f.explanation}</p></details>}
              </article>
            );
          })}
        </section>
      ))}
      <p className="hint">Feats are picked in match; they are not gear.</p>
    </div>
  );
}
