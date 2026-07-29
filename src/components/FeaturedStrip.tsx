import { useCallback, useEffect, useRef, useState } from 'react';
import type { RadioStation } from '@/types/station';
import { StationArt } from '@/components/StationArt';
import { formatCountryName } from '@/lib/radioApi';
import { Play, Pause, ChevronLeft, ChevronRight } from 'lucide-react';

interface FeaturedStripProps {
  stations: RadioStation[];
  currentStation: RadioStation | null;
  isPlaying: boolean;
  loading?: boolean;
  onPlay: (station: RadioStation, queue: RadioStation[]) => void;
}

export function FeaturedStrip({
  stations,
  currentStation,
  isPlaying,
  loading,
  onPlay,
}: FeaturedStripProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const updateNav = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 2);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    updateNav();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateNav, { passive: true });
    const ro = new ResizeObserver(updateNav);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateNav);
      ro.disconnect();
    };
  }, [stations, loading, updateNav]);

  const scrollByDir = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const tile = el.querySelector<HTMLElement>('.rx-featured-tile');
    const step = (tile?.offsetWidth ?? 88) + 10;
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  if (loading && stations.length === 0) {
    return (
      <section className="mb-4" aria-label="Featured">
        <p className="px-4 text-[9px] uppercase tracking-[0.14em] text-[var(--rx-accent)] font-medium mb-2">
          Featured
        </p>
        <div className="flex gap-2.5 overflow-hidden px-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-[5.5rem] flex-shrink-0">
              <div className="w-[4.5rem] h-[4.5rem] rounded-xl rx-skeleton animate-pulse" />
              <div className="h-2 w-14 mt-1.5 rounded rx-skeleton" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (stations.length === 0) return null;

  return (
    <section className="mb-4" aria-label="Featured stations">
      <div className="flex items-center justify-between px-4 mb-2">
        <p className="text-[9px] uppercase tracking-[0.14em] text-[var(--rx-accent)] font-medium">
          Featured
        </p>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            aria-label="Previous featured"
            disabled={!canPrev}
            onClick={() => scrollByDir(-1)}
            className="p-1 rounded-lg text-[var(--rx-text-muted)] hover:bg-[var(--rx-surface-hover)] disabled:opacity-25 disabled:pointer-events-none"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            aria-label="Next featured"
            disabled={!canNext}
            onClick={() => scrollByDir(1)}
            className="p-1 rounded-lg text-[var(--rx-text-muted)] hover:bg-[var(--rx-surface-hover)] disabled:opacity-25 disabled:pointer-events-none"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div
        ref={scrollerRef}
        className="rx-shelf flex gap-2.5 overflow-x-auto px-4 pb-1"
      >
        {stations.map((s) => {
          const isCurrent = currentStation?.stationuuid === s.stationuuid;
          const playing = isCurrent && isPlaying;
          return (
            <button
              key={s.stationuuid}
              type="button"
              onClick={() => onPlay(s, stations)}
              className="rx-featured-tile group flex flex-col gap-1 text-left flex-shrink-0 w-[5.5rem]"
            >
              <div className="relative w-[4.5rem] h-[4.5rem]">
                <StationArt
                  name={s.name}
                  station={s}
                  size="xl"
                  rounded="xl"
                  playing={playing}
                />
                <div
                  className={`absolute inset-0 rounded-xl flex items-center justify-center bg-black/45 transition-opacity ${
                    playing || isCurrent
                      ? 'opacity-100'
                      : 'opacity-50 group-hover:opacity-100'
                  }`}
                >
                  {playing ? (
                    <Pause className="w-5 h-5 text-white" fill="white" />
                  ) : (
                    <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
                  )}
                </div>
              </div>
              <div className="min-w-0 w-[5.5rem] px-0.5">
                <p
                  className={`text-[11px] font-medium leading-tight line-clamp-2 break-words ${
                    isCurrent ? 'text-[var(--rx-accent)]' : 'text-[var(--rx-text)]'
                  }`}
                >
                  {s.name}
                </p>
                <p className="text-[9px] text-[var(--rx-text-faint)] truncate mt-0.5">
                  {formatCountryName(s.country || 'World')}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
