#!/usr/bin/env python3
"""Turn the UBS open-license data in this repository into the JSON files the web app loads.

Run from anywhere:  python3 webapp/scripts/build_data.py
Output: webapp/public/data/*.json  (not committed; regenerate with `npm run data`)

Verse positions are the UBS integer BBBCCCVVV, e.g. ACT 13:5 -> 44013005.
"""
import glob
import json
import math
import os
import re
import xml.etree.ElementTree as ET
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(HERE)
REPO = os.path.dirname(APP)
OUT = os.path.join(APP, "public", "data")
SRC = os.path.join(APP, "data-src")

with open(os.path.join(APP, "src", "lib", "books.json"), encoding="utf-8") as fh:
    BOOKS = json.load(fh)
BOOK_N = {b["code"]: b["n"] for b in BOOKS}
BOOK_ABBR = {b["n"]: b["abbr"] for b in BOOKS}


def write(name, data):
    path = os.path.join(OUT, name)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, separators=(",", ":"))
    print(f"  {name:<28} {os.path.getsize(path) / 1024:8.0f} KB")


def pairs(filename):
    out = {}
    with open(os.path.join(SRC, filename), encoding="utf-8") as fh:
        for line in fh:
            if "|" in line and not line.startswith("#"):
                k, v = line.rstrip("\n").split("|", 1)
                out[k] = v
    return out


# ---------- scripture references ----------
PART = re.compile(r"^(\d+)(?::(\d+))?(?:[-–—~](\d+)(?::(\d+))?)?$")


def span(book, c1, v1, dash, v2):
    """-> (from, to) as BBBCCCVVV ints. Mirrors the parser in src/lib/refs.ts."""
    b = book * 1_000_000
    c1 = int(c1)
    if v1 is None:
        return b + c1 * 1000, b + (int(dash) if dash else c1) * 1000 + 999
    start = b + c1 * 1000 + int(v1)
    if dash is None:
        return start, start
    if v2 is not None:
        return start, b + int(dash) * 1000 + int(v2)
    return start, b + c1 * 1000 + int(dash)


def parse_refs(text):
    out = []
    for piece in (text or "").split(";"):
        m = re.match(r"^(\w{3})\s+(.+)$", piece.strip())
        p = m and PART.match(m.group(2))
        if p and m.group(1) in BOOK_N:
            out.append(list(span(BOOK_N[m.group(1)], p.group(1), p.group(2), p.group(3), p.group(4))))
    return out


def verse_of(text):
    """First nine digits of a 14-digit UBS reference, or None for anything else (e.g. 'H00302601')."""
    t = (text or "").strip()
    return int(t[:9]) if len(t) >= 9 and t[:9].isdigit() else None


def fmt_code(code14):
    """'04401301500002' -> '徒 13:15'"""
    n, c, v = int(code14[:3]), int(code14[3:6]), int(code14[6:9])
    return f"{BOOK_ABBR.get(n, n)} {c}:{v}"


# ---------- routes ----------
GROUPS = [(1, "族長時代"), (39, "出埃及與征服迦南"), (66, "士師、掃羅與大衛"), (99, "所羅門"),
          (106, "分裂王國至被擄"), (152, "耶穌"), (197, "使徒行傳")]


def group_of(num):
    label = GROUPS[0][1]
    for start, name in GROUPS:
        if num >= start:
            label = name
    return label


def geometries(d):
    if not d:
        return
    if d.get("type") == "FeatureCollection":
        for f in d.get("features", []):
            yield from geometries(f)
    elif d.get("type") == "Feature" and d.get("geometry"):
        yield d["geometry"]


def build_routes():
    zh, order, refs = pairs("zh_names.txt"), pairs("route_order.txt"), pairs("scripture_refs.txt")
    routes = []
    for path in sorted(glob.glob(os.path.join(REPO, "ubs-bible-routes", "GeoJsonRoutes", "*.geojson"))):
        base = os.path.basename(path)[: -len(".geojson")]
        m = re.match(r"(\d+)([a-z]?)\.?\s*(.*)", base)
        num, name = int(m.group(1)), (m.group(3).strip() or base)
        with open(path, encoding="utf-8") as fh:
            d = json.load(fh)
        segs = []
        for g in geometries(d):
            lines = [g["coordinates"]] if g["type"] == "LineString" else g["coordinates"] if g["type"] == "MultiLineString" else []
            segs += [[[round(x, 5), round(y, 5)] for x, y in line] for line in lines]  # [lon, lat]
        if not segs:
            continue
        if base in order:
            segs = [segs[int(t.rstrip("r"))][::-1] if t.endswith("r") else segs[int(t)] for t in order[base].split(",")]
        routes.append({"id": base, "num": num, "name": name, "zh": zh.get(base, ""), "group": group_of(num),
                       "refs": parse_refs(refs.get(base, "")), "lines": segs})
    write("routes.json", routes)


