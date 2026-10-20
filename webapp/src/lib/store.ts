import { useSyncExternalStore } from "react";

export type ItemType = "image" | "route" | "nature" | "passage" | "place" | "person" | "artwork" | "slide";
export interface SermonItem {
  uid: string;
  type: ItemType;
  /** image id, route id, place id, person id, "personId|file" (artwork), "storyId:slideNumber" (slide), "flora:2.8", or a passage param. */
  ref: string;
  title: string;
  note: string;
}
export interface Sermon { id: string; title: string; items: SermonItem[] }
interface State { sermons: Sermon[]; current: string }

const KEY = "sermon-app:v1";
const uid = () => Math.random().toString(36).slice(2, 10);

function load(): State {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "null");
    if (s && Array.isArray(s.sermons) && s.sermons.length) return s;
  } catch { /* private mode or corrupt data: start empty */ }
  const id = uid();
  return { sermons: [{ id, title: "未命名講道", items: [] }], current: id };
}

let state = load();
const listeners = new Set<() => void>();
function commit(next: State) {
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
export const useSermons = () => useSyncExternalStore(subscribe, () => state);

export const currentSermon = (s: State) => s.sermons.find((x) => x.id === s.current) ?? s.sermons[0];
const update = (fn: (s: Sermon) => Sermon) =>
  commit({ ...state, sermons: state.sermons.map((s) => (s.id === currentSermon(state).id ? fn(s) : s)) });

export const isPinned = (s: State, type: ItemType, ref: string) =>
  currentSermon(s).items.some((i) => i.type === type && i.ref === ref);

export function togglePin(type: ItemType, ref: string, title: string) {
  update((s) => {
    const has = s.items.some((i) => i.type === type && i.ref === ref);
    return { ...s, items: has ? s.items.filter((i) => !(i.type === type && i.ref === ref))
      : [...s.items, { uid: uid(), type, ref, title, note: "" }] };
  });
}
export const removeItem = (id: string) => update((s) => ({ ...s, items: s.items.filter((i) => i.uid !== id) }));
export const setNote = (id: string, note: string) =>
  update((s) => ({ ...s, items: s.items.map((i) => (i.uid === id ? { ...i, note } : i)) }));
export function moveItem(id: string, delta: number) {
  update((s) => {
    const items = [...s.items], i = items.findIndex((x) => x.uid === id), j = i + delta;
    if (i < 0 || j < 0 || j >= items.length) return s;
    [items[i], items[j]] = [items[j], items[i]];
    return { ...s, items };
  });
}
export const renameSermon = (title: string) => update((s) => ({ ...s, title }));
export function newSermon(title = "未命名講道") {
  const id = uid();
  commit({ sermons: [...state.sermons, { id, title, items: [] }], current: id });
}
export const selectSermon = (id: string) => commit({ ...state, current: id });
export function deleteSermon(id: string) {
  const rest = state.sermons.filter((s) => s.id !== id);
  if (!rest.length) { const n = uid(); commit({ sermons: [{ id: n, title: "未命名講道", items: [] }], current: n }); return; }
  commit({ sermons: rest, current: state.current === id ? rest[0].id : state.current });
}
export const exportJson = () => JSON.stringify(state, null, 2);
export function importJson(text: string) {
  const s = JSON.parse(text);
  if (!s || !Array.isArray(s.sermons)) throw new Error("格式不正確");
  commit({ sermons: s.sermons, current: s.current ?? s.sermons[0]?.id });
}
