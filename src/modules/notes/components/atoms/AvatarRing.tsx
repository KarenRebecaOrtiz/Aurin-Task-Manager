'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import styles from './AvatarRing.module.scss';

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
  return (
    <div
      className={cn(
        styles.container,
        styles[size],
        hasGradient ? styles.hasGradient : styles.noGradient,
        className
      )}
    >
      <div className={cn(styles.avatarWrapper, styles[size])}>
        {src ? (
          <Image
            src={src}
            alt={alt}
            fill
            className={styles.image}
            sizes={size === 'sm' ? '32px' : size === 'md' ? '48px' : '64px'}
          />
        ) : (
          <div className={styles.fallback}>
            {alt.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
    </div>
  );
}
