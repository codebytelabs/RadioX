import type { RadioStation } from '@/types/station';
import type { Region } from '@/data/worldTop';
import { WORLD_TOP_SEEDS } from '@/data/worldTop';

export const FARM_NAME_PATTERN =
  /\b(vinyl hd|old time radio|walm|mangoradio|reyfm|dance ?wave|adroit jazz|toritune|laut\.fm)\b/i;

const STRIP_TOKENS =
  /\b(hd|hq|mp3|aac|aacp|aac\+|opus|ogg|flac|\d+k|\d+kbps|kbps|stream|live|low|high|mobile|eu|us|uk)\b/gi;

export function brandKey(name: string): string {
  const original = name.toLowerCase();
  const s = original
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*]/g, ' ')
    .replace(STRIP_TOKENS, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return s || original.trim();
}

/** 0..1 — higher = more likely vote-farm / junk. */
export function farmScore(s: RadioStation): number {
  let score = 0;
  const clicks = Math.max(s.clickcount, 1);
  if (s.votes / clicks > 300 && s.votes > 50_000) score += 0.6;
  if (FARM_NAME_PATTERN.test(s.name)) score += 0.9;
  if (s.votes > 100_000 && s.clickcount < 50) score += 0.3;
  return Math.min(1, score);
}

export function isVoteFarm(s: RadioStation): boolean {
  return farmScore(s) >= 0.5;
}

function codecRank(codec: string): number {
  const c = (codec || '').toUpperCase();
  if (c.includes('MP3')) return 3;
  if (c.includes('AAC') && !c.includes('+')) return 2;
  if (c.includes('AAC')) return 1;
  if (c.includes('FLV') || c.includes('FLASH')) return 0;
  return 1;
}

function effectiveBitrate(s: RadioStation): number {
  return s.bitrate > 0 ? s.bitrate : 96;
}

function brandQuality(a: RadioStation, b: RadioStation): number {
  const ca = codecRank(a.codec) - codecRank(b.codec);
  if (ca !== 0) return ca;
  const ba = effectiveBitrate(a) - effectiveBitrate(b);
  if (ba !== 0) return ba;
  return a.clickcount - b.clickcount;
}

export function dedupeByBrand(list: RadioStation[]): RadioStation[] {
  const best = new Map<string, RadioStation>();
  for (const s of list) {
    const key = brandKey(s.name);
    const prev = best.get(key);
    if (!prev || brandQuality(s, prev) > 0) best.set(key, s);
  }
  const order = new Map<string, number>();
  list.forEach((s, i) => {
    const k = brandKey(s.name);
    if (!order.has(k)) order.set(k, i);
  });
  return [...best.values()].sort(
    (a, b) => (order.get(brandKey(a.name)) ?? 0) - (order.get(brandKey(b.name)) ?? 0)
  );
}

export const CC_TO_REGION: Record<string, Region> = {
  GB: 'uk-ie', IE: 'uk-ie',
  FR: 'fr', MC: 'fr',
  DE: 'de-at-ch', AT: 'de-at-ch', CH: 'de-at-ch', LI: 'de-at-ch',
  NL: 'benelux-nordics', BE: 'benelux-nordics', LU: 'benelux-nordics',
  SE: 'benelux-nordics', NO: 'benelux-nordics', DK: 'benelux-nordics',
  FI: 'benelux-nordics', IS: 'benelux-nordics',
  IT: 'south-central-eu', ES: 'south-central-eu', PT: 'south-central-eu',
  PL: 'south-central-eu', CZ: 'south-central-eu', SK: 'south-central-eu',
  HU: 'south-central-eu', RO: 'south-central-eu', GR: 'south-central-eu',
  HR: 'south-central-eu', SI: 'south-central-eu', BG: 'south-central-eu',
  US: 'north-america', CA: 'north-america', MX: 'latam',
  AR: 'latam', BR: 'latam', CL: 'latam', CO: 'latam', PE: 'latam',
  UY: 'latam', VE: 'latam', EC: 'latam', PY: 'latam', BO: 'latam',
  AU: 'asia-pacific', NZ: 'asia-pacific', JP: 'asia-pacific',
  KR: 'asia-pacific', CN: 'asia-pacific', HK: 'asia-pacific',
  TW: 'asia-pacific', SG: 'asia-pacific', MY: 'asia-pacific',
  ID: 'asia-pacific', TH: 'asia-pacific', PH: 'asia-pacific',
  IN: 'asia-pacific', VN: 'asia-pacific',
  ZA: 'africa-mena', NG: 'africa-mena', KE: 'africa-mena',
  EG: 'africa-mena', MA: 'africa-mena', GH: 'africa-mena',
  AE: 'africa-mena', SA: 'africa-mena', IL: 'africa-mena',
  TR: 'africa-mena', QA: 'africa-mena', LB: 'africa-mena',
};

export function regionForStation(s: RadioStation): Region | 'other' {
  const cc = (s.countrycode || '').toUpperCase();
  return CC_TO_REGION[cc] ?? 'other';
}

/** Round-robin across regions so no single region dominates. */
export function applyRegionQuota(
  list: RadioStation[],
  perRegion: number,
  limit: number
): RadioStation[] {
  const buckets = new Map<string, RadioStation[]>();
  for (const s of list) {
    const r = regionForStation(s);
    const arr = buckets.get(r) ?? [];
    if (arr.length < perRegion) {
      arr.push(s);
      buckets.set(r, arr);
    }
  }
  const keys = [...buckets.keys()].sort();
  const result: RadioStation[] = [];
  let i = 0;
  while (result.length < limit) {
    let added = false;
    for (const k of keys) {
      const arr = buckets.get(k)!;
      if (i < arr.length) {
        result.push(arr[i]);
        added = true;
        if (result.length >= limit) break;
      }
    }
    if (!added) break;
    i += 1;
  }
  return result;
}

const TIER_BY_UUID = new Map(WORLD_TOP_SEEDS.map((s) => [s.uuid, s.tier]));

export function recognizabilityBoost(s: RadioStation): number {
  const tier = TIER_BY_UUID.get(s.stationuuid);
  if (tier === 1) return 2.0;
  if (tier === 2) return 1.0;
  return 0;
}

export function codecQualityBoost(s: RadioStation): number {
  const c = (s.codec || '').toUpperCase();
  if (c.includes('MP3')) return 0.3;
  if (c.includes('AAC+') || c.includes('AACP')) return -0.3;
  return 0;
}
