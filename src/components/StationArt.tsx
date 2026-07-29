import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { getStationArtworkCandidates, type StationArtSource } from '@/lib/stationImages';

/** Cool charcoal / teal only — no violet. */
const PALETTE = [
  ['#1e1e24', '#a1a1aa'],
  ['#1a2228', '#7dd3c0'],
  ['#1a1e28', '#93c5fd'],
  ['#1e221a', '#86efac'],
  ['#181c20', '#5eead4'],
  ['#1c1c22', '#94a3b8'],
];

function hashHue(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % PALETTE.length;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'RX';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

interface StationArtProps {
  name: string;
  station?: StationArtSource;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'shelf';
  rounded?: 'md' | 'lg' | 'xl' | '2xl' | 'full';
  className?: string;
  playing?: boolean;
}

const SIZE = {
  sm: 'w-10 h-10 text-[10px]',
  md: 'w-12 h-12 text-[11px]',
  lg: 'w-14 h-14 text-xs',
  xl: 'w-[4.5rem] h-[4.5rem] text-sm',
  /** Shelf tile art — fixed 56×56, never aspect-square */
  shelf: 'w-14 h-14 text-[10px]',
};

const ROUND = {
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  full: 'rounded-full',
};

export function StationArt({
  name,
  station,
  src,
  size = 'md',
  rounded = 'xl',
  className,
  playing = false,
}: StationArtProps) {
  const candidates = station
    ? getStationArtworkCandidates({ ...station, name })
    : src
      ? [src]
      : [];

  const [idx, setIdx] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setIdx(0);
    setFailed(false);
  }, [name, station?.favicon, station?.homepage, station?.url, station?.stationuuid, src]);

  const current = !failed && idx < candidates.length ? candidates[idx] : null;
  const [a, b] = PALETTE[hashHue(name)];

  return (
    <div
      className={cn(
        'relative overflow-hidden flex-shrink-0 flex items-center justify-center select-none',
        SIZE[size],
        ROUND[rounded],
        className
      )}
      style={{
        background: current ? '#1a1a1e' : `linear-gradient(145deg, ${a}, ${b}44)`,
        boxShadow: playing
          ? 'inset 0 0 0 2px var(--rx-accent)'
          : undefined,
      }}
    >
      {current ? (
        <img
          key={current}
          src={current}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          referrerPolicy="no-referrer"
          loading="lazy"
          decoding="async"
          onError={() => {
            if (idx + 1 < candidates.length) setIdx((i) => i + 1);
            else setFailed(true);
          }}
        />
      ) : (
        <span className="font-semibold tracking-wide" style={{ color: b }}>
          {initials(name)}
        </span>
      )}
    </div>
  );
}
