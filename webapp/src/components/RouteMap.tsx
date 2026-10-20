import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import type { Place, Route } from "../lib/types";
import { placeName } from "../lib/images";
import { formatSpan, spanToParam, versesToSpans } from "../lib/refs";
import {
  BASES, DEFAULT_LABEL_STYLE, LABEL_OVERLAYS, clearLabelPos, getLabelPos, hasLabelPos, labelVars, setLabelPos, useStored,
  type LabelStyle,
} from "../lib/mapStyle";

// MapLibre 6 is plain ESM: the bundler has to tell it where its worker file ended up.
maplibregl.setWorkerUrl(workerUrl);

const PALETTE = ["#ff5a36", "#3da5ff", "#38d27a", "#c47bff", "#ffb82e", "#2fd6e0", "#ff4fa0"];
export const routeColor = (r: Route, groups: string[]) => PALETTE[Math.max(0, groups.indexOf(r.group)) % PALETTE.length];

const DEM = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";
const EMPTY: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

type LngLat = [number, number];
const metres = (a: LngLat, b: LngLat) => {
  const k = Math.PI / 180, x = (b[0] - a[0]) * k * Math.cos(((a[1] + b[1]) * k) / 2), y = (b[1] - a[1]) * k;
  return Math.hypot(x, y) * 6371000;
};
const bearing = (a: LngLat, b: LngLat) => {
  const k = Math.PI / 180, dl = (b[0] - a[0]) * k;
  const y = Math.sin(dl) * Math.cos(b[1] * k);
  const x = Math.cos(a[1] * k) * Math.sin(b[1] * k) - Math.sin(a[1] * k) * Math.cos(b[1] * k) * Math.cos(dl);
  return ((Math.atan2(y, x) / k) + 360) % 360;
};
const lerpAngle = (a: number, b: number, t: number) => a + ((((b - a + 540) % 360) - 180) * t);

function arrowImage(): ImageData {
  const c = document.createElement("canvas");
  c.width = c.height = 24;
  const g = c.getContext("2d")!;
  g.strokeStyle = "#fff"; g.lineWidth = 3.5; g.lineCap = "round"; g.lineJoin = "round";
  g.beginPath(); g.moveTo(7, 5); g.lineTo(17, 12); g.lineTo(7, 19); g.stroke();
  return g.getImageData(0, 0, 24, 24);
}

function el(html: string): HTMLElement {
  const d = document.createElement("div");
  d.innerHTML = html;
  return d.firstElementChild as HTMLElement;
}

interface Props {
  routes: Route[];
  groups: string[];
  /** The route the play button animates. */
  focusId?: string | null;
  /** Places to mark (dots on the map, names when there are few or the map is zoomed in). */
  places?: Place[];
  /** Fly to this place and open its card. */
  focusPlaceId?: string | null;
  /** Every place, used to say what the playback is passing. */
  nearby?: Place[];
}

const hasPos = (p: Place): p is Place & { lat: number; lon: number } => p.lat !== undefined && p.lon !== undefined;

/** The card shown when a place is clicked. Verse links go through the hash router. */
function placeCard(p: Place): HTMLElement {
  const box = document.createElement("div");
  box.className = "place-card";
  const h = document.createElement("b");
  h.textContent = placeName(p);
  box.append(h);
  if (p.zh) { const en = document.createElement("div"); en.className = "small muted"; en.textContent = p.n; box.append(en); }
  if (p.heb?.length) {
    const he = document.createElement("div");
    he.className = "heb"; he.dir = "rtl";
    he.textContent = p.heb.map((x) => x[0]).join("、");
    box.append(he);
  }
  const note = [p.ap ? "位置為推測" : "", p.rg ? "範圍(標在中心)" : "", p.k === "water" ? "水域" : p.k === "river" ? "河流" : p.k === "island" ? "島" : p.c ?? ""].filter(Boolean).join(" · ");
  if (note) { const n = document.createElement("div"); n.className = "small muted"; n.textContent = note; box.append(n); }
  const spans = versesToSpans(p.refs);
  const refs = document.createElement("div");
  refs.className = "small reflinks";
  spans.slice(0, 8).forEach((sp) => {
    const a = document.createElement("a");
    a.href = `#/passage/${encodeURIComponent(spanToParam(sp))}`;
    a.textContent = formatSpan(sp);
    refs.append(a);
  });
  if (spans.length > 8) { const m = document.createElement("span"); m.className = "muted"; m.textContent = `…共 ${spans.length} 處`; refs.append(m); }
  box.append(refs);
  return box;
}

