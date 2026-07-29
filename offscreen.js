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
let metadataFetchAbort = null;
let pendingStreamUrl = null;
let icyStreamUrl = null;
let lastIcyTitle = null;
let stallTimer = null;
let lastPlaybackTime = 0;
let streamCandidates = [];
let streamCandidateIndex = 0;
let activePlayRequestId = 0;
const MAX_RETRIES = 3;

function normalizeVolume(vol) {
  const n = Number(vol);
  if (!Number.isFinite(n)) return 0.8;
  return Math.min(1, Math.max(0, n));
}

function mediaErrorLabel(code) {
  switch (code) {
    case 1:
      return 'MEDIA_ERR_ABORTED';
    case 2:
      return 'MEDIA_ERR_NETWORK';
    case 3:
      return 'MEDIA_ERR_DECODE';
    case 4:
      return 'MEDIA_ERR_SRC_NOT_SUPPORTED';
    default:
      return null;
  }
}

function getErrorMessage(err) {
  // <audio> 'error' event → MediaError on target
  const mediaErr = err?.target?.error || (err?.code != null && err?.message != null ? err : null);
  if (mediaErr && typeof mediaErr === 'object' && 'code' in mediaErr) {
    return mediaErr.message || mediaErrorLabel(mediaErr.code) || `Media error ${mediaErr.code}`;
  }
  if (err?.name === 'AbortError') return 'AbortError';
  if (typeof err?.message === 'string' && err.message) return err.message;
  if (typeof err === 'string') return err;
  if (err?.type === 'error' && err?.target) {
    const me = err.target.error;
    if (me) return me.message || mediaErrorLabel(me.code) || 'Media element error';
  }
  return 'Playback error';
}

function isRecoverableError(err) {
  const message = getErrorMessage(err);
  if (err?.name === 'AbortError') return false;
  if (/interrupted|AbortError/i.test(message)) return false;
  return true;
}

