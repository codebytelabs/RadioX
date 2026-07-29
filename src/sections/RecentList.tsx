import { useEffect, useState } from 'react';
import type { RadioStation } from '@/types/station';
import { StationList } from './StationList';
import { EmptyState } from '@/components/EmptyState';
import { TrackLogList } from '@/components/TrackLogList';
import { useTrackLog } from '@/hooks/useTrackLog';
import { useSettings } from '@/hooks/useSettings';
import {
  shouldShowTipRow,
  getSupportState,
  dismissSupportPrompt,
  SUPPORT_TIP_URL,
  type SupportState,
} from '@/lib/support';
import { openExternal } from '@/lib/openExternal';
import type { SearchProvider } from '@/lib/trackLog';
import { Clock, X, Heart } from 'lucide-react';

interface RecentListProps {
  recent: RadioStation[];
  currentStation: RadioStation | null;
  isPlaying: boolean;
  isFavorite: (id: string) => boolean;
  onPlay: (station: RadioStation) => void;
  onToggleFavorite: (station: RadioStation) => void;
  /** Jump to Tracks segment (e.g. from PlayerBar marquee). */
  initialSegment?: 'stations' | 'tracks';
  onSegmentChange?: (seg: 'stations' | 'tracks') => void;
}

export function RecentList({
  recent,
  currentStation,
  isPlaying,
  isFavorite,
  onPlay,
  onToggleFavorite,
  initialSegment = 'stations',
  onSegmentChange,
}: RecentListProps) {
  const [segment, setSegment] = useState<'stations' | 'tracks'>(initialSegment);
  const { settings, updateSettings } = useSettings();
  const supporter = Boolean(settings.supporter);
  const trackLog = useTrackLog(supporter);
  const [support, setSupport] = useState<SupportState | null>(null);

  useEffect(() => {
    setSegment(initialSegment);
  }, [initialSegment]);

  useEffect(() => {
    getSupportState().then(setSupport);
  }, []);

  const select = (seg: 'stations' | 'tracks') => {
    setSegment(seg);
    onSegmentChange?.(seg);
  };

  const showTip =
    support &&
    !settings.hideSupportTip &&
    shouldShowTipRow({
      ...support,
      supportPromptState: settings.hideSupportTip ? 'dismissed' : support.supportPromptState,
    });

  return (
    <div className="pb-3">
      <div className="rx-chips !px-0 mb-3">
        <button
          type="button"
          data-active={segment === 'stations'}
          onClick={() => select('stations')}
          className="rx-chip"
        >
          <Clock className="w-3 h-3" />
          Stations
        </button>
        <button
          type="button"
          data-active={segment === 'tracks'}
          onClick={() => select('tracks')}
          className="rx-chip"
        >
          <Heart className="w-3 h-3" />
          Tracks
        </button>
      </div>

      {showTip && (
        <div
          className="mb-3 flex items-start gap-2 rounded-xl px-3 py-2.5"
          style={{ background: 'var(--rx-surface)', border: '1px solid var(--rx-border)' }}
        >
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium text-[var(--rx-text)]">Support RadioX</p>
            <p className="text-[10px] text-[var(--rx-text-faint)] mt-0.5 leading-snug">
              Tips keep the extension ad-free. Unlock unlimited track history.
            </p>
            <a
              href={SUPPORT_TIP_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(ev) => openExternal(SUPPORT_TIP_URL, ev)}
              className="inline-block mt-1.5 text-[10px] font-medium text-[var(--rx-accent)]"
            >
              Buy Me a Coffee →
            </a>
          </div>
          <button
            type="button"
            aria-label="Dismiss"
            className="p-1 text-[var(--rx-text-faint)] hover:text-[var(--rx-text-muted)]"
            onClick={async () => {
              await dismissSupportPrompt();
              await updateSettings({ hideSupportTip: true });
              setSupport((s) => (s ? { ...s, supportPromptState: 'dismissed' } : s));
            }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {segment === 'stations' ? (
        recent.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No recent stations"
            description="Stations you play show up here for quick access"
          />
        ) : (
          <StationList
            stations={recent}
            currentStation={currentStation}
            isPlaying={isPlaying}
            isFavorite={isFavorite}
            onPlay={onPlay}
            onToggleFavorite={onToggleFavorite}
            isLoading={false}
          />
        )
      ) : (
        <TrackLogList
          entries={trackLog.entries}
          searchProvider={(settings.searchProvider as SearchProvider) || 'youtube-music'}
          capped={trackLog.capped}
          onToggleSaved={trackLog.onToggleSaved}
          onClear={trackLog.onClear}
        />
      )}
    </div>
  );
}
