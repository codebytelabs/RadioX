import type { RadioStation, Country, Language, Tag } from '@/types/station';

// Radio Browser API endpoints - using multiple servers for failover
const API_SERVERS = [
  'https://de1.api.radio-browser.info',
  'https://nl1.api.radio-browser.info',
  'https://at1.api.radio-browser.info'
];

let currentServerIndex = 0;

function getApiBase(): string {
  return API_SERVERS[currentServerIndex];
}

function rotateServer() {
  currentServerIndex = (currentServerIndex + 1) % API_SERVERS.length;
}

async function fetchWithFallback(endpoint: string, options?: RequestInit): Promise<Response> {
  let lastError: Error | null = null;

  for (let i = 0; i < API_SERVERS.length; i++) {
    try {
      const response = await fetch(`${getApiBase()}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'RadioX-Chrome-Extension/1.0',
          ...options?.headers
        }
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

/** Filter stations by HD quality setting. */
export function applyQualityFilter(
  stations: RadioStation[],
  hdOnly: boolean,
  minBitrate = 128
): RadioStation[] {
  if (!hdOnly) return stations;
  return stations.filter((s) => s.bitrate >= minBitrate);
}

export async function voteForStation(stationUuid: string): Promise<boolean> {
  if (!stationUuid || stationUuid.startsWith('custom-')) return false;
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

export async function getTopStations(limit: number = 50): Promise<RadioStation[]> {
  const response = await fetchWithFallback(
    `/json/stations/topvote/${limit}?hidebroken=true`
  );
  return filterPlayableStations(await response.json());
}

/** Most clicked in the last 24h on this API mirror — good for "what's hot now". */
export async function getTopClickedStations(limit: number = 50): Promise<RadioStation[]> {
  const response = await fetchWithFallback(
    `/json/stations/topclick/${limit}?hidebroken=true`
  );
  return filterPlayableStations(await response.json());
}

/** Stations gaining momentum right now (click trend). */
export async function getTrendingStations(limit: number = 50): Promise<RadioStation[]> {
  const response = await fetchWithFallback(
    `/json/stations/search?limit=${limit * 2}&hidebroken=true&order=clicktrend&reverse=true`
  );
  return filterPlayableStations(await response.json()).slice(0, limit);
}

export async function getCountries(): Promise<Country[]> {
  const response = await fetchWithFallback('/json/countries?order=stationcount&reverse=true');
  const countries: Country[] = await response.json();
  return countries.filter((c) => c.stationcount > 0 && c.iso_3166_1);
}

export async function getLanguages(): Promise<Language[]> {
  const response = await fetchWithFallback('/json/languages?order=stationcount&reverse=true');
  return response.json();
}

export async function getTags(): Promise<Tag[]> {
  const response = await fetchWithFallback('/json/tags?order=stationcount&reverse=true&limit=100');
  return response.json();
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

// Popular genre tags
export const POPULAR_GENRES = [
  'pop', 'rock', 'jazz', 'classical', 'electronic', 'hiphop',
  'country', 'rnb', 'blues', 'latin', 'reggae', 'metal',
  'folk', 'soul', 'funk', 'disco', 'punk', 'indie',
  'ambient', 'house', 'techno', 'trance', 'dance', 'alternative',
  'oldies', '80s', '90s', '2000s', 'hits', 'top 40',
  'christian', 'gospel', 'islamic', 'meditation',
  'news', 'sports', 'talk', 'comedy', 'podcast'
];