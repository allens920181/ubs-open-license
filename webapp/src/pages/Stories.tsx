import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useStories } from "../lib/data";
import { slideUrl } from "../lib/stories";
import { isPinned, togglePin, useSermons } from "../lib/store";
import type { Story } from "../lib/types";
import PinButton from "../components/PinButton";
import { RefLinks } from "../components/RefLinks";

const CREDIT = "故事插圖來自 FreeBibleimages(免費聖經圖片),僅供教學與個人使用,請勿公開或轉發。";

export default function Stories() {
  const { id } = useParams();
  const { data, error, loading } = useStories();
  if (loading) return <p className="muted pad">載入中…</p>;
  if (error || !data) {
    return (
      <div className="page"><h1>故事圖</h1>
        <div className="card pad"><p>還沒有故事圖。在專案裡執行:</p><p><code>python3 webapp/scripts/fetch_stories.py</code></p>
          <p className="muted small">會從 1535000.org 下載圖片到 <code>webapp/public/stories/</code>(不進 git)。{CREDIT}</p></div></div>
    );
  }
  const story = id ? data.find((s) => s.id === id) : undefined;
  return story ? <StoryPage story={story} /> : <StoryList stories={data} />;
}

function StoryList({ stories }: { stories: Story[] }) {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const f = q.trim().toLowerCase();
  const list = stories.filter((s) => !f || `${s.name} ${s.ref} ${s.slides.map((x) => x.caption).join(" ")}`.toLowerCase().includes(f));
  return (
    <div className="page">
      <h1>故事圖</h1>
      <p className="muted">聖經故事的連環插圖,每張有說明文字,可以幻燈片方式展示。{CREDIT}</p>
      <div className="filters"><input className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜尋故事名稱或內容" /></div>
      <div className="grid">
        {list.map((s) => (
          <div key={s.id} className="card img-card" onClick={() => nav(`/stories/${s.id}`)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && nav(`/stories/${s.id}`)}>
            <img loading="lazy" src={slideUrl(s.id, 1)} alt={s.name} />
            <div className="img-title"><b>{s.name}</b><div className="muted small">{s.ref} · {s.slides.length} 張</div></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StoryPage({ story }: { story: Story }) {
  const [open, setOpen] = useState<number | null>(null);
  const sermons = useSermons();
  const missing = story.slides.filter((s) => !isPinned(sermons, "slide", `${story.id}:${s.n}`));
  const addAll = () => missing.forEach((s) => togglePin("slide", `${story.id}:${s.n}`, `${story.name} ${s.n}`));
  useEffect(() => {
    if (open === null) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      else if (e.key === "ArrowRight" || e.key === " ") setOpen((i) => Math.min(story.slides.length - 1, (i ?? 0) + 1));
      else if (e.key === "ArrowLeft") setOpen((i) => Math.max(0, (i ?? 0) - 1));
    };
    window.addEventListener("keydown", key);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", key); document.body.style.overflow = prev; };
  }, [open, story.slides.length]);
  const cur = open === null ? null : story.slides[open];
  return (
    <div className="page">
      <p className="small"><Link to="/stories">‹ 全部故事</Link></p>
      <header className="passage-head">
        <div>
          <h1>{story.name}</h1>
          <p className="small">{story.ref}{story.refs.length > 0 && <> · <RefLinks spans={story.refs} /></>}</p>
        </div>
        <div className="row wrap">
          <button className="btn primary" onClick={() => setOpen(0)}>▶ 幻燈片</button>
          <button className="btn" disabled={!missing.length} onClick={addAll}>{missing.length ? `全部加入講道清單 (${missing.length})` : "已全部加入講道清單"}</button>
        </div>
      </header>
      <div className="grid">
        {story.slides.map((s, i) => (
          <div className="card img-card" key={s.n} onClick={() => setOpen(i)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setOpen(i)}>
            <img loading="lazy" src={slideUrl(story.id, s.n)} alt={s.caption} />
            <div className="img-title small">{s.n}. {s.caption.slice(0, 40)}{s.caption.length > 40 ? "…" : ""}</div>
            <PinButton type="slide" refId={`${story.id}:${s.n}`} title={`${story.name} ${s.n}`} compact />
          </div>
        ))}
      </div>
      <p className="muted small">{CREDIT}</p>
      {cur && open !== null && (
        <div className="lightbox" role="dialog" aria-modal="true" onClick={() => setOpen(null)}>
          <button className="lb-close" onClick={() => setOpen(null)} aria-label="關閉">✕</button>
          {open > 0 && <button className="lb-nav prev" onClick={(e) => { e.stopPropagation(); setOpen(open - 1); }} aria-label="上一張">‹</button>}
          {open < story.slides.length - 1 && <button className="lb-nav next" onClick={(e) => { e.stopPropagation(); setOpen(open + 1); }} aria-label="下一張">›</button>}
          <figure onClick={(e) => e.stopPropagation()}>
            <img key={cur.n} src={slideUrl(story.id, cur.n)} alt={cur.caption} />
            <figcaption>
              <div className="lb-head"><p className="slide-caption">{cur.caption}</p><PinButton type="slide" refId={`${story.id}:${cur.n}`} title={`${story.name} ${cur.n}`} /></div>
              <p className="muted small">{story.name} · {cur.n} / {story.slides.length}</p>
            </figcaption>
          </figure>
        </div>
      )}
    </div>
  );
}

