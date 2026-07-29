import type { ReactNode } from 'react';

/** Minimal genre illustrations — square tile artwork, not generic icons. */
export function GenreArt({ genre, className }: { genre: string; className?: string }) {
  const key = genre.toLowerCase().trim();

  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {ART[key] ?? ART.default}
    </svg>
  );
}

const stroke = 'rgba(255,255,255,0.92)';
const fill = 'rgba(255,255,255,0.15)';

const ART: Record<string, ReactNode> = {
  pop: (
    <>
      <circle cx="32" cy="32" r="18" stroke={stroke} strokeWidth="2" fill={fill} />
      <path d="M32 18v28M22 32h20" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="32" cy="32" r="4" fill={stroke} />
    </>
  ),
  rock: (
    <>
      <path d="M18 46V28l8-10 6 8 8-14 6 10v24H18z" fill={fill} stroke={stroke} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M14 46h36" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
      <path d="M26 22l-4-6M38 18l2-8M44 26l6-4" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  jazz: (
    <>
      {/* Saxophone — body + bell */}
      <path d="M28 12c0 0 2 14 2 22 0 6-2 10-6 12" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <ellipse cx="20" cy="48" rx="10" ry="7" stroke={stroke} strokeWidth="1.8" fill={fill} transform="rotate(-20 20 48)" />
      <circle cx="28" cy="18" r="2" fill={stroke} />
      <circle cx="28" cy="24" r="2" fill={stroke} />
      <circle cx="29" cy="30" r="2" fill={stroke} />
      <path d="M40 16c6 2 10 8 8 14" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <path d="M44 14c7 3 11 10 9 16" stroke={stroke} strokeWidth="1.2" strokeLinecap="round" opacity="0.35" />
    </>
  ),
  classical: (
    <>
      <path d="M20 46V22c0-6 8-8 12-4s4 10 0 14-12 6-12 14" stroke={stroke} strokeWidth="1.8" fill={fill} />
      <path d="M44 46V26c0-5 6-6 9-3" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
      <ellipse cx="53" cy="24" rx="3" ry="4" stroke={stroke} strokeWidth="1.5" />
      <path d="M16 46h40" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  electronic: (
    <>
      <rect x="14" y="20" width="36" height="24" rx="4" stroke={stroke} strokeWidth="1.8" fill={fill} />
      {[22, 30, 38, 46].map((x) => (
        <rect key={x} x={x} y="28" width="4" height={12 + ((x / 2) % 3) * 4} rx="1" fill={stroke} opacity="0.85" />
      ))}
      <circle cx="32" cy="14" r="3" fill={stroke} />
      <path d="M32 17v3" stroke={stroke} strokeWidth="1.5" />
    </>
  ),
  news: (
    <>
      <rect x="16" y="14" width="32" height="36" rx="3" stroke={stroke} strokeWidth="1.8" fill={fill} />
      <rect x="20" y="20" width="24" height="10" rx="1" fill={stroke} opacity="0.3" />
      <path d="M20 36h18M20 42h14M20 48h20" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  talk: (
    <>
      <rect x="14" y="22" width="22" height="16" rx="8" stroke={stroke} strokeWidth="1.8" fill={fill} />
      <path d="M20 38v6l-4 4v-4h-2a6 6 0 010-12h2" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M42 28c3 0 5 2 5 5s-2 5-5 5" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M48 24c5 0 8 3 8 9s-3 9-8 9" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
    </>
  ),
  country: (
    <>
      <circle cx="32" cy="28" r="10" stroke={stroke} strokeWidth="1.8" fill={fill} />
      <path d="M32 38v8M24 46h16" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
      <path d="M22 24l-6-4M42 24l6-4" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  hiphop: (
    <>
      <circle cx="32" cy="22" r="8" stroke={stroke} strokeWidth="1.8" fill={fill} />
      <path d="M32 30v6" stroke={stroke} strokeWidth="2" />
      <path d="M24 40h16l-2 10H26l-2-10z" fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M18 28h-4M46 28h4" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  latin: (
    <>
      <path d="M32 14c-8 8-8 20 0 28 8-8 8-20 0-28z" stroke={stroke} strokeWidth="1.8" fill={fill} />
      <path d="M20 32h24M32 20v24" stroke={stroke} strokeWidth="1.2" opacity="0.5" />
      <circle cx="32" cy="32" r="4" fill={stroke} />
    </>
  ),
  reggae: (
    <>
      <circle cx="32" cy="32" r="16" stroke={stroke} strokeWidth="1.8" fill={fill} />
      <path d="M32 16v32M16 32h32" stroke={stroke} strokeWidth="1.2" opacity="0.4" />
      <path d="M22 22c4 4 16 4 20 0M22 42c4-4 16-4 20 0" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  metal: (
    <>
      <path d="M32 12l8 14h-6l4 18-10-12-10 12 4-18h-6l8-14z" fill={fill} stroke={stroke} strokeWidth="1.8" strokeLinejoin="round" />
    </>
  ),
  blues: (
    <>
      <path d="M20 44V24l12-8 12 8v20" stroke={stroke} strokeWidth="1.8" fill={fill} strokeLinejoin="round" />
      <circle cx="32" cy="30" r="5" stroke={stroke} strokeWidth="1.5" />
      <path d="M16 44h32" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  soul: (
    <>
      <path d="M32 48c-10 0-16-8-16-16 0-8 6-14 16-14s16 6 16 14c0 8-6 16-16 16z" stroke={stroke} strokeWidth="1.8" fill={fill} />
      <path d="M32 18v-4M24 14l-2-4M40 14l2-4" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  indie: (
    <>
      <circle cx="32" cy="32" r="14" stroke={stroke} strokeWidth="1.8" fill={fill} />
      <circle cx="32" cy="32" r="5" fill={stroke} />
      <circle cx="32" cy="32" r="1.5" fill="rgba(0,0,0,0.4)" />
    </>
  ),
  ambient: (
    <>
      <path d="M12 40c8-12 32-12 40 0" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M16 32c6-8 26-8 32 0" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <path d="M20 24c4-4 20-4 24 0" stroke={stroke} strokeWidth="1.2" strokeLinecap="round" opacity="0.35" />
      <circle cx="48" cy="16" r="4" fill={stroke} opacity="0.8" />
    </>
  ),
  house: (
    <>
      <path d="M16 46V28l16-12 16 12v18H16z" stroke={stroke} strokeWidth="1.8" fill={fill} strokeLinejoin="round" />
      <rect x="28" y="34" width="8" height="12" fill={stroke} opacity="0.5" />
      <path d="M10 46h44" stroke={stroke} strokeWidth="2" />
    </>
  ),
  dance: (
    <>
      <circle cx="24" cy="28" r="6" fill={stroke} />
      <circle cx="40" cy="28" r="6" fill={stroke} opacity="0.7" />
      <path d="M18 44l6-10 4 6 8-14 6 10 4-8" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  oldies: (
    <>
      <circle cx="32" cy="32" r="16" stroke={stroke} strokeWidth="1.8" fill={fill} />
      <circle cx="32" cy="32" r="4" fill={stroke} />
      <circle cx="32" cy="32" r="10" stroke={stroke} strokeWidth="1" opacity="0.4" />
    </>
  ),
  '80s': (
    <>
      <text x="32" y="38" textAnchor="middle" fill={stroke} fontSize="18" fontWeight="700" fontFamily="system-ui">80s</text>
    </>
  ),
  '90s': (
    <>
      <text x="32" y="38" textAnchor="middle" fill={stroke} fontSize="18" fontWeight="700" fontFamily="system-ui">90s</text>
    </>
  ),
  sports: (
    <>
      <circle cx="32" cy="32" r="14" stroke={stroke} strokeWidth="1.8" fill={fill} />
      <path d="M32 18v28M18 32h28" stroke={stroke} strokeWidth="1.2" />
      <path d="M22 22c6 4 14 4 20 0M22 42c6-4 14-4 20 0" stroke={stroke} strokeWidth="1.2" />
    </>
  ),
  comedy: (
    <>
      <circle cx="26" cy="30" r="10" stroke={stroke} strokeWidth="1.8" fill={fill} />
      <circle cx="38" cy="30" r="10" stroke={stroke} strokeWidth="1.8" fill={fill} />
      <path d="M20 42c4 6 20 6 24 0" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="23" cy="28" r="1.5" fill={stroke} />
      <circle cx="29" cy="28" r="1.5" fill={stroke} />
    </>
  ),
  christian: (
    <>
      <path d="M32 14v28M22 24h20" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
      <circle cx="32" cy="32" r="16" stroke={stroke} strokeWidth="1.5" fill={fill} opacity="0.5" />
    </>
  ),
  world: (
    <>
      <circle cx="32" cy="32" r="16" stroke={stroke} strokeWidth="1.8" fill={fill} />
      <ellipse cx="32" cy="32" rx="16" ry="6" stroke={stroke} strokeWidth="1.2" />
      <path d="M32 16v32M16 32h32" stroke={stroke} strokeWidth="1.2" opacity="0.5" />
    </>
  ),
  default: (
    <>
      <path d="M24 44c0-12 16-12 16 0" stroke={stroke} strokeWidth="1.8" fill={fill} />
      <circle cx="32" cy="24" r="8" stroke={stroke} strokeWidth="1.8" fill={fill} />
      <path d="M32 32v4" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
    </>
  ),
};
