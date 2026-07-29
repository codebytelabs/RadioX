import { getAllCatalogStations, getCatalogStation } from '@/lib/stationCatalog';
import type { RadioStation } from '@/types/station';

const cache = new Map<string, RadioStation[]>();

/** Up to 4 catalog stations whose tags match the genre — for mosaic thumbs. */
export function getGenreThumbs(genre: string, limit = 4): RadioStation[] {
  const key = genre.toLowerCase().trim();
  if (cache.has(key)) return cache.get(key)!.slice(0, limit);

  const hits: RadioStation[] = [];
  const seen = new Set<string>();
  for (const s of getAllCatalogStations()) {
    const tags = (s.tags || '').toLowerCase();
    const name = s.name.toLowerCase();
    if (!tags.includes(key) && !name.includes(key)) continue;
    if (!s.favicon) continue;
    if (seen.has(s.stationuuid)) continue;
    seen.add(s.stationuuid);
    hits.push(s);
    if (hits.length >= 8) break;
  }
  cache.set(key, hits);
  return hits.slice(0, limit);
}

/** Up to `limit` logos for a country code from catalog. */
export function getCountryThumbs(countryCode: string, limit = 3): RadioStation[] {
  const cc = countryCode.toUpperCase();
  const hits: RadioStation[] = [];
  for (const s of getAllCatalogStations()) {
    if (s.countrycode?.toUpperCase() !== cc) continue;
    if (!s.favicon) continue;
    hits.push(s);
    if (hits.length >= limit) break;
  }
  return hits;
}

export function resolveThumbs(ids: string[], limit = 4): RadioStation[] {
  return ids
    .map((id) => getCatalogStation(id))
    .filter((s): s is RadioStation => Boolean(s))
    .slice(0, limit);
}
