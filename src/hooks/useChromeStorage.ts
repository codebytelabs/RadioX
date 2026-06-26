import { useState, useEffect, useCallback } from 'react';

export function useChromeStorage<T>(key: string, defaultValue: T): [T, (value: T) => Promise<void>] {
  const [value, setValue] = useState<T>(defaultValue);

  useEffect(() => {
    // Check if we're in a Chrome extension context
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
      return;
    }

    chrome.storage.local.get(key, (result: Record<string, any>) => {
      if (result[key] !== undefined) {
        setValue(result[key]);
      }
    });

    // Listen for changes
    const listener = (changes: Record<string, any>) => {
      if (changes[key]) {
        setValue(changes[key].newValue);
      }
    };

    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, [key]);

  const setStoredValue = useCallback(async (newValue: T) => {
    setValue(newValue);
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set({ [key]: newValue });
    }
  }, [key]);

  return [value, setStoredValue];
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      setLoaded(true);
      return;
    }
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_FAVORITES' });
      if (Array.isArray(response)) {
        setFavorites(response);
      }
    } catch (e) {
      console.error('Failed to load favorites:', e);
    }
    setLoaded(true);
  };

  const addFavorite = async (station: any) => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return;
    await chrome.runtime.sendMessage({ type: 'ADD_FAVORITE', data: station });
    setFavorites(prev => {
      const exists = prev.find(f => f.stationuuid === station.stationuuid);
      if (!exists) {
        return [station, ...prev].slice(0, 100);
      }
      return prev;
    });
  };

  const removeFavorite = async (stationId: string) => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return;
    await chrome.runtime.sendMessage({ type: 'REMOVE_FAVORITE', data: stationId });
    setFavorites(prev => prev.filter(f => f.stationuuid !== stationId));
  };

  const isFavorite = (stationId: string) => {
    return favorites.some(f => f.stationuuid === stationId);
  };

  return { favorites, addFavorite, removeFavorite, isFavorite, loaded };
}

export function useRecentStations() {
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    loadRecent();
  }, []);

  const loadRecent = async () => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return;
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_RECENT' });
      if (Array.isArray(response)) {
        setRecent(response);
      }
    } catch (e) {
      console.error('Failed to load recent:', e);
    }
  };

  return { recent, loadRecent };
}