#!/usr/bin/env node
/**
 * Fetch WORLD_TOP_SEEDS via POST /json/stations/byuuid and write worldTopSnapshot.json.
 * Usage: node scripts/build-world-top.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const WORLD_TOP_TS = path.join(ROOT, 'src/data/worldTop.ts');
const OUT = path.join(ROOT, 'src/data/worldTopSnapshot.json');

const API = 'https://all.api.radio-browser.info/json/stations/byuuid';

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

async function fetchBatch(uuids) {
  const body = `uuids=${encodeURIComponent(uuids.join(','))}`;
  const res = await fetch(API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'RadioX-Chrome-Extension/1.0',
    },
    body,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function main() {
  const seeds = parseSeeds(fs.readFileSync(WORLD_TOP_TS, 'utf8'));
  if (seeds.length === 0) {
    console.error('No seeds parsed from worldTop.ts');
    process.exit(1);
  }
  console.log(`Fetching ${seeds.length} seeds…`);

  const byUuid = new Map();
  const CHUNK = 200;
  for (let i = 0; i < seeds.length; i += CHUNK) {
    const chunk = seeds.slice(i, i + CHUNK).map((s) => s.uuid);
    try {
      const rows = await fetchBatch(chunk);
      for (const s of rows) byUuid.set(s.stationuuid, s);
      console.log(`  chunk ${i / CHUNK + 1}: ${rows.length} rows`);
    } catch (err) {
      console.error('  batch failed:', err.message);
    }
  }

  const failed = [];
  const tier1Failed = [];
  const stations = [];

  for (const seed of seeds) {
    const live = byUuid.get(seed.uuid);
    if (!live) {
      failed.push({ uuid: seed.uuid, reason: 'missing', expect: seed.expectName });
      if (seed.tier === 1) tier1Failed.push(seed);
      stations.push({
        uuid: seed.uuid,
        name: seed.display,
        display: seed.display,
        country: '',
        countrycode: seed.cc,
        url: '',
        favicon: '',
        homepage: '',
        bitrate: 0,
        codec: 'MP3',
        tags: '',
        region: seed.region,
        tier: seed.tier,
      });
      continue;
    }
    const ok = live.name.toLowerCase().includes(seed.expectName.toLowerCase());
    if (!ok) {
      failed.push({
        uuid: seed.uuid,
        reason: `name="${live.name}" !~ ${seed.expectName}`,
        expect: seed.expectName,
      });
      if (seed.tier === 1) tier1Failed.push(seed);
    }
    stations.push({
      uuid: seed.uuid,
      name: live.name,
      display: seed.display,
      country: live.country || '',
      countrycode: live.countrycode || seed.cc,
      url: live.url_resolved || live.url || '',
      favicon: live.favicon || '',
      homepage: live.homepage || '',
      bitrate: live.bitrate || 0,
      codec: live.codec || 'MP3',
      tags: live.tags || '',
      region: seed.region,
      tier: seed.tier,
    });
  }

  const withUrl = stations.filter((s) => s.url).length;
  const out = {
    generatedAt: new Date().toISOString(),
    stations,
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
  console.log(`Wrote ${OUT}`);
  console.log(`Stations with URL: ${withUrl}/${stations.length}`);
  if (failed.length) {
    console.log(`Failed assertions (${failed.length}):`);
    for (const f of failed.slice(0, 30)) console.log(' ', f.uuid, f.reason);
  }
  if (tier1Failed.length) {
    console.error(`Tier-1 failures: ${tier1Failed.length}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
