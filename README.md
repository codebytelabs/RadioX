# RadioX - Global Internet Radio Chrome Extension

A powerful Chrome extension that gives you access to **40,000+ internet radio stations** worldwide. Browse by genre, country, search for specific stations, save favorites, and enjoy seamless background playback.

## Features

### Core Features (Free)
- **40,000+ Stations** via Radio Browser API - the largest open radio directory
- **Search** - Find stations by name, genre, or country
- **Browse by Genre** - 40+ genres including Pop, Rock, Jazz, Classical, Electronic, Hip-Hop, and more
- **Browse by Country** - 20+ countries including US, UK, Germany, France, Brazil, Japan, and more
- **Top Stations** - Discover the most popular stations globally
- **Favorites** - Save unlimited favorite stations
- **Recently Played** - Quick access to your listening history
- **Background Playback** - Continue listening while browsing (uses offscreen document API)
- **Volume Control** - Fine-grained volume slider
- **Station Quality Info** - See bitrate and codec information

### Premium Features (Coming Soon)
- HD Audio Quality (320kbps+) filtering
- Sleep Timer
- Unlimited favorites
- No donation banner

## Installation

### From Source (Developer Mode)

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `dist/` folder from this project
6. The RadioX icon will appear in your Chrome toolbar

### From Chrome Web Store
*Coming soon - awaiting review*

## How to Use

1. Click the **RadioX icon** in your Chrome toolbar
2. **Browse Top Stations** - The default tab shows the most popular stations worldwide
3. **Browse by Category** - Click "Browse" to explore by genre or country
4. **Search** - Type in the search bar to find specific stations
5. **Play** - Click any station to start playing
6. **Favorite** - Click the heart icon to save a station to your favorites
7. **Control Playback** - Use the player bar at the bottom to play/pause/stop and adjust volume

## Technical Architecture

### Chrome Extension Manifest V3
- **Background Service Worker** - Manages player state, favorites, and recent stations
- **Offscreen Document** - Handles audio playback (required for Manifest V3 since service workers can't access DOM)
- **Popup UI** - React-based interface built with TypeScript and Tailwind CSS

### APIs Used
- **Radio Browser API** - Free, open-source radio station directory (45,000+ stations)
- **Chrome Storage API** - Local storage for favorites and settings
- **Chrome Offscreen API** - Background audio playback
- **Chrome Notifications API** - Now playing notifications

## Monetization Strategy

### Current
- **Buy Me a Coffee** donation link for voluntary support
- **Premium teaser** to gauge interest in paid features

### Planned
- **Freemium Model** - Core features free, premium features $4.99/month
  - HD quality streams only
  - Sleep timer & alarm clock
  - Advanced audio equalizer
  - Custom themes
  - No ads/donation banners
- **Affiliate Marketing** - Links to music gear (headphones, speakers) via Amazon Associates

## Development

### Tech Stack
- React 19 + TypeScript
- Tailwind CSS + shadcn/ui
- Vite build system
- Chrome Extensions Manifest V3

### Building
```bash
npm install
npm run build
```

The built extension will be in the `dist/` folder.

### Project Structure
```
├── manifest.json          # Extension manifest
├── background.js          # Service worker
├── offscreen.html         # Audio playback container
├── offscreen.js           # Audio player logic
├── popup.html             # Popup entry point
├── src/
│   ├── App.tsx            # Main React app
│   ├── sections/          # UI sections
│   │   ├── StationList.tsx
│   │   ├── CategoryBrowser.tsx
│   │   ├── PlayerBar.tsx
│   │   ├── SearchBar.tsx
│   │   ├── FavoritesList.tsx
│   │   ├── RecentList.tsx
│   │   └── DonationBanner.tsx
│   ├── hooks/             # Custom React hooks
│   │   ├── usePlayer.ts
│   │   └── useChromeStorage.ts
│   ├── lib/               # Utilities
│   │   └── radioApi.ts    # Radio Browser API client
│   └── types/             # TypeScript types
│       └── station.ts
└── icons/                 # Extension icons
```

## Privacy

- No personal data is collected
- No tracking or analytics
- Station favorites are stored locally in your browser
- Audio streams come directly from radio station servers

## License

MIT License - Feel free to use and modify as needed.

## Credits

- [Radio Browser](https://www.radio-browser.info/) - The free radio station API
- [shadcn/ui](https://ui.shadcn.com/) - UI component library
- [Lucide Icons](https://lucide.dev/) - Icon set