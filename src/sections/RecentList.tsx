import type { RadioStation } from '@/types/station';
import { StationList } from './StationList';
import { Clock } from 'lucide-react';

interface RecentListProps {
  recent: RadioStation[];
  currentStation: RadioStation | null;
  isPlaying: boolean;
  isFavorite: (id: string) => boolean;
  onPlay: (station: RadioStation) => void;
  onToggleFavorite: (station: RadioStation) => void;
}

export function RecentList({
  recent,
  currentStation,
  isPlaying,
  isFavorite,
  onPlay,
  onToggleFavorite
}: RecentListProps) {
  if (recent.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
          <Clock className="w-6 h-6 text-gray-600" />
        </div>
        <p className="text-sm text-gray-400 font-medium">No recent stations</p>
        <p className="text-xs text-gray-600 mt-1 max-w-[200px]">
          Stations you play will appear here for quick access
        </p>
      </div>
    );
  }

  return (
    <StationList
      stations={recent}
      currentStation={currentStation}
      isPlaying={isPlaying}
      isFavorite={isFavorite}
      onPlay={onPlay}
      onToggleFavorite={onToggleFavorite}
      isLoading={false}
      emptyMessage="No recent stations"
    />
  );
}