function isFormatError(err) {
  const message = getErrorMessage(err).toLowerCase();
  const code = err?.target?.error?.code;
  return (
    code === 4 ||
    message.includes('format error') ||
    message.includes('no supported source') ||
    message.includes('src_not_supported') ||
    message.includes('media_err_src_not_supported') ||
    message.includes('demuxer') ||
    message.includes('pipeline_error')
  );
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
    } else if (icyStreamUrl && currentStation && !metadataFetchAbort) {
      // Resume watcher if it died while audio kept playing
      startMetadataPoll(icyStreamUrl, currentStation);
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

/** Next.js aggregator hosts — broken logos return 404 HTML + font preload Link headers. */
const HTML_TRAP_HOST =
  /^(?:www\.)?(?:radio\.(?:fr|de|net|at|es|pl|it|pt)|rinse\.fm|mytuner-radio\.com|tunein\.com)$/i;

function isAllowedMediaImageUrl(src) {
  try {
    if (!src || src === 'null' || src === 'undefined') return false;
    const u = new URL(src);
    if (u.protocol === 'data:' || u.protocol === 'blob:') return true;
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    const path = u.pathname || '/';
    if (path === '/' || path === '') return false;
    if (HTML_TRAP_HOST.test(u.hostname)) return false;
    if (/\.(m3u8?|pls|asx|html?|php)(\?|$)/i.test(path)) return false;
    if (/\.(png|jpe?g|gif|webp|ico|svg|avif)(\?|$)/i.test(path)) return true;
    if (
      u.hostname.includes('googleusercontent.com') ||
      u.hostname.includes('google.com') ||
      u.hostname.includes('duckduckgo.com') ||
      u.hostname.includes('gstatic.com')
    ) {
      return true;
    }
    return /\/(images?|img|logo|favicon|static|media)\b/i.test(path);
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
    if (!homepage) return [];
    let hostname;
    try {
      hostname = new URL(homepage).hostname;
    } catch {
      return [];
    }
    if (HTML_TRAP_HOST.test(hostname)) {
      // Prefer a real brand host when homepage is an aggregator
      hostname = hostname.replace(/^www\./, '');
    }
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

function scoreStreamUrl(url, bitrate = 0) {
  const u = url.toLowerCase();
  if (u.includes('.m3u8')) return -10000;
  let s = u.startsWith('https') ? 5 : 0;
  if (u.includes('flv') || u.includes('.flv')) s -= 80;
  if (u.includes('aacp') || u.includes('aac+')) s -= 40;
  if (/(^|[-_/])aac([_-]|$)|\.aac(\?|$)/.test(u)) s -= 15;
  if (u.includes('mp3') || u.includes('mpeg')) s += 30;
  if (/(^|[-_/.])(ogg|opus)([-_/.?]|$)/.test(u) || u.endsWith('.ogg')) s -= 20;
  // Bitrate tiebreak: prefer higher known bitrate; treat 0 as ~96
  const br = bitrate > 0 ? bitrate : 96;
  s += Math.min(40, br / 8);
  return s;
}

async function resolvePlaylistUrls(url) {
  const lower = url.toLowerCase();
  if (lower.includes('.m3u8')) return [];
  if (!lower.includes('.m3u') && !lower.includes('.pls') && !lower.includes('.asx')) {
    return [url];
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  const found = [];

  try {
    const response = await fetch(url, { signal: controller.signal });
    const text = await response.text();

    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      if (/^https?:\/\//i.test(trimmed)) {
        found.push(trimmed);
        continue;
      }
      const plsMatch = trimmed.match(/^File\d=(.+)$/i);
      if (plsMatch) found.push(plsMatch[1].trim());
    }
  } catch (err) {
    console.warn('Playlist resolve failed:', getErrorMessage(err));
  } finally {
    clearTimeout(timeout);
  }

  return found.filter((u) => isDirectAudioUrl(u)).sort((a, b) => scoreStreamUrl(b) - scoreStreamUrl(a));
}

/** Follow redirects; drop HTML/JSON that cause Format error. Soft-fail if probe flaky. */
async function normalizePlayableUrl(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Range: 'bytes=0-1' },
      signal: controller.signal,
      redirect: 'follow',
    });
    const ct = (response.headers.get('content-type') || '').toLowerCase();
    try {
      response.body?.cancel();
    } catch {
      // ignore
    }
    if (ct.includes('text/html') || ct.includes('application/json') || ct.includes('mpegurl')) {
      return null;
    }
    if (response.ok || response.status === 206) return response.url || url;
    // Some Icecast endpoints reject Range — still hand URL to <audio>
    return url;
  } catch {
    return url;
  } finally {
    clearTimeout(timeout);
  }
}

async function buildStreamCandidates(data) {
  const raw = [];
  const push = (u) => {
    if (u && typeof u === 'string') raw.push(u.trim());
  };
  push(data.url);
  (data.urls || []).forEach(push);
  (data.station?.urls || []).forEach(push);
  push(data.station?.url_resolved);
  push(data.station?.url);

  const expanded = [];
  for (const u of raw) {
    const resolved = await resolvePlaylistUrls(u);
    if (resolved.length) expanded.push(...resolved);
    else if (isDirectAudioUrl(u)) expanded.push(u);
  }

  const unique = [...new Set(expanded)].filter(isDirectAudioUrl);
  const br = data.station?.bitrate || data.bitrate || 0;
  unique.sort((a, b) => scoreStreamUrl(b, br) - scoreStreamUrl(a, br));
  return unique;
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
  const match =
    text.match(/StreamTitle='([^']*)'/) ||
    text.match(/StreamTitle="([^"]*)"/) ||
    text.match(/StreamTitle=([^;]+)/);
  const raw = match?.[1]?.trim() || null;
  return sanitizeIcyTitle(raw);
}

