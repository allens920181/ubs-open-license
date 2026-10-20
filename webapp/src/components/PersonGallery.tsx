import { useEffect, useState } from "react";
import type { Artwork, Person } from "../lib/types";
import { artUrl, localUrl } from "../lib/people";
import PinButton from "./PinButton";

interface Pic { key: string; src: string; thumb: string; title: string; credit: string; page?: string; pin?: { type: "artwork"; ref: string } }

export function picsOf(p: Person): { art: Pic[]; chibi: Pic[]; own: Pic[] } {
  const art = (a: Artwork): Pic => ({
    key: a.file, src: artUrl(a, 1600), thumb: artUrl(a, 400), title: a.title,
    credit: [a.artist, a.date, a.license].filter(Boolean).join(" · "), page: a.page, pin: { type: "artwork", ref: `${p.id}|${a.file}` },
  });
  const local = (f: string): Pic => ({ key: f, src: localUrl(f), thumb: localUrl(f), title: p.zh, credit: "自己提供的圖片" });
  return { art: p.art.map(art), chibi: p.chibi.map(local), own: p.own.map(local) };
}

/** Thumbnails that open a full-size viewer; artworks show their artist and licence. */
export default function PersonGallery({ person, pics }: { person: Person; pics: Pic[] }) {
  const [open, setOpen] = useState<number | null>(null);
  useEffect(() => {
    if (open === null) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      else if (e.key === "ArrowRight") setOpen((i) => Math.min(pics.length - 1, (i ?? 0) + 1));
      else if (e.key === "ArrowLeft") setOpen((i) => Math.max(0, (i ?? 0) - 1));
    };
    window.addEventListener("keydown", key);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", key); document.body.style.overflow = prev; };
  }, [open, pics.length]);
  const cur = open === null ? null : pics[open];
  return (
    <>
      <div className="grid">
        {pics.map((p, i) => (
          <div className="card img-card" key={p.key} onClick={() => setOpen(i)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setOpen(i)}>
            <img loading="lazy" src={p.thumb} alt={p.title} />
            <div className="img-title">{p.title}</div>
            {p.pin && <PinButton type={p.pin.type} refId={p.pin.ref} title={`${person.zh}:${p.title}`} compact />}
          </div>
        ))}
      </div>
      {cur && open !== null && (
        <div className="lightbox" role="dialog" aria-modal="true" onClick={() => setOpen(null)}>
          <button className="lb-close" onClick={() => setOpen(null)} aria-label="關閉">✕</button>
          {open > 0 && <button className="lb-nav prev" onClick={(e) => { e.stopPropagation(); setOpen(open - 1); }} aria-label="上一張">‹</button>}
          {open < pics.length - 1 && <button className="lb-nav next" onClick={(e) => { e.stopPropagation(); setOpen(open + 1); }} aria-label="下一張">›</button>}
          <figure onClick={(e) => e.stopPropagation()}>
            <img key={cur.key} src={cur.src} alt={cur.title} />
            <figcaption>
              <div className="lb-head"><h2>{cur.title}</h2>{cur.pin && <PinButton type={cur.pin.type} refId={cur.pin.ref} title={`${person.zh}:${cur.title}`} />}</div>
              <p className="muted small">{cur.credit}{cur.page && <> · <a href={cur.page} target="_blank" rel="noopener noreferrer">Wikimedia Commons</a></>} · {open + 1} / {pics.length}</p>
            </figcaption>
          </figure>
        </div>
      )}
    </>
  );
}