# ---------- images ----------
def build_images():
    root = ET.parse(os.path.join(REPO, "images", "ubs-release.xml")).getroot()
    out = []
    for e in root.findall("BibleImage"):
        defs = {d.get("LanguageCode"): d for d in e.iter("Definition")}

        def pick(field, *langs):
            return next((defs[l].findtext(field) for l in langs if l in defs and (defs[l].findtext(field) or "").strip()), "")

        verses = sorted({v for v in map(verse_of, (r.text for r in e.findall(".//Reference"))) if v})
        out.append({
            "id": e.get("Id"), "col": e.findtext("Collection"), "file": e.findtext("FileName"), "type": e.get("Type") or "",
            "en": pick("Title", "en"), "zh": pick("Title", "zh-Hant", "zh-Hans"),
            "den": pick("Description", "en"), "dzh": pick("Description", "zh-Hant", "zh-Hans"),
            "subj": pick("Subject", "en"), "tags": pick("Tags", "en"),
            "th": [t.text for t in e.findall(".//ThematicLink") if t.text],
            "cp": (e.findtext("Copyright") or "").strip(), "refs": verses,
        })
    write("images.json", out)


# ---------- flora / fauna / realia ----------
def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


CODE14 = re.compile(r"\d{14}")
KEEP = {"i": "em", "b": "strong"}


def html(el):
    """Serialise a paragraph, keeping only italics/bold and turning 14-digit codes into readable references."""
    parts = [esc(el.text or "")]
    for c in el:
        inner = html(c)
        tag = KEEP.get(c.tag)
        parts.append(f"<{tag}>{inner}</{tag}>" if tag else inner)
        parts.append(esc(c.tail or ""))
    return CODE14.sub(lambda m: fmt_code(m.group(0)), "".join(parts))


def strip_label(s):
    s = (s or "").strip()
    return re.sub(r"^[^:：]{1,6}[:：]\s*", "", s)


def parse_nature(path):
    entries = {}
    for e in ET.parse(path).getroot().findall("ThemLex_Entry"):
        title = (e.findtext("Title") or "").strip()
        title = re.sub(r"^標.{0,2}[:：]\s*", "", title)
        sections, imgs, verses = [], [], set()
        for s in e.iterfind("Sections/Section"):
            sets = []
            for ls in s.iterfind("LanguageSets/LanguageSet"):
                rs = [v for v in map(verse_of, (r.text for r in ls.findall(".//Reference"))) if v]
                verses.update(rs)
                sets.append({"lang": ls.get("Language"), "lem": strip_label(ls.findtext("Lemma")),
                             "tr": strip_label(ls.findtext("Transliteration")), "gl": strip_label(ls.findtext("Gloss")), "r": rs})
            paras = [html(p).strip() for p in s.iterfind("Paragraphs/Paragraph")]
            sec_imgs = [i.get("Id") for i in s.iter("Image")] + [i.get("Id") for i in s.iter("BibleImage")]
            imgs += [i for i in sec_imgs if i and i not in imgs]
            sections.append({"h": (s.findtext("Heading") or "").strip(), "sh": (s.findtext("SubHeading") or "").strip(),
                             "p": [p for p in paras if p], "l": sets, "i": list(dict.fromkeys(i for i in sec_imgs if i))})
        intro = [html(p).strip() for p in e.iterfind("Intro//Paragraph")]
        index = [("".join(l.itertext())).strip() for l in e.iterfind("Index/IndexItem")]
        entries[e.get("Key")] = {"k": e.get("Key"), "t": title, "s": sections, "r": sorted(verses), "i": imgs,
                                 **({"x": index} if index else {}), **({"in": intro} if intro else {})}
    return entries