/** Clean iHeart / broken ICY titles — never show amgArtworkURL soup in the player. */
function sanitizeIcyTitle(raw) {
  if (!raw) return null;
  let t = String(raw).trim();
  if (!t) return null;

  const attr =
    t.match(/\btext="([^"]{2,140})"/i) ||
    t.match(/\btitle="([^"]{2,140})"/i) ||
    t.match(/\bsong_title="([^"]{2,140})"/i);
  if (attr) t = attr[1].trim();

  // Cut attribute soup after a real title fragment
  t = t.split(/\s+(?:amgArtworkURL|song_spot|ads_url|itunes|artworkURL|length=)/i)[0].trim();
  t = t.replace(/^[\s\-–—_|"':]+|[\s\-–—_|"':]+$/g, '').trim();

  if (!t || t.length < 2 || t.length > 160) return null;
  if (/^https?:\/\//i.test(t)) return null;
  if (/^\/\d+\//.test(t) || /catalog\/track/i.test(t)) return null;
  if (/amgArtworkURL|song_spot|ops=fit\(|i\.iheart\./i.test(t)) return null;
  if (/[=<>{}]/.test(t)) return null;
  if (/^[\d\s"':._\-]+$/.test(t)) return null;
  if (/^(live|on air|now playing|unknown|n\/?a|null)$/i.test(t)) return null;

  return t;
}

async function fetchIcyMetadata(streamUrl, signal) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

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
    let buf = new Uint8Array(0);

    const pull = async (n) => {
      while (buf.length < n) {
        const { done, value } = await reader.read();
        if (done) return false;
        buf = concatUint8([buf, value]);
      }
      return true;
    };

    // Skip empty meta blocks — Icecast often pads with length 0 between titles
    for (let i = 0; i < 12; i++) {
      if (!(await pull(metaInt + 1))) break;
      const metaLength = buf[metaInt] * 16;
      buf = buf.slice(metaInt + 1);
      if (!(await pull(metaLength))) break;
      const metaBytes = buf.slice(0, metaLength);
      buf = buf.slice(metaLength);
      if (metaLength <= 0) continue;
      const title = parseIcyMetaBlock(metaBytes);
      if (title) {
        reader.cancel().catch(() => {});
        return title;
      }
    }

    reader.cancel().catch(() => {});
    return null;
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

function emitIcyTitle(title, station) {
  if (!title || !currentStation) return;
  if (title === lastIcyTitle) return;
  lastIcyTitle = title;
  notifyBackground('NOW_PLAYING', { track: title, station });
  updateMediaSession(station, title);
}

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const t = setTimeout(resolve, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/** Long-lived ICY reader — title changes arrive in later meta blocks on the same connection. */
async function readIcyStreamContinuous(streamUrl, station, signal) {
  const response = await fetch(streamUrl, {
    method: 'GET',
    headers: { 'Icy-MetaData': '1' },
    signal,
  });

  const metaInt = parseInt(response.headers.get('icy-metaint') || '0', 10);
  if (!metaInt || !response.body) {
    const title = await fetchIcyMetadata(streamUrl, signal);
    emitIcyTitle(title, station);
    return;
  }

  const reader = response.body.getReader();
  let buf = new Uint8Array(0);

  const pull = async (n) => {
    while (buf.length < n) {
      const { done, value } = await reader.read();
      if (done) return false;
      buf = concatUint8([buf, value]);
    }
    return true;
  };

  while (!signal.aborted) {
    if (!(await pull(metaInt + 1))) break;
    const metaLength = buf[metaInt] * 16;
    buf = buf.slice(metaInt + 1);
    if (metaLength > 0) {
      if (!(await pull(metaLength))) break;
      const title = parseIcyMetaBlock(buf.slice(0, metaLength));
      buf = buf.slice(metaLength);
      emitIcyTitle(title, station);
    }
  }
}

async function watchIcyMetadata(url, station, signal) {
  let attempt = 0;
  while (!signal.aborted) {
    try {
      await readIcyStreamContinuous(url, station, signal);
      if (signal.aborted) return;
      // Stream ended — brief pause then reconnect
      attempt = Math.min(attempt + 1, 5);
    } catch (err) {
      if (signal.aborted || err?.name === 'AbortError') return;
      attempt = Math.min(attempt + 1, 5);
    }
    try {
      await sleep(Math.min(25000, 3000 * attempt), signal);
    } catch {
      return;
    }
  }
}

function stopMetadataPoll() {
  if (metadataDelayTimer) {
    clearTimeout(metadataDelayTimer);
    metadataDelayTimer = null;
  }
  if (metadataFetchAbort) {
    metadataFetchAbort.abort();
    metadataFetchAbort = null;
  }
  lastIcyTitle = null;
}

function startMetadataPoll(url, station) {
  stopMetadataPoll();
  icyStreamUrl = url;
  lastIcyTitle = null;

  const ac = new AbortController();
  metadataFetchAbort = ac;

  // Wait until audio connection is stable — parallel fetch breaks some Icecast servers
  metadataDelayTimer = setTimeout(() => {
    metadataDelayTimer = null;
    if (ac.signal.aborted) return;
    void watchIcyMetadata(url, station, ac.signal);
  }, 6000);
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
  if (/interrupted|AbortError/i.test(detail)) {
    // Station switch race — not a real failure
    return;
  }
  console.warn('Audio error:', detail);

  if (!isRecoverableError(e)) {
    notifyBackground('STATUS', { status: 'ERROR', message: detail || 'Playback failed' });
    return;
  }

  // Format / unsupported source → next candidate, not same URL again
  if (isFormatError(e) && streamCandidateIndex + 1 < streamCandidates.length) {
    streamCandidateIndex += 1;
    retryCount = 0;
    console.warn('Trying another stream format…');
    const requestId = activePlayRequestId;
    setTimeout(() => {
      if (requestId !== playRequestId) return;
      playCandidate(requestId).catch((err) => {
        const msg = getErrorMessage(err);
        if (!/interrupted|AbortError/i.test(msg)) {
          console.warn('Candidate failover failed:', msg);
        }
      });
    }, 150);
    return;
  }

  if (retryCount >= MAX_RETRIES || !audio?.src) {
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
      const msg = getErrorMessage(err);
      if (isRecoverableError(err) && !/interrupted/i.test(msg)) {
        console.warn('Retry failed:', msg);
      }
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
      const msg = getErrorMessage(error);
      if (!/interrupted|AbortError/i.test(msg)) {
        console.warn('Offscreen error:', msg);
      }
      sendResponse({ error: msg });
    }
  })();

  return true;
});

async function playCandidate(requestId) {
  while (streamCandidateIndex < streamCandidates.length) {
    if (requestId !== playRequestId) return;

    const rawUrl = streamCandidates[streamCandidateIndex];
    const streamUrl = await normalizePlayableUrl(rawUrl);
    if (!streamUrl || !isDirectAudioUrl(streamUrl)) {
      streamCandidateIndex += 1;
      continue;
    }
    if (requestId !== playRequestId) return;

    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    await new Promise((r) => setTimeout(r, 40));
    if (requestId !== playRequestId) return;

    audio.src = streamUrl;
    pendingStreamUrl = streamUrl;
    updateMediaSession(currentStation, null);

    try {
      await audio.play();
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
      return;
    } catch (err) {
      if (requestId !== playRequestId || !isRecoverableError(err)) return;
      if (isFormatError(err) && streamCandidateIndex + 1 < streamCandidates.length) {
        console.warn('Trying next stream URL after format error:', streamUrl);
        streamCandidateIndex += 1;
        continue;
      }
      handleAudioError(err);
      return;
    }
  }

  notifyBackground('STATUS', {
    status: 'ERROR',
    message: 'No supported stream format for this station',
  });
}

async function playStream(data) {
  const requestId = ++playRequestId;
  activePlayRequestId = requestId;
  initAudioGraph();
  retryCount = 0;
  currentStation = data.station || { name: 'Radio', country: '' };

  stopMetadataPoll();
  streamCandidates = await buildStreamCandidates(data);
  streamCandidateIndex = 0;

  if (!streamCandidates.length) {
    notifyBackground('STATUS', {
      status: 'ERROR',
      message: 'Could not resolve stream URL',
    });
    return;
  }
  if (requestId !== playRequestId) return;

  setVolume(data.volume ?? currentVolume);
  applyEq(data.eqBands, data.eqEnabled);

  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }

  await playCandidate(requestId);
}

function stopStream() {
  playRequestId++;
  retryCount = 0;
  streamCandidates = [];
  streamCandidateIndex = 0;
  pendingStreamUrl = null;
  icyStreamUrl = null;
  stopMetadataPoll();
  stopStallWatch();
  // Keep currentStation reference for media session identity; audio stops

  if (audio) {
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
  }

  if ('mediaSession' in navigator) {
    navigator.mediaSession.playbackState = 'none';
  }
}

setInterval(() => {
  if (audio && !audio.paused) {
    // Keep offscreen alive while playing
  }
}, 25000);
