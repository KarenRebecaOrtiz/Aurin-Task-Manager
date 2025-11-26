'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

interface AvatarRingProps {
  src: string;
  alt: string;
  hasGradient?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function AvatarRing({
  src,
  alt,
  hasGradient = false,
  size = 'md',
  className,
}: AvatarRingProps) {
  const sizeClasses = {
    sm: 'h-11 w-11',
    md: 'h-16 w-16',
    lg: 'h-20 w-20',
  };

  const ringClasses = {
    sm: 'p-1',
    md: 'p-1.5',
    lg: 'p-2',
  };

  return (
    <div
      className={cn(
        'relative flex items-center justify-center rounded-full',
        ringClasses[size],
        hasGradient && 'bg-[#d7df75]',
        !hasGradient && 'bg-transparent',
        className
      )}
    >
      <div className={cn('relative rounded-full bg-background', sizeClasses[size])}>
        {src ? (
          <Image
            src={src}
            alt={alt}
            fill
            className="rounded-full object-cover"
            sizes={size === 'sm' ? '32px' : size === 'md' ? '48px' : '64px'}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
            {alt.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
    </div>
  );
}
