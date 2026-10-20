import { useEffect, useMemo, useState } from "react";
import type { Place, Route } from "../lib/types";
import { formatSpans } from "../lib/refs";
import { placeName } from "../lib/images";
import PinButton from "./PinButton";
import RouteMap from "./LazyRouteMap";
import { RefLinks } from "./RefLinks";

interface Props {
  /** Routes offered in the list. */
  routes: Route[];
  /** All group names, so colours stay the same everywhere. */
  groups: string[];
  initial?: string[];
  search?: boolean;
  /** Places offered in the second tab (and marked on the map). */
  places?: Place[];
  /** Every place; the playback uses it to say what it is passing. */
  allPlaces?: Place[];
  initialPlace?: string | null;
}

/** Route and place lists beside the 3D map. Ticking a route draws it; clicking a place flies there. */
export default function RouteBrowser({ routes, groups, initial = [], search, places = [], allPlaces, initialPlace = null }: Props) {
  const [picked, setPicked] = useState<string[]>(initial);
  const [tab, setTab] = useState<"routes" | "places">(initialPlace || !routes.length ? "places" : "routes");
  const [q, setQ] = useState("");
  const [focusPlace, setFocusPlace] = useState<string | null>(initialPlace);
  useEffect(() => setPicked(initial), [initial.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps

  const f = q.trim().toLowerCase();
  const visible = useMemo(
    () => routes.filter((r) => !f || `${r.num} ${r.zh} ${r.name} ${formatSpans(r.refs)}`.toLowerCase().includes(f)),
    [routes, f],
  );
  const visiblePlaces = useMemo(() => {
    const hits = places.filter((p) => !f || `${p.zh} ${p.n} ${(p.heb ?? []).map((h) => h[0]).join(" ")}`.toLowerCase().includes(f));
    return hits.sort((a, b) => b.refs.length - a.refs.length).slice(0, 300);
  }, [places, f]);
  const shown = useMemo(() => routes.filter((r) => picked.includes(r.id)), [routes, picked]);
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const focus = picked[picked.length - 1] ?? null;
  const gs = groups.filter((g) => visible.some((r) => r.group === g));
  const hasPlaces = places.length > 0;

  return (
    <div className="route-browser">
      <aside>
        {hasPlaces && routes.length > 0 && (
          <div className="tabs mini">
            <button className={`tab ${tab === "routes" ? "on" : ""}`} onClick={() => setTab("routes")}>路線 <span className="count">{routes.length}</span></button>
            <button className={`tab ${tab === "places" ? "on" : ""}`} onClick={() => setTab("places")}>地名 <span className="count">{places.length}</span></button>
          </div>
        )}
        {(search || places.length > 40) && (
          <input className="input" type="search" placeholder={tab === "places" ? "搜尋地名(中文、英文或希伯來文)" : "搜尋路線名稱或經文"} value={q} onChange={(e) => setQ(e.target.value)} />
        )}
        {tab === "routes" ? (
          <>
            <div className="row">
              <button className="btn small" onClick={() => setPicked(visible.map((r) => r.id))}>全選</button>
              <button className="btn small" onClick={() => setPicked([])}>清除</button>
              <span className="muted small">{visible.length} 條</span>
            </div>
            <div className="route-list">
              {gs.map((g) => (
                <div key={g}>
                  <h4>{g}</h4>
                  {visible.filter((r) => r.group === g).map((r) => (
                    <div key={r.id} className={`route-item ${picked.includes(r.id) ? "on" : ""}`} onClick={() => toggle(r.id)}>
                      <input type="checkbox" readOnly checked={picked.includes(r.id)} />
                      <div className="grow">
                        <div><span className="num">{r.num}</span> {r.zh || r.name}</div>
                        <div className="small muted">{r.name}</div>
                        {r.refs.length > 0 && <div className="small"><RefLinks spans={r.refs} max={4} /></div>}
                      </div>
                      <PinButton type="route" refId={r.id} title={r.zh || r.name} compact />
                    </div>
                  ))}
                </div>
              ))}
              {!visible.length && <p className="muted pad">沒有符合的路線。</p>}
            </div>
          </>
        ) : (
          <>
            <div className="row"><span className="muted small">{visiblePlaces.length}{places.length > visiblePlaces.length ? ` / ${places.length}` : ""} 個地名{places.some((p) => !("lat" in p)) ? "(部分位置不明)" : ""}</span></div>
            <div className="route-list">
              {visiblePlaces.map((p) => (
                <div key={p.id} className={`route-item ${focusPlace === p.id ? "on" : ""}`} onClick={() => { setFocusPlace(null); setTimeout(() => setFocusPlace(p.id), 0); }}>
                  <div className="grow">
                    <div>{placeName(p)} {p.zh && <span className="muted small">{p.n}</span>}</div>
                    <div className="small muted">
                      {p.heb?.[0] && <span className="heb" dir="rtl">{p.heb[0][0]}</span>}
                      {p.lat === undefined ? "位置不明" : p.ap ? "位置為推測" : ""} · {p.refs.length} 節
                    </div>
                  </div>
                  <PinButton type="place" refId={p.id} title={placeName(p)} compact />
                </div>
              ))}
              {!visiblePlaces.length && <p className="muted pad">沒有符合的地名。</p>}
            </div>
          </>
        )}
      </aside>
      <RouteMap routes={shown} groups={groups} focusId={focus} places={places} focusPlaceId={focusPlace} nearby={allPlaces ?? places} />
    </div>
  );
}
