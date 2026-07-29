export type TrackLogEntry = {
  id: string;
  title: string;
  stationName: string;
  stationUuid: string;
  favicon?: string;
  homepage?: string;
  ts: number;
  saved?: boolean;
};

const KEY = 'trackLog';
const CAP = 200;
const DUP_WINDOW_MS = 60_000;

/** Skip station slogans / empty / self-name / iHeart attribute soup. */
export function isSkipTrack(title: string, stationName: string): boolean {
  const t = title.trim();
  if (!t || t.length < 3) return true;
  if (/^[\s\-–—_|/·•.]+$/.test(t)) return true;
  if (/amgArtworkURL|song_spot|catalog\/track|ops=fit\(|i\.iheart\./i.test(t)) return true;
  if (/^https?:\/\//i.test(t) || /^\/\d+\//.test(t)) return true;
  if (/[=<>{}]/.test(t) && !/\s-\s/.test(t)) return true;
  if (/^[\d\s"':._\-]+$/.test(t)) return true;
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const nt = norm(t);
  const ns = norm(stationName);
  if (!nt) return true;
  if (nt === ns) return true;
  if (ns && (nt.includes(ns) || ns.includes(nt)) && Math.abs(nt.length - ns.length) < 8) {
    return true;
  }
  if (/^(live|on air|now playing|unknown|n\/a|null)$/i.test(t)) return true;
  return false;
}

/** Extract a human title from messy ICY / iHeart metadata. */
export function sanitizeTrackTitle(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let t = String(raw).trim();
  if (!t) return null;

  const attr =
    t.match(/\btext="([^"]{2,140})"/i) ||
    t.match(/\btitle="([^"]{2,140})"/i) ||
    t.match(/\bsong_title="([^"]{2,140})"/i);
  if (attr) t = attr[1].trim();

  t = t.split(/\s+(?:amgArtworkURL|song_spot|ads_url|itunes|artworkURL|length=)/i)[0].trim();
  t = t.replace(/^[\s\-–—_|"':]+|[\s\-–—_|"':]+$/g, '').trim();

  if (isSkipTrack(t, '')) return null;
  return t;
}

function makeId(title: string, stationUuid: string, ts: number): string {
  return `${stationUuid}:${ts}:${title.slice(0, 40)}`;
}

export async function getTrackLog(): Promise<TrackLogEntry[]> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return [];
  const { trackLog } = await chrome.storage.local.get(KEY);
  return Array.isArray(trackLog) ? trackLog : [];
}

export async function logTrack(input: {
  title: string;
  stationName: string;
  stationUuid: string;
  favicon?: string;
  homepage?: string;
}): Promise<TrackLogEntry | null> {
  if (isSkipTrack(input.title, input.stationName)) return null;
  const now = Date.now();
  const log = await getTrackLog();
  const last = log[0];
  if (
    last &&
    last.title === input.title.trim() &&
    last.stationUuid === input.stationUuid &&
    now - last.ts < DUP_WINDOW_MS
  ) {
    return last;
  }
  const entry: TrackLogEntry = {
    id: makeId(input.title, input.stationUuid, now),
    title: input.title.trim(),
    stationName: input.stationName,
    stationUuid: input.stationUuid,
    favicon: input.favicon,
    homepage: input.homepage,
    ts: now,
    saved: false,
  };
  const next = [entry, ...log].slice(0, CAP);
  await chrome.storage.local.set({ [KEY]: next });
  return entry;
}

export async function toggleSaved(id: string): Promise<TrackLogEntry[]> {
  const log = await getTrackLog();
  const next = log.map((e) => (e.id === id ? { ...e, saved: !e.saved } : e));
  await chrome.storage.local.set({ [KEY]: next });
  return next;
}

export async function clearLog(): Promise<void> {
  await chrome.storage.local.set({ [KEY]: [] });
}

export type SearchProvider = 'youtube-music' | 'spotify' | 'apple' | 'soundcloud';

/** Strip radio noise so music apps get a usable search query. */
export function searchQueryFromTitle(title: string): string {
  let t = title.trim();
  t = t.replace(/\s*[\[(]?\d{2,3}\s*kbps[\])]?\s*$/i, '');
  t = t.replace(/\s+[|·•]\s+.*$/, '');
  t = t.replace(/\s{2,}/g, ' ').trim();
  return t.slice(0, 120) || title.trim().slice(0, 120);
}

export function findSongUrl(title: string, provider: SearchProvider = 'youtube-music'): string {
  const q = encodeURIComponent(searchQueryFromTitle(title));
  switch (provider) {
    case 'spotify':
      // Path form is what Spotify web expects (query-string often 404s).
      return `https://open.spotify.com/search/${q}`;
    case 'apple':
      return `https://music.apple.com/search?term=${q}`;
    case 'soundcloud':
      return `https://soundcloud.com/search?q=${q}`;
    default:
      // YouTube results is more reliable than music.youtube.com deep links in some regions.
      return `https://www.youtube.com/results?search_query=${q}`;
  }
}

export function trackLogToCsv(entries: TrackLogEntry[]): string {
  const header = 'time,title,station,saved';
  const rows = entries.map((e) => {
    const time = new Date(e.ts).toISOString();
    const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
    return [time, esc(e.title), esc(e.stationName), e.saved ? '1' : '0'].join(',');
  });
  return [header, ...rows].join('\n');
}
