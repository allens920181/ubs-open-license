import { useEffect } from "react";
import type { BibleImage } from "../lib/types";
import { COLLECTIONS, imageDesc, imageTitle, imageUrl, subjectLabel } from "../lib/images";
import PinButton from "./PinButton";
import { RefLinks } from "./RefLinks";

interface Props { images: BibleImage[]; index: number; onIndex: (i: number) => void; onClose: () => void }

/** Full-size image viewer with arrow-key navigation. */
export default function Lightbox({ images, index, onIndex, onClose }: Props) {
  const img = images[index];
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") onIndex(Math.min(images.length - 1, index + 1));
      else if (e.key === "ArrowLeft") onIndex(Math.max(0, index - 1));
    };
    window.addEventListener("keydown", key);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", key); document.body.style.overflow = prev; };
  }, [index, images.length, onIndex, onClose]);
  if (!img) return null;
  const desc = imageDesc(img);
  return (
    <div className="lightbox" role="dialog" aria-modal="true" onClick={onClose}>
      <button className="lb-close" onClick={onClose} aria-label="關閉">✕</button>
      {index > 0 && <button className="lb-nav prev" onClick={(e) => { e.stopPropagation(); onIndex(index - 1); }} aria-label="上一張">‹</button>}
      {index < images.length - 1 && <button className="lb-nav next" onClick={(e) => { e.stopPropagation(); onIndex(index + 1); }} aria-label="下一張">›</button>}
      <figure onClick={(e) => e.stopPropagation()}>
        <img key={img.id} src={imageUrl(img, 1600)} alt={imageTitle(img)} />
        <figcaption>
          <div className="lb-head">
            <h2>{imageTitle(img)}{img.en && img.zh && <small> {img.en}</small>}</h2>
            <PinButton type="image" refId={img.id} title={imageTitle(img)} />
          </div>
          {desc && <p>{desc}</p>}
          <p className="muted small">
            {subjectLabel(img.subj) && <>{subjectLabel(img.subj)} · </>}{COLLECTIONS[img.col] ?? img.col} · {img.cp}
            {" · "}<a href={imageUrl(img)} target="_blank" rel="noopener noreferrer">原圖</a>
            {" · "}{index + 1} / {images.length}
          </p>
          {img.refs.length > 0 && <p className="small"><b>經文:</b> <RefLinks verses={img.refs} max={12} /></p>}
        </figcaption>
      </figure>
    </div>
  );
}
