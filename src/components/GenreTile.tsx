import { getGenreVisual, CURATED_GENRES } from '@/lib/genreVisuals';
import { GenreArt } from '@/components/GenreArt';
import { StationArt } from '@/components/StationArt';
import { getGenreThumbs } from '@/lib/genreThumbs';

interface GenreTileProps {
  name: string;
  stationCount?: number;
  onClick: () => void;
}

export function GenreTile({ name, stationCount, onClick }: GenreTileProps) {
  const { gradient, label } = getGenreVisual(name);
  const thumbs = getGenreThumbs(name, 4);
  const showWatermark = thumbs.length < 2;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative h-[4.5rem] rounded-xl overflow-hidden text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
      style={{ border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="absolute inset-0" style={{ background: gradient }} />
      {thumbs.length >= 1 ? (
        <div className="absolute inset-1.5 grid grid-cols-2 gap-0.5 opacity-80">
          {Array.from({ length: 4 }).map((_, i) => {
            const s = thumbs[i];
            if (!s) return <div key={i} className="rounded-md bg-black/25" />;
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
      {showWatermark && (
        <GenreArt
          genre={name}
          className="absolute inset-0 w-[48%] h-[48%] m-auto opacity-40 group-hover:opacity-55 transition-opacity pointer-events-none"
        />
      )}
      <div className="absolute inset-x-0 bottom-0 px-1.5 py-1.5 bg-gradient-to-t from-black/85 via-black/45 to-transparent">
        <span className="text-[10px] font-semibold text-white block truncate leading-tight">{label}</span>
        {stationCount !== undefined && (
          <span className="text-[8px] text-white/60 tabular-nums">{stationCount.toLocaleString()}</span>
        )}
      </div>
    </button>
  );
}

export { CURATED_GENRES };
