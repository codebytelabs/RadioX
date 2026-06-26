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
import { Settings, Download, Upload, Moon } from 'lucide-react';
import { EQ_FREQUENCIES, EQ_PRESET_LABELS, EQ_PRESETS } from '@/lib/eqPresets';
import { useSettings } from '@/hooks/useSettings';
import { useSleepTimer } from '@/hooks/useCustomStations';
import { AddStationDialog } from '@/sections/AddStationDialog';
import type { RadioStation } from '@/types/station';

const SLEEP_OPTIONS = [
  { label: 'Off', minutes: 0 },
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '45 min', minutes: 45 },
  { label: '60 min', minutes: 60 },
  { label: '90 min', minutes: 90 },
];

interface SettingsSheetProps {
  favorites: RadioStation[];
  onImportFavorites: (stations: RadioStation[]) => void;
  onAddCustom: (station: RadioStation) => void;
}

export function SettingsSheet({ favorites, onImportFavorites, onAddCustom }: SettingsSheetProps) {
  const { settings, updateSettings } = useSettings();
  const { active: sleepActive, scheduledTime, setTimer } = useSleepTimer();

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
        const text = await file.text();
        const data = JSON.parse(text) as RadioStation[];
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

  const sleepLabel = sleepActive && scheduledTime
    ? `Stops ${new Date(scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : 'Off';

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors">
          <Settings className="w-4 h-4" />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="bg-[#0f0f18] border-white/10 text-white w-[320px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-white text-sm">Settings</SheetTitle>
          <SheetDescription className="sr-only">
            Audio, quality, and favorites settings for RadioX
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 mt-4 pb-6">
          {/* Sleep Timer */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Moon className="w-3.5 h-3.5 text-emerald-400" />
              <h3 className="text-xs font-semibold">Sleep Timer</h3>
              <span className="text-[10px] text-gray-500 ml-auto">{sleepLabel}</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {SLEEP_OPTIONS.map((opt) => (
                <button
                  key={opt.minutes}
                  onClick={() => setTimer(opt.minutes)}
                  className={`px-2 py-1 rounded-md text-[10px] border transition-colors ${
                    (opt.minutes === 0 && !sleepActive) || sleepActive
                      ? 'border-white/10 bg-white/5 text-gray-400 hover:text-white'
                      : 'border-white/10 bg-white/5 text-gray-400 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          {/* Equalizer */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold">5-Band Equalizer</h3>
              <Switch
                checked={settings.eqEnabled}
                onCheckedChange={(v) => updateSettings({ eqEnabled: v })}
              />
            </div>
            <div className="flex flex-wrap gap-1 mb-3">
              {Object.keys(EQ_PRESETS).map((key) => (
                <button
                  key={key}
                  onClick={() => applyPreset(key)}
                  className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                    settings.eqPreset === key
                      ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-400'
                      : 'border-white/10 text-gray-500 hover:text-white'
                  }`}
                >
                  {EQ_PRESET_LABELS[key]}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-5 gap-2">
              {EQ_FREQUENCIES.map((freq, i) => (
                <div key={freq} className="flex flex-col items-center gap-1">
                  <Slider
                    orientation="vertical"
                    className="h-16"
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
                  <span className="text-[8px] text-gray-600">
                    {freq >= 1000 ? `${freq / 1000}k` : freq}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Quality */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold">Quality</h3>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-400">HD only (128kbps+)</span>
              <Switch
                checked={settings.hdOnly}
                onCheckedChange={(v) => updateSettings({ hdOnly: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-400">Show notifications</span>
              <Switch
                checked={settings.showNotifications}
                onCheckedChange={(v) => updateSettings({ showNotifications: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-400">Compact mode</span>
              <Switch
                checked={settings.compactMode}
                onCheckedChange={(v) => updateSettings({ compactMode: v })}
              />
            </div>
          </section>

          {/* Custom station */}
          <section>
            <h3 className="text-xs font-semibold mb-2">Custom Stations</h3>
            <AddStationDialog
              onAdd={onAddCustom}
              trigger={
                <Button variant="outline" size="sm" className="w-full h-8 text-[11px] border-white/10 bg-white/5">
                  Add stream URL
                </Button>
              }
            />
          </section>

          {/* Import / Export */}
          <section>
            <h3 className="text-xs font-semibold mb-2">Favorites Backup</h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-8 text-[10px] border-white/10 bg-white/5"
                onClick={exportFavorites}
              >
                <Download className="w-3 h-3 mr-1" />
                Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-8 text-[10px] border-white/10 bg-white/5"
                onClick={importFavorites}
              >
                <Upload className="w-3 h-3 mr-1" />
                Import
              </Button>
            </div>
          </section>

          <p className="text-[10px] text-gray-600 leading-relaxed">
            Keyboard: Space = play/pause · ←/→ = skip queue · Media keys work globally
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
