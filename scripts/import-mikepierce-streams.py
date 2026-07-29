#!/usr/bin/env python3
"""Import mikepierce/internet-radio-streams into src/data/internetRadioStreams.json

  python3 scripts/import-mikepierce-streams.py
"""
from __future__ import annotations

import json
import re
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src/data/internetRadioStreams.json"
TREE = "https://api.github.com/repos/mikepierce/internet-radio-streams/git/trees/main?recursive=1"
RAW = "https://raw.githubusercontent.com/mikepierce/internet-radio-streams/main/"

COUNTRY_HINTS = [
    (r"\bBBC\b|NTS|Rinse|Soho Radio|Radio Caroline|Dandelion|Subcity|Worldwide FM", "United Kingdom", "GB"),
    (r"\bFIP\b|France |Radiomeuh|Le Mellotron", "France", "FR"),
    (r"SomaFM|KEXP|WFMU|dublab|The Lot|KSPC|KXLU|KCHUNG|Radio Paradise|Ambient Sleeping|Nightwave|Poolsuite|NASA|Third Rock|Dogglounge|Nightride", "United States", "US"),
    (r"Hirschmilch|Cashmere", "Germany", "DE"),
    (r"Shonen Beach", "Japan", "JP"),
    (r"Kiosk Radio", "Belgium", "BE"),
]

FEATURE = [
    "BBC World Service", "KEXP Seattle Public Radio", "Radio Paradise - Main Mix",
    "SomaFM - Groove Salad", "SomaFM - Drone Zone", "SomaFM - Space Station Soma",
    "NTS 1 London", "NTS 2", "FIP", "France Inter", "France Culture",
    "WFMU", "Rinse FM", "The Lot Radio", "dublab", "Nightwave Plaza",
    "Ambient Sleeping Pill", "Third Rock Radio", "Soho Radio", "Worldwide FM",
    "Radio Caroline", "Cashmere Radio", "Kiosk Radio", "Frisky", "Nightride FM",
]

# Chrome HTML5: prefer real MP3. AAC+ (audio/aacp) often → MEDIA_ELEMENT_ERROR Format error.
URL_OVERRIDES: dict[str, list[str]] = {
    "KEXP Seattle Public Radio": [
        "https://kexp-mp3-128.streamguys1.com/kexp128.mp3",
        "http://live-mp3-128.kexp.org/kexp128.mp3",
    ],
    "dogglounge": [
        "http://dogglounge.com:8000/stream",
    ],
    "SomaFM - Drone Zone": [
        "https://ice2.somafm.com/dronezone-128-mp3",
        "http://ice2.somafm.com/dronezone-128-mp3",
    ],
    "SomaFM - Space Station Soma": [
        "https://ice2.somafm.com/spacestation-128-mp3",
        "http://ice2.somafm.com/spacestation-128-mp3",
    ],
    "SomaFM - Deep Space One": [
        "https://ice2.somafm.com/deepspaceone-128-mp3",
        "http://ice2.somafm.com/deepspaceone-128-mp3",
    ],
    "SomaFM - Illinois Street Lounge": [
        "https://ice2.somafm.com/illstreet-128-mp3",
        "http://ice2.somafm.com/illstreet-128-mp3",
    ],
    "SomaFM - Lush": [
        "https://ice2.somafm.com/lush-128-mp3",
        "http://ice2.somafm.com/lush-128-mp3",
    ],
    "FIP": [
        "https://icecast.radiofrance.fr/fip-midfi.mp3",
        "http://icecast.radiofrance.fr/fip-midfi.mp3",
    ],
}


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "RadioX-Catalog/1.0"})
    return urllib.request.urlopen(req, timeout=20).read()


def score_url(u: str) -> int:
    ul = u.lower()
    if ".m3u8" in ul:
        return -10_000
    s = 5 if ul.startswith("https") else 0
    if "aacp" in ul or "aac+" in ul:
        s -= 40
    if re.search(r"(^|[-_/])aac([_-]|$)|\.aac(\?|$)", ul):
        s -= 15
    if "mp3" in ul or "mpeg" in ul:
        s += 30
    if re.search(r"(^|[-_/.])(ogg|opus)([-_/.?]|$)", ul) or ul.endswith(".ogg"):
        s -= 20
    if "320" in ul:
        s += 4
    elif "192" in ul:
        s += 3
    elif "128" in ul:
        s += 2
    return s


