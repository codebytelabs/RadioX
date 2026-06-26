import type { RadioStation } from '@/types/station';

export function createCustomStation(name: string, streamUrl: string): RadioStation {
  const now = new Date().toISOString();
  return {
    changeuuid: crypto.randomUUID(),
    stationuuid: `custom-${crypto.randomUUID()}`,
    name: name.trim(),
    url: streamUrl.trim(),
    url_resolved: streamUrl.trim(),
    homepage: '',
    favicon: '',
    tags: 'custom',
    country: 'Custom',
    countrycode: '',
    state: '',
    language: '',
    languagecodes: '',
    votes: 0,
    lastchangetime: now,
    codec: '',
    bitrate: 0,
    hls: 0,
    lastcheckok: 1,
    lastchecktime: now,
    lastcheckoktime: now,
    clickcount: 0,
    clicktrend: 0,
    ssl_error: 0,
  };
}
