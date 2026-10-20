import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { parseRef } from "../lib/refs";
import { passagePath } from "../components/RefLinks";

const QUICK = ["創 12", "創 22", "出 14", "書 6", "撒上 17", "王上 18", "詩 23", "太 2", "路 10", "約 4", "徒 13", "徒 27"];
const RECENT_KEY = "sermon-app:recent";
export function recent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; }
}
export function remember(text: string) {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify([text, ...recent().filter((x) => x !== text)].slice(0, 8))); } catch { /* ignore */ }
}

export default function Home() {
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const nav = useNavigate();
  const go = (t: string) => {
    const s = parseRef(t);
    if (!s) { setErr("看不懂這個經文。試試「徒 13」「創 22:1-19」「Acts 13:5」。"); return; }
    nav(passagePath(s));
  };
  const submit = (e: FormEvent) => { e.preventDefault(); go(text); };
  const rec = recent();
  return (
    <div className="home">
      <h1>聖經地理與圖片</h1>
      <p className="lead">輸入一段經文,看這段經文的地圖路線、照片、動植物與器物、平行經文和經文校勘。</p>
      <form onSubmit={submit} className="search">
        <input className="input big" autoFocus value={text} onChange={(e) => { setText(e.target.value); setErr(""); }} placeholder="例如:徒 13、創世記 22:1-19、Acts 27" />
        <button className="btn primary big">查詢</button>
      </form>
      {err && <p className="err">{err}</p>}
      <h3>常用經文</h3>
      <div className="chips">{QUICK.map((q) => <button key={q} className="chip" onClick={() => go(q)}>{q}</button>)}</div>
      {rec.length > 0 && (<><h3>最近查過</h3><div className="chips">{rec.map((q) => <button key={q} className="chip" onClick={() => go(q)}>{q}</button>)}</div></>)}
      <h3>直接瀏覽</h3>
      <div className="tiles">
        <Link to="/map" className="tile"><b>路線地圖</b><span>179 條聖經人物行程與 1,200 多個地名,3D 衛星地形</span></Link>
        <Link to="/images" className="tile"><b>圖片庫</b><span>1,500 多張聖經世界的照片與插圖</span></Link>
        <Link to="/nature" className="tile"><b>動植物與器物</b><span>三本手冊,共 700 多個條目</span></Link>
        <Link to="/sermon" className="tile"><b>講道清單</b><span>收集要用的圖片與路線,上台時全螢幕展示</span></Link>
      </div>
    </div>
  );
}
