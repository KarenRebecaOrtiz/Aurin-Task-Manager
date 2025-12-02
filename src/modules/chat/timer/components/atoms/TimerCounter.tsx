/**
 * Timer Module - Timer Counter Component
 *
 * Displays running timer with animated numbers (HH:MM:SS format)
 *
 * @module timer/components/atoms/TimerCounter
 */

'use client';

import React from 'react';
import NumberFlow from '@number-flow/react';
import { motion } from 'framer-motion';
import type { TimerCounterProps } from '../../types/timer.types';
import styles from './TimerCounter.module.scss';

const MotionNumberFlow = motion.create(NumberFlow);

/**
 * TimerCounter Component
 *
 * Displays timer with animated number transitions and sync status indicators
 *
 * @param hours - Hours value (0-23)
 * @param minutes - Minutes value (0-59)
 * @param seconds - Seconds value (0-59)
 * @param className - Additional CSS classes
 * @param isOptimistic - Whether showing optimistic update (pending confirmation)
 * @param syncStatus - Current sync status ('idle', 'syncing', 'error')
 * @param onClick - Optional click handler to make counter interactive
 * @param pill - Whether to use pill/compact mode (32px height, matches button sizes)
 */
export function TimerCounter({
  hours,
  minutes,
  seconds,
  className = '',
  isOptimistic = false,
  syncStatus = 'idle',
  onClick,
  disabled = false,
  pill = false
}: TimerCounterProps) {
  // Check if timer is at 0
  const isTimerEmpty = hours === 0 && minutes === 0 && seconds === 0;

  return (
    <div
      className={`${styles.timerCounter} ${className} ${onClick ? styles.clickable : ''} ${disabled ? styles.disabledState : ''} ${pill ? styles.pill : ''}`}
      onClick={() => onClick?.()}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      {/* Clock Icon */}
      <div className={styles.clockIcon}>
        <svg
          width="22"
          height="20"
          viewBox="0 0 22 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M11 7V11L13 13M4 1L1 4M21 4L18 1M5.38 16.7L3 19M16.6399 16.6699L18.9999 18.9999M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Time Display */}
      <div className={styles.timeDisplay}>
        {isTimerEmpty ? (
          <span className={styles.emptyTimerText}>Iniciar un Timer</span>
        ) : (
          <>
            {/* Hours */}
            <div className={styles.timeUnit}>
              <MotionNumberFlow
                value={hours}
                className={styles.timeNumber}
                format={{ minimumIntegerDigits: 2 }}
                aria-label={`${hours} horas`}
              />
              <span className={styles.timeLabel}>Horas</span>
            </div>

            <div className={styles.timeSeparator} aria-hidden="true">
              :
            </div>

            {/* Minutes */}
            <div className={styles.timeUnit}>
              <MotionNumberFlow
                value={minutes}
                className={styles.timeNumber}
                format={{ minimumIntegerDigits: 2 }}
                aria-label={`${minutes} minutos`}
              />
              <span className={styles.timeLabel}>Min</span>
            </div>

            <div className={styles.timeSeparator} aria-hidden="true">
              :
            </div>

            {/* Seconds */}
            <div className={styles.timeUnit}>
              <MotionNumberFlow
                value={seconds}
                className={styles.timeNumber}
                format={{ minimumIntegerDigits: 2 }}
                aria-label={`${seconds} segundos`}
              />
              <span className={styles.timeLabel}>Seg</span>
            </div>
          </>
        )}
      </div>

      {/* Sync Status Indicators */}
      {(isOptimistic || syncStatus !== 'idle') && (
        <div className={styles.statusIndicators}>
          {isOptimistic && (
            <motion.div
              className={styles.optimisticIndicator}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              title="Actualización pendiente"
            >
              <div className={styles.pulsingDot} />
            </motion.div>
          )}

          {syncStatus === 'syncing' && (
            <motion.div
              className={styles.syncingIndicator}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, rotate: 360 }}
              exit={{ opacity: 0 }}
              transition={{ rotate: { duration: 1, repeat: Infinity, ease: 'linear' } }}
              title="Sincronizando..."
            >
              🔄
            </motion.div>
          )}

          {syncStatus === 'error' && (
            <motion.div
              className={styles.errorIndicator}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              title="Error de sincronización"
            >
              ⚠️
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}

export default TimerCounter;
