'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import styles from './DialogFooter.module.scss';

export interface DialogFooterProps {
  children: ReactNode;
  sticky?: boolean;
  className?: string;
  /**
   * Mostrar border superior (patrón shadcn)
   */
  bordered?: boolean;
}

export function DialogFooter({
  children,
  sticky = true,
  className,
  bordered = true,
}: DialogFooterProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-end space-x-2 px-4 py-4',
        bordered && 'border-t',
        styles.dialogFooter,
        sticky && styles.sticky,
        className
      )}
    >
      {children}
    </div>
  );
}
