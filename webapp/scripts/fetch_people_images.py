#!/usr/bin/env python3
"""Collect public-domain pictures of the people in data-src/people.txt from Wikimedia Commons.

This is a one-off snapshot, not part of `npm run data`: it needs the network and Wikimedia's API is rate limited.
Run:  python3 webapp/scripts/fetch_people_images.py [id ...]
It writes webapp/data-src/people_images.json (commit that file) and keeps a raw cache in webapp/scripts/.cache/.

Only files whose Commons licence says public domain / CC0 are kept, and each keeps its artist, date and file page so the
web app can show a credit. The pictures themselves are never copied: the app links to Commons.
"""
import html
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(HERE)
CACHE = os.path.join(HERE, ".cache")
OUT = os.path.join(APP, "data-src", "people_images.json")
API = "https://commons.wikimedia.org/w/api.php"
UA = "BibleGeographySermonApp/0.1 (personal sermon preparation; allens920181@gmail.com)"
PER_PERSON = 8
PAUSE = 1.0


def call(params, tries=6):
    params = {**params, "format": "json"}
    url = API + "?" + urllib.parse.urlencode(params)
    key = os.path.join(CACHE, re.sub(r"[^A-Za-z0-9]+", "_", url)[-180:] + ".json")
    if os.path.exists(key):
        with open(key, encoding="utf-8") as fh:
            return json.load(fh)
    for i in range(tries):
        time.sleep(PAUSE)
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=40) as r:
                data = json.load(r)
            os.makedirs(CACHE, exist_ok=True)
            with open(key, "w", encoding="utf-8") as fh:
                json.dump(data, fh)
            return data
        except Exception as e:  # rate limit (429) or a hiccup: back off and retry
            wait = 8 * (i + 1)
            print(f"    retry in {wait}s ({e})", flush=True)
            time.sleep(wait)
    return {}


def strip(s):
    return html.unescape(re.sub(r"<[^>]+>", "", s or "")).strip()


IIPROPS = {"prop": "imageinfo", "iiprop": "url|size|mime|extmetadata"}


def parse_pages(d):
    """Images that pass the licence / size / format checks from a query result that includes imageinfo."""
    out = []
    for p in d.get("query", {}).get("pages", {}).values():
        ii = (p.get("imageinfo") or [None])[0]
        if not ii:
            continue
        em = ii.get("extmetadata", {})
        lic = (em.get("LicenseShortName", {}).get("value") or "").lower()
        if ii.get("mime") not in ("image/jpeg", "image/png") or ii.get("width", 0) < 400 or ii.get("height", 0) < 400:
            continue
        if not ("public domain" in lic or lic.startswith("pd") or lic.startswith("cc0")):
            continue
        title = strip(em.get("ObjectName", {}).get("value")) or re.sub(r"^File:|\.\w+$", "", p["title"])
        out.append({
            "file": p["title"][5:],
            "title": title[:140],
            "artist": strip(em.get("Artist", {}).get("value"))[:100],
            "date": strip(em.get("DateTimeOriginal", {}).get("value"))[:40],
            "desc": strip(em.get("ImageDescription", {}).get("value"))[:200],
            "license": em.get("LicenseShortName", {}).get("value", ""),
            "w": ii["width"], "h": ii["height"],
            "page": ii.get("descriptionurl", ""),
        })
    return out


def category_for(name):
    """The 'X in art' category on Commons, if it exists (one request for all the usual spellings)."""
    titles = [f"Category:{name} in art", f"Category:{name} (biblical figure) in art", f"Category:{name} (biblical figure)"]
    d = call({"action": "query", "titles": "|".join(titles), "prop": "info"})
    found = {p["title"] for p in d.get("query", {}).get("pages", {}).values() if "missing" not in p}
    return next((t for t in titles if t in found), None)


def category_images(cat):
    """Files directly in the category and in its first few sub-categories."""
    d = call({"action": "query", "list": "categorymembers", "cmtitle": cat, "cmtype": "subcat", "cmlimit": 30})
    cats = [cat] + [m["title"] for m in d.get("query", {}).get("categorymembers", [])][:6]
    out = []
    for c in cats:
        out += parse_pages(call({"action": "query", "generator": "categorymembers", "gcmtitle": c, "gcmtype": "file", "gcmlimit": 40, **IIPROPS}))
    return out


def search_images(query):
    return parse_pages(call({"action": "query", "generator": "search", "gsrnamespace": 6, "gsrlimit": 40, "gsrsearch": query, **IIPROPS}))


def score(img):
    """Prefer well-described paintings with a known artist over snapshots of museum labels and the like."""
    s = 0
    if img["artist"]:
        s += 2
    if img["desc"]:
        s += 1
    if img["date"]:
        s += 1
    if re.search(r"\b(detail|crop|label|sign|stamp|map|diagram|icon of the day)\b", img["title"].lower()):
        s -= 3
    return s - abs(img["w"] / img["h"] - 0.9) * 0.2


def main(only):
    people = []
    with open(os.path.join(APP, "data-src", "people.txt"), encoding="utf-8") as fh:
        for line in fh:
            if "|" in line and not line.startswith("#"):
                pid, zh, en, *_ = line.rstrip("\n").split("|")
                people.append((pid, zh, en))
    result = {}
    if os.path.exists(OUT):
        with open(OUT, encoding="utf-8") as fh:
            result = json.load(fh)
    for pid, zh, en in people:
        if only and pid not in only:
            continue
        name = re.sub(r"\s*\(.*?\)|,.*$", "", en).strip()
        cat = category_for(name)
        found = category_images(cat) if cat else []
        found += search_images(f'"{name}" painting filetype:bitmap')
        found += search_images(f'"{name}" biblical art filetype:bitmap')
        seen, imgs = set(), []
        for im in found:
            if im["file"] not in seen:
                seen.add(im["file"])
                imgs.append(im)
        imgs.sort(key=score, reverse=True)
        result[pid] = {"category": cat or "", "images": imgs[:PER_PERSON]}
        print(f"{pid:<16} {len(imgs):3d} usable, kept {len(result[pid]['images'])}  [{cat}]", flush=True)
        with open(OUT, "w", encoding="utf-8") as fh:
            json.dump(result, fh, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main(set(sys.argv[1:]))
