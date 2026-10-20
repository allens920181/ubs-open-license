import { Link } from "react-router-dom";
import { formatSpan, spanToParam, versesToSpans } from "../lib/refs";
import type { Span } from "../lib/types";

export const passagePath = (s: Span) => `/passage/${encodeURIComponent(spanToParam(s))}`;

/** A list of verse references, each linking to the passage page. */
export function RefLinks({ spans, verses, max = 40 }: { spans?: Span[]; verses?: number[]; max?: number }) {
  const list = spans ?? versesToSpans(verses ?? []);
  return (
    <span className="reflinks">
      {list.slice(0, max).map((s, i) => (
        <Link key={i} to={passagePath(s)} onClick={(e) => e.stopPropagation()}>{formatSpan(s)}</Link>
      ))}
      {list.length > max && <span className="muted">…共 {list.length} 處</span>}
    </span>
  );
}
