import { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { StationList } from './StationList';
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
import { Music, MapPin, ArrowLeft, Search, Languages } from 'lucide-react';

interface CategoryBrowserProps {
  currentStation: RadioStation | null;
  isPlaying: boolean;
  isFavorite: (id: string) => boolean;
  onPlay: (station: RadioStation, list?: RadioStation[]) => void;
  onToggleFavorite: (station: RadioStation) => void;
}

type ViewMode = 'categories' | 'genre-stations' | 'country-stations' | 'language-stations';
type CategoryTab = 'genres' | 'countries' | 'languages';

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
  const [activeCategory, setActiveCategory] = useState<CategoryTab>('genres');
  const [countries, setCountries] = useState<Country[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (activeCategory === 'countries' && countries.length === 0) {
      setListLoading(true);
      getCountries().then(setCountries).finally(() => setListLoading(false));
    }
    if (activeCategory === 'languages' && languages.length === 0) {
      setListLoading(true);
      getLanguages().then(setLanguages).finally(() => setListLoading(false));
    }
    if (activeCategory === 'genres' && tags.length === 0) {
      setListLoading(true);
      getTags().then(setTags).finally(() => setListLoading(false));
    }
  }, [activeCategory, countries.length, languages.length, tags.length]);

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
  };

  const stationListView = (title: string, icon: React.ReactNode, empty: string) => (
    <div className="h-full flex flex-col min-h-0 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 flex-shrink-0">
        <button onClick={handleBack} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-400" />
        </button>
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-white capitalize">{title}</span>
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

  if (viewMode === 'genre-stations') {
    return stationListView(selectedGenre, <Music className="w-4 h-4 text-emerald-400" />, `No ${selectedGenre} stations found`);
  }
  if (viewMode === 'country-stations') {
    return stationListView(selectedCountry, <MapPin className="w-4 h-4 text-emerald-400" />, `No stations in ${selectedCountry}`);
  }
  if (viewMode === 'language-stations') {
    return stationListView(selectedLanguage, <Languages className="w-4 h-4 text-emerald-400" />, `No ${selectedLanguage} stations found`);
  }

  const filteredTags = tags.filter((t) => !search || t.name.toLowerCase().includes(search.toLowerCase()));
  const filteredCountries = countries.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return formatCountryName(c.name).toLowerCase().includes(q) || c.iso_3166_1.toLowerCase().includes(q);
  });
  const filteredLanguages = languages.filter((l) => !search || l.name.toLowerCase().includes(search.toLowerCase()));

  const searchPlaceholder =
    activeCategory === 'countries' ? 'Search 200+ countries...'
    : activeCategory === 'languages' ? 'Search languages...'
    : 'Search genres...';

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden">
      <div className="flex-shrink-0 px-4 space-y-2 pb-1">
        <div className="flex gap-1 p-0.5 bg-white/5 rounded-lg">
          {(['genres', 'countries', 'languages'] as CategoryTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveCategory(tab); setSearch(''); }}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-1 rounded-md text-[10px] font-medium transition-all ${
                activeCategory === tab ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab === 'genres' && <Music className="w-3 h-3" />}
              {tab === 'countries' && <MapPin className="w-3 h-3" />}
              {tab === 'languages' && <Languages className="w-3 h-3" />}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-8 h-8 text-xs bg-white/5 border-white/10 text-white placeholder:text-gray-500"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0 px-4">
        {listLoading ? (
          <p className="text-xs text-gray-500 text-center py-6">Loading...</p>
        ) : activeCategory === 'genres' ? (
          <div className="grid grid-cols-3 gap-1.5 pb-4">
            {filteredTags.slice(0, 60).map((tag) => (
              <button
                key={tag.name}
                onClick={() => handleGenreClick(tag.name)}
                className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-emerald-500/30 transition-all group"
              >
                <span className="text-base">{getGenreEmoji(tag.name)}</span>
                <span className="text-[9px] font-medium text-gray-400 group-hover:text-white capitalize leading-tight text-center line-clamp-2">
                  {tag.name}
                </span>
                <span className="text-[8px] text-gray-600">{tag.stationcount}</span>
              </button>
            ))}
          </div>
        ) : activeCategory === 'countries' ? (
          <div className="pb-4">
            <p className="text-[10px] text-gray-600 mb-2">{filteredCountries.length} countries</p>
            <div className="grid grid-cols-2 gap-1.5">
              {filteredCountries.map((country) => (
                <button
                  key={country.iso_3166_1}
                  onClick={() => handleCountryClick(country.iso_3166_1, formatCountryName(country.name))}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-emerald-500/30 transition-all group text-left"
                >
                  <span className="text-lg">{getCountryFlag(country.iso_3166_1)}</span>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-medium text-gray-400 group-hover:text-white block truncate">
                      {formatCountryName(country.name)}
                    </span>
                    <span className="text-[10px] text-gray-600">{country.stationcount.toLocaleString()}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="pb-4">
            <p className="text-[10px] text-gray-600 mb-2">{filteredLanguages.length} languages</p>
            <div className="grid grid-cols-2 gap-1.5">
              {filteredLanguages.map((lang) => (
                <button
                  key={lang.name}
                  onClick={() => handleLanguageClick(lang.name)}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-emerald-500/30 transition-all group text-left"
                >
                  <Languages className="w-4 h-4 text-emerald-400/70 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-medium text-gray-400 group-hover:text-white block truncate capitalize">
                      {lang.name}
                    </span>
                    <span className="text-[10px] text-gray-600">{lang.stationcount.toLocaleString()}</span>
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

function getGenreEmoji(genre: string): string {
  const emojiMap: Record<string, string> = {
    pop: '🎵', rock: '🎸', jazz: '🎷', classical: '🎼', electronic: '🎹',
    hiphop: '🎤', country: '🤠', rnb: '🎶', blues: '🎺', latin: '💃',
    reggae: '🌴', metal: '🤘', folk: '🪕', soul: '✨', funk: '🕺',
    news: '📰', sports: '⚽', talk: '💬', comedy: '😂',
  };
  return emojiMap[genre.toLowerCase()] || '🎵';
}

function getCountryFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '🌍';
  const codePoints = countryCode.toUpperCase().split('').map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