def build_nature():
    base = os.path.join(REPO, "flora-fauna-realia", "XML")
    for kind in ("FLORA", "FAUNA", "REALIA"):
        zh = parse_nature(os.path.join(base, f"{kind}_1.1_zh-Hant.xml"))
        en = parse_nature(os.path.join(base, f"{kind}_1.1_en.xml"))
        out = []
        for k, e in zh.items():
            e["e"] = en.get(k, {}).get("t", "")
            out.append(e)
        write(f"{kind.lower()}.json", out)


# ---------- parallel passages ----------
def build_parallels():
    root = ET.parse(os.path.join(REPO, "parallel passages", "ParallelPassages.xml")).getroot()
    groups = []
    for p in root.findall("Passage"):
        g = []
        for v in p.findall("Verse"):
            r = parse_refs((v.text or "").strip())
            g += r
        if len(g) > 1:
            groups.append(g)
    write("parallels.json", groups)


# ---------- HOTTP ----------
def build_hottp():
    root = ET.parse(os.path.join(REPO, "HOTTP", "HOTTP.XML")).getroot()
    by_book = defaultdict(list)
    for e in root.findall("HOTTP_Entry"):
        verses = sorted({v for v in map(verse_of, (r.text for r in e.findall("References/Reference"))) if v})
        if not verses:
            continue
        alts = []
        for a in e.iterfind("Alternatives/Alternative"):
            alts.append({"s": a.findtext("Source") or "", "rt": a.findtext("Rating") or "",
                         "v": [[v.findtext("Text") or "", v.findtext("Content") or ""] for v in a.iterfind("Versions/Version")],
                         "f": [f.text for f in a.iterfind("Factors/Factor") if f.text], "lit": a.findtext("Literal") or ""})
        by_book[verses[0] // 1_000_000].append({"id": e.get("Id"), "refs": verses, "rm": (e.findtext("Remark") or "").strip(),
                                                "sg": (e.findtext("Suggestion") or "").strip(), "alts": alts})
    for n, items in sorted(by_book.items()):
        write(f"hottp/{n:02d}.json", items)


# ---------- places (OpenBible.info geocoding, CC BY 4.0, merged with the MARBLE Hebrew place index) ----------
def book_aliases():
    out = {}
    norm = lambda t: re.sub(r"[\s.]", "", t.lower())
    for b in BOOKS:
        for a in [b["code"], b["zh"], b["abbr"], b["en"], *b["alias"]]:
            out[norm(a)] = b["n"]
    out["1thes"], out["2thes"] = BOOK_N["1TH"], BOOK_N["2TH"]  # OpenBible writes "1 Thes"
    return out, norm


def place_verses(text, aliases, norm):
    verses = set()
    for tok in text.split(","):
        m = re.match(r"^\s*(.+?)\s+(\d+):(\d+)(?:-(\d+))?\s*$", tok)
        n = m and aliases.get(norm(m.group(1)))
        if not n:
            continue
        a, z = int(m.group(3)), int(m.group(4) or m.group(3))
        for v in range(a, min(z, a + 60) + 1):
            verses.add(n * 1_000_000 + int(m.group(2)) * 1000 + v)
    return sorted(verses)


def coord(text):
    """-> (value or None, approximate?)"""
    t = (text or "").strip()
    approx = "~" in t or "?" in t
    t = t.lstrip("~<>").rstrip("?")
    try:
        return float(t), approx
    except ValueError:
        return None, approx


def hav_km(a, b):
    k = math.pi / 180
    x = (b[1] - a[1]) * k * math.cos((a[0] + b[0]) * k / 2)
    y = (b[0] - a[0]) * k
    return math.hypot(x, y) * 6371


def hebrew_places():
    """Place entries of the UBS Hebrew dictionary: lemma, English gloss, Strong's code, coordinates, verses."""
    with open(os.path.join(REPO, "dictionaries", "hebrew", "JSON", "UBSHebrewDic-v0.9.3-en.JSON"), encoding="utf-8") as fh:
        entries = json.load(fh)
    out = []
    for e in entries:
        for bf in e.get("BaseForms") or []:
            for m in bf.get("LEXMeanings") or []:
                if not any("Names of Locations" in (d.get("Domain") or "") for d in (m.get("LEXDomains") or [])):
                    continue
                gl = next((g for s in (m.get("LEXSenses") or []) if s.get("LanguageCode") == "en" for g in (s.get("Glosses") or [])), "")
                pts = []
                for c in m.get("LEXCoordinates") or []:
                    try:
                        pts.append(tuple(float(x) for x in c.split(",")))
                    except ValueError:
                        pass
                out.append({"lemma": e["Lemma"], "gloss": gl, "strong": (e.get("StrongCodes") or [""])[0], "pts": pts,
                            "refs": [v for v in map(verse_of, m.get("LEXReferences") or []) if v]})
    return out


