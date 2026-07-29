import { useState, useEffect, useCallback } from 'react';
import type { AppSettings } from '@/types/station';
import { EQ_PRESETS } from '@/lib/eqPresets';

export const DEFAULT_SETTINGS: AppSettings = {
  quality: 'high',
  autoPlay: false,
  showNotifications: true,
  hdOnly: false,
  minBitrate: 128,
  eqEnabled: true,
  eqPreset: 'flat',
  eqBands: [...EQ_PRESETS.flat],
  compactMode: false,
  supporter: false,
  searchProvider: 'youtube-music',
  hideSupportTip: false,
};

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
      setLoaded(true);
      return;
    }

    chrome.storage.local.get('settings', (result) => {
      if (result.settings) {
        setSettings({ ...DEFAULT_SETTINGS, ...result.settings });
      }
      setLoaded(true);
    });

    const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (changes.settings?.newValue) {
        setSettings({ ...DEFAULT_SETTINGS, ...changes.settings.newValue });
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  const updateSettings = useCallback(async (patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        chrome.storage.local.set({ settings: next });
      }
      if (patch.eqBands || patch.eqEnabled !== undefined) {
        chrome.runtime?.sendMessage({
          type: 'SET_EQ',
          data: { bands: next.eqBands, enabled: next.eqEnabled },
        }).catch(() => {});
      }
      return next;
    });
  }, []);

  return { settings, updateSettings, loaded };
}
