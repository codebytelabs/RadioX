import { useState, useEffect, useCallback, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StationList } from '@/sections/StationList';
import { PlayerBar } from '@/sections/PlayerBar';
import { SearchBar } from '@/sections/SearchBar';
import { CategoryBrowser } from '@/sections/CategoryBrowser';
import { FavoritesList } from '@/sections/FavoritesList';
import { RecentList } from '@/sections/RecentList';
import { DonationBanner } from '@/sections/DonationBanner';
import { SettingsSheet } from '@/sections/SettingsSheet';
import { usePlayer } from '@/hooks/usePlayer';
import { useFavorites, useRecentStations } from '@/hooks/useChromeStorage';
import { useSettings } from '@/hooks/useSettings';
import { useCustomStations } from '@/hooks/useCustomStations';
import {
  getTopStations, getTopClickedStations, getTrendingStations,
  searchStations, applyQualityFilter,
} from '@/lib/radioApi';
import type { RadioStation } from '@/types/station';
import { Radio, TrendingUp, Heart, Clock, Globe, Search, Star, Flame, Plus } from 'lucide-react';

type TopMode = 'rated' | 'trending' | 'hot';

function App() {
  const [activeTab, setActiveTab] = useState('discover');
  const [topMode, setTopMode] = useState<TopMode>('rated');
  const [topStations, setTopStations] = useState<RadioStation[]>([]);
  const [searchResults, setSearchResults] = useState<RadioStation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

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
    loadTopStations(topMode);
  }, [topMode, settings.hdOnly]);

  const loadTopStations = async (mode: TopMode) => {
    setIsLoading(true);
    try {
      const raw =
        mode === 'rated' ? await getTopStations(50)
        : mode === 'trending' ? await getTopClickedStations(50)
        : await getTrendingStations(50);
      setTopStations(filterList(raw));
    } catch (error) {
      console.error('Failed to load top stations:', error);
    }
    setIsLoading(false);
  };

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    try {
      const results = await searchStations(query, 40);
      setSearchResults(filterList(results));
    } catch (error) {
      console.error('Search failed:', error);
    }
    setIsSearching(false);
  }, [filterList]);

  const handlePlayStation = async (station: RadioStation, list?: RadioStation[]) => {
    await player.play(station, list);
    await loadRecent();
  };

  const toggleFavorite = async (station: RadioStation) => {
    if (isFavorite(station.stationuuid)) {
      await removeFavorite(station.stationuuid);
    } else {
      await addFavorite(station);
    }
  };

  const handleAddCustom = async (station: RadioStation) => {
    await addCustomStation(station);
    await handlePlayStation(station);
  };

  const handleImportFavorites = async (stations: RadioStation[]) => {
    for (const s of stations.slice(0, 100)) {
      await addFavorite(s);
    }
  };

  // Keyboard shortcuts in popup
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        player.togglePlay();
      }
      if (e.code === 'ArrowRight') player.skipNext();
      if (e.code === 'ArrowLeft') player.skipPrev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [player]);

  const height = settings.compactMode ? 'h-[480px]' : 'h-[580px]';
  const filteredTop = topStations;

  return (
    <div className={`flex flex-col ${height} bg-gradient-to-b from-[#0a0a0f] via-[#12121a] to-[#0a0a0f] text-white overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
          <Radio className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            RadioX
          </h1>
          <p className="text-[10px] text-gray-500 -mt-0.5 truncate">
            {player.nowPlayingTrack || '40,000+ stations worldwide'}
          </p>
        </div>
        {player.currentStation && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-emerald-400 font-medium">Live</span>
          </div>
        )}
        <SettingsSheet
          favorites={allFavorites}
          onImportFavorites={handleImportFavorites}
          onAddCustom={handleAddCustom}
        />
      </div>

      <div className="px-4 pb-2">
        <SearchBar onSearch={handleSearch} isSearching={isSearching} />
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
        {searchQuery.trim().length >= 2 ? (
          <div className="h-full flex flex-col min-h-0 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2 flex-shrink-0">
              <Search className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-400">{searchResults.length} results for "{searchQuery}"</span>
            </div>
            <ScrollArea className="flex-1 min-h-0 px-4">
              <StationList
                stations={searchResults}
                currentStation={player.currentStation}
                isPlaying={player.isPlaying}
                isFavorite={isFavorite}
                onPlay={(s) => handlePlayStation(s, searchResults)}
                onToggleFavorite={toggleFavorite}
                isLoading={isSearching}
                emptyMessage={`No stations found for "${searchQuery}"`}
              />
            </ScrollArea>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col min-h-0 gap-0">
            <TabsList className="mx-4 mb-1.5 bg-white/5 border border-white/10 h-9 p-0.5 flex-shrink-0">
              <TabsTrigger value="discover" className="text-[11px] px-2 py-1 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
                <TrendingUp className="w-3 h-3 mr-1" />Top
              </TabsTrigger>
              <TabsTrigger value="browse" className="text-[11px] px-2 py-1 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
                <Globe className="w-3 h-3 mr-1" />Browse
              </TabsTrigger>
              <TabsTrigger value="favorites" className="text-[11px] px-2 py-1 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
                <Heart className="w-3 h-3 mr-1" />Favs
              </TabsTrigger>
              <TabsTrigger value="recent" className="text-[11px] px-2 py-1 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
                <Clock className="w-3 h-3 mr-1" />Recent
              </TabsTrigger>
            </TabsList>

            <TabsContent value="discover" className="flex-1 overflow-hidden m-0 flex flex-col min-h-0">
              <div className="px-4 pb-2 flex-shrink-0">
                <div className="flex gap-1 p-0.5 bg-white/5 rounded-lg">
                  {([
                    ['rated', Star, 'Top Rated'],
                    ['trending', TrendingUp, 'Today'],
                    ['hot', Flame, 'Rising'],
                  ] as const).map(([mode, Icon, label]) => (
                    <button
                      key={mode}
                      onClick={() => setTopMode(mode)}
                      className={`flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-md text-[10px] font-medium transition-all ${
                        topMode === mode ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      <Icon className="w-3 h-3" />{label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-gray-600 mt-1.5 px-0.5">
                  {topMode === 'rated' && 'Highest community votes worldwide'}
                  {topMode === 'trending' && 'Most played in the last 24 hours'}
                  {topMode === 'hot' && 'Stations gaining momentum right now'}
                  {settings.hdOnly && ' · HD filter on'}
                </p>
              </div>
              <ScrollArea className="flex-1 min-h-0 px-4">
                <StationList
                  stations={filteredTop}
                  currentStation={player.currentStation}
                  isPlaying={player.isPlaying}
                  isFavorite={isFavorite}
                  onPlay={(s) => handlePlayStation(s, filteredTop)}
                  onToggleFavorite={toggleFavorite}
                  isLoading={isLoading}
                  emptyMessage="Loading stations..."
                  showVotes={topMode === 'rated'}
                />
              </ScrollArea>
            </TabsContent>

            <TabsContent value="browse" className="flex-1 overflow-hidden m-0 min-h-0 flex flex-col">
              <CategoryBrowser
                currentStation={player.currentStation}
                isPlaying={player.isPlaying}
                isFavorite={isFavorite}
                onPlay={handlePlayStation}
                onToggleFavorite={toggleFavorite}
              />
            </TabsContent>

            <TabsContent value="favorites" className="flex-1 overflow-hidden m-0 min-h-0">
              <ScrollArea className="h-full min-h-0 px-4">
                {customStations.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] text-gray-600 mb-1.5 flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Custom Stations
                    </p>
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
                  </div>
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
            </TabsContent>

            <TabsContent value="recent" className="flex-1 overflow-hidden m-0 min-h-0">
              <ScrollArea className="h-full min-h-0 px-4">
                <RecentList
                  recent={recent}
                  currentStation={player.currentStation}
                  isPlaying={player.isPlaying}
                  isFavorite={isFavorite}
                  onPlay={(s) => handlePlayStation(s, recent)}
                  onToggleFavorite={toggleFavorite}
                />
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </div>

      {!settings.compactMode && <DonationBanner />}

      {player.error && (
        <div className="px-3 py-1.5 text-[11px] text-red-300 bg-red-950/50 border-t border-red-900/40">
          {player.error}
        </div>
      )}

      {player.currentStation && (
        <PlayerBar
          station={player.currentStation}
          isPlaying={player.isPlaying}
          volume={player.volume}
          isLoading={player.isLoading}
          isFavorite={isFavorite(player.currentStation.stationuuid)}
          nowPlayingTrack={player.nowPlayingTrack}
          queueLength={player.queueLength}
          queueIndex={player.queueIndex}
          compact={settings.compactMode}
          onTogglePlay={player.togglePlay}
          onStop={player.stop}
          onVolumeChange={player.setVolume}
          onToggleFavorite={() => player.currentStation && toggleFavorite(player.currentStation)}
          onSkipNext={player.skipNext}
          onSkipPrev={player.skipPrev}
        />
      )}
    </div>
  );
}

export default App;
