#!/usr/bin/env node
/**
 * Expand Radio Browser catalog → stationCatalog.core.json + stationCatalog.atlas.json
 * Usage: node scripts/expand-catalog.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'src/data');
const LEGACY = path.join(DATA, 'stationCatalog.json');
const CORE_OUT = path.join(DATA, 'stationCatalog.core.json');
const ATLAS_OUT = path.join(DATA, 'stationCatalog.atlas.json');
const WORLD_TOP_TS = path.join(DATA, 'worldTop.ts');
const UA = 'RadioX-Chrome-Extension/2.6.0';
const API = 'https://all.api.radio-browser.info';
const MAX_PER_COUNTRY = 40;
const THROTTLE_MS = 250;
const CORE_BUDGET = 400 * 1024;

/** Top-60 by station presence / listenership on Radio Browser. */
const TOP60 = [
  'US', 'DE', 'FR', 'GB', 'BR', 'IT', 'ES', 'PL', 'NL', 'CA',
  'AU', 'MX', 'AR', 'IN', 'RU', 'JP', 'TR', 'SE', 'BE', 'CH',
  'AT', 'PT', 'CZ', 'RO', 'GR', 'HU', 'NO', 'DK', 'FI', 'IE',
  'NZ', 'ZA', 'CL', 'CO', 'PH', 'ID', 'KR', 'TW', 'UA', 'SK',
  'BG', 'HR', 'RS', 'SI', 'PE', 'VE', 'EC', 'UY', 'NG', 'EG',
  'MA', 'GH', 'KE', 'UG', 'IL', 'AE', 'SG', 'MY', 'HK', 'LT',
];

/** Countries that previously had zero coverage — force include. */
const FORCE_CC = [
  'RO', 'RS', 'HU', 'UG', 'UA', 'BG', 'HR', 'SK', 'VE', 'EC',
  'UY', 'BA', 'SI', 'LV', 'AF', 'EE', 'DO', 'LT',
];

const COUNTRIES = [...new Set([...TOP60, ...FORCE_CC])];

const FARM_NAME =
  /\b(vinyl hd|old time radio|walm|mangoradio|reyfm|dance ?wave|adroit jazz|toritune|laut\.fm)\b/i;
const STRIP =
  /\b(hd|hq|mp3|aac|aacp|aac\+|opus|ogg|flac|\d+k|\d+kbps|kbps|stream|live|low|high|mobile|eu|us|uk)\b/gi;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function brandKey(name) {
  const original = name.toLowerCase();
  const s = original
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*]/g, ' ')
    .replace(STRIP, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return s || original.trim();
}

function farmScore(s) {
  let score = 0;
  const clicks = Math.max(s.clickcount || 0, 1);
  const votes = s.votes || 0;
  if (votes / clicks > 300 && votes > 50_000) score += 0.6;
  if (FARM_NAME.test(s.name || '')) score += 0.9;
  if (votes > 100_000 && (s.clickcount || 0) < 50) score += 0.3;
  return Math.min(1, score);
}

function isHls(url) {
  return (url || '').toLowerCase().includes('.m3u8') || (url || '').toLowerCase().includes('hls');
}

function trimEntry(s) {
  const url = s.url_resolved || s.url || '';
  const tags = String(s.tags || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 6);
  return {
    id: s.stationuuid,
    name: s.name,
    country: s.country || '',
    countrycode: (s.countrycode || '').toUpperCase(),
    language: s.language || '',
    tags,
    url,
    bitrate: s.bitrate || 0,
    codec: s.codec || '',
    logo: s.favicon || '',
    website: s.homepage || '',
    reliability: s.lastcheckok === 1 ? 1 : 0,
    radioBrowserUuid: s.stationuuid,
    source: 'radio-browser',
    clickcount: s.clickcount || 0,
  };
}

function parseWorldUuids(src) {
  const re = /uuid: '([^']+)'/g;
  const out = new Set();
  let m;
  while ((m = re.exec(src))) out.add(m[1]);
  return out;
}

