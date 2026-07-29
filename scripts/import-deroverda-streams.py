#!/usr/bin/env python3
"""Import deroverda/recommended-radio-streams into src/data/deroverdaStreams.json

  python3 scripts/import-deroverda-streams.py
"""
from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src/data/deroverdaStreams.json"
TREE = "https://api.github.com/repos/deroverda/recommended-radio-streams/git/trees/main?recursive=1"
RAW = "https://raw.githubusercontent.com/deroverda/recommended-radio-streams/main/"

# Skip bulky / thin playlists that don't add much for RadioX shelves
SKIP_PLAYLISTS = {
    "playlists/christmas-holiday.m3u",
    "playlists/multi-station-networks.m3u",
}

GROUP_TAGS = {
    "Ambient, Lo-Fi & Chill": ["ambient", "lo-fi", "chill"],
    "Campus & Public Radio": ["public radio", "college", "community"],
    "Classical & Opera": ["classical", "opera"],
    "Decades, Oldies & Nostalgia": ["oldies", "decades"],
    "Electronic": ["electronic"],
    "Experimental, Nerdy & Scanners": ["experimental"],
    "Funk, Soul, Hip-Hop & Disco": ["funk", "soul", "hip-hop", "disco"],
    "Global Independent Online Communities": ["independent", "online"],
    "Jazz & Blues": ["jazz", "blues"],
    "Metal & Heavy": ["metal"],
    "News & Spoken Word": ["news", "talk"],
    "Reggae & Dub": ["reggae", "dub"],
    "Rock, Indie, Alternative, Country & Folk": ["rock", "indie", "alternative"],
    "Video Game, Chiptune & Soundtracks": ["chiptune", "soundtrack", "gaming"],
    "World & Regional": ["world"],
}


def fetch(url: str, timeout: int = 25) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "RadioX-Catalog/1.0"})
    return urllib.request.urlopen(req, timeout=timeout).read()


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
    if re.search(r"(^|[-_/.])(ogg|opus)([-_/.?]|$)", ul) or ul.endswith(".ogg"):
        return "OGG"
    if re.search(r"(^|[-_/.])aacp?([-_/.?]|$)", ul) or ul.endswith(".aac"):
        return "AAC"
    return "MP3"


def resolve_playlist_url(url: str) -> list[str]:
    """Expand .m3u / .pls wrappers into concrete stream URLs."""
    ul = url.lower().split("?", 1)[0]
    if not (ul.endswith(".m3u") or ul.endswith(".pls") or ul.endswith(".m3u8")):
        return [url]
    if ul.endswith(".m3u8"):
        return []  # skip HLS wrappers as primary
    try:
        text = fetch(url, timeout=12).decode("utf-8", "replace")
    except (urllib.error.URLError, TimeoutError, OSError):
        return []
    found: list[str] = []
    for line in text.splitlines():
        line = line.strip().rstrip(",")
        if not line or line.startswith("#"):
            continue
        if line.lower().startswith("file"):
            # PLS: File1=http://...
            if "=" in line:
                line = line.split("=", 1)[1].strip()
        if line.startswith("http") and ".m3u8" not in line.lower():
            found.append(line)
    return found[:5]


def clean_url(url: str) -> str:
    return url.strip().rstrip(",").strip()


