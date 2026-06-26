import { useState, useEffect, useCallback } from 'react';
import type { RadioStation } from '@/types/station';

export function useCustomStations() {
  const [customStations, setCustomStations] = useState<RadioStation[]>([]);

  const load = useCallback(async () => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return;
    try {
      const list = await chrome.runtime.sendMessage({ type: 'GET_CUSTOM_STATIONS' });
      if (Array.isArray(list)) setCustomStations(list);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addCustomStation = async (station: RadioStation) => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return;
    await chrome.runtime.sendMessage({ type: 'ADD_CUSTOM_STATION', data: station });
    setCustomStations((prev) => [station, ...prev.filter((s) => s.stationuuid !== station.stationuuid)].slice(0, 50));
  };

  return { customStations, addCustomStation, reload: load };
}

export function useSleepTimer() {
  const [active, setActive] = useState(false);
  const [scheduledTime, setScheduledTime] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return;
    try {
      const res = await chrome.runtime.sendMessage({ type: 'GET_SLEEP_TIMER' });
      setActive(Boolean(res?.active));
      setScheduledTime(res?.scheduledTime ?? null);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    refresh();
    const listener = (msg: { type?: string }) => {
      if (msg.type === 'SLEEP_TIMER_ENDED') {
        setActive(false);
        setScheduledTime(null);
      }
    };
    chrome.runtime?.onMessage.addListener(listener);
    return () => chrome.runtime?.onMessage.removeListener(listener);
  }, [refresh]);

  const setTimer = async (minutes: number) => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return;
    await chrome.runtime.sendMessage({ type: 'SET_SLEEP_TIMER', data: { minutes } });
    await refresh();
  };

  return { active, scheduledTime, setTimer, refresh };
}
