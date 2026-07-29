import type { RadioStation } from '@/types/station';
import { WORLD_TOP_SEEDS, type WorldSeed } from '@/data/worldTop';
import snapshotData from '@/data/worldTopSnapshot.json';
import {
  getStationsByUuidsBatch,
  filterPlayableStations,
  fetchWithFallback,
} from '@/lib/radioApi';
import {
  brandKey,
  farmScore,
  dedupeByBrand,
  applyRegionQuota,
  recognizabilityBoost,
  codecQualityBoost,
  regionForStation,
} from '@/lib/stationRank';

type SnapshotRow = {
  uuid: string;
  name: string;
  display?: string;
  country: string;
  countrycode: string;
  url: string;
  favicon: string;
  homepage: string;
  bitrate: number;
  codec: string;
  tags: string;
  region: string;
  tier: number;
};

type SnapshotFile = {
  generatedAt: string;
  stations: SnapshotRow[];
};

const snapshot = snapshotData as SnapshotFile;

function snapshotToStation(row: SnapshotRow, seed?: WorldSeed): RadioStation {
  const now = new Date().toISOString();
  const name = seed?.display || row.display || row.name;
  return {
    changeuuid: row.uuid,
    stationuuid: row.uuid,
    name,
    url: row.url,
    url_resolved: row.url,
    homepage: row.homepage || '',
    favicon: row.favicon || '',
    tags: row.tags || '',
    country: row.country || '',
    countrycode: row.countrycode || seed?.cc || '',
    state: '',
    language: '',
    languagecodes: '',
    votes: 0,
    lastchangetime: now,
    codec: row.codec || 'MP3',
    bitrate: row.bitrate || 0,
    hls: 0,
    lastcheckok: 1,
    lastchecktime: now,
    lastcheckoktime: now,
    clickcount: 0,
    clicktrend: 0,
    ssl_error: row.url.startsWith('https') ? 0 : 1,
  };
}

function applyDisplay(s: RadioStation, seed?: WorldSeed): RadioStation {
  if (!seed?.display) return s;
  return { ...s, name: seed.display };
}

function assertExpectName(s: RadioStation, seed: WorldSeed): boolean {
  return s.name.toLowerCase().includes(seed.expectName.toLowerCase());
}

/** Interleave so first N span many regions; tier-1 preferred. */
function interleaveRegions(stations: RadioStation[], seeds: readonly WorldSeed[], limit: number): RadioStation[] {
  const byUuid = new Map(stations.map((s) => [s.stationuuid, s]));
  const tier1 = seeds.filter((s) => s.tier === 1 && byUuid.has(s.uuid));
  const tier2 = seeds.filter((s) => s.tier === 2 && byUuid.has(s.uuid));
  const ordered = [...tier1, ...tier2];

  const buckets = new Map<string, WorldSeed[]>();
  for (const seed of ordered) {
    const arr = buckets.get(seed.region) ?? [];
    arr.push(seed);
    buckets.set(seed.region, arr);
  }
  const regions = [...buckets.keys()];
  const result: RadioStation[] = [];
  const used = new Set<string>();
  let i = 0;
  while (result.length < limit) {
    let added = false;
    for (const r of regions) {
      const arr = buckets.get(r)!;
      if (i < arr.length) {
        const seed = arr[i];
        const st = byUuid.get(seed.uuid);
        if (st && !used.has(st.stationuuid)) {
          result.push(applyDisplay(st, seed));
          used.add(st.stationuuid);
          added = true;
          if (result.length >= limit) break;
        }
      }
    }
    if (!added) break;
    i += 1;
  }
  return result;
}

function loadSnapshotStations(): RadioStation[] {
  const byUuid = new Map(snapshot.stations.map((r) => [r.uuid, r]));
  return WORLD_TOP_SEEDS.map((seed) => {
    const row = byUuid.get(seed.uuid);
    if (!row) {
      return snapshotToStation(
        {
          uuid: seed.uuid,
          name: seed.display || seed.expectName,
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
        },
        seed
      );
    }
    return snapshotToStation(row, seed);
  }).filter((s) => Boolean(s.url));
}

/**
 * World Top — snapshot-first (<300ms), then live reconcile with expectName.
 */
