import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Settings, Download, Upload, Moon, Coffee, ExternalLink } from 'lucide-react';
import { EQ_FREQUENCIES, EQ_PRESET_LABELS, EQ_PRESETS } from '@/lib/eqPresets';
import { useSettings } from '@/hooks/useSettings';
import { useSleepTimer } from '@/hooks/useCustomStations';
import { AddStationDialog } from '@/sections/AddStationDialog';
import {
  SUPPORT_TIP_URL,
  SUPPORT_KOFI_URL,
  SUPPORTER_CODE,
  setSupporter,
} from '@/lib/support';
import { openExternal } from '@/lib/openExternal';
import { getTrackLog, trackLogToCsv, type SearchProvider } from '@/lib/trackLog';
import type { RadioStation } from '@/types/station';
import { useState } from 'react';

const SLEEP_OPTIONS = [
  { label: 'Off', minutes: 0 },
  { label: '15m', minutes: 15 },
  { label: '30m', minutes: 30 },
  { label: '45m', minutes: 45 },
  { label: '60m', minutes: 60 },
  { label: '90m', minutes: 90 },
];

const SEARCH_PROVIDERS: { id: SearchProvider; label: string }[] = [
  { id: 'youtube-music', label: 'YouTube' },
  { id: 'spotify', label: 'Spotify' },
  { id: 'apple', label: 'Apple Music' },
  { id: 'soundcloud', label: 'SoundCloud' },
];

interface SettingsSheetProps {
  favorites: RadioStation[];
  onImportFavorites: (stations: RadioStation[]) => void;
  onAddCustom: (station: RadioStation) => void;
}

function SettingRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 py-2.5 cursor-pointer group">
      <div className="min-w-0">
        <span className="text-[12px] text-[var(--rx-text)] block">{label}</span>
        {description && (
          <span className="text-[10px] text-[var(--rx-text-faint)] block mt-0.5">{description}</span>
        )}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  );
}

