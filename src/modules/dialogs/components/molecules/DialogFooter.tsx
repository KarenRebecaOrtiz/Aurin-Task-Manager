'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import styles from '../../styles/Dialog.module.scss';

export interface DialogFooterProps {
  children: ReactNode;
  sticky?: boolean;
  className?: string;
}

export function DialogFooter({
  children,
  sticky = true,
  className,
}: DialogFooterProps) {
  return (
    <div
      className={cn(
        styles.dialogFooter,
        sticky && styles.sticky,
        className
      )}
    >
      {children}
    </div>
  );
}
