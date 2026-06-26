// RadioX Offscreen Audio Player — playback, EQ, ICY metadata, Media Session

const EQ_FREQS = [60, 230, 910, 3600, 14000];
const EQ_PRESETS = {
  flat: [0, 0, 0, 0, 0],
  bass: [8, 5, 0, 0, 0],
  treble: [0, 0, 0, 5, 8],
  vocal: [-2, 0, 4, 4, 0],
  rock: [5, 3, -1, 2, 5],
  electronic: [6, 4, 0, 2, 4],
  acoustic: [4, 2, 0, 2, 4],
};

let audio = null;
let audioContext = null;
let sourceNode = null;
let gainNode = null;
let eqFilters = [];
let graphReady = false;
let eqEnabled = true;
let currentVolume = 0.8;
let retryCount = 0;
let playRequestId = 0;
let currentStation = null;
let metadataDelayTimer = null;
let metadataIntervalTimer = null;
let metadataFetchAbort = null;
let pendingStreamUrl = null;
let stallTimer = null;
let lastPlaybackTime = 0;
const MAX_RETRIES = 3;

function normalizeVolume(vol) {
  const n = Number(vol);
  if (!Number.isFinite(n)) return 0.8;
  return Math.min(1, Math.max(0, n));
}

function getErrorMessage(err) {
  return err?.target?.error?.message || err?.message || String(err);
}

function isRecoverableError(err) {
  const message = getErrorMessage(err);
  if (err?.name === 'AbortError') return false;
  if (message.includes('interrupted')) return false;
  return true;
}

function notifyBackground(type, data = {}) {
  chrome.runtime.sendMessage({ source: 'offscreen', type, ...data }).catch(() => {});
}

function initAudioGraph() {
  if (graphReady) return;
  audio = new Audio();
  audio.preload = 'none';

  audioContext = new AudioContext();
  sourceNode = audioContext.createMediaElementSource(audio);
  gainNode = audioContext.createGain();

  eqFilters = EQ_FREQS.map((freq) => {
    const filter = audioContext.createBiquadFilter();
    filter.type = 'peaking';
    filter.frequency.value = freq;
    filter.Q.value = 1.4;
    filter.gain.value = 0;
    return filter;
  });

  let node = sourceNode;
  eqFilters.forEach((f) => {
    node.connect(f);
    node = f;
  });
  node.connect(gainNode);
  gainNode.connect(audioContext.destination);

  gainNode.gain.value = currentVolume;
  graphReady = true;

  audio.addEventListener('error', handleAudioError);
  audio.addEventListener('playing', () => {
    retryCount = 0;
    lastPlaybackTime = audio.currentTime;
    if (audioContext?.state === 'suspended') {
      audioContext.resume().catch(() => {});
    }
    notifyBackground('STATUS', { status: 'PLAYING' });
    startStallWatch();
    if (pendingStreamUrl && currentStation) {
      startMetadataPoll(pendingStreamUrl, currentStation);
      pendingStreamUrl = null;
    }
  });
  audio.addEventListener('pause', () => {
    stopStallWatch();
    notifyBackground('STATUS', { status: 'PAUSED' });
  });
  audio.addEventListener('ended', () => {
    stopStallWatch();
    notifyBackground('STATUS', { status: 'ENDED' });
  });
  audio.addEventListener('timeupdate', () => {
    if (audio && !audio.paused) lastPlaybackTime = audio.currentTime;
  });
}

function getAudio() {
  if (!graphReady) initAudioGraph();
  return audio;
}

function applyEq(bands, enabled) {
  eqEnabled = enabled !== false;
  const values = bands || EQ_PRESETS.flat;
  eqFilters.forEach((filter, i) => {
    filter.gain.value = eqEnabled ? (values[i] ?? 0) : 0;
  });
}

function setVolume(vol) {
  currentVolume = normalizeVolume(vol);
  if (gainNode) gainNode.gain.value = currentVolume;
  else if (audio) audio.volume = currentVolume;
}

function isAllowedMediaImageUrl(src) {
  try {
    const protocol = new URL(src).protocol;
    return protocol === 'http:' || protocol === 'https:' || protocol === 'data:' || protocol === 'blob:';
  } catch {
    return false;
  }
}

