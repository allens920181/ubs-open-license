import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useImages, useNature, useRoutes } from "../lib/data";
import { imageTitle, imageUrl } from "../lib/images";
import { parseRef } from "../lib/refs";
import {
  currentSermon, deleteSermon, exportJson, importJson, moveItem, newSermon, removeItem, renameSermon, selectSermon,
  setNote, useSermons, type SermonItem,
} from "../lib/store";
import type { NatureKind } from "../lib/types";
import NatureDetail from "../components/NatureDetail";
import RouteMap from "../components/LazyRouteMap";
import { passagePath } from "../components/RefLinks";

export default function Sermon() {
  const state = useSermons();
  const sermon = currentSermon(state);
  const images = useImages();
  const [present, setPresent] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const byId = useMemo(() => new Map((images.data ?? []).map((i) => [i.id, i])), [images.data]);

  const download = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([exportJson()], { type: "application/json" }));
    a.download = "講道清單.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const upload = async (f?: File) => {
    if (!f) return;
    try { importJson(await f.text()); setMsg("已匯入。"); } catch (e) { setMsg(`匯入失敗:${(e as Error).message}`); }
  };

  return (
    <div className="page sermon">
      <h1>講道清單</h1>
      <div className="row wrap">
        <select className="input" value={sermon.id} onChange={(e) => selectSermon(e.target.value)}>
          {state.sermons.map((s) => <option key={s.id} value={s.id}>{s.title} ({s.items.length})</option>)}
        </select>
        <input className="input grow" value={sermon.title} onChange={(e) => renameSermon(e.target.value)} aria-label="講道名稱" />
        <button className="btn" onClick={() => newSermon()}>新增</button>
        <button className="btn" onClick={() => confirm(`刪除「${sermon.title}」?`) && deleteSermon(sermon.id)}>刪除</button>
        <button className="btn primary" disabled={!sermon.items.length} onClick={() => setPresent(0)}>▶ 上台展示</button>
      </div>
      <p className="muted small">
        清單存在這個瀏覽器裡,換電腦或清除資料會消失,記得{" "}
        <button className="linklike" onClick={download}>匯出備份</button>{" / "}
        <button className="linklike" onClick={() => file.current?.click()}>匯入</button>。
        {msg && <b> {msg}</b>}
      </p>
      <input ref={file} type="file" accept="application/json" hidden onChange={(e) => upload(e.target.files?.[0])} />

      {!sermon.items.length && <p className="muted pad">還沒有項目。在圖片、路線、動植物與器物旁按 ☆ 就會加進來。</p>}
      <ol className="items">
        {sermon.items.map((it, i) => (
          <li key={it.uid} className="card">
            <div className="item-head">
              <Thumb item={it} image={it.type === "image" ? byId.get(it.ref) : undefined} />
              <div className="grow">
                <div><span className="badge">{TYPE_LABEL[it.type]}</span> <b>{it.title}</b></div>
                <ItemLink item={it} />
              </div>
              <div className="item-actions">
                <button className="btn small" disabled={i === 0} onClick={() => moveItem(it.uid, -1)} aria-label="上移">↑</button>
                <button className="btn small" disabled={i === sermon.items.length - 1} onClick={() => moveItem(it.uid, 1)} aria-label="下移">↓</button>
                <button className="btn small" onClick={() => setPresent(i)}>展示</button>
                <button className="btn small" onClick={() => removeItem(it.uid)}>移除</button>
              </div>
            </div>
            <textarea className="input note" rows={2} placeholder="這一項要講的重點(只有你看得到)" value={it.note} onChange={(e) => setNote(it.uid, e.target.value)} />
          </li>
        ))}
      </ol>
      {present !== null && <Present items={sermon.items} start={present} onClose={() => setPresent(null)} />}
    </div>
  );
}

const TYPE_LABEL = { image: "圖片", route: "路線", nature: "動植物器物", passage: "經文" } as const;

function Thumb({ item, image }: { item: SermonItem; image?: { col: string; file: string } }) {
  if (item.type === "image" && image) return <img className="thumb" src={imageUrl(image, 200)} alt="" />;
  return <div className="thumb ph">{TYPE_LABEL[item.type][0]}</div>;
}

function ItemLink({ item }: { item: SermonItem }) {
  if (item.type === "route") return <Link className="small" to={`/map?r=${encodeURIComponent(item.ref)}`}>在地圖中開啟</Link>;
  if (item.type === "nature") { const [k, key] = item.ref.split(":"); return <Link className="small" to={`/nature/${k}/${encodeURIComponent(key)}`}>開啟條目</Link>; }
  if (item.type === "passage") { const s = parseRef(item.ref); return s ? <Link className="small" to={passagePath(s)}>開啟經文</Link> : null; }
  return null;
}

/** Full-screen presentation of the list, one item at a time; arrow keys and Esc work. */
function Present({ items, start, onClose }: { items: SermonItem[]; start: number; onClose: () => void }) {
  const [i, setI] = useState(start);
  const it = items[i];
  const images = useImages();
  const routes = useRoutes();
  const kind = it?.type === "nature" ? (it.ref.split(":")[0] as NatureKind) : null;
  const nature = useNature(kind);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" || e.key === " ") setI((n) => Math.min(items.length - 1, n + 1));
      else if (e.key === "ArrowLeft") setI((n) => Math.max(0, n - 1));
    };
    window.addEventListener("keydown", key);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", key); document.body.style.overflow = prev; };
  }, [items.length, onClose]);
  const image = it?.type === "image" ? images.data?.find((x) => x.id === it.ref) : undefined;
  const route = it?.type === "route" ? routes.data?.find((x) => x.id === it.ref) : undefined;
  const groups = useMemo(() => [...new Set((routes.data ?? []).map((r) => r.group))], [routes.data]);
  const entry = it && kind ? nature.data?.find((e) => e.k === it.ref.split(":")[1]) : undefined;
  const picked = useMemo(() => (route ? [route] : []), [route]);
  if (!it) return null;

  return (
    <div className="present">
      <div className="present-bar">
        <span>{i + 1} / {items.length} · {it.title}</span>
        <span className="grow" />
        <button className="btn small" disabled={i === 0} onClick={() => setI(i - 1)}>‹ 上一項</button>
        <button className="btn small" disabled={i === items.length - 1} onClick={() => setI(i + 1)}>下一項 ›</button>
        <button className="btn small" onClick={onClose}>結束 (Esc)</button>
      </div>
      <div className="present-body">
        {image && <img key={image.id} src={imageUrl(image, 1600)} alt={imageTitle(image)} />}
        {route && <RouteMap routes={picked} groups={groups} focusId={route.id} />}
        {entry && kind && <div className="present-scroll"><NatureDetail kind={kind} entry={entry} images={images.data} /></div>}
        {it.type === "passage" && <div className="present-text">{it.title}</div>}
        {!image && !route && !entry && it.type !== "passage" && <p className="muted">載入中…</p>}
      </div>
      {it.note && <div className="present-note">{it.note}</div>}
      {image && <div className="present-credit">{imageTitle(image)} · {image.cp}</div>}
    </div>
  );
}

