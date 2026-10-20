import { isPinned, togglePin, useSermons, type ItemType } from "../lib/store";

/** Add or remove something from the current sermon list. */
export default function PinButton({ type, refId, title, compact }: { type: ItemType; refId: string; title: string; compact?: boolean }) {
  const s = useSermons();
  const on = isPinned(s, type, refId);
  return (
    <button className={`pin ${on ? "on" : ""} ${compact ? "compact" : ""}`} title={on ? "從講道清單移除" : "加入講道清單"}
      onClick={(e) => { e.stopPropagation(); togglePin(type, refId, title); }}>
      {on ? "★" : "☆"}{compact ? "" : on ? " 已加入講道" : " 加入講道"}
    </button>
  );
}
