/**
 * Timer Module - Timer Button Component
 *
 * Button component for timer controls (Play, Pause, Stop, etc.)
 *
 * @module timer/components/atoms/TimerButton
 */

'use client';

import React from 'react';
import Image from 'next/image';
import type { TimerButtonProps } from '../../types/timer.types';
import styles from './TimerButton.module.scss';

// Map variant to icon name
const variantIconMap = {
  start: 'Play',
  pause: 'pause',
  stop: 'square',
  reset: 'rotate-ccw',
};

/**
 * Timer control button with icon based on variant
 *
 * @example
 * ```typescript
 * <TimerButton
 *   variant="start"
 *   onClick={handleStart}
 *   disabled={isProcessing}
 * />
 * ```
 */
export function TimerButton({
  variant,
  onClick,
  disabled = false,
  loading = false,
  size = 'medium',
  className = '',
}: TimerButtonProps) {
  const icon = variantIconMap[variant];
  const iconPath = `/icons/${icon}.svg`;

  return (
    <button
      type="button"
      className={`${styles.timerButton} ${styles[variant]} ${styles[size]} ${
        disabled || loading ? styles.disabled : ''
      } ${className}`}
      onClick={onClick}
      disabled={disabled || loading}
      title={variant}
      aria-label={variant}
    >
      {loading ? (
        <div className={styles.spinner} />
      ) : (
        <Image
          src={iconPath}
          alt={variant}
          width={size === 'small' ? 16 : size === 'large' ? 24 : 20}
          height={size === 'small' ? 16 : size === 'large' ? 24 : 20}
          className={styles.icon}
        />
      )}
    </button>
  );
}
