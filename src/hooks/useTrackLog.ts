import { useCallback, useEffect, useState } from 'react';
import {
  clearLog,
  getTrackLog,
  toggleSaved,
  type TrackLogEntry,
} from '@/lib/trackLog';
import { FREE_TRACK_LOG_LIMIT } from '@/lib/support';

export function useTrackLog(supporter: boolean) {
  const [entries, setEntries] = useState<TrackLogEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    const all = await getTrackLog();
    setEntries(all);
    setLoaded(true);
  }, []);

  useEffect(() => {
    refresh();
    if (typeof chrome === 'undefined' || !chrome.storage?.onChanged) return;
    const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (changes.trackLog) refresh();
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, [refresh]);

  const visible = supporter ? entries : entries.slice(0, FREE_TRACK_LOG_LIMIT);

  const onToggleSaved = useCallback(async (id: string) => {
    const next = await toggleSaved(id);
    setEntries(next);
  }, []);

  const onClear = useCallback(async () => {
    await clearLog();
    setEntries([]);
  }, []);

  return {
    entries: visible,
    totalCount: entries.length,
    capped: !supporter && entries.length > FREE_TRACK_LOG_LIMIT,
    loaded,
    refresh,
    onToggleSaved,
    onClear,
  };
}
