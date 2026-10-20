import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { usePeople } from "../lib/data";
import type { Person } from "../lib/types";
import { ERAS, personThumb } from "../lib/people";
import { formatSpans } from "../lib/refs";
import PersonGallery, { picsOf } from "../components/PersonGallery";
import PinButton from "../components/PinButton";
import { RefLinks } from "../components/RefLinks";

export default function People() {
  const { id } = useParams();
  const { data, error } = usePeople();
  if (error) return <p className="err pad">人物資料載入失敗:{error}。請先執行 npm run data。</p>;
  if (!data) return <p className="muted pad">載入中…</p>;
  const person = id ? data.find((p) => p.id === id) : undefined;
  return person ? <PersonPage person={person} /> : <PeopleList />;
}

function PeopleList() {
  const { data = [] } = usePeople();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [era, setEra] = useState("");
  const [only, setOnly] = useState(false);
  const f = q.trim().toLowerCase();
  const list = useMemo(
    () => data.filter((p) => (!era || p.era === era) && (!only || p.art.length + p.chibi.length + p.own.length > 0) &&
      (!f || `${p.zh} ${p.en} ${formatSpans(p.refs)}`.toLowerCase().includes(f))),
    [data, f, era, only],
  );
  return (
    <div className="page">
      <h1>人物</h1>
      <p className="muted">聖經人物的名畫與雕像(公有領域,來自 Wikimedia Commons),也可以放進自己的照片和 Q 版人物圖。</p>
      <div className="filters">
        <input className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜尋人物或經文(如:大衛、路 15)" />
        <select className="input" value={era} onChange={(e) => setEra(e.target.value)}>
          <option value="">全部時代</option>
          {ERAS.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        <label><input type="checkbox" checked={only} onChange={(e) => setOnly(e.target.checked)} /> 只看有圖片的</label>
      </div>
      <p className="muted small">{list.length} / {data.length} 位</p>
      <div className="grid people-grid">
        {list.map((p) => {
          const t = personThumb(p);
          return (
            <div key={p.id} className="card img-card" onClick={() => nav(`/people/${p.id}`)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && nav(`/people/${p.id}`)}>
              {t ? <img loading="lazy" src={t} alt={p.zh} /> : <div className="ph-art">{p.zh[0]}</div>}
              <div className="img-title"><b>{p.zh}</b><div className="muted small">{p.en}</div></div>
              <PinButton type="person" refId={p.id} title={p.zh} compact />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PersonPage({ person }: { person: Person }) {
  const pics = picsOf(person);
  const [tab, setTab] = useState<"art" | "chibi" | "own">(pics.art.length ? "art" : pics.chibi.length ? "chibi" : "art");
  const TABS = [["art", "名畫與雕像", pics.art.length], ["chibi", "Q 版人物", pics.chibi.length], ["own", "我的照片", pics.own.length]] as const;
  return (
    <div className="page">
      <p className="small"><Link to="/people">‹ 全部人物</Link></p>
      <header className="passage-head">
        <div>
          <h1>{person.zh} <small>{person.en}</small></h1>
          <p className="muted small">{person.era}</p>
          {person.refs.length > 0 && <p className="small"><b>經文:</b> <RefLinks spans={person.refs} max={12} /></p>}
        </div>
        <PinButton type="person" refId={person.id} title={person.zh} />
      </header>
      <nav className="tabs">
        {TABS.map(([k, label, n]) => (
          <button key={k} className={`tab ${tab === k ? "on" : ""} ${n === 0 ? "empty" : ""}`} onClick={() => setTab(k)}>{label} <span className="count">{n}</span></button>
        ))}
      </nav>
      {pics[tab].length > 0 ? <PersonGallery person={person} pics={pics[tab]} /> : (
        <div className="card pad">
          {tab === "art" && <p className="muted">在 Wikimedia Commons 沒有找到合適的公有領域名畫。</p>}
          {tab === "chibi" && <p className="muted">還沒有 Q 版人物圖。把圖片放進 <code>webapp/public/people/chibi/</code>,檔名用 <code>{person.id}.png</code>(多張用 <code>{person.id}-2.png</code>),再執行 <code>npm run data</code> 就會出現在這裡。</p>}
          {tab === "own" && <p className="muted">還沒有自己的照片。把圖片放進 <code>webapp/public/people/own/</code>,檔名用 <code>{person.id}.jpg</code>(多張用 <code>{person.id}-2.jpg</code>),再執行 <code>npm run data</code>。</p>}
        </div>
      )}
    </div>
  );
}
