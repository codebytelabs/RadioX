#!/usr/bin/env node
/**
 * Rebuild region playlists in stationCatalog.json from World Top seeds + Radio Browser.
 * Usage: node scripts/rebuild-region-playlists.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CATALOG = path.join(ROOT, 'src/data/stationCatalog.json');
const SNAPSHOT = path.join(ROOT, 'src/data/worldTopSnapshot.json');
const WORLD_TOP_TS = path.join(ROOT, 'src/data/worldTop.ts');
const API = 'https://all.api.radio-browser.info';

const REGION_PLAYLISTS = {
  'uk-europe': ['uk-ie', 'fr', 'de-at-ch', 'benelux-nordics', 'south-central-eu'],
  americas: ['north-america', 'latam'],
  'asia-pacific': ['asia-pacific'],
  'africa-middle-east': ['africa-mena'],
};

const REGION_CCS = {
  'uk-europe': ['GB', 'IE', 'FR', 'DE', 'AT', 'CH', 'NL', 'BE', 'SE', 'NO', 'DK', 'FI', 'IT', 'ES', 'PT', 'PL', 'CZ', 'RO', 'GR', 'HU', 'UA', 'SK', 'BG', 'HR', 'RS', 'SI', 'BA', 'LV', 'EE', 'LT'],
  americas: ['US', 'CA', 'MX', 'AR', 'BR', 'CL', 'CO', 'PE', 'VE', 'EC', 'UY', 'DO'],
  'asia-pacific': ['AU', 'NZ', 'JP', 'HK', 'IN', 'SG', 'MY', 'KR', 'TW', 'PH', 'ID', 'AF'],
  'africa-middle-east': ['ZA', 'NG', 'KE', 'UG', 'AE', 'IL', 'TR', 'EG', 'MA', 'GH', 'SA', 'FR'],
};

const ARTIST_SPAM =
  /^(abba|ac\/dc|2pac|50 cent|a-ha|10cc|adam lambert|a\.r\. rahman|sharjah quran)\b/i;
const BAD_NAME = /^\d|^(1|2)\s?mini|verkehrsradio|quran|hymns/i;

function parseSeeds(src) {
  const re =
    /uuid: '([^']+)', expectName: '([^']+)', display: '([^']+)', cc: '([^']+)', region: '([^']+)', tier: ([12])/g;
  const seeds = [];
  let m;
  while ((m = re.exec(src))) {
    seeds.push({
      uuid: m[1],
      expectName: m[2],
      display: m[3],
      cc: m[4],
      region: m[5],
      tier: Number(m[6]),
    });
  }
  return seeds;
}

function brandKey(name) {
  const original = name.toLowerCase();
  let s = original
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*]/g, ' ')
    .replace(/\b(hd|hq|mp3|aac|aacp|aac\+|opus|ogg|flac|\d+k|\d+kbps|kbps|stream|live|low|high|mobile|eu|us|uk)\b/gi, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return s || original.trim();
}

function isExcluded(name) {
  return BAD_NAME.test(name) || ARTIST_SPAM.test(name);
}

function isPublicish(s) {
  const hay = `${s.name} ${s.tags || ''}`.toLowerCase();
  return /npr|public radio|bbc|cbc|abc|rai|ard|zdf|swr|wdr|ndr|vrt|npo|sveriges|nrk|dr |yle|rtve|rte|rthk|nhk|sabc|deutschlandfunk|france (inter|info|culture|musique)|rnz|rfi|wnyc|wbez|wbur|kpfa|wamu/.test(
    hay
  );
}

function isNewsish(s) {
  const hay = `${s.name} ${s.tags || ''}`.toLowerCase();
  return /\b(news|talk|information|info|actualit|noticias|nachrichten|haber)\b/.test(hay);
}

async function rbSearch(params) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${API}/json/stations/search?${qs}`, {
    headers: { 'User-Agent': 'RadioX-Chrome-Extension/1.0' },
  });
  if (!res.ok) return [];
  return res.json();
}

function upsertStation(catalog, snap) {
  const id = `rb-${snap.uuid.slice(0, 8)}`;
  let entry = catalog.stations.find(
    (s) => s.radioBrowserUuid === snap.uuid || s.id === id
  );
  if (!entry) {
    entry = {
      id,
      name: snap.display || snap.name,
      country: snap.country || '',
      countrycode: snap.countrycode || '',
      language: '',
      tags: (snap.tags || '').split(',').map((t) => t.trim()).filter(Boolean).slice(0, 8),
      url: snap.url,
      bitrate: snap.bitrate || 0,
      codec: snap.codec || 'MP3',
      logo: snap.favicon || '',
      website: snap.homepage || '',
      reliability: 0.95,
      radioBrowserUuid: snap.uuid,
      source: 'radio-browser',
    };
    catalog.stations.push(entry);
  } else {
    if (!entry.logo && snap.favicon) entry.logo = snap.favicon;
    if (!entry.website && snap.homepage) entry.website = snap.homepage;
    if (!entry.url && snap.url) entry.url = snap.url;
    entry.radioBrowserUuid = snap.uuid;
  }
  return entry.id;
}

function jaccard(a, b) {
  const A = new Set(a);
  const B = new Set(b);
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

async function main() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));
  const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8'));
  const seeds = parseSeeds(fs.readFileSync(WORLD_TOP_TS, 'utf8'));
  const snapByUuid = new Map(snapshot.stations.map((s) => [s.uuid, s]));

  catalog.playlists = catalog.playlists || {};

  // Seed region playlists from World Top
  for (const [playlistId, regions] of Object.entries(REGION_PLAYLISTS)) {
    const ids = [];
    const seenBrand = new Set();
    const ccCount = new Map();

    for (const seed of seeds.filter((s) => regions.includes(s.region))) {
      const snap = snapByUuid.get(seed.uuid);
      if (!snap?.url) continue;
      if (isExcluded(snap.display || snap.name)) continue;
      const bk = brandKey(snap.display || snap.name);
      if (seenBrand.has(bk)) continue;
      const cc = snap.countrycode || seed.cc;
      if ((ccCount.get(cc) || 0) >= 4) continue;
      const id = upsertStation(catalog, { ...snap, display: seed.display });
      ids.push(id);
      seenBrand.add(bk);
      ccCount.set(cc, (ccCount.get(cc) || 0) + 1);
    }

    // Fill from RB by country
    const ccs = REGION_CCS[playlistId] || [];
    for (const cc of ccs) {
      if (ids.length >= 48) break;
      try {
        const rows = await rbSearch({
          countrycode: cc,
          limit: '40',
          hidebroken: 'true',
          order: 'clickcount',
          reverse: 'true',
        });
        for (const s of rows) {
          if (ids.length >= 48) break;
          if (s.hls === 1) continue;
          if ((s.url_resolved || s.url || '').includes('.m3u8')) continue;
          if (isExcluded(s.name)) continue;
          if (s.bitrate > 0 && s.bitrate < 48) continue;
          const bk = brandKey(s.name);
          if (seenBrand.has(bk)) continue;
          if ((ccCount.get(cc) || 0) >= 4) continue;
          const id = upsertStation(catalog, {
            uuid: s.stationuuid,
            name: s.name,
            display: s.name,
            country: s.country,
            countrycode: s.countrycode,
            url: s.url_resolved || s.url,
            favicon: s.favicon,
            homepage: s.homepage,
            bitrate: s.bitrate,
            codec: s.codec,
            tags: s.tags,
          });
          ids.push(id);
          seenBrand.add(bk);
          ccCount.set(cc, (ccCount.get(cc) || 0) + 1);
        }
      } catch (e) {
        console.warn('fill failed', cc, e.message);
      }
    }

    catalog.playlists[playlistId] = ids;
    console.log(`${playlistId}: ${ids.length} stations (starts: ${ids.slice(0, 3).join(', ')})`);
  }

  // public-radio
  {
    const ids = [];
    const seen = new Set();
    for (const seed of seeds) {
      const snap = snapByUuid.get(seed.uuid);
      if (!snap?.url) continue;
      if (!isPublicish({ name: seed.display, tags: snap.tags })) continue;
      const bk = brandKey(seed.display);
      if (seen.has(bk)) continue;
      ids.push(upsertStation(catalog, { ...snap, display: seed.display }));
      seen.add(bk);
      if (ids.length >= 40) break;
    }
    catalog.playlists['public-radio'] = ids;
    console.log(`public-radio: ${ids.length}`);
  }

  // world-news
  {
    const ids = [];
    const seen = new Set();
    const publicSet = new Set(catalog.playlists['public-radio']);
    for (const seed of seeds) {
      const snap = snapByUuid.get(seed.uuid);
      if (!snap?.url) continue;
      if (!isNewsish({ name: seed.display, tags: snap.tags })) continue;
      const bk = brandKey(seed.display);
      if (seen.has(bk)) continue;
      const id = upsertStation(catalog, { ...snap, display: seed.display });
      ids.push(id);
      seen.add(bk);
      if (ids.length >= 40) break;
    }
    // ensure not too similar to public-radio
    let overlap = jaccard(ids, [...publicSet]);
    if (overlap >= 0.4) {
      // drop overlapping ids preferring unique news
      const filtered = ids.filter((id) => !publicSet.has(id));
      // re-add some non-overlap from seeds that are news/talk brands
      for (const seed of seeds) {
        if (filtered.length >= 30) break;
        const snap = snapByUuid.get(seed.uuid);
        if (!snap?.url) continue;
        const name = seed.display.toLowerCase();
        if (!/news|info|talk|cnn|bloomberg|fox|lbc|times radio|talksport|france info|bbc world/.test(name)) continue;
        const id = upsertStation(catalog, { ...snap, display: seed.display });
        if (publicSet.has(id)) continue;
        if (filtered.includes(id)) continue;
        filtered.push(id);
      }
      catalog.playlists['world-news'] = filtered;
      overlap = jaccard(filtered, [...publicSet]);
    } else {
      catalog.playlists['world-news'] = ids;
    }
    console.log(`world-news: ${catalog.playlists['world-news'].length} jaccard=${overlap.toFixed(2)}`);
    if (overlap >= 0.4) {
      console.error('Jaccard overlap public-radio vs world-news still >= 0.4');
      process.exit(1);
    }
  }

  // Keep existing genre playlists if present; lightly clean artist spam
  for (const gid of ['jazz-blues', 'electronic', 'latin-vibes', 'global-icons', 'quality-picks']) {
    if (!catalog.playlists[gid]) continue;
    // quality-picks is IRS — leave alone
    if (gid === 'quality-picks') continue;
  }

  catalog.updated = new Date().toISOString().slice(0, 10);
  catalog.stationCount = catalog.stations.length;
  fs.writeFileSync(CATALOG, JSON.stringify(catalog, null, 2) + '\n');
  console.log(`Wrote ${CATALOG} (${catalog.stationCount} stations)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
