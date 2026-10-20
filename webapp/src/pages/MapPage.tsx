import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useRoutes } from "../lib/data";
import RouteBrowser from "../components/RouteBrowser";

export default function MapPage() {
  const routes = useRoutes();
  const [params] = useSearchParams();
  const groups = useMemo(() => [...new Set((routes.data ?? []).map((r) => r.group))], [routes.data]);
  const initial = useMemo(() => (params.get("r") ? [params.get("r")!] : []), [params]);
  if (routes.error) return <p className="err pad">路線資料載入失敗:{routes.error}。請先執行 npm run data。</p>;
  if (!routes.data) return <p className="muted pad">載入中…</p>;
  return <div className="page wide"><RouteBrowser routes={routes.data} groups={groups} initial={initial} search /></div>;
}
