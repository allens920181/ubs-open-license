import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useImages, useNature } from "../lib/data";
import type { NatureKind } from "../lib/types";
import NatureDetail, { KIND_LABEL } from "../components/NatureDetail";

const KINDS: NatureKind[] = ["flora", "fauna", "realia"];

export default function NaturePage() {
  const { kind: kp, key } = useParams();
  const kind: NatureKind = KINDS.includes(kp as NatureKind) ? (kp as NatureKind) : "flora";
  const nav = useNavigate();
  const { data, error } = useNature(kind);
  const images = useImages();
  const [q, setQ] = useState("");
  const f = q.trim().toLowerCase();
  const list = useMemo(() => (data ?? []).filter((e) => !f || `${e.k} ${e.t} ${e.e} ${e.s.flatMap((s) => s.l.map((l) => `${l.lem} ${l.tr} ${l.gl}`)).join(" ")}`.toLowerCase().includes(f)), [data, f]);
  const entry = data?.find((e) => e.k === key);
  return (
    <div className="page nature-page">
      <aside>
        <h1>動植物與器物</h1>
        <div className="tabs">{KINDS.map((k) => <button key={k} className={`tab ${k === kind ? "on" : ""}`} onClick={() => nav(`/nature/${k}`)}>{KIND_LABEL[k]}</button>)}</div>
        <input className="input" type="search" placeholder="搜尋名稱或原文" value={q} onChange={(e) => setQ(e.target.value)} />
        {error && <p className="err">{error}</p>}
        <div className="tree">
          {list.map((e) => (
            <div key={e.k} className={`tree-item ${e.k === key ? "on" : ""} ${e.s.length ? "" : "cat"}`} style={{ paddingLeft: 8 + (e.k.split(".").length - 1) * 14 }}
              onClick={() => nav(`/nature/${kind}/${encodeURIComponent(e.k)}`)}>
              <span className="muted small">{e.k}</span> {e.t}{e.e && <small className="muted"> {e.e}</small>}
            </div>
          ))}
        </div>
      </aside>
      <main>
        {!data ? <p className="muted pad">載入中…</p> : entry ? <NatureDetail kind={kind} entry={entry} images={images.data} /> : <p className="muted pad">從左邊選一個條目。</p>}
      </main>
    </div>
  );
}
