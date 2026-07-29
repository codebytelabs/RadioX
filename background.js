// RadioX Background Service Worker

let currentStation = null;
let isPlaying = false;
let volume = 0.8;
let nowPlayingTrack = null;

function normalizeVolume(vol) {
  const n = Number(vol);
  if (!Number.isFinite(n)) return 0.8;
  return Math.min(1, Math.max(0, n));
}

/** Mirror of trackLog.sanitizeTrackTitle — keep iHeart soup out of the player. */
function sanitizeTrackTitle(raw) {
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
  if (!t || t.length < 2 || t.length > 160) return null;
  if (/amgArtworkURL|song_spot|catalog\/track|ops=fit\(|i\.iheart\./i.test(t)) return null;
  if (/^https?:\/\//i.test(t) || /^\/\d+\//.test(t)) return null;
  if (/[=<>{}]/.test(t) && !/\s-\s/.test(t)) return null;
  if (/^[\d\s"':._\-]+$/.test(t)) return null;
  if (/^(live|on air|now playing|unknown|n\/?a|null)$/i.test(t)) return null;
  return t;
}

const OFFSCREEN_BUILD = '2.2.0';

async function restorePlayerState() {
  const result = await chrome.storage.local.get([
    'currentStation', 'isPlaying', 'volume', 'nowPlayingTrack',
  ]);
  currentStation = result.currentStation || null;
  isPlaying = Boolean(result.isPlaying && currentStation);
  nowPlayingTrack = sanitizeTrackTitle(result.nowPlayingTrack) || null;
  if (result.volume !== undefined) volume = normalizeVolume(result.volume);
  if (isPlaying && currentStation) {
    chrome.action.setBadgeText({ text: '▶' });
    chrome.action.setBadgeBackgroundColor({ color: '#10b981' });
  }
}

async function persistPlayerState() {
  await chrome.storage.local.set({ currentStation, isPlaying, nowPlayingTrack });
}

restorePlayerState();

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'update' && await hasOffscreenDocument()) {
    try {
      await chrome.offscreen.closeDocument();
    } catch {
      // stale offscreen may already be gone
    }
    await chrome.storage.local.remove('offscreenBuild');
  }

  chrome.storage.local.get(['settings', 'favorites', 'customStations'], (existing) => {
    chrome.storage.local.set({
      favorites: existing.favorites || [],
      recentStations: [],
      customStations: existing.customStations || [],
      volume: 0.8,
      queue: [],
      queueIndex: 0,
      settings: existing.settings || {
        quality: 'high',
        autoPlay: false,
        showNotifications: true,
        hdOnly: false,
        minBitrate: 128,
        eqEnabled: true,
        eqPreset: 'flat',
        eqBands: [0, 0, 0, 0, 0],
        compactMode: false,
        hideDonationBanner: false,
      },
    });
  });
});

async function createOffscreenDocument() {
  const { offscreenBuild } = await chrome.storage.local.get('offscreenBuild');

  if (await hasOffscreenDocument()) {
    if (offscreenBuild === OFFSCREEN_BUILD) return;
    try {
      await chrome.offscreen.closeDocument();
    } catch {
      // continue and recreate
    }
  }

  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['AUDIO_PLAYBACK'],
    justification: 'Play internet radio streams in the background',
  });
  await chrome.storage.local.set({ offscreenBuild: OFFSCREEN_BUILD });
}

async function hasOffscreenDocument() {
  const contexts = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
  return contexts.length > 0;
}

async function sendToOffscreen(message) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await chrome.runtime.sendMessage(message);
    } catch (err) {
      if (attempt === 4) throw err;
      await new Promise((r) => setTimeout(r, 100 * (attempt + 1)));
    }
  }
}

