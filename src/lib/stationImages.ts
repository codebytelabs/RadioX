/** Artwork URL candidates — StationArt tries in order until one loads. */

import { STREAM_HOST_TO_BRAND, LOGO_OVERRIDES, brandHostForStreamUrl } from '@/lib/brandArtwork';

/**
 * Aggregator / Next.js hosts whose broken image paths return 404 HTML with
 * `Link: rel=preload` font headers — Chrome then logs those in the extension popup.
 * Never fetch images directly from these; use Google/Duck favicon proxies instead.
 */
const HTML_TRAP_HOST =
  /^(?:www\.)?(?:radio\.(?:fr|de|net|at|es|pl|it|pt)|rinse\.fm|mytuner-radio\.com|tunein\.com)$/i;

function extractHostname(raw?: string): string | null {
  if (!raw?.trim()) return null;
  try {
    return new URL(raw.trim()).hostname;
  } catch {
    return null;
  }
}

function isHttpUrl(raw?: string): boolean {
  if (!raw?.trim()) return false;
  try {
    const u = new URL(raw.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/** True only for URLs that are safe to use as <img src> (not HTML pages). */
export function looksLikeImageUrl(raw: string): boolean {
  const t = raw.trim();
  if (!t || t === 'null' || t === 'undefined') return false;

  let u: URL;
  try {
    u = new URL(t);
  } catch {
    return false;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;

  const host = u.hostname.toLowerCase();
  const path = u.pathname || '/';

  // Bare site roots → Next.js HTML + font preloads
  if (path === '/' || path === '') return false;

  // Playlists / documents
  if (/\.(m3u8?|pls|asx|html?|php|asp|aspx)(\?|$)/i.test(path)) return false;

  // These hosts 404 many logo paths as HTML shells
  if (HTML_TRAP_HOST.test(host)) return false;

  // Explicit image extensions
  if (/\.(png|jpe?g|gif|webp|ico|svg|avif|pnj)(\?|$)/i.test(path)) return true;

  // Known image CDNs / proxies (often no extension)
  if (
    host.includes('googleusercontent.com') ||
    host.includes('ggpht.com') ||
    host.includes('gstatic.com') ||
    (host.includes('google.com') && path.includes('favicon')) ||
    host.includes('duckduckgo.com') ||
    host.includes('brightspotcdn.com') ||
    host.includes('cloudfront.net') ||
    host.includes('cloudinary.com') ||
    host.includes('imgix.net') ||
    host.includes('laut.fm') ||
    host.includes('radio-browser.info') ||
    host.includes('somafm.com')
  ) {
    return true;
  }

  // Path hints
  if (/\/(images?|img|logo|logos|static|media|avatars?|covers?|artwork)\b/i.test(path)) {
    return true;
  }
  if (/favicon/i.test(path)) return true;

  // Ambiguous URL (e.g. https://turkiyemfm.com) — reject
  return false;
}

function googleIcon(hostname: string, size = 128): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=${size}`;
}

function duckIcon(hostname: string): string {
  return `https://icons.duckduckgo.com/ip3/${hostname}.ico`;
}

export type StationArtSource = {
  favicon?: string;
  homepage?: string;
  url?: string;
  url_resolved?: string;
  name?: string;
  stationuuid?: string;
};

/** Ordered candidates for station artwork. */
export function getStationArtworkCandidates(station: StationArtSource): string[] {
  const out: string[] = [];
  const push = (u: string | null | undefined) => {
    if (!u?.trim()) return;
    const t = u.trim();
    if (!isHttpUrl(t) || !looksLikeImageUrl(t)) return;
    if (out.includes(t)) return;
    out.push(t);
  };

  if (station.stationuuid && LOGO_OVERRIDES[station.stationuuid]) {
    push(LOGO_OVERRIDES[station.stationuuid]);
  }
  push(station.favicon);

  const streamUrl = station.url_resolved || station.url || '';
  const brandFromStream = brandHostForStreamUrl(streamUrl);

  const hosts: string[] = [];
  const homepageHost = extractHostname(station.homepage);
  const faviconHost = extractHostname(station.favicon);
  const streamHost = extractHostname(streamUrl);
  if (homepageHost) hosts.push(homepageHost);
  if (faviconHost && !HTML_TRAP_HOST.test(faviconHost)) hosts.push(faviconHost);
  if (brandFromStream) hosts.push(brandFromStream);
  if (streamHost) hosts.push(streamHost);

  // If favicon/homepage was an aggregator trap, still try brand host for proxies
  if (faviconHost && HTML_TRAP_HOST.test(faviconHost) && brandFromStream) {
    hosts.unshift(brandFromStream);
  }

  const seenHost = new Set<string>();
  for (const host of hosts) {
    if (seenHost.has(host)) continue;
    seenHost.add(host);

    // Aggregator hosts: never fetch their URLs as <img>, but Google/Duck proxies are fine
    if (HTML_TRAP_HOST.test(host)) {
      const mapped = STREAM_HOST_TO_BRAND[host] || brandFromStream;
      const iconHost = mapped || host.replace(/^www\./, '');
      push(googleIcon(iconHost, 128));
      push(duckIcon(iconHost));
      continue;
    }

    const mapped = STREAM_HOST_TO_BRAND[host] || brandHostForStreamUrl(`https://${host}/`);
    const isStreamCdn = /stream|icecast|shoutcast|edge-access|cdn\.|akamai|cloudfront|mediahub|streamguys|rndfnk/i.test(
      host
    );

    if (isStreamCdn) {
      if (mapped) {
        push(googleIcon(mapped, 128));
        push(duckIcon(mapped));
      }
      continue;
    }

    push(googleIcon(host, 128));
    push(duckIcon(host));
  }

  return out;
}

/** First candidate only — prefer getStationArtworkCandidates for UI. */
export function getStationArtworkUrl(station: StationArtSource): string | null {
  return getStationArtworkCandidates(station)[0] ?? null;
}

export function getSafeFaviconUrl(station: StationArtSource): string | null {
  return getStationArtworkUrl(station);
}