/** 3D route map: satellite imagery, terrain, arrows, numbered segments and a fly-along playback. */
export default function RouteMap({ routes, groups, focusId, places = [], focusPlaceId, nearby }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
  const ready = useRef(false);
  const [, force] = useState(0);
  const [prefs, setPrefs] = useStored("sermon-app:map", { base: "sat" });
  const base = BASES.some((b) => b.id === prefs.base) ? prefs.base : "sat";
  const [lstyle, setLstyle] = useStored<LabelStyle>("sermon-app:labelstyle", DEFAULT_LABEL_STYLE);
  const [panel, setPanel] = useState(false);
  const [dragged, setDragged] = useState(hasLabelPos());
  const [tilt, setTilt] = useState(true);
  const [terrain, setTerrain] = useState(1.5);
  const [labels, setLabels] = useState(true);
  const [follow, setFollow] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [showPlaces, setShowPlaces] = useState(true);
  const [passing, setPassing] = useState("");
  const labels_ = useRef<maplibregl.Marker[]>([]);
  const shownIds = useRef<(Place & { lat: number; lon: number })[]>([]);
  const popup = useRef<maplibregl.Popup | null>(null);
  const anim = useRef<{ raf: number; runner: maplibregl.Marker } | null>(null);
  const latest = useRef({ routes, groups, tilt, places, showPlaces, nearby, base, lstyle });
  latest.current = { routes, groups, tilt, places, showPlaces, nearby, base, lstyle };

  // ---- create the map once ----
  useEffect(() => {
    const map = new maplibregl.Map({
      container: box.current!, center: [35.3, 32.0], zoom: 6.5, pitch: 55, maxPitch: 82, canvasContextAttributes: { antialias: true },
      style: {
        version: 8,
        sources: {
          ...Object.fromEntries(BASES.map((b) => [`b-${b.id}`, { type: "raster", tiles: b.tiles, tileSize: 256, maxzoom: b.maxzoom, attribution: b.attribution }])),
          ...Object.fromEntries(Object.entries(LABEL_OVERLAYS).map(([k, v]) => [`l-${k}`, { type: "raster", tiles: v.tiles, tileSize: 256, maxzoom: v.maxzoom }])),
          dem: { type: "raster-dem", tiles: [DEM], tileSize: 256, maxzoom: 14, encoding: "terrarium", attribution: "Terrain: Mapzen / AWS Terrain Tiles" },
          shade: { type: "raster-dem", tiles: [DEM], tileSize: 256, maxzoom: 14, encoding: "terrarium" },
        },
        layers: [
          { id: "bg", type: "background", paint: { "background-color": "#9fb4c7" } },
          ...BASES.map((b) => ({ id: `b-${b.id}`, type: "raster" as const, source: `b-${b.id}`, layout: { visibility: b.id === base ? "visible" as const : "none" as const } })),
          { id: "hill", type: "hillshade", source: "shade", paint: { "hillshade-exaggeration": BASES.find((b) => b.id === base)!.hill } },
          ...Object.keys(LABEL_OVERLAYS).map((k) => ({ id: `l-${k}`, type: "raster" as const, source: `l-${k}`, paint: { "raster-opacity": 0.9 },
            layout: { visibility: BASES.find((b) => b.id === base)!.labels === k ? "visible" as const : "none" as const } })),
        ],
      },
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    map.on("load", () => {
      map.addImage("arrow", arrowImage());
      map.addSource("routes", { type: "geojson", data: EMPTY });
      map.addSource("trail", { type: "geojson", data: EMPTY });
      const w = (a: number, b: number, c: number): maplibregl.ExpressionSpecification => ["interpolate", ["linear"], ["zoom"], 5, a, 9, b, 13, c];
      const round = { "line-cap": "round", "line-join": "round" } as const;
      map.addLayer({ id: "route-glow", type: "line", source: "routes", layout: round, paint: { "line-color": ["get", "color"], "line-width": w(10, 18, 30), "line-blur": 10, "line-opacity": 0.55 } });
      map.addLayer({ id: "route-casing", type: "line", source: "routes", layout: round, paint: { "line-color": "#111", "line-width": w(6, 9, 14), "line-opacity": 0.85 } });
      map.addLayer({ id: "route-line", type: "line", source: "routes", layout: round, paint: { "line-color": ["get", "color"], "line-width": w(3.5, 5.5, 9) } });
      map.addLayer({ id: "route-arrows", type: "symbol", source: "routes", layout: {
        "symbol-placement": "line", "symbol-spacing": 70, "icon-image": "arrow", "icon-allow-overlap": true, "icon-ignore-placement": true,
        "icon-size": ["interpolate", ["linear"], ["zoom"], 5, 0.7, 10, 1.1, 13, 1.5], "icon-rotation-alignment": "map", "icon-pitch-alignment": "map" } });
      map.addLayer({ id: "trail-line", type: "line", source: "trail", layout: round, paint: { "line-color": "#ffd400", "line-width": w(5, 8, 13) } });
      map.addSource("places", { type: "geojson", data: EMPTY });
      map.addSource("leaders", { type: "geojson", data: EMPTY });
      map.addLayer({ id: "leader-casing", type: "line", source: "leaders", paint: { "line-color": "#000", "line-width": 3.5, "line-opacity": 0.6 } });
      map.addLayer({ id: "leader-line", type: "line", source: "leaders", paint: { "line-color": "#fff", "line-width": 1.6 } });
      map.addLayer({ id: "place-halo", type: "circle", source: "places", paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 6, 10, 10], "circle-color": "#000", "circle-opacity": 0.55 } });
      map.addLayer({ id: "place-dots", type: "circle", source: "places", paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 3.5, 10, 6.5],
        "circle-color": ["case", ["==", ["get", "ap"], 1], "#ffd9a0", "#fff"],
        "circle-stroke-width": 1.5, "circle-stroke-color": ["case", ["==", ["get", "ap"], 1], "#c48a1a", "#8a3d1c"] } });
      map.on("click", "place-dots", (e) => {
        const id = e.features?.[0]?.properties?.id;
        const p = latest.current.places.find((x) => x.id === id);
        if (p && hasPos(p)) openCard(p);
      });
      map.on("mouseenter", "place-dots", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "place-dots", () => { map.getCanvas().style.cursor = ""; });
      map.on("moveend", () => drawLabels());
      ready.current = true;
      force((n) => n + 1);
    });
    return () => { stop(); markers.current.forEach((m) => m.remove()); labels_.current.forEach((m) => m.remove()); popup.current?.remove(); map.remove(); mapRef.current = null; ready.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCard(p: Place & { lat: number; lon: number }) {
    const map = mapRef.current;
    if (!map) return;
    popup.current?.remove();
    popup.current = new maplibregl.Popup({ offset: 14, maxWidth: "280px" }).setLngLat([p.lon, p.lat]).setDOMContent(placeCard(p)).addTo(map);
  }

  /** Lines from a place's dot to its name tag, for tags that were dragged away. */
  function drawLeaders(live?: { id: string; at: [number, number] }) {
    const map = mapRef.current;
    const src = map?.getSource("leaders") as maplibregl.GeoJSONSource | undefined;
    if (!map || !src) return;
    const features = shownIds.current.flatMap((p) => {
      const at = live && live.id === p.id ? live.at : getLabelPos(p.id);
      return at ? [{ type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: [[p.lon, p.lat], at] } }] : [];
    });
    src.setData({ type: "FeatureCollection", features });
  }

  /** Names next to the dots: all of them when there are few places, otherwise the best-known ones in view once zoomed in.
   *  Each name tag can be dragged; a line then joins it to its dot. Double-click a tag to put it back. */
  function drawLabels() {
    const map = mapRef.current;
    if (!map || !ready.current) return;
    labels_.current.forEach((m) => m.remove());
    labels_.current = [];
    shownIds.current = [];
    const { places: ps, showPlaces: on } = latest.current;
    const list = ps.filter(hasPos);
    if (!on || !list.length) { drawLeaders(); return; }
    let pick = list;
    if (list.length > 60) {
      if (map.getZoom() < 8.2) { drawLeaders(); return; }
      const b = map.getBounds();
      pick = list.filter((p) => b.contains([p.lon, p.lat])).sort((a, b2) => b2.refs.length - a.refs.length).slice(0, 70);
    }
    shownIds.current = pick;
    for (const p of pick) {
      const el_ = document.createElement("div");
      el_.className = "map-label";
      el_.textContent = placeName(p);
      el_.title = "拖曳可移動名稱,點一下看詳細,連點兩下放回原位";
      const at = getLabelPos(p.id) ?? [p.lon, p.lat];
      const m = new maplibregl.Marker({ element: el_, anchor: "top", offset: [0, 8], draggable: true }).setLngLat(at).addTo(map);
      let moved = false;
      m.on("dragstart", () => { moved = true; });
      m.on("drag", () => { const ll_ = m.getLngLat(); drawLeaders({ id: p.id, at: [ll_.lng, ll_.lat] }); });
      m.on("dragend", () => {
        const ll_ = m.getLngLat();
        const a = map.project([p.lon, p.lat]), c = map.project(ll_);
        if (Math.hypot(a.x - c.x, a.y - c.y) < 14) { m.setLngLat([p.lon, p.lat]); setLabelPos(p.id, null); }
        else setLabelPos(p.id, [ll_.lng, ll_.lat]);
        drawLeaders();
        setDragged(hasLabelPos());
        setTimeout(() => { moved = false; }, 0);
      });
      el_.addEventListener("click", () => { if (!moved) openCard(p); });
      el_.addEventListener("dblclick", (e) => {
        e.stopPropagation(); e.preventDefault();
        setLabelPos(p.id, null); m.setLngLat([p.lon, p.lat]); drawLeaders(); setDragged(hasLabelPos());
      });
      labels_.current.push(m);
    }
    drawLeaders();
  }

  // ---- places ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready.current) return;
    (map.getSource("places") as maplibregl.GeoJSONSource).setData({
      type: "FeatureCollection",
      features: places.filter(hasPos).map((p) => ({ type: "Feature", properties: { id: p.id, ap: p.ap ?? 0 }, geometry: { type: "Point", coordinates: [p.lon, p.lat] } })),
    });
    drawLabels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places, ready.current]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready.current) return;
    for (const l of ["place-halo", "place-dots"]) map.setLayoutProperty(l, "visibility", showPlaces ? "visible" : "none");
    drawLabels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPlaces, ready.current]);
  useEffect(() => {
    const map = mapRef.current;
    const p = places.find((x) => x.id === focusPlaceId) ?? (nearby ?? []).find((x) => x.id === focusPlaceId);
    if (!map || !ready.current || !p || !hasPos(p)) return;
    map.easeTo({ center: [p.lon, p.lat], zoom: Math.max(map.getZoom(), 9.5), pitch: latest.current.tilt ? 58 : 0, duration: 1200 });
    openCard(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusPlaceId, ready.current]);

  // ---- draw routes ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready.current) return;
    stop();
    (map.getSource("routes") as maplibregl.GeoJSONSource).setData({
      type: "FeatureCollection",
      features: routes.map((r) => ({ type: "Feature", properties: { color: routeColor(r, groups) }, geometry: { type: "MultiLineString", coordinates: r.lines } })),
    });
    markers.current.forEach((m) => m.remove());
    markers.current = [];
    for (const r of routes) {
      const color = routeColor(r, groups);
      if (r.lines.length > 1) {
        r.lines.forEach((l, i) => markers.current.push(
          new maplibregl.Marker({ element: el(`<div class="map-badge" style="border-color:${color}">${i + 1}</div>`) }).setLngLat(l[0]).addTo(map)));
      }
      const last = r.lines[r.lines.length - 1];
      markers.current.push(new maplibregl.Marker({ element: el('<div class="map-dot start"></div>') }).setLngLat(r.lines[0][0]).addTo(map));
      markers.current.push(new maplibregl.Marker({ element: el('<div class="map-dot end"></div>') }).setLngLat(last[last.length - 1]).addTo(map));
    }
    const few = latest.current.places.filter(hasPos);
    if (routes.length || (few.length && few.length <= 40)) {
      const b = new maplibregl.LngLatBounds();
      routes.forEach((r) => r.lines.forEach((l) => l.forEach((p) => b.extend(p))));
      if (few.length <= 40) few.forEach((p) => b.extend([p.lon, p.lat]));
      map.fitBounds(b, { padding: 70, maxZoom: 11, pitch: latest.current.tilt ? 58 : 0, bearing: 0, duration: 1500 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routes, groups, ready.current]);

  // ---- toolbar effects ----
  const cur = BASES.find((b) => b.id === base)!;
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready.current) return;
    for (const b of BASES) map.setLayoutProperty(`b-${b.id}`, "visibility", b.id === base ? "visible" : "none");
    map.setLayoutProperty("hill", "visibility", cur.hill > 0 ? "visible" : "none");
    if (cur.hill > 0) map.setPaintProperty("hill", "hillshade-exaggeration", cur.hill);
  }, [base, ready.current]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready.current) return;
    for (const k of Object.keys(LABEL_OVERLAYS)) map.setLayoutProperty(`l-${k}`, "visibility", labels && cur.labels === k ? "visible" : "none");
  }, [labels, base, ready.current]); // eslint-disable-line react-hooks/exhaustive-deps
  // name-tag size/background are CSS variables; the dots follow the size
  useEffect(() => {
    const el_ = box.current;
    if (el_) for (const [k, v] of Object.entries(labelVars(lstyle))) el_.style.setProperty(k, v);
    const map = mapRef.current;
    if (!map || !ready.current) return;
    const s = lstyle.size / 13;
    map.setPaintProperty("place-halo", "circle-radius", ["interpolate", ["linear"], ["zoom"], 5, 6 * s, 10, 10 * s]);
    map.setPaintProperty("place-dots", "circle-radius", ["interpolate", ["linear"], ["zoom"], 5, 3.5 * s, 10, 6.5 * s]);
  }, [lstyle, ready.current]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready.current) return;
    map.setTerrain(terrain > 0 ? { source: "dem", exaggeration: terrain } : null);
  }, [terrain, ready.current]);
  const firstTilt = useRef(true);
  useEffect(() => {
    if (firstTilt.current) { firstTilt.current = false; return; }
    mapRef.current?.easeTo({ pitch: tilt ? 58 : 0, duration: 600 });
  }, [tilt]);

  // ---- playback ----
  function stop() {
    const a = anim.current;
    if (a) { cancelAnimationFrame(a.raf); a.runner.remove(); anim.current = null; }
    (mapRef.current?.getSource("trail") as maplibregl.GeoJSONSource | undefined)?.setData(EMPTY);
    setPlaying(false);
    setPassing("");
  }
  useEffect(() => { stop(); }, [focusId]);

  function play() {
    const map = mapRef.current, route = routes.find((r) => r.id === focusId) ?? routes[routes.length - 1];
    if (!map || !route) return;
    stop();
    const legs = route.lines;
    const lens = legs.map((pts) => pts.slice(1).reduce((s, p, k) => s + metres(pts[k], p), 0));
    const total = lens.reduce((a, b) => a + b, 0) || 1;
    const duration = Math.min(25000, Math.max(8000, total / 80));
    const runner = new maplibregl.Marker({ element: el('<div class="map-runner"></div>') }).setLngLat(legs[0][0]).addTo(map);
    const a = { raf: 0, runner };
    anim.current = a;
    setPlaying(true);
    let heading = map.getBearing();
    if (follow) map.easeTo({ center: legs[0][0], zoom: Math.max(map.getZoom(), 9), pitch: 62, duration: 800 });
    const t0 = performance.now();
    const ahead = (p: LngLat): LngLat | null => {
      let best: [LngLat[], number] | null = null, bd = Infinity;
      for (const pts of legs) pts.forEach((q, k) => { const d = metres(p, q); if (d < bd) { bd = d; best = [pts, k]; } });
      if (!best) return null;
      const [pts, k] = best as [LngLat[], number];
      for (let j = k + 1; j < pts.length; j++) if (metres(p, pts[j]) > 40000) return pts[j];
      return k < pts.length - 1 ? pts[pts.length - 1] : null;
    };
    const step = (now: number) => {
      let d = Math.min(1, (now - t0) / duration) * total;
      const done: LngLat[][] = [];
      let p = legs[0][0];
      for (let li = 0; li < legs.length; li++) {
        const pts = legs[li];
        if (d >= lens[li] && li < legs.length - 1) { done.push(pts); d -= lens[li]; continue; }
        const part: LngLat[] = [pts[0]];
        let acc = 0, pos = pts[0];
        for (let k = 1; k < pts.length; k++) {
          const seg = metres(pts[k - 1], pts[k]);
          if (acc + seg >= d) {
            const f = (d - acc) / (seg || 1);
            pos = [pts[k - 1][0] + (pts[k][0] - pts[k - 1][0]) * f, pts[k - 1][1] + (pts[k][1] - pts[k - 1][1]) * f];
            part.push(pos);
            break;
          }
          acc += seg; part.push(pts[k]); pos = pts[k];
        }
        done.push(part); p = pos;
        break;
      }
      (map.getSource("trail") as maplibregl.GeoJSONSource).setData({ type: "Feature", properties: {}, geometry: { type: "MultiLineString", coordinates: done } });
      runner.setLngLat(p);
      const pool = latest.current.nearby;
      if (pool) {
        let near = "", bd = 25000;
        for (const q of pool) {
          if (!hasPos(q) || q.rg || q.k) continue;
          const d = metres(p, [q.lon, q.lat]);
          if (d < bd) { bd = d; near = placeName(q); }
        }
        setPassing((cur) => (cur === near ? cur : near));
      }
      if (follow) {
        const ap = ahead(p);
        if (ap) heading = lerpAngle(heading, bearing(p, ap), 0.04);
        map.jumpTo({ center: p, bearing: heading });
      }
      if (now - t0 < duration) a.raf = requestAnimationFrame(step);
      else setPlaying(false);
    };
    a.raf = requestAnimationFrame(step);
  }

  return (
    <div className="routemap">
      <div ref={box} className="routemap-canvas" />
      {panel && places.length > 0 && (
        <div className="label-panel">
          <label>大小 <input type="range" min={9} max={32} step={1} value={lstyle.size} onChange={(e) => setLstyle({ ...lstyle, size: +e.target.value })} /> {lstyle.size}</label>
          <label>底色 <input type="color" value={lstyle.bg} onChange={(e) => setLstyle({ ...lstyle, bg: e.target.value, opacity: lstyle.opacity || 0.75 })} /></label>
          <label>底色濃度 <input type="range" min={0} max={1} step={0.05} value={lstyle.opacity} onChange={(e) => setLstyle({ ...lstyle, opacity: +e.target.value })} /> {Math.round(lstyle.opacity * 100)}%</label>
          <div className="row">
            <button className="btn small" onClick={() => setLstyle(DEFAULT_LABEL_STYLE)}>還原樣式</button>
            <button className="btn small" disabled={!dragged} onClick={() => { clearLabelPos(); setDragged(false); drawLabels(); }}>名稱放回原位</button>
          </div>
          <p className="small muted">拖曳地名可移開,會有線連回地點;連點兩下放回。</p>
        </div>
      )}
      <div className="map-tools">
        <select value={base} onChange={(e) => { setPrefs({ ...prefs, base: e.target.value }); setLabels(true); }} aria-label="底圖類型">
          {BASES.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
        </select>
        <label>地形 <input type="range" min={0} max={5} step={0.5} value={terrain} onChange={(e) => setTerrain(+e.target.value)} /></label>
        <label><input type="checkbox" checked={tilt} onChange={(e) => setTilt(e.target.checked)} /> 傾斜</label>
        {cur.labels && <label><input type="checkbox" checked={labels} onChange={(e) => setLabels(e.target.checked)} /> 底圖地名</label>}
        {(places.length > 0) && <label><input type="checkbox" checked={showPlaces} onChange={(e) => setShowPlaces(e.target.checked)} /> 聖經地名</label>}
        {(places.length > 0) && <button className="btn" onClick={() => setPanel(!panel)}>地名樣式</button>}
        <span className="map-sep" />
        <button className="btn" disabled={!routes.length} onClick={() => (playing ? stop() : play())}>{playing ? "■ 停止" : "▶ 播放"}</button>
        <label><input type="checkbox" checked={follow} onChange={(e) => setFollow(e.target.checked)} /> 鏡頭跟隨</label>
        {playing && passing && <span className="passing">附近:{passing}</span>}
      </div>
    </div>
  );
}
