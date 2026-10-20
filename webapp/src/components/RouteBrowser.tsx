import { useEffect, useMemo, useState } from "react";
import type { Route } from "../lib/types";
import { formatSpans } from "../lib/refs";
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
}

/** Route list (grouped, searchable) beside the 3D map. Ticking a route draws it. */
export default function RouteBrowser({ routes, groups, initial = [], search }: Props) {
  const [picked, setPicked] = useState<string[]>(initial);
  const [q, setQ] = useState("");
  useEffect(() => setPicked(initial), [initial.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps

  const visible = useMemo(() => {
    const f = q.trim().toLowerCase();
    return routes.filter((r) => !f || `${r.num} ${r.zh} ${r.name} ${formatSpans(r.refs)}`.toLowerCase().includes(f));
  }, [routes, q]);
  const shown = useMemo(() => routes.filter((r) => picked.includes(r.id)), [routes, picked]);
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const focus = picked[picked.length - 1] ?? null;
  const gs = groups.filter((g) => visible.some((r) => r.group === g));

  return (
    <div className="route-browser">
      <aside>
        {search && <input className="input" type="search" placeholder="搜尋路線名稱或經文" value={q} onChange={(e) => setQ(e.target.value)} />}
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
      </aside>
      <RouteMap routes={shown} groups={groups} focusId={focus} />
    </div>
  );
}
