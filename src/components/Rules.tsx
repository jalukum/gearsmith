import { TIERS } from '../lib/perks';

export default function Rules() {
  return (
    <div className="page rules">
      <header className="masthead compact">
        <div className="eyebrow">How gear perks work</div>
        <h1>The rules</h1>
      </header>
      <section className="card">
        <h2>The basics</h2>
        <ul>
          <li>Every hero has <b>7 perks</b>, shown in a fixed order (we label them <b>A–G</b>, top to bottom).</li>
          <li>You wear <b>6 gear pieces</b>: helm, chest, arms and three weapon parts. Each piece carries one or two perks with point values.</li>
          <li>Points from all six pieces add up. A perk turns on at <b>600 points</b>; extra points do nothing.</li>
          <li>You can have at most <b>3 active perks</b>.</li>
          <li>Perks <b>A–D</b> can roll high values. Perks <b>E–G</b> only roll as a small second value, or paired with each other, so a 3-perk build can include only one of them.</li>
          <li>Gear perks are <b>disabled in Ranked</b> (Ranked Duel and Ranked Dominion) and can be off in some playlists and custom matches.</li>
        </ul>
      </section>
      <section className="card">
        <h2>Possible combos by rarity</h2>
        <table className="tbl">
          <thead><tr><th>Rarity</th><th>Possible</th></tr></thead>
          <tbody>
            <tr><td>Common</td><td>A + B, or A + C</td></tr>
            <tr><td>Rare</td><td>Any 2 of A–D</td></tr>
            <tr><td>Heroic</td><td>Any 2 of A–D · one of A–C + E</td></tr>
            <tr><td>Epic</td><td>A + B + C · any 2 of A–D · one of A–D + E or F</td></tr>
            <tr><td>Legendary</td><td>Any 3 of A–D · 2 of A–D + one of E–G · any 2 perks</td></tr>
          </tbody>
        </table>
      </section>
      <section className="card">
        <h2>Points per piece (fully upgraded)</h2>
        <table className="tbl">
          <thead><tr><th>Rarity</th><th>Even split</th><th>Doubled</th></tr></thead>
          <tbody>
            {TIERS.map((t) => {
              const even = t.templates.find((x) => x.kind === 'even');
              const dbl = t.templates.find((x) => x.kind === 'doubled');
              const single = t.templates.find((x) => x.kind === 'single');
              return (
                <tr key={t.id}>
                  <td>{t.label} <span className="muted">{t.rep}</span></td>
                  <td>{even ? `${even.firstValue} + ${even.secondValue}` : '—'}{single ? ` · or ${single.firstValue} single` : ''}</td>
                  <td>{dbl ? `${dbl.firstValue} + ${dbl.secondValue}` : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="hint">Doubled rolls (Epic and Legendary) put up to +60% on the top perk. Doubled top perks can be A–C at Epic, A–D at Legendary.</p>
      </section>
    </div>
  );
}