async function getSettings() {
  const { settings } = await chrome.storage.local.get('settings');
  return settings || {};
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.source === 'offscreen') {
    (async () => {
      if (message.type === 'STATUS') {
        switch (message.status) {
          case 'PLAYING':
            isPlaying = true;
            await persistPlayerState();
            break;
          case 'PAUSED':
          case 'ENDED':
            isPlaying = false;
            await persistPlayerState();
            break;
          case 'ERROR':
            isPlaying = false;
            await persistPlayerState();
            chrome.action.setBadgeText({ text: '' });
            break;
        }
        chrome.runtime.sendMessage({
          source: 'offscreen',
          type: 'STATUS',
          status: message.status,
          message: message.message,
        }).catch(() => {});
      } else if (message.type === 'NOW_PLAYING') {
        const next = sanitizeTrackTitle(message.track);
        // Ignore empty/junk updates so a bad poll doesn't wipe the shown title
        if (!next || next === nowPlayingTrack) return;
        nowPlayingTrack = next;
        await persistPlayerState();
        if (currentStation) {
          await appendTrackLog(nowPlayingTrack, currentStation);
        }
        chrome.runtime.sendMessage({
          type: 'NOW_PLAYING_UPDATE',
          track: nowPlayingTrack,
          station: message.station,
        }).catch(() => {});
      }
    })();
    return;
  }

  (async () => {
    try {
      switch (message.type) {
        case 'PLAY':
          await handlePlay(message.data);
          sendResponse({ success: true });
          break;
        case 'STOP':
          await handleStop();
          sendResponse({ success: true });
          break;
        case 'PAUSE':
          isPlaying = false;
          await persistPlayerState();
          await sendToOffscreen({ target: 'offscreen', type: 'PAUSE' });
          sendResponse({ success: true });
          break;
        case 'RESUME':
          if (currentStation) {
            await sendToOffscreen({ target: 'offscreen', type: 'RESUME' });
          }
          sendResponse({ success: true });
          break;
        case 'SET_VOLUME':
          await handleSetVolume(message.data);
          sendResponse({ success: true });
          break;
        case 'SET_EQ':
          await sendToOffscreen({ target: 'offscreen', type: 'SET_EQ', data: message.data });
          sendResponse({ success: true });
          break;
        case 'GET_STATE':
          sendResponse(await getPlayerState());
          break;
        case 'SET_QUEUE':
          await chrome.storage.local.set({
            queue: message.data.queue || [],
            queueIndex: message.data.index ?? 0,
          });
          sendResponse({ success: true });
          break;
        case 'SKIP_NEXT':
          await skipQueue(1);
          sendResponse({ success: true });
          break;
        case 'SKIP_PREV':
          await skipQueue(-1);
          sendResponse({ success: true });
          break;
        case 'SET_SLEEP_TIMER':
          await setSleepTimer(message.data?.minutes ?? 0);
          sendResponse({ success: true });
          break;
        case 'GET_SLEEP_TIMER':
          const alarm = await chrome.alarms.get('sleep-timer');
          sendResponse({ active: Boolean(alarm), scheduledTime: alarm?.scheduledTime });
          break;
        case 'ADD_FAVORITE':
          await addFavorite(message.data);
          sendResponse({ success: true });
          break;
        case 'REMOVE_FAVORITE':
          await removeFavorite(message.data);
          sendResponse({ success: true });
          break;
        case 'GET_FAVORITES':
          sendResponse(await getFavorites());
          break;
        case 'ADD_CUSTOM_STATION':
          await addCustomStation(message.data);
          sendResponse({ success: true });
          break;
        case 'GET_CUSTOM_STATIONS':
          sendResponse(await getCustomStations());
          break;
        case 'ADD_RECENT':
          await addRecent(message.data);
          sendResponse({ success: true });
          break;
        case 'GET_RECENT':
          sendResponse(await getRecent());
          break;
        case 'GET_TRACK_LOG':
          sendResponse(await getTrackLogEntries());
          break;
        case 'TOGGLE_SAVED_TRACK':
          sendResponse({ entries: await toggleSavedTrack(message.id) });
          break;
        case 'CLEAR_TRACK_LOG':
          await chrome.storage.local.set({ trackLog: [] });
          sendResponse({ success: true });
          break;
        case 'GET_STORAGE':
          sendResponse(await chrome.storage.local.get(message.key));
          break;
        case 'SET_STORAGE':
          await chrome.storage.local.set({ [message.key]: message.data });
          sendResponse({ success: true });
          break;
        case 'OPEN_EXTERNAL': {
          const url = typeof message.url === 'string' ? message.url.trim() : '';
          if (!/^https?:\/\//i.test(url)) {
            sendResponse({ success: false, error: 'invalid url' });
            break;
          }
          await chrome.tabs.create({ url, active: true });
          sendResponse({ success: true });
          break;
        }
        default:
          sendResponse({ success: false });
      }
    } catch (error) {
      console.error('Background error:', error);
      sendResponse({ error: error.message });
    }
  })();

  return true;
});

