import type { Artwork, Person } from "./types";

/** Commons redirects Special:FilePath to a resized copy on upload.wikimedia.org. */
export const artUrl = (a: Pick<Artwork, "file">, width = 0) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(a.file.replace(/ /g, "_"))}${width ? `?width=${width}` : ""}`;

/** Local files (chibi / own pictures) are served from the site itself. */
export const localUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`;

export const personThumb = (p: Person): string | null =>
  p.chibi[0] ? localUrl(p.chibi[0]) : p.art[0] ? artUrl(p.art[0], 400) : p.own[0] ? localUrl(p.own[0]) : null;

export const ERAS = ["創世與族長", "出埃及與曠野", "征服與士師", "王國時代", "分裂王國與先知", "被擄與歸回", "智慧文學", "耶穌與福音書", "使徒時代"];