export function SettingsSheet({ favorites, onImportFavorites, onAddCustom }: SettingsSheetProps) {
  const { settings, updateSettings } = useSettings();
  const { active: sleepActive, scheduledTime, setTimer } = useSleepTimer();
  const [supporterCode, setSupporterCode] = useState('');
  const [codeMsg, setCodeMsg] = useState('');

  const exportFavorites = () => {
    const blob = new Blob([JSON.stringify(favorites, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `radiox-favorites-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importFavorites = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const data = JSON.parse(await file.text()) as RadioStation[];
        if (Array.isArray(data)) onImportFavorites(data);
      } catch {
        // invalid file
      }
    };
    input.click();
  };

  const applyPreset = (preset: string) => {
    updateSettings({
      eqPreset: preset,
      eqBands: [...(EQ_PRESETS[preset] || EQ_PRESETS.flat)],
    });
  };

  const applySupporterCode = async () => {
    if (supporterCode.trim().toUpperCase() === SUPPORTER_CODE) {
      await setSupporter(true);
      await updateSettings({ supporter: true });
      setCodeMsg('Supporter unlocked — thank you!');
    } else {
      setCodeMsg('Code not recognized');
    }
  };

  const exportTrackCsv = async () => {
    if (!settings.supporter) return;
    const entries = await getTrackLog();
    const blob = new Blob([trackLogToCsv(entries)], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `radiox-tracks-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sleepLabel = sleepActive && scheduledTime
    ? `Stops ${new Date(scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : 'Off';

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Settings"
          className="p-2 rounded-xl text-[var(--rx-text-faint)] hover:text-[var(--rx-text-muted)] hover:bg-[var(--rx-surface-hover)] transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-[min(100vw,340px)] sm:max-w-[340px] overflow-y-auto border-[var(--rx-border)] text-[var(--rx-text)] p-0"
        style={{ background: 'var(--rx-bg-soft)' }}
      >
        <div className="px-5 pt-5 pb-6">
          <SheetHeader className="p-0 mb-5">
            <SheetTitle className="font-display text-lg text-[var(--rx-text)]">Settings</SheetTitle>
            <SheetDescription className="sr-only">
              Audio, quality, and favorites settings for RadioX
            </SheetDescription>
          </SheetHeader>

          <section className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Moon className="w-4 h-4 text-[var(--rx-accent)]" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--rx-text-muted)]">Sleep</h3>
              <span className="text-[10px] text-[var(--rx-accent)] ml-auto">{sleepLabel}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SLEEP_OPTIONS.map((opt) => (
                <button
                  key={opt.minutes}
                  type="button"
                  onClick={() => setTimer(opt.minutes)}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] border border-[var(--rx-border)] bg-[var(--rx-surface)] text-[var(--rx-text-muted)] hover:text-[var(--rx-text)] hover:bg-[var(--rx-surface-hover)] transition-colors"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          <section className="mb-6 pb-6 border-b border-[var(--rx-border)]">
            <div className="flex items-center gap-2 mb-3">
              <Coffee className="w-4 h-4 text-[var(--rx-accent)]" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--rx-text-muted)]">
                Support RadioX
              </h3>
              {settings.supporter && (
                <span className="text-[9px] text-[var(--rx-accent)] ml-auto">Supporter</span>
              )}
            </div>
            <p className="text-[10px] text-[var(--rx-text-faint)] mb-2 leading-relaxed">
              Tips keep RadioX ad-free. No analytics. Unlock unlimited track log + CSV export.
              After tipping, paste the unlock code from the thank-you page, then tap Unlock.
            </p>
            <div className="flex gap-2 mb-3">
              <a
                href={SUPPORT_TIP_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(ev) => openExternal(SUPPORT_TIP_URL, ev)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg text-[11px] border border-[var(--rx-border)] bg-[var(--rx-surface)] text-[var(--rx-text)] hover:bg-[var(--rx-surface-hover)]"
              >
                Buy Me a Coffee <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href={SUPPORT_KOFI_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(ev) => openExternal(SUPPORT_KOFI_URL, ev)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg text-[11px] border border-[var(--rx-border)] bg-[var(--rx-surface)] text-[var(--rx-text)] hover:bg-[var(--rx-surface-hover)]"
              >
                Ko-fi <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="flex gap-2">
              <Input
                value={supporterCode}
                onChange={(e) => setSupporterCode(e.target.value)}
                placeholder="Supporter code"
                className="rx-input h-9 text-[11px]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void applySupporterCode();
                }}
              />
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-xs border-[var(--rx-border)] bg-[var(--rx-surface)]"
                onClick={applySupporterCode}
              >
                Unlock
              </Button>
            </div>
            {codeMsg && (
              <p className="text-[10px] text-[var(--rx-accent)] mt-1.5">{codeMsg}</p>
            )}
            {settings.supporter && (
              <Button
                variant="outline"
                size="sm"
                className="w-full h-9 text-xs mt-3 border-[var(--rx-border)] bg-[var(--rx-surface)]"
                onClick={exportTrackCsv}
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Export track log CSV
              </Button>
            )}
          </section>

          <section className="mb-6 pb-6 border-b border-[var(--rx-border)]">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--rx-text-muted)] mb-1">
              Find song
            </h3>
            <p className="text-[10px] text-[var(--rx-text-faint)] mb-2">
              Opens when you tap the link icon on a track (Library → Tracks) or Find on the player.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SEARCH_PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => updateSettings({ searchProvider: p.id })}
                  className={`px-2 py-1 rounded-lg text-[10px] border transition-colors ${
                    (settings.searchProvider || 'youtube-music') === p.id
                      ? 'border-[var(--rx-accent)]/40 bg-[var(--rx-accent-soft)] text-[var(--rx-accent)]'
                      : 'border-[var(--rx-border)] text-[var(--rx-text-faint)] hover:text-[var(--rx-text-muted)]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </section>

          <section className="mb-6 pb-6 border-b border-[var(--rx-border)]">
            <SettingRow
              label="Equalizer"
              description="5-band EQ on playback"
              checked={settings.eqEnabled}
              onCheckedChange={(v) => updateSettings({ eqEnabled: v })}
            />
            <div className="flex flex-wrap gap-1.5 mt-3 mb-4">
              {Object.keys(EQ_PRESETS).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyPreset(key)}
                  className={`px-2 py-1 rounded-lg text-[10px] border transition-colors ${
                    settings.eqPreset === key
                      ? 'border-[var(--rx-accent)]/40 bg-[var(--rx-accent-soft)] text-[var(--rx-accent)]'
                      : 'border-[var(--rx-border)] text-[var(--rx-text-faint)] hover:text-[var(--rx-text-muted)]'
                  }`}
                >
                  {EQ_PRESET_LABELS[key]}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-5 gap-3 px-1">
              {EQ_FREQUENCIES.map((freq, i) => (
                <div key={freq} className="flex flex-col items-center gap-2">
                  <Slider
                    orientation="vertical"
                    className="h-20"
                    value={[settings.eqBands[i] ?? 0]}
                    min={-12}
                    max={12}
                    step={1}
                    onValueChange={(v) => {
                      const bands = [...settings.eqBands];
                      bands[i] = v[0] ?? 0;
                      updateSettings({ eqBands: bands, eqPreset: 'custom' });
                    }}
                  />
                  <span className="text-[9px] text-[var(--rx-text-faint)] tabular-nums">
                    {freq >= 1000 ? `${freq / 1000}k` : freq}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-6 pb-6 border-b border-[var(--rx-border)]">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--rx-text-muted)] mb-1">Preferences</h3>
            <SettingRow
              label="HD only"
              description="128 kbps minimum"
              checked={settings.hdOnly}
              onCheckedChange={(v) => updateSettings({ hdOnly: v })}
            />
            <SettingRow
              label="Notifications"
              description="When a station starts"
              checked={settings.showNotifications}
              onCheckedChange={(v) => updateSettings({ showNotifications: v })}
            />
            <SettingRow
              label="Compact player"
              description="Slim single-row player bar"
              checked={settings.compactMode}
              onCheckedChange={(v) => updateSettings({ compactMode: v })}
            />
          </section>

          <section className="mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--rx-text-muted)] mb-3">Custom station</h3>
            <AddStationDialog
              onAdd={onAddCustom}
              trigger={
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-9 text-xs border-[var(--rx-border)] bg-[var(--rx-surface)] text-[var(--rx-text)] hover:bg-[var(--rx-surface-hover)]"
                >
                  Add stream URL
                </Button>
              }
            />
          </section>

          <section className="mb-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--rx-text-muted)] mb-3">Favorites backup</h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-9 text-xs border-[var(--rx-border)] bg-[var(--rx-surface)] text-[var(--rx-text)] hover:bg-[var(--rx-surface-hover)]"
                onClick={exportFavorites}
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-9 text-xs border-[var(--rx-border)] bg-[var(--rx-surface)] text-[var(--rx-text)] hover:bg-[var(--rx-surface-hover)]"
                onClick={importFavorites}
              >
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                Import
              </Button>
            </div>
          </section>

          <p className="text-[10px] text-[var(--rx-text-faint)] leading-relaxed">
            Space · play/pause · ← → · skip queue
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
