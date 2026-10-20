import booksJson from "./books.json";
import type { Span } from "./types";

export interface Book {
  n: number;
  code: string;
  zh: string;
  abbr: string;
  en: string;
  alias: string[];
}
export const BOOKS = booksJson as Book[];

const norm = (s: string) => s.toLowerCase().replace(/[\s.　]/g, "");
const alias = new Map<string, Book>();
for (const b of BOOKS) {
  for (const a of [b.code, b.zh, b.abbr, b.en, ...b.alias]) alias.set(norm(a), b);
}
export const bookByNumber = (n: number) => BOOKS[n - 1];

/** One part of a reference: "13", "13:5", "13:1-14:28", "13:4-14", "13-15". */
const PART = /^(\d+)(?::(\d+))?(?:[-–—~](\d+)(?::(\d+))?)?$/;

function span(book: number, m: RegExpMatchArray): Span {
  const base = book * 1_000_000;
  const c1 = +m[1];
  if (m[2] === undefined) return [base + c1 * 1000, base + (m[3] ? +m[3] : c1) * 1000 + 999];
  const from = base + c1 * 1000 + +m[2];
  if (m[3] === undefined) return [from, from];
  if (m[4] !== undefined) return [from, base + +m[3] * 1000 + +m[4]];
  return [from, base + c1 * 1000 + +m[3]];
}

/** Free text such as "徒 13", "Acts 13:5", "創世記22:1-19". Null when it is not a reference. */
export function parseRef(text: string): Span | null {
  const m = text.trim().match(/^(.*?)\s*(\d+(?:\s*:\s*\d+)?(?:\s*[-–—~]\s*\d+(?:\s*:\s*\d+)?)?)$/);
  if (!m) return null;
  const book = alias.get(norm(m[1]));
  const p = book && m[2].replace(/\s/g, "").match(PART);
  return book && p ? span(book.n, p) : null;
}

export const overlaps = (a: Span, b: Span) => a[0] <= b[1] && b[0] <= a[1];
export const anySpan = (spans: Span[], q: Span) => spans.some((s) => overlaps(s, q));

/** Does a sorted array of verse numbers contain one inside the query? */
export function anyVerse(verses: number[], q: Span): boolean {
  let lo = 0, hi = verses.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (verses[mid] < q[0]) lo = mid + 1; else hi = mid;
  }
  return lo < verses.length && verses[lo] <= q[1];
}

const split = (n: number) => ({ b: Math.floor(n / 1_000_000), c: Math.floor(n / 1000) % 1000, v: n % 1000 });

/** "徒 13:1-14:28" (abbr) or "使徒行傳 13:1-14:28" (long). */
export function formatSpan([from, to]: Span, long = false): string {
  const a = split(from), z = split(to);
  const bk = bookByNumber(a.b);
  const name = bk ? (long ? bk.zh : bk.abbr) : `#${a.b}`;
  if (a.v === 0 && z.v === 999) {
    return a.c === z.c ? `${name} ${a.c}` : `${name} ${a.c}-${z.c}`;
  }
  if (from === to) return `${name} ${a.c}:${a.v}`;
  if (a.c === z.c) return `${name} ${a.c}:${a.v}-${z.v}`;
  return `${name} ${a.c}:${a.v}-${z.c}:${z.v}`;
}

export const formatSpans = (spans: Span[], long = false) => spans.map((s) => formatSpan(s, long)).join(";");

/** Collapse consecutive verses of one book into spans, for showing a long list of single verses. */
export function versesToSpans(verses: number[]): Span[] {
  const out: Span[] = [];
  for (const v of verses) {
    const last = out[out.length - 1];
    if (last && v - last[1] <= 1 && Math.floor(v / 1_000_000) === Math.floor(last[1] / 1_000_000)) last[1] = v;
    else out.push([v, v]);
  }
  return out;
}

/** Stable URL form of a span: "ACT 13:1-14:28" (the USFM code works with parseRef). */
export const spanToParam = (s: Span) => {
  const b = bookByNumber(split(s[0]).b);
  const t = formatSpan(s).replace(/^\S+/, b ? b.code : "");
  return t;
};