async function handlePlay(station) {
  await createOffscreenDocument();
  currentStation = station;
  isPlaying = false;
  nowPlayingTrack = null;
  await persistPlayerState();

  await incrementStationClicks(station.stationuuid);

  const settings = await getSettings();

  await sendToOffscreen({
    target: 'offscreen',
    type: 'PLAY',
    data: {
      url: station.url_resolved || station.url,
      urls: station.urls || [],
      volume: normalizeVolume(volume),
      station,
      eqEnabled: settings.eqEnabled !== false,
      eqBands: settings.eqBands || [0, 0, 0, 0, 0],
    },
  });

  await addRecent(station);

  try {
    if (settings.showNotifications && chrome.notifications?.create) {
      await chrome.notifications.create(`radiox-${Date.now()}`, {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon128.png'),
        title: 'Now Playing',
        message: `${station.name}${station.country ? ` · ${station.country}` : ''}`,
      });
    }
  } catch {
    // optional
  }

  chrome.action.setBadgeText({ text: '▶' });
  chrome.action.setBadgeBackgroundColor({ color: '#10b981' });
}

async function handleStop() {
  isPlaying = false;
  nowPlayingTrack = null;
  // Keep currentStation + queue so popup can resume / skip
  await persistPlayerState();
  try {
    await sendToOffscreen({ target: 'offscreen', type: 'STOP' });
  } catch {
    // optional
  }
  chrome.action.setBadgeText({ text: '' });
}

async function handleSetVolume(vol) {
  volume = normalizeVolume(vol);
  await chrome.storage.local.set({ volume });
  try {
    await sendToOffscreen({ target: 'offscreen', type: 'SET_VOLUME', data: { volume } });
  } catch {
    // optional
  }
}

async function getPlayerState() {
  await restorePlayerState();
  const { queue, queueIndex } = await chrome.storage.local.get(['queue', 'queueIndex']);
  return {
    isPlaying,
    currentStation,
    volume: normalizeVolume(volume),
    nowPlayingTrack,
    queue: queue || [],
    queueIndex: queueIndex ?? 0,
  };
}

async function skipQueue(direction) {
  const { queue, queueIndex } = await chrome.storage.local.get(['queue', 'queueIndex']);
  if (!queue?.length) return;
  const newIndex = (queueIndex ?? 0) + direction;
  if (newIndex < 0 || newIndex >= queue.length) return;
  await chrome.storage.local.set({ queueIndex: newIndex });
  await handlePlay(queue[newIndex]);
}

async function setSleepTimer(minutes) {
  await chrome.alarms.clear('sleep-timer');
  if (minutes > 0) {
    await chrome.alarms.create('sleep-timer', { delayInMinutes: minutes });
  }
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'sleep-timer') {
    await handleStop();
    chrome.runtime.sendMessage({ type: 'SLEEP_TIMER_ENDED' }).catch(() => {});
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-play') {
    if (isPlaying) {
      isPlaying = false;
      await persistPlayerState();
      await sendToOffscreen({ target: 'offscreen', type: 'PAUSE' });
    } else if (currentStation) {
      await sendToOffscreen({ target: 'offscreen', type: 'RESUME' });
    }
  } else if (command === 'stop-playback') {
    await handleStop();
  } else if (command === 'skip-next') {
    await skipQueue(1);
  } else if (command === 'skip-prev') {
    await skipQueue(-1);
  }
});

