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

/**
 * Timer control button with icon
 *
 * @example
 * ```typescript
 * <TimerButton
 *   icon="Play"
 *   onClick={handleStart}
 *   disabled={isProcessing}
 *   tooltip="Iniciar timer"
 * />
 * ```
 */
export function TimerButton({
  icon,
  onClick,
  disabled = false,
  loading = false,
  variant = 'default',
  size = 'medium',
  tooltip,
  className = '',
}: TimerButtonProps) {
  const iconPath = `/icons/${icon}.svg`;

  return (
    <button
      type="button"
      className={`${styles.timerButton} ${styles[variant]} ${styles[size]} ${
        disabled || loading ? styles.disabled : ''
      } ${className}`}
      onClick={onClick}
      disabled={disabled || loading}
      title={tooltip}
      aria-label={tooltip}
    >
      {loading ? (
        <div className={styles.spinner} />
      ) : (
        <Image
          src={iconPath}
          alt={icon}
          width={size === 'small' ? 16 : size === 'large' ? 24 : 20}
          height={size === 'small' ? 16 : size === 'large' ? 24 : 20}
          className={styles.icon}
        />
      )}
    </button>
  );
}
