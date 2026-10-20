#!/usr/bin/env python3
"""Download the Bible story illustrations from https://1535000.org (the Chinese Free Bible Images site) for personal use.

The site (a UK charity, FreeBibleimages) says its pictures are free for teaching and personal use, and that some
collections forbid commercial use without the artist's written permission. So:

  * the pictures are saved to webapp/public/stories/ and the list to webapp/public/data/stories.json,
    both of which are git-ignored on purpose -- do not commit or publish them;
  * the script is polite: one request at a time, a pause between requests, and it skips files it already has.

Run:  python3 webapp/scripts/fetch_stories.py [story-number ...]     (e.g. 201 204; no arguments = every story)
"""
import base64
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
BASE = "https://1535000.org"
UA = "Mozilla/5.0 (compatible; personal-sermon-prep; allens920181@gmail.com)"
PAUSE = 0.4
IMG_DIR = os.path.join(APP, "public", "stories")
OUT = os.path.join(APP, "public", "data", "stories.json")

with open(os.path.join(APP, "src", "lib", "books.json"), encoding="utf-8") as fh:
    BOOKS = json.load(fh)

# Traditional -> simplified for the characters used in the 66 book names, so "创世记1-2章" can be matched
T2S = dict(zip("創記約書師歷傳賽耶結彌鴻該亞瑪猶啟羅後門來腓帖詩箴歌哀但何珥摩俄哈番太可路徒林弗西多彼雅撒尼斯拉伯", "创记约书师历传赛耶结弥鸿该亚玛犹启罗后门来腓帖诗箴歌哀但何珥摩俄哈番太可路徒林弗西多彼雅撒尼斯拉伯"))
T2S.update({"約": "约", "書": "书", "傳": "传", "後": "后", "撒": "撒", "亞": "亚", "瑪": "玛", "該": "该", "鴻": "鸿", "彌": "弥", "結": "结"})
simp = lambda s: "".join(T2S.get(c, c) for c in s)
BOOK_BY_NAME = {}
for b in BOOKS:
    BOOK_BY_NAME[b["zh"]] = b["n"]
    BOOK_BY_NAME[simp(b["zh"])] = b["n"]
NAMES = sorted(BOOK_BY_NAME, key=len, reverse=True)


def get(url, binary=False):
    time.sleep(PAUSE)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    for i in range(4):
        try:
            with urllib.request.urlopen(req, timeout=40) as r:
                data = r.read()
            return data if binary else data.decode("utf-8")
        except Exception as e:
            print(f"    retry ({e})", flush=True)
            time.sleep(5 * (i + 1))
    raise RuntimeError(url)


def parse_reference(text):
    """'创世记4:1-15' / '创世记1-2章' / '创世记43-46' -> [[from, to]] as UBS BBBCCCVVV integers (empty when unparsable)."""
    t = re.sub(r"\s+", "", text.replace("\n", ""))
    for name in NAMES:
        if t.startswith(name):
            n, rest = BOOK_BY_NAME[name], t[len(name):].replace("章", "").replace("节", "")
            m = re.match(r"^(\d+)(?::(\d+))?(?:[-–](\d+)(?::(\d+))?)?$", rest)
            if not m:
                return []
            b, c1 = n * 1_000_000, int(m.group(1))
            if m.group(2) is None:
                return [[b + c1 * 1000, b + (int(m.group(3)) if m.group(3) else c1) * 1000 + 999]]
            v1 = b + c1 * 1000 + int(m.group(2))
            if m.group(3) is None:
                return [[v1, v1]]
            if m.group(4) is not None:
                return [[v1, b + int(m.group(3)) * 1000 + int(m.group(4))]]
            return [[v1, b + c1 * 1000 + int(m.group(3))]]
    return []


def main(only):
    home = get(BASE + "/")
    stories = json.loads(base64.b64decode(re.search(r'stories="([^"]+)"', home).group(1)))
    out = []
    for s in stories:
        sid = s["folder"].split("_")[0]
        if only and sid not in only:
            continue
        page = get(f"{BASE}/{urllib.parse.quote(s['licence'])}/{urllib.parse.quote(s['name_local'])}")
        slides = re.findall(r'<a href="(/storydata/[^"?]+/overview-images/[^"?]+)[^"]*"[^>]*data-slideshow-caption="([^"]*)"', page)
        os.makedirs(os.path.join(IMG_DIR, sid), exist_ok=True)
        rows = []
        for i, (path, caption) in enumerate(slides, 1):
            dest = os.path.join(IMG_DIR, sid, f"{i:02d}.jpg")
            if not os.path.exists(dest):
                with open(dest, "wb") as fh:
                    fh.write(get(BASE + urllib.parse.quote(path), binary=True))
            caption = re.sub(r"\s*&ndash;\s*幻灯片\s*\d+\s*$", "", html.unescape(caption)).strip()
            rows.append({"n": i, "caption": caption})
        out.append({"id": sid, "name": s["name_local"], "ref": s["reference_local"].replace("\n", " "), "refs": parse_reference(s["reference_local"]),
                    "licence": s["licence"], "slides": rows})
        print(f"{sid} {s['name_local']:<20} {len(rows)}/{s['max_image_number']} images  refs={out[-1]['refs']}", flush=True)
    if only and os.path.exists(OUT):  # partial run: keep the stories fetched earlier
        with open(OUT, encoding="utf-8") as fh:
            keep = [x for x in json.load(fh) if x["id"] not in {o["id"] for o in out}]
        out = sorted(keep + out, key=lambda x: x["id"])
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, separators=(",", ":"))
    print(f"wrote {OUT}: {len(out)} stories")


if __name__ == "__main__":
    main(set(sys.argv[1:]))
