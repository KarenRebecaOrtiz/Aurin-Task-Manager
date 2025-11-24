'use client';

import React from 'react';
import styles from './Badge.module.scss';

export type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  // Priority variants
  | 'priority-high'
  | 'priority-medium'
  | 'priority-low'
  // Status variants
  | 'status-backlog'
  | 'status-todo'
  | 'status-in-progress'
  | 'status-in-review'
  | 'status-done'
  | 'status-archived';

export type BadgeSize = 'small' | 'medium' | 'large';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  pulse?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'medium',
  dot = false,
  pulse = false,
  className = '',
}) => {
  const badgeClasses = [
    styles.badge,
    styles[variant],
    styles[size],
    dot && styles.dot,
    pulse && styles.pulse,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={badgeClasses}>
      {pulse && <span className={styles.pulseRing} />}
      {children}
    </span>
  );
};
