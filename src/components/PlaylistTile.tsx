import type { EditorialPlaylist } from '@/data/playlistMeta';
import type { RadioStation } from '@/types/station';
import { StationArt } from '@/components/StationArt';

interface PlaylistTileProps {
  playlist: EditorialPlaylist;
  stationCount: number;
  stations?: RadioStation[];
  onClick: () => void;
  /** tile = Home collections (h-4.5rem); row = Browse playlists (h-5rem) */
  variant?: 'tile' | 'row';
}

/** Charcoal → teal tonal ramp only — no indigo/violet/pink/brown. */
const COVERS: Record<string, string> = {
  'quality-picks': 'linear-gradient(145deg, #2dd4bf 0%, #0f766e 42%, #0a0a0b 100%)',
  'global-icons': 'linear-gradient(145deg, #134e4a 0%, #1a1a1e 55%, #0a0a0b 100%)',
  'public-radio': 'linear-gradient(145deg, #1e3a3a 0%, #161618 55%, #0a0a0b 100%)',
  'world-news': 'linear-gradient(145deg, #243838 0%, #161618 55%, #0a0a0b 100%)',
  'uk-europe': 'linear-gradient(145deg, #1a2e2e 0%, #121214 55%, #0a0a0b 100%)',
  americas: 'linear-gradient(145deg, #1c3230 0%, #141416 55%, #0a0a0b 100%)',
  'asia-pacific': 'linear-gradient(145deg, #1a3438 0%, #121214 55%, #0a0a0b 100%)',
  'africa-middle-east': 'linear-gradient(145deg, #1e302e 0%, #141416 55%, #0a0a0b 100%)',
  'jazz-blues': 'linear-gradient(145deg, #1a2a2e 0%, #121214 55%, #0a0a0b 100%)',
  electronic: 'linear-gradient(145deg, #163836 0%, #101012 55%, #0a0a0b 100%)',
  'latin-vibes': 'linear-gradient(145deg, #1c2e2c 0%, #121214 55%, #0a0a0b 100%)',
};

export function PlaylistTile({
  playlist,
  stationCount,
  stations = [],
  onClick,
  variant = 'row',
}: PlaylistTileProps) {
  const bg = COVERS[playlist.id] ?? 'linear-gradient(145deg, #1a1a1e 0%, #0a0a0b 100%)';
  const mosaic = stations.slice(0, 4);
  const height = variant === 'tile' ? 'h-[4.5rem]' : 'h-20';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative w-full ${height} rounded-xl overflow-hidden text-left transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98]`}
    >
      <div className="absolute inset-0" style={{ background: bg }} />
      {mosaic.length >= 1 ? (
        <div className="absolute inset-1.5 grid grid-cols-2 gap-0.5 opacity-75">
          {Array.from({ length: 4 }).map((_, i) => {
            const s = mosaic[i];
            if (!s) {
              return <div key={i} className="rounded-md bg-black/20" />;
            }
            return (
              <StationArt
                key={s.stationuuid}
                name={s.name}
                station={s}
                size="sm"
                rounded="md"
                className="!w-full !h-full !text-[7px]"
              />
            );
          })}
        </div>
      ) : null}
      <div className="absolute inset-x-0 bottom-0 px-2 py-1.5 bg-gradient-to-t from-black/90 via-black/55 to-transparent">
        <span className="text-[11px] font-semibold text-white block truncate leading-tight">
          {playlist.title}
        </span>
        <span className="text-[9px] text-white/55 tabular-nums">{stationCount} stations</span>
      </div>
    </button>
  );
}
