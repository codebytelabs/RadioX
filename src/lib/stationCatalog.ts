import type { RadioStation } from '@/types/station';
import catalogCore from '@/data/stationCatalog.core.json';
import supplementData from '@/data/radioBrowserSupplement.json';
import irsData from '@/data/internetRadioStreams.json';
import deroverdaData from '@/data/deroverdaStreams.json';
import { brandKey } from '@/lib/stationRank';

export type CatalogEntry = {
  id: string;
  name: string;
  country: string;
  countrycode: string;
  language: string;
  tags: string[];
  url: string;
  urls?: string[];
  bitrate: number;
  codec: string;
  logo: string;
  website: string;
  reliability: number;
  radioBrowserUuid?: string;
  source?: string;
};

export type PlaylistId =
  | 'quality-picks'
  | 'global-icons'
  | 'public-radio'
  | 'world-news'
  | 'jazz-blues'
  | 'electronic'
  | 'latin-vibes'
  | 'uk-europe'
  | 'americas'
  | 'asia-pacific'
  | 'africa-middle-east';

type CatalogData = {
  version: string;
  source: string;
  updated: string;
  stationCount: number;
  stations: CatalogEntry[];
  playlists: Partial<Record<PlaylistId, string[]>>;
};

type SupplementData = {
  stations: CatalogEntry[];
  globalIconsPrefix?: string[];
};

type StreamPackData = {
  version: string;
  source: string;
  sourceUrl: string;
  updated?: string;
  stations: CatalogEntry[];
  playlist: string[];
};

const catalog = catalogCore as CatalogData;
const supplement = supplementData as SupplementData;
const irs = irsData as StreamPackData;
const deroverda = deroverdaData as StreamPackData;

const mergedStations: CatalogEntry[] = [];
const mergedIds = new Set<string>();

function addStations(list: CatalogEntry[]): void {
  for (const s of list) {
    if (mergedIds.has(s.id)) continue;
    mergedStations.push(s);
    mergedIds.add(s.id);
  }
}

addStations(irs.stations);
addStations(deroverda.stations);
addStations(supplement.stations);
addStations(catalog.stations);

const byId = new Map(mergedStations.map((s) => [s.id, s]));

let atlasPromise: Promise<void> | null = null;
let atlasLoaded = false;

/** Lazy-load long-tail atlas (search query ≥3). */
export function loadAtlas(): Promise<void> {
  if (atlasLoaded) return Promise.resolve();
  if (atlasPromise) return atlasPromise;
  atlasPromise = import('@/data/stationCatalog.atlas.json')
    .then((mod) => {
      const data = mod.default as { stations?: CatalogEntry[] };
      if (data?.stations?.length) {
        addStations(data.stations);
        for (const s of data.stations) {
          if (!byId.has(s.id)) byId.set(s.id, s);
        }
      }
      atlasLoaded = true;
    })
    .catch(() => {
      atlasLoaded = true;
    });
  return atlasPromise;
}

function buildPlaylists(): Record<PlaylistId, string[]> {
  const base = { ...(catalog.playlists as Record<PlaylistId, string[]>) };

  const irsQuality = (irs.playlist ?? []).filter((id) => byId.has(id));
  const drvExtra = (deroverda.playlist ?? []).filter(
    (id) => byId.has(id) && !irsQuality.includes(id),
  );
  base['quality-picks'] = [...irsQuality, ...drvExtra].slice(0, 100);

  const rbPrefix = (supplement.globalIconsPrefix ?? []).filter((id) => byId.has(id));
  const rest = (base['global-icons'] ?? []).filter((id) => !rbPrefix.includes(id));
  base['global-icons'] = [...rbPrefix, ...rest].slice(0, 60);

  // Fold deroverda genre tags into matching shelves
  const tagBoost: Partial<Record<PlaylistId, string[]>> = {
    'jazz-blues': ['jazz', 'blues'],
    electronic: ['electronic'],
    'public-radio': ['public radio', 'college', 'community'],
    'world-news': ['news', 'talk'],
  };
  for (const [playlistId, tags] of Object.entries(tagBoost) as [PlaylistId, string[]][]) {
    const existing = new Set(base[playlistId] ?? []);
    for (const s of deroverda.stations) {
      if (existing.has(s.id)) continue;
      const hay = s.tags.map((t) => t.toLowerCase());
      if (tags.some((t) => hay.includes(t))) existing.add(s.id);
    }
    base[playlistId] = [...existing].slice(0, 80);
  }

  return base;
}

const playlists = buildPlaylists();