export async function getWorldTop(limit = 24): Promise<RadioStation[]> {
  const snap = loadSnapshotStations();
  const immediate = interleaveRegions(snap, WORLD_TOP_SEEDS, limit);

  try {
    const live = await getStationsByUuidsBatch(WORLD_TOP_SEEDS.map((s) => s.uuid));
    const liveByUuid = new Map(live.map((s) => [s.stationuuid, s]));
    const snapByUuid = new Map(snap.map((s) => [s.stationuuid, s]));
    const reconciled: RadioStation[] = [];

    for (const seed of WORLD_TOP_SEEDS) {
      const liveRow = liveByUuid.get(seed.uuid);
      const snapRow = snapByUuid.get(seed.uuid);
      if (liveRow && assertExpectName(liveRow, seed)) {
        reconciled.push(applyDisplay(liveRow, seed));
      } else {
        if (liveRow) {
          console.warn('[RadioX] World Top name assertion failed:', seed.uuid, liveRow.name);
        }
        if (snapRow) reconciled.push(applyDisplay(snapRow, seed));
      }
    }
    return interleaveRegions(reconciled, WORLD_TOP_SEEDS, limit);
  } catch {
    return immediate;
  }
}

function rankPopularScore(s: RadioStation): number {
  return Math.log(s.clickcount + 1) + recognizabilityBoost(s) + codecQualityBoost(s);
}

/**
 * Popular Now — live clickcount only. No curated prefix.
 */
export async function getPopularNow(limit = 24): Promise<RadioStation[]> {
  try {
    const response = await fetchWithFallback(
      `/json/stations/search?limit=500&hidebroken=true&order=clickcount&reverse=true`
    );
    let list = filterPlayableStations(await response.json())
      .filter((s) => s.clickcount >= 30)
      .filter((s) => farmScore(s) < 0.5);

    list = dedupeByBrand(list);
    list.sort((a, b) => rankPopularScore(b) - rankPopularScore(a));
    return applyRegionQuota(list, 3, limit);
  } catch {
    return [];
  }
}

/**
 * Trending Now — clicktrend rising. Caller removes Popular overlap.
 */
export async function getTrendingNow(limit = 24): Promise<RadioStation[]> {
  try {
    const response = await fetchWithFallback(
      `/json/stations/search?limit=400&hidebroken=true&order=clicktrend&reverse=true`
    );
    let list = filterPlayableStations(await response.json())
      .filter((s) => s.clicktrend > 0)
      .filter((s) => farmScore(s) < 0.5);

    list = dedupeByBrand(list);
    list.sort((a, b) => {
      const tb = b.clicktrend - a.clicktrend;
      if (tb !== 0) return tb;
      return rankPopularScore(b) - rankPopularScore(a);
    });
    return applyRegionQuota(list, 3, limit);
  } catch {
    return [];
  }
}

/** Tier-1 seeds for hero / featured strip. */
export function getTier1Seeds(): readonly WorldSeed[] {
  return WORLD_TOP_SEEDS.filter((s) => s.tier === 1);
}

export function dayOfYear(d = new Date()): number {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86_400_000);
}

export function hourBucket(d = new Date(), hours = 4): number {
  return Math.floor(d.getHours() / hours);
}

/**
 * Featured strip: 5 tier-1 stations, start index rotates every 4h.
 * Prefers `pool` (World Top), fills gaps via live UUID fetch.
 */
export async function getFeaturedStrip(
  pool: RadioStation[],
  count = 5
): Promise<RadioStation[]> {
  const tier1 = getTier1Seeds();
  if (tier1.length === 0) return pool.slice(0, count);

  const start = (dayOfYear() + hourBucket()) % tier1.length;
  const rotated = [...tier1.slice(start), ...tier1.slice(0, start)].slice(0, count);
  const byUuid = new Map(pool.map((s) => [s.stationuuid, s]));

  const missing = rotated.map((s) => s.uuid).filter((id) => !byUuid.has(id));
  if (missing.length > 0) {
    try {
      const live = await getStationsByUuidsBatch(missing);
      for (const s of live) byUuid.set(s.stationuuid, s);
    } catch {
      // pool-only
    }
  }

  const out: RadioStation[] = [];
  const used = new Set<string>();
  for (const seed of rotated) {
    const row = byUuid.get(seed.uuid);
    if (!row || used.has(row.stationuuid)) continue;
    out.push(applyDisplay(row, seed));
    used.add(row.stationuuid);
  }
  if (out.length < count) {
    for (const s of pool) {
      if (used.has(s.stationuuid)) continue;
      out.push(s);
      used.add(s.stationuuid);
      if (out.length >= count) break;
    }
  }
  return out;
}

/** Distinct region count helper for tests / UI. */
export function countRegions(stations: RadioStation[]): number {
  return new Set(stations.map((s) => regionForStation(s))).size;
}

export function subtractByBrand(list: RadioStation[], exclude: RadioStation[]): RadioStation[] {
  const ban = new Set(exclude.map((s) => brandKey(s.name)));
  return list.filter((s) => !ban.has(brandKey(s.name)));
}
