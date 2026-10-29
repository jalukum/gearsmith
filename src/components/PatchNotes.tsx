import { useEffect, useState } from 'react';
import {
  BUNDLED_PATCHES,
  PATCH_SOURCE_PAGE,
  formatPatchDate,
  parsePatchMarkdown,
  preferFeed,
  type Block,
  type FlowBlock,
  type Inline,
  type PatchFeed,
  type PatchNote,
} from '../lib/patches';

function Rich({ inlines }: { inlines: Inline[] }) {
  return (
    <>
      {inlines.map((n, i) => {
        if (n.kind === 'strong') return <strong key={i}>{n.text}</strong>;
        if (n.kind === 'em') return <em key={i}>{n.text}</em>;
        if (n.kind === 'link') return <a key={i} href={n.href} target="_blank" rel="noopener noreferrer">{n.text}</a>;
        return <span key={i}>{n.text}</span>;
      })}
    </>
  );
}

function Flow({ block }: { block: FlowBlock }) {
  if (block.type === 'paragraph') return <p><Rich inlines={block.inlines} /></p>;
  return (
    <ul className="pn-list">
      {block.items.map((item, i) => (
        <li key={i} className={item.depth ? `d${item.depth}` : undefined}><Rich inlines={item.inlines} /></li>
      ))}
    </ul>
  );
}

function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((block, i) => {
        if (block.type === 'heading') {
          if (block.level === 1) return <h3 key={i} className="pn-h pn-h1">{block.text}</h3>;
          if (block.level === 2) return <h4 key={i} className="pn-h pn-h2">{block.text}</h4>;
          return <h5 key={i} className="pn-h pn-h3">{block.text}</h5>;
        }
        if (block.type === 'callout') {
          return (
            <aside key={i} className="pn-callout">
              <div className="pn-callout-label">{block.label}</div>
              {block.blocks.map((inner, j) => <Flow key={j} block={inner} />)}
            </aside>
          );
        }
        return <Flow key={i} block={block} />;
      })}
    </>
  );
}

function NoteBody({ note }: { note: PatchNote }) {
  const blocks = parsePatchMarkdown(note.content);
  return (
    <div className="pn">
      <Blocks blocks={blocks.length ? blocks : [{ type: 'paragraph', inlines: [{ kind: 'text', text: note.content }] }]} />
      <a className="link" href={note.url} target="_blank" rel="noopener noreferrer">Read on Ubisoft</a>
    </div>
  );
}

export default function PatchNotes() {
  const [feed, setFeed] = useState<PatchFeed>(BUNDLED_PATCHES);
  useEffect(() => {
    const ac = new AbortController();
    const url = new URL('patches.json', document.baseURI);
    fetch(url, { cache: 'no-cache', signal: ac.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data) => {
        if (!ac.signal.aborted) setFeed((current) => preferFeed(current, data));
      })
      .catch(() => {});
    return () => ac.abort();
  }, []);

  const [latest, ...earlier] = feed.patches;
  return (
    <div className="page patch-notes">
      <header className="masthead compact">
        <div className="eyebrow">From the war table</div>
        <h1>Patch notes</h1>
        <p className="sub">Official For Honor updates, kept current on their own.</p>
      </header>
      {!latest && (
        <div className="empty">
          Patch notes aren’t available right now. The last saved copy is missing.
          <div><a className="link" href={PATCH_SOURCE_PAGE} target="_blank" rel="noopener noreferrer">Ubisoft’s For Honor news</a></div>
        </div>
      )}
      {latest && (
        <article className="card patch-latest">
          <div className="pn-kicker">
            <span className="pn-version">{latest.version ? `v${latest.version}` : 'Latest'}</span>
            <time className="pn-date" dateTime={latest.date}>{formatPatchDate(latest.date)}</time>
          </div>
          <h2 className="pn-title">{latest.title}</h2>
          {latest.abstract && <p className="pn-abstract">{latest.abstract}</p>}
          <a className="link pn-source" href={latest.url} target="_blank" rel="noopener noreferrer">Official source</a>
          <NoteBody note={latest} />
        </article>
      )}
      {earlier.length > 0 && (
        <section className="patch-earlier">
          <h2 className="section">Earlier patches</h2>
          {earlier.map((note) => (
            <details key={note.id} className="card patch-older">
              <summary>
                <span className="pn-sum">
                  <b>{note.version ? `v${note.version}` : note.title}</b>
                  <span>{formatPatchDate(note.date)}{note.abstract ? ` · ${note.abstract}` : ''}</span>
                </span>
              </summary>
              <NoteBody note={note} />
            </details>
          ))}
        </section>
      )}
      <div className="credits">
        <p>Notes are mirrored from <a href={feed.sourcePage} target="_blank" rel="noopener noreferrer">Ubisoft’s For Honor news</a>.</p>
        <p><strong>Unofficial fan app.</strong> Not affiliated with Ubisoft.</p>
      </div>
    </div>
  );
}
