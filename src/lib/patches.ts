import rawFeed from '../data/patches.json';

/** Official For Honor news index. Individual notes link under this path. */
export const PATCH_SOURCE_PAGE = 'https://www.ubisoft.com/en-us/game/for-honor/news-updates';

export type Inline =
  | { kind: 'text'; text: string }
  | { kind: 'strong'; text: string }
  | { kind: 'em'; text: string }
  | { kind: 'link'; text: string; href: string };

export interface ListItem {
  depth: number;
  inlines: Inline[];
}

export type FlowBlock =
  | { type: 'paragraph'; inlines: Inline[] }
  | { type: 'list'; items: ListItem[] };

export type Block =
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | FlowBlock
  | { type: 'callout'; label: string; blocks: FlowBlock[] };

export interface PatchNote {
  id: string;
  title: string;
  date: string;
  abstract: string;
  content: string;
  version: string | null;
  url: string;
}

export interface PatchFeed {
  source: string;
  sourcePage: string;
  patches: PatchNote[];
}

type Raw =
  | { t: 'h'; level: 1 | 2 | 3; text: string; gap: boolean }
  | { t: 'li'; depth: number; text: string; gap: boolean }
  | { t: 'p'; text: string; gap: boolean }
  | { t: 'call'; label: string; gap: boolean };

const DEV_COMMENT = /^\[developer(?:['’]s|s['’])?\s+comments?\]$/i;

function plain(s: string): string {
  return s.replace(/\\+$/g, '').replace(/\*\*|__/g, '').replace(/\s+/g, ' ').trim();
}

function heroName(text: string): string | null {
  const m = /^(?:__|\*\*)\s*(.+?)\s*(?:__|\*\*)$/.exec(text.trim());
  if (!m) return null;
  const name = plain(m[1]);
  if (!name || name.length > 40 || name.split(/\s+/).length > 5) return null;
  if (name.startsWith('[')) return null;
  return name.replace(/:$/, '').trim();
}

function isDevComment(text: string): boolean {
  return DEV_COMMENT.test(plain(text).replace(/[*_]/g, ''));
}

function isSectionLabel(text: string): boolean {
  const t = plain(text);
  if (t.length < 2 || t.length > 36) return false;
  if (/[.!?]/.test(t) || t.includes(':')) return false;
  return t.split(/\s+/).length <= 4;
}

