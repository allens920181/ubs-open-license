import { useMemo, useState } from "react";
import type { BibleImage, NatureEntry, NatureKind } from "../lib/types";
import { imageTitle, imageUrl } from "../lib/images";
import Lightbox from "./Lightbox";
import PinButton from "./PinButton";
import { RefLinks } from "./RefLinks";

export const KIND_LABEL: Record<NatureKind, string> = { flora: "植物", fauna: "動物", realia: "器物" };

/** Handbook entry: text sections, original-language words with their verses, and the entry's pictures. */
export default function NatureDetail({ kind, entry, images }: { kind: NatureKind; entry: NatureEntry; images: BibleImage[] | undefined }) {
  const byId = useMemo(() => new Map((images ?? []).map((i) => [i.id, i])), [images]);
  const pics = entry.i.map((id) => byId.get(id)).filter(Boolean) as BibleImage[];
  const [open, setOpen] = useState<number | null>(null);
  return (
    <article className="nature-detail">
      <header>
        <h2>{entry.t}</h2>
        <PinButton type="nature" refId={`${kind}:${entry.k}`} title={entry.t} />
      </header>
      <p className="muted small">{KIND_LABEL[kind]} {entry.k}{entry.e && ` · ${entry.e}`}</p>
      {pics.length > 0 && (
        <div className="strip">
          {pics.map((img, i) => <img key={img.id} src={imageUrl(img, 400)} alt={imageTitle(img)} loading="lazy" onClick={() => setOpen(i)} />)}
        </div>
      )}
      {entry.s.map((s, i) => (
        <section key={i}>
          {s.h && <h3>{s.h}{s.sh && <small> {s.sh}</small>}</h3>}
          {s.l.map((l, j) => (
            <div key={j} className="lemma">
              <b>{l.lem}</b> {l.tr && <i>{l.tr}</i>} <span className="muted">{l.gl}</span>
              {l.r.length > 0 && <div><RefLinks verses={l.r} max={16} /></div>}
            </div>
          ))}
          {s.p.map((p, j) => <p key={j} dangerouslySetInnerHTML={{ __html: p }} />)}
        </section>
      ))}
      {open !== null && <Lightbox images={pics} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />}
    </article>
  );
}
