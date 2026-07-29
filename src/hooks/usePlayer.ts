import { useState, useEffect, useCallback, useRef } from 'react';
import type { RadioStation } from '@/types/station';
import { normalizeVolume } from '@/lib/utils';

export function usePlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStation, setCurrentStation] = useState<RadioStation | null>(null);
  const [nowPlayingTrack, setNowPlayingTrack] = useState<string | null>(null);
  const [volume, setVolumeState] = useState(0.8);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queueLength, setQueueLength] = useState(0);
  const [queueIndex, setQueueIndex] = useState(0);
  const initRef = useRef(false);
  const playTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPlayTimeout = useCallback(() => {
    if (playTimeoutRef.current) {
      clearTimeout(playTimeoutRef.current);
      playTimeoutRef.current = null;
    }
    if (hintTimeoutRef.current) {
      clearTimeout(hintTimeoutRef.current);
      hintTimeoutRef.current = null;
    }
  }, []);

  const startPlayTimeout = useCallback(() => {
    clearPlayTimeout();
    // Soft hint at 8s
    hintTimeoutRef.current = setTimeout(() => {
      setIsLoading((loading) => {
        if (loading) setError('Still connecting…');
        return loading;
      });
    }, 8000);
    // Hard error at 15s
    playTimeoutRef.current = setTimeout(() => {
      setIsLoading((loading) => {
        if (loading) {
          setError('Stream failed to start — try another station');
          return false;
        }
        return loading;
      });
    }, 15000);
  }, [clearPlayTimeout]);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const initState = async () => {
      if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return;
      try {
        const stored = await chrome.storage.local.get([
          'currentStation', 'isPlaying', 'volume', 'nowPlayingTrack', 'queue', 'queueIndex',
        ]);
        if (stored.currentStation) {
          setCurrentStation(stored.currentStation as RadioStation);
          setIsPlaying(Boolean(stored.isPlaying));
          setVolumeState(normalizeVolume(stored.volume));
          setNowPlayingTrack(typeof stored.nowPlayingTrack === 'string' ? stored.nowPlayingTrack : null);
          setQueueLength(Array.isArray(stored.queue) ? stored.queue.length : 0);
          setQueueIndex(typeof stored.queueIndex === 'number' ? stored.queueIndex : 0);
          return;
        }

        const state = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
        if (state?.currentStation) {
          setIsPlaying(Boolean(state.isPlaying));
          setCurrentStation(state.currentStation);
          setVolumeState(normalizeVolume(state.volume));
          setNowPlayingTrack(state.nowPlayingTrack || null);
          setQueueLength(state.queue?.length || 0);
          setQueueIndex(state.queueIndex ?? 0);
        }
      } catch {
        // background not ready
      }
    };

    initState();

    const listener = (message: {
      source?: string;
      type?: string;
      status?: string;
      track?: string;
      message?: string;
    }) => {
      if (message.type === 'NOW_PLAYING_UPDATE') {
        setNowPlayingTrack(message.track || null);
        return;
      }
      if (message.source === 'offscreen' || message.type === 'STATUS') {
        switch (message.status) {
          case 'PLAYING':
            clearPlayTimeout();
            setIsPlaying(true);
            setIsLoading(false);
            setError(null);
            break;
          case 'PAUSED':
            clearPlayTimeout();
            setIsPlaying(false);
            setIsLoading(false);
            break;
          case 'ENDED':
            clearPlayTimeout();
            setIsPlaying(false);
            setIsLoading(false);
            break;
          case 'ERROR':
            clearPlayTimeout();
            setIsPlaying(false);
            setIsLoading(false);
            setError(message.message || 'Playback error');
            break;
        }
      }
      if (message.type === 'SLEEP_TIMER_ENDED') {
        setIsPlaying(false);
        setCurrentStation(null);
        setNowPlayingTrack(null);
      }
    };

    const onStorage = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (changes.nowPlayingTrack) {
        const v = changes.nowPlayingTrack.newValue;
        setNowPlayingTrack(typeof v === 'string' && v ? v : null);
      }
    };

    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener(listener);
      chrome.storage?.onChanged?.addListener(onStorage);
      return () => {
        chrome.runtime.onMessage.removeListener(listener);
        chrome.storage?.onChanged?.removeListener(onStorage);
        clearPlayTimeout();
      };
    }
  }, [clearPlayTimeout]);

  const setQueue = useCallback(async (queue: RadioStation[], index: number) => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return;
    await chrome.runtime.sendMessage({ type: 'SET_QUEUE', data: { queue, index } });
    setQueueLength(queue.length);
    setQueueIndex(index);
  }, []);

  const play = useCallback(async (station: RadioStation, list?: RadioStation[]) => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      setError('Extension context not available');
      return;
    }

    setIsLoading(true);
    setError(null);
    setCurrentStation(station);
    setNowPlayingTrack(null);

    if (list?.length) {
      const idx = list.findIndex((s) => s.stationuuid === station.stationuuid);
      await setQueue(list, idx >= 0 ? idx : 0);
    }

    try {
      startPlayTimeout();
      await chrome.runtime.sendMessage({ type: 'PLAY', data: station });
      // isPlaying flips true only when offscreen sends PLAYING status
    } catch {
      clearPlayTimeout();
      setError('Failed to start playback');
      setIsLoading(false);
      setIsPlaying(false);
    }
  }, [setQueue, startPlayTimeout, clearPlayTimeout]);

  const stop = useCallback(async () => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return;
    try {
      clearPlayTimeout();
      await chrome.runtime.sendMessage({ type: 'STOP' });
      setIsPlaying(false);
      setIsLoading(false);
      setNowPlayingTrack(null);
      setError(null);
      // Keep currentStation + queue so user can resume / skip
    } catch (err) {
      console.error('Stop error:', err);
    }
  }, [clearPlayTimeout]);

  const togglePlay = useCallback(async () => {
    if (!currentStation) return;
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return;

    if (isPlaying) {
      await chrome.runtime.sendMessage({ type: 'PAUSE' });
      setIsPlaying(false);
    } else {
      setIsLoading(true);
      startPlayTimeout();
      await chrome.runtime.sendMessage({ type: 'RESUME' });
      // wait for PLAYING status from offscreen
    }
  }, [isPlaying, currentStation, startPlayTimeout]);

  const skipNext = useCallback(async () => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return;
    setIsLoading(true);
    startPlayTimeout();
    await chrome.runtime.sendMessage({ type: 'SKIP_NEXT' });
    const state = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
    if (state?.currentStation) {
      setCurrentStation(state.currentStation);
      setNowPlayingTrack(state.nowPlayingTrack || null);
      setQueueIndex(state.queueIndex ?? 0);
    }
  }, [startPlayTimeout]);

  const skipPrev = useCallback(async () => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return;
    setIsLoading(true);
    startPlayTimeout();
    await chrome.runtime.sendMessage({ type: 'SKIP_PREV' });
    const state = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
    if (state?.currentStation) {
      setCurrentStation(state.currentStation);
      setNowPlayingTrack(state.nowPlayingTrack || null);
      setQueueIndex(state.queueIndex ?? 0);
    }
  }, [startPlayTimeout]);

  const setVolume = useCallback(async (vol: number) => {
    const clamped = normalizeVolume(vol);
    setVolumeState(clamped);
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      try {
        await chrome.runtime.sendMessage({ type: 'SET_VOLUME', data: clamped });
      } catch {
        // ignore
      }
    }
  }, []);

  return {
    isPlaying,
    currentStation,
    nowPlayingTrack,
    volume,
    isLoading,
    error,
    queueLength,
    queueIndex,
    play,
    stop,
    togglePlay,
    skipNext,
    skipPrev,
    setVolume,
    setQueue,
  };
}