def name_key(s):
    return re.sub(r"[^a-z]", "", re.sub(r"\s+\d+$", "", s).lower())


def build_places():
    aliases, norm = book_aliases()
    zh = pairs("place_zh.txt")
    rows = []
    with open(os.path.join(SRC, "openbible", "merged.txt"), encoding="utf-8") as fh:
        for line in fh:
            if line.startswith("#"):
                continue
            c = line.rstrip("\n").split("\t")
            if len(c) >= 5 and c[0].strip():
                rows.append(c + [""] * (6 - len(c)))
    by_name = {r[0]: r for r in rows}

    def locate(r, depth=0):
        lat, a1 = coord(r[2])
        lon, a2 = coord(r[3])
        if lat is not None and lon is not None:
            return lat, lon, a1 or a2, r[2].lstrip().startswith(">")
        root = by_name.get(r[1])
        if root and depth < 5 and root is not r:
            la, lo, ap, sur = locate(root, depth + 1) or (None, None, True, False)
            if la is not None:
                return la, lo, True, sur
        return None

    out = []
    for r in rows:
        loc = locate(r)
        note = r[5].strip()
        kind = note if note in ("region", "water", "river", "island", "mobile") else ""
        if note.startswith("http") or note in ("~", "?", kind):
            note = ""
        base = re.sub(r"\s+\d+$", "", r[0])
        p = {"id": r[0], "n": r[0], "zh": zh.get(r[0]) or zh.get(base, ""), "refs": place_verses(r[4], aliases, norm)}
        if loc:
            p.update(lat=round(loc[0], 5), lon=round(loc[1], 5))
            if loc[2]:
                p["ap"] = 1
            if loc[3] or kind == "region":
                p["rg"] = 1
        if kind:
            p["k"] = kind
        if note:
            p["c"] = note
        if r[1] and r[1] != r[0]:
            p["root"] = r[1]
        out.append(p)
    # Attach the Hebrew name (lemma, Strong's number) when the dictionary's English gloss is this place's own name
    # (not the name of the city a region happens to be pinned to) and its coordinates agree; dictionary places that match nothing are added as places of their own.
    hebrew = hebrew_places()
    used = set()
    for i, h in enumerate(hebrew):
        key = name_key(h["gloss"])
        for p in out:
            if "lat" in p and h["pts"] and key and key == name_key(p["n"]) \
               and min(hav_km(pt, (p["lat"], p["lon"])) for pt in h["pts"]) < 3:
                p.setdefault("heb", []).append([h["lemma"], h["strong"]])
                used.add(i)
    extra = aliased = 0
    for i, h in enumerate(hebrew):
        if i in used or not h["pts"] or not h["gloss"]:
            continue
        near = [p for p in out if "lat" in p and "x" not in p and hav_km(h["pts"][0], (p["lat"], p["lon"])) < 0.2]
        if near:  # another name for a place we already have (e.g. Mizraim at Egypt)
            best = max(near, key=lambda p: len(p["refs"]))
            best.setdefault("heb", []).append([h["lemma"], h["strong"], h["gloss"]])
            aliased += 1
            continue
        out.append({"id": f"H:{h['strong']}:{h['lemma']}", "n": h["gloss"], "zh": "", "refs": sorted(set(h["refs"])),
                    "lat": round(h["pts"][0][0], 5), "lon": round(h["pts"][0][1], 5), "heb": [[h["lemma"], h["strong"]]], "x": 1})
        extra += 1
    print(f"    Hebrew names attached to {sum(1 for p in out if p.get('heb') and 'x' not in p)} places; {extra} dictionary places added, {aliased} more names attached to nearby places")
    write("places.json", out)
    print(f"    {sum(1 for p in out if 'lat' in p)} of {len(out)} places have coordinates, "
          f"{sum(1 for p in out if p['zh'])} have a Chinese name")


if __name__ == "__main__":
    print("building data ->", OUT)
    build_routes()
    build_images()
    build_nature()
    build_parallels()
    build_hottp()
    build_places()
