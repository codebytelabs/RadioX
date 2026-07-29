import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

interface SectionShelfProps {
  title: string;
  subtitle?: string;
  onSeeAll?: () => void;
  seeAllCount?: number;
  emptyMessage?: string;
  children: ReactNode;
  loading?: boolean;
}

export function SectionShelf({
  title,
  subtitle,
  onSeeAll,
  seeAllCount,
  emptyMessage,
  children,
  loading,
}: SectionShelfProps) {
  const childCount = Array.isArray(children) ? children.length : children ? 1 : 0;
  const isEmpty = !loading && childCount === 0;

  return (
    <section className="mb-4">
      <div className="flex items-end justify-between px-4 mb-2">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-[var(--rx-text)] tracking-tight leading-none">
            {title}
          </h2>
          {subtitle && (
            <p className="text-[10px] text-[var(--rx-text-faint)] mt-1 truncate">{subtitle}</p>
          )}
        </div>
        {onSeeAll && !isEmpty && (
          <button
            type="button"
            onClick={onSeeAll}
            className="flex items-center gap-0.5 text-[10px] font-medium text-[var(--rx-accent)] hover:text-[var(--rx-accent-hover)] flex-shrink-0 ml-2"
          >
            See all{typeof seeAllCount === 'number' ? ` · ${seeAllCount}` : ''}
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>
      {loading ? (
        <div className="flex gap-2.5 px-4 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="w-[4.5rem] flex-shrink-0">
              <div className="w-14 h-14 rounded-xl rx-skeleton animate-pulse" />
              <div className="h-2 w-12 mt-1.5 rounded rx-skeleton" />
              <div className="h-1.5 w-8 mt-1 rounded rx-skeleton" />
            </div>
          ))}
        </div>
      ) : isEmpty ? (
        <p className="px-4 text-[11px] text-[var(--rx-text-faint)]">{emptyMessage || 'Nothing here yet'}</p>
      ) : (
        <div className="rx-shelf flex gap-2.5 px-4 overflow-x-auto pb-1 scrollbar-none">
          {children}
        </div>
      )}
    </section>
  );
}
