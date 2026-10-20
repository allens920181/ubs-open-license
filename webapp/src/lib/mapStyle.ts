import { useEffect, useState } from "react";

export interface BaseMap {
  id: string;
  label: string;
  tiles: string[];
  maxzoom: number;
  attribution: string;
  /** Which place-name overlay goes with this base (none when the tiles already carry names). */
  labels: "lab" | "labLight" | "labDark" | null;
  /** Hillshade strength drawn over the tiles; 0 turns it off (maps that already show relief). */
  hill: number;
  tileSize?: number;
}

const esri = (path: string) => `https://server.arcgisonline.com/ArcGIS/rest/services/${path}/MapServer/tile/{z}/{y}/{x}`;
const ESRI = "Esri";

export const BASES: BaseMap[] = [
  { id: "sat", label: "衛星影像", tiles: [esri("World_Imagery")], maxzoom: 17, labels: "lab", hill: 0.35, attribution: "Imagery © Esri, Maxar, Earthstar Geographics" },
  { id: "topo", label: "地形圖(Esri)", tiles: [esri("World_Topo_Map")], maxzoom: 17, labels: null, hill: 0, attribution: `Topo map © ${ESRI}, HERE, Garmin, USGS` },
  { id: "natgeo", label: "國家地理風格", tiles: [esri("NatGeo_World_Map")], maxzoom: 16, labels: null, hill: 0, attribution: "© National Geographic, Esri, Garmin, HERE, UNEP-WCMC, USGS" },
  { id: "relief", label: "地形暈渲(淺色)", tiles: [esri("World_Shaded_Relief")], maxzoom: 13, labels: "lab", hill: 0, attribution: `Shaded relief © ${ESRI}` },
  { id: "opentopo", label: "等高線地形圖", tiles: ["a", "b", "c"].map((s) => `https://${s}.tile.opentopomap.org/{z}/{x}/{y}.png`), maxzoom: 17, labels: null, hill: 0, attribution: "© OpenTopoMap (CC-BY-SA), © OpenStreetMap contributors" },
  { id: "osm", label: "街道(OpenStreetMap)", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], maxzoom: 18, labels: null, hill: 0.45, attribution: "© OpenStreetMap contributors" },
  { id: "voyager", label: "簡潔街道(CARTO)", tiles: ["a", "b", "c"].map((s) => `https://${s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png`), maxzoom: 18, labels: null, hill: 0.3, attribution: "© OpenStreetMap contributors © CARTO" },
  { id: "light", label: "淺灰底圖", tiles: [esri("Canvas/World_Light_Gray_Base")], maxzoom: 16, labels: "labLight", hill: 0.3, attribution: `Light gray canvas © ${ESRI}` },
  { id: "dark", label: "深色底圖", tiles: [esri("Canvas/World_Dark_Gray_Base")], maxzoom: 16, labels: "labDark", hill: 0.2, attribution: `Dark gray canvas © ${ESRI}` },
];

export const LABEL_OVERLAYS: Record<"lab" | "labLight" | "labDark", { tiles: string[]; maxzoom: number }> = {
  lab: { tiles: [esri("Reference/World_Boundaries_and_Places")], maxzoom: 14 },
  labLight: { tiles: [esri("Canvas/World_Light_Gray_Reference")], maxzoom: 16 },
  labDark: { tiles: [esri("Canvas/World_Dark_Gray_Reference")], maxzoom: 16 },
};

/** localStorage-backed state that never throws (private windows, blocked storage). */
export function useStored<T>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? initial : { ...(typeof initial === "object" ? initial : {}), ...JSON.parse(raw) } as T;
    } catch { return initial; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ } }, [key, value]);
  return [value, setValue];
}

export interface LabelStyle {
  /** Font size in px; the dots scale with it. */
  size: number;
  /** Background colour of the name tag. */
  bg: string;
  /** 0 = no background. */
  opacity: number;
}
export const DEFAULT_LABEL_STYLE: LabelStyle = { size: 13, bg: "#000000", opacity: 0 };

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) || 0);
/** CSS variables for the name tags: a readable text colour is chosen from the background. */
export function labelVars(s: LabelStyle): Record<string, string> {
  const [r, g, b] = hex(s.bg);
  const light = (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
  const solid = s.opacity > 0.45;
  const dark = solid && light;
  return {
    "--lbl-size": `${s.size}px`,
    "--lbl-bg": s.opacity > 0 ? `rgba(${r},${g},${b},${s.opacity})` : "transparent",
    "--lbl-fg": dark ? "#1b1815" : "#fff",
    "--lbl-shadow": dark ? "none" : "0 0 3px #000, 0 0 3px #000, 0 0 6px #000",
  };
}

// ---- places whose name tag was dragged away from the dot ----
const POS_KEY = "sermon-app:labelpos";
let positions: Record<string, [number, number]> = {};
try { positions = JSON.parse(localStorage.getItem(POS_KEY) || "{}"); } catch { /* start empty */ }
const save = () => { try { localStorage.setItem(POS_KEY, JSON.stringify(positions)); } catch { /* ignore */ } };
export const getLabelPos = (id: string) => positions[id];
export function setLabelPos(id: string, p: [number, number] | null) {
  if (p) positions[id] = p; else delete positions[id];
  save();
}
export const clearLabelPos = () => { positions = {}; save(); };
export const hasLabelPos = () => Object.keys(positions).length > 0;
