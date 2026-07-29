import { useEffect, useMemo, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SectionShelf } from '@/components/SectionShelf';
import { StationCard } from '@/components/StationCard';
import { PlaylistTile } from '@/components/PlaylistTile';
import { StationList } from '@/sections/StationList';
import { FeaturedStrip } from '@/components/FeaturedStrip';
import { EDITORIAL_PLAYLISTS } from '@/data/playlistMeta';
import { getCatalogPlaylists, getPlaylistStations, type PlaylistId } from '@/lib/stationCatalog';
import { getEditorialFeed } from '@/lib/stationFeeds';
import {
  getWorldTop,
  getPopularNow,
  getTrendingNow,
  getFeaturedStrip,
  subtractByBrand,
} from '@/lib/rankedFeeds';
import { brandKey } from '@/lib/stationRank';
import { applyQualityFilter } from '@/lib/radioApi';
import type { RadioStation } from '@/types/station';
import { ArrowLeft } from 'lucide-react';

type ShelfId = 'world' | 'popular' | 'trending' | 'deep' | 'public' | 'news' | 'playlist';

interface DiscoverHomeProps {
  currentStation: RadioStation | null;
  isPlaying: boolean;
  isFavorite: (id: string) => boolean;
  hdOnly: boolean;
  minBitrate: number;
  onPlay: (station: RadioStation, list?: RadioStation[]) => void;
  onToggleFavorite: (station: RadioStation) => void;
}

function DetailHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 flex-shrink-0">
      <button
        type="button"
        onClick={onBack}
        className="p-1.5 rounded-xl hover:bg-[var(--rx-surface-hover)]"
        aria-label="Back"
      >
        <ArrowLeft className="w-4 h-4 text-[var(--rx-text-muted)]" />
      </button>
      <h2 className="text-sm font-semibold text-[var(--rx-text)] truncate">{title}</h2>
    </div>
  );
}

function takeDisjoint(
  list: RadioStation[],
  used: Set<string>,
  limit: number
): RadioStation[] {
  const out: RadioStation[] = [];
  for (const s of list) {
    const k = brandKey(s.name);
    if (used.has(k)) continue;
    used.add(k);
    out.push(s);
    if (out.length >= limit) break;
  }
  return out;
}

