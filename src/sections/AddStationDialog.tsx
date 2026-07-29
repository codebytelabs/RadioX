import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { createCustomStation } from '@/lib/customStation';
import type { RadioStation } from '@/types/station';

interface AddStationDialogProps {
  onAdd: (station: RadioStation) => void;
  trigger?: React.ReactNode;
}

export function AddStationDialog({ onAdd, trigger }: AddStationDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!name.trim() || !url.trim()) {
      setError('Name and stream URL are required');
      return;
    }
    try {
      new URL(url.trim());
    } catch {
      setError('Enter a valid URL (https://...)');
      return;
    }

    const station = createCustomStation(name, url);
    onAdd(station);
    setName('');
    setUrl('');
    setError('');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="h-7 text-[10px] border-white/10 bg-white/5">
            <Plus className="w-3 h-3 mr-1" />
            Add Station
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="border-[var(--rx-border)] text-[var(--rx-text)] sm:max-w-sm" style={{ background: 'var(--rx-bg-soft)' }}>
        <DialogHeader>
          <DialogTitle className="text-sm">Add Custom Station</DialogTitle>
          <DialogDescription className="text-xs text-gray-400">
            Enter a direct stream or playlist URL (.m3u / .pls)
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-1">
          <Input
            placeholder="Station name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rx-input border-0 shadow-none focus-visible:ring-0"
          />
          <Input
            placeholder="Stream URL (https://...)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="rx-input border-0 shadow-none focus-visible:ring-0"
          />
          {error && <p className="text-[10px] text-red-400">{error}</p>}
          <Button onClick={handleSubmit} className="w-full text-xs font-semibold" style={{ background: 'var(--rx-accent)', color: 'var(--rx-bg)' }}>
            Save & Play
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
