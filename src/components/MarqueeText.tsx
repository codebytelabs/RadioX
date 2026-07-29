import { cn } from '@/lib/utils';

interface MarqueeTextProps {
  text: string;
  className?: string;
  onClick?: () => void;
}

export function MarqueeText({ text, className, onClick }: MarqueeTextProps) {
  const long = text.length > 22;
  const durationSec = Math.min(28, Math.max(8, text.length * 0.35));

  return (
    <div
      className={cn('overflow-hidden min-w-0', onClick && 'cursor-pointer')}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <p
        className={cn(
          'text-[11px] text-[var(--rx-accent)] font-medium whitespace-nowrap',
          long && 'animate-marquee inline-block',
          className
        )}
        style={long ? { animationDuration: `${durationSec}s` } : undefined}
      >
        {long ? (
          <>
            <span>{text}</span>
            <span aria-hidden className="px-3">·</span>
            <span aria-hidden>{text}</span>
          </>
        ) : (
          text
        )}
      </p>
    </div>
  );
}
