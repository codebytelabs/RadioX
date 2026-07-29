import type { RadioStation } from '@/types/station';
import { Play, Pause } from 'lucide-react';
import { StationArt } from '@/components/StationArt';
import { formatCountryName } from '@/lib/radioApi';

interface StationCardProps {
  station: RadioStation;
  isPlaying: boolean;
  isCurrent: boolean;
  onPlay: () => void;
}

export function StationCard({ station, isPlaying, isCurrent, onPlay }: StationCardProps) {
  const playing = isCurrent && isPlaying;

  return (
    <button
      type="button"
      onClick={onPlay}
      className="group rx-station-card flex flex-col gap-1 text-left flex-shrink-0 w-[4.5rem]"
    >
      <div className="relative w-14 h-14">
        <StationArt name={station.name} station={station} size="shelf" rounded="xl" playing={playing} />
        <div
          className={`absolute inset-0 rounded-xl flex items-center justify-center bg-black/50 transition-opacity ${
            playing || isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          {playing ? (
            <Pause className="w-4 h-4 text-white" fill="white" />
          ) : (
            <Play className="w-4 h-4 text-white ml-0.5" fill="white" />
          )}
        </div>
      </div>
      <div className="min-w-0 w-[4.5rem] px-0.5">
        <p className={`text-[10.5px] font-medium leading-tight line-clamp-2 break-words ${isCurrent ? 'text-[var(--rx-accent)]' : 'text-[var(--rx-text)]'}`}>
          {station.name}
        </p>
        <p className="text-[9px] text-[var(--rx-text-faint)] truncate mt-0.5">
          {formatCountryName(station.country || 'World')}
        </p>
      </div>
    </button>
  );
}
