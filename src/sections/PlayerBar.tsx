import { useState } from 'react';
import { Slider } from '@/components/ui/slider';
import type { RadioStation } from '@/types/station';
import {
  Play, Pause, Square, Heart, Volume2, VolumeX, Radio,
  SkipBack, SkipForward, ThumbsUp, Music2
} from 'lucide-react';
import { getSafeFaviconUrl } from '@/lib/stationImages';
import { normalizeVolume } from '@/lib/utils';
import { voteForStation } from '@/lib/radioApi';

interface PlayerBarProps {
  station: RadioStation;
  isPlaying: boolean;
  volume: number;
  isLoading: boolean;
  isFavorite: boolean;
  nowPlayingTrack?: string | null;
  queueLength?: number;
  queueIndex?: number;
  compact?: boolean;
  onTogglePlay: () => void;
  onStop: () => void;
  onVolumeChange: (vol: number) => void;
  onToggleFavorite: () => void;
  onSkipNext?: () => void;
  onSkipPrev?: () => void;
}

export function PlayerBar({
  station,
  isPlaying,
  volume,
  isLoading,
  isFavorite,
  nowPlayingTrack,
  queueLength = 0,
  queueIndex = 0,
  compact = false,
  onTogglePlay,
  onStop,
  onVolumeChange,
  onToggleFavorite,
  onSkipNext,
  onSkipPrev,
}: PlayerBarProps) {
  const [voted, setVoted] = useState(false);
  const favicon = getSafeFaviconUrl(station);
  const hasQueue = queueLength > 1;

  const handleVote = async () => {
    const ok = await voteForStation(station.stationuuid);
    if (ok) setVoted(true);
  };

  return (
    <div className="border-t border-white/10 bg-[#0f0f18]/95 backdrop-blur-xl">
      {/* Now Playing track */}
      {nowPlayingTrack && (
        <div className="flex items-center gap-1.5 px-3 pt-2 pb-0.5">
          <Music2 className="w-3 h-3 text-emerald-400 flex-shrink-0 animate-pulse" />
          <p className="text-[10px] text-emerald-400/90 truncate font-medium">{nowPlayingTrack}</p>
        </div>
      )}

      <div className={`flex items-center gap-2.5 px-3 ${compact ? 'py-1.5' : 'py-2.5'}`}>
        <div className={`relative rounded-lg overflow-hidden flex-shrink-0 bg-white/5 flex items-center justify-center ${compact ? 'w-8 h-8' : 'w-10 h-10'}`}>
          {favicon ? (
            <img src={favicon} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          ) : (
            <Radio className="w-5 h-5 text-gray-600" />
          )}
          {isPlaying && (
            <div className="absolute inset-0 flex items-end justify-center gap-0.5 pb-1 bg-black/20">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-0.5 bg-emerald-400 rounded-full animate-pulse"
                  style={{ height: `${4 + i * 2}px`, animationDelay: `${i * 0.1}s` }} />
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-semibold text-white truncate">{station.name}</h4>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-[10px] text-gray-500">{station.country || 'Unknown'}</span>
            {station.bitrate > 0 && (
              <>
                <span className="text-[10px] text-gray-700">·</span>
                <span className="text-[10px] text-gray-600">{station.bitrate}kbps</span>
              </>
            )}
            {hasQueue && (
              <>
                <span className="text-[10px] text-gray-700">·</span>
                <span className="text-[10px] text-gray-600">{queueIndex + 1}/{queueLength}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-0.5">
          {!station.stationuuid.startsWith('custom-') && (
            <button onClick={handleVote} disabled={voted}
              className={`p-1.5 rounded-lg transition-colors ${voted ? 'text-emerald-400' : 'text-gray-600 hover:text-gray-400'}`}
              title="Vote for this station">
              <ThumbsUp className={`w-3.5 h-3.5 ${voted ? 'fill-current' : ''}`} />
            </button>
          )}
          <button onClick={onToggleFavorite}
            className={`p-1.5 rounded-lg transition-colors ${isFavorite ? 'text-red-400' : 'text-gray-600 hover:text-gray-400'}`}>
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
          {hasQueue && onSkipPrev && (
            <button onClick={onSkipPrev} className="p-1 rounded-lg text-gray-500 hover:text-gray-300">
              <SkipBack className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={onTogglePlay} disabled={isLoading}
            className="w-8 h-8 rounded-full bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center transition-colors disabled:opacity-50">
            {isLoading ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-3.5 h-3.5 text-white" />
            ) : (
              <Play className="w-3.5 h-3.5 text-white ml-0.5" />
            )}
          </button>
          {hasQueue && onSkipNext && (
            <button onClick={onSkipNext} className="p-1 rounded-lg text-gray-500 hover:text-gray-300">
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={onStop} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5">
            <Square className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!compact && (
        <div className="flex items-center gap-2 px-3 pb-2">
          {volume === 0 ? <VolumeX className="w-3.5 h-3.5 text-gray-500" /> : <Volume2 className="w-3.5 h-3.5 text-gray-500" />}
          <Slider
            value={[Math.round(normalizeVolume(volume) * 100)]}
            onValueChange={(value) => {
              const next = value[0] ?? 80;
              onVolumeChange(Math.min(1, Math.max(0, next / 100)));
            }}
            max={100} step={1} className="flex-1 h-1"
          />
          <span className="text-[10px] text-gray-600 w-7 text-right">{Math.round(volume * 100)}%</span>
        </div>
      )}
    </div>
  );
}
