import { cn } from '@/lib/utils';
import type { ExtinguisherLiveStatus } from '@/lib/types';

interface BlinkingDotProps {
  status: ExtinguisherLiveStatus;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
  className?: string;
}

const sizeMap = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-6 w-6',
};

const colorMap = {
  good: {
    base: 'bg-emerald-500',
    glow: 'shadow-[0_0_8px_2px_rgba(16,185,129,0.6)]',
    ring: 'bg-emerald-400',
  },
  defective: {
    base: 'bg-red-500',
    glow: 'shadow-[0_0_8px_2px_rgba(239,68,68,0.6)]',
    ring: 'bg-red-400',
  },
  missing: {
    base: 'bg-red-500',
    glow: 'shadow-[0_0_8px_2px_rgba(239,68,68,0.4)]',
    ring: 'bg-red-300',
  },
};

export function BlinkingDot({ status, size = 'md', pulse = true, className }: BlinkingDotProps) {
  const colors = colorMap[status];
  const shouldBlink = pulse && status !== 'good';

  return (
    <span className={cn('relative inline-flex items-center justify-center', className)}>
      {shouldBlink && (
        <span
          className={cn(
            'absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping',
            colors.ring,
          )}
        />
      )}
      <span
        className={cn(
          'relative inline-flex rounded-full',
          sizeMap[size],
          colors.base,
          colors.glow,
        )}
      />
    </span>
  );
}
