import { StationArt } from '@/components/StationArt';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import type { RadioStation } from '@/types/station';
import { formatCountryName } from '@/lib/radioApi';
import { Play, Pause, Heart, Radio } from 'lucide-react';

interface StationListProps {
  stations: RadioStation[];
  currentStation: RadioStation | null;
  isPlaying: boolean;
  isFavorite: (id: string) => boolean;
  onPlay: (station: RadioStation) => void;
  onToggleFavorite: (station: RadioStation) => void;
  isLoading: boolean;
  emptyMessage?: string;
  showRank?: boolean;
}

export function StationList({
  stations,
  currentStation,
  isPlaying,
  isFavorite,
  onPlay,
  onToggleFavorite,
  isLoading,
  emptyMessage = 'No stations found',
  showRank = false,
}: StationListProps) {
  if (isLoading) {
    return (
      <div className="space-y-0 pb-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2.5">
            <Skeleton className="w-11 h-11 rounded-xl rx-skeleton" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-32 rounded rx-skeleton" />
              <Skeleton className="h-2 w-20 rounded rx-skeleton" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (stations.length === 0) {
    return <EmptyState icon={Radio} title={emptyMessage} />;
  }

  return (
    <div className="pb-2 divide-y divide-[var(--rx-border-subtle)]">
      {stations.map((station, index) => {
        const isCurrent = currentStation?.stationuuid === station.stationuuid;
        const playing = isCurrent && isPlaying;
        const favorited = isFavorite(station.stationuuid);
        const rank = index + 1;

        return (
          <div
            key={station.stationuuid}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') onPlay(station); }}
            onClick={() => onPlay(station)}
            className={`group flex items-center gap-2.5 py-2.5 transition-colors duration-150 cursor-pointer ${
              isCurrent ? 'rx-row-active' : 'hover:bg-[var(--rx-surface-hover)]'
            }`}
          >
            <div className="w-5 flex-shrink-0 flex justify-center">
              {showRank ? (
                <span className={`text-[11px] font-semibold tabular-nums ${
                  rank <= 3 ? 'text-[var(--rx-accent)]' : 'text-[var(--rx-text-faint)]'
                }`}>
                  {rank}
                </span>
              ) : isCurrent ? (
                <span className={`w-1.5 h-1.5 rounded-full ${playing ? 'bg-[var(--rx-accent)] animate-live-pulse' : 'bg-[var(--rx-text-faint)]'}`} />
              ) : null}
            </div>

            <div className="relative flex-shrink-0">
              <StationArt name={station.name} station={station} size="sm" rounded="xl" playing={playing} />
              <div className={`absolute inset-0 rounded-xl flex items-center justify-center bg-black/50 transition-opacity ${playing || isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                {playing ? <Pause className="w-3.5 h-3.5 text-white" fill="white" /> : <Play className="w-3.5 h-3.5 text-white ml-0.5" fill="white" />}
              </div>
            </div>

            <div className="flex-1 min-w-0 pr-1">
              <p className={`text-[13px] font-medium truncate leading-snug ${isCurrent ? 'text-[var(--rx-accent)]' : 'text-[var(--rx-text)]'}`}>
                {station.name}
              </p>
              <p className="text-[10px] text-[var(--rx-text-faint)] truncate mt-0.5">
                {formatCountryName(station.country || 'Unknown')}
                {station.bitrate > 0 && ` · ${station.bitrate}k`}
              </p>
            </div>

            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(station); }}
              aria-label={favorited ? 'Unfavorite' : 'Favorite'}
              className={`p-1.5 rounded-lg transition-all w-8 h-8 flex items-center justify-center ${
                favorited
                  ? 'text-[var(--rx-favorite)] opacity-100'
                  : 'text-[var(--rx-text-faint)] opacity-40 group-hover:opacity-100'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${favorited ? 'fill-current' : ''}`} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
