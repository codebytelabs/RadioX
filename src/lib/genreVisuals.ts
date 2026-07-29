import type { LucideIcon } from 'lucide-react';
import {
  Music, Mic2, Radio, Newspaper, Trophy, Laugh, Sparkles,
  Guitar, Piano, Headphones, Globe2, Church, Waves,
} from 'lucide-react';

export type GenreVisual = {
  icon: LucideIcon;
  gradient: string;
  label: string;
};

/** Cool charcoal → teal-slate tonal ramp (luminance steps only). */
const TONAL = [
  'linear-gradient(135deg, #1a2e2e 0%, #121416 100%)',
  'linear-gradient(135deg, #1c3230 0%, #141618 100%)',
  'linear-gradient(135deg, #163836 0%, #101214 100%)',
  'linear-gradient(135deg, #1e3438 0%, #121618 100%)',
  'linear-gradient(135deg, #1a2a2e 0%, #101214 100%)',
  'linear-gradient(135deg, #243838 0%, #16181a 100%)',
  'linear-gradient(135deg, #1a3434 0%, #121416 100%)',
  'linear-gradient(135deg, #203032 0%, #141618 100%)',
];

function tonal(i: number): string {
  return TONAL[i % TONAL.length];
}

const DEFAULT: GenreVisual = {
  icon: Music,
  gradient: tonal(0),
  label: '',
};

const GENRE_MAP: Record<string, GenreVisual> = {
  pop: { icon: Sparkles, gradient: tonal(1), label: 'Pop' },
  rock: { icon: Guitar, gradient: tonal(2), label: 'Rock' },
  jazz: { icon: Piano, gradient: tonal(3), label: 'Jazz' },
  classical: { icon: Piano, gradient: tonal(4), label: 'Classical' },
  electronic: { icon: Headphones, gradient: tonal(5), label: 'Electronic' },
  hiphop: { icon: Mic2, gradient: tonal(6), label: 'Hip Hop' },
  country: { icon: Guitar, gradient: tonal(7), label: 'Country' },
  rnb: { icon: Music, gradient: tonal(0), label: 'R&B' },
  blues: { icon: Guitar, gradient: tonal(1), label: 'Blues' },
  latin: { icon: Music, gradient: tonal(2), label: 'Latin' },
  reggae: { icon: Waves, gradient: tonal(3), label: 'Reggae' },
  metal: { icon: Guitar, gradient: tonal(4), label: 'Metal' },
  folk: { icon: Guitar, gradient: tonal(5), label: 'Folk' },
  soul: { icon: Mic2, gradient: tonal(6), label: 'Soul' },
  funk: { icon: Music, gradient: tonal(7), label: 'Funk' },
  disco: { icon: Sparkles, gradient: tonal(0), label: 'Disco' },
  punk: { icon: Guitar, gradient: tonal(1), label: 'Punk' },
  indie: { icon: Headphones, gradient: tonal(2), label: 'Indie' },
  ambient: { icon: Waves, gradient: tonal(3), label: 'Ambient' },
  house: { icon: Headphones, gradient: tonal(4), label: 'House' },
  techno: { icon: Headphones, gradient: tonal(5), label: 'Techno' },
  trance: { icon: Sparkles, gradient: tonal(6), label: 'Trance' },
  dance: { icon: Music, gradient: tonal(7), label: 'Dance' },
  alternative: { icon: Guitar, gradient: tonal(0), label: 'Alternative' },
  oldies: { icon: Radio, gradient: tonal(1), label: 'Oldies' },
  '80s': { icon: Sparkles, gradient: tonal(2), label: '80s' },
  '90s': { icon: Sparkles, gradient: tonal(3), label: '90s' },
  '2000s': { icon: Music, gradient: tonal(4), label: '2000s' },
  hits: { icon: Sparkles, gradient: tonal(5), label: 'Hits' },
  'top 40': { icon: Sparkles, gradient: tonal(6), label: 'Top 40' },
  christian: { icon: Church, gradient: tonal(7), label: 'Christian' },
  gospel: { icon: Church, gradient: tonal(0), label: 'Gospel' },
  news: { icon: Newspaper, gradient: tonal(1), label: 'News' },
  sports: { icon: Trophy, gradient: tonal(2), label: 'Sports' },
  talk: { icon: Mic2, gradient: tonal(3), label: 'Talk' },
  comedy: { icon: Laugh, gradient: tonal(4), label: 'Comedy' },
  podcast: { icon: Mic2, gradient: tonal(5), label: 'Podcast' },
  world: { icon: Globe2, gradient: tonal(6), label: 'World' },
};

export function getGenreVisual(tag: string): GenreVisual {
  const key = tag.toLowerCase().trim();
  const visual = GENRE_MAP[key];
  if (visual) return { ...visual, label: visual.label || capitalize(tag) };
  return { ...DEFAULT, label: capitalize(tag) };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const CURATED_GENRES = [
  'pop', 'rock', 'jazz', 'classical', 'electronic', 'news', 'talk',
  'country', 'hiphop', 'latin', 'reggae', 'metal', 'blues', 'soul',
  'indie', 'ambient', 'house', 'dance', 'oldies', '80s', '90s',
  'sports', 'comedy', 'christian', 'world',
] as const;