def parse_m3u(path: str, text: str) -> list[dict]:
    stations: list[dict] = []
    name = None
    group = ""
    homepage = ""
    urls: list[str] = []

    def flush() -> None:
        nonlocal name, group, homepage, urls
        if not name or not urls:
            name, group, homepage, urls = None, "", "", []
            return

        expanded: list[str] = []
        for u in urls:
            u = clean_url(u)
            if not u.startswith("http"):
                continue
            resolved = resolve_playlist_url(u)
            if resolved:
                expanded.extend(resolved)
            elif ".m3u8" not in u.lower() and not u.lower().endswith((".m3u", ".pls")):
                expanded.append(u)
            time.sleep(0.05)

        playable = [u for u in dict.fromkeys(expanded) if ".m3u8" not in u.lower()]
        if not playable:
            name, group, homepage, urls = None, "", "", []
            return

        ranked = sorted(playable, key=score_url, reverse=True)
        best = ranked[0]
        tags = list(GROUP_TAGS.get(group, []))
        if group and group.lower() not in {t.lower() for t in tags}:
            tags = [group.lower()] + tags
        tags = list(dict.fromkeys(tags))[:6] or ["curated"]

        slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:40]
        file_slug = path.replace("playlists/", "").replace(".m3u", "")
        stations.append({
            "id": f"drv-{file_slug}-{slug}"[:64],
            "name": name.strip(),
            "country": "International",
            "countrycode": "XX",
            "language": "",
            "tags": tags,
            "url": best,
            "urls": ranked[:5],
            "bitrate": 128,
            "codec": codec_for(best),
            "logo": "",
            "website": homepage,
            "reliability": 0.96,
            "source": "deroverda/recommended-radio-streams",
            "_sourceFile": path,
        })
        name, group, homepage, urls = None, "", "", []

    for line in text.splitlines():
        line = line.strip()
        if not line or line == "#EXTM3U":
            continue
        if line.startswith("# Group:"):
            group = line.split(":", 1)[1].strip()
            continue
        if line.startswith("# Homepage:"):
            homepage = line.split(":", 1)[1].strip()
            continue
        if line.startswith("#EXTINF:"):
            flush()
            # #EXTINF:-1 group-title="Ambient, Lo-Fi & Chill",9128
            m = re.match(
                r'#EXTINF:-?\d+(?:\s+group-title="([^"]*)")?\s*,\s*(.+)$',
                line,
            )
            if m:
                if m.group(1):
                    group = m.group(1).strip() or group
                name = m.group(2).strip()
            else:
                # Fallback: last comma separates title (group-title commas already quoted)
                name = line.rsplit(",", 1)[-1].strip()
            urls = []
            continue
        if line.startswith("#"):
            continue
        if line.startswith("http"):
            urls.append(line)
    flush()
    return stations


def main() -> None:
    tree = json.loads(fetch(TREE))
    paths = sorted(
        t["path"]
        for t in tree["tree"]
        if t["path"].endswith(".m3u") and t["path"] not in SKIP_PLAYLISTS
    )

    stations: list[dict] = []
    for path in paths:
        print(f"fetch {path}")
        text = fetch(RAW + path).decode("utf-8", "replace")
        parsed = parse_m3u(path, text)
        print(f"  -> {len(parsed)} stations")
        stations.extend(parsed)
        time.sleep(0.15)

    # Drop stations already in IRS (same stream URL)
    irs_path = ROOT / "src/data/internetRadioStreams.json"
    irs_urls: set[str] = set()
    if irs_path.exists():
        irs = json.loads(irs_path.read_text())
        for s in irs.get("stations", []):
            for u in [s.get("url", ""), *(s.get("urls") or [])]:
                if u:
                    irs_urls.add(re.sub(r"^https?://", "", u.lower().rstrip("/").split("?", 1)[0]))

    def url_key(u: str) -> str:
        return re.sub(r"^https?://", "", u.lower().rstrip("/").split("?", 1)[0])

    # Dedupe by normalized name + host; skip IRS URL overlaps
    seen: set[str] = set()
    unique: list[dict] = []
    skipped_irs = 0
    for s in stations:
        if url_key(s["url"]) in irs_urls or any(url_key(u) in irs_urls for u in s.get("urls", [])):
            skipped_irs += 1
            continue
        key = re.sub(r"[^a-z0-9]+", "", s["name"].lower()) + "|" + s["url"].split("/")[2].lower()
        if key in seen:
            continue
        seen.add(key)
        unique.append(s)
    print(f"skipped {skipped_irs} already in IRS")

    # Featured-ish playlist: campus/public + electronic + jazz + ambient heads
    playlist: list[str] = []
    for prefer in ("campus-public-radio", "electronic", "jazz-blues", "ambient-lo-fi-chill"):
        for s in unique:
            src = s.get("_sourceFile", "")
            if prefer in src and s["id"] not in playlist:
                playlist.append(s["id"])
            if len(playlist) >= 40:
                break
        if len(playlist) >= 40:
            break

    for s in unique:
        s.pop("_sourceFile", None)

    out = {
        "version": "1.0.0",
        "source": "deroverda/recommended-radio-streams",
        "sourceUrl": "https://github.com/deroverda/recommended-radio-streams",
        "license": "CC0-1.0",
        "updated": time.strftime("%Y-%m-%d"),
        "stationCount": len(unique),
        "stations": unique,
        "playlist": playlist[:40],
    }
    OUT.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n")
    print(f"wrote {OUT} ({len(unique)} stations)")


if __name__ == "__main__":
    main()
