import { useState, useEffect, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { StationList } from './StationList';
import { GenreTile, CURATED_GENRES } from '@/components/GenreTile';
import { PlaylistTile } from '@/components/PlaylistTile';
import { StationArt } from '@/components/StationArt';
import { EDITORIAL_PLAYLISTS } from '@/data/playlistMeta';
import { getPlaylistStations, getCatalogPlaylists, type PlaylistId } from '@/lib/stationCatalog';
import { getCountryThumbs } from '@/lib/genreThumbs';
import {
  getStationsByCountry,
  getStationsByTag,
  getStationsByLanguage,
  getCountries,
  getLanguages,
  getTags,
  formatCountryName,
} from '@/lib/radioApi';
import type { RadioStation, Country, Language, Tag } from '@/types/station';
import { Music, MapPin, ArrowLeft, Search, Languages, LayoutGrid } from 'lucide-react';
import { getGenreVisual } from '@/lib/genreVisuals';

interface CategoryBrowserProps {
  currentStation: RadioStation | null;
  isPlaying: boolean;
  isFavorite: (id: string) => boolean;
  onPlay: (station: RadioStation, list?: RadioStation[]) => void;
  onToggleFavorite: (station: RadioStation) => void;
}

type ViewMode = 'categories' | 'genre-stations' | 'country-stations' | 'language-stations' | 'playlist-stations';
type CategoryTab = 'collections' | 'genres' | 'countries' | 'languages';

const CONTINENT_CHIPS: { id: string; label: string; codes: string[] }[] = [
  { id: 'all', label: 'All', codes: [] },
  { id: 'eu', label: 'Europe', codes: ['GB','IE','FR','DE','AT','CH','NL','BE','SE','NO','DK','FI','IT','ES','PT','PL','CZ','RO','GR','HU','UA','SK','BG','HR','RS','SI','BA','LV','EE','LT'] },
  { id: 'na', label: 'N. America', codes: ['US','CA','MX'] },
  { id: 'sa', label: 'LatAm', codes: ['AR','BR','CL','CO','PE','VE','EC','UY','DO'] },
  { id: 'as', label: 'Asia-Pac', codes: ['AU','NZ','JP','HK','IN','SG','MY','KR','TW','PH','ID','AF'] },
  { id: 'af', label: 'Africa/MENA', codes: ['ZA','NG','KE','UG','AE','IL','TR','EG','MA','GH'] },
];

export function CategoryBrowser({
  currentStation,
  isPlaying,
  isFavorite,
  onPlay,
  onToggleFavorite,
}: CategoryBrowserProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('categories');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CategoryTab>('collections');
  const [selectedPlaylist, setSelectedPlaylist] = useState('');
  const [countries, setCountries] = useState<Country[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [continent, setContinent] = useState('all');

  useEffect(() => {
    if (activeCategory === 'countries' && countries.length === 0) {
      setListLoading(true);
      getCountries()
        .then(setCountries)
        .catch(() => setCountries([]))
        .finally(() => setListLoading(false));
    }
    if (activeCategory === 'languages' && languages.length === 0) {
      setListLoading(true);
      getLanguages()
        .then(setLanguages)
        .catch(() => setLanguages([]))
        .finally(() => setListLoading(false));
    }
    if (activeCategory === 'genres' && tags.length === 0) {
      setListLoading(true);
      getTags()
        .then(setTags)
        .catch(() => setTags([]))
        .finally(() => setListLoading(false));
    }
  }, [activeCategory, countries.length, languages.length, tags.length]);

  const handlePlaylistClick = (playlistId: PlaylistId, title: string) => {
    setSelectedPlaylist(title);
    setViewMode('playlist-stations');
    setStations(getPlaylistStations(playlistId, 60));
  };

  const handleGenreClick = async (genre: string) => {
    setSelectedGenre(genre);
    setViewMode('genre-stations');
    setIsLoading(true);
    try {
      const results = await getStationsByTag(genre, 40);
      setStations(results);
    } catch (error) {
      console.error('Failed to load genre stations:', error);
    }
    setIsLoading(false);
  };

  const handleCountryClick = async (countryCode: string, countryName: string) => {
    setSelectedCountry(countryName);
    setViewMode('country-stations');
    setIsLoading(true);
    try {
      const results = await getStationsByCountry(countryCode, 40);
      setStations(results);
    } catch (error) {
      console.error('Failed to load country stations:', error);
    }
    setIsLoading(false);
  };

  const handleLanguageClick = async (language: string) => {
    setSelectedLanguage(language);
    setViewMode('language-stations');
    setIsLoading(true);
    try {
      const results = await getStationsByLanguage(language, 40);
      setStations(results);
    } catch (error) {
      console.error('Failed to load language stations:', error);
    }
    setIsLoading(false);
  };

  const handleBack = () => {
    setViewMode('categories');
    setStations([]);
    setSelectedGenre('');
    setSelectedCountry('');
    setSelectedLanguage('');
    setSelectedPlaylist('');
  };

  const continentCodes = useMemo(() => {
    const chip = CONTINENT_CHIPS.find((c) => c.id === continent);
    return chip && chip.codes.length ? new Set(chip.codes) : null;
  }, [continent]);

  const stationListView = (title: string, icon: React.ReactNode, empty: string) => (
    <div className="h-full flex flex-col min-h-0 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 flex-shrink-0">
        <button type="button" onClick={handleBack} className="p-1.5 rounded-xl hover:bg-[var(--rx-surface-hover)] transition-colors">
          <ArrowLeft className="w-4 h-4 text-[var(--rx-text-muted)]" />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          {icon}
          <span className="text-sm font-medium text-[var(--rx-text)] capitalize truncate">{title}</span>
        </div>
      </div>
      <ScrollArea className="flex-1 min-h-0 px-4">
        <StationList
          stations={stations}
          currentStation={currentStation}
          isPlaying={isPlaying}
          isFavorite={isFavorite}
          onPlay={(s) => onPlay(s, stations)}
          onToggleFavorite={onToggleFavorite}
          isLoading={isLoading}
          emptyMessage={empty}
        />
      </ScrollArea>
    </div>
  );

  if (viewMode === 'playlist-stations') {
    return stationListView(selectedPlaylist, <LayoutGrid className="w-4 h-4 text-[var(--rx-accent)]" />, 'No stations in this collection');
  }
  if (viewMode === 'genre-stations') {
    return stationListView(selectedGenre, <Music className="w-4 h-4 text-[var(--rx-accent)]" />, `No ${selectedGenre} stations found`);
  }
  if (viewMode === 'country-stations') {
    return stationListView(selectedCountry, <MapPin className="w-4 h-4 text-[var(--rx-accent)]" />, `No stations in ${selectedCountry}`);
  }
  if (viewMode === 'language-stations') {
    return stationListView(selectedLanguage, <Languages className="w-4 h-4 text-[var(--rx-accent)]" />, `No ${selectedLanguage} stations found`);
  }

  const playlistCounts = getCatalogPlaylists();
  const filteredPlaylists = EDITORIAL_PLAYLISTS.filter(
    (p) => !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase())
  );
  const tagCounts = new Map(tags.map((t) => [t.name.toLowerCase(), t.stationcount]));
  const curatedGenres = CURATED_GENRES.filter((g) => !search || g.includes(search.toLowerCase()) || getGenreVisual(g).label.toLowerCase().includes(search.toLowerCase()));

  const filteredCountries = countries.filter((c) => {
    if (continentCodes && !continentCodes.has(c.iso_3166_1.toUpperCase())) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return formatCountryName(c.name).toLowerCase().includes(q) || c.iso_3166_1.toLowerCase().includes(q);
  });
  const filteredLanguages = languages.filter((l) => !search || l.name.toLowerCase().includes(search.toLowerCase()));

  const searchPlaceholder =
    activeCategory === 'collections' ? 'Search playlists…'
    : activeCategory === 'countries' ? 'Search 200+ countries...'
    : activeCategory === 'languages' ? 'Search languages...'
    : 'Search genres...';

  const categoryTabs: CategoryTab[] = ['collections', 'genres', 'countries', 'languages'];

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden">
      <div className="flex-shrink-0 px-4 space-y-2 pb-1">
        <div className="rx-chips !px-0">
          {categoryTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              data-active={activeCategory === tab}
              onClick={() => { setActiveCategory(tab); setSearch(''); setContinent('all'); }}
              className="rx-chip capitalize"
            >
              {tab === 'collections' && <LayoutGrid className="w-3 h-3" />}
              {tab === 'genres' && <Music className="w-3 h-3" />}
              {tab === 'countries' && <MapPin className="w-3 h-3" />}
              {tab === 'languages' && <Languages className="w-3 h-3" />}
              {tab === 'collections' ? 'Playlists' : tab}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--rx-text-faint)] pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="rx-input w-full pl-9"
          />
        </div>

        {activeCategory === 'countries' && (
          <div className="rx-chips !px-0 overflow-x-auto">
            {CONTINENT_CHIPS.map((chip) => (
              <button
                key={chip.id}
                type="button"
                data-active={continent === chip.id}
                onClick={() => setContinent(chip.id)}
                className="rx-chip"
              >
                {chip.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 min-h-0 px-4">
        {listLoading ? (
          <p className="text-xs text-[var(--rx-text-faint)] text-center py-8">Loading…</p>
        ) : activeCategory === 'collections' ? (
          <div className="pb-4">
            <p className="text-[10px] text-[var(--rx-text-faint)] mb-2 uppercase tracking-wider">
              Curated worldwide
            </p>
            <div className="grid grid-cols-2 gap-2">
              {filteredPlaylists.map((playlist) => (
                <PlaylistTile
                  key={playlist.id}
                  playlist={playlist}
                  variant="row"
                  stationCount={(playlistCounts[playlist.id] ?? []).length}
                  stations={getPlaylistStations(playlist.id, 4)}
                  onClick={() => handlePlaylistClick(playlist.id, playlist.title)}
                />
              ))}
            </div>
          </div>
        ) : activeCategory === 'genres' ? (
          <div className="grid grid-cols-3 gap-2 pb-4">
            {curatedGenres.map((genre) => (
              <GenreTile
                key={genre}
                name={genre}
                stationCount={tagCounts.get(genre) ?? tagCounts.get(genre.toLowerCase())}
                onClick={() => handleGenreClick(genre)}
              />
            ))}
          </div>
        ) : activeCategory === 'countries' ? (
          <div className="pb-4">
            <p className="text-[10px] text-[var(--rx-text-faint)] mb-2 uppercase tracking-wider">{filteredCountries.length} countries</p>
            <div className="grid grid-cols-2 gap-1.5">
              {filteredCountries.map((country) => {
                const thumbs = getCountryThumbs(country.iso_3166_1, 3);
                return (
                  <button
                    key={country.iso_3166_1}
                    type="button"
                    onClick={() => handleCountryClick(country.iso_3166_1, formatCountryName(country.name))}
                    className="flex items-center gap-2 h-12 px-2 rounded-xl transition-all duration-200 group text-left hover:bg-[var(--rx-surface-hover)]"
                    style={{ background: 'var(--rx-surface)', border: '1px solid var(--rx-border)' }}
                  >
                    <span className="text-base leading-none flex-shrink-0">{getCountryFlag(country.iso_3166_1)}</span>
                    <div className="min-w-0 flex-1">
                      <span className="text-[11px] font-medium text-[var(--rx-text-muted)] group-hover:text-[var(--rx-text)] block truncate">
                        {formatCountryName(country.name)}
                      </span>
                      <span className="text-[9px] text-[var(--rx-text-faint)] tabular-nums">{country.stationcount.toLocaleString()}</span>
                    </div>
                    {thumbs.length > 0 && (
                      <div className="flex -space-x-1.5 flex-shrink-0">
                        {thumbs.map((s) => (
                          <StationArt
                            key={s.stationuuid}
                            name={s.name}
                            station={s}
                            size="sm"
                            rounded="md"
                            className="!w-5 !h-5 !text-[6px] ring-1 ring-[var(--rx-bg)]"
                          />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="pb-4">
            <p className="text-[10px] text-[var(--rx-text-faint)] mb-2 uppercase tracking-wider">{filteredLanguages.length} languages</p>
            <div className="grid grid-cols-2 gap-1">
              {filteredLanguages.map((lang) => (
                <button
                  key={lang.name}
                  type="button"
                  onClick={() => handleLanguageClick(lang.name)}
                  className="flex items-center gap-2 h-11 px-2 rounded-xl transition-all duration-200 group text-left hover:bg-[var(--rx-surface-hover)]"
                  style={{ background: 'var(--rx-surface)', border: '1px solid var(--rx-border)' }}
                >
                  <Languages className="w-3.5 h-3.5 text-[var(--rx-accent)] opacity-70 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] font-medium text-[var(--rx-text-muted)] group-hover:text-[var(--rx-text)] block truncate capitalize">
                      {lang.name}
                    </span>
                    <span className="text-[9px] text-[var(--rx-text-faint)] tabular-nums">{lang.stationcount.toLocaleString()}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function getCountryFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '🌍';
  const codePoints = countryCode.toUpperCase().split('').map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