async function addFavorite(station) {
  const { favorites = [] } = await chrome.storage.local.get('favorites');
  if (!favorites.find((f) => f.stationuuid === station.stationuuid)) {
    await chrome.storage.local.set({ favorites: [station, ...favorites].slice(0, 200) });
  }
}

async function removeFavorite(stationId) {
  const { favorites = [] } = await chrome.storage.local.get('favorites');
  await chrome.storage.local.set({ favorites: favorites.filter((f) => f.stationuuid !== stationId) });
}

async function getFavorites() {
  const { favorites } = await chrome.storage.local.get('favorites');
  return favorites || [];
}

async function addCustomStation(station) {
  const { customStations = [] } = await chrome.storage.local.get('customStations');
  await chrome.storage.local.set({ customStations: [station, ...customStations].slice(0, 50) });
}

async function getCustomStations() {
  const { customStations } = await chrome.storage.local.get('customStations');
  return customStations || [];
}

async function addRecent(station) {
  const { recentStations = [] } = await chrome.storage.local.get('recentStations');
  const updated = [station, ...recentStations.filter((r) => r.stationuuid !== station.stationuuid)].slice(0, 50);
  await chrome.storage.local.set({ recentStations: updated });
}

async function getRecent() {
  const { recentStations } = await chrome.storage.local.get('recentStations');
  return recentStations || [];
}

const TRACK_LOG_CAP = 200;
const TRACK_DUP_MS = 60_000;

function shouldSkipTrack(title, stationName) {
  const t = String(title || '').trim();
  if (!t || t.length < 3) return true;
  if (/^(live|on air|now playing|unknown|n\/a|null)$/i.test(t)) return true;
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const nt = norm(t);
  const ns = norm(stationName || '');
  if (!nt) return true;
  if (nt === ns) return true;
  if (ns && (nt.includes(ns) || ns.includes(nt)) && Math.abs(nt.length - ns.length) < 8) return true;
  return false;
}

async function appendTrackLog(title, station) {
  if (shouldSkipTrack(title, station?.name)) return;
  const { trackLog = [] } = await chrome.storage.local.get('trackLog');
  const now = Date.now();
  const last = trackLog[0];
  if (
    last &&
    last.title === title.trim() &&
    last.stationUuid === station.stationuuid &&
    now - last.ts < TRACK_DUP_MS
  ) {
    return;
  }
  const entry = {
    id: `${station.stationuuid}:${now}:${title.trim().slice(0, 40)}`,
    title: title.trim(),
    stationName: station.name,
    stationUuid: station.stationuuid,
    favicon: station.favicon || '',
    homepage: station.homepage || '',
    ts: now,
    saved: false,
  };
  await chrome.storage.local.set({ trackLog: [entry, ...trackLog].slice(0, TRACK_LOG_CAP) });
}

async function getTrackLogEntries() {
  const { trackLog } = await chrome.storage.local.get('trackLog');
  return Array.isArray(trackLog) ? trackLog : [];
}

async function toggleSavedTrack(id) {
  const log = await getTrackLogEntries();
  const next = log.map((e) => (e.id === id ? { ...e, saved: !e.saved } : e));
  await chrome.storage.local.set({ trackLog: next });
  return next;
}

async function incrementStationClicks(stationUuid) {
  if (!stationUuid || stationUuid.startsWith('custom-') || stationUuid.startsWith('iprd-') || stationUuid.startsWith('irs-')) return;
  try {
    await fetch(`https://de1.api.radio-browser.info/json/url/${stationUuid}`, { cache: 'no-cache' });
  } catch {
    // stats only
  }
}

setInterval(() => {
  if (isPlaying && currentStation) {
    // keepalive
  }
}, 20000);