export function DiscoverHome({
  currentStation,
  isPlaying,
  isFavorite,
  hdOnly,
  minBitrate,
  onPlay,
  onToggleFavorite,
}: DiscoverHomeProps) {
  const [featured, setFeatured] = useState<RadioStation[]>([]);
  const [world, setWorld] = useState<RadioStation[]>([]);
  const [popular, setPopular] = useState<RadioStation[]>([]);
  const [trending, setTrending] = useState<RadioStation[]>([]);
  const [deepCuts, setDeepCuts] = useState<RadioStation[]>([]);
  const [publicRadio, setPublicRadio] = useState<RadioStation[]>([]);
  const [news, setNews] = useState<RadioStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<{
    id: ShelfId;
    title: string;
    stations: RadioStation[];
    playlistId?: PlaylistId;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const filt = (list: RadioStation[]) => applyQualityFilter(list, hdOnly, minBitrate);
        const settled = await Promise.allSettled([
          getWorldTop(24),
          getPopularNow(24),
          getTrendingNow(24),
        ]);
        if (cancelled) return;

        const w = settled[0].status === 'fulfilled' ? settled[0].value : [];
        const p = settled[1].status === 'fulfilled' ? settled[1].value : [];
        const t = settled[2].status === 'fulfilled' ? settled[2].value : [];
        if (settled.some((s) => s.status === 'rejected')) {
          console.warn(
            'Discover partial load:',
            settled.map((s) => (s.status === 'rejected' ? String(s.reason) : 'ok'))
          );
        }

        const used = new Set<string>();
        const worldList = takeDisjoint(filt(w), used, 18);
        const popularList = takeDisjoint(filt(p), used, 18);
        const trendRaw = subtractByBrand(filt(t), [...worldList, ...popularList]);
        const trendList = takeDisjoint(trendRaw, used, 18);

        const deep = takeDisjoint(filt(getEditorialFeed('quality-picks', 28)), used, 18);
        const pub = takeDisjoint(filt(getEditorialFeed('public-radio', 24)), used, 14);
        const newsList = takeDisjoint(filt(getEditorialFeed('world-news', 24)), used, 14);

        setWorld(worldList);
        setPopular(popularList);
        setTrending(trendList.length >= 8 ? trendList : []);
        setDeepCuts(deep);
        setPublicRadio(pub);
        setNews(newsList);

        const strip = await getFeaturedStrip(worldList, 5);
        if (!cancelled) setFeatured(strip);
      } catch (e) {
        console.error('Discover load failed:', e);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [hdOnly, minBitrate]);

  const playlistCounts = useMemo(() => getCatalogPlaylists(), []);
  const featurePlaylists = EDITORIAL_PLAYLISTS.filter(
    (p) => !['quality-picks', 'global-icons', 'public-radio', 'world-news'].includes(p.id)
  ).slice(0, 6);

  if (detail) {
    return (
      <div className="h-full flex flex-col min-h-0">
        <DetailHeader title={detail.title} onBack={() => setDetail(null)} />
        <ScrollArea className="flex-1 min-h-0 px-4">
          <StationList
            stations={detail.stations}
            currentStation={currentStation}
            isPlaying={isPlaying}
            isFavorite={isFavorite}
            onPlay={(s) => onPlay(s, detail.stations)}
            onToggleFavorite={onToggleFavorite}
            isLoading={false}
            showRank={['world', 'popular', 'trending', 'deep'].includes(detail.id)}
          />
        </ScrollArea>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="pb-4 pt-1">
        <FeaturedStrip
          stations={featured}
          currentStation={currentStation}
          isPlaying={isPlaying}
          loading={loading && featured.length === 0}
          onPlay={onPlay}
        />

        <SectionShelf
          title="World Top"
          subtitle="Recognizable stations across every region"
          loading={loading && world.length === 0}
          emptyMessage="World Top unavailable offline"
          seeAllCount={world.length}
          onSeeAll={() => setDetail({ id: 'world', title: 'World Top', stations: world })}
        >
          {world.map((s) => (
            <StationCard
              key={s.stationuuid}
              station={s}
              isCurrent={currentStation?.stationuuid === s.stationuuid}
              isPlaying={isPlaying}
              onPlay={() => onPlay(s, world)}
            />
          ))}
        </SectionShelf>

        <SectionShelf
          title="Popular Now"
          subtitle="Live listens · brand-deduped worldwide"
          loading={loading && popular.length === 0}
          emptyMessage="Charts loading…"
          seeAllCount={popular.length}
          onSeeAll={() => setDetail({ id: 'popular', title: 'Popular Now', stations: popular })}
        >
          {popular.map((s) => (
            <StationCard
              key={s.stationuuid}
              station={s}
              isCurrent={currentStation?.stationuuid === s.stationuuid}
              isPlaying={isPlaying}
              onPlay={() => onPlay(s, popular)}
            />
          ))}
        </SectionShelf>

        {trending.length >= 8 && (
          <SectionShelf
            title="Trending"
            subtitle="Rising right now"
            loading={false}
            seeAllCount={trending.length}
            onSeeAll={() => setDetail({ id: 'trending', title: 'Trending', stations: trending })}
          >
            {trending.map((s) => (
              <StationCard
                key={s.stationuuid}
                station={s}
                isCurrent={currentStation?.stationuuid === s.stationuuid}
                isPlaying={isPlaying}
                onPlay={() => onPlay(s, trending)}
              />
            ))}
          </SectionShelf>
        )}

        <section className="mb-4">
          <div className="flex items-end justify-between px-4 mb-2">
            <div>
              <h2 className="text-[15px] font-semibold text-[var(--rx-text)] tracking-tight leading-none">
                Collections
              </h2>
              <p className="text-[10px] text-[var(--rx-text-faint)] mt-1">Regions & moods</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 px-4">
            {featurePlaylists.map((p) => (
              <PlaylistTile
                key={p.id}
                playlist={p}
                variant="tile"
                stationCount={(playlistCounts[p.id] ?? []).length}
                stations={getPlaylistStations(p.id, 4)}
                onClick={() => {
                  const stations = getPlaylistStations(p.id, 60);
                  setDetail({ id: 'playlist', title: p.title, stations, playlistId: p.id });
                }}
              />
            ))}
          </div>
        </section>

        <SectionShelf
          title="Deep Cuts"
          subtitle="Hand-picked streams worth discovering"
          loading={loading && deepCuts.length === 0}
          seeAllCount={deepCuts.length}
          onSeeAll={() => setDetail({ id: 'deep', title: 'Deep Cuts', stations: deepCuts })}
        >
          {deepCuts.map((s) => (
            <StationCard
              key={s.stationuuid}
              station={s}
              isCurrent={currentStation?.stationuuid === s.stationuuid}
              isPlaying={isPlaying}
              onPlay={() => onPlay(s, deepCuts)}
            />
          ))}
        </SectionShelf>

        <SectionShelf
          title="Public Radio"
          subtitle="Public broadcasters worldwide"
          loading={loading && publicRadio.length === 0}
          seeAllCount={publicRadio.length}
          onSeeAll={() => setDetail({ id: 'public', title: 'Public Radio', stations: publicRadio })}
        >
          {publicRadio.map((s) => (
            <StationCard
              key={s.stationuuid}
              station={s}
              isCurrent={currentStation?.stationuuid === s.stationuuid}
              isPlaying={isPlaying}
              onPlay={() => onPlay(s, publicRadio)}
            />
          ))}
        </SectionShelf>

        <SectionShelf
          title="News & Talk"
          subtitle="Newsrooms and talk radio"
          loading={loading && news.length === 0}
          seeAllCount={news.length}
          onSeeAll={() => setDetail({ id: 'news', title: 'News & Talk', stations: news })}
        >
          {news.map((s) => (
            <StationCard
              key={s.stationuuid}
              station={s}
              isCurrent={currentStation?.stationuuid === s.stationuuid}
              isPlaying={isPlaying}
              onPlay={() => onPlay(s, news)}
            />
          ))}
        </SectionShelf>
      </div>
    </ScrollArea>
  );
}
