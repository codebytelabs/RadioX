import type { RadioStation } from '@/types/station';
import { Play, Pause, Heart, Radio } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { getSafeFaviconUrl } from '@/lib/stationImages';

interface StationListProps {
  stations: RadioStation[];
  currentStation: RadioStation | null;
  isPlaying: boolean;
  isFavorite: (id: string) => boolean;
  onPlay: (station: RadioStation) => void;
  onToggleFavorite: (station: RadioStation) => void;
  isLoading: boolean;
  emptyMessage?: string;
  showVotes?: boolean;
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
  showVotes = false
}: StationListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2 pb-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-2 rounded-lg">
            <Skeleton className="w-10 h-10 rounded-lg bg-white/5" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-32 bg-white/5" />
              <Skeleton className="h-2.5 w-20 bg-white/5" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (stations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Radio className="w-10 h-10 text-gray-700 mb-3" />
        <p className="text-sm text-gray-500">{emptyMessage}</p>
        <p className="text-xs text-gray-600 mt-1">Try a different search term</p>
      </div>
    );
  }

  return (
    <div className="space-y-1 pb-4">
      {stations.map((station) => {
        const isCurrentStation = currentStation?.stationuuid === station.stationuuid;
        const isCurrentlyPlaying = isCurrentStation && isPlaying;
        const favorited = isFavorite(station.stationuuid);
        const bitrate = station.bitrate > 0 ? `${station.bitrate}kbps` : '';
        const favicon = getSafeFaviconUrl(station);
        const tags = station.tags
          ? station.tags
              .split(',')
              .filter(Boolean)
              .slice(0, 2)
              .map((t) => t.trim())
          : [];

        return (
          <div
            key={station.stationuuid}
            className={`group flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200 cursor-pointer ${
              isCurrentStation
                ? 'bg-emerald-500/10 border border-emerald-500/20'
                : 'hover:bg-white/5 border border-transparent'
            }`}
          >
            {/* Station Logo */}
            <div
              className="relative w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 bg-white/5 flex items-center justify-center"
              onClick={() => onPlay(station)}
            >
              {favicon ? (
                <img
                  src={favicon}
                  alt=""
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <Radio className="w-5 h-5 text-gray-600" />
              )}
              {/* Play overlay */}
              <div className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity duration-200 ${
                isCurrentStation ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}>
                {isCurrentlyPlaying ? (
                  <Pause className="w-5 h-5 text-white" />
                ) : (
                  <Play className="w-5 h-5 text-white ml-0.5" />
                )}
              </div>
            </div>

            {/* Station Info */}
            <div
              className="flex-1 min-w-0"
              onClick={() => onPlay(station)}
            >
              <h3 className={`text-sm font-medium truncate ${
                isCurrentStation ? 'text-emerald-400' : 'text-white'
              }`}>
                {station.name}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-gray-500">
                  {station.country || 'Unknown'}
                </span>
                {bitrate && (
                  <>
                    <span className="text-[10px] text-gray-700">·</span>
                    <span className="text-[10px] text-emerald-500/70 font-medium">
                      {bitrate}
                    </span>
                  </>
                )}
                {showVotes && station.votes > 0 && (
                  <>
                    <span className="text-[10px] text-gray-700">·</span>
                    <span className="text-[10px] text-amber-500/70 font-medium">
                      ★ {station.votes.toLocaleString()}
                    </span>
                  </>
                )}
                {tags.length > 0 && (
                  <>
                    <span className="text-[10px] text-gray-700">·</span>
                    <span className="text-[10px] text-gray-500 truncate max-w-[80px]">
                      {tags.join(', ')}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Favorite Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(station);
              }}
              className={`p-1.5 rounded-lg transition-all duration-200 ${
                favorited
                  ? 'text-red-400 hover:text-red-300'
                  : 'text-gray-600 opacity-0 group-hover:opacity-100 hover:text-gray-400'
              }`}
            >
              <Heart className={`w-4 h-4 ${favorited ? 'fill-current' : ''}`} />
            </button>
          </div>
        );
      })}
    </div>
  );
}