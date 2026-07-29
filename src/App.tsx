import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StationList } from '@/sections/StationList';
import { PlayerBar } from '@/sections/PlayerBar';
import { SearchBar } from '@/sections/SearchBar';
import { CategoryBrowser } from '@/sections/CategoryBrowser';
import { DiscoverHome } from '@/sections/DiscoverHome';
import { FavoritesList } from '@/sections/FavoritesList';
import { RecentList } from '@/sections/RecentList';
import { SettingsSheet } from '@/sections/SettingsSheet';
import { usePlayer } from '@/hooks/usePlayer';
import { useFavorites, useRecentStations } from '@/hooks/useChromeStorage';
import { useSettings } from '@/hooks/useSettings';
import { useCustomStations } from '@/hooks/useCustomStations';
import { searchAllSources } from '@/lib/stationFeeds';
import { applyQualityFilter } from '@/lib/radioApi';
import { bumpSession, addListenSeconds } from '@/lib/support';
import type { RadioStation } from '@/types/station';
import type { SearchProvider } from '@/lib/trackLog';
import { Home, Heart, Clock, Compass } from 'lucide-react';

type MainTab = 'home' | 'browse' | 'favorites' | 'recent';

function App() {
  const [activeTab, setActiveTab] = useState<MainTab>('home');
  const [recentSegment, setRecentSegment] = useState<'stations' | 'tracks'>('stations');
  const [searchResults, setSearchResults] = useState<RadioStation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const listenTick = useRef<number | null>(null);

  const player = usePlayer();
  const { settings } = useSettings();
  const { favorites, addFavorite, removeFavorite, isFavorite } = useFavorites();
  const { recent, loadRecent } = useRecentStations();
  const { customStations, addCustomStation } = useCustomStations();

  const allFavorites = useMemo(
    () => [...customStations, ...favorites.filter((f) => !customStations.some((c) => c.stationuuid === f.stationuuid))],
    [customStations, favorites]
  );

  const filterList = useCallback(
    (list: RadioStation[]) => applyQualityFilter(list, settings.hdOnly, settings.minBitrate),
    [settings.hdOnly, settings.minBitrate]
  );

  useEffect(() => {
    bumpSession().catch(() => {});
  }, []);

  useEffect(() => {
    if (listenTick.current) window.clearInterval(listenTick.current);
    if (player.isPlaying) {
      listenTick.current = window.setInterval(() => {
        addListenSeconds(15).catch(() => {});
      }, 15_000);
    }
    return () => {
      if (listenTick.current) window.clearInterval(listenTick.current);
    };
  }, [player.isPlaying]);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) { setSearchResults([]); setIsSearching(false); return; }
    setIsSearching(true);
    try {
      setSearchResults(filterList(await searchAllSources(query, 40)));
    } catch {
      setSearchResults([]);
    }
    setIsSearching(false);
  }, [filterList]);

  const handlePlayStation = async (station: RadioStation, list?: RadioStation[]) => {
    await player.play(station, list);
    await loadRecent();
  };

  const toggleFavorite = async (station: RadioStation) => {
    if (isFavorite(station.stationuuid)) await removeFavorite(station.stationuuid);
    else await addFavorite(station);
  };

  const jumpToTracks = () => {
    setActiveTab('recent');
    setRecentSegment('tracks');
    if (searchQuery) handleSearch('');
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.code === 'Space') { e.preventDefault(); player.togglePlay(); }
      if (e.code === 'ArrowRight') player.skipNext();
      if (e.code === 'ArrowLeft') player.skipPrev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [player]);

  const isLive = player.isPlaying && Boolean(player.currentStation);
  const inSearch = searchQuery.trim().length >= 2;

  const mainTabs: { id: MainTab; label: string; icon: typeof Home }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'browse', label: 'Browse', icon: Compass },
    { id: 'favorites', label: 'Saved', icon: Heart },
    { id: 'recent', label: 'Recent', icon: Clock },
  ];

  return (
    <div className={`rx-app flex flex-col h-[580px] ${isLive ? 'rx-ambient-live' : 'rx-ambient'} overflow-hidden`}>
      <header className="flex items-center justify-between px-4 pt-3.5 pb-1 flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src={chrome.runtime.getURL('icons/icon48.png')}
            alt=""
            width={28}
            height={28}
            className="w-7 h-7 rounded-[7px] flex-shrink-0"
            draggable={false}
          />
          <div className="min-w-0">
            <h1 className="font-display text-[1.25rem] font-bold text-[var(--rx-text)] leading-none">
              RadioX
            </h1>
            <p className="text-[9px] text-[var(--rx-text-faint)] mt-1 tracking-[0.1em] uppercase">
              Listen worldwide
            </p>
          </div>
        </div>
        <SettingsSheet
          favorites={allFavorites}
          onImportFavorites={async (stations) => { for (const s of stations.slice(0, 100)) await addFavorite(s); }}
          onAddCustom={async (station) => { await addCustomStation(station); await handlePlayStation(station); }}
        />
      </header>

      <SearchBar onSearch={handleSearch} isSearching={isSearching} />

      <nav className="rx-tabs flex-shrink-0">
        {mainTabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            data-active={!inSearch && activeTab === id}
            onClick={() => {
              setActiveTab(id);
              if (id === 'recent') setRecentSegment('stations');
              if (inSearch) handleSearch('');
            }}
            className="rx-tab"
          >
            <Icon className="w-3 h-3" />
            {label}
          </button>
        ))}
      </nav>

      <div className="flex-1 overflow-hidden min-h-0 mt-1 relative">
        {inSearch ? (
          <ScrollArea className="h-full px-4">
            <p className="text-[10px] text-[var(--rx-text-faint)] py-2">
              {searchResults.length} results for &ldquo;{searchQuery}&rdquo;
            </p>
            <StationList
              stations={searchResults}
              currentStation={player.currentStation}
              isPlaying={player.isPlaying}
              isFavorite={isFavorite}
              onPlay={(s) => handlePlayStation(s, searchResults)}
              onToggleFavorite={toggleFavorite}
              isLoading={isSearching}
              emptyMessage={`Nothing found for "${searchQuery}"`}
            />
          </ScrollArea>
        ) : activeTab === 'home' ? (
          <DiscoverHome
            currentStation={player.currentStation}
            isPlaying={player.isPlaying}
            isFavorite={isFavorite}
            hdOnly={settings.hdOnly}
            minBitrate={settings.minBitrate}
            onPlay={handlePlayStation}
            onToggleFavorite={toggleFavorite}
          />
        ) : activeTab === 'browse' ? (
          <CategoryBrowser
            currentStation={player.currentStation}
            isPlaying={player.isPlaying}
            isFavorite={isFavorite}
            onPlay={handlePlayStation}
            onToggleFavorite={toggleFavorite}
          />
        ) : activeTab === 'favorites' ? (
          <ScrollArea className="h-full px-4">
            {customStations.length > 0 && (
              <>
                <p className="text-[9px] text-[var(--rx-text-faint)] uppercase tracking-wider py-2">Custom</p>
                <StationList
                  stations={customStations}
                  currentStation={player.currentStation}
                  isPlaying={player.isPlaying}
                  isFavorite={isFavorite}
                  onPlay={(s) => handlePlayStation(s, customStations)}
                  onToggleFavorite={toggleFavorite}
                  isLoading={false}
                  emptyMessage=""
                />
              </>
            )}
            <FavoritesList
              favorites={favorites}
              currentStation={player.currentStation}
              isPlaying={player.isPlaying}
              isFavorite={isFavorite}
              onPlay={(s) => handlePlayStation(s, favorites)}
              onToggleFavorite={toggleFavorite}
            />
          </ScrollArea>
        ) : (
          <ScrollArea className="h-full px-4">
            <RecentList
              recent={recent}
              currentStation={player.currentStation}
              isPlaying={player.isPlaying}
              isFavorite={isFavorite}
              onPlay={(s) => handlePlayStation(s, recent)}
              onToggleFavorite={toggleFavorite}
              initialSegment={recentSegment}
              onSegmentChange={setRecentSegment}
            />
          </ScrollArea>
        )}

        {player.error && (
          <div className="absolute left-3 right-3 bottom-2 z-20 pointer-events-none">
            <div className="rounded-xl px-3 py-2 text-[11px] text-center text-[#f0b4ae] bg-[rgba(40,20,18,0.92)] border border-[rgba(240,180,174,0.25)] shadow-lg">
              {player.error}
            </div>
          </div>
        )}
      </div>

      {player.currentStation && (
        <PlayerBar
          station={player.currentStation}
          isPlaying={player.isPlaying}
          volume={player.volume}
          isLoading={player.isLoading}
          isFavorite={isFavorite(player.currentStation.stationuuid)}
          nowPlayingTrack={player.nowPlayingTrack}
          searchProvider={(settings.searchProvider as SearchProvider) || 'youtube-music'}
          queueLength={player.queueLength}
          queueIndex={player.queueIndex}
          compact={settings.compactMode}
          onTogglePlay={player.togglePlay}
          onStop={player.stop}
          onVolumeChange={player.setVolume}
          onToggleFavorite={() => player.currentStation && toggleFavorite(player.currentStation)}
          onSkipNext={player.skipNext}
          onSkipPrev={player.skipPrev}
          onTrackClick={jumpToTracks}
        />
      )}
    </div>
  );
}

export default App;