function getMediaArtwork(station) {
  try {
    const favicon = station.favicon || '';
    if (favicon && isAllowedMediaImageUrl(favicon)) {
      return [{ src: favicon, sizes: '128x128', type: 'image/png' }];
    }

    const homepage = station.homepage || station.url_resolved || station.url || '';
    if (!homepage || !isAllowedMediaImageUrl(homepage)) return [];

    const hostname = new URL(homepage).hostname;
    const src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=128`;
    if (!isAllowedMediaImageUrl(src)) return [];

    return [{ src, sizes: '128x128', type: 'image/png' }];
  } catch {
    return [];
  }
}

function isDirectAudioUrl(url) {
  if (!url) return false;
  const u = url.toLowerCase();
  if (u.includes('.m3u8')) return false;
  return true;
}

async function resolveStreamUrl(url) {
  const lower = url.toLowerCase();
  if (lower.includes('.m3u8')) return null;
  if (!lower.includes('.m3u') && !lower.includes('.pls') && !lower.includes('.asx')) {
    return url;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    const text = await response.text();

    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      if (/^https?:\/\//i.test(trimmed)) return trimmed;
      const plsMatch = trimmed.match(/^File\d=(.+)$/i);
      if (plsMatch) return plsMatch[1].trim();
    }
  } catch (err) {
    console.warn('Playlist resolve failed:', getErrorMessage(err));
  } finally {
    clearTimeout(timeout);
  }

  return null;
}

function updateMediaSession(station, trackTitle) {
  if (!('mediaSession' in navigator) || !station) return;

  const title = trackTitle || station.name;
  const artist = trackTitle ? station.name : (station.country || 'RadioX');

  try {
    const artwork = getMediaArtwork(station).filter((img) => isAllowedMediaImageUrl(img.src));
    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist,
      album: 'Internet Radio',
      ...(artwork.length > 0 ? { artwork } : {}),
    });
  } catch (e) {
    console.warn('Media session metadata failed:', e);
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title,
        artist,
        album: 'Internet Radio',
      });
    } catch {
      // text-only metadata — never pass chrome-extension:// artwork
    }
  }

  navigator.mediaSession.playbackState = audio && !audio.paused ? 'playing' : 'paused';

  try {
    navigator.mediaSession.setActionHandler('play', async () => {
      await audioContext?.resume();
      await audio?.play();
    });
    navigator.mediaSession.setActionHandler('pause', () => audio?.pause());
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      chrome.runtime.sendMessage({ type: 'SKIP_PREV' }).catch(() => {});
    });
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      chrome.runtime.sendMessage({ type: 'SKIP_NEXT' }).catch(() => {});
    });
  } catch {
    // Some handlers may not be supported
  }
}

function parseIcyMetaBlock(bytes) {
  const text = new TextDecoder('utf-8').decode(bytes);
  const match = text.match(/StreamTitle='([^']*)'/);
  return match?.[1]?.trim() || null;
}

async function fetchIcyMetadata(streamUrl, signal) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);

  try {
    const response = await fetch(streamUrl, {
      method: 'GET',
      headers: { 'Icy-MetaData': '1' },
      signal: controller.signal,
    });

    const metaInt = parseInt(response.headers.get('icy-metaint') || '0', 10);
    if (!metaInt || !response.body) return null;

    const reader = response.body.getReader();
    let received = 0;
    let chunks = [];

    while (received < metaInt + 1) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
    }

    const all = concatUint8(chunks);
    const metaLengthByte = all[metaInt];
    const metaLength = metaLengthByte * 16;
    if (metaLength <= 0) {
      reader.cancel();
      return null;
    }

    let metaBytes = all.slice(metaInt + 1, metaInt + 1 + metaLength);
    if (metaBytes.length < metaLength) {
      const { value } = await reader.read();
      if (value) metaBytes = concatUint8([metaBytes, value]).slice(0, metaLength);
    }

    reader.cancel();
    return parseIcyMetaBlock(metaBytes);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', onAbort);
  }
}

function concatUint8(arrays) {
  const total = arrays.reduce((sum, a) => sum + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  arrays.forEach((a) => {
    out.set(a, offset);
    offset += a.length;
  });
  return out;
}

function stopMetadataPoll() {
  if (metadataDelayTimer) {
    clearTimeout(metadataDelayTimer);
    metadataDelayTimer = null;
  }
  if (metadataIntervalTimer) {
    clearInterval(metadataIntervalTimer);
    metadataIntervalTimer = null;
  }
  if (metadataFetchAbort) {
    metadataFetchAbort.abort();
    metadataFetchAbort = null;
  }
  pendingStreamUrl = null;
}

function startMetadataPoll(url, station) {
  stopMetadataPoll();

  const poll = async () => {
    if (!audio || audio.paused) return;

    metadataFetchAbort = new AbortController();
    try {
      const title = await fetchIcyMetadata(url, metadataFetchAbort.signal);
      if (title && currentStation) {
        notifyBackground('NOW_PLAYING', { track: title, station });
        updateMediaSession(station, title);
      }
    } finally {
      metadataFetchAbort = null;
    }
  };

  // Wait until audio connection is stable — parallel fetch breaks many Icecast servers
  metadataDelayTimer = setTimeout(() => {
    metadataDelayTimer = null;
    poll();
    metadataIntervalTimer = setInterval(poll, 20000);
  }, 8000);
}

function startStallWatch() {
  stopStallWatch();
  let lastCheck = lastPlaybackTime;
  stallTimer = setInterval(() => {
    if (!audio || audio.paused) return;

    // Live streams often keep currentTime at 0 — only detect stalls when time advances
    if (audio.currentTime > 0 && audio.currentTime === lastCheck) {
      console.warn('Stream stall detected, retrying...');
      handleAudioError({ message: 'Stream stalled' });
    }
    lastCheck = audio.currentTime;
  }, 15000);
}

function stopStallWatch() {
  if (stallTimer) {
    clearInterval(stallTimer);
    stallTimer = null;
  }
}

function handleAudioError(e) {
  const detail = getErrorMessage(e);
  console.error('Audio error:', detail);

  if (!isRecoverableError(e) || retryCount >= MAX_RETRIES || !audio?.src) {
    notifyBackground('STATUS', { status: 'ERROR', message: detail || 'Playback failed' });
    return;
  }

  retryCount++;
  const src = audio.src;
  setTimeout(async () => {
    if (!audio || audio.src !== src) return;
    try {
      await audio.play();
    } catch (err) {
      if (isRecoverableError(err)) console.error('Retry failed:', getErrorMessage(err));
    }
  }, 2000);
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.target !== 'offscreen') return;

  (async () => {
    try {
      switch (message.type) {
        case 'PLAY':
          await playStream(message.data);
          sendResponse({ success: true });
          break;
        case 'STOP':
          stopStream();
          sendResponse({ success: true });
          break;
        case 'PAUSE':
          audio?.pause();
          sendResponse({ success: true });
          break;
        case 'RESUME':
          if (audioContext?.state === 'suspended') {
            await audioContext.resume();
          }
          await audio?.play();
          sendResponse({ success: true });
          break;
        case 'SET_VOLUME': {
          const vol = message.data?.volume ?? message.data;
          setVolume(vol);
          sendResponse({ success: true });
          break;
        }
        case 'SET_EQ':
          applyEq(message.data?.bands, message.data?.enabled);
          sendResponse({ success: true });
          break;
        default:
          sendResponse({ success: false });
      }
    } catch (error) {
      console.error('Offscreen error:', getErrorMessage(error));
      sendResponse({ error: getErrorMessage(error) });
    }
  })();

  return true;
});

async function playStream(data) {
  const requestId = ++playRequestId;
  initAudioGraph();
  retryCount = 0;
  currentStation = data.station || { name: 'Radio', country: '' };

  stopMetadataPoll();

  const streamUrl = await resolveStreamUrl(data.url);
  if (!streamUrl || !isDirectAudioUrl(streamUrl)) {
    notifyBackground('STATUS', {
      status: 'ERROR',
      message: streamUrl ? 'HLS streams are not supported — pick another station' : 'Could not resolve stream URL',
    });
    return;
  }
  if (requestId !== playRequestId) return;

  setVolume(data.volume ?? currentVolume);
  applyEq(data.eqBands, data.eqEnabled);

  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }

  audio.pause();
  audio.removeAttribute('src');
  audio.load();
  await new Promise((r) => setTimeout(r, 50));
  if (requestId !== playRequestId) return;

  audio.src = streamUrl;
  pendingStreamUrl = streamUrl;

  updateMediaSession(currentStation, null);

  try {
    await audio.play();
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
  } catch (err) {
    if (requestId !== playRequestId || !isRecoverableError(err)) return;
    handleAudioError(err);
  }
}

function stopStream() {
  playRequestId++;
  retryCount = 0;
  stopMetadataPoll();
  stopStallWatch();
  currentStation = null;

  if (audio) {
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
  }

  if ('mediaSession' in navigator) {
    navigator.mediaSession.playbackState = 'none';
    navigator.mediaSession.metadata = null;
  }
}

setInterval(() => {
  if (audio && !audio.paused) {
    // Keep offscreen alive while playing
  }
}, 25000);
