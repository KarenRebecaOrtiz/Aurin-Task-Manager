/**
 * Timer Module - Timer Button Component
 *
 * Button component for timer controls (Play, Pause, Stop, etc.)
 *
 * @module timer/components/atoms/TimerButton
 */

'use client';

import React from 'react';
import type { TimerButtonProps } from '../../types/timer.types';
import { Play } from '@/components/animate-ui/icons/play';
import { Pause } from '@/components/animate-ui/icons/pause';
import { RotateCcw } from '@/components/animate-ui/icons/rotate-ccw';
import styles from './TimerButton.module.scss';

// Map variant to icon component
const variantIconMap = {
  start: Play,
  pause: Pause,
  stop: RotateCcw, // Using rotate-ccw for stop (can be changed to square if needed)
  reset: RotateCcw,
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
  const IconComponent = variantIconMap[variant];

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
        <IconComponent animateOnHover size={size === 'small' ? 16 : size === 'large' ? 24 : 20} />
      )}
    </button>
  );
}
