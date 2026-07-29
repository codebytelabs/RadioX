import type { RadioStation, Country, Language, Tag } from '@/types/station';

const API_SERVERS = [
  'https://all.api.radio-browser.info',
  'https://de1.api.radio-browser.info',
  'https://nl1.api.radio-browser.info',
  'https://at1.api.radio-browser.info',
];

let currentServerIndex = 0;

function getApiBase(): string {
  return API_SERVERS[currentServerIndex];
}

function rotateServer() {
  currentServerIndex = (currentServerIndex + 1) % API_SERVERS.length;
}

/**
 * Fetch Radio Browser with server rotation.
 * Do NOT set User-Agent — it is a forbidden fetch header and causes
 * TypeError: Failed to fetch in some Chromium builds (Brave, Edge, etc.).
 */
export async function fetchWithFallback(endpoint: string, options?: RequestInit): Promise<Response> {
  let lastError: Error | null = null;

  for (let i = 0; i < API_SERVERS.length; i++) {
    try {
      const response = await fetch(`${getApiBase()}${endpoint}`, {
        ...options,
        headers: {
          Accept: 'application/json',
          ...options?.headers,
        },
      });

      if (response.ok) {
        return response;
      }

      if (response.status >= 500) {
        rotateServer();
        continue;
      }

      return response;
    } catch (error) {
      lastError = error as Error;
      rotateServer();
    }
  }

  throw lastError || new Error('All API servers failed');
}

/** Keep only online stations with a resolved stream URL. */
export function filterWorkingStations(stations: RadioStation[]): RadioStation[] {
  return stations.filter(
    (s) => s.lastcheckok === 1 && Boolean(s.url_resolved || s.url)
  );
}

/** HTML5 audio cannot play HLS — m3u/pls playlists are resolved at playback time. */
export function isPlayableStream(station: RadioStation): boolean {
  const url = (station.url_resolved || station.url || '').toLowerCase();
  if (station.hls === 1) return false;
  if (url.includes('.m3u8')) return false;
  return true;
}

export function filterPlayableStations(stations: RadioStation[]): RadioStation[] {
  return filterWorkingStations(stations).filter(isPlayableStream);
}

/** Spread results across countries so lists don't feel regional/random. */
export function diversifyByCountry(
  stations: RadioStation[],
  maxPerCountry = 3,
  limit = 50
): RadioStation[] {
  const counts = new Map<string, number>();
  const result: RadioStation[] = [];

  for (const station of stations) {
    const code = station.countrycode || 'XX';
    const count = counts.get(code) ?? 0;
    if (count >= maxPerCountry) continue;
    counts.set(code, count + 1);
    result.push(station);
    if (result.length >= limit) break;
  }

  return result;
}

const UUID_CHUNK = 200;

/**
 * Batch-resolve stations by UUID via POST /json/stations/byuuid.
 * Response order is arbitrary — re-sorted to match input order.
 */
export async function getStationsByUuidsBatch(
  uuids: readonly string[]
): Promise<RadioStation[]> {
  if (uuids.length === 0) return [];
  const byUuid = new Map<string, RadioStation>();

  for (let i = 0; i < uuids.length; i += UUID_CHUNK) {
    const chunk = uuids.slice(i, i + UUID_CHUNK);
    try {
      const response = await fetchWithFallback('/json/stations/byuuid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `uuids=${encodeURIComponent(chunk.join(','))}`,
      });
      if (!response.ok) continue;
      const rows: RadioStation[] = await response.json();
      for (const s of rows) {
        if (s?.stationuuid) byUuid.set(s.stationuuid, s);
      }
    } catch {
      // fall through — partial results ok
    }
  }

  const ordered = uuids
    .map((id) => byUuid.get(id))
    .filter((s): s is RadioStation => s !== undefined);
  return filterPlayableStations(ordered);
}

/** Fetch multiple stations by UUID (legacy per-uuid; prefer batch). */
export async function getStationsByUuids(uuids: readonly string[]): Promise<RadioStation[]> {
  return getStationsByUuidsBatch(uuids);
}

/** Shorter display names from Radio Browser API country strings. */
export function formatCountryName(name: string): string {
  const shortcuts: Record<string, string> = {
    'The United States Of America': 'United States',
    'The United Kingdom Of Great Britain And Northern Ireland': 'United Kingdom',
    'The Russian Federation': 'Russia',
    'The Netherlands': 'Netherlands',
    'The Philippines': 'Philippines',
    'The United Arab Emirates': 'UAE',
  };
  return shortcuts[name] ?? name;
}

