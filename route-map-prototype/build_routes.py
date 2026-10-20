"""Bundle ../ubs-bible-routes/GeoJsonRoutes into a single routes.js for the map page."""
import glob, json, os, re

SRC = os.path.join(os.path.dirname(__file__), "..", "ubs-bible-routes", "GeoJsonRoutes")

# (first route number, group label)
GROUPS = [
    (1, "族長時代"), (39, "出埃及與征服迦南"), (66, "士師、掃羅與大衛"),
    (99, "所羅門"), (106, "分裂王國至被擄"), (152, "耶穌"), (197, "使徒行傳"),
]

def group_of(num):
    label = GROUPS[0][1]
    for start, name in GROUPS:
        if num >= start:
            label = name
    return label

def features(d):
    if not d:
        return
    if d.get("type") == "FeatureCollection":
        for f in d.get("features", []):
            yield from features(f)
    elif d.get("type") == "Feature" and d.get("geometry"):
        yield d["geometry"]

def lines(geom):
    t, c = geom["type"], geom["coordinates"]
    if t == "Point":
        return
    if t == "LineString":
        yield c
    elif t == "MultiLineString":
        yield from c

routes = []
for path in sorted(glob.glob(os.path.join(SRC, "*.geojson"))):
    base = os.path.basename(path)[:-len(".geojson")]
    m = re.match(r"(\d+)([a-z]?)\.?\s*(.*)", base)
    num = int(m.group(1))
    name = m.group(3).strip() or base
    with open(path, encoding="utf-8") as fh:
        d = json.load(fh)
    segs = [[[round(y, 5), round(x, 5)] for x, y in l] for g in features(d) for l in lines(g)]
    if not segs:
        continue
    routes.append({"id": base, "num": num, "name": name, "group": group_of(num), "lines": segs})

out = os.path.join(os.path.dirname(__file__), "routes.js")
with open(out, "w", encoding="utf-8") as fh:
    fh.write("window.ROUTES = " + json.dumps(routes, ensure_ascii=False, separators=(",", ":")) + ";\n")
print(len(routes), "routes ->", out, os.path.getsize(out) // 1024, "KB")
