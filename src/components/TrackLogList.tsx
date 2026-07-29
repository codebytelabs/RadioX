import { Heart, ExternalLink } from 'lucide-react';
import { StationArt } from '@/components/StationArt';
import { openExternal } from '@/lib/openExternal';
import { findSongUrl, type SearchProvider, type TrackLogEntry } from '@/lib/trackLog';

interface TrackLogListProps {
  entries: TrackLogEntry[];
  searchProvider: SearchProvider;
  capped?: boolean;
  onToggleSaved: (id: string) => void;
  onClear?: () => void;
  emptyMessage?: string;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (sameDay) return time;
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`;
}

export function TrackLogList({
  entries,
  searchProvider,
  capped,
  onToggleSaved,
  onClear,
  emptyMessage = 'Tracks appear here when stations send song metadata',
}: TrackLogListProps) {
  if (entries.length === 0) {
    return (
      <p className="px-1 py-8 text-center text-[11px] text-[var(--rx-text-faint)]">{emptyMessage}</p>
    );
  }

  return (
    <div className="pb-3">
      <div className="flex items-center justify-between px-1 mb-2">
        <p className="text-[10px] text-[var(--rx-text-faint)] uppercase tracking-wider">
          {entries.length} tracks{capped ? ' · free limit' : ''}
        </p>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="text-[10px] text-[var(--rx-text-faint)] hover:text-[var(--rx-text-muted)]"
          >
            Clear
          </button>
        )}
      </div>
      <ul className="space-y-0.5">
        {entries.map((e) => (
          <li
            key={e.id}
            className="flex items-center gap-2.5 px-1.5 py-2 rounded-xl hover:bg-[var(--rx-surface-hover)]"
          >
            <StationArt
              name={e.stationName}
              src={e.favicon}
              size="sm"
              rounded="lg"
            />
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-[var(--rx-text)] truncate leading-tight">
                {e.title}
              </p>
              <p className="text-[10px] text-[var(--rx-text-faint)] truncate mt-0.5">
                {formatTime(e.ts)} · {e.stationName}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onToggleSaved(e.id)}
              className="p-1.5 rounded-lg text-[var(--rx-text-faint)] hover:text-[var(--rx-favorite)]"
              aria-label={e.saved ? 'Unsave track' : 'Save track'}
            >
              <Heart
                className={`w-3.5 h-3.5 ${e.saved ? 'fill-[var(--rx-favorite)] text-[var(--rx-favorite)]' : ''}`}
              />
            </button>
            <a
              href={findSongUrl(e.title, searchProvider)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(ev) => openExternal(findSongUrl(e.title, searchProvider), ev)}
              className="p-1.5 rounded-lg text-[var(--rx-text-faint)] hover:text-[var(--rx-accent)]"
              aria-label="Find song"
              title="Find song"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
