import type { RadioStation } from '@/types/station';
import { StationList } from './StationList';
import { EmptyState } from '@/components/EmptyState';
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
  onToggleFavorite,
}: FavoritesListProps) {
  if (favorites.length === 0) {
    return (
      <EmptyState
        icon={Heart}
        title="No favorites yet"
        description="Tap the heart on any station to save it here"
      />
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
    />
  );
}