function classifyLine(line: string): Raw | null {
  const nb = line.replace(/\u00a0/g, ' ').replace(/\s+$/g, '');
  if (!nb.trim()) return null;
  const trimmed = nb.trim().replace(/\\+$/g, '').trim();
  if (!trimmed || /^#{1,4}$/.test(trimmed)) return null;

  const heading = /^(#{1,4})\s+(.+)$/.exec(trimmed);
    if (heading) {
    const text = plain(heading[2].replace(/\s+#+$/g, ''));
    if (!text) return null;
    return { t: 'h', level: Math.min(heading[1].length, 3) as 1 | 2 | 3, text, gap: false };
  }

  const hero = heroName(trimmed);
  if (hero) return { t: 'h', level: 3, text: hero, gap: false };

  if (isDevComment(trimmed)) return { t: 'call', label: "Developer's Comments", gap: false };

  const bullet = /^([ \t]*)([•·]|\-(?=[ \t])|\*(?=[ \t])|o(?=[ \t]))[ \t]+(.*)$/.exec(nb);
  if (bullet) {
    const text = bullet[3].replace(/\\+$/g, '').trim();
    if (!text) return null;
    const indent = bullet[1].replace(/\t/g, '  ').length;
    let depth = Math.min(3, Math.floor(indent / 2));
    if (bullet[2] === 'o') depth = Math.max(1, depth);
    return { t: 'li', depth, text, gap: false };
  }

  return { t: 'p', text: trimmed, gap: false };
}

function tokenize(markdown: string): Raw[] {
  const lines = markdown
    .replace(/\r\n/g, '\n')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .split('\n');
  const raw: Raw[] = [];
  let gap = false;
  for (const line of lines) {
    const item = classifyLine(line);
    if (!item) {
      gap = true;
      continue;
    }
    const prev = raw[raw.length - 1];
    // A blank line starts a new paragraph. A short label ("Localisation") stays its own line
    // so it can become a heading. Bullets stay adjacent so a blank line between them does not split the list.
    if (!gap && item.t === 'p' && prev?.t === 'p' && !isSectionLabel(prev.text)) prev.text += ' ' + item.text;
    else raw.push({ ...item, gap });
    gap = false;
  }
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    const next = raw[i + 1];
    const followedByList = next?.t === 'li';
    const tightParagraph = next?.t === 'p' && next.gap === false;
    if (item?.t === 'p' && isSectionLabel(item.text) && (followedByList || tightParagraph)) {
      raw[i] = { t: 'h', level: 3, text: plain(item.text), gap: item.gap };
    }
  }
  return raw;
}

/** Inline marks used in Ubisoft's notes: **bold**, __bold__, *em*, _em_, and [text](url). */
export function parseInlines(input: string): Inline[] {
  const s = input.replace(/\s+/g, ' ').trim();
  if (!s) return [];
  const out: Inline[] = [];
  const pushText = (text: string) => {
    if (!text) return;
    const last = out[out.length - 1];
    if (last && last.kind === 'text') last.text += text;
    else out.push({ kind: 'text', text });
  };
  let i = 0;
  while (i < s.length) {
    const sliced = s.slice(i);
    const link = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/.exec(sliced);
    if (link) {
      out.push({ kind: 'link', text: link[1], href: link[2] });
      i += link[0].length;
      continue;
    }
    const strong = /^\*\*([^*]+)\*\*|^__([^_]+)__/.exec(sliced);
    if (strong) {
      out.push({ kind: 'strong', text: plain(strong[1] ?? strong[2] ?? '') });
      i += strong[0].length;
      continue;
    }
    const em = /^\*([^*\n]+)\*/.exec(sliced);
    if (em) {
      out.push({ kind: 'em', text: em[1] });
      i += em[0].length;
      continue;
    }
    if (s[i] === '_' && (i === 0 || /\s/.test(s[i - 1]!))) {
      const under = /^_([^_\n]+)_/.exec(sliced);
      if (under) {
        out.push({ kind: 'em', text: under[1] });
        i += under[0].length;
        continue;
      }
    }
    pushText(s[i]!);
    i++;
  }
  return out.filter((n) => n.kind === 'link' || n.text.length > 0);
}

function flowsFrom(items: Raw[]): FlowBlock[] {
  const flows: FlowBlock[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    if (item.t === 'p') {
      const inlines = parseInlines(item.text);
      if (inlines.length) flows.push({ type: 'paragraph', inlines });
    } else if (item.t === 'li') {
      const list: ListItem[] = [];
      while (i < items.length && items[i]!.t === 'li') {
        const li = items[i] as Extract<Raw, { t: 'li' }>;
        const inlines = parseInlines(li.text);
        if (inlines.length) list.push({ depth: li.depth, inlines });
        i++;
      }
      i--;
      if (list.length) flows.push({ type: 'list', items: list });
    }
  }
  return flows;
}

/** Turn Ubisoft patch-note markdown (headings, hero names, bullets, dev comments) into blocks. */
export function parsePatchMarkdown(markdown: string): Block[] {
  const raw = tokenize(markdown);
  const blocks: Block[] = [];
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i]!;
    if (item.t === 'h') {
      blocks.push({ type: 'heading', level: item.level, text: item.text });
      continue;
    }
    if (item.t === 'call') {
      const inner: Raw[] = [];
      i++;
      while (i < raw.length && raw[i]!.t !== 'h' && raw[i]!.t !== 'call') {
        inner.push(raw[i]!);
        i++;
      }
      i--;
      blocks.push({ type: 'callout', label: item.label, blocks: flowsFrom(inner) });
      continue;
    }
    if (item.t === 'li') {
      const chunk: Raw[] = [];
      while (i < raw.length && raw[i]!.t === 'li') {
        chunk.push(raw[i]!);
        i++;
      }
      i--;
      blocks.push(...flowsFrom(chunk));
      continue;
    }
    blocks.push(...flowsFrom([item]));
  }
  return blocks;
}

export function patchVersion(title: string): string | null {
  const m = title.match(/\b(\d+\.\d+\.\d+)\b/);
  return m ? m[1] : null;
}

/** buttonUrl is the path Ubisoft's news API returns, e.g. `/<id>/patch-notes-2711-for-honor`. */
export function officialPatchUrl(id: string, buttonUrl: string | null | undefined): string {
  const raw = (buttonUrl ?? '').trim();
  if (/^https?:\/\//i.test(raw)) return raw;
  const path = raw.replace(/^\//, '');
  if (path) return `${PATCH_SOURCE_PAGE}/${path}`;
  if (id) return `${PATCH_SOURCE_PAGE}/${encodeURIComponent(id)}`;
  return PATCH_SOURCE_PAGE;
}

export function formatPatchDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(d);
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

/** Accept the committed JSON (or a runtime copy) and drop anything that isn't a real note. */
export function normalizeFeed(input: unknown): PatchFeed | null {
  const root = asRecord(input);
  if (!root || !Array.isArray(root.patches)) return null;
  const patches: PatchNote[] = [];
  for (const item of root.patches) {
    const rec = asRecord(item);
    if (!rec) continue;
    const title = typeof rec.title === 'string' ? rec.title.trim() : '';
    const content = typeof rec.content === 'string' ? rec.content : '';
    const date = typeof rec.date === 'string' ? rec.date : '';
    if (!title || !content.trim() || !date) continue;
    const id = typeof rec.id === 'string' && rec.id.trim() ? rec.id.trim() : `${date}:${title}`;
    const buttonUrl = typeof rec.buttonUrl === 'string' ? rec.buttonUrl : '';
    patches.push({
      id,
      title,
      date,
      abstract: typeof rec.abstract === 'string' ? rec.abstract.replace(/\s+/g, ' ').trim() : '',
      content,
      version: patchVersion(title),
      url: officialPatchUrl(id, buttonUrl),
    });
  }
  if (!patches.length) return null;
  patches.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  return {
    source: typeof root.source === 'string' && root.source.trim() ? root.source : 'Ubisoft For Honor patch notes',
    sourcePage: typeof root.sourcePage === 'string' && root.sourcePage.trim() ? root.sourcePage : PATCH_SOURCE_PAGE,
    patches,
  };
}

/**
 * Keep the newest notes. A same-day or older payload is ignored so a stale
 * cached response cannot replace the copy shipped with the app.
 */
export function preferFeed(current: PatchFeed, incoming: unknown): PatchFeed {
  const next = normalizeFeed(incoming);
  if (!next) return current;
  if (!current.patches.length) return next;
  const currentDate = Date.parse(current.patches[0]!.date);
  const nextDate = Date.parse(next.patches[0]!.date);
  if (Number.isFinite(nextDate) && (!Number.isFinite(currentDate) || nextDate > currentDate)) return next;
  return current;
}

export const EMPTY_FEED: PatchFeed = {
  source: 'Ubisoft For Honor patch notes',
  sourcePage: PATCH_SOURCE_PAGE,
  patches: [],
};

export const BUNDLED_PATCHES: PatchFeed = normalizeFeed(rawFeed) ?? EMPTY_FEED;
