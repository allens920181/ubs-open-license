import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { anySpan, anyVerse, bookByNumber, formatSpan, overlaps, parseRef, spanToParam } from "../lib/refs";
import { useHottp, useImages, useNature, useParallels, usePlaces, useRoutes } from "../lib/data";
import type { NatureEntry, NatureKind } from "../lib/types";
import ImageGrid from "../components/ImageGrid";
import NatureDetail, { KIND_LABEL } from "../components/NatureDetail";
import PinButton from "../components/PinButton";
import RouteBrowser from "../components/RouteBrowser";
import { RefLinks, passagePath } from "../components/RefLinks";
import { imageUrl } from "../lib/images";
import { remember } from "./Home";

const TABS = ["map", "images", "nature", "parallel", "hottp"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = { map: "地圖與地名", images: "圖片", nature: "動植物與器物", parallel: "平行經文", hottp: "經文校勘" };
const RATING: Record<string, string> = { A: "A 幾乎確定", B: "B 有些疑問", C: "C 相當疑問", D: "D 非常疑問" };
const KINDS: NatureKind[] = ["flora", "fauna", "realia"];

export default function Passage() {
  const { code = "" } = useParams();
  const span = useMemo(() => parseRef(decodeURIComponent(code)), [code]);
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const [box, setBox] = useState("");
  const book = span ? Math.floor(span[0] / 1_000_000) : null;

  const routes = useRoutes();
  const places = usePlaces();
  const images = useImages();
  const flora = useNature("flora");
  const fauna = useNature("fauna");
  const realia = useNature("realia");
  const parallels = useParallels();
  const hottp = useHottp(book);

  useEffect(() => { if (span) { document.title = `${formatSpan(span, true)} · 聖經地理與圖片`; remember(formatSpan(span)); setBox(formatSpan(span)); } }, [span]);

  const gs = useMemo(() => [...new Set((routes.data ?? []).map((r) => r.group))], [routes.data]);
  const mRoutes = useMemo(() => span && routes.data ? routes.data.filter((r) => anySpan(r.refs, span)) : [], [span, routes.data]);
  const mPlaces = useMemo(() => span && places.data ? places.data.filter((p) => anyVerse(p.refs, span)) : [], [span, places.data]);
  const mImages = useMemo(() => span && images.data ? images.data.filter((i) => anyVerse(i.refs, span)) : [], [span, images.data]);
  const nature = useMemo(() => {
    const all: { kind: NatureKind; entry: NatureEntry }[] = [];
    if (!span) return all;
    const src: Record<NatureKind, NatureEntry[] | undefined> = { flora: flora.data, fauna: fauna.data, realia: realia.data };
    for (const kind of KINDS) for (const entry of src[kind] ?? []) if (entry.r.length && anyVerse(entry.r, span)) all.push({ kind, entry });
    return all;
  }, [span, flora.data, fauna.data, realia.data]);
  const mParallels = useMemo(() => span && parallels.data ? parallels.data.filter((g) => g.some((s) => overlaps(s, span))) : [], [span, parallels.data]);
  const mHottp = useMemo(() => span && hottp.data ? hottp.data.filter((h) => anyVerse(h.refs, span)) : [], [span, hottp.data]);

  const counts: Record<Tab, number> = { map: mRoutes.length + mPlaces.length, images: mImages.length, nature: nature.length, parallel: mParallels.length, hottp: mHottp.length };
  const loading: Record<Tab, boolean> = { map: routes.loading || places.loading, images: images.loading, nature: flora.loading || fauna.loading || realia.loading, parallel: parallels.loading, hottp: hottp.loading };
  const wanted = params.get("tab") as Tab | null;
  const loadedAll = !Object.values(loading).some(Boolean);
  const tab: Tab = wanted && TABS.includes(wanted) ? wanted : (loadedAll ? TABS.find((t) => counts[t] > 0) ?? "map" : "map");

  if (!span) return <div className="page"><h2>找不到這段經文</h2><p><Link to="/">回首頁</Link></p></div>;

  const chapterNav = (delta: number) => {
    const b = Math.floor(span[0] / 1_000_000), c = Math.floor(span[0] / 1000) % 1000 + delta;
    if (c < 1) return;
    nav(passagePath([b * 1_000_000 + c * 1000, b * 1_000_000 + c * 1000 + 999]));
  };
  const submit = (e: FormEvent) => { e.preventDefault(); const s = parseRef(box); if (s) nav(passagePath(s)); };
  const bk = bookByNumber(book!);
  const gateway = `https://www.biblegateway.com/passage/?search=${encodeURIComponent(bk ? `${bk.en} ${formatSpan(span).replace(/^\S+\s/, "")}` : "")}&version=CUV`;

  return (
    <div className="page passage">
      <header className="passage-head">
        <div>
          <h1>{formatSpan(span, true)}</h1>
          <p className="muted small">
            <button className="linklike" onClick={() => chapterNav(-1)}>‹ 上一章</button>{" · "}
            <button className="linklike" onClick={() => chapterNav(1)}>下一章 ›</button>{" · "}
            <a href={gateway} target="_blank" rel="noopener noreferrer">在 BibleGateway 讀經文(和合本)</a>{" · "}
            <PinButton type="passage" refId={spanToParam(span)} title={formatSpan(span, true)} />
          </p>
        </div>
        <form onSubmit={submit} className="search small">
          <input className="input" value={box} onChange={(e) => setBox(e.target.value)} aria-label="換一段經文" />
          <button className="btn">查詢</button>
        </form>
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t} className={`tab ${tab === t ? "on" : ""} ${counts[t] === 0 && !loading[t] ? "empty" : ""}`}
            onClick={() => setParams({ tab: t }, { replace: true })}>
            {TAB_LABEL[t]} <span className="count">{loading[t] ? "…" : counts[t]}</span>
          </button>
        ))}
      </nav>

      {tab === "map" && (mRoutes.length || mPlaces.length
        ? <RouteBrowser routes={mRoutes} groups={gs} places={mPlaces} allPlaces={places.data}
            initial={mRoutes.length <= 6 ? mRoutes.map((r) => r.id) : [mRoutes[0].id]} />
        : <Empty loading={routes.loading || places.loading} text="這段經文沒有對應的路線或地名。" extra={<Link to="/map">看全部路線</Link>} />)}

      {tab === "images" && (mImages.length ? <ImageGrid images={mImages} /> : <Empty loading={images.loading} text="這段經文沒有對應的圖片。" extra={<Link to="/images">瀏覽圖片庫</Link>} />)}

      {tab === "nature" && (nature.length ? <NatureList items={nature} /> : <Empty loading={flora.loading} text="這段經文沒有對應的動植物或器物條目。" />)}

      {tab === "parallel" && (mParallels.length ? (
        <div className="parallels">
          {mParallels.map((g, i) => (
            <div className="card pad" key={i}>
              {g.map((s, j) => {
                const here = overlaps(s, span);
                return <Link key={j} to={passagePath(s)} className={`par ${here ? "here" : ""}`}>{formatSpan(s, true)}</Link>;
              })}
            </div>
          ))}
        </div>
      ) : <Empty loading={parallels.loading} text="資料庫中沒有這段經文的平行經文。" />)}

      {tab === "hottp" && (mHottp.length ? (
        <div>
          <p className="muted small">希伯來文舊約文本計畫(HOTTP)報告,內容為英文。評級:A 幾乎確定、B 有些疑問、C 相當疑問、D 非常疑問。</p>
          {mHottp.map((h) => (
            <div className="card pad hottp" key={h.id}>
              <div className="small"><RefLinks verses={h.refs} max={6} /></div>
              {h.rm && <p>{h.rm}</p>}
              {h.sg && <p><b>建議:</b> {h.sg}</p>}
              {h.alts.map((a, i) => (
                <div className="alt" key={i}>
                  <span className={`rating r${a.rt || "x"}`} title={RATING[a.rt] ?? "未評級"}>{a.rt || "–"}</span>
                  <span className="heb" dir="rtl">{a.s}</span>
                  {a.lit && <span className="muted"> “{a.lit}”</span>}
                  <div className="small muted">{a.v.map(([t, c]) => `${t}: ${c}`).join(" · ")}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : <Empty loading={hottp.loading} text={book && book > 39 ? "HOTTP 只涵蓋舊約。" : "這段經文沒有 HOTTP 條目。"} />)}
    </div>
  );
}

function Empty({ loading, text, extra }: { loading: boolean; text: string; extra?: React.ReactNode }) {
  return <p className="muted pad">{loading ? "載入中…" : <>{text} {extra}</>}</p>;
}

function NatureList({ items }: { items: { kind: NatureKind; entry: NatureEntry }[] }) {
  const images = useImages();
  const byId = useMemo(() => new Map((images.data ?? []).map((i) => [i.id, i])), [images.data]);
  const [open, setOpen] = useState<string | null>(items.length === 1 ? `${items[0].kind}:${items[0].entry.k}` : null);
  return (
    <div className="nature-list">
      {items.map(({ kind, entry }) => {
        const key = `${kind}:${entry.k}`, thumb = byId.get(entry.i[0]);
        return (
          <div key={key} className="card nature-card">
            <div className="nature-row" onClick={() => setOpen(open === key ? null : key)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setOpen(open === key ? null : key)}>
              {thumb ? <img src={imageUrl(thumb, 200)} alt="" loading="lazy" /> : <div className="ph" />}
              <div className="grow"><b>{entry.t}</b> <span className="badge">{KIND_LABEL[kind]}</span><div className="muted small">{entry.e}</div></div>
              <PinButton type="nature" refId={key} title={entry.t} compact />
              <span>{open === key ? "▲" : "▼"}</span>
            </div>
            {open === key && <NatureDetail kind={kind} entry={entry} images={images.data} />}
          </div>
        );
      })}
    </div>
  );
}

