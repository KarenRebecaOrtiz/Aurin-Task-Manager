'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import styles from '../../styles/Dialog.module.scss';

export interface ScrollableContentProps {
  children: ReactNode;
  className?: string;
  maxHeight?: string;
}

export function ScrollableContent({
  children,
  className,
  maxHeight,
}: ScrollableContentProps) {
  return (
    <div
      className={cn(styles.scrollableContent, className)}
      style={maxHeight ? { maxHeight } : undefined}
    >
      {children}
    </div>
  );
}
