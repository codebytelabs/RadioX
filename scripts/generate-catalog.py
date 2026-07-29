#!/usr/bin/env python3
"""Regenerate src/data/stationCatalog.json from IPRD catalog.

Usage:
  curl -sL https://iprd-org.github.io/iprd/site_data/metadata/catalog.json -o /tmp/iprd.json
  python3 scripts/generate-catalog.py /tmp/iprd.json
"""
from __future__ import annotations

import json
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src/data/stationCatalog.json"

COUNTRY_CODE = {
    "United States": "US", "United Kingdom": "GB", "France": "FR", "Germany": "DE",
    "Canada": "CA", "Australia": "AU", "Japan": "JP", "India": "IN", "Brazil": "BR",
    "Italy": "IT", "Spain": "ES", "Netherlands": "NL", "Belgium": "BE", "Switzerland": "CH",
    "Sweden": "SE", "Norway": "NO", "Poland": "PL", "Argentina": "AR", "Mexico": "MX",
    "South Africa": "ZA", "Nigeria": "NG", "Kenya": "KE", "Egypt": "EG", "Israel": "IL",
    "Turkey": "TR", "Russia": "RU", "Russian Federation": "RU", "China": "CN",
    "Hong Kong": "HK", "Singapore": "SG", "South Korea": "KR", "New Zealand": "NZ",
    "Ireland": "IE", "Portugal": "PT", "Austria": "AT", "Greece": "GR",
    "Czech Republic": "CZ", "Ukraine": "UA", "Colombia": "CO", "Chile": "CL",
    "Indonesia": "ID", "United Arab Emirates": "AE", "Saudi Arabia": "SA",
}

ICONIC = [
    r"^BBC World Service", r"^BBC Radio [1-6]", r"^France Info", r"^France Inter", r"^FIP",
    r"^RTL$", r"^Europe 1", r"^Deutschlandfunk", r"^Radio 538", r"^NPR",
    r"^Radio Paradise", r"^WNYC", r"^SomaFM", r"^KEXP", r"^CBC Radio 1",
    r"^ABC Radio National", r"^NHK World", r"^RFI ", r"^All India Radio",
    r"^Rai Radio", r"^Classic FM UK", r"^Radio Swiss", r"^Sveriges Radio", r"^NRK P",
    r"^Band FM", r"^Los 40", r"^Antenne Bayern", r"^1LIVE", r"^VRT Radio", r"^WBUR",
]


def best_stream(station: dict) -> dict | None:
    streams = station.get("streams") or []
    if not streams:
        return None
    return max(streams, key=lambda x: (x.get("reliability", 0), x.get("bitrate", 0)))


def score_station(station: dict) -> float:
    stream = best_stream(station)
    if not stream or ".m3u8" in stream["url"].lower():
        return -1
    score = stream.get("reliability", 0) * 100 + min(stream.get("bitrate", 0) or 128, 320) / 10
    for pattern in ICONIC:
        if re.search(pattern, station["name"], re.I):
            score += 500
            break
    tags = " ".join((station.get("tags") or []) + (station.get("genres") or [])).lower()
    if "public radio" in tags or "news" in tags:
        score += 50
    return score


def to_entry(station: dict) -> dict:
    stream = best_stream(station)
    assert stream is not None
    cc = COUNTRY_CODE.get(station["country"], "XX")
    langs = station.get("language") or []
    lang = ", ".join(langs) if isinstance(langs, list) else str(langs)
    tags = list(dict.fromkeys((station.get("tags") or []) + (station.get("genres") or [])))
    return {
        "id": station["id"],
        "name": station["name"],
        "country": station["country"],
        "countrycode": cc,
        "language": lang,
        "tags": tags[:8],
        "url": stream["url"],
        "bitrate": stream.get("bitrate") or 128,
        "codec": stream.get("format") or "MP3",
        "logo": station.get("logo") or "",
        "website": station.get("website") or "",
        "reliability": stream.get("reliability", 0),
    }


def main() -> None:
    src = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/iprd.json")
    data = json.loads(src.read_text())
    stations = data["stations"] if isinstance(data, dict) else data

    scored = sorted(
        [(score_station(s), s) for s in stations if score_station(s) > 0],
        key=lambda x: -x[0],
    )
    seen: set[str] = set()
    cc_counts: dict[str, int] = defaultdict(int)
    catalog: list[dict] = []

    for score, station in scored:
        key = re.sub(r"\s+", " ", station["name"].lower())[:30]
        cc = COUNTRY_CODE.get(station["country"], "XX")
        if key in seen or (cc_counts[cc] >= 8 and score < 500):
            continue
        seen.add(key)
        cc_counts[cc] += 1
        catalog.append(to_entry(station))
        if len(catalog) >= 566:
            break

    playlists: dict[str, list[str]] = {k: [] for k in [
        "global-icons", "public-radio", "world-news", "jazz-blues", "electronic",
        "latin-vibes", "uk-europe", "americas", "asia-pacific", "africa-middle-east",
    ]}

    for entry in catalog:
        tags = " ".join(entry["tags"]).lower()
        cc = entry["countrycode"]
        if entry["reliability"] >= 0.9 and any(re.search(p, entry["name"], re.I) for p in ICONIC[:15]):
            playlists["global-icons"].append(entry["id"])
        if "public radio" in tags or "news" in tags:
            playlists["public-radio"].append(entry["id"])
        if "news" in tags or "talk" in tags:
            playlists["world-news"].append(entry["id"])
        if any(g in tags for g in ["jazz", "blues", "soul", "smooth"]):
            playlists["jazz-blues"].append(entry["id"])
        if any(g in tags for g in ["electronic", "dance", "techno", "house", "ambient"]):
            playlists["electronic"].append(entry["id"])
        if any(g in tags for g in ["latin", "salsa", "reggaeton", "brazil"]):
            playlists["latin-vibes"].append(entry["id"])
        if cc in "GB FR DE IT ES NL BE CH SE NO DK PL AT IE PT".split():
            playlists["uk-europe"].append(entry["id"])
        if cc in "US CA MX BR AR CL CO PE".split():
            playlists["americas"].append(entry["id"])
        if cc in "JP AU NZ IN HK SG KR TH ID PH".split():
            playlists["asia-pacific"].append(entry["id"])
        if cc in "ZA NG KE EG IL TR AE SA".split():
            playlists["africa-middle-east"].append(entry["id"])

    for key in playlists:
        playlists[key] = playlists[key][:60]

    OUT.write_text(json.dumps({
        "version": "1.0",
        "source": "IPRD (24k stations) + Radio Browser",
        "updated": "2026-06-26",
        "stationCount": len(catalog),
        "stations": catalog,
        "playlists": playlists,
    }, separators=(",", ":")))

    print(f"Wrote {len(catalog)} stations -> {OUT} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