def codec_for(url: str) -> str:
    ul = url.lower()
    # Avoid false positives like "dogglounge"
    if re.search(r"(^|[-_/.])(ogg|opus)([-_/.?]|$)", ul) or ul.endswith(".ogg"):
        return "OGG"
    if re.search(r"(^|[-_/.])aacp?([-_/.?]|$)", ul) or ul.endswith(".aac"):
        return "AAC"
    return "MP3"


def parse_m3u(path: str, text: str) -> list[dict]:
    stations: list[dict] = []
    name = None
    genre = ""
    urls: list[str] = []

    def flush() -> None:
        nonlocal name, genre, urls
        if not name or not urls:
            name, genre, urls = None, "", []
            return
        playable = [u for u in urls if ".m3u8" not in u.lower()]
        if not playable:
            name, genre, urls = None, "", []
            return

        override = URL_OVERRIDES.get(name.strip())
        ranked = sorted(set(playable), key=score_url, reverse=True)
        if override:
            ranked = list(dict.fromkeys(override + ranked))

        best = ranked[0]
        slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:40]
        file_slug = path.replace(".m3u", "").replace("/", "-")
        stations.append({
            "id": f"irs-{file_slug}-{slug}"[:64],
            "name": name.strip(),
            "country": "International",
            "countrycode": "XX",
            "language": "",
            "tags": [t.strip() for t in re.split(r"[,/]", genre) if t.strip()][:6] or ["curated"],
            "url": best,
            "urls": ranked[:5],
            "bitrate": 128,
            "codec": codec_for(best),
            "logo": "",
            "website": "",
            "reliability": 0.97,
            "source": "mikepierce/internet-radio-streams",
            "sourceFile": path,
        })
        name, genre, urls = None, "", []

    for line in text.splitlines():
        line = line.strip()
        if not line or line == "#EXTM3U":
            continue
        if line.startswith("#EXTINF:"):
            flush()
            m = re.match(r"#EXTINF:[^,]*,\s*(.+)$", line)
            name = m.group(1).strip() if m else line.split(",", 1)[-1].strip()
            urls = []
        elif line.startswith("#EXTGENRE:"):
            genre = line.split(":", 1)[1].strip()
        elif line.startswith("#"):
            continue
        elif line.startswith("http"):
            urls.append(line)
    flush()
    return stations


def main() -> None:
    tree = json.loads(fetch(TREE))
    paths = [
        t["path"] for t in tree["tree"]
        if t["path"].endswith(".m3u") and not t["path"].startswith("DEMOTED")
    ]
    stations: list[dict] = []
    for path in paths:
        text = fetch(RAW + path).decode("utf-8", "replace")
        stations.extend(parse_m3u(path, text))
        time.sleep(0.04)

    seen: set[str] = set()
    uniq: list[dict] = []
    for s in stations:
        key = s["name"].lower()
        if key in seen:
            continue
        seen.add(key)
        for pat, country, cc in COUNTRY_HINTS:
            if re.search(pat, s["name"], re.I):
                s["country"], s["countrycode"] = country, cc
                break
        # Apply overrides by name even if m3u order differed
        ov = URL_OVERRIDES.get(s["name"])
        if ov:
            s["urls"] = list(dict.fromkeys(ov + s.get("urls", [])))[:5]
            s["url"] = s["urls"][0]
            s["codec"] = codec_for(s["url"])
        uniq.append(s)

    by_name = {s["name"]: s for s in uniq}
    feature_ids: list[str] = []
    for needle in FEATURE:
        hit = by_name.get(needle)
        if not hit:
            for n, s in by_name.items():
                if needle.lower() in n.lower():
                    hit = s
                    break
        if hit and hit["id"] not in feature_ids:
            feature_ids.append(hit["id"])
    rest = [s["id"] for s in uniq if s["id"] not in feature_ids]

    OUT.write_text(json.dumps({
        "version": "1.1",
        "source": "mikepierce/internet-radio-streams",
        "sourceUrl": "https://github.com/mikepierce/internet-radio-streams",
        "updated": time.strftime("%Y-%m-%d"),
        "stationCount": len(uniq),
        "stations": uniq,
        "playlist": feature_ids + rest,
    }, separators=(",", ":")))
    print(f"Wrote {len(uniq)} stations → {OUT}")
    for name in ("KEXP Seattle Public Radio", "SomaFM - Drone Zone", "dogglounge"):
        s = by_name.get(name)
        if s:
            print(f"  {name}: {s['url']} ({s['codec']})")


if __name__ == "__main__":
    main()