/**
 * Filter stations by HD quality setting.
 * Bitrate 0 is treated as unknown (kept) — many AAC streams report 0.
 */
export function applyQualityFilter(
  stations: RadioStation[],
  hdOnly: boolean,
  minBitrate = 128
): RadioStation[] {
  if (!hdOnly) return stations;
  return stations.filter((s) => s.bitrate === 0 || s.bitrate >= minBitrate);
}

export async function voteForStation(stationUuid: string): Promise<boolean> {
  if (!stationUuid || stationUuid.startsWith('custom-') || stationUuid.startsWith('iprd-') || stationUuid.startsWith('irs-')) return false;
  try {
    const response = await fetchWithFallback(`/json/vote/${encodeURIComponent(stationUuid)}`);
    return response.ok;
  } catch {
    return false;
  }
}

export async function searchStations(
  query: string,
  limit: number = 20,
  offset: number = 0
): Promise<RadioStation[]> {
  const response = await fetchWithFallback(
    `/json/stations/search?name=${encodeURIComponent(query)}&limit=${limit * 2}&offset=${offset}&hidebroken=true&order=clickcount&reverse=true`
  );
  return filterPlayableStations(await response.json()).slice(0, limit);
}

export async function getStationsByCountry(
  countryCode: string,
  limit: number = 40
): Promise<RadioStation[]> {
  const response = await fetchWithFallback(
    `/json/stations/bycountrycodeexact/${encodeURIComponent(countryCode)}?limit=${limit * 2}&hidebroken=true&order=clickcount&reverse=true`
  );
  return filterPlayableStations(await response.json()).slice(0, limit);
}

export async function getStationsByTag(
  tag: string,
  limit: number = 40
): Promise<RadioStation[]> {
  const response = await fetchWithFallback(
    `/json/stations/bytagexact/${encodeURIComponent(tag)}?limit=${limit * 2}&hidebroken=true&order=clickcount&reverse=true`
  );
  return filterPlayableStations(await response.json()).slice(0, limit);
}

export async function getStationsByLanguage(
  language: string,
  limit: number = 40
): Promise<RadioStation[]> {
  const response = await fetchWithFallback(
    `/json/stations/bylanguageexact/${encodeURIComponent(language)}?limit=${limit * 2}&hidebroken=true&order=clickcount&reverse=true`
  );
  return filterPlayableStations(await response.json()).slice(0, limit);
}

export async function getCountries(): Promise<Country[]> {
  try {
    const response = await fetchWithFallback('/json/countries?order=stationcount&reverse=true');
    const countries: Country[] = await response.json();
    return countries.filter((c) => c.stationcount > 0 && c.iso_3166_1);
  } catch {
    return [];
  }
}

export async function getLanguages(): Promise<Language[]> {
  try {
    const response = await fetchWithFallback('/json/languages?order=stationcount&reverse=true');
    return response.json();
  } catch {
    return [];
  }
}

export async function getTags(): Promise<Tag[]> {
  try {
    const response = await fetchWithFallback('/json/tags?order=stationcount&reverse=true&limit=100');
    return response.json();
  } catch {
    return [];
  }
}

export async function getStationByUuid(uuid: string): Promise<RadioStation | null> {
  const response = await fetchWithFallback(`/json/stations/byuuid/${encodeURIComponent(uuid)}`);
  const stations = await response.json();
  return stations[0] || null;
}

export async function getStations(
  limit: number = 20,
  offset: number = 0
): Promise<RadioStation[]> {
  const response = await fetchWithFallback(
    `/json/stations?limit=${limit}&offset=${offset}&hidebroken=true&order=clickcount&reverse=true`
  );
  return response.json();
}

export const POPULAR_GENRES = [
  'pop', 'rock', 'jazz', 'classical', 'electronic', 'hiphop',
  'country', 'rnb', 'blues', 'latin', 'reggae', 'metal',
  'folk', 'soul', 'funk', 'disco', 'punk', 'indie',
  'ambient', 'house', 'techno', 'trance', 'dance', 'alternative',
  'oldies', '80s', '90s', '2000s', 'hits', 'top 40',
  'christian', 'gospel', 'islamic', 'meditation',
  'news', 'sports', 'talk', 'comedy', 'podcast',
];
