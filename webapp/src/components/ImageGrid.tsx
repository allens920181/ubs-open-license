import { useState } from "react";
import type { BibleImage } from "../lib/types";
import { imageTitle, imageUrl } from "../lib/images";
import Lightbox from "./Lightbox";
import PinButton from "./PinButton";

/** Thumbnails that open a lightbox; the pin button sits on each card. */
export default function ImageGrid({ images, limit = 120 }: { images: BibleImage[]; limit?: number }) {
  const [open, setOpen] = useState<number | null>(null);
  const [shown, setShown] = useState(limit);
  const list = images.slice(0, shown);
  return (
    <>
      <div className="grid">
        {list.map((img, i) => (
          <div className="card img-card" key={img.id} onClick={() => setOpen(i)} tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && setOpen(i)}>
            <img loading="lazy" src={imageUrl(img, 400)} alt={imageTitle(img)} />
            <div className="img-title">{imageTitle(img)}</div>
            <PinButton type="image" refId={img.id} title={imageTitle(img)} compact />
          </div>
        ))}
      </div>
      {images.length > shown && (
        <p className="center"><button className="btn" onClick={() => setShown(shown + limit)}>再顯示 {Math.min(limit, images.length - shown)} 張(共 {images.length})</button></p>
      )}
      {open !== null && <Lightbox images={list} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />}
    </>
  );
}
