# RadioX Design System — Signal Dark · Atlas Density

## Scene
Near-black listening theater. Artwork and stations carry color. Chrome stays quiet charcoal + teal.
Popup = **400px** listening console. Fixed rem heights; **ban `aspect-square` on tiles**.

## Register
Product UI (Chrome extension popup, ~400×580px).

## Theme
Cool charcoal — **not** muddy brown/amber, indigo, violet, or pink.
| Token | Hex | Role |
|-------|-----|------|
| `--rx-bg` | `#0a0a0b` | App canvas |
| `--rx-surface` | `#161618` | Cards / inputs |
| `--rx-accent` | `#2dd4bf` | Play, active, CTA only |
| `--rx-text` | `#f4f4f5` | Primary |
| `--rx-text-muted` | `#a1a1aa` | Secondary |

Noise overlay opacity ≈ 0.015. Respect `prefers-reduced-motion`.

## Typography
Outfit only. Tight tracking on logo.

## Density (Atlas)
| Surface | Spec |
|---------|------|
| Shelf card | **4.5rem** wide · art **3.5rem (56px / `SIZE.shelf`)** · gap **10px** → ~4.5 visible |
| Collections (Home) | 3-col · **h 4.5rem** mosaic |
| Playlists (Browse) | 2-col · **h 5rem** mosaic (not giant letters) |
| Genres | 3-col · **h 4.5rem** · up to 4 catalog logos |
| Countries | 2-col · **h 3rem** · flag + count + up to 3 logos · continent chips |
| Languages | 2-col · **h 2.75rem** |

## ScrollArea gotcha (WS2.0)
Radix ScrollArea wraps content in `display:table; min-width:100%`. Home horizontal shelves (~1350px max-content) otherwise widen the whole page so `1fr` tiles become ~440px. Fix in `index.css`:

```css
[data-slot='scroll-area-viewport'] > div {
  display: block !important;
  min-width: 0 !important;
}
```

Verify: shelf tiles ≈ **117px** wide (4.5rem), not ~440px.

## Artwork cascade
1. Logo overrides / station favicon (SVG allowed)
2. Homepage host favicon (Google + DuckDuckGo)
3. Brand host mapped from stream CDN (`STREAM_HOST_TO_BRAND`)
4. Quiet monogram — never stuck on first 404

Playing state uses an **inset** teal ring (not clipped by shelf overflow).

## Home shelves (disjoint by brand)
Featured strip (5 tier-1, larger art + chevrons, rotates every 4h) → World Top → Popular Now → Trending (≥8) → Collections → Deep Cuts → Public Radio → News & Talk

## Collections / playlist tiles
Fixed-height mosaic (no `aspect-square`). Charcoal→teal tonal ramp. 2×2 micro-mosaic of member art; no giant letter watermark.

## Bans
- `aspect-square` on shelf/collection/genre tiles
- Muddy warm brown / amber UI chrome
- Indigo / violet / pink accent defaults
- Serif “vintage radio” logo as default
- Single-src favicon with no fallback
- Vote-farm stations in Popular/Trending
- User-facing “mikepierce” / “IPRD” copy
- Curated prefix on live charts
- Ads / analytics
