import type { RadioStation } from '@/types/station';
import {
  getPlaylistStations,
  mergeStationLists,
  searchCatalogAsync,
  type PlaylistId,
} from '@/lib/stationCatalog';
import { filterPlayableStations, fetchWithFallback } from '@/lib/radioApi';
import { getPopularNow, getTrendingNow } from '@/lib/rankedFeeds';
import { dedupeByBrand, isVoteFarm, brandKey } from '@/lib/stationRank';

/** Editorial playlist from catalog. */
export function getEditorialFeed(playlistId: PlaylistId, limit = 50): RadioStation[] {
  return getPlaylistStations(playlistId, limit);
}

/** Live charts → Popular Now (no curated prefix). */
export async function getLiveCharts(limit = 50): Promise<RadioStation[]> {
  return getPopularNow(limit);
}

/** Trending → Trending Now (no curated prefix). */
export async function getTrendingFeed(limit = 50): Promise<RadioStation[]> {
  return getTrendingNow(limit);
}

/** Search catalog (+ atlas when q≥3) + Radio Browser; brand-dedupe. Catalog-only if API fails. */
export async function searchAllSources(query: string, limit = 40): Promise<RadioStation[]> {
  const q = query.toLowerCase().trim();
  const catalogHits = await searchCatalogAsync(query, Math.ceil(limit / 2));

  let apiHits: RadioStation[] = [];
  try {
    const response = await fetchWithFallback(
      `/json/stations/search?name=${encodeURIComponent(query)}&limit=${limit}&hidebroken=true&order=clickcount&reverse=true`
    );
    apiHits = filterPlayableStations(await response.json()).filter((s) => !isVoteFarm(s));
  } catch {
    // Offline / blocked Radio Browser — catalog search still works
  }

  const merged = mergeStationLists(catalogHits, apiHits);
  const scored = merged.map((s) => {
    const name = s.name.toLowerCase();
    let score = 0;
    if (name === q) score = 100;
    else if (name.startsWith(q)) score = 80;
    else if (name.includes(q)) score = 50;
    else score = 10;
    score += Math.min(20, Math.log10(s.clickcount + 1) * 5);
    return { s, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return dedupeByBrand(scored.map((x) => x.s)).slice(0, limit);
}

export { brandKey, getPopularNow, getTrendingNow };