async function fetchCountry(cc) {
  const url =
    `${API}/json/stations/search?countrycode=${cc}` +
    `&hidebroken=true&order=clickcount&reverse=true&limit=120`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${cc}`);
  return res.json();
}

function filterStation(s) {
  const url = s.url_resolved || s.url || '';
  if (!url) return false;
  if (isHls(url) || Number(s.hls) === 1) return false;
  const br = Number(s.bitrate) || 0;
  if (br !== 0 && br < 48) return false;
  if (farmScore(s) >= 0.5) return false;
  return true;
}

function loadLegacyPlaylists() {
  try {
    const data = JSON.parse(fs.readFileSync(LEGACY, 'utf8'));
    return data.playlists || {};
  } catch {
    return {};
  }
}

function loadLegacyStations() {
  try {
    const data = JSON.parse(fs.readFileSync(LEGACY, 'utf8'));
    return data.stations || [];
  } catch {
    return [];
  }
}

async function main() {
  const worldUuids = parseWorldUuids(fs.readFileSync(WORLD_TOP_TS, 'utf8'));
  const playlists = loadLegacyPlaylists();
  const playlistIds = new Set(Object.values(playlists).flat());
  const legacy = loadLegacyStations();

  const byId = new Map();
  for (const e of legacy) {
    byId.set(e.id, { ...e, source: e.source || 'legacy' });
  }

  const ccOk = new Set();
  const ccFail = [];

  for (let i = 0; i < COUNTRIES.length; i++) {
    const cc = COUNTRIES[i];
    process.stdout.write(`[${i + 1}/${COUNTRIES.length}] ${cc}… `);
    try {
      const rows = await fetchCountry(cc);
      const brands = new Set();
      let kept = 0;
      for (const s of rows) {
        if (!filterStation(s)) continue;
        const key = brandKey(s.name);
        if (brands.has(key)) continue;
        brands.add(key);
        const entry = trimEntry(s);
        byId.set(entry.id, entry);
        kept++;
        if (kept >= MAX_PER_COUNTRY) break;
      }
      ccOk.add(cc);
      console.log(`${kept} kept (${rows.length} raw)`);
    } catch (err) {
      ccFail.push(cc);
      console.log(`FAIL ${err.message}`);
    }
    await sleep(THROTTLE_MS);
  }

  // Ensure force countries appear even if API returned nothing useful — keep any legacy
  for (const cc of FORCE_CC) {
    const has = [...byId.values()].some((s) => s.countrycode === cc);
    if (!has) console.warn(`WARN: no stations for force country ${cc}`);
  }

  const all = [...byId.values()];
  const coreIds = new Set();

  for (const id of playlistIds) {
    if (byId.has(id)) coreIds.add(id);
  }
  for (const uuid of worldUuids) {
    if (byId.has(uuid)) coreIds.add(uuid);
  }

  // Fill core with high-click + iconic until budget
  const ranked = all
    .filter((s) => !coreIds.has(s.id))
    .sort((a, b) => (b.clickcount || 0) - (a.clickcount || 0));

  let coreStations = all.filter((s) => coreIds.has(s.id));
  const atlasCandidates = [];

  function payloadSize(stations) {
    return Buffer.byteLength(
      JSON.stringify({
        version: '2.6.0',
        source: 'Radio Browser',
        updated: new Date().toISOString().slice(0, 10),
        stationCount: stations.length,
        stations: stations.map(stripRuntime),
        playlists,
      }),
      'utf8'
    );
  }

  function stripRuntime(s) {
    const { clickcount, ...rest } = s;
    return rest;
  }

  for (const s of ranked) {
    const trial = [...coreStations, s];
    if (payloadSize(trial) > CORE_BUDGET) {
      atlasCandidates.push(s);
      // remaining go to atlas
      continue;
    }
    coreStations.push(s);
    coreIds.add(s.id);
  }
  for (const s of ranked) {
    if (!coreIds.has(s.id)) atlasCandidates.push(s);
  }

  // Dedupe atlas
  const atlasStations = [];
  const seenAtlas = new Set();
  for (const s of atlasCandidates) {
    if (coreIds.has(s.id) || seenAtlas.has(s.id)) continue;
    seenAtlas.add(s.id);
    atlasStations.push(s);
  }

  const updated = new Date().toISOString().slice(0, 10);
  const coreDoc = {
    version: '2.6.0',
    source: 'Radio Browser + curated playlists',
    updated,
    stationCount: coreStations.length,
    stations: coreStations.map(stripRuntime),
    playlists,
  };
  const atlasDoc = {
    version: '2.6.0',
    source: 'Radio Browser atlas',
    updated,
    stationCount: atlasStations.length,
    stations: atlasStations.map(stripRuntime),
  };

  fs.writeFileSync(CORE_OUT, JSON.stringify(coreDoc));
  fs.writeFileSync(ATLAS_OUT, JSON.stringify(atlasDoc));

  // Keep legacy path as core mirror for scripts that still read stationCatalog.json
  fs.writeFileSync(LEGACY, JSON.stringify(coreDoc, null, 2) + '\n');

  const coreBytes = fs.statSync(CORE_OUT).size;
  const atlasBytes = fs.statSync(ATLAS_OUT).size;
  const ccs = new Set(all.map((s) => s.countrycode).filter(Boolean));
  console.log('\nDone.');
  console.log(`  core:  ${coreStations.length} stations · ${(coreBytes / 1024).toFixed(1)} KB`);
  console.log(`  atlas: ${atlasStations.length} stations · ${(atlasBytes / 1024).toFixed(1)} KB`);
  console.log(`  countries: ${ccs.size}`);
  console.log(`  ok: ${ccOk.size}  fail: ${ccFail.join(',') || 'none'}`);
  for (const cc of FORCE_CC) {
    const n = all.filter((s) => s.countrycode === cc).length;
    console.log(`  force ${cc}: ${n}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
