/** A verse range as UBS integers BBBCCCVVV (e.g. ACT 13:5 = 44013005). */
export type Span = [from: number, to: number];

export interface Route {
  id: string;
  num: number;
  name: string;
  zh: string;
  group: string;
  refs: Span[];
  /** Segments of [lon, lat]. */
  lines: [number, number][][];
}

export interface BibleImage {
  id: string;
  col: string;
  file: string;
  type: string;
  en: string;
  zh: string;
  den: string;
  dzh: string;
  subj: string;
  tags: string;
  th: string[];
  cp: string;
  refs: number[];
}

export interface NatureSection {
  h: string;
  sh: string;
  p: string[];
  l: { lang: string; lem: string; tr: string; gl: string; r: number[] }[];
  i: string[];
}

export interface NatureEntry {
  k: string;
  t: string;
  e: string;
  s: NatureSection[];
  r: number[];
  i: string[];
  x?: string[];
  in?: string[];
}

export type NatureKind = "flora" | "fauna" | "realia";

export interface HottpEntry {
  id: string;
  refs: number[];
  rm: string;
  sg: string;
  alts: { s: string; rt: string; v: [string, string][]; f: string[]; lit: string }[];
}