export const CATALOG_META = {
  version: catalog.version,
  source: 'Curated streams + Radio Browser',
  sourceUrl: '',
  updated: deroverda.updated ?? irs.updated ?? catalog.updated,
  stationCount: mergedStations.length,
  curatedStreamCount: irs.stations.length + deroverda.stations.length,
};

function stationUuidFor(entry: CatalogEntry): string {
  if (entry.radioBrowserUuid) return entry.radioBrowserUuid;
  if (entry.id.startsWith('irs-')) return `irs-${entry.id}`;
  if (entry.id.startsWith('drv-')) return entry.id;
  if (entry.id.length === 36 && entry.id.includes('-')) return entry.id;
  return `iprd-${entry.id}`;
}

export function catalogEntryToStation(entry: CatalogEntry): RadioStation {
  const now = new Date().toISOString();
  const https = entry.url.startsWith('https');
  const urls = [...new Set([entry.url, ...(entry.urls ?? [])].filter(Boolean))];
  return {
    changeuuid: entry.id,
    stationuuid: stationUuidFor(entry),
    name: entry.name,
    url: entry.url,
    url_resolved: entry.url,
    urls,
    homepage: entry.website,
    favicon: entry.logo,
    tags: entry.tags.join(','),
    country: entry.country,
    countrycode: entry.countrycode,
    state: '',
    language: entry.language,
    languagecodes: '',
    votes: 0,
    lastchangetime: now,
    codec: entry.codec,
    bitrate: entry.bitrate,
    hls: entry.url.toLowerCase().includes('.m3u8') ? 1 : 0,
    lastcheckok: 1,
    lastchecktime: now,
    lastcheckoktime: now,
    clickcount: 0,
    clicktrend: 0,
    ssl_error: https ? 0 : 1,
  };
}

export function isCatalogStation(station: RadioStation): boolean {
  return (
    station.stationuuid.startsWith('iprd-') ||
    station.stationuuid.startsWith('irs-') ||
    station.stationuuid.startsWith('drv-') ||
    byId.has(station.stationuuid)
  );
}

export function getCatalogStation(id: string): RadioStation | null {
  const entry = byId.get(id);
  return entry ? catalogEntryToStation(entry) : null;
}

export function getPlaylistStations(playlistId: PlaylistId, limit = 50): RadioStation[] {
  const ids = playlists[playlistId] ?? [];
  return ids
    .slice(0, limit)
    .map((id) => byId.get(id))
    .filter((e): e is CatalogEntry => e !== undefined)
    .map(catalogEntryToStation);
}

export function getPlaylistBrandSet(playlistId: PlaylistId): Set<string> {
  return new Set(getPlaylistStations(playlistId, 200).map((s) => brandKey(s.name)));
}

export function getAllCatalogStations(): RadioStation[] {
  return mergedStations.map(catalogEntryToStation);
}

function searchInList(query: string, limit: number): RadioStation[] {
  const q = query.toLowerCase().trim();
  if (q.length < 2) return [];
  const scored: { entry: CatalogEntry; score: number }[] = [];
  for (const entry of mergedStations) {
    const name = entry.name.toLowerCase();
    const hay = `${name} ${entry.country} ${entry.tags.join(' ')} ${entry.language}`.toLowerCase();
    if (!hay.includes(q)) continue;
    let score = 0;
    if (name === q) score = 100;
    else if (name.startsWith(q)) score = 80;
    else if (name.includes(q)) score = 50;
    else score = 20;
    scored.push({ entry, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => catalogEntryToStation(s.entry));
}

/** Sync search over core (+ atlas if already loaded). */
export function searchCatalog(query: string, limit = 30): RadioStation[] {
  return searchInList(query, limit);
}

/** Async search — awaits atlas when query length ≥ 3. */
export async function searchCatalogAsync(query: string, limit = 30): Promise<RadioStation[]> {
  const q = query.trim();
  if (q.length >= 3) await loadAtlas();
  return searchInList(q, limit);
}

export function mergeStationLists(...lists: RadioStation[][]): RadioStation[] {
  const seen = new Set<string>();
  const out: RadioStation[] = [];
  for (const list of lists) {
    for (const s of list) {
      const key = `${s.name.toLowerCase()}|${(s.url_resolved || s.url).split('?')[0]}`;
      if (seen.has(key) || seen.has(s.stationuuid)) continue;
      seen.add(key);
      seen.add(s.stationuuid);
      out.push(s);
    }
  }
  return out;
}

export function getCatalogPlaylists(): Record<PlaylistId, string[]> {
  return playlists;
}
