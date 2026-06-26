function extractHostname(raw?: string): string | null {
  if (!raw?.trim()) return null;
  try {
    return new URL(raw.trim()).hostname;
  } catch {
    return null;
  }
}

/** Proxy favicons via Google — avoids loading station HTML/SVGs that pull external fonts. */
export function getSafeFaviconUrl(station: {
  favicon?: string;
  homepage?: string;
  url?: string;
}): string | null {
  const hostname =
    extractHostname(station.favicon) ||
    extractHostname(station.homepage) ||
    extractHostname(station.url);

  if (!hostname) return null;

  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`;
}
