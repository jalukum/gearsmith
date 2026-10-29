import { useEffect, useMemo, useState } from 'react';
import { heroPerks, heroPerkNames, heroFeatNames, type Hero } from '../lib/data';
import { ACTIVATION, PIECES, POS_LETTER, TIERS, closestValid, explainImpossible, lowestTier, solve, tierById, type PieceRoll, type Pos, type TierId } from '../lib/perks';
import { suggestBuilds, scoreForHero } from '../lib/recommend';
import { loadBuilds, saveBuilds, sameBuild } from '../lib/storage';
import { Glyph, Icon, ICONS } from './Glyph';

interface Props { hero: Hero; positions: Pos[]; tier: TierId; onChange: (p: Pos[], t: TierId) => void }

export default function Builder({ hero, positions, tier, onChange }: Props) {
  const perks = heroPerks(hero);
  const names = heroPerkNames(hero);
  const t = tierById(tier);
  const sel = [...positions].sort() as Pos[];
  const solution = useMemo(() => (sel.length ? solve(t, sel) : null), [tier, sel.join()]);
  const suggestions = useMemo(() => suggestBuilds(hero.name, names, heroFeatNames(hero)), [hero.id]);
  const [checks, setChecks] = useState<boolean[]>(Array(6).fill(false));
  const [toast, setToast] = useState('');
  useEffect(() => {
    const existing = loadBuilds().find((b) => sameBuild(b, { heroId: hero.id, positions: sel, tier }));
    setChecks(existing?.checks ?? Array(6).fill(false));
  }, [hero.id, tier, sel.join()]);
  useEffect(() => { if (toast) { const id = setTimeout(() => setToast(''), 2200); return () => clearTimeout(id); } }, [toast]);

  const toggle = (p: Pos) => {
    if (sel.includes(p)) onChange(sel.filter((x) => x !== p), tier);
    else if (sel.length < 3) onChange([...sel, p].sort() as Pos[], tier);
    else setToast('Max 3 perks — tap one to remove it first');
  };
  const fits = (p: Pos) => sel.includes(p) || (sel.length < 3 && solve(t, [...sel, p].sort() as Pos[]) !== null);

  const isSaved = loadBuilds().some((b) => sameBuild(b, { heroId: hero.id, positions: sel, tier }));
  const save = () => {
    const all = loadBuilds();
    const i = all.findIndex((b) => sameBuild(b, { heroId: hero.id, positions: sel, tier }));
    if (i >= 0) all[i].checks = checks;
    else all.unshift({ id: crypto.randomUUID?.() ?? String(Date.now()), heroId: hero.id, positions: sel, tier, checks, createdAt: Date.now() });
    saveBuilds(all);
    setToast(i >= 0 ? 'Build updated' : 'Build saved');
  };
  const setCheck = (i: number) => {
    const next = checks.map((c, k) => (k === i ? !c : c));
    setChecks(next);
    const all = loadBuilds();
    const b = all.find((x) => sameBuild(x, { heroId: hero.id, positions: sel, tier }));
    if (b) { b.checks = next; saveBuilds(all); }
  };
  const share = async () => {
    const url = location.href;
    const text = `${hero.name}: ${sel.map((p) => names[p]).join(' + ')} (${t.label})`;
    try {
      if (navigator.share) await navigator.share({ title: 'Gearsmith build', text, url });
      else { await navigator.clipboard.writeText(url); setToast('Link copied'); }
    } catch { /* user cancelled */ }
  };

  const alts = useMemo(() => (sel.length && !solution ? closestValid(t, sel, (c) => scoreForHero(hero.name, heroFeatNames(hero))(c.map((p) => names[p]))).slice(0, 4) : []), [solution, tier, sel.join()]);
  const lowest = sel.length ? lowestTier(sel) : null;

  return (
    <div className="builder">
      <section>
        <h2 className="section">Suggested builds</h2>
        <div className="sugs">
          {suggestions.map((s) => {
            const on = s.positions.join() === sel.join();
            return (
              <button key={s.label} className={`sug ${on ? 'on' : ''}`} onClick={() => onChange(s.positions, tier)}>
                <span className="sug-label">{s.label}</span>
                <span className="sug-glyphs">{s.names.map((n) => <Glyph key={n} name={n} size={18} />)}</span>
                <span className="sug-names">{s.names.join(' · ')}</span>
              </button>
            );
          })}
        </div>
        <p className="hint">Suggestions only — your playstyle wins.</p>
      </section>

      <section>
        <h2 className="section">Choose up to 3 perks <span className="muted">{sel.length}/3</span></h2>
        <div className="perk-pick">
          {perks.map((p, i) => {
            const pos = i as Pos;
            const on = sel.includes(pos);
            const ok = fits(pos);
            return (
              <button key={p.id} className={`pick cat-${p.category} ${on ? 'on' : ''} ${!ok && !on ? 'nofit' : ''}`} onClick={() => toggle(pos)} aria-pressed={on}>
                <span className="letter">{POS_LETTER[i]}</span>
                <span className="pick-glyph"><Glyph name={p.name} size={24} /></span>
                <span className="pick-name">{p.name}</span>
                {on && <span className="pick-check"><Icon d={ICONS.check} size={14} /></span>}
                {!ok && !on && sel.length < 3 && <span className="pick-warn">won’t fit</span>}
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="section">Gear rarity <span className="muted">{t.rep}</span></h2>
        <div className="tiers">
          {TIERS.map((x) => (
            <button key={x.id} className={`tier t-${x.id.replace(/\d/, '')} ${x.id === tier ? 'on' : ''}`} onClick={() => onChange(sel, x.id)}>{x.label}</button>
          ))}
        </div>
      </section>

      <section className="result" aria-live="polite">
        {sel.length === 0 && <div className="placeholder">Tap perks above, or pick a suggested build, to see exactly which gear to roll.</div>}
        {solution && (
          <>
            <div className="verdict-ok">
              <Icon d={ICONS.check} size={20} />
              <div>
                <strong>{sel.length === 1 ? 'Perk activates' : `All ${sel.length} perks activate`}</strong>
                {lowest && lowest.id !== tier && <span className="muted"> · also works from {lowest.label}</span>}
              </div>
            </div>
            <div className="totals">
              {sel.map((p, k) => {
                const v = solution.totals[k];
                return (
                  <div key={p} className="total">
                    <div className="total-top"><span><Glyph name={names[p]} size={16} /> {names[p]}</span><b>{v}<span className="muted">/{ACTIVATION}</span></b></div>
                    <div className="bar"><div style={{ width: `${Math.min(100, (v / ACTIVATION) * 100)}%` }} /></div>
                  </div>
                );
              })}
            </div>
            <h3 className="section small">Gear checklist</h3>
            <Checklist rolls={solution.rolls} names={names} sel={sel} checks={checks} onCheck={setCheck} />
            <p className="hint">Values assume fully upgraded gear. Any piece can hold any of these rolls; extra points above 600 do nothing.</p>
          </>
        )}
        {sel.length > 0 && !solution && (
          <div className="verdict-bad">
            <div className="vb-head"><Icon d={ICONS.x} size={20} /><strong>Not possible at {t.label}</strong></div>
            <p>{explainImpossible(t, sel)}</p>
            {lowest && <button className="btn" onClick={() => onChange(sel, lowest.id)}>Switch to {lowest.label}</button>}
            {alts.length > 0 && (
              <>
                <div className="vb-sub">Closest builds that work</div>
                <div className="alts">
                  {alts.map((c) => (
                    <button key={c.join()} className="alt" onClick={() => onChange(c, tier)}>
                      {c.map((p) => <span key={p} className={sel.includes(p) ? 'kept' : 'swap'}><Glyph name={names[p]} size={14} /> {names[p]}</span>)}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        {sel.length > 0 && (
          <div className="actions">
            <button className="btn primary" onClick={save}><Icon d={ICONS.saved} size={18} />{isSaved ? 'Update saved' : 'Save build'}</button>
            <button className="btn" onClick={share}><Icon d={ICONS.share} size={18} />Share</button>
          </div>
        )}
        <div className="notice">Gear perks are <b>disabled in Ranked</b> (Ranked Duel and Ranked Dominion), and can be turned off in some playlists and custom matches.</div>
      </section>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

function rollKey(r: PieceRoll) { return `${r.template}|${r.first}|${r.second}`; }

function Checklist({ rolls, names, sel, checks, onCheck }: { rolls: PieceRoll[]; names: string[]; sel: Pos[]; checks: boolean[]; onCheck: (i: number) => void }) {
  const groups: { roll: PieceRoll; idx: number[] }[] = [];
  rolls.forEach((r, i) => {
    const g = groups.find((x) => rollKey(x.roll) === rollKey(r));
    if (g) g.idx.push(i); else groups.push({ roll: r, idx: [i] });
  });
  const label = (p: Pos | 'any' | null, any: Pos[]) =>
    p === null ? null : p === 'any' ? { name: 'Any other perk', note: any.filter((x) => !sel.includes(x)).map((x) => names[x]).join(', ') } : { name: names[p], note: '' };
  return (
    <div className="checklist">
      {groups.map((g) => {
        const a = label(g.roll.first, g.roll.firstAny)!;
        const b = label(g.roll.second, g.roll.secondAny);
        return (
          <div key={rollKey(g.roll)} className="roll">
            <div className="roll-head">
              <span className="roll-count">{g.idx.length}×</span>
              <span className="roll-kind">{g.roll.kind === 'doubled' ? 'Doubled roll' : g.roll.kind === 'single' ? 'Single perk' : 'Even split'}</span>
            </div>
            <div className="roll-lines">
              <RollLine name={a.name} note={a.note} value={g.roll.firstValue} target={g.roll.first !== 'any'} />
              {b && <RollLine name={b.name} note={b.note} value={g.roll.secondValue} target={g.roll.second !== 'any'} />}
            </div>
            <div className="pieces">
              {g.idx.map((i) => (
                <button key={i} className={`piece ${checks[i] ? 'done' : ''}`} onClick={() => onCheck(i)} aria-pressed={checks[i]}>
                  <span className="box">{checks[i] && <Icon d={ICONS.check} size={12} />}</span>{PIECES[i]}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RollLine({ name, note, value, target }: { name: string; note: string; value: number; target: boolean }) {
  return (
    <div className={`rl ${target ? '' : 'wild'}`}>
      <span className="rl-glyph">{target ? <Glyph name={name} size={16} /> : <span className="dot" />}</span>
      <span className="rl-name">{name}{note && <small>{note}</small>}</span>
      <span className="rl-val">{value}</span>
    </div>
  );
}
