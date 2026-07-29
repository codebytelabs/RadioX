import { StationArt } from '@/components/StationArt';
import { normalizeVolume } from '@/lib/utils';
import { MarqueeText } from '@/components/MarqueeText';
import { formatCountryName } from '@/lib/radioApi';
import { openExternal } from '@/lib/openExternal';
import { findSongUrl, type SearchProvider } from '@/lib/trackLog';
import {
  Play, Pause, Square, Heart, Volume2, VolumeX,
  SkipBack, SkipForward, ExternalLink,
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import type { RadioStation } from '@/types/station';

interface PlayerBarProps {
  station: RadioStation;
  isPlaying: boolean;
  volume: number;
  isLoading: boolean;
  isFavorite: boolean;
  nowPlayingTrack?: string | null;
  searchProvider?: SearchProvider;
  queueLength?: number;
  queueIndex?: number;
  compact?: boolean;
  onTogglePlay: () => void;
  onStop: () => void;
  onVolumeChange: (vol: number) => void;
  onToggleFavorite: () => void;
  onSkipNext?: () => void;
  onSkipPrev?: () => void;
  onTrackClick?: () => void;
}

export function PlayerBar({
  station,
  isPlaying,
  volume,
  isLoading,
  isFavorite,
  nowPlayingTrack,
  searchProvider = 'youtube-music',
  queueLength = 0,
  queueIndex = 0,
  compact = false,
  onTogglePlay,
  onStop,
  onVolumeChange,
  onToggleFavorite,
  onSkipNext,
  onSkipPrev,
  onTrackClick,
}: PlayerBarProps) {
  const hasQueue = queueLength > 1;
  const canPrev = hasQueue && queueIndex > 0;
  const canNext = hasQueue && queueIndex < queueLength - 1;
  const findUrl = nowPlayingTrack ? findSongUrl(nowPlayingTrack, searchProvider) : null;

  const findSongBtn = findUrl ? (
    <button
      type="button"
      onClick={() => openExternal(findUrl)}
      className="rx-transport-btn"
      aria-label="Find song"
      title="Find song"
    >
      <ExternalLink className="w-3.5 h-3.5" />
    </button>
  ) : null;

  if (compact) {
    return (
      <div className="rx-player-dock flex-shrink-0 px-3 py-2">
        <div className="flex items-center gap-2.5">
          <StationArt name={station.name} station={station} size="sm" rounded="lg" playing={isPlaying} />
          <div className="flex-1 min-w-0">
            {nowPlayingTrack ? (
              <MarqueeText text={nowPlayingTrack} className="text-[11px]" onClick={onTrackClick} />
            ) : (
              <p className="text-[12px] font-medium text-[var(--rx-text)] truncate">{station.name}</p>
            )}
          </div>
          {isPlaying && (
            <span className="text-[8px] font-semibold tracking-wider text-[var(--rx-accent)] px-1.5 py-0.5 rounded bg-[var(--rx-accent-soft)]">
              LIVE
            </span>
          )}
          <button
            type="button"
            onClick={onSkipPrev}
            disabled={!canPrev}
            className="rx-transport-btn p-1.5 disabled:opacity-25"
            aria-label="Previous"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={onTogglePlay} disabled={isLoading} className="rx-play-btn !w-9 !h-9" data-playing={isPlaying} aria-label={isPlaying ? 'Pause' : 'Play'}>
            {isLoading ? (
              <div className="w-3.5 h-3.5 border-2 border-[var(--rx-bg)] border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-4 h-4" fill="currentColor" />
            ) : (
              <Play className="w-4 h-4 ml-0.5" fill="currentColor" />
            )}
          </button>
          <button
            type="button"
            onClick={onSkipNext}
            disabled={!canNext}
            className="rx-transport-btn p-1.5 disabled:opacity-25"
            aria-label="Next"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={onToggleFavorite} className="rx-transport-btn p-1.5" aria-label="Favorite">
            <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-[var(--rx-favorite)] text-[var(--rx-favorite)]' : ''}`} />
          </button>
          {findSongBtn}
        </div>
      </div>
    );
  }

  const subtitle = nowPlayingTrack
    ? station.name
    : [
        formatCountryName(station.country || ''),
        station.bitrate > 0 ? `${station.bitrate}k` : null,
        hasQueue ? `${queueIndex + 1}/${queueLength}` : null,
      ]
        .filter(Boolean)
        .join(' · ');

  return (
    <div className="rx-player-dock flex-shrink-0">
      <div className="flex items-center gap-3 px-4 pt-3 pb-2">
        <StationArt name={station.name} station={station} size="md" rounded="xl" playing={isPlaying} />

        <div className="flex-1 min-w-0">
          {nowPlayingTrack ? (
            <>
              <MarqueeText text={nowPlayingTrack} onClick={onTrackClick} />
              <p className="text-[10px] text-[var(--rx-text-muted)] truncate mt-0.5">{subtitle}</p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5 min-w-0">
                <p className="text-[13px] font-semibold text-[var(--rx-text)] truncate leading-tight">{station.name}</p>
                {isPlaying && (
                  <span className="flex-shrink-0 text-[8px] font-semibold tracking-wider text-[var(--rx-accent)] px-1.5 py-0.5 rounded bg-[var(--rx-accent-soft)]">
                    LIVE
                  </span>
                )}
              </div>
              <p className="text-[10px] text-[var(--rx-text-faint)] truncate mt-0.5">{subtitle}</p>
            </>
          )}
        </div>

        <button type="button" onClick={onTogglePlay} disabled={isLoading} className="rx-play-btn flex-shrink-0 disabled:opacity-50" data-playing={isPlaying} aria-label={isPlaying ? 'Pause' : 'Play'}>
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-[var(--rx-bg)] border-t-transparent rounded-full animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-[18px] h-[18px]" fill="currentColor" />
          ) : (
            <Play className="w-[18px] h-[18px] ml-0.5" fill="currentColor" />
          )}
        </button>
      </div>

      <div className="flex items-center gap-0.5 px-3 pb-3">
        <button type="button" onClick={() => onVolumeChange(volume === 0 ? 0.8 : 0)} className="rx-transport-btn" aria-label={volume === 0 ? 'Unmute' : 'Mute'}>
          {volume === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>
        <Slider
          value={[Math.round(normalizeVolume(volume) * 100)]}
          onValueChange={(value) => {
            const next = value[0] ?? 80;
            onVolumeChange(Math.min(1, Math.max(0, next / 100)));
          }}
          max={100}
          step={1}
          className="flex-1 h-1 mx-1"
        />
        <button
          type="button"
          onClick={onSkipPrev}
          disabled={!canPrev}
          className="rx-transport-btn disabled:opacity-25"
          aria-label="Previous"
        >
          <SkipBack className="w-4 h-4" />
        </button>
        <button type="button" onClick={onToggleFavorite} className="rx-transport-btn" aria-label="Favorite">
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-[var(--rx-favorite)] text-[var(--rx-favorite)]' : ''}`} />
        </button>
        {findSongBtn}
        <button
          type="button"
          onClick={onSkipNext}
          disabled={!canNext}
          className="rx-transport-btn disabled:opacity-25"
          aria-label="Next"
        >
          <SkipForward className="w-4 h-4" />
        </button>
        <button type="button" onClick={onStop} className="rx-transport-btn" aria-label="Stop">
          <Square className="w-3.5 h-3.5" fill="currentColor" />
        </button>
      </div>
    </div>
  );
}
