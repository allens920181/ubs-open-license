import { useMemo, useState } from "react";
import { useImages } from "../lib/data";
import { COLLECTIONS, imageDesc, SUBJECTS, subjectLabel } from "../lib/images";
import { anyVerse, parseRef } from "../lib/refs";
import ImageGrid from "../components/ImageGrid";

export default function ImagesPage() {
  const { data, error } = useImages();
  const [q, setQ] = useState("");
  const [subj, setSubj] = useState("");
  const [col, setCol] = useState("");
  const [onlyRef, setOnlyRef] = useState(false);

  const list = useMemo(() => {
    if (!data) return [];
    const ref = parseRef(q), f = q.trim().toLowerCase();
    return data.filter((i) =>
      (!col || i.col === col) &&
      (!subj || i.subj.split(";").some((x) => x.trim() === subj)) &&
      (!onlyRef || i.refs.length > 0) &&
      (!f || (ref ? anyVerse(i.refs, ref) : `${i.zh} ${i.en} ${imageDesc(i)} ${i.den} ${i.tags}`.toLowerCase().includes(f))));
  }, [data, q, subj, col, onlyRef]);

  if (error) return <p className="err pad">圖片資料載入失敗:{error}。請先執行 npm run data。</p>;
  return (
    <div className="page">
      <h1>圖片庫</h1>
      <div className="filters">
        <input className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜尋名稱、說明,或輸入經文(如:太 2)" />
        <select className="input" value={subj} onChange={(e) => setSubj(e.target.value)}>
          <option value="">全部主題</option>
          {Object.keys(SUBJECTS).map((s) => <option key={s} value={s}>{subjectLabel(s)}</option>)}
        </select>
        <select className="input" value={col} onChange={(e) => setCol(e.target.value)}>
          <option value="">全部來源</option>
          {Object.entries(COLLECTIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <label><input type="checkbox" checked={onlyRef} onChange={(e) => setOnlyRef(e.target.checked)} /> 只看有經文對應</label>
      </div>
      {!data ? <p className="muted pad">載入中…</p> : (
        <>
          <p className="muted small">{list.length} / {data.length} 張</p>
          <ImageGrid images={list} />
        </>
      )}
    </div>
  );
}
