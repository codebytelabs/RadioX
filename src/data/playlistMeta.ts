import type { LucideIcon } from 'lucide-react';
import {
  Globe2, Radio, Newspaper, Music, Headphones, Guitar,
  MapPin, Earth, Landmark, Sparkles,
} from 'lucide-react';
import type { PlaylistId } from '@/lib/stationCatalog';

export type EditorialPlaylist = {
  id: PlaylistId;
  title: string;
  description: string;
  icon: LucideIcon;
  region?: string;
};

/** Editorial playlists — curated streams + Radio Browser icons. */
export const EDITORIAL_PLAYLISTS: EditorialPlaylist[] = [
  {
    id: 'quality-picks',
    title: 'Deep Cuts',
    description: 'Hand-picked streams · NTS, SomaFM, FIP, campus & indie…',
    icon: Sparkles,
  },
  {
    id: 'global-icons',
    title: 'World Icons',
    description: 'BBC, NPR, France Info, Deutschlandfunk, Radio Paradise…',
    icon: Globe2,
  },
  {
    id: 'public-radio',
    title: 'Public Radio',
    description: 'Public broadcasters on every continent',
    icon: Radio,
  },
  {
    id: 'world-news',
    title: 'News & Talk',
    description: 'News, talk, and current affairs worldwide',
    icon: Newspaper,
  },
  {
    id: 'uk-europe',
    title: 'UK & Europe',
    description: 'British, French, German, Italian, Spanish stations',
    icon: Landmark,
    region: 'Europe',
  },
  {
    id: 'americas',
    title: 'The Americas',
    description: 'US, Canada, Latin America — from NPR to BandNews',
    icon: MapPin,
    region: 'Americas',
  },
  {
    id: 'asia-pacific',
    title: 'Asia-Pacific',
    description: 'NHK, ABC, triple j, RNZ, and more',
    icon: Earth,
    region: 'Asia-Pacific',
  },
  {
    id: 'africa-middle-east',
    title: 'Africa & Middle East',
    description: 'Talk Radio 702, Metro FM, RFI, and regional voices',
    icon: Globe2,
    region: 'Africa & MENA',
  },
  {
    id: 'jazz-blues',
    title: 'Jazz & Blues',
    description: 'Smooth jazz, blues, soul from around the world',
    icon: Guitar,
  },
  {
    id: 'electronic',
    title: 'Electronic & Dance',
    description: 'House, techno, ambient, and dance floors globally',
    icon: Headphones,
  },
  {
    id: 'latin-vibes',
    title: 'Latin Vibes',
    description: 'Salsa, reggaeton, MPB, and Latin pop',
    icon: Music,
  },
];
