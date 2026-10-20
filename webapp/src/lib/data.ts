import { useEffect, useState } from "react";
import type { BibleImage, HottpEntry, NatureEntry, NatureKind, Place, Route, Span } from "./types";

const cache = new Map<string, Promise<unknown>>();

/** Fetch a generated JSON file once; later calls share the same promise. */
export function loadData<T>(name: string): Promise<T> {
  let p = cache.get(name);
  if (!p) {
    p = fetch(`${import.meta.env.BASE_URL}data/${name}`).then((r) => {
      if (!r.ok) throw new Error(`${name}: ${r.status}`);
      return r.json();
    });
    p.catch(() => cache.delete(name));
    cache.set(name, p);
  }
  return p as Promise<T>;
}

export interface Loaded<T> { data: T | undefined; error: string; loading: boolean }

/** useData(null) skips loading (for tabs that have not been opened yet). */
export function useData<T>(name: string | null): Loaded<T> {
  const [state, setState] = useState<Loaded<T>>({ data: undefined, error: "", loading: !!name });
  useEffect(() => {
    if (!name) { setState({ data: undefined, error: "", loading: false }); return; }
    let live = true;
    setState((s) => ({ ...s, loading: true, error: "" }));
    loadData<T>(name).then(
      (data) => live && setState({ data, error: "", loading: false }),
      (e) => live && setState({ data: undefined, error: String(e), loading: false }),
    );
    return () => { live = false; };
  }, [name]);
  return state;
}

export const useRoutes = () => useData<Route[]>("routes.json");
export const usePlaces = () => useData<Place[]>("places.json");
export const useImages = () => useData<BibleImage[]>("images.json");
export const useNature = (kind: NatureKind | null) => useData<NatureEntry[]>(kind ? `${kind}.json` : null);
export const useParallels = (on = true) => useData<Span[][]>(on ? "parallels.json" : null);

/** HOTTP is split per book so only the book being studied is downloaded. */
export function useHottp(book: number | null) {
  return useData<HottpEntry[]>(book ? `hottp/${String(book).padStart(2, "0")}.json` : null);
}
