import type { RadioStation } from '@/types/station';
import { StationList } from './StationList';
import { Heart } from 'lucide-react';

interface FavoritesListProps {
  favorites: RadioStation[];
  currentStation: RadioStation | null;
  isPlaying: boolean;
  isFavorite: (id: string) => boolean;
  onPlay: (station: RadioStation) => void;
  onToggleFavorite: (station: RadioStation) => void;
}

export function FavoritesList({
  favorites,
  currentStation,
  isPlaying,
  isFavorite,
  onPlay,
  onToggleFavorite
}: FavoritesListProps) {
  if (favorites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
          <Heart className="w-6 h-6 text-gray-600" />
        </div>
        <p className="text-sm text-gray-400 font-medium">No favorites yet</p>
        <p className="text-xs text-gray-600 mt-1 max-w-[200px]">
          Tap the heart icon on any station to add it to your favorites
        </p>
      </div>
    );
  }

  return (
    <StationList
      stations={favorites}
      currentStation={currentStation}
      isPlaying={isPlaying}
      isFavorite={isFavorite}
      onPlay={onPlay}
      onToggleFavorite={onToggleFavorite}
      isLoading={false}
      emptyMessage="No favorites yet"
    />
  );
}