import { lazy, Suspense, type ComponentProps } from "react";

// MapLibre is most of the bundle, so the map is only downloaded when a page actually shows one.
const RouteMap = lazy(() => import("./RouteMap"));

export default function LazyRouteMap(props: ComponentProps<typeof RouteMap>) {
  return <Suspense fallback={<div className="routemap"><p className="muted pad">載入地圖…</p></div>}><RouteMap {...props} /></Suspense>;
}
