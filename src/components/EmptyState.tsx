import type { LucideIcon } from 'lucide-react';
import { Radio } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
}

export function EmptyState({ icon: Icon = Radio, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-8">
      <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4 rx-empty-icon">
        <Icon className="w-5 h-5 text-[var(--rx-text-faint)]" />
      </div>
      <p className="text-sm text-[var(--rx-text-muted)]">{title}</p>
      {description && (
        <p className="text-[11px] text-[var(--rx-text-faint)] mt-1.5 max-w-[220px]">{description}</p>
      )}
    </div>
  );
}